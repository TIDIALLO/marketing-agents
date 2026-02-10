// ─── Meta Marketing API v22 Client ──────────────────────────
// https://developers.facebook.com/docs/marketing-apis/

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || '';
const META_API_VERSION = 'v22.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export function isMetaConfigured(): boolean {
  return !!(META_ACCESS_TOKEN && META_AD_ACCOUNT_ID);
}

async function metaFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${META_GRAPH_URL}${path}`;
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = `${url}${separator}access_token=${META_ACCESS_TOKEN}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Meta API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

// ─── Ad Library API (Competitor Research) ────────────────────

export interface AdLibraryResult {
  id: string;
  page_name: string;
  ad_creative_bodies: string[];
  ad_creative_link_titles: string[];
  ad_creative_link_captions: string[];
  ad_delivery_start_time: string;
  ad_delivery_stop_time?: string;
  publisher_platforms: string[];
  estimated_audience_size?: { lower_bound: number; upper_bound: number };
  spend?: { lower_bound: string; upper_bound: string };
  impressions?: { lower_bound: string; upper_bound: string };
  currency?: string;
}

interface AdLibraryResponse {
  data: AdLibraryResult[];
  paging?: { cursors: { after: string }; next?: string };
}

export async function searchAdLibrary(params: {
  searchTerms: string;
  adType?: 'ALL' | 'POLITICAL_AND_ISSUE_ADS';
  country?: string;
  limit?: number;
}): Promise<AdLibraryResult[]> {
  if (!isMetaConfigured()) {
    console.log('[Meta] Not configured — returning empty Ad Library results');
    return [];
  }

  const queryParams = new URLSearchParams({
    search_terms: params.searchTerms,
    ad_type: params.adType ?? 'ALL',
    ad_reached_countries: `["${params.country ?? 'FR'}"]`,
    fields: 'id,page_name,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_captions,ad_delivery_start_time,ad_delivery_stop_time,publisher_platforms,estimated_audience_size,spend,impressions,currency',
    limit: String(params.limit ?? 20),
  });

  try {
    const response = await metaFetch<AdLibraryResponse>(
      `/ads_archive?${queryParams}`,
    );
    return response.data ?? [];
  } catch (err) {
    console.error('[Meta] Ad Library search failed:', err);
    return [];
  }
}

// ─── Campaign Management ─────────────────────────────────────

export interface MetaCampaignInput {
  name: string;
  objective: string;
  status?: string;
  specialAdCategories?: string[];
  dailyBudget?: number; // in cents
  lifetimeBudget?: number; // in cents
}

interface MetaCampaignResponse {
  id: string;
}

export async function createCampaign(input: MetaCampaignInput): Promise<string | null> {
  if (!isMetaConfigured()) {
    console.log('[Meta] Not configured — skipping campaign creation');
    return null;
  }

  // Map our objectives to Meta's objective enum
  const objectiveMap: Record<string, string> = {
    traffic: 'OUTCOME_TRAFFIC',
    conversions: 'OUTCOME_SALES',
    awareness: 'OUTCOME_AWARENESS',
    engagement: 'OUTCOME_ENGAGEMENT',
    leads: 'OUTCOME_LEADS',
    app_installs: 'OUTCOME_APP_PROMOTION',
  };

  try {
    const response = await metaFetch<MetaCampaignResponse>(
      `/act_${META_AD_ACCOUNT_ID}/campaigns`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          objective: objectiveMap[input.objective] ?? 'OUTCOME_TRAFFIC',
          status: input.status ?? 'PAUSED',
          special_ad_categories: input.specialAdCategories ?? [],
        }),
      },
    );
    return response.id;
  } catch (err) {
    console.error('[Meta] Campaign creation failed:', err);
    return null;
  }
}

// ─── Ad Set Management ───────────────────────────────────────

export interface MetaAdSetInput {
  campaignId: string;
  name: string;
  dailyBudget: number; // in cents
  billingEvent?: string;
  optimizationGoal?: string;
  targeting: {
    ageMin?: number;
    ageMax?: number;
    genders?: number[];
    geoLocations?: { countries?: string[]; cities?: { key: string }[] };
    interests?: { id: string; name: string }[];
    behaviors?: { id: string; name: string }[];
  };
  startTime?: string;
  endTime?: string;
  status?: string;
}

interface MetaAdSetResponse {
  id: string;
}

export async function createAdSet(input: MetaAdSetInput): Promise<string | null> {
  if (!isMetaConfigured()) {
    console.log('[Meta] Not configured — skipping ad set creation');
    return null;
  }

  const targeting: Record<string, unknown> = {};
  if (input.targeting.ageMin) targeting.age_min = input.targeting.ageMin;
  if (input.targeting.ageMax) targeting.age_max = input.targeting.ageMax;
  if (input.targeting.genders) targeting.genders = input.targeting.genders;
  if (input.targeting.geoLocations) {
    targeting.geo_locations = {};
    if (input.targeting.geoLocations.countries) {
      (targeting.geo_locations as Record<string, unknown>).countries = input.targeting.geoLocations.countries;
    }
    if (input.targeting.geoLocations.cities) {
      (targeting.geo_locations as Record<string, unknown>).cities = input.targeting.geoLocations.cities;
    }
  }
  if (input.targeting.interests) {
    targeting.flexible_spec = [{ interests: input.targeting.interests }];
  }

  try {
    const response = await metaFetch<MetaAdSetResponse>(
      `/act_${META_AD_ACCOUNT_ID}/adsets`,
      {
        method: 'POST',
        body: JSON.stringify({
          campaign_id: input.campaignId,
          name: input.name,
          daily_budget: input.dailyBudget,
          billing_event: input.billingEvent ?? 'IMPRESSIONS',
          optimization_goal: input.optimizationGoal ?? 'LINK_CLICKS',
          targeting,
          status: input.status ?? 'PAUSED',
          ...(input.startTime ? { start_time: input.startTime } : {}),
          ...(input.endTime ? { end_time: input.endTime } : {}),
        }),
      },
    );
    return response.id;
  } catch (err) {
    console.error('[Meta] Ad Set creation failed:', err);
    return null;
  }
}

// ─── Ad Creative Management ──────────────────────────────────

export interface MetaCreativeInput {
  name: string;
  title: string;
  body: string;
  imageUrl?: string;
  linkUrl: string;
  callToActionType?: string;
  pageId: string;
}

interface MetaCreativeResponse {
  id: string;
}

export async function createAdCreative(input: MetaCreativeInput): Promise<string | null> {
  if (!isMetaConfigured()) {
    console.log('[Meta] Not configured — skipping creative creation');
    return null;
  }

  try {
    const objectStorySpec: Record<string, unknown> = {
      page_id: input.pageId,
      link_data: {
        message: input.body,
        link: input.linkUrl,
        name: input.title,
        call_to_action: {
          type: input.callToActionType ?? 'LEARN_MORE',
        },
        ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
      },
    };

    const response = await metaFetch<MetaCreativeResponse>(
      `/act_${META_AD_ACCOUNT_ID}/adcreatives`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          object_story_spec: objectStorySpec,
        }),
      },
    );
    return response.id;
  } catch (err) {
    console.error('[Meta] Creative creation failed:', err);
    return null;
  }
}

// ─── Ad Creation (links Creative + AdSet) ────────────────────

export async function createAd(params: {
  adSetId: string;
  creativeId: string;
  name: string;
  status?: string;
}): Promise<string | null> {
  if (!isMetaConfigured()) return null;

  try {
    const response = await metaFetch<{ id: string }>(
      `/act_${META_AD_ACCOUNT_ID}/ads`,
      {
        method: 'POST',
        body: JSON.stringify({
          adset_id: params.adSetId,
          creative: { creative_id: params.creativeId },
          name: params.name,
          status: params.status ?? 'PAUSED',
        }),
      },
    );
    return response.id;
  } catch (err) {
    console.error('[Meta] Ad creation failed:', err);
    return null;
  }
}

// ─── Campaign Insights API ───────────────────────────────────

export interface MetaInsight {
  impressions: string;
  clicks: string;
  spend: string;
  actions?: { action_type: string; value: string }[];
  cpc: string;
  cpm: string;
  ctr: string;
  date_start: string;
  date_stop: string;
}

interface InsightsResponse {
  data: MetaInsight[];
}

export async function getCampaignInsights(
  campaignId: string,
  dateRange?: { since: string; until: string },
): Promise<MetaInsight[]> {
  if (!isMetaConfigured()) {
    console.log('[Meta] Not configured — returning empty insights');
    return [];
  }

  const params = new URLSearchParams({
    fields: 'impressions,clicks,spend,actions,cpc,cpm,ctr',
    time_increment: '1',
  });

  if (dateRange) {
    params.set('time_range', JSON.stringify({
      since: dateRange.since,
      until: dateRange.until,
    }));
  }

  try {
    const response = await metaFetch<InsightsResponse>(
      `/${campaignId}/insights?${params}`,
    );
    return response.data ?? [];
  } catch (err) {
    console.error('[Meta] Insights fetch failed:', err);
    return [];
  }
}

// ─── Ad Set Insights ─────────────────────────────────────────

export async function getAdSetInsights(
  adSetId: string,
  dateRange?: { since: string; until: string },
): Promise<MetaInsight[]> {
  if (!isMetaConfigured()) return [];

  const params = new URLSearchParams({
    fields: 'impressions,clicks,spend,actions,cpc,cpm,ctr',
    time_increment: '1',
  });

  if (dateRange) {
    params.set('time_range', JSON.stringify({
      since: dateRange.since,
      until: dateRange.until,
    }));
  }

  try {
    const response = await metaFetch<InsightsResponse>(
      `/${adSetId}/insights?${params}`,
    );
    return response.data ?? [];
  } catch (err) {
    console.error('[Meta] AdSet insights fetch failed:', err);
    return [];
  }
}

// ─── Campaign Status Management ──────────────────────────────

export async function updateCampaignStatus(
  campaignId: string,
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED',
): Promise<boolean> {
  if (!isMetaConfigured()) return false;

  try {
    await metaFetch(`/${campaignId}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    return true;
  } catch (err) {
    console.error('[Meta] Campaign status update failed:', err);
    return false;
  }
}

export async function updateAdSetStatus(
  adSetId: string,
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED',
): Promise<boolean> {
  if (!isMetaConfigured()) return false;

  try {
    await metaFetch(`/${adSetId}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    return true;
  } catch (err) {
    console.error('[Meta] AdSet status update failed:', err);
    return false;
  }
}

// ─── Budget Scaling ──────────────────────────────────────────

export async function updateAdSetBudget(
  adSetId: string,
  dailyBudget: number, // in cents
): Promise<boolean> {
  if (!isMetaConfigured()) return false;

  try {
    await metaFetch(`/${adSetId}`, {
      method: 'POST',
      body: JSON.stringify({ daily_budget: dailyBudget }),
    });
    return true;
  } catch (err) {
    console.error('[Meta] Budget update failed:', err);
    return false;
  }
}
