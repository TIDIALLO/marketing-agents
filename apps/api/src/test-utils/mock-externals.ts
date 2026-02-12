import { vi } from 'vitest';

export function mockAi() {
  const mocks = {
    claudeGenerate: vi.fn().mockResolvedValue('{"result": "mock AI response"}'),
    whisperTranscribe: vi.fn().mockResolvedValue('Transcribed text from audio'),
    dalleGenerate: vi.fn().mockResolvedValue('https://example.com/generated-image.png'),
  };

  vi.mock('../../lib/ai', () => mocks);
  return mocks;
}

export function mockRedis() {
  const mocks = {
    publishEvent: vi.fn().mockResolvedValue(undefined),
    getRedis: vi.fn().mockReturnValue({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      publish: vi.fn(),
      subscribe: vi.fn(),
    }),
  };

  vi.mock('../../lib/redis', () => mocks);
  return mocks;
}

export function mockSlack() {
  const mocks = {
    sendSlackNotification: vi.fn().mockResolvedValue(true),
  };

  vi.mock('../../lib/slack', () => mocks);
  return mocks;
}

export function mockSocket() {
  const mocks = {
    emitEvent: vi.fn(),
    getIO: vi.fn().mockReturnValue({ emit: vi.fn() }),
    initSocket: vi.fn(),
  };

  vi.mock('../../lib/socket', () => mocks);
  return mocks;
}

export function mockN8n() {
  const mocks = {
    triggerWorkflow: vi.fn().mockResolvedValue({ success: true }),
  };

  vi.mock('../../lib/n8n', () => mocks);
  return mocks;
}

export function mockEmail() {
  const mocks = {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendApprovalEmail: vi.fn().mockResolvedValue(undefined),
    sendApprovalReminderEmail: vi.fn().mockResolvedValue(undefined),
    sendNurturingEmail: vi.fn().mockResolvedValue(undefined),
    sendEscalationEmail: vi.fn().mockResolvedValue(undefined),
    sendWeeklyReportEmail: vi.fn().mockResolvedValue(undefined),
    sendLeadProposalEmail: vi.fn().mockResolvedValue(undefined),
  };

  vi.mock('../../lib/email', () => mocks);
  return mocks;
}

export function mockEncryption() {
  const mocks = {
    encrypt: vi.fn().mockImplementation((text: string) => `encrypted:${text}`),
    decrypt: vi.fn().mockImplementation((text: string) => text.replace('encrypted:', '')),
  };

  vi.mock('../../lib/encryption', () => mocks);
  return mocks;
}

export function mockCalcom() {
  const mocks = {
    getAvailableSlots: vi.fn().mockResolvedValue([
      { start: '2025-02-01T10:00:00Z', end: '2025-02-01T10:30:00Z' },
      { start: '2025-02-01T14:00:00Z', end: '2025-02-01T14:30:00Z' },
    ]),
    createBooking: vi.fn().mockResolvedValue({ id: 'calcom-booking-1', status: 'accepted' }),
  };

  vi.mock('../../lib/calcom', () => mocks);
  return mocks;
}
