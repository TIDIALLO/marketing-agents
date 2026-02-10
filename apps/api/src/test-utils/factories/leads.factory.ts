const now = new Date('2025-01-15');

const defaults = {
  lead: {
    id: 'lead-1',
    brandId: 'brand-1',
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '+33612345678',
    company: 'TechCorp',
    source: 'form',
    sourceDetail: 'landing-page-soc',
    utmSource: 'linkedin',
    utmMedium: 'social',
    utmCampaign: 'launch-2025',
    score: 75,
    temperature: 'warm',
    status: 'qualified',
    gdprConsent: true,
    assignedTo: 'user-1',
    convertedAt: null,
    conversionValue: null,
    createdAt: now,
    updatedAt: now,
  },
  calendarBooking: {
    id: 'cb-1',
    leadId: 'lead-1',
    userId: 'user-1',
    scheduledAt: new Date('2025-02-01T14:00:00Z'),
    status: 'confirmed',
    aiBriefing: 'Jean is CTO at TechCorp, interested in automated SOC.',
    calcomEventId: 'calcom-123',
    proposedSlots: null,
    proposalMessage: null,
    confirmedAt: now,
    confirmedSlot: null,
    createdAt: now,
    updatedAt: now,
  },
  leadSequence: {
    id: 'seq-1',
    name: 'New Lead Nurturing',
    steps: [
      { type: 'email', delayDays: 0, templateId: 'et-1' },
      { type: 'email', delayDays: 3, templateId: 'et-2' },
      { type: 'task', delayDays: 7, action: 'call' },
    ],
    createdAt: now,
    updatedAt: now,
  },
  leadSequenceEnrollment: {
    id: 'lse-1',
    leadId: 'lead-1',
    sequenceId: 'seq-1',
    status: 'active',
    currentStep: 0,
    nextActionAt: new Date('2025-01-16'),
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  },
  leadInteraction: {
    id: 'li-1',
    leadId: 'lead-1',
    direction: 'outbound',
    channel: 'email',
    content: 'Welcome email sent to Jean Dupont',
    aiSentiment: 'neutral',
    aiIntent: 'nurturing',
    createdAt: now,
  },
};

export function buildLead(overrides?: Partial<typeof defaults.lead>) {
  return { ...defaults.lead, ...overrides };
}

export function buildCalendarBooking(overrides?: Partial<typeof defaults.calendarBooking>) {
  return { ...defaults.calendarBooking, ...overrides };
}

export function buildLeadSequence(overrides?: Partial<typeof defaults.leadSequence>) {
  return { ...defaults.leadSequence, ...overrides };
}

export function buildLeadSequenceEnrollment(overrides?: Partial<typeof defaults.leadSequenceEnrollment>) {
  return { ...defaults.leadSequenceEnrollment, ...overrides };
}

export function buildLeadInteraction(overrides?: Partial<typeof defaults.leadInteraction>) {
  return { ...defaults.leadInteraction, ...overrides };
}
