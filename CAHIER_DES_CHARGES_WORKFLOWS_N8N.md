# Cahier des Charges - Workflows n8n MarketingEngine

## Table des Matieres

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Agent 1 - Content Flywheel (MKT-1xx)](#2-agent-1---content-flywheel-mkt-1xx)
3. [Agent 2 - Amplification Engine (MKT-2xx)](#3-agent-2---amplification-engine-mkt-2xx)
4. [Agent 3 - Opportunity Hunter (MKT-3xx)](#4-agent-3---opportunity-hunter-mkt-3xx)
5. [Utilitaires (MKT-4xx)](#5-utilitaires-mkt-4xx)
6. [Communication Inter-Agents](#6-communication-inter-agents)
7. [Flux de Donnees Complets](#7-flux-de-donnees-complets)
8. [Monitoring et Alertes](#8-monitoring-et-alertes)

---

## 1. Vue d'Ensemble

### 1.1 Nomenclature

```
MKT-{agent}{sequence}
  |    |      |
  |    |      +-- 01-99 : Numero sequentiel
  |    +-- 1: Content Flywheel, 2: Amplification Engine, 3: Opportunity Hunter, 4: Utilitaires
  +-- Prefixe Marketing
```

### 1.2 Inventaire des 25 Workflows

| ID | Nom | Agent | Trigger | Frequence |
|----|-----|-------|---------|-----------|
| MKT-101 | Ingestion d'inputs | 1 | Webhook + Scheduler | On-demand + quotidien 9h |
| MKT-102 | Recherche AI | 1 | Workflow (post-101) | On-demand |
| MKT-103 | Generation de contenu | 1 | Workflow (post-102) | On-demand |
| MKT-104 | Circuit d'approbation | 1 | Workflow (post-103) | On-demand |
| MKT-105 | Relance approbation | 1 | Scheduler | Toutes les 6h |
| MKT-106 | Adaptation multi-plateforme | 1 | Workflow (post-approbation) | On-demand |
| MKT-107 | Publication automatique | 1 | Scheduler | Toutes les 15min |
| MKT-108 | Collecte metriques contenu | 1 | Scheduler | Toutes les 2h |
| MKT-109 | Detection signaux gagnants | 1 | Scheduler | Toutes les 6h |
| MKT-201 | Recherche concurrentielle | 2 | Scheduler | Quotidien 6h |
| MKT-202 | Proposition campagne AI | 2 | Workflow (post-109/signal) | On-demand |
| MKT-203 | Gate d'approbation pub | 2 | Workflow (post-202) | On-demand |
| MKT-204 | Lancement campagne | 2 | Workflow (post-approbation) | On-demand |
| MKT-205 | Collecte metriques pub | 2 | Scheduler | Toutes les 4h |
| MKT-206 | Optimisation AI campagnes | 2 | Scheduler | Quotidien 10h |
| MKT-301 | Ingestion leads | 3 | Webhook multi-source | On-demand |
| MKT-302 | Qualification scoring AI | 3 | Workflow (post-301) | On-demand |
| MKT-303 | Follow-up personnalise | 3 | Scheduler | Toutes les heures |
| MKT-304 | Analyse de reponses | 3 | Webhook (email/WhatsApp) | On-demand |
| MKT-305 | Booking d'appels | 3 | Workflow (post-qualification) | On-demand |
| MKT-306 | Escalation humaine | 3 | Workflow (conditions) | On-demand |
| MKT-307 | Tracking conversion | 3 | Webhook + Scheduler | On-demand + quotidien |
| MKT-401 | Rafraichissement tokens OAuth | Util | Scheduler | Toutes les 12h |
| MKT-402 | Agregation analytics | Util | Scheduler | Quotidien 23h59 |
| MKT-403 | Rapport hebdomadaire AI | Util | Scheduler | Lundi 8h00 |
| MKT-404 | Boucle d'apprentissage AI | Util | Scheduler | Quotidien 02h00 |

### 1.3 Conventions n8n

- Tous les workflows sont crees avec `active: false` par defaut
- Contexte: `$json` pour acceder aux donnees
- Nodes Code: JavaScript ES2022
- Authentification webhooks: Header Auth (`X-API-Key`)
- Credentials referees par nom, jamais en dur
- Gestion d'erreurs: Error Trigger node sur chaque workflow critique

### 1.4 Stack Technique

| Service | Usage |
|---------|-------|
| **Claude** (claude-sonnet-4-20250514) | Analyse, generation texte, qualification, optimisation |
| **OpenAI DALL-E 3** | Generation d'images (1024x1024, 1024x1792) |
| **OpenAI Whisper** | Transcription audio |
| **OpenAI Embeddings** | Vecteurs semantiques pour ai_learning_log |
| **PostgreSQL 16** | Stockage principal (Prisma) |
| **Redis 7** | Pub/Sub inter-agents, cache |
| **MinIO** | Stockage medias (S3-compatible) |
| **Resend** | Envoi emails |
| **WhatsApp Business API** | Messagerie leads |
| **Slack** | Notifications internes, approbations |
| **Cal.com** | Gestion de rendez-vous |

---

## 2. Agent 1 - Content Flywheel (MKT-1xx)

### MKT-101 : Ingestion d'Inputs

**Trigger** : Webhook POST `/webhook/mkt-101` + Scheduler quotidien 9h00

**Description** : Capture et traitement des inputs bruts (texte, audio, URLs, images).

```
+----------+    +------------+    +--------------+    +--------------+
| Webhook  |--->| Detection  |--->| Traitement   |--->| Sauvegarde   |
| ou       |    | type       |    | par type     |    | DB +         |
| Scheduler|    | d'input    |    |              |    | Trigger 102  |
+----------+    +------------+    +--------------+    +--------------+
```

**Nodes detailles** :

1. **Webhook Node** (`mkt-101-webhook`)
   - Method: POST
   - Path: `/mkt-101`
   - Authentication: Header Auth (X-API-Key)
   - Accepte: JSON body + multipart/form-data (pour fichiers audio/image)

2. **Scheduler Node** (`mkt-101-scheduler`)
   - Cron: `0 9 * * *` (tous les jours a 9h)
   - Action: Recupere les inputs en attente dans la DB

3. **Switch Node** (`mkt-101-type-detection`)
   - Conditions :
     - `input_type === 'text'` -> branche texte
     - `input_type === 'audio'` -> branche audio (Whisper)
     - `input_type === 'url'` -> branche URL (scraping)
     - `input_type === 'image'` -> branche image (description AI)

4. **HTTP Request - Whisper** (`mkt-101-whisper`) [branche audio]
   - URL: `https://api.openai.com/v1/audio/transcriptions`
   - Method: POST
   - Body: form-data avec fichier audio
   - Model: whisper-1
   - Response language: fr

5. **HTTP Request - Claude Summary** (`mkt-101-summarize`)
   - URL: `https://api.anthropic.com/v1/messages`
   - Model: claude-sonnet-4-20250514
   - Prompt: "Resume cet input et suggere 3 sujets de contenu potentiels..."
   - Retourne: `{ summary, suggested_topics: [...] }`

6. **Postgres Node** (`mkt-101-save`)
   - INSERT INTO content_inputs
   - Champs: input_type, raw_content, transcription, ai_summary, ai_suggested_topics, status='processed'

7. **Execute Workflow** (`mkt-101-trigger-102`)
   - Declenche MKT-102 avec l'ID de l'input cree

---

### MKT-102 : Recherche AI

**Trigger** : Execute par MKT-101

**Description** : Recherche de tendances, analyse concurrentielle, identification de niches.

```
+-----------+    +----------------+    +----------------+    +--------------+
| Input     |--->| Recherche      |--->| Analyse Claude |--->| Enrichment   |
| recu      |    | tendances      |    | (synthese)     |    | + Trigger 103|
+-----------+    +----------------+    +----------------+    +--------------+
```

**Nodes detailles** :

1. **Trigger** : Recoit `input_id` de MKT-101

2. **Postgres Node** (`mkt-102-get-input`)
   - SELECT * FROM content_inputs WHERE id = $1
   - Inclut les infos brand (brand_voice, target_audience, content_guidelines)

3. **Postgres Node** (`mkt-102-get-recent-content`)
   - SELECT des 20 derniers contenus publies pour la marque
   - Inclut engagement_score pour contexte

4. **HTTP Request - Claude Research** (`mkt-102-research`)
   - Model: claude-sonnet-4-20250514
   - System prompt:
   ```
   Tu es un expert en strategie de contenu digital. Analyse l'input fourni
   dans le contexte de la marque et propose une strategie de contenu.

   Marque: {{brand_name}}
   Voix: {{brand_voice}}
   Audience: {{target_audience}}
   Contenus recents performants: {{recent_top_content}}
   ```
   - User prompt: `Input: {{raw_content_or_transcription}}`
   - Retourne: `{ topic, angle, key_messages, platforms, format_suggestions, hashtag_suggestions }`

5. **Postgres Node** (`mkt-102-update-input`)
   - UPDATE content_inputs SET ai_suggested_topics = $1

6. **Execute Workflow** (`mkt-102-trigger-103`)
   - Declenche MKT-103 avec input_id + research data

---

### MKT-103 : Generation de Contenu

**Trigger** : Execute par MKT-102

**Description** : Generation du contenu textuel (Claude) et visuel (DALL-E).

```
+-----------+    +--------------+    +--------------+    +--------------+
| Research  |--->| Claude       |--->| DALL-E       |--->| Sauvegarde   |
| data      |    | Content Gen  |    | Image Gen    |    | + Trigger 104|
+-----------+    +--------------+    +--------------+    +--------------+
```

**Nodes detailles** :

1. **Trigger** : Recoit input_id + research data + platform targets

2. **HTTP Request - Claude Content** (`mkt-103-generate-text`)
   - Model: claude-sonnet-4-20250514
   - System prompt:
   ```
   Tu es un copywriter expert pour {{brand_name}}.
   Voix de marque: {{brand_voice}}
   Guidelines: {{content_guidelines}}

   Genere un contenu {{content_type}} pour {{platform}}.
   Sujet: {{topic}}
   Angle: {{angle}}
   Messages cles: {{key_messages}}

   Contraintes plateforme:
   - LinkedIn: max 3000 caracteres, ton professionnel, 3-5 hashtags
   - Facebook: max 500 caracteres pour le corps, plus engageant
   - Instagram: max 2200 caracteres, 20-30 hashtags, emoji encouraged
   - TikTok: script de 30-60s, hook dans les 3 premieres secondes
   - Twitter/X: max 280 caracteres, 1-2 hashtags

   Inclus un CTA pertinent.
   Format de sortie JSON: { title, body, hashtags, call_to_action }
   ```

3. **HTTP Request - DALL-E** (`mkt-103-generate-image`)
   - URL: `https://api.openai.com/v1/images/generations`
   - Model: dall-e-3
   - Size: 1024x1024 (ou 1024x1792 pour stories)
   - Quality: standard (ou hd pour pubs)
   - Prompt construit a partir du sujet + guidelines visuelles de la marque

4. **MinIO Upload** (`mkt-103-upload-media`)
   - Bucket: mkt-content-media
   - Path: `{org_id}/originals/{date}_{content_id}.png`

5. **Postgres Node** (`mkt-103-save`)
   - INSERT INTO content_pieces (status = 'review')

6. **Execute Workflow** (`mkt-103-trigger-104`)
   - Declenche MKT-104 pour l'approbation

---

### MKT-104 : Circuit d'Approbation

**Trigger** : Execute par MKT-103

**Description** : Envoie le contenu pour approbation via Slack, WhatsApp ou email.

```
+-----------+    +----------------+    +------------------+
| Contenu   |--->| Creation       |--->| Notification     |
| en review |    | approval_queue |    | multi-canal      |
+-----------+    +----------------+    +------------------+
                                             |
                                      +------+------+
                                      |             |
                                 +----v---+   +----v----+
                                 | Slack  |   | Email   |
                                 | Msg    |   | HTML    |
                                 +--------+   +---------+
```

**Nodes detailles** :

1. **Postgres Node** (`mkt-104-get-content`)
   - SELECT content_piece avec infos brand et platform

2. **Postgres Node** (`mkt-104-create-approval`)
   - INSERT INTO approval_queue
   - entity_type = 'content_piece'
   - priority basee sur la date de publication planifiee

3. **Postgres Node** (`mkt-104-get-approver`)
   - SELECT notification_preferences FROM platform_users WHERE role IN ('owner', 'admin', 'editor')

4. **Switch Node** (`mkt-104-notification-channel`)
   - Route vers Slack, WhatsApp ou Email selon les preferences

5. **Slack Node** (`mkt-104-slack`)
   - Channel: #content-approvals
   - Message avec blocks :
     - Plateforme + type de contenu
     - Preview du texte (tronque)
     - Image miniature si disponible
     - Boutons : Approuver | Modifier | Rejeter
   - Interactive: callback URL vers webhook d'approbation

6. **Email Node** (`mkt-104-email`)
   - Template HTML avec preview du contenu
   - Liens d'action (approuver/rejeter avec token)
   - Via Resend API

7. **Webhook Callback** (`mkt-104-callback`)
   - Recoit la decision d'approbation
   - UPDATE content_pieces SET status = 'approved'|'draft'
   - UPDATE approval_queue SET status, decision_note
   - Si approuve -> Trigger MKT-106

---

### MKT-105 : Relance Approbation

**Trigger** : Scheduler toutes les 6h

**Description** : Relance les approbations en attente depuis plus de 24h.

**Nodes** :
1. **Postgres Node** : SELECT FROM approval_queue WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours'
2. **IF Node** : Si resultats > 0
3. **Loop** : Pour chaque approbation en attente
4. **Notification** : Relance sur le canal prefere de l'approbateur
5. **Update** : Incremente compteur de relances

---

### MKT-106 : Adaptation Multi-Plateforme

**Trigger** : Execute apres approbation (MKT-104)

**Description** : Transforme un contenu approuve en variantes pour chaque plateforme cible.

**Nodes** :
1. **Postgres Node** : Recupere le contenu source approuve + comptes sociaux actifs de la marque
2. **Code Node** : Determine les plateformes cibles (exclut la plateforme source)
3. **Loop** : Pour chaque plateforme cible
4. **HTTP Request - Claude** : Adapte le contenu aux contraintes de la plateforme
   - Prompt specifique par plateforme (longueur, ton, format, hashtags)
5. **DALL-E (conditionnel)** : Si format d'image different requis (stories, carousel)
6. **Postgres Node** : INSERT content_piece avec parent_id = contenu source
7. **Trigger MKT-107** : Planification de publication

---

### MKT-107 : Publication Automatique

**Trigger** : Scheduler toutes les 15 minutes

**Description** : Publie les contenus planifies dont l'heure est arrivee.

**Nodes** :

1. **Postgres Node** :
   ```sql
   SELECT cs.*, cp.*, sa.*
   FROM content_schedule cs
   JOIN content_pieces cp ON cs.content_piece_id = cp.id
   JOIN social_accounts sa ON cs.social_account_id = sa.id
   WHERE cs.status = 'scheduled'
   AND cs.scheduled_at <= NOW()
   AND cs.scheduled_at > NOW() - INTERVAL '1 hour'
   ORDER BY cs.scheduled_at ASC
   ```

2. **Loop** : Pour chaque publication planifiee

3. **Switch Node** : Route par plateforme

4. **LinkedIn Node** (`mkt-107-linkedin`)
   ```
   POST https://api.linkedin.com/v2/ugcPosts
   Headers: Authorization: Bearer {{access_token}}
   Body: {
     "author": "urn:li:organization:{{org_id}}",
     "lifecycleState": "PUBLISHED",
     "specificContent": {
       "com.linkedin.ugc.ShareContent": {
         "shareCommentary": { "text": "{{body}}" },
         "shareMediaCategory": "IMAGE",
         "media": [...]
       }
     }
   }
   ```

5. **Facebook Node** (`mkt-107-facebook`)
   ```
   POST https://graph.facebook.com/v19.0/{{page_id}}/feed
   Body: { message: "{{body}}", link: "{{url}}" }
   ```

6. **Instagram Node** (`mkt-107-instagram`)
   ```
   // Step 1: Create container
   POST https://graph.facebook.com/v19.0/{{ig_user_id}}/media
   Body: { image_url: "{{url}}", caption: "{{body_with_hashtags}}" }
   // Wait 30s
   // Step 2: Publish
   POST https://graph.facebook.com/v19.0/{{ig_user_id}}/media_publish
   Body: { creation_id: "{{container_id}}" }
   ```

7. **TikTok Node** : Content Posting API
8. **Twitter Node** : API v2 `/tweets`

9. **Update Postgres** :
   - content_schedule.status = 'published', published_at = NOW()
   - content_pieces.status = 'published', platform_post_id = response.id

10. **Error Handling** :
    - Si erreur API -> status = 'failed', error_message = error
    - Si retry_count < 3 -> reprogramme dans 30min
    - Si retry_count >= 3 -> notification admin

---

### MKT-108 : Collecte Metriques Contenu

**Trigger** : Scheduler toutes les 2 heures

**Description** : Collecte les metriques de performance de tous les contenus publies dans les 30 derniers jours.

**Nodes** :

1. **Postgres Node** :
   ```sql
   SELECT cp.id, cp.platform, cp.platform_post_id, sa.access_token, sa.platform_account_id
   FROM content_pieces cp
   JOIN social_accounts sa ON cp.brand_id = sa.organization_id AND cp.platform = sa.platform
   WHERE cp.status = 'published'
   AND cp.published_at > NOW() - INTERVAL '30 days'
   ```

2. **Loop** : Pour chaque contenu publie

3. **Switch Node** : Route par plateforme pour API metriques
   - LinkedIn : GET `/organizationalEntityShareStatistics`
   - Facebook : GET `/{post_id}/insights?metric=post_impressions,post_engaged_users,post_clicks`
   - Instagram : GET `/{media_id}/insights?metric=impressions,reach,engagement,saved`
   - TikTok : GET Research/Creator API
   - Twitter : GET `/tweets/{id}?tweet.fields=public_metrics`

4. **Code Node** (`mkt-108-normalize`) : Normalise les metriques multi-plateformes
   ```javascript
   const metrics = $input.first().json;
   return {
     impressions: metrics.impressions || 0,
     reach: metrics.reach || metrics.unique_impressions || 0,
     engagements: (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0),
     likes: metrics.likes || metrics.reactions || 0,
     comments: metrics.comments || metrics.replies || 0,
     shares: metrics.shares || metrics.reposts || metrics.retweets || 0,
     saves: metrics.saves || metrics.bookmarks || 0,
     clicks: metrics.clicks || metrics.link_clicks || 0,
     video_views: metrics.video_views || 0,
     engagement_rate: metrics.impressions > 0
       ? ((metrics.likes + metrics.comments + metrics.shares) / metrics.impressions * 100)
       : 0
   };
   ```

5. **Postgres Node** : INSERT INTO content_metrics

6. **Code Node** : Calcule engagement_score
   ```javascript
   // Score pondere
   const score = (likes * 1) + (comments * 3) + (shares * 5) + (saves * 4) + (clicks * 2);
   ```

7. **Postgres Node** : UPDATE content_pieces SET engagement_score = calculated_score

---

### MKT-109 : Detection Signaux Gagnants

**Trigger** : Scheduler toutes les 6 heures

**Description** : Analyse les metriques pour detecter les contenus exceptionnels et generer des signaux pour l'Agent 2.

**Nodes** :

1. **Postgres Node** : Recupere contenus publies avec metriques, tries par engagement_score

2. **Code Node** (`mkt-109-statistical-analysis`) :
   ```javascript
   const avgEngagement = items.reduce((sum, i) => sum + i.engagement_rate, 0) / items.length;
   const stdDev = Math.sqrt(
     items.reduce((sum, i) => sum + Math.pow(i.engagement_rate - avgEngagement, 2), 0) / items.length
   );
   // Signaux = contenus > avg + 1.5 * stdDev
   const threshold = avgEngagement + (1.5 * stdDev);
   const signals = items.filter(i => i.engagement_rate > threshold);
   ```

3. **HTTP Request - Claude** : Pour chaque signal, analyse pourquoi le contenu performe
   - Prompt : "Analyse ce contenu qui surperforme. Qu'est-ce qui le rend efficace ? Comment l'amplifier en pub ?"
   - Retourne : signal_type, signal_strength, ai_recommendation

4. **Postgres Node** : INSERT INTO content_signals

5. **Redis Publish** : Publie sur channel `mkt:agent:1:signals` pour notifier Agent 2

6. **Notification** : Alerte Slack des contenus gagnants identifies

---

## 3. Agent 2 - Amplification Engine (MKT-2xx)

### MKT-201 : Recherche Concurrentielle

**Trigger** : Scheduler quotidien a 6h00

**Description** : Analyse les publicites des concurrents via Facebook Ad Library et autres sources.

**Nodes** :
1. **Postgres Node** : Recupere la liste des concurrents surveilles par marque
2. **HTTP Request** : Facebook Ad Library API
   ```
   GET https://graph.facebook.com/v19.0/ads_archive
   ?search_terms={{competitor_name}}
   &ad_reached_countries=SN,FR
   &ad_active_status=ACTIVE
   ```
3. **Code Node** : Parse et normalise les resultats
4. **HTTP Request - Claude** : Analyse les tendances et strategies concurrentielles
5. **Postgres Node** : INSERT/UPDATE INTO competitor_ads
6. **Notification** : Resume des nouvelles pubs concurrentes detectees

---

### MKT-202 : Proposition de Campagne AI

**Trigger** : Execute par MKT-109 (signal gagnant) ou manuellement

**Description** : Genere une proposition complete de campagne publicitaire.

**Nodes** :
1. **Input** : content_signal_id ou demande manuelle
2. **Postgres Node** : Recupere le contenu source, les donnees de la marque, l'historique pub
3. **HTTP Request - Claude** :
   ```
   System: Tu es un expert en publicite digitale. Cree une proposition de campagne
   complete basee sur ce contenu qui performe en organique.

   Inclus:
   - Objectif de campagne (awareness/traffic/leads/conversions)
   - Ciblage detaille (demo, interets, audiences similaires)
   - Budget recommande (quotidien + total)
   - Structure: nombre d'ad sets, nombre de creatives
   - Textes publicitaires (3 variantes)
   - Suggestions visuelles
   - KPIs attendus (CPC, CTR, ROAS cibles)

   Format JSON structure.
   ```
4. **DALL-E** : Genere 3 variantes de visuels pub
5. **Postgres Node** : INSERT INTO ad_campaigns (status = 'draft') + ad_sets + ad_creatives
6. **Trigger MKT-203** : Envoie en approbation

---

### MKT-203 : Gate d'Approbation Pub

**Trigger** : Execute par MKT-202

**Description** : Circuit d'approbation pour les campagnes publicitaires (obligatoire car implique des depenses).

**Nodes** :
1. **Postgres Node** : INSERT INTO approval_queue (entity_type = 'ad_campaign', priority = 'high')
2. **Notification Slack/Email** avec resume campagne, budget, preview creatives, ciblage
3. **Webhook Callback** : Recoit la decision
4. **Switch Node** : Route selon decision
   - Si approuve -> Trigger MKT-204
   - Si modifie -> Met a jour les parametres -> Re-notifie
   - Si rejete -> Archive la campagne

---

### MKT-204 : Lancement Campagne

**Trigger** : Execute apres approbation (MKT-203)

**Description** : Cree effectivement les campagnes sur les plateformes publicitaires.

**Nodes** :
1. **Postgres Node** : Recupere campagne + ad_sets + ad_creatives + ad_account credentials
2. **Switch Node** : Route par plateforme

3. **Facebook Ads** :
   ```
   // 1. Creer campagne
   POST /v19.0/act_{{ad_account_id}}/campaigns
   Body: { name, objective, status: "PAUSED", special_ad_categories: [] }

   // 2. Creer ad sets
   POST /v19.0/act_{{ad_account_id}}/adsets
   Body: { campaign_id, name, daily_budget, targeting, optimization_goal, billing_event }

   // 3. Upload creatives
   POST /v19.0/act_{{ad_account_id}}/adimages

   // 4. Creer ads
   POST /v19.0/act_{{ad_account_id}}/ads
   Body: { adset_id, creative: { title, body, image_hash, link_url, call_to_action_type } }

   // 5. Activer campagne
   POST /v19.0/{{campaign_id}} { status: "ACTIVE" }
   ```

4. **Google Ads** (via API REST) :
   - Creer campaign, ad_group, ad avec les parametres correspondants

5. **TikTok Ads** :
   - POST /open_api/v1.3/campaign/create/
   - POST /open_api/v1.3/adgroup/create/
   - POST /open_api/v1.3/ad/create/

6. **Postgres Node** : UPDATE avec les platform_campaign_id, platform_adset_id
7. **Update status** : ad_campaigns.status = 'active'
8. **Notification** : Confirmation de lancement

---

### MKT-205 : Collecte Metriques Pub

**Trigger** : Scheduler toutes les 4 heures

**Description** : Collecte les metriques de performance des campagnes actives.

**Nodes** :
1. **Postgres Node** : SELECT campagnes actives avec ad_account credentials
2. **Loop** : Pour chaque campagne
3. **API calls par plateforme** :
   - Facebook : GET `/v19.0/{{campaign_id}}/insights?fields=impressions,clicks,spend,conversions,cpc,cpm,ctr`
   - Google : POST `/v14/customers/{{customer_id}}/googleAds:searchStream` avec GAQL query
   - TikTok : GET `/open_api/v1.3/report/integrated/get/`
4. **Code Node** : Normalise les metriques cross-plateforme + calcule ROAS
5. **Postgres Node** : INSERT INTO ad_metrics
6. **Code Node** : Detecte les anomalies (CPC spike, ROAS drop)
7. **Notification conditionnelle** : Alerte si anomalie detectee

---

### MKT-206 : Optimisation AI Campagnes

**Trigger** : Scheduler quotidien a 10h00

**Description** : Analyse les performances et prend des decisions d'optimisation automatiques.

**Nodes** :
1. **Postgres Node** : Recupere metriques des 7 derniers jours par campagne/adset/creative
2. **HTTP Request - Claude** :
   ```
   Analyse ces performances publicitaires et recommande des actions:

   Regles d'optimisation:
   - Si ROAS < 1.0 pendant 3 jours -> recommander pause
   - Si CPC > 2x la moyenne -> recommander ajustement ciblage
   - Si CTR > 2x la moyenne -> recommander scaling budget +30%
   - Si une creative surperforme les autres de >50% -> recommander concentration

   Donnees: {{metrics_json}}

   Format: { actions: [{ type: "pause"|"scale"|"adjust", target_id, reason, details }] }
   ```
3. **Loop** : Pour chaque action recommandee
4. **Switch Node** :
   - `pause` -> Desactive ad set/creative via API + UPDATE DB
   - `scale` -> Augmente budget via API + UPDATE DB
   - `adjust` -> Modifie ciblage via API + UPDATE DB
5. **Postgres Node** : Log actions dans ai_learning_log
6. **Notification** : Resume des optimisations effectuees

---

## 4. Agent 3 - Opportunity Hunter (MKT-3xx)

### MKT-301 : Ingestion Leads

**Trigger** : Webhook POST `/webhook/mkt-301`

**Description** : Capture des leads depuis toutes les sources (formulaires, Facebook Lead Ads, Google Ads, TikTok, webinaires, CSV/API).

**Nodes** :

1. **Webhook Node** : Accepte les leads de multiples sources

2. **Code Node** (`mkt-301-normalize`) :
   ```javascript
   const lead = {
     first_name: $json.first_name || $json.firstName || $json.name?.split(' ')[0] || '',
     last_name: $json.last_name || $json.lastName || $json.name?.split(' ').slice(1).join(' ') || '',
     email: ($json.email || $json.customer_email || '').toLowerCase().trim(),
     phone: ($json.phone || $json.telephone || $json.mobile || '').replace(/\s/g, ''),
     company: $json.company || $json.entreprise || $json.business_name || '',
     source: $json.source || 'form',
     source_detail: $json.source_detail || $json.form_name || $json.campaign_name || '',
     utm_source: $json.utm_source || '',
     utm_medium: $json.utm_medium || '',
     utm_campaign: $json.utm_campaign || '',
     gdpr_consent: $json.consent === true || $json.gdpr === true || false
   };
   ```

3. **Postgres Node** (`mkt-301-dedup`) :
   ```sql
   SELECT id FROM leads
   WHERE (email = $1 AND email != '')
   OR (phone = $2 AND phone != '')
   ```
   - Si existant -> UPDATE avec nouvelles donnees (merge)
   - Si nouveau -> INSERT

4. **Trigger MKT-302** : Qualification du lead

---

### MKT-302 : Qualification et Scoring AI

**Trigger** : Execute par MKT-301

**Description** : Score le lead et determine sa temperature.

**Nodes** :
1. **Postgres Node** : Recupere le lead + produits/services de l'organisation
2. **HTTP Request - Claude** :
   ```
   Tu es un expert en qualification de leads B2B.
   Analyse ce lead et attribue un score de 0 a 100.

   Criteres de scoring:
   - Completude du profil: email(+5), phone(+10), company(+10), job_title(+10)
   - Source qualite: ad(+15), webinar(+20), referral(+25), form(+10), manual(+5)
   - Budget indique: >10K(+20), 5-10K(+15), 1-5K(+10), <1K(+5)
   - Taille entreprise: 200+(+15), 51-200(+10), 11-50(+5)
   - Pain points identifies: chaque(+5, max 25)
   - Urgence implicite: haute(+15), moyenne(+10)

   Lead: {{lead_data}}
   Produits disponibles: {{products}}

   Retourne: { score, temperature, reasoning, suggested_product, suggested_sequence }
   ```

3. **Code Node** : Determine la temperature
   ```javascript
   const score = $json.score;
   const temperature = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';
   ```

4. **Postgres Node** : UPDATE leads SET score, temperature

5. **Switch Node** :
   - `hot` -> Trigger MKT-305 (booking direct)
   - `warm` -> Trigger MKT-303 (sequence nurturing)
   - `cold` -> Enroler dans sequence long-terme

6. **Redis Publish** : `mkt:agent:3:new_lead` pour dashboard temps reel

---

### MKT-303 : Follow-up Personnalise

**Trigger** : Scheduler toutes les heures

**Description** : Execute les etapes de sequences de nurturing.

**Nodes** :

1. **Postgres Node** :
   ```sql
   SELECT lse.*, ls.steps, l.*
   FROM lead_sequence_enrollments lse
   JOIN lead_sequences ls ON lse.sequence_id = ls.id
   JOIN leads l ON lse.lead_id = l.id
   WHERE lse.status = 'active'
   AND lse.next_action_at <= NOW()
   ```

2. **Loop** : Pour chaque enrollment due

3. **Code Node** : Recupere l'etape actuelle de la sequence

4. **HTTP Request - Claude** : Personnalise le message
   ```
   Personnalise ce template de {{channel}} pour {{first_name}} de {{company}}.
   Template: {{step.body_prompt}}
   Historique des interactions: {{recent_interactions}}
   Pain points: {{pain_points}}
   Produit suggere: {{suggested_product}}
   Ton: professionnel mais chaleureux
   Langue: {{lead_language || 'fr'}}
   Longueur: 150-200 mots max
   ```

5. **Switch Node** : Route par canal

6. **Email Node** (`mkt-303-email`) :
   ```
   POST https://api.resend.com/emails
   Body: {
     from: "{{brand_name}} <hello@{{domain}}>",
     to: "{{lead.email}}",
     subject: "{{personalized_subject}}",
     html: "{{personalized_html_body}}"
   }
   ```

7. **WhatsApp Node** (`mkt-303-whatsapp`) :
   ```
   POST https://graph.facebook.com/v19.0/{{phone_number_id}}/messages
   Body: {
     messaging_product: "whatsapp",
     to: "{{lead.phone}}",
     type: "template",
     template: { name: "{{template_name}}", language: { code: "fr" }, components: [...] }
   }
   ```

8. **Postgres Node** :
   - INSERT INTO lead_interactions
   - UPDATE lead_sequence_enrollments SET current_step += 1, next_action_at
   - Si derniere etape -> status = 'completed'

---

### MKT-304 : Analyse de Reponses

**Trigger** : Webhook (email reply, WhatsApp message)

**Description** : Analyse le sentiment et l'intention des reponses des leads.

**Nodes** :
1. **Webhook Node** : Recoit les reponses (Resend webhook, WhatsApp Business webhook)
2. **Code Node** : Identifie le lead via email ou numero de telephone
3. **HTTP Request - Claude** :
   ```
   Analyse cette reponse d'un lead:
   Message: "{{reply_content}}"
   Historique: {{conversation_history}}

   Determine:
   - Sentiment: positive, neutral, negative
   - Intent: interested, needs_info, not_ready, objection, ready_to_buy, unsubscribe
   - Objections identifiees (si applicable)
   - Action recommandee: continue_sequence, escalate_human, book_call, pause, remove

   Format JSON.
   ```
4. **Postgres Node** :
   - INSERT INTO lead_interactions (direction = 'inbound', ai_sentiment, ai_intent)
   - UPDATE leads SET temperature (si changement)
5. **Switch Node** :
   - `ready_to_buy` -> Trigger MKT-305 (booking)
   - `objection` -> Claude genere reponse aux objections -> Trigger MKT-303
   - `escalate_human` -> Trigger MKT-306
   - `unsubscribe` -> Pause sequence, marque lead
   - `interested` / `needs_info` -> Continue la sequence normalement

---

### MKT-305 : Booking d'Appels

**Trigger** : Execute quand un lead est qualifie "hot" ou "ready_to_buy"

**Description** : Propose automatiquement un creneau d'appel.

**Nodes** :
1. **Postgres Node** : Recupere le lead + l'utilisateur assigne
2. **HTTP Request - Cal.com** :
   ```
   GET https://api.cal.com/v1/availability
   ?userId={{assigned_user_cal_id}}
   &dateFrom={{tomorrow}}
   &dateTo={{next_7_days}}
   ```
3. **Code Node** : Selectionne les 3 meilleurs creneaux
4. **HTTP Request - Claude** : Genere le message de proposition de RDV
5. **Envoi** (email ou WhatsApp) avec lien de booking
6. **Postgres Node** : INSERT INTO calendar_bookings (status = 'pending')
7. **HTTP Request - Claude** : Genere ai_briefing pour le commercial
   ```
   Prepare un briefing pour l'appel avec {{first_name}} de {{company}}.
   Score: {{score}} | Temperature: {{temperature}}
   Pain points: {{pain_points}}
   Historique interactions: {{interactions}}
   Produit suggere: {{suggested_product}}
   Objections soulevees: {{objections}}
   ```

---

### MKT-306 : Escalation Humaine

**Trigger** : Conditions specifiques (reponse negative, demande complexe, lead VIP)

**Nodes** :
1. **Postgres Node** : Recupere contexte complet du lead
2. **HTTP Request - Claude** : Genere un resume pour le commercial
3. **Notification** : Slack + Email au commercial assigne (resume, historique, recommandations AI, lien dashboard)
4. **Postgres Node** : UPDATE leads SET status = 'opportunity', assigned_to

---

### MKT-307 : Tracking de Conversion

**Trigger** : Webhook + Scheduler quotidien

**Description** : Suivi des conversions et attribution multi-touch.

**Nodes** :
1. **Webhook** : Recoit les evenements de conversion (achat, inscription, etc.)
2. **Code Node** : Calcule l'attribution
   ```javascript
   // Attribution multi-touch (linear)
   const touchpoints = interactions.filter(i => i.direction === 'outbound');
   const attributionPerTouch = conversionValue / touchpoints.length;
   ```
3. **Postgres Node** :
   - UPDATE leads SET status = 'converted', converted_at, conversion_value
   - UPDATE ad_campaigns metriques de conversion
   - UPDATE content_pieces metriques de conversion
4. **Redis Publish** : `mkt:agent:3:conversion` -> Donnees pour Agent 1 et Agent 2
5. **Notification** : Alerte conversion (Slack)

---

## 5. Utilitaires (MKT-4xx)

### MKT-401 : Rafraichissement Tokens OAuth

**Trigger** : Scheduler toutes les 12 heures

**Nodes** :
1. **Postgres Node** : SELECT social_accounts WHERE token_expires_at < NOW() + INTERVAL '24 hours'
2. **Loop** : Pour chaque compte
3. **HTTP Request** : Refresh token par plateforme
   - LinkedIn : POST `https://www.linkedin.com/oauth/v2/accessToken` avec grant_type=refresh_token
   - Facebook : GET `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token`
   - TikTok : POST `https://open.tiktokapis.com/v2/oauth/token/` avec grant_type=refresh_token
   - Twitter : POST `https://api.twitter.com/2/oauth2/token` avec grant_type=refresh_token
4. **Postgres Node** : UPDATE access_token, refresh_token, token_expires_at
5. **Error Handling** : Si refresh echoue -> notification urgente

---

### MKT-402 : Agregation Analytics Quotidienne

**Trigger** : Scheduler quotidien a 23h59

**Nodes** :
1. **Postgres Node** : Agrege les metriques de la journee
   ```sql
   INSERT INTO daily_analytics (organization_id, tenant_id, date, ...)
   SELECT
     cp.brand_id as organization_id,
     cp.tenant_id,
     CURRENT_DATE,
     COUNT(DISTINCT cp.id) FILTER (WHERE cp.published_at::date = CURRENT_DATE),
     SUM(cm.impressions),
     SUM(cm.engagements),
     AVG(cm.engagement_rate),
     -- ad metrics
     -- lead metrics
   FROM content_pieces cp
   LEFT JOIN content_metrics cm ON cm.content_piece_id = cp.id
   GROUP BY cp.brand_id, cp.tenant_id
   ```

---

### MKT-403 : Rapport Hebdomadaire AI

**Trigger** : Scheduler chaque lundi a 8h00

**Nodes** :
1. **Postgres Node** : Recupere daily_analytics des 7 derniers jours
2. **HTTP Request - Claude** :
   ```
   Genere un rapport hebdomadaire marketing:
   Donnees: {{weekly_data}}

   Structure:
   1. Resume executif (3 phrases)
   2. Performance contenu (top 3, tendances)
   3. Performance pub (ROAS, meilleur ad set)
   4. Pipeline leads (nouveaux, qualifies, convertis)
   5. Insights AI (patterns detectes)
   6. Recommandations pour la semaine a venir
   ```
3. **Email Node** : Envoie le rapport aux owners/admins
4. **Slack Node** : Post resume dans #marketing-reports

---

### MKT-404 : Boucle d'Apprentissage AI

**Trigger** : Scheduler quotidien a 02h00

**Description** : Analyse les resultats pour ameliorer les prompts et strategies AI.

**Nodes** :
1. **Postgres Node** : Recupere les donnees de performance des 30 derniers jours
2. **HTTP Request - Claude** :
   ```
   Analyse ces 30 jours de donnees marketing et identifie des patterns:
   Contenus: {{content_performance}}
   Pubs: {{ad_performance}}
   Leads: {{lead_conversion_data}}

   Pour chaque insight:
   - Type (content_performance, ad_optimization, lead_qualification, audience_insight)
   - Description precise
   - Confiance (0.0 -> 1.0)
   - Action recommandee
   ```
3. **OpenAI Embeddings** : Genere embedding pour chaque insight (recherche semantique future)
4. **Postgres Node** : INSERT INTO ai_learning_log
5. **Code Node** : Compare avec insights precedents, valide ou invalide
6. **Redis Publish** : `mkt:agent:learning:updated` -> Agents rechargent leurs contextes

---

## 6. Communication Inter-Agents

### 6.1 Canaux Redis Pub/Sub

| Canal | Emetteur | Recepteur | Declencheur |
|-------|----------|-----------|-------------|
| `mkt:agent:1:signals` | MKT-109 | MKT-202 | Content surperformant detecte |
| `mkt:agent:2:leads` | Webhooks ads | MKT-301 | Lead genere par pub |
| `mkt:agent:2:performance` | MKT-205/206 | MKT-404 | Insights performance pub |
| `mkt:agent:3:insights` | MKT-307 | MKT-404 | Donnees de conversion |
| `mkt:agent:3:pain_points` | MKT-304 | MKT-101 | Pain points recurrents |
| `mkt:agent:learning:updated` | MKT-404 | Tous | Contextes AI mis a jour |
| `mkt:notifications` | Tous | Dashboard | Notifications temps reel |

### 6.2 Boucles de Feedback

**Boucle 1 : Content -> Amplification**
- MKT-109 detecte contenu gagnant (engagement_rate > avg + 1.5*stdDev)
- Signal publie sur `mkt:agent:1:signals`
- MKT-202 genere proposition campagne basee sur le contenu

**Boucle 2 : Amplification -> Leads**
- Webhooks Facebook/Google/TikTok Lead Ads
- MKT-301 ingere avec attribution complete (campaign_id, ad_set_id, creative_id, content_signal_id)

**Boucle 3 : Leads -> Content (Conversions)**
- MKT-307 detecte conversion
- Publie sur `mkt:agent:3:insights`
- MKT-404 analyse les patterns de conversion -> ajuste strategie contenu

**Boucle 4 : Leads -> Content (Pain Points)**
- MKT-304 detecte pain points recurrents dans les reponses
- Publie sur `mkt:agent:3:pain_points`
- Nouveaux content_inputs crees automatiquement avec sujets suggeres

**Boucle 5 : Amplification -> Content (Ad Performance)**
- MKT-205/206 identifie messages/visuels gagnants en pub
- Publie sur `mkt:agent:2:performance`
- Agent 1 integre les insights dans les guidelines de generation

### 6.3 Persistance des Messages

```sql
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  correlation_id VARCHAR(100),
  consumed BOOLEAN DEFAULT false,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_messages_channel ON agent_messages(channel, consumed, created_at DESC);
```

### 6.4 Dead Letter Queue

Messages non consommes apres 24h -> notification admin + tentative de re-traitement.

---

## 7. Flux de Donnees Complets

### 7.1 Input -> Publication -> Metriques

```
content_inputs -> content_pieces -> content_schedule -> content_metrics -> content_signals
     MKT-101       MKT-103          MKT-107            MKT-108           MKT-109
```

### 7.2 Signal -> Pub -> Lead -> Conversion

```
content_signals -> ad_campaigns -> ad_sets -> ad_creatives -> ad_metrics -> leads -> conversions
    MKT-109         MKT-202       MKT-204    MKT-204         MKT-205      MKT-301   MKT-307
```

### 7.3 Tables Impliquees par Workflow

| Workflow | Tables en Lecture | Tables en Ecriture |
|----------|-------------------|-------------------|
| MKT-101 | - | content_inputs |
| MKT-102 | content_inputs, content_pieces, brands | content_inputs |
| MKT-103 | content_inputs, brands | content_pieces |
| MKT-104 | content_pieces, platform_users | approval_queue, content_pieces |
| MKT-105 | approval_queue | approval_queue |
| MKT-106 | content_pieces, social_accounts | content_pieces |
| MKT-107 | content_schedule, content_pieces, social_accounts | content_schedule, content_pieces |
| MKT-108 | content_pieces, social_accounts | content_metrics, content_pieces |
| MKT-109 | content_pieces, content_metrics | content_signals |
| MKT-201 | brands | competitor_ads |
| MKT-202 | content_signals, brands, ad_campaigns | ad_campaigns, ad_sets, ad_creatives |
| MKT-203 | ad_campaigns | approval_queue, ad_campaigns |
| MKT-204 | ad_campaigns, ad_sets, ad_creatives, ad_accounts | ad_campaigns, ad_sets |
| MKT-205 | ad_campaigns, ad_accounts | ad_metrics |
| MKT-206 | ad_metrics, ad_campaigns | ad_campaigns, ad_sets, ai_learning_log |
| MKT-301 | leads | leads |
| MKT-302 | leads, products | leads |
| MKT-303 | lead_sequence_enrollments, leads | lead_interactions, lead_sequence_enrollments |
| MKT-304 | leads, lead_interactions | lead_interactions, leads |
| MKT-305 | leads, platform_users | calendar_bookings |
| MKT-306 | leads, lead_interactions | leads |
| MKT-307 | leads, lead_interactions | leads, ad_campaigns, content_pieces |
| MKT-401 | social_accounts | social_accounts |
| MKT-402 | content_pieces, content_metrics, ad_metrics, leads | daily_analytics |
| MKT-403 | daily_analytics | - (email/slack only) |
| MKT-404 | content_pieces, ad_metrics, leads | ai_learning_log |

---

## 8. Monitoring et Alertes

### 8.1 Metriques de Sante

| Metrique | Seuil OK | Warning | Critical |
|----------|----------|---------|----------|
| Temps Agent 1 (input -> signal) | < 24h | > 24h | > 48h |
| Temps Agent 2 (signal -> launch) | < 48h | > 48h | > 72h |
| Temps Agent 3 (lead -> first contact) | < 1h | > 2h | > 6h |
| Messages Redis non consommes | 0 | > 5 | > 20 |
| Taux d'echec publication | < 2% | > 5% | > 10% |
| Taux de qualification AI | > 80% | < 70% | < 50% |

### 8.2 WebSocket Events (Dashboard Temps Reel)

```javascript
const WS_EVENTS = {
  // Agent 1
  'content:generated': { contentPieceId, platform, status },
  'content:approved': { contentPieceId, approvedBy },
  'content:published': { contentPieceId, platform, platformPostId },
  'content:signal': { signalId, contentPieceId, signalType, strength },
  // Agent 2
  'campaign:created': { campaignId, name, platform },
  'campaign:launched': { campaignId, status },
  'campaign:optimized': { campaignId, action, details },
  // Agent 3
  'lead:new': { leadId, name, source, score },
  'lead:qualified': { leadId, score, temperature },
  'lead:converted': { leadId, value },
  'lead:booked': { leadId, bookingId, scheduledAt },
  // System
  'approval:new': { approvalId, entityType, priority },
  'agent:status': { agentId, status, lastRun },
  'notification': { type, message, actionUrl },
};
```

### 8.3 SSE pour KPIs

Endpoint : `GET /api/analytics/stream` (refresh toutes les 30s)
