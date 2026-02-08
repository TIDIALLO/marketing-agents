import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { claudeGenerate } from '../lib/ai';
import { sendSlackNotification } from '../lib/slack';
import { emitToTenant } from '../lib/socket';
import { publishEvent } from '../lib/redis';
import { triggerWorkflow } from '../lib/n8n';
import { sendNurturingEmail, sendEscalationEmail } from '../lib/email';

interface SequenceStep {
  order: number;
  channel: string;
  delayHours: number;
  bodyPrompt: string;
}

// ─── Sequence Management (Story 7.1) ─────────────────────────

export async function createSequence(
  tenantId: string,
  data: { name: string; steps: SequenceStep[] },
) {
  return prisma.leadSequence.create({
    data: {
      tenantId,
      name: data.name,
      steps: data.steps as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function listSequences(tenantId: string) {
  return prisma.leadSequence.findMany({
    where: { tenantId },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSequenceById(tenantId: string, id: string) {
  const seq = await prisma.leadSequence.findFirst({ where: { id, tenantId } });
  if (!seq) throw new AppError(404, 'NOT_FOUND', 'Séquence introuvable');
  return seq;
}

export async function updateSequence(
  tenantId: string,
  id: string,
  data: { name?: string; steps?: SequenceStep[] },
) {
  const seq = await prisma.leadSequence.findFirst({ where: { id, tenantId } });
  if (!seq) throw new AppError(404, 'NOT_FOUND', 'Séquence introuvable');

  return prisma.leadSequence.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.steps !== undefined ? { steps: data.steps as unknown as Prisma.InputJsonValue } : {}),
    },
  });
}

export async function deleteSequence(tenantId: string, id: string) {
  const seq = await prisma.leadSequence.findFirst({ where: { id, tenantId } });
  if (!seq) throw new AppError(404, 'NOT_FOUND', 'Séquence introuvable');

  await prisma.leadSequence.delete({ where: { id } });
}

// ─── Enrollment (Story 7.1) ──────────────────────────────────

export async function enrollLead(tenantId: string, leadId: string, sequenceId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead introuvable');

  const seq = await prisma.leadSequence.findFirst({ where: { id: sequenceId, tenantId } });
  if (!seq) throw new AppError(404, 'NOT_FOUND', 'Séquence introuvable');

  const steps = seq.steps as unknown as SequenceStep[];
  const firstDelay = steps[0]?.delayHours ?? 24;

  return prisma.leadSequenceEnrollment.create({
    data: {
      leadId,
      sequenceId,
      status: 'active',
      currentStep: 0,
      nextActionAt: new Date(Date.now() + firstDelay * 3600_000),
    },
  });
}

// ─── Follow-Up Execution (Story 7.2) ─────────────────────────

export async function executeFollowUps() {
  const dueEnrollments = await prisma.leadSequenceEnrollment.findMany({
    where: {
      status: 'active',
      nextActionAt: { lte: new Date() },
    },
    include: {
      lead: true,
      sequence: true,
    },
  });

  const results: { enrollmentId: string; channel: string; sent: boolean }[] = [];

  for (const enrollment of dueEnrollments) {
    const steps = enrollment.sequence.steps as unknown as SequenceStep[];
    const currentStep = steps[enrollment.currentStep];

    if (!currentStep) {
      // All steps completed
      await prisma.leadSequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'completed', completedAt: new Date() },
      });
      results.push({ enrollmentId: enrollment.id, channel: 'none', sent: false });
      continue;
    }

    const lead = enrollment.lead;

    // Personalize message with Claude
    const personalizedMessage = await claudeGenerate(
      `Tu es un expert en nurturing B2B. Personnalise ce message de follow-up pour le lead.
Ton: chaleureux, professionnel, personnalisé.
Canal: ${currentStep.channel}
${currentStep.channel === 'whatsapp' ? 'Format: court, direct, 2-3 phrases max' : 'Format: email professionnel, 4-6 phrases'}
Réponds directement avec le message personnalisé (pas de JSON).`,
      `Lead: ${lead.firstName} ${lead.lastName}
Entreprise: ${lead.company ?? 'non renseignée'}
Température: ${lead.temperature ?? 'inconnue'}
Score: ${lead.score ?? 'non scoré'}
Source: ${lead.source}
Étape ${enrollment.currentStep + 1}/${steps.length}
Prompt de base: ${currentStep.bodyPrompt}`,
    );

    // Send via appropriate channel
    if (currentStep.channel === 'email' && lead.email) {
      await sendNurturingEmail(lead.email, {
        firstName: lead.firstName,
        message: personalizedMessage,
      });
    } else if (currentStep.channel === 'whatsapp' && lead.phone) {
      await sendWhatsAppMessage(lead.phone, personalizedMessage);
    }

    // Record interaction
    await prisma.leadInteraction.create({
      data: {
        leadId: lead.id,
        direction: 'outbound',
        channel: currentStep.channel,
        content: personalizedMessage,
      },
    });

    // Advance step
    const nextStepIndex = enrollment.currentStep + 1;
    const nextStep = steps[nextStepIndex];

    if (nextStep) {
      await prisma.leadSequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStep: nextStepIndex,
          nextActionAt: new Date(Date.now() + nextStep.delayHours * 3600_000),
        },
      });
    } else {
      await prisma.leadSequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'completed', completedAt: new Date(), nextActionAt: null },
      });
    }

    results.push({ enrollmentId: enrollment.id, channel: currentStep.channel, sent: true });
  }

  return results;
}

// WhatsApp Business Cloud API (mock in dev)
async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  // In production: call WhatsApp Business Cloud API
  console.log(`[DEV] WhatsApp to ${phone}: ${message.slice(0, 100)}...`);
}

// ─── Response Analysis & Intent Detection (Story 7.3) ────────

export async function analyzeResponse(
  tenantId: string,
  leadId: string,
  data: { channel: string; content: string },
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
    include: {
      interactions: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead introuvable');

  const recentContext = lead.interactions
    .map((i) => `[${i.direction}/${i.channel}] ${i.content.slice(0, 200)}`)
    .join('\n');

  // Claude analysis
  const aiResponse = await claudeGenerate(
    `Tu es un expert en analyse de réponses leads B2B. Analyse ce message et retourne un JSON:
{
  "sentiment": "positive"|"neutral"|"negative",
  "intent": "interested"|"needs_info"|"not_ready"|"objection"|"ready_to_buy"|"unsubscribe",
  "temperatureChange": "hot"|"warm"|"cold"|null,
  "reasoning": "explication courte",
  "suggestedAction": "action recommandée"
}
Réponds uniquement avec le JSON.`,
    `Lead: ${lead.firstName} ${lead.lastName} (${lead.temperature}, score ${lead.score})
Canal: ${data.channel}
Historique récent:\n${recentContext}
\nNouveau message du lead:\n${data.content}`,
  );

  let analysis: {
    sentiment: string;
    intent: string;
    temperatureChange: string | null;
    reasoning: string;
    suggestedAction: string;
  };
  try {
    analysis = JSON.parse(aiResponse);
  } catch {
    analysis = {
      sentiment: 'neutral',
      intent: 'needs_info',
      temperatureChange: null,
      reasoning: aiResponse,
      suggestedAction: 'Continuer le nurturing',
    };
  }

  // Record inbound interaction
  const interaction = await prisma.leadInteraction.create({
    data: {
      leadId: lead.id,
      direction: 'inbound',
      channel: data.channel,
      content: data.content,
      aiSentiment: analysis.sentiment,
      aiIntent: analysis.intent,
    },
  });

  // Update lead temperature if changed
  if (analysis.temperatureChange) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { temperature: analysis.temperatureChange },
    });
  }

  // Story 7.3 & 7.4: Act based on intent
  if (analysis.intent === 'ready_to_buy') {
    // Trigger booking
    triggerWorkflow('mkt-305', {
      leadId: lead.id,
      tenantId,
      brandId: lead.brandId,
      score: lead.score,
    }).catch((err) => console.error('[n8n] MKT-305 trigger failed:', err));
  } else if (analysis.intent === 'objection') {
    // Story 7.4: Generate objection response
    await handleObjection(tenantId, lead.id, data.channel, data.content, analysis.reasoning);
  } else if (analysis.intent === 'unsubscribe') {
    // Pause all active enrollments
    await prisma.leadSequenceEnrollment.updateMany({
      where: { leadId: lead.id, status: 'active' },
      data: { status: 'paused' },
    });
  }

  return { interaction, analysis };
}

// ─── Objection Handling (Story 7.4) ──────────────────────────

async function handleObjection(
  tenantId: string,
  leadId: string,
  channel: string,
  objectionContent: string,
  reasoning: string,
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
  });
  if (!lead) return;

  const response = await claudeGenerate(
    `Tu es un commercial expert. Réponds à cette objection de manière empathique et constructive.
Ton: compréhensif, professionnel, sans être insistant.
Canal: ${channel}
${channel === 'whatsapp' ? 'Format: court, 2-3 phrases' : 'Format: email court, 3-4 phrases'}
Réponds directement avec le message (pas de JSON).`,
    `Lead: ${lead.firstName} ${lead.lastName}
Entreprise: ${lead.company ?? 'N/A'}
Objection: ${objectionContent}
Analyse: ${reasoning}`,
  );

  // Send response on same channel
  if (channel === 'email' && lead.email) {
    await sendNurturingEmail(lead.email, {
      firstName: lead.firstName,
      message: response,
    });
  } else if (channel === 'whatsapp' && lead.phone) {
    await sendWhatsAppMessage(lead.phone, response);
  }

  // Record outbound interaction
  await prisma.leadInteraction.create({
    data: {
      leadId: lead.id,
      direction: 'outbound',
      channel,
      content: response,
    },
  });
}

// ─── Human Escalation (Story 7.5) ────────────────────────────

export async function escalateToHuman(
  tenantId: string,
  leadId: string,
  assignTo: string,
  reason?: string,
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
    include: {
      interactions: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead introuvable');

  // Generate escalation summary with Claude
  const interactionHistory = lead.interactions
    .map((i) => `[${i.direction}/${i.channel}${i.aiIntent ? `/${i.aiIntent}` : ''}] ${i.content.slice(0, 200)}`)
    .join('\n');

  const summary = await claudeGenerate(
    `Tu es un assistant commercial. Génère un résumé d'escalation pour le commercial.
Format:
- Résumé du lead (1-2 phrases)
- Points clés de la conversation
- Recommandations pour l'appel
Réponds directement en Markdown.`,
    `Lead: ${lead.firstName} ${lead.lastName}
Entreprise: ${lead.company ?? 'N/A'}
Score: ${lead.score ?? 'N/A'}/100 | Température: ${lead.temperature ?? 'N/A'}
Raison escalation: ${reason ?? 'Demande complexe'}
Historique interactions:\n${interactionHistory}`,
  );

  // Update lead
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: 'opportunity', assignedTo: assignTo },
  });

  // Pause active sequences
  await prisma.leadSequenceEnrollment.updateMany({
    where: { leadId: lead.id, status: 'active' },
    data: { status: 'paused' },
  });

  // Notify via Slack
  await sendSlackNotification({
    text: `Escalation : ${lead.firstName} ${lead.lastName} (${lead.company ?? 'N/A'}) — Score ${lead.score}/100`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: 'Escalation commerciale' } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${lead.firstName} ${lead.lastName}*${lead.company ? ` — ${lead.company}` : ''}\nScore: ${lead.score}/100 | Température: ${lead.temperature}\nRaison: ${reason ?? 'Demande complexe'}`,
        },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: summary.slice(0, 2500) },
      },
    ],
  });

  // Email notification to assigned commercial
  const assignee = await prisma.platformUser.findFirst({
    where: { id: assignTo },
    select: { email: true },
  });
  if (assignee) {
    await sendEscalationEmail(assignee.email, {
      leadName: `${lead.firstName} ${lead.lastName}`,
      company: lead.company ?? 'N/A',
      score: lead.score ?? 0,
      temperature: lead.temperature ?? 'unknown',
      summary,
    });
  }

  // Real-time WebSocket
  emitToTenant(tenantId, 'lead:escalated', {
    leadId: lead.id,
    name: `${lead.firstName} ${lead.lastName}`,
    assignedTo: assignTo,
  });

  return { lead, summary };
}

// ─── Conversion Tracking (Story 7.6) ─────────────────────────

export async function trackConversion(
  tenantId: string,
  leadId: string,
  data: { conversionValue: number; source?: string },
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
    include: {
      interactions: { select: { channel: true, createdAt: true } },
    },
  });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead introuvable');

  // Update lead as converted
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: 'converted',
      convertedAt: new Date(),
      conversionValue: data.conversionValue,
    },
  });

  // Complete active enrollments
  await prisma.leadSequenceEnrollment.updateMany({
    where: { leadId: lead.id, status: 'active' },
    data: { status: 'completed', completedAt: new Date() },
  });

  // Multi-touch linear attribution
  const touchpoints = lead.interactions.length;
  const valuePerTouch = touchpoints > 0 ? data.conversionValue / touchpoints : data.conversionValue;

  // Publish conversion event to Redis for agents 1 & 2
  await publishEvent('mkt:agent:3:conversion', {
    leadId: lead.id,
    tenantId,
    conversionValue: data.conversionValue,
    touchpoints,
    valuePerTouch,
    source: lead.source,
  });

  // Real-time WebSocket
  emitToTenant(tenantId, 'lead:converted', {
    leadId: lead.id,
    name: `${lead.firstName} ${lead.lastName}`,
    conversionValue: data.conversionValue,
  });

  // Slack notification
  await sendSlackNotification({
    text: `Conversion : ${lead.firstName} ${lead.lastName} (${lead.company ?? 'N/A'}) — ${data.conversionValue} EUR | ${touchpoints} touchpoints`,
  });

  return { lead: updated, attribution: { touchpoints, valuePerTouch } };
}
