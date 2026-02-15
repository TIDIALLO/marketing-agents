const now = new Date('2025-01-15');

const defaults = {
  socialAccount: {
    id: 'sa-1',
    brandId: 'brand-1',
    platform: 'linkedin',
    platformUserId: 'li-user-123',
    platformUsername: 'mktengine',
    profileType: 'company',
    accessTokenEncrypted: 'encrypted-access-token',
    refreshTokenEncrypted: 'encrypted-refresh-token',
    tokenExpiresAt: new Date('2025-06-01'),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  adAccount: {
    id: 'aa-1',
    socialAccountId: 'sa-1',
    platform: 'meta',
    platformAccountId: 'act_123456',
    name: 'MarketingEngine Ads',
    credentialsEncrypted: 'encrypted-creds',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  competitorAd: {
    id: 'ca-1',
    brandId: 'brand-1',
    platform: 'meta',
    competitorName: 'CyberGuard Inc',
    adContent: 'Protect your business with our enterprise-grade SOC',
    imageUrl: 'https://example.com/ad.jpg',
    aiAnalysis: 'Competitor targets enterprise market with fear-based messaging.',
    collectedAt: now,
  },
  adCampaign: {
    id: 'ac-1',
    brandId: 'brand-1',
    adAccountId: 'aa-1',
    contentSignalId: 'cs-1',
    name: 'SOC Launch Campaign',
    platform: 'meta',
    objective: 'traffic',
    dailyBudget: 50,
    totalBudget: 1500,
    status: 'draft',
    platformCampaignId: null,
    targeting: { locations: ['FR'], ageRange: [25, 55], interests: ['cybersecurity'] },
    kpiTargets: { cpc: 1.5, ctr: 2.0 },
    aiProposal: null,
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-02-28'),
    createdAt: now,
    updatedAt: now,
  },
  adSet: {
    id: 'as-1',
    campaignId: 'ac-1',
    name: 'CTO Targeting',
    dailyBudget: 25,
    targeting: { jobTitles: ['CTO', 'CISO'] },
    platformAdsetId: null,
    status: 'active',
  },
  adCreative: {
    id: 'acr-1',
    campaignId: 'ac-1',
    adSetId: 'as-1',
    title: 'Automate Your SOC',
    body: 'Stop wasting time on manual security. Let AI handle it.',
    imageUrl: 'https://example.com/creative.jpg',
    callToActionType: 'LEARN_MORE',
    platformCreativeId: null,
  },
  adMetrics: {
    id: 'am-1',
    campaignId: 'ac-1',
    adSetId: 'as-1',
    impressions: 10000,
    clicks: 250,
    spend: 375.0,
    conversions: 12,
    cpc: 1.5,
    cpm: 37.5,
    ctr: 2.5,
    roas: 3.2,
    collectedAt: now,
  },
};

export function buildSocialAccount(overrides?: Partial<typeof defaults.socialAccount>) {
  return { ...defaults.socialAccount, ...overrides };
}

export function buildAdAccount(overrides?: Partial<typeof defaults.adAccount>) {
  return { ...defaults.adAccount, ...overrides };
}

export function buildCompetitorAd(overrides?: Partial<typeof defaults.competitorAd>) {
  return { ...defaults.competitorAd, ...overrides };
}

export function buildAdCampaign(overrides?: Partial<typeof defaults.adCampaign>) {
  return { ...defaults.adCampaign, ...overrides };
}

export function buildAdSet(overrides?: Partial<typeof defaults.adSet>) {
  return { ...defaults.adSet, ...overrides };
}

export function buildAdCreative(overrides?: Partial<typeof defaults.adCreative>) {
  return { ...defaults.adCreative, ...overrides };
}

export function buildAdMetrics(overrides?: Partial<typeof defaults.adMetrics>) {
  return { ...defaults.adMetrics, ...overrides };
}
