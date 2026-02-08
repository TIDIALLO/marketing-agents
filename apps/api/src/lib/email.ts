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
