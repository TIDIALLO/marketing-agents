// Amplification Engine (Agent 2) types

export type AdPlatform = 'facebook' | 'tiktok' | 'google';

export type CampaignStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'paused' | 'completed' | 'archived';

export type CampaignObjective = 'awareness' | 'traffic' | 'leads' | 'conversions';

export interface AdCampaign {
  id: string;
  tenantId: string;
  brandId: string;
  contentSignalId: string | null;
  name: string;
  platform: AdPlatform;
  objective: CampaignObjective;
  dailyBudget: number;
  totalBudget: number;
  status: CampaignStatus;
  platformCampaignId: string | null;
  targeting: AdTargeting;
  kpiTargets: KpiTargets;
  createdAt: string;
  updatedAt: string;
}

export interface AdTargeting {
  ageMin: number;
  ageMax: number;
  genders: string[];
  interests: string[];
  locations: string[];
  customAudiences: string[];
}

export interface KpiTargets {
  targetCpc: number;
  targetCtr: number;
  targetRoas: number;
}

export interface AdSet {
  id: string;
  campaignId: string;
  name: string;
  dailyBudget: number;
  targeting: AdTargeting;
  platformAdsetId: string | null;
  status: string;
}

export interface AdCreative {
  id: string;
  campaignId: string;
  adSetId: string | null;
  title: string;
  body: string;
  imageUrl: string;
  callToActionType: string;
  platformCreativeId: string | null;
}

export interface AdMetrics {
  id: string;
  campaignId: string;
  adSetId: string | null;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  cpc: number;
  cpm: number;
  ctr: number;
  roas: number;
  collectedAt: string;
}
