// Analytics & system types

export interface DailyAnalytics {
  id: string;
  tenantId: string;
  organizationId: string;
  date: string;
  contentsPublished: number;
  totalImpressions: number;
  totalEngagements: number;
  avgEngagementRate: number;
  adSpend: number;
  leadsGenerated: number;
  leadsQualified: number;
  conversions: number;
  conversionValue: number;
  createdAt: string;
}

export type InsightType =
  | 'content_performance'
  | 'ad_optimization'
  | 'lead_qualification'
  | 'audience_insight';

export interface AiLearningLog {
  id: string;
  tenantId: string;
  insightType: InsightType;
  description: string;
  confidence: number;
  action: string;
  embedding: number[] | null;
  validatedAt: string | null;
  createdAt: string;
}
