const now = new Date('2025-01-15');

const defaults = {
  contentPillar: {
    id: 'pillar-1',
    brandId: 'brand-1',
    name: 'Cybersecurity Best Practices',
    description: 'Content about security operations and automation',
    createdAt: now,
    updatedAt: now,
  },
  contentInput: {
    id: 'ci-1',
    brandId: 'brand-1',
    pillarId: 'pillar-1',
    createdById: 'user-1',
    inputType: 'text',
    rawContent: 'How AI is transforming SOC operations for SMBs',
    sourceUrl: null,
    audioFileUrl: null,
    transcription: null,
    aiSummary: 'AI-powered security operations centers are becoming accessible to small businesses.',
    aiSuggestedTopics: ['AI SOC', 'SMB security', 'automation'],
    aiResearch: null,
    status: 'processed',
    processedAt: now,
    createdAt: now,
    updatedAt: now,
  },
  contentPiece: {
    id: 'cp-1',
    brandId: 'brand-1',
    contentInputId: 'ci-1',
    parentId: null,
    platform: 'linkedin',
    title: 'Why SMBs Need Automated SOC',
    body: 'In 2025, small businesses face the same cyber threats as enterprises. Here is why automated SOC matters.',
    hashtags: ['#cybersecurity', '#SMB', '#automation'],
    callToAction: 'Learn more at synap6ia.com',
    mediaUrl: null,
    mediaPrompt: null,
    framework: 'AIDA',
    templateId: null,
    templateData: null,
    parentPieceId: null,
    repurposeType: null,
    status: 'draft',
    platformPostId: null,
    engagementScore: 0,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  },
  contentMetrics: {
    id: 'cm-1',
    contentPieceId: 'cp-1',
    platform: 'linkedin',
    impressions: 1500,
    reach: 1200,
    engagements: 150,
    likes: 80,
    comments: 25,
    shares: 15,
    saves: 10,
    clicks: 20,
    videoViews: 0,
    engagementRate: 10.0,
    collectionAge: null,
    collectedAt: now,
  },
  contentSignal: {
    id: 'cs-1',
    contentPieceId: 'cp-1',
    signalType: 'viral_potential',
    signalStrength: 0.85,
    aiRecommendation: 'Boost this post with paid promotion.',
    createdAt: now,
  },
  contentSchedule: {
    id: 'sched-1',
    contentPieceId: 'cp-1',
    socialAccountId: 'sa-1',
    scheduledAt: new Date('2025-02-01T10:00:00Z'),
    publishedAt: null,
    status: 'scheduled',
    retryCount: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  },
  approvalQueue: {
    id: 'aq-1',
    entityType: 'content_piece',
    entityId: 'cp-1',
    assigneeId: 'user-1',
    status: 'pending',
    priority: 'normal',
    actionToken: 'hashed-token',
    tokenExpiresAt: new Date(Date.now() + 72 * 3600_000),
    reminderCount: 0,
    resolvedAt: null,
    resolvedBy: null,
    resolution: null,
    createdAt: now,
    updatedAt: now,
  },
};

export function buildContentPillar(overrides?: Partial<typeof defaults.contentPillar>) {
  return { ...defaults.contentPillar, ...overrides };
}

export function buildContentInput(overrides?: Partial<typeof defaults.contentInput>) {
  return { ...defaults.contentInput, ...overrides };
}

export function buildContentPiece(overrides?: Partial<typeof defaults.contentPiece>) {
  return { ...defaults.contentPiece, ...overrides };
}

export function buildContentMetrics(overrides?: Partial<typeof defaults.contentMetrics>) {
  return { ...defaults.contentMetrics, ...overrides };
}

export function buildContentSignal(overrides?: Partial<typeof defaults.contentSignal>) {
  return { ...defaults.contentSignal, ...overrides };
}

export function buildContentSchedule(overrides?: Partial<typeof defaults.contentSchedule>) {
  return { ...defaults.contentSchedule, ...overrides };
}

export function buildApprovalQueue(overrides?: Partial<typeof defaults.approvalQueue>) {
  return { ...defaults.approvalQueue, ...overrides };
}
