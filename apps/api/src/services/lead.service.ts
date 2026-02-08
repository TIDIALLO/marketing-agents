import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { claudeGenerate } from '../lib/ai';
import { publishEvent } from '../lib/redis';
import { sendSlackNotification } from '../lib/slack';
import { emitToTenant } from '../lib/socket';
import { triggerWorkflow } from '../lib/n8n';
import { sendLeadProposalEmail } from '../lib/email';

// ─── Lead Ingestion (Story 6.1) ──────────────────────────────

interface LeadInput {
  tenantId: string;
  brandId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  source?: string;
  sourceDetail?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  gdprConsent?: boolean;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  return phone.replace(/[\s\-().]/g, '').trim() || null;
}

export async function ingestLead(input: LeadInput) {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  // Story 6.2: Deduplication by email (tenant-scoped)
  const existing = await prisma.lead.findFirst({
    where: {
      tenantId: input.tenantId,
      OR: [
        { email },
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  let lead;

  if (existing) {
    // Merge: update with new data without losing existing info
    lead = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        firstName: input.firstName || existing.firstName,
        lastName: input.lastName || existing.lastName,
        phone: phone || existing.phone,
        company: input.company || existing.company,
        // Update source if new one is more specific
        ...(input.source && input.source !== 'form' && existing.source === 'form'
          ? { source: input.source }
          : {}),
        sourceDetail: input.sourceDetail || existing.sourceDetail,
        utmSource: input.utmSource || existing.utmSource,
        utmMedium: input.utmMedium || existing.utmMedium,
        utmCampaign: input.utmCampaign || existing.utmCampaign,
        gdprConsent: input.gdprConsent ?? existing.gdprConsent,
      },
    });
  } else {
    lead = await prisma.lead.create({
      data: {
        tenantId: input.tenantId,
        brandId: input.brandId,
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        phone,
        company: input.company ?? null,
        source: input.source ?? 'form',
        sourceDetail: input.sourceDetail ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        gdprConsent: input.gdprConsent ?? false,
        status: 'new',
      },
    });
  }

  // Trigger qualification workflow MKT-302
  triggerWorkflow('mkt-302', {
    leadId: lead.id,
    tenantId: lead.tenantId,
    brandId: lead.brandId,
    isNew: !existing,
  }).catch((err) => console.error('[n8n] MKT-302 trigger failed:', err));

  return lead;
}

// ─── AI Lead Scoring & Qualification (Story 6.3) ─────────────

export async function scoreLead(tenantId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
  });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead introuvable');

  const aiResponse = await claudeGenerate(
    `Tu es un expert en qualification de leads B2B pour des PME en Afrique de l'Ouest et France.
Score ce lead de 0 à 100 selon ces critères:
- Complétude du profil (nom, email, téléphone, entreprise) : 20 pts
- Qualité de la source (ad > webinar > referral > form > csv) : 20 pts
- Taille/type entreprise : 20 pts
- Urgence et pain points détectés : 20 pts
- Budget potentiel : 20 pts

Retourne un JSON: { "score": 75, "temperature": "hot"|"warm"|"cold", "reasoning": "explication courte", "painPoints": ["point1"], "suggestedProduct": "produit recommandé" }
Rappel: hot >= 70, warm >= 40, cold < 40
Réponds uniquement avec le JSON.`,
    `Lead:
Nom: ${lead.firstName} ${lead.lastName}
Email: ${lead.email}
Téléphone: ${lead.phone ?? 'non renseigné'}
Entreprise: ${lead.company ?? 'non renseignée'}
Source: ${lead.source} ${lead.sourceDetail ? `(${lead.sourceDetail})` : ''}
UTM: source=${lead.utmSource ?? '-'}, medium=${lead.utmMedium ?? '-'}, campaign=${lead.utmCampaign ?? '-'}
RGPD: ${lead.gdprConsent ? 'oui' : 'non'}`,
  );

  let parsed: { score: number; temperature: string; reasoning: string; painPoints: string[]; suggestedProduct: string };
  try {
    parsed = JSON.parse(aiResponse);
  } catch {
    parsed = { score: 50, temperature: 'warm', reasoning: aiResponse, painPoints: [], suggestedProduct: '' };
  }

  const temperature = parsed.score >= 70 ? 'hot' : parsed.score >= 40 ? 'warm' : 'cold';
  const status = temperature === 'hot' ? 'qualified' : temperature === 'warm' ? 'nurturing' : 'new';

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { score: parsed.score, temperature, status },
  });

  // Publish to Redis for inter-agent communication
  await publishEvent('mkt:agent:3:new_lead', {
    leadId: lead.id,
    tenantId,
    score: parsed.score,
    temperature,
  });

  // Real-time WebSocket notification
  emitToTenant(tenantId, 'lead:qualified', {
    leadId: lead.id,
    name: `${lead.firstName} ${lead.lastName}`,
    score: parsed.score,
    temperature,
  });

  // Hot lead: trigger auto-booking (Story 6.4)
  if (temperature === 'hot') {
    triggerWorkflow('mkt-305', {
      leadId: lead.id,
      tenantId,
      brandId: lead.brandId,
      score: parsed.score,
    }).catch((err) => console.error('[n8n] MKT-305 trigger failed:', err));

    emitToTenant(tenantId, 'lead:hot', {
      leadId: lead.id,
      name: `${lead.firstName} ${lead.lastName}`,
      score: parsed.score,
    });
  }

  return { lead: updated, analysis: parsed };
}

// ─── Hot Lead Auto-Booking (Story 6.4) ───────────────────────

export async function createBookingProposal(tenantId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
  });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead introuvable');

  // Get available slots from Cal.com (mock in dev)
  const proposedSlots = await getAvailableSlots();

  // Generate personalized proposal with Claude
  const proposalMessage = await claudeGenerate(
    `Tu es un commercial sympathique et professionnel. Génère un message court (3-4 phrases) pour proposer un rendez-vous téléphonique à ce lead.
Inclus les 3 créneaux proposés de manière naturelle.
Ton: chaleureux, professionnel, personnalisé.
Réponds directement avec le message (pas de JSON).`,
    `Lead: ${lead.firstName} ${lead.lastName}
Entreprise: ${lead.company ?? 'non renseignée'}
Source: ${lead.source}
Créneaux disponibles:
${proposedSlots.map((s: { date: string; time: string }) => `- ${s.date} à ${s.time}`).join('\n')}`,
  );

  const booking = await prisma.calendarBooking.create({
    data: {
      leadId: lead.id,
      status: 'pending',
      proposedSlots: proposedSlots as unknown as Prisma.InputJsonValue,
      proposalMessage,
    },
  });

  // Send proposal via email
  if (lead.email) {
    await sendLeadProposalEmail(lead.email, {
      firstName: lead.firstName,
      proposalMessage,
      bookingId: booking.id,
    });
  }

  return booking;
}

// Mock Cal.com API (dev-friendly)
async function getAvailableSlots(): Promise<{ date: string; time: string }[]> {
  // In production: call Cal.com API for available slots
  console.log('[DEV] Cal.com not configured — returning mock slots');
  const now = new Date();
  return [
    { date: new Date(now.getTime() + 24 * 3600_000).toISOString().slice(0, 10), time: '10:00' },
    { date: new Date(now.getTime() + 48 * 3600_000).toISOString().slice(0, 10), time: '14:00' },
    { date: new Date(now.getTime() + 72 * 3600_000).toISOString().slice(0, 10), time: '11:00' },
  ];
}

// ─── AI Sales Briefing (Story 6.5) ───────────────────────────

export async function generateSalesBriefing(tenantId: string, bookingId: string) {
  const booking = await prisma.calendarBooking.findFirst({
    where: { id: bookingId },
    include: { lead: true },
  });
  if (!booking) throw new AppError(404, 'NOT_FOUND', 'Booking introuvable');
  if (booking.lead.tenantId !== tenantId) throw new AppError(404, 'NOT_FOUND', 'Booking introuvable');

  const lead = booking.lead;

  const briefing = await claudeGenerate(
    `Tu es un assistant commercial expert. Génère un briefing complet pour préparer un appel commercial.

Format du briefing:
## Résumé Lead
- Score, température, statut

## Profil
- Informations du lead

## Pain Points Détectés
- Points de douleur identifiés

## Produit/Service Suggéré
- Recommandation

## Objections Potentielles
- Objections probables et réponses suggérées

## Points de Discussion
- Sujets à aborder pendant l'appel

Réponds directement avec le briefing formaté en Markdown.`,
    `Lead: ${lead.firstName} ${lead.lastName}
Email: ${lead.email}
Téléphone: ${lead.phone ?? 'non renseigné'}
Entreprise: ${lead.company ?? 'non renseignée'}
Source: ${lead.source} ${lead.sourceDetail ? `(${lead.sourceDetail})` : ''}
Score: ${lead.score ?? 'non scoré'}/100
Température: ${lead.temperature ?? 'inconnue'}
Statut: ${lead.status}
Créé le: ${lead.createdAt.toISOString().slice(0, 10)}`,
  );

  const updated = await prisma.calendarBooking.update({
    where: { id: bookingId },
    data: { aiBriefing: briefing },
  });

  // Notify sales rep via Slack
  await sendSlackNotification({
    text: `Briefing IA prêt pour l'appel avec ${lead.firstName} ${lead.lastName} (${lead.company ?? 'N/A'}) — Score: ${lead.score}/100`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: 'Briefing IA — Appel commercial' } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${lead.firstName} ${lead.lastName}*${lead.company ? ` — ${lead.company}` : ''}\nScore: ${lead.score}/100 | Température: ${lead.temperature}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: briefing.slice(0, 2500),
        },
      },
    ],
  });

  return updated;
}

// ─── Lead CRUD ───────────────────────────────────────────────

export async function listLeads(
  tenantId: string,
  filters?: { brandId?: string; temperature?: string; status?: string; source?: string },
) {
  return prisma.lead.findMany({
    where: {
      tenantId,
      ...(filters?.brandId ? { brandId: filters.brandId } : {}),
      ...(filters?.temperature ? { temperature: filters.temperature } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.source ? { source: filters.source } : {}),
    },
    include: { _count: { select: { bookings: true } } },
    orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getLeadById(tenantId: string, id: string) {
  const lead = await prisma.lead.findFirst({
    where: { id, tenantId },
    include: { bookings: { orderBy: { createdAt: 'desc' } } },
  });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead introuvable');
  return lead;
}

export async function updateLead(
  tenantId: string,
  id: string,
  data: { status?: string; assignedTo?: string; temperature?: string },
) {
  const lead = await prisma.lead.findFirst({ where: { id, tenantId } });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead introuvable');

  return prisma.lead.update({
    where: { id },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.assignedTo !== undefined ? { assignedTo: data.assignedTo } : {}),
      ...(data.temperature !== undefined ? { temperature: data.temperature } : {}),
    },
  });
}

// ─── Pipeline Funnel Data (Story 6.6) ────────────────────────

export async function getPipelineFunnel(
  tenantId: string,
  filters?: { brandId?: string; from?: Date; to?: Date },
) {
  const where = {
    tenantId,
    ...(filters?.brandId ? { brandId: filters.brandId } : {}),
    ...(filters?.from || filters?.to
      ? {
          createdAt: {
            ...(filters?.from ? { gte: filters.from } : {}),
            ...(filters?.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [byTemperature, byStatus, bySource, total] = await Promise.all([
    prisma.lead.groupBy({
      by: ['temperature'],
      where,
      _count: true,
      _avg: { score: true },
    }),
    prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),
    prisma.lead.groupBy({
      by: ['source'],
      where,
      _count: true,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    total,
    byTemperature: byTemperature.map((t) => ({
      temperature: t.temperature ?? 'unscored',
      count: t._count,
      avgScore: t._avg.score ?? 0,
    })),
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    bySource: bySource.map((s) => ({ source: s.source, count: s._count })),
  };
}
