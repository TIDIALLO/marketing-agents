import { vi } from 'vitest';

function createModelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
    groupBy: vi.fn(),
    aggregate: vi.fn(),
  };
}

export function createMockPrisma() {
  return {
    platformUser: createModelMock(),
    passwordResetToken: createModelMock(),
    brand: createModelMock(),
    product: createModelMock(),
    landingPage: createModelMock(),
    emailTemplate: createModelMock(),
    emailCampaign: createModelMock(),
    socialAccount: createModelMock(),
    adAccount: createModelMock(),
    contentPillar: createModelMock(),
    contentInput: createModelMock(),
    contentPiece: createModelMock(),
    approvalQueue: createModelMock(),
    contentSchedule: createModelMock(),
    contentMetrics: createModelMock(),
    contentSignal: createModelMock(),
    dailyAnalytics: createModelMock(),
    lead: createModelMock(),
    calendarBooking: createModelMock(),
    leadSequence: createModelMock(),
    leadSequenceEnrollment: createModelMock(),
    leadInteraction: createModelMock(),
    competitorAd: createModelMock(),
    adCampaign: createModelMock(),
    adSet: createModelMock(),
    adCreative: createModelMock(),
    adMetrics: createModelMock(),
    aBTest: createModelMock(),
    aiLearningLog: createModelMock(),
    agentMessage: createModelMock(),
    workflowError: createModelMock(),
    $transaction: vi.fn(),
  };
}

export type MockPrisma = ReturnType<typeof createMockPrisma>;
