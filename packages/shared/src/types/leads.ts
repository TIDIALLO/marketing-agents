// Opportunity Hunter (Agent 3) types

export type LeadSource = 'form' | 'ad' | 'webinar' | 'referral' | 'manual' | 'csv';

export type LeadTemperature = 'hot' | 'warm' | 'cold';

export type LeadStatus = 'new' | 'qualified' | 'nurturing' | 'opportunity' | 'converted' | 'lost';

export type InteractionDirection = 'inbound' | 'outbound';

export type InteractionChannel = 'email' | 'whatsapp' | 'phone' | 'slack' | 'form';

export type AiSentiment = 'positive' | 'neutral' | 'negative';

export type AiIntent =
  | 'interested'
  | 'needs_info'
  | 'not_ready'
  | 'objection'
  | 'ready_to_buy'
  | 'unsubscribe';

export type SequenceEnrollmentStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Lead {
  id: string;
  tenantId: string;
  brandId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  source: LeadSource;
  sourceDetail: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  score: number | null;
  temperature: LeadTemperature | null;
  status: LeadStatus;
  gdprConsent: boolean;
  assignedTo: string | null;
  convertedAt: string | null;
  conversionValue: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadInteraction {
  id: string;
  leadId: string;
  direction: InteractionDirection;
  channel: InteractionChannel;
  content: string;
  aiSentiment: AiSentiment | null;
  aiIntent: AiIntent | null;
  createdAt: string;
}

export interface LeadSequence {
  id: string;
  tenantId: string;
  name: string;
  steps: SequenceStep[];
  createdAt: string;
  updatedAt: string;
}

export interface SequenceStep {
  order: number;
  channel: InteractionChannel;
  delayHours: number;
  bodyPrompt: string;
}

export interface CalendarBooking {
  id: string;
  leadId: string;
  userId: string;
  scheduledAt: string;
  status: BookingStatus;
  aiBriefing: string | null;
  calcomEventId: string | null;
  createdAt: string;
}
