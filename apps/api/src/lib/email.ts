const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@synap6ia.com';

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: 'Réinitialisation de votre mot de passe — Synap6ia',
      html: `<p>Bonjour,</p><p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ce lien expire dans 1 heure.</p><p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>`,
    });
  } else {
    console.log(`[DEV] Password reset link for ${to}: ${resetUrl}`);
  }
}
