// Content Flywheel (Agent 1) types

export type Platform = 'linkedin' | 'facebook' | 'instagram' | 'tiktok' | 'twitter';

export type ContentInputType = 'text' | 'audio' | 'url' | 'image';

export type ContentStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'failed';

export type ScheduleStatus = 'scheduled' | 'published' | 'failed' | 'cancelled';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'modified';

export type ApprovalEntityType = 'content_piece' | 'ad_campaign';

export type SignalType = 'high_engagement' | 'viral_potential' | 'conversion_driver';

export interface ContentInput {
  id: string;
  brandId: string;
  inputType: ContentInputType;
  rawContent: string;
  transcription: string | null;
  aiSummary: string | null;
  aiSuggestedTopics: string[] | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPiece {
  id: string;
  brandId: string;
  contentInputId: string | null;
  parentId: string | null;
  platform: Platform;
  title: string;
  body: string;
  hashtags: string[];
  callToAction: string | null;
  mediaUrl: string | null;
  status: ContentStatus;
  platformPostId: string | null;
  engagementScore: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentSchedule {
  id: string;
  contentPieceId: string;
  socialAccountId: string;
  scheduledAt: string;
  publishedAt: string | null;
  status: ScheduleStatus;
}

export interface ContentSignal {
  id: string;
  contentPieceId: string;
  signalType: SignalType;
  signalStrength: number;
  aiRecommendation: string;
  createdAt: string;
}

export interface ContentMetrics {
  id: string;
  contentPieceId: string;
  impressions: number;
  reach: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  videoViews: number;
  engagementRate: number;
  collectedAt: string;
}
