-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "platform_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "refresh_token" TEXT,
    "notification_preferences" JSONB DEFAULT '{"slack":true,"email":true,"whatsapp":false}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand_voice" JSONB,
    "target_audience" JSONB,
    "content_guidelines" JSONB,
    "visual_guidelines" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "tagline" TEXT,
    "long_description" TEXT,
    "pricing" JSONB,
    "features" JSONB,
    "testimonials" JSONB,
    "cta_text" TEXT,
    "cta_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_pages" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "product_id" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hero_title" TEXT,
    "hero_subtitle" TEXT,
    "hero_cta_text" TEXT,
    "hero_cta_url" TEXT,
    "sections" JSONB,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_body" TEXT NOT NULL,
    "text_body" TEXT,
    "variables" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_campaigns" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "template_id" TEXT,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "recipient_filter" JSONB,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "open_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "bounce_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platform_user_id" TEXT,
    "platform_username" TEXT,
    "profile_type" TEXT,
    "access_token_encrypted" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_accounts" (
    "id" TEXT NOT NULL,
    "social_account_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platform_account_id" TEXT NOT NULL,
    "name" TEXT,
    "credentials_encrypted" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_pillars" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pillars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_inputs" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "pillar_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "inputType" TEXT NOT NULL DEFAULT 'text',
    "raw_content" TEXT NOT NULL,
    "source_url" TEXT,
    "audio_file_url" TEXT,
    "transcription" TEXT,
    "ai_summary" TEXT,
    "ai_suggested_topics" JSONB,
    "ai_research" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_pieces" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "content_input_id" TEXT,
    "parent_id" TEXT,
    "platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hashtags" JSONB NOT NULL DEFAULT '[]',
    "call_to_action" TEXT,
    "media_url" TEXT,
    "media_prompt" TEXT,
    "framework" TEXT,
    "template_id" TEXT,
    "template_data" JSONB,
    "parent_piece_id" TEXT,
    "repurpose_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "platform_post_id" TEXT,
    "engagement_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pieces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_queue" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "action_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_schedules" (
    "id" TEXT NOT NULL,
    "content_piece_id" TEXT NOT NULL,
    "social_account_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_metrics" (
    "id" TEXT NOT NULL,
    "content_piece_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "engagements" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "video_views" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "collection_age" INTEGER,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_signals" (
    "id" TEXT NOT NULL,
    "content_piece_id" TEXT NOT NULL,
    "signal_type" TEXT NOT NULL,
    "signal_strength" DOUBLE PRECISION NOT NULL,
    "ai_recommendation" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_analytics" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "contents_published" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagements" INTEGER NOT NULL DEFAULT 0,
    "avg_engagement_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ad_spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leads_generated" INTEGER NOT NULL DEFAULT 0,
    "leads_qualified" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "source" TEXT NOT NULL DEFAULT 'form',
    "source_detail" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "score" INTEGER,
    "temperature" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "gdpr_consent" BOOLEAN NOT NULL DEFAULT false,
    "assigned_to" TEXT,
    "converted_at" TIMESTAMP(3),
    "conversion_value" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_bookings" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "user_id" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "ai_briefing" TEXT,
    "calcom_event_id" TEXT,
    "proposed_slots" JSONB,
    "proposal_message" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_slot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_sequences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_sequence_enrollments" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "sequence_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "next_action_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_sequence_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_interactions" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ai_sentiment" TEXT,
    "ai_intent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_ads" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "competitor_name" TEXT NOT NULL,
    "ad_content" TEXT NOT NULL,
    "image_url" TEXT,
    "ai_analysis" TEXT,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_campaigns" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "ad_account_id" TEXT NOT NULL,
    "content_signal_id" TEXT,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "objective" TEXT NOT NULL DEFAULT 'traffic',
    "daily_budget" DOUBLE PRECISION NOT NULL,
    "total_budget" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "platform_campaign_id" TEXT,
    "targeting" JSONB NOT NULL DEFAULT '{}',
    "kpi_targets" JSONB NOT NULL DEFAULT '{}',
    "ai_proposal" JSONB,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_sets" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daily_budget" DOUBLE PRECISION NOT NULL,
    "targeting" JSONB NOT NULL DEFAULT '{}',
    "platform_adset_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "ad_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_creatives" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "ad_set_id" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "call_to_action_type" TEXT NOT NULL DEFAULT 'LEARN_MORE',
    "platform_creative_id" TEXT,

    CONSTRAINT "ad_creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_metrics" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "ad_set_id" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "cpc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_tests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL DEFAULT 'engagement_score',
    "status" TEXT NOT NULL DEFAULT 'running',
    "control_views" INTEGER NOT NULL DEFAULT 0,
    "control_success" INTEGER NOT NULL DEFAULT 0,
    "variant_views" INTEGER NOT NULL DEFAULT 0,
    "variant_success" INTEGER NOT NULL DEFAULT 0,
    "confidence_level" DOUBLE PRECISION,
    "winner" TEXT,
    "conclusion" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning_logs" (
    "id" TEXT NOT NULL,
    "agent_type" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "outcome" TEXT,
    "embedding" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_learning_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "correlation_id" TEXT,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "consumed_at" TIMESTAMP(3),
    "consumed_by" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_errors" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "workflow_name" TEXT,
    "node_name" TEXT,
    "error_message" TEXT NOT NULL,
    "error_stack" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "brands_user_id_idx" ON "brands"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_brand_id_idx" ON "products"("brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_slug_key" ON "landing_pages"("slug");

-- CreateIndex
CREATE INDEX "landing_pages_brand_id_idx" ON "landing_pages"("brand_id");

-- CreateIndex
CREATE INDEX "landing_pages_product_id_idx" ON "landing_pages"("product_id");

-- CreateIndex
CREATE INDEX "email_templates_brand_id_idx" ON "email_templates"("brand_id");

-- CreateIndex
CREATE INDEX "email_campaigns_brand_id_idx" ON "email_campaigns"("brand_id");

-- CreateIndex
CREATE INDEX "email_campaigns_template_id_idx" ON "email_campaigns"("template_id");

-- CreateIndex
CREATE INDEX "email_campaigns_status_idx" ON "email_campaigns"("status");

-- CreateIndex
CREATE INDEX "social_accounts_brand_id_idx" ON "social_accounts"("brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_brand_id_platform_key" ON "social_accounts"("brand_id", "platform");

-- CreateIndex
CREATE INDEX "ad_accounts_social_account_id_idx" ON "ad_accounts"("social_account_id");

-- CreateIndex
CREATE INDEX "content_pillars_brand_id_idx" ON "content_pillars"("brand_id");

-- CreateIndex
CREATE INDEX "content_inputs_brand_id_idx" ON "content_inputs"("brand_id");

-- CreateIndex
CREATE INDEX "content_inputs_status_idx" ON "content_inputs"("status");

-- CreateIndex
CREATE INDEX "content_pieces_brand_id_idx" ON "content_pieces"("brand_id");

-- CreateIndex
CREATE INDEX "content_pieces_content_input_id_idx" ON "content_pieces"("content_input_id");

-- CreateIndex
CREATE INDEX "content_pieces_parent_piece_id_idx" ON "content_pieces"("parent_piece_id");

-- CreateIndex
CREATE INDEX "content_pieces_status_idx" ON "content_pieces"("status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_queue_action_token_key" ON "approval_queue"("action_token");

-- CreateIndex
CREATE INDEX "approval_queue_entity_type_entity_id_idx" ON "approval_queue"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "approval_queue_status_idx" ON "approval_queue"("status");

-- CreateIndex
CREATE INDEX "approval_queue_assignee_id_idx" ON "approval_queue"("assignee_id");

-- CreateIndex
CREATE INDEX "content_schedules_status_scheduled_at_idx" ON "content_schedules"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "content_schedules_content_piece_id_idx" ON "content_schedules"("content_piece_id");

-- CreateIndex
CREATE INDEX "content_schedules_social_account_id_idx" ON "content_schedules"("social_account_id");

-- CreateIndex
CREATE INDEX "content_metrics_content_piece_id_idx" ON "content_metrics"("content_piece_id");

-- CreateIndex
CREATE INDEX "content_metrics_collected_at_idx" ON "content_metrics"("collected_at");

-- CreateIndex
CREATE INDEX "content_signals_content_piece_id_idx" ON "content_signals"("content_piece_id");

-- CreateIndex
CREATE INDEX "content_signals_signal_type_idx" ON "content_signals"("signal_type");

-- CreateIndex
CREATE UNIQUE INDEX "content_signals_content_piece_id_signal_type_key" ON "content_signals"("content_piece_id", "signal_type");

-- CreateIndex
CREATE INDEX "daily_analytics_date_idx" ON "daily_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_analytics_brand_id_date_key" ON "daily_analytics"("brand_id", "date");

-- CreateIndex
CREATE INDEX "leads_brand_id_idx" ON "leads"("brand_id");

-- CreateIndex
CREATE INDEX "leads_temperature_idx" ON "leads"("temperature");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_phone_idx" ON "leads"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "leads_brand_id_email_key" ON "leads"("brand_id", "email");

-- CreateIndex
CREATE INDEX "calendar_bookings_lead_id_idx" ON "calendar_bookings"("lead_id");

-- CreateIndex
CREATE INDEX "calendar_bookings_status_idx" ON "calendar_bookings"("status");

-- CreateIndex
CREATE INDEX "lead_sequence_enrollments_status_next_action_at_idx" ON "lead_sequence_enrollments"("status", "next_action_at");

-- CreateIndex
CREATE INDEX "lead_sequence_enrollments_lead_id_idx" ON "lead_sequence_enrollments"("lead_id");

-- CreateIndex
CREATE INDEX "lead_sequence_enrollments_sequence_id_idx" ON "lead_sequence_enrollments"("sequence_id");

-- CreateIndex
CREATE UNIQUE INDEX "lead_sequence_enrollments_lead_id_sequence_id_key" ON "lead_sequence_enrollments"("lead_id", "sequence_id");

-- CreateIndex
CREATE INDEX "lead_interactions_lead_id_idx" ON "lead_interactions"("lead_id");

-- CreateIndex
CREATE INDEX "lead_interactions_direction_idx" ON "lead_interactions"("direction");

-- CreateIndex
CREATE INDEX "competitor_ads_brand_id_idx" ON "competitor_ads"("brand_id");

-- CreateIndex
CREATE INDEX "competitor_ads_collected_at_idx" ON "competitor_ads"("collected_at");

-- CreateIndex
CREATE INDEX "ad_campaigns_brand_id_idx" ON "ad_campaigns"("brand_id");

-- CreateIndex
CREATE INDEX "ad_campaigns_status_idx" ON "ad_campaigns"("status");

-- CreateIndex
CREATE INDEX "ad_campaigns_content_signal_id_idx" ON "ad_campaigns"("content_signal_id");

-- CreateIndex
CREATE INDEX "ad_sets_campaign_id_idx" ON "ad_sets"("campaign_id");

-- CreateIndex
CREATE INDEX "ad_creatives_campaign_id_idx" ON "ad_creatives"("campaign_id");

-- CreateIndex
CREATE INDEX "ad_creatives_ad_set_id_idx" ON "ad_creatives"("ad_set_id");

-- CreateIndex
CREATE INDEX "ad_metrics_campaign_id_idx" ON "ad_metrics"("campaign_id");

-- CreateIndex
CREATE INDEX "ad_metrics_ad_set_id_idx" ON "ad_metrics"("ad_set_id");

-- CreateIndex
CREATE INDEX "ad_metrics_collected_at_idx" ON "ad_metrics"("collected_at");

-- CreateIndex
CREATE INDEX "ab_tests_status_idx" ON "ab_tests"("status");

-- CreateIndex
CREATE INDEX "ab_tests_entity_type_idx" ON "ab_tests"("entity_type");

-- CreateIndex
CREATE INDEX "ai_learning_logs_agent_type_idx" ON "ai_learning_logs"("agent_type");

-- CreateIndex
CREATE INDEX "ai_learning_logs_entity_type_entity_id_idx" ON "ai_learning_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "agent_messages_channel_idx" ON "agent_messages"("channel");

-- CreateIndex
CREATE INDEX "agent_messages_consumed_created_at_idx" ON "agent_messages"("consumed", "created_at");

-- CreateIndex
CREATE INDEX "agent_messages_correlation_id_idx" ON "agent_messages"("correlation_id");

-- CreateIndex
CREATE INDEX "workflow_errors_workflow_id_idx" ON "workflow_errors"("workflow_id");

-- CreateIndex
CREATE INDEX "workflow_errors_created_at_idx" ON "workflow_errors"("created_at");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "platform_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "platform_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_inputs" ADD CONSTRAINT "content_inputs_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_inputs" ADD CONSTRAINT "content_inputs_pillar_id_fkey" FOREIGN KEY ("pillar_id") REFERENCES "content_pillars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_content_input_id_fkey" FOREIGN KEY ("content_input_id") REFERENCES "content_inputs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "content_pieces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_parent_piece_id_fkey" FOREIGN KEY ("parent_piece_id") REFERENCES "content_pieces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_schedules" ADD CONSTRAINT "content_schedules_content_piece_id_fkey" FOREIGN KEY ("content_piece_id") REFERENCES "content_pieces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_schedules" ADD CONSTRAINT "content_schedules_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_metrics" ADD CONSTRAINT "content_metrics_content_piece_id_fkey" FOREIGN KEY ("content_piece_id") REFERENCES "content_pieces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_signals" ADD CONSTRAINT "content_signals_content_piece_id_fkey" FOREIGN KEY ("content_piece_id") REFERENCES "content_pieces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_bookings" ADD CONSTRAINT "calendar_bookings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_sequence_enrollments" ADD CONSTRAINT "lead_sequence_enrollments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_sequence_enrollments" ADD CONSTRAINT "lead_sequence_enrollments_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "lead_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_interactions" ADD CONSTRAINT "lead_interactions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_content_signal_id_fkey" FOREIGN KEY ("content_signal_id") REFERENCES "content_signals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_sets" ADD CONSTRAINT "ad_sets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_ad_set_id_fkey" FOREIGN KEY ("ad_set_id") REFERENCES "ad_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_metrics" ADD CONSTRAINT "ad_metrics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_metrics" ADD CONSTRAINT "ad_metrics_ad_set_id_fkey" FOREIGN KEY ("ad_set_id") REFERENCES "ad_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

