const now = new Date('2025-01-15');

const defaults = {
  brand: {
    id: 'brand-1',
    userId: 'user-1',
    name: 'Synap6ia',
    brandVoice: { tone: ['expert', 'approachable'], vocabulary: { preferred: ['secure', 'automate'] }, persona: { name: 'Alex', role: 'CTO' }, languageStyle: { formality: 'professional' } },
    targetAudience: { segments: ['CTO', 'CISO'], industries: ['tech', 'finance'] },
    contentGuidelines: null,
    visualGuidelines: null,
    createdAt: now,
    updatedAt: now,
  },
  product: {
    id: 'prod-1',
    brandId: 'brand-1',
    name: 'SOC Autopilot Hub',
    slug: 'soc-autopilot-hub',
    description: 'Automated SOC platform for SMBs',
    tagline: 'Your SOC on autopilot',
    longDescription: 'A comprehensive platform that automates security operations.',
    pricing: { plans: [{ name: 'Starter', price: 499 }, { name: 'Pro', price: 999 }] },
    features: [{ icon: 'shield', title: 'Threat Detection', description: 'AI-powered threat detection' }],
    testimonials: null,
    ctaText: 'Start Free Trial',
    ctaUrl: 'https://synap6ia.com/trial',
    isActive: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  },
  landingPage: {
    id: 'lp-1',
    brandId: 'brand-1',
    productId: 'prod-1',
    slug: 'soc-autopilot-hub',
    title: 'SOC Autopilot Hub',
    heroTitle: 'Automate Your Security Operations',
    heroSubtitle: 'AI-powered SOC for modern teams',
    heroCtaText: 'Start Free Trial',
    heroCtaUrl: 'https://synap6ia.com/trial',
    sections: [{ type: 'features', title: 'Features', items: [] }],
    seoTitle: 'SOC Autopilot Hub - Synap6ia',
    seoDescription: 'Automated SOC platform',
    isPublished: false,
    createdAt: now,
    updatedAt: now,
  },
  emailTemplate: {
    id: 'et-1',
    brandId: 'brand-1',
    name: 'Welcome Email',
    subject: 'Welcome to {{firstName}}!',
    htmlBody: '<h1>Welcome {{firstName}}</h1>',
    textBody: 'Welcome {{firstName}}',
    variables: { firstName: 'string', lastName: 'string' },
    createdAt: now,
    updatedAt: now,
  },
  emailCampaign: {
    id: 'ec-1',
    brandId: 'brand-1',
    templateId: 'et-1',
    name: 'Launch Campaign',
    subject: 'Discover SOC Autopilot Hub',
    status: 'draft',
    scheduledAt: null,
    sentAt: null,
    recipientFilter: { temperature: 'hot' },
    recipientCount: 0,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    createdAt: now,
    updatedAt: now,
  },
};

export function buildBrand(overrides?: Partial<typeof defaults.brand>) {
  return { ...defaults.brand, ...overrides };
}

export function buildProduct(overrides?: Partial<typeof defaults.product>) {
  return { ...defaults.product, ...overrides };
}

export function buildLandingPage(overrides?: Partial<typeof defaults.landingPage>) {
  return { ...defaults.landingPage, ...overrides };
}

export function buildEmailTemplate(overrides?: Partial<typeof defaults.emailTemplate>) {
  return { ...defaults.emailTemplate, ...overrides };
}

export function buildEmailCampaign(overrides?: Partial<typeof defaults.emailCampaign>) {
  return { ...defaults.emailCampaign, ...overrides };
}
