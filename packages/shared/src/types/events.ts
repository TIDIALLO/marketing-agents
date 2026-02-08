// WebSocket event types — 16 event types for real-time dashboard

import type { Platform } from './content';
import type { AdPlatform } from './ads';
import type { LeadSource, LeadTemperature } from './leads';

// Agent 1 — Content Flywheel events
export interface ContentGeneratedEvent {
  contentPieceId: string;
  platform: Platform;
  status: string;
  timestamp: string;
}

export interface ContentApprovedEvent {
  contentPieceId: string;
  approvedBy: string;
  timestamp: string;
}

export interface ContentPublishedEvent {
  contentPieceId: string;
  platform: Platform;
  platformPostId: string;
  timestamp: string;
}

export interface ContentSignalEvent {
  signalId: string;
  contentPieceId: string;
  signalType: string;
  strength: number;
  timestamp: string;
}

// Agent 2 — Amplification Engine events
export interface CampaignCreatedEvent {
  campaignId: string;
  name: string;
  platform: AdPlatform;
  timestamp: string;
}

export interface CampaignLaunchedEvent {
  campaignId: string;
  status: string;
  timestamp: string;
}

export interface CampaignOptimizedEvent {
  campaignId: string;
  action: string;
  details: string;
  timestamp: string;
}

// Agent 3 — Opportunity Hunter events
export interface LeadNewEvent {
  leadId: string;
  name: string;
  source: LeadSource;
  score: number | null;
  timestamp: string;
}

export interface LeadQualifiedEvent {
  leadId: string;
  score: number;
  temperature: LeadTemperature;
  timestamp: string;
}

export interface LeadConvertedEvent {
  leadId: string;
  value: number;
  timestamp: string;
}

export interface LeadBookedEvent {
  leadId: string;
  bookingId: string;
  scheduledAt: string;
  timestamp: string;
}

// System events
export interface ApprovalNewEvent {
  approvalId: string;
  entityType: string;
  priority: string;
  timestamp: string;
}

export interface AgentStatusEvent {
  agentId: number;
  status: string;
  lastRun: string;
  timestamp: string;
}

export interface NotificationEvent {
  type: string;
  message: string;
  actionUrl: string | null;
  timestamp: string;
}

// Event map for Socket.io typing
export interface ServerToClientEvents {
  'content:generated': (data: ContentGeneratedEvent) => void;
  'content:approved': (data: ContentApprovedEvent) => void;
  'content:published': (data: ContentPublishedEvent) => void;
  'content:signal': (data: ContentSignalEvent) => void;
  'campaign:created': (data: CampaignCreatedEvent) => void;
  'campaign:launched': (data: CampaignLaunchedEvent) => void;
  'campaign:optimized': (data: CampaignOptimizedEvent) => void;
  'lead:new': (data: LeadNewEvent) => void;
  'lead:qualified': (data: LeadQualifiedEvent) => void;
  'lead:converted': (data: LeadConvertedEvent) => void;
  'lead:booked': (data: LeadBookedEvent) => void;
  'approval:new': (data: ApprovalNewEvent) => void;
  'agent:status': (data: AgentStatusEvent) => void;
  'notification': (data: NotificationEvent) => void;
}

export interface ClientToServerEvents {
  'join:tenant': (tenantId: string) => void;
  'leave:tenant': (tenantId: string) => void;
}
