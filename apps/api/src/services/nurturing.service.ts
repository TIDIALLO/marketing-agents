import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { claudeGenerate } from '../lib/ai';
import { sendSlackNotification } from '../lib/slack';
import { emitEvent } from '../lib/socket';
import { publishEvent } from '../lib/redis';
import { triggerWorkflow } from '../lib/n8n';
import { sendNurturingEmail, sendEscalationEmail } from '../lib/email';

// ─── Conversation Context Builder ───────────────────────────
// Builds rich context from full interaction history for better Claude prompts

interface ConversationContext {
  historyText: string;
  sentimentTrend: string;
  lastIntent: string | null;
  interactionCount: number;
  daysSinceFirstContact: number;
  objections: string[];
  topics: string[];
}

async function buildConversationContext(leadId: string): Promise<ConversationContext> {
  const interactions = await prisma.leadInteraction.findMany({
    where: { leadId },
    orderBy: { createdAt: 'asc' },
    select: {
      direction: true,
      channel: true,
      content: true,
      aiSentiment: true,
      aiIntent: true,
      createdAt: true,
    },
  });

  // Build readable conversation history
  const historyText = interactions
    .map((i) => {
      const dateStr = i.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const who = i.direction === 'inbound' ? 'LEAD' : 'NOUS';
      return `[${dateStr} | ${who} | ${i.channel}] ${i.content.slice(0, 300)}`;
    })
    .join('\n');

  // Sentiment trend analysis
  const sentiments = interactions
    .filter((i) => i.aiSentiment)
    .map((i) => i.aiSentiment!);
  const recentSentiments = sentiments.slice(-5);
  const sentimentTrend = recentSentiments.length > 0
    ? analyzeSentimentTrend(recentSentiments)
    : 'inconnu';

  // Extract objections from history
  const objections = interactions
    .filter((i) => i.aiIntent === 'objection')
    .map((i) => i.content.slice(0, 150));

  // Extract topics discussed
  const topics = [...new Set(
    interactions
      .filter((i) => i.aiIntent)
      .map((i) => i.aiIntent!),
  )];

  // Last intent
  const lastInbound = interactions.filter((i) => i.direction === 'inbound').at(-1);
  const lastIntent = lastInbound?.aiIntent ?? null;

  // Days since first contact
  const firstContact = interactions[0]?.createdAt ?? new Date();
  const daysSinceFirstContact = Math.floor(
    (Date.now() - firstContact.getTime()) / (24 * 3600_000),
  );

  return {
    historyText,
    sentimentTrend,
    lastIntent,
    interactionCount: interactions.length,
    daysSinceFirstContact,
    objections,
    topics,
  };
}

function analyzeSentimentTrend(sentiments: string[]): string {
  const scores: Record<string, number> = { positive: 1, neutral: 0, negative: -1 };
  if (sentiments.length < 2) return sentiments[0] ?? 'inconnu';

  const recent = sentiments.slice(-3).map((s) => scores[s] ?? 0);
  const earlier = sentiments.slice(0, -3).map((s) => scores[s] ?? 0);

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.length > 0
    ? earlier.reduce((a, b) => a + b, 0) / earlier.length
    : 0;

  if (recentAvg > earlierAvg + 0.3) return 'en amélioration';
  if (recentAvg < earlierAvg - 0.3) return 'en dégradation';
  if (recentAvg > 0.3) return 'positif stable';
  if (recentAvg < -0.3) return 'négatif stable';
  return 'neutre stable';
}

interface SequenceStep {
  order: number;
  channel: string;
  delayHours: number;
  bodyPrompt: string;
}

// ─── Sequence Management (Story 7.1) ─────────────────────────

export async function createSequence(
  data: { name: string; steps: SequenceStep[] },
) {
  return prisma.leadSequence.create({
    data: {
      name: data.name,
      steps: data.steps as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function listSequences() {
  return prisma.leadSequence.findMany({
    include: { _count: { select: { enrollments: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSequenceById(id: string) {
  const seq = await prisma.leadSequence.findFirst({ where: { id } });
  if (!seq) throw new AppError(404, 'NOT_FOUND', 'Séquence introuvable');
  return seq;
}

export async function updateSequence(
  id: string,
  data: { name?: string; steps?: SequenceStep[] },
) {
  const seq = await prisma.leadSequence.findFirst({ where: { id } });
  if (!seq) throw new AppError(404, 'NOT_FOUND', 'Séquence introuvable');

  return prisma.leadSequence.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.steps !== undefined ? { steps: data.steps as unknown as Prisma.InputJsonValue } : {}),
    },
  });
}

export async function deleteSequence(id: string) {
  const seq = await prisma.leadSequence.findFirst({ where: { id } });
  if (!seq) throw new AppError(404, 'NOT_FOUND', 'Séquence introuvable');

  await prisma.leadSequence.delete({ where: { id } });
}

// ─── Enrollment (Story 7.1) ──────────────────────────────────

export async function enrollLead(leadId: string, sequenceId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId } });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead introuvable');

  const seq = await prisma.leadSequence.findFirst({ where: { id: sequenceId } });
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

    // Build full conversation context for intelligent follow-up
    const context = await buildConversationContext(lead.id);

    // Personalize message with Claude using rich context
    const personalizedMessage = await claudeGenerate(
      `Tu es un expert en nurturing B2B. Personnalise ce message de follow-up pour le lead.

RÈGLES CRITIQUES:
- Ne JAMAIS répéter un argument déjà utilisé dans les messages précédents
- Adapter le ton selon la tendance sentiment : ${context.sentimentTrend}
- Si des objections ont été soulevées, les adresser subtilement
- ${context.interactionCount > 5 ? 'Le lead est engagé depuis longtemps — être plus direct et concis' : 'Relation encore jeune — construire la confiance'}
- ${context.lastIntent === 'needs_info' ? 'Le lead cherche des informations — fournir de la valeur concrète' : ''}
- ${context.lastIntent === 'objection' ? 'Dernière interaction = objection — être empathique et apporter des preuves' : ''}

Canal: ${currentStep.channel}
${currentStep.channel === 'whatsapp' ? 'Format: court, direct, 2-3 phrases max' : 'Format: email professionnel, 4-6 phrases'}
Réponds directement avec le message personnalisé (pas de JSON).`,
      `Lead: ${lead.firstName} ${lead.lastName}
Entreprise: ${lead.company ?? 'non renseignée'}
Température: ${lead.temperature ?? 'inconnue'}
Score: ${lead.score ?? 'non scoré'}
Source: ${lead.source}
Jours depuis premier contact: ${context.daysSinceFirstContact}
Nombre d'interactions: ${context.interactionCount}
Tendance sentiment: ${context.sentimentTrend}
Intentions détectées: ${context.topics.join(', ') || 'aucune'}
${context.objections.length > 0 ? `Objections passées:\n${context.objections.map((o) => `- ${o}`).join('\n')}` : ''}

Historique conversation:
${context.historyText || '(première interaction)'}

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
  leadId: string,
  data: { channel: string; content: string },
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId },
  });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead introuvable');

  // Build full conversation context
  const context = await buildConversationContext(leadId);

  // Claude analysis with rich context
  const aiResponse = await claudeGenerate(
    `Tu es un expert en analyse de réponses leads B2B. Analyse ce message avec le contexte complet de la conversation.

Considère:
- La tendance sentiment globale: ${context.sentimentTrend}
- Le nombre d'interactions (${context.interactionCount}) et la durée de la relation (${context.daysSinceFirstContact} jours)
- Les objections précédentes: ${context.objections.length > 0 ? context.objections.join('; ') : 'aucune'}
- Les intentions détectées: ${context.topics.join(', ') || 'aucune'}

Retourne un JSON:
{
  "sentiment": "positive"|"neutral"|"negative",
  "intent": "interested"|"needs_info"|"not_ready"|"objection"|"ready_to_buy"|"unsubscribe",
  "objectionCategory": "price"|"trust"|"feature"|"timing"|null,
  "temperatureChange": "hot"|"warm"|"cold"|null,
  "reasoning": "explication courte",
  "suggestedAction": "action recommandée",
  "urgency": "high"|"medium"|"low"
}
Réponds uniquement avec le JSON.`,
    `Lead: ${lead.firstName} ${lead.lastName} (${lead.temperature}, score ${lead.score})
Entreprise: ${lead.company ?? 'N/A'}
Canal: ${data.channel}

Historique complet conversation:
${context.historyText || '(première interaction)'}

Nouveau message du lead:
${data.content}`,
  );

  let analysis: {
    sentiment: string;
    intent: string;
    objectionCategory: string | null;
    temperatureChange: string | null;
    reasoning: string;
    suggestedAction: string;
    urgency: string;
  };
  try {
    analysis = JSON.parse(aiResponse);
  } catch {
    analysis = {
      sentiment: 'neutral',
      intent: 'needs_info',
      objectionCategory: null,
      temperatureChange: null,
      reasoning: aiResponse,
      suggestedAction: 'Continuer le nurturing',
      urgency: 'medium',
    };
  }

  // Record inbound interaction with enriched data
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

  // Act based on intent with urgency awareness
  if (analysis.intent === 'ready_to_buy') {
    triggerWorkflow('mkt-305', {
      leadId: lead.id,
      brandId: lead.brandId,
      score: lead.score,
    }).catch((err) => console.error('[n8n] MKT-305 trigger failed:', err));

    emitEvent('lead:ready_to_buy', {
      leadId: lead.id,
      name: `${lead.firstName} ${lead.lastName}`,
      urgency: analysis.urgency,
    });
  } else if (analysis.intent === 'objection') {
    await handleObjection(
      lead.id,
      data.channel,
      data.content,
      analysis.reasoning,
      analysis.objectionCategory,
    );
  } else if (analysis.intent === 'unsubscribe') {
    await prisma.leadSequenceEnrollment.updateMany({
      where: { leadId: lead.id, status: 'active' },
      data: { status: 'paused' },
    });
  }

  // High urgency leads → notify immediately
  if (analysis.urgency === 'high' && analysis.intent !== 'unsubscribe') {
    await sendSlackNotification({
      text: `Alerte lead urgent : ${lead.firstName} ${lead.lastName} (${lead.company ?? 'N/A'}) — ${analysis.intent} — ${analysis.reasoning}`,
    });
  }

  return { interaction, analysis };
}

// ─── Objection Handling (Story 7.4) ──────────────────────────

async function handleObjection(
  leadId: string,
  channel: string,
  objectionContent: string,
  reasoning: string,
  category?: string | null,
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId },
  });
  if (!lead) return;

  // Build conversation context for smarter objection handling
  const context = await buildConversationContext(leadId);

  // Category-specific handling strategies
  const categoryStrategy: Record<string, string> = {
    price: 'Mettre en avant le ROI, proposer un essai gratuit, comparer au coût de ne rien faire. Ne pas baisser le prix directement.',
    trust: 'Partager des témoignages clients, proposer une démo en direct, offrir des garanties.',
    feature: 'Expliquer comment les fonctionnalités existantes résolvent le besoin, ou noter la suggestion pour la roadmap.',
    timing: 'Respecter le timing du lead, proposer de rester en contact léger, offrir des ressources utiles en attendant.',
  };

  const strategy = category && categoryStrategy[category]
    ? `\nSTRATÉGIE SPÉCIFIQUE (${category}): ${categoryStrategy[category]}`
    : '';

  const response = await claudeGenerate(
    `Tu es un commercial expert B2B. Réponds à cette objection de manière empathique et constructive.
${strategy}

CONTEXTE CONVERSATION:
- ${context.interactionCount} interactions sur ${context.daysSinceFirstContact} jours
- Tendance sentiment: ${context.sentimentTrend}
- ${context.objections.length > 1 ? `C'est la ${context.objections.length}ème objection — le lead hésite, être rassurant sans insister` : 'Première objection — traiter avec soin'}

Ton: compréhensif, professionnel, sans être insistant.
Canal: ${channel}
${channel === 'whatsapp' ? 'Format: court, 2-3 phrases' : 'Format: email court, 3-4 phrases'}
Réponds directement avec le message (pas de JSON).`,
    `Lead: ${lead.firstName} ${lead.lastName}
Entreprise: ${lead.company ?? 'N/A'}
Score: ${lead.score ?? 'N/A'}/100
Objection: ${objectionContent}
Catégorie: ${category ?? 'non catégorisée'}
Analyse: ${reasoning}
${context.objections.length > 0 ? `\nObjections précédentes:\n${context.objections.map((o) => `- ${o}`).join('\n')}` : ''}`,
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

  // Publish objection event for feedback loop (Task 2.4)
  await publishEvent('mkt:agent:3:objection', {
    leadId: lead.id,
    category: category ?? 'unknown',
    objection: objectionContent.slice(0, 500),
  });
}

// ─── Human Escalation (Story 7.5) ────────────────────────────

export async function escalateToHuman(
  leadId: string,
  assignTo: string,
  reason?: string,
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId },
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
  emitEvent('lead:escalated', {
    leadId: lead.id,
    name: `${lead.firstName} ${lead.lastName}`,
    assignedTo: assignTo,
  });

  return { lead, summary };
}

// ─── Conversion Tracking (Story 7.6) ─────────────────────────

export async function trackConversion(
  leadId: string,
  data: { conversionValue: number; source?: string },
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId },
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
    conversionValue: data.conversionValue,
    touchpoints,
    valuePerTouch,
    source: lead.source,
  });

  // Real-time WebSocket
  emitEvent('lead:converted', {
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
