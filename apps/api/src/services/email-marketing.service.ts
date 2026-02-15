import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { claudeGenerate } from '../lib/ai';

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@mktengine.dev';
const APP_URL = process.env.APP_URL || 'http://localhost:3100';

// ─── Email Templates CRUD ───────────────────────────────────

export async function createTemplate(data: {
  brandId: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables?: unknown;
}) {
  return prisma.emailTemplate.create({
    data: {
      brandId: data.brandId,
      name: data.name,
      subject: data.subject,
      htmlBody: data.htmlBody,
      textBody: data.textBody ?? null,
      variables: (data.variables as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });
}

export async function listTemplates(brandId?: string) {
  return prisma.emailTemplate.findMany({
    where: brandId ? { brandId } : {},
    include: { brand: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTemplateById(id: string) {
  const template = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!template) throw new AppError(404, 'NOT_FOUND', 'Template introuvable');
  return template;
}

export async function updateTemplate(
  id: string,
  data: { name?: string; subject?: string; htmlBody?: string; textBody?: string; variables?: unknown },
) {
  const template = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!template) throw new AppError(404, 'NOT_FOUND', 'Template introuvable');

  return prisma.emailTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.subject !== undefined ? { subject: data.subject } : {}),
      ...(data.htmlBody !== undefined ? { htmlBody: data.htmlBody } : {}),
      ...(data.textBody !== undefined ? { textBody: data.textBody } : {}),
      ...(data.variables !== undefined ? { variables: data.variables as Prisma.InputJsonValue } : {}),
    },
  });
}

export async function deleteTemplate(id: string) {
  const template = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!template) throw new AppError(404, 'NOT_FOUND', 'Template introuvable');
  await prisma.emailTemplate.delete({ where: { id } });
}

// ─── Email Campaigns CRUD ───────────────────────────────────

export async function createCampaign(data: {
  brandId: string;
  templateId?: string;
  name: string;
  subject: string;
  recipientFilter?: unknown;
  scheduledAt?: Date;
}) {
  return prisma.emailCampaign.create({
    data: {
      brandId: data.brandId,
      templateId: data.templateId ?? null,
      name: data.name,
      subject: data.subject,
      recipientFilter: (data.recipientFilter as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      scheduledAt: data.scheduledAt ?? null,
      status: 'draft',
    },
  });
}

export async function listCampaigns(brandId?: string) {
  return prisma.emailCampaign.findMany({
    where: brandId ? { brandId } : {},
    include: {
      brand: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCampaignById(id: string) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id },
    include: {
      brand: { select: { id: true, name: true } },
      template: true,
    },
  });
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campagne introuvable');
  return campaign;
}

export async function updateCampaign(
  id: string,
  data: { name?: string; subject?: string; templateId?: string; recipientFilter?: unknown; scheduledAt?: Date },
) {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campagne introuvable');
  if (campaign.status === 'sent') throw new AppError(400, 'ALREADY_SENT', 'Campagne déjà envoyée');

  return prisma.emailCampaign.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.subject !== undefined ? { subject: data.subject } : {}),
      ...(data.templateId !== undefined ? { templateId: data.templateId } : {}),
      ...(data.recipientFilter !== undefined ? { recipientFilter: data.recipientFilter as Prisma.InputJsonValue } : {}),
      ...(data.scheduledAt !== undefined ? { scheduledAt: data.scheduledAt } : {}),
    },
  });
}

export async function deleteCampaign(id: string) {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campagne introuvable');
  if (campaign.status === 'sent') throw new AppError(400, 'ALREADY_SENT', 'Impossible de supprimer une campagne envoyée');
  await prisma.emailCampaign.delete({ where: { id } });
}

// ─── Send Campaign ──────────────────────────────────────────

export async function sendCampaign(campaignId: string) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { template: true, brand: true },
  });
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campagne introuvable');
  if (campaign.status === 'sent') throw new AppError(400, 'ALREADY_SENT', 'Campagne déjà envoyée');

  // Get recipients based on filter
  const filter = (campaign.recipientFilter as Record<string, unknown>) ?? {};
  const recipients = await prisma.lead.findMany({
    where: {
      brandId: campaign.brandId,
      gdprConsent: true,
      ...(filter.temperature ? { temperature: filter.temperature as string } : {}),
      ...(filter.status ? { status: filter.status as string } : {}),
      ...(filter.source ? { source: filter.source as string } : {}),
    },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  if (recipients.length === 0) {
    throw new AppError(400, 'NO_RECIPIENTS', 'Aucun destinataire correspondant aux critères');
  }

  // Update campaign with recipient count
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { status: 'sending', recipientCount: recipients.length },
  });

  const htmlTemplate = campaign.template?.htmlBody ?? `<p>${campaign.subject}</p>`;
  let sentCount = 0;
  let bounceCount = 0;

  // Send via Resend
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    for (const recipient of recipients) {
      try {
        // Replace template variables
        const html = htmlTemplate
          .replace(/\{\{firstName\}\}/g, recipient.firstName)
          .replace(/\{\{lastName\}\}/g, recipient.lastName)
          + `<img src="${APP_URL}/api/email/track/open/${campaignId}/${recipient.id}" width="1" height="1" style="display:none" />`;

        await resend.emails.send({
          from: EMAIL_FROM,
          to: recipient.email,
          subject: campaign.subject.replace(/\{\{firstName\}\}/g, recipient.firstName),
          html,
        });
        sentCount++;
      } catch (err) {
        console.error(`[Email] Failed to send to ${recipient.email}:`, err);
        bounceCount++;
      }
    }
  } else {
    console.log(`[DEV] Would send campaign "${campaign.name}" to ${recipients.length} recipients`);
    sentCount = recipients.length;
  }

  // Update campaign status
  const updated = await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'sent',
      sentAt: new Date(),
      sentCount,
      bounceCount,
    },
  });

  return updated;
}

// ─── Tracking ───────────────────────────────────────────────

export async function trackOpen(campaignId: string, _leadId: string) {
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { openCount: { increment: 1 } },
  });
}

export async function trackClick(campaignId: string, _leadId: string) {
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { clickCount: { increment: 1 } },
  });
}

// ─── AI Email Content Generation ────────────────────────────

export async function generateEmailContent(campaignId: string) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { brand: { select: { name: true, brandVoice: true, targetAudience: true } } },
  });
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campagne introuvable');

  // Get product info if available
  const products = await prisma.product.findMany({
    where: { brandId: campaign.brandId, isActive: true },
    select: { name: true, tagline: true, description: true, ctaUrl: true },
    take: 3,
  });

  const aiResponse = await claudeGenerate(
    `Tu es un expert en email marketing B2B tech. Génère un email marketing complet.

Retourne un JSON:
{
  "subject": "objet de l'email (max 60 car, accrocheur)",
  "preheader": "texte de pré-header (max 100 car)",
  "htmlBody": "contenu HTML complet de l'email avec mise en page professionnelle",
  "textBody": "version texte brut de l'email"
}

L'email doit:
- Avoir un hook accrocheur
- Présenter un bénéfice clair
- Inclure un CTA visible
- Utiliser {{firstName}} pour la personnalisation
- Être responsive et professionnel

Réponds uniquement avec le JSON.`,
    `Marque: ${campaign.brand.name}
Voix: ${JSON.stringify(campaign.brand.brandVoice ?? 'professionnelle')}
Audience: ${JSON.stringify(campaign.brand.targetAudience ?? 'PME')}
Nom campagne: ${campaign.name}
Sujet actuel: ${campaign.subject}
Produits: ${products.map((p) => `${p.name} — ${p.tagline ?? p.description ?? ''}`).join('\n')}`,
  );

  let content: { subject?: string; htmlBody?: string; textBody?: string };
  try {
    content = JSON.parse(aiResponse);
  } catch {
    content = { htmlBody: aiResponse };
  }

  // Create or update template
  const template = await prisma.emailTemplate.create({
    data: {
      brandId: campaign.brandId,
      name: `Auto — ${campaign.name}`,
      subject: content.subject ?? campaign.subject,
      htmlBody: content.htmlBody ?? '',
      textBody: content.textBody ?? null,
    },
  });

  // Link template to campaign
  const updated = await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      templateId: template.id,
      ...(content.subject ? { subject: content.subject } : {}),
    },
  });

  return { campaign: updated, template, generatedContent: content };
}
