const now = new Date('2025-01-15');

const defaults = {
  abTest: {
    id: 'abt-1',
    name: 'CTA Button Color Test',
    entityType: 'content_piece',
    controlId: 'cp-1',
    variantId: 'cp-2',
    metric: 'engagement_score',
    status: 'running',
    controlViews: 500,
    controlSuccess: 50,
    variantViews: 500,
    variantSuccess: 65,
    confidenceLevel: null,
    winner: null,
    conclusion: null,
    startedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  },
  aiLearningLog: {
    id: 'all-1',
    agentType: 'content_flywheel',
    actionType: 'generate_content',
    entityType: 'content_piece',
    entityId: 'cp-1',
    input: { prompt: 'Generate LinkedIn post about SOC automation' },
    output: { text: 'AI-generated content about SOC' },
    outcome: 'approved',
    embedding: null,
    createdAt: now,
  },
  agentMessage: {
    id: 'msg-1',
    channel: 'content.generated',
    payload: { contentPieceId: 'cp-1', status: 'draft' },
    correlationId: 'corr-1',
    consumed: false,
    consumedAt: null,
    consumedBy: null,
    retryCount: 0,
    error: null,
    createdAt: now,
  },
  workflowError: {
    id: 'we-1',
    workflowId: 'mkt-101',
    workflowName: 'Content Research',
    nodeName: 'AI Generate',
    errorMessage: 'Claude API rate limit exceeded',
    errorStack: 'Error: 429 Too Many Requests',
    payload: { contentInputId: 'ci-1' },
    createdAt: now,
  },
  dailyAnalytics: {
    id: 'da-1',
    brandId: 'brand-1',
    date: new Date('2025-01-15'),
    contentsPublished: 3,
    impressions: 5000,
    engagements: 500,
    avgEngagementRate: 10.0,
    adSpend: 50.0,
    leadsGenerated: 5,
    leadsQualified: 2,
    conversions: 1,
    createdAt: now,
  },
};

export function buildABTest(overrides?: Partial<typeof defaults.abTest>) {
  return { ...defaults.abTest, ...overrides };
}

export function buildAiLearningLog(overrides?: Partial<typeof defaults.aiLearningLog>) {
  return { ...defaults.aiLearningLog, ...overrides };
}

export function buildAgentMessage(overrides?: Partial<typeof defaults.agentMessage>) {
  return { ...defaults.agentMessage, ...overrides };
}

export function buildWorkflowError(overrides?: Partial<typeof defaults.workflowError>) {
  return { ...defaults.workflowError, ...overrides };
}

export function buildDailyAnalytics(overrides?: Partial<typeof defaults.dailyAnalytics>) {
  return { ...defaults.dailyAnalytics, ...overrides };
}
