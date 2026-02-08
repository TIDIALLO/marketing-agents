const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@synap6ia.com';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
  } else {
    console.log(`[DEV] Email to ${to}: ${subject}`);
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail(
    to,
    'Réinitialisation de votre mot de passe — Synap6ia',
    `<p>Bonjour,</p><p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ce lien expire dans 1 heure.</p><p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>`,
  );
}

export async function sendInvitationEmail(
  to: string,
  organizationName: string,
  inviteUrl: string,
): Promise<void> {
  await sendEmail(
    to,
    `Invitation à rejoindre ${organizationName} — Synap6ia`,
    `<p>Bonjour,</p><p>Vous avez été invité à rejoindre l'organisation <strong>${organizationName}</strong> sur Synap6ia Marketing.</p><p><a href="${inviteUrl}">Accepter l'invitation</a></p><p>Ce lien expire dans 7 jours.</p>`,
  );
}

// ─── Approval Emails (Stories 4.2, 4.3) ──────────────────────

export async function sendApprovalEmail(
  to: string,
  details: {
    title: string;
    platform: string;
    brandName: string;
    bodyPreview: string;
    approveUrl: string;
    rejectUrl: string;
  },
): Promise<void> {
  await sendEmail(
    to,
    `Approbation requise : ${details.title} — ${details.brandName}`,
    `<p>Bonjour,</p>
<p>Un nouveau contenu attend votre approbation :</p>
<table style="border-collapse:collapse;width:100%;max-width:600px">
  <tr><td style="padding:8px;font-weight:bold">Titre</td><td style="padding:8px">${details.title}</td></tr>
  <tr><td style="padding:8px;font-weight:bold">Plateforme</td><td style="padding:8px">${details.platform}</td></tr>
  <tr><td style="padding:8px;font-weight:bold">Marque</td><td style="padding:8px">${details.brandName}</td></tr>
</table>
<p style="margin:16px 0;padding:12px;background:#f5f5f5;border-radius:8px">${details.bodyPreview}${details.bodyPreview.length >= 300 ? '...' : ''}</p>
<p>
  <a href="${details.approveUrl}" style="display:inline-block;padding:12px 24px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;margin-right:8px">Approuver</a>
  <a href="${details.rejectUrl}" style="display:inline-block;padding:12px 24px;background:#ef4444;color:#fff;text-decoration:none;border-radius:6px">Rejeter</a>
</p>
<p style="color:#888;font-size:12px">Ces liens expirent dans 72 heures.</p>`,
  );
}

export async function sendApprovalReminderEmail(
  to: string,
  details: {
    entityType: string;
    entityId: string;
    hoursWaiting: number;
    dashboardUrl: string;
  },
): Promise<void> {
  await sendEmail(
    to,
    `Relance : approbation en attente depuis ${details.hoursWaiting}h — Synap6ia`,
    `<p>Bonjour,</p>
<p>Une approbation est en attente depuis <strong>${details.hoursWaiting} heures</strong>.</p>
<p>Type : ${details.entityType} — ID : ${details.entityId}</p>
<p><a href="${details.dashboardUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px">Voir sur le dashboard</a></p>`,
  );
}

// ─── Lead Emails (Stories 6.4) ───────────────────────────────

// ─── Nurturing Emails (Stories 7.2, 7.5) ─────────────────────

export async function sendNurturingEmail(
  to: string,
  details: { firstName: string; message: string },
): Promise<void> {
  await sendEmail(
    to,
    `${details.firstName}, un message pour vous — Synap6ia`,
    `<p>${details.message.replace(/\n/g, '<br>')}</p>`,
  );
}

export async function sendEscalationEmail(
  to: string,
  details: {
    leadName: string;
    company: string;
    score: number;
    temperature: string;
    summary: string;
  },
): Promise<void> {
  await sendEmail(
    to,
    `Escalation : ${details.leadName} (${details.company}) — Synap6ia`,
    `<p>Bonjour,</p>
<p>Un lead a été escaladé vers vous :</p>
<table style="border-collapse:collapse;width:100%;max-width:600px">
  <tr><td style="padding:8px;font-weight:bold">Lead</td><td style="padding:8px">${details.leadName}</td></tr>
  <tr><td style="padding:8px;font-weight:bold">Entreprise</td><td style="padding:8px">${details.company}</td></tr>
  <tr><td style="padding:8px;font-weight:bold">Score</td><td style="padding:8px">${details.score}/100</td></tr>
  <tr><td style="padding:8px;font-weight:bold">Température</td><td style="padding:8px">${details.temperature}</td></tr>
</table>
<div style="margin:16px 0;padding:12px;background:#f5f5f5;border-radius:8px">${details.summary.replace(/\n/g, '<br>')}</div>`,
  );
}

// ─── Weekly Report Email (Story 9.3) ─────────────────────────

export async function sendWeeklyReportEmail(
  to: string,
  details: { period: string; report: string },
): Promise<void> {
  await sendEmail(
    to,
    `Rapport hebdomadaire marketing (${details.period}) — Synap6ia`,
    `<div style="font-family:sans-serif;max-width:700px;margin:0 auto">
<h2 style="color:#6366f1">Rapport Hebdomadaire Marketing</h2>
<p style="color:#888">Période : ${details.period}</p>
<div style="white-space:pre-wrap;line-height:1.6;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">${details.report}</div>
<p style="color:#888;font-size:12px;margin-top:24px">Ce rapport a été généré automatiquement par Synap6ia Marketing AI.</p>
</div>`,
  );
}

// ─── Lead Proposal Email (Story 6.4) ─────────────────────────

export async function sendLeadProposalEmail(
  to: string,
  details: {
    firstName: string;
    proposalMessage: string;
    bookingId: string;
  },
): Promise<void> {
  await sendEmail(
    to,
    `${details.firstName}, prenons rendez-vous ! — Synap6ia`,
    `<p>${details.proposalMessage.replace(/\n/g, '<br>')}</p>
<p style="color:#888;font-size:12px">Ref: ${details.bookingId}</p>`,
  );
}
