const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// ─── Claude (Text Generation & Analysis) ─────────────────────

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function claudeGenerate(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  if (!CLAUDE_API_KEY) {
    console.log('[DEV] Claude API not configured — returning mock response');
    // If the prompt asks for JSON, return a plausible mock JSON
    if (systemPrompt.includes('JSON')) {
      return JSON.stringify({
        tagline: '[MOCK] Tagline générée par IA',
        description: '[MOCK] Description courte générée automatiquement.',
        longDescription: '[MOCK] Description longue en markdown.\n\n**Problème**: ...\n\n**Solution**: ...',
        title: '[MOCK] Titre généré',
        body: '[MOCK] Contenu généré automatiquement pour test.',
        hashtags: ['#mock', '#test'],
        callToAction: '[MOCK] Découvrir maintenant',
        framework: 'pas',
        features: [
          { icon: 'sparkles', title: '[MOCK] Feature 1', description: 'Description mock' },
        ],
        ctaText: '[MOCK] Essayer gratuitement',
        seoTitle: '[MOCK] SEO Title',
        seoDescription: '[MOCK] SEO meta description pour le produit.',
        subject: '[MOCK] Sujet email',
        previewText: '[MOCK] Aperçu email',
        htmlContent: '<p>[MOCK] Contenu email HTML</p>',
      });
    }
    return `[MOCK] AI response for: ${userMessage.slice(0, 100)}...`;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }] satisfies ClaudeMessage[],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error (${response.status}): ${error}`);
  }

  const data = await response.json() as { content?: { text?: string }[] };
  return data.content?.[0]?.text ?? '';
}

// ─── OpenAI Whisper (Audio Transcription) ─────────────────────

export async function whisperTranscribe(audioBuffer: Buffer, filename: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.log('[DEV] OpenAI API not configured — returning mock transcription');
    return '[MOCK] Transcription du fichier audio...';
  }

  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer]), filename);
  formData.append('model', 'whisper-1');
  formData.append('language', 'fr');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API error (${response.status}): ${error}`);
  }

  const data = await response.json() as { text?: string };
  return data.text ?? '';
}

// ─── DALL-E (Image Generation) ────────────────────────────────

interface DalleOptions {
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
}

export async function dalleGenerate(
  prompt: string,
  options: DalleOptions = {},
): Promise<string> {
  const { size = '1024x1024', quality = 'standard' } = options;

  if (!OPENAI_API_KEY) {
    console.log('[DEV] OpenAI API not configured — returning mock image URL');
    return 'https://placehold.co/1024x1024/6366f1/white?text=AI+Generated';
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality,
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DALL-E API error (${response.status}): ${error}`);
  }

  const data = await response.json() as { data?: { url?: string }[] };
  return data.data?.[0]?.url ?? '';
}
