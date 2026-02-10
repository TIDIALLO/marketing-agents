import { readFileSync } from 'fs';
import { join } from 'path';

// Lazy-load puppeteer to avoid issues when not installed
let puppeteer: typeof import('puppeteer') | null = null;

async function getPuppeteer() {
  if (!puppeteer) {
    puppeteer = await import('puppeteer');
  }
  return puppeteer;
}

// ─── Platform Dimensions ────────────────────────────────────

export const PLATFORM_DIMENSIONS: Record<string, { width: number; height: number }> = {
  linkedin: { width: 1200, height: 627 },
  twitter: { width: 1600, height: 900 },
  instagram: { width: 1080, height: 1080 },
  facebook: { width: 1200, height: 630 },
  tiktok: { width: 1080, height: 1920 },
};

// ─── Template Definition ────────────────────────────────────

export interface VisualTemplate {
  id: string;
  name: string;
  description: string;
  variables: string[];
  bestFor: string[];
}

export const TEMPLATES: VisualTemplate[] = [
  {
    id: 'quote-card',
    name: 'Quote Card',
    description: 'Bold quote with attribution and brand colors',
    variables: ['quote', 'author', 'role', 'brandColor', 'brandName'],
    bestFor: ['linkedin', 'twitter', 'instagram'],
  },
  {
    id: 'stat-highlight',
    name: 'Stat Highlight',
    description: 'Large statistic with context and visual impact',
    variables: ['stat', 'label', 'context', 'brandColor', 'brandName'],
    bestFor: ['linkedin', 'twitter'],
  },
  {
    id: 'tip-card',
    name: 'Tip Card',
    description: 'Numbered tip with icon and explanation',
    variables: ['tipNumber', 'title', 'description', 'brandColor', 'brandName'],
    bestFor: ['linkedin', 'instagram'],
  },
  {
    id: 'product-feature',
    name: 'Product Feature',
    description: 'Highlight a product feature with benefit',
    variables: ['featureTitle', 'featureDesc', 'benefit', 'brandColor', 'brandName'],
    bestFor: ['linkedin', 'facebook'],
  },
  {
    id: 'announcement',
    name: 'Announcement',
    description: 'Bold announcement banner with CTA',
    variables: ['headline', 'subheadline', 'ctaText', 'brandColor', 'brandName'],
    bestFor: ['linkedin', 'twitter', 'facebook'],
  },
  {
    id: 'comparison',
    name: 'Before/After Comparison',
    description: 'Two-column before/after or versus comparison',
    variables: ['leftTitle', 'leftItems', 'rightTitle', 'rightItems', 'brandColor', 'brandName'],
    bestFor: ['linkedin', 'instagram'],
  },
  {
    id: 'carousel-slide',
    name: 'Carousel Slide',
    description: 'Single slide for carousel/multi-image posts',
    variables: ['slideNumber', 'totalSlides', 'title', 'content', 'brandColor', 'brandName'],
    bestFor: ['linkedin', 'instagram'],
  },
];

export function listTemplates(): VisualTemplate[] {
  return TEMPLATES;
}

export function getTemplate(id: string): VisualTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

// ─── Template Rendering ─────────────────────────────────────

function loadTemplateHtml(templateId: string): string {
  const templatePath = join(__dirname, '..', 'templates', `${templateId}.html`);
  return readFileSync(templatePath, 'utf-8');
}

function injectVariables(html: string, variables: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export async function renderTemplate(
  templateId: string,
  variables: Record<string, string>,
  platform: string = 'linkedin',
): Promise<Buffer> {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template "${templateId}" not found`);
  }

  const dimensions = PLATFORM_DIMENSIONS[platform] ?? PLATFORM_DIMENSIONS.linkedin!;
  let html = loadTemplateHtml(templateId);
  html = injectVariables(html, {
    ...variables,
    _width: String(dimensions!.width),
    _height: String(dimensions!.height),
  });

  const pup = await getPuppeteer();
  const browser = await pup.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(dimensions!);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const screenshot = await page.screenshot({ type: 'png', fullPage: false });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}
