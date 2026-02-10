import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 4100}`;

// GET /embed/form/:brandId — standalone embeddable lead capture form
router.get('/form/:brandId', async (req, res) => {
  const { brandId } = req.params;

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true, name: true },
  });

  if (!brand) {
    res.status(404).send('<html><body><p>Formulaire introuvable.</p></body></html>');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact — ${escapeHtml(brand.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f9fafb;
      color: #1f2937;
      line-height: 1.5;
    }
    .container {
      max-width: 480px;
      margin: 24px auto;
      padding: 32px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 4px;
      color: #111827;
    }
    .subtitle {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 24px;
    }
    .field {
      margin-bottom: 16px;
    }
    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 4px;
      color: #374151;
    }
    input, textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus, textarea:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
    }
    textarea { resize: vertical; min-height: 80px; }
    .row { display: flex; gap: 12px; }
    .row > .field { flex: 1; }
    .checkbox-field {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 16px 0;
    }
    .checkbox-field input[type="checkbox"] {
      width: auto;
      margin-top: 3px;
    }
    .checkbox-field label {
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 400;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #6366f1;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: #4f46e5; }
    button:disabled { background: #9ca3af; cursor: not-allowed; }
    .success {
      text-align: center;
      padding: 40px 20px;
    }
    .success h3 { color: #059669; font-size: 1.125rem; margin-bottom: 8px; }
    .success p { color: #6b7280; font-size: 0.875rem; }
    .error-msg { color: #dc2626; font-size: 0.75rem; margin-top: 8px; }
    .powered {
      text-align: center;
      margin-top: 16px;
      font-size: 0.7rem;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container" id="form-container">
    <h2>Contactez ${escapeHtml(brand.name)}</h2>
    <p class="subtitle">Remplissez le formulaire et nous vous recontacterons rapidement.</p>
    <form id="lead-form">
      <div class="row">
        <div class="field">
          <label for="firstName">Prenom *</label>
          <input type="text" id="firstName" name="firstName" required>
        </div>
        <div class="field">
          <label for="lastName">Nom *</label>
          <input type="text" id="lastName" name="lastName" required>
        </div>
      </div>
      <div class="field">
        <label for="email">Email professionnel *</label>
        <input type="email" id="email" name="email" required>
      </div>
      <div class="field">
        <label for="company">Entreprise</label>
        <input type="text" id="company" name="company">
      </div>
      <div class="field">
        <label for="phone">Telephone</label>
        <input type="tel" id="phone" name="phone" placeholder="+221 77 000 00 00">
      </div>
      <div class="field">
        <label for="message">Message</label>
        <textarea id="message" name="message" placeholder="Comment pouvons-nous vous aider ?"></textarea>
      </div>
      <div class="checkbox-field">
        <input type="checkbox" id="gdprConsent" name="gdprConsent">
        <label for="gdprConsent">J'accepte que mes donnees soient traitees pour etre recontacte. Conformite RGPD.</label>
      </div>
      <div id="error" class="error-msg" style="display:none"></div>
      <button type="submit" id="submit-btn">Envoyer</button>
    </form>
  </div>
  <div class="powered">Powered by Synap6ia</div>
  <script>
    document.getElementById('lead-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = document.getElementById('submit-btn');
      const errorEl = document.getElementById('error');
      btn.disabled = true;
      btn.textContent = 'Envoi en cours...';
      errorEl.style.display = 'none';

      const data = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        company: document.getElementById('company').value || undefined,
        phone: document.getElementById('phone').value || undefined,
        message: document.getElementById('message').value || undefined,
        gdprConsent: document.getElementById('gdprConsent').checked,
      };

      try {
        const res = await fetch('${API_URL}/api/webhooks/lead-form/${brandId}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Erreur serveur');

        document.getElementById('form-container').innerHTML = \`
          <div class="success">
            <h3>Merci !</h3>
            <p>Nous avons bien recu votre message et vous recontacterons tres rapidement.</p>
          </div>
        \`;
      } catch (err) {
        errorEl.textContent = 'Une erreur est survenue. Veuillez reessayer.';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Envoyer';
      }
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export { router as embedRoutes };
