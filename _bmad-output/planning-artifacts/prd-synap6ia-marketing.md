---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
inputDocuments:
  - CAHIER_DES_CHARGES.md
  - CAHIER_DES_CHARGES_WORKFLOWS_N8N.md
  - product-brief-synap6ia-marketing-2026-02-07.md
projectType: [web_app, api_backend, automation_platform]
domainComplexity: moderate
domain: martech_adtech
date: 2026-02-08
author: Synap6ia
agent: pm (John)
status: draft
---

# PRD — Synap6ia Marketing

## 1. Executive Summary

Synap6ia Marketing est un autopilot marketing IA orchestrant 3 agents spécialisés (Content Flywheel, Amplification Engine, Opportunity Hunter) via n8n pour couvrir le cycle complet : création de contenu → amplification publicitaire → conversion de leads. Les agents communiquent via des boucles de feedback inter-agents (Redis pub/sub), créant un système auto-améliorant. Architecture multi-tenant RLS + white-label dès le départ. Marché cible : PME Afrique de l'Ouest + France, agences marketing.

---

## 2. Project Classification

| Dimension | Valeur |
|-----------|--------|
| Types de projet | Web App (dashboard Next.js) + API Backend (Express.js REST) + Automation Platform (n8n workflows) |
| Domaine | MarTech / AdTech |
| Complexité domaine | Modérée — APIs sociales réglementées, RGPD, paiements multi-devises |
| Modèle | SaaS multi-tenant B2B + white-label resale |
| Marchés | Sénégal, Côte d'Ivoire, France |
| Langues | Interface FR/EN, contenu généré multilingue |

---

## 3. Success Criteria

### 3.1 Business Metrics

| ID | Critère | Cible | Mesure |
|----|---------|-------|--------|
| BM-01 | Temps de création contenu (input → publication) | < 24h avec approbation humaine | Différence `content_inputs.created_at` → `content_pieces.published_at` |
| BM-02 | Volume de contenu produit par marque/mois | ≥ 20 pièces multi-plateforme | COUNT `content_pieces` WHERE `status='published'` par mois |
| BM-03 | Taux de qualification leads | ≥ 80% des leads scorés automatiquement | COUNT `leads` WHERE `score IS NOT NULL` / COUNT total |
| BM-04 | Délai premier contact lead | < 1h après ingestion | Différence `leads.created_at` → première `lead_interactions.created_at` |
| BM-05 | ROAS campagnes publicitaires | ≥ 2.0 après 30 jours | `conversion_value` / `total_spend` par campagne |
| BM-06 | Taux d'approbation contenu (1er passage) | ≥ 70% | COUNT `approval_queue` WHERE `status='approved'` sans itération / COUNT total |
| BM-07 | Réduction temps marketing manuel | ≥ 60% vs baseline | Survey utilisateur + temps passé dashboard |

### 3.2 User Metrics

| ID | Critère | Cible | Mesure |
|----|---------|-------|--------|
| UM-01 | Onboarding complet (marque + 1 compte social connecté) | < 15 min | Temps entre `platform_users.created_at` et premier `social_accounts.created_at` |
| UM-02 | Premier contenu publié | < 48h après onboarding | Temps entre inscription et première publication |
| UM-03 | Temps passé sur dashboard / semaine | < 30 min pour gestion courante | Analytics session tracking |
| UM-04 | Taux d'adoption circuit d'approbation | ≥ 90% des contenus passent par approbation | COUNT `content_pieces` via `approval_queue` / COUNT total |
| UM-05 | NPS utilisateur | ≥ 40 | Survey trimestriel |

### 3.3 Technical Metrics

| ID | Critère | Cible | Mesure |
|----|---------|-------|--------|
| TM-01 | Disponibilité plateforme | ≥ 99.5% uptime | Monitoring endpoint health checks |
| TM-02 | Temps de réponse API (P95) | < 500ms | APM / logs latency |
| TM-03 | Taux d'échec publication sociale | < 2% | COUNT `content_schedule` WHERE `status='failed'` / COUNT total |
| TM-04 | Taux de succès workflows n8n | ≥ 95% | n8n execution logs |
| TM-05 | Isolation multi-tenant | 0 fuite de données cross-tenant | Tests automatisés RLS + audit |
| TM-06 | Temps de récupération tokens OAuth | < 1h en cas d'expiration | Monitoring MKT-401 |

---

## 4. Target Users & Journeys

### 4.1 Personas

| Persona | Rôle | Contexte | Douleur principale |
|---------|------|----------|-------------------|
| **Amadou** — Fondateur PME (Dakar) | Owner tenant | 35 ans, agence immobilière 12 pers., gère le marketing seul | 3-4h/semaine en contenu médiocre, 0 leads suivis, jamais de pub payante |
| **Sophie** — Responsable Marketing (Abidjan) | Editor/Admin | 28 ans, seule marketeuse chaîne de restaurants (3 établissements) | Noyée dans l'opérationnel, leads dans Excel jamais relancés |
| **Marc** — Directeur Agence (Paris) | Owner white-label | 42 ans, agence 8 pers., gère 12 clients, HubSpot coûteux | Ne peut pas scaler sans recruter, marges érodées |
| **Fatou** — Commerciale terrain | Viewer | Consulte leads qualifiés + briefings IA avant appels | Manque de contexte pour les appels, pas de priorisation |
| **Admin/Owner tenant** | Owner/Admin | Configure marques, comptes sociaux, RBAC | Setup complexe, gestion permissions |

### 4.2 User Journeys

#### Journey 1 : Amadou — De l'input au contenu publié

```
Amadou dicte une note vocale (input)
  → MKT-101 : Whisper transcrit, Claude résume et suggère 3 sujets
    → MKT-102 : Recherche tendances "immobilier Dakar" + analyse contenu récent
      → MKT-103 : Claude génère post LinkedIn + DALL-E crée visuel
        → MKT-104 : Notification Slack avec preview + boutons Approuver/Modifier/Rejeter
          → Amadou approuve d'un clic
            → MKT-106 : Adaptation en post Facebook + carousel Instagram
              → MKT-107 : Publication aux heures optimales par plateforme
                → MKT-108 : Métriques collectées toutes les 2h
                  → MKT-109 : Post détecté comme gagnant (engagement > avg + 1.5σ)
```

**Points de décision** : Approbation contenu (MKT-104)
**Temps total** : Input → publication < 24h (incluant temps d'approbation humaine)

#### Journey 2 : Sophie — Du contenu gagnant à la campagne pub

```
MKT-109 détecte un post restaurant performant
  → Signal Redis mkt:agent:1:signals
    → MKT-202 : Claude propose campagne Facebook Ads (ciblage, budget, 3 créatives)
      → MKT-203 : Notification haute priorité à Sophie (dépense pub = gate obligatoire)
        → Sophie approuve avec budget ajusté
          → MKT-204 : Lancement campagne Facebook Ads (campaign + ad sets + creatives)
            → MKT-205 : Collecte métriques toutes les 4h
              → MKT-206 : Optimisation quotidienne (pause sous-performants, scale gagnants)
```

**Points de décision** : Approbation campagne + budget (MKT-203)
**Gate** : Aucune dépense pub sans approbation humaine explicite

#### Journey 3 : Amadou — Du lead à l'appel qualifié

```
Lead arrive via formulaire Facebook Ads (webhook)
  → MKT-301 : Normalisation + déduplication
    → MKT-302 : Claude score le lead (72/100 = hot)
      → MKT-305 : Proposition créneau Cal.com (3 options) via WhatsApp
        → Lead confirme un créneau
          → Claude génère briefing IA pour Amadou (score, pain points, historique, produit suggéré)
            → Amadou reçoit notification Slack + consulte briefing dans dashboard
              → Appel commercial → conversion
                → MKT-307 : Attribution multi-touch, données remontent vers Agent 1
```

**Points de décision** : Aucun — entièrement automatisé pour leads hot
**Escalation** : MKT-306 si réponse négative, demande complexe, ou lead VIP

#### Journey 4 : Marc — Onboarding client white-label

```
Marc crée un nouveau tenant depuis son dashboard agence
  → Configure la marque client (nom, voix, guidelines, audience)
    → Connecte les comptes sociaux du client (OAuth)
      → Configure les comptes publicitaires
        → Agent 1 génère les 20 premiers contenus du mois
          → Marc supervise les approbations pour le client
            → Routine : 30 min/semaine par client vs 8h avant
```

**Points de décision** : Configuration initiale marque + connexion comptes
**Valeur** : Scalabilité × 3 clients avec même équipe

#### Journey 5 : Fatou — Consultation pipeline leads

```
Fatou ouvre le dashboard leads (desktop ou mobile)
  → Voit la liste priorisée par température (hot → warm → cold)
    → Clique sur un lead hot avec appel booké dans 30 min
      → Lit le briefing IA : score 85, pain points "besoin urgent de visibilité digitale",
        historique 3 interactions email positives, produit suggéré "Pack Premium"
        → Passe l'appel avec contexte complet
          → Marque le lead comme "converted" dans le dashboard
```

**Points de décision** : Aucun — consultation pure
**Valeur** : Contexte complet sans préparation manuelle

---

## 5. Domain Requirements

### 5.1 RGPD / Protection des données

| ID | Exigence |
|----|----------|
| DR-01 | Consentement explicite enregistré pour chaque lead (`leads.gdpr_consent`) avant tout traitement marketing |
| DR-02 | Endpoint dédié droit à l'effacement : suppression complète lead + interactions + enrollments en cascade |
| DR-03 | Export données personnelles en JSON/CSV (portabilité) sur demande |
| DR-04 | Registre des traitements documenté et accessible |
| DR-05 | Durée de rétention configurable par type de donnée et par tenant |
| DR-06 | Opt-out respecté immédiatement : `unsubscribe` via MKT-304 → pause séquence + marquage lead |

### 5.2 APIs réseaux sociaux

| ID | Exigence |
|----|----------|
| DR-07 | Respect rate limits par plateforme : LinkedIn (100 req/jour), Facebook (200 req/h), Instagram (25 publications/jour), Twitter (300 tweets/3h), TikTok (variable) |
| DR-08 | Rotation automatique tokens OAuth avant expiration (MKT-401, toutes les 12h) |
| DR-09 | Gestion gracieuse des changements d'API (versioning Facebook Graph API, LinkedIn Marketing API) |
| DR-10 | Retry avec backoff exponentiel pour toutes les APIs externes (max 3 tentatives, base 30s) |

### 5.3 Paiements multi-devises

| ID | Exigence |
|----|----------|
| DR-11 | Stripe pour paiements EUR (marché France) |
| DR-12 | Orange Money + Wave pour paiements XOF (marché Afrique de l'Ouest) |
| DR-13 | Référence de paiement unique traçable : pattern `MKT-{timestamp}-{uuid8}` |

---

## 6. Innovation Aspects

### 6.1 Boucles de feedback inter-agents

Le différenciateur clé est le système auto-améliorant via 5 boucles de feedback :

| Boucle | Source → Destination | Canal Redis | Déclencheur |
|--------|---------------------|-------------|-------------|
| Content → Amplification | Agent 1 → Agent 2 | `mkt:agent:1:signals` | Contenu organique surperformant (> avg + 1.5σ) |
| Amplification → Leads | Agent 2 → Agent 3 | `mkt:agent:2:leads` | Lead généré par pub (webhook ads) |
| Leads → Content (conversions) | Agent 3 → Agent 1 | `mkt:agent:3:insights` | Données de conversion (quels contenus convertissent) |
| Leads → Content (pain points) | Agent 3 → Agent 1 | `mkt:agent:3:pain_points` | Pain points récurrents détectés dans réponses leads |
| Ads → Content (performance) | Agent 2 → Agent 1 | `mkt:agent:2:performance` | Messages/visuels gagnants en paid |

Persistance : table `agent_messages` (JSONB payload, consumed flag, dead letter queue 24h).

### 6.2 IA hybride Claude + OpenAI

Chaque modèle est utilisé pour sa force :
- **Claude** (Anthropic) : Génération texte, analyse stratégique, qualification leads, optimisation campagnes
- **DALL-E 3** (OpenAI) : Visuels sociaux et créatives publicitaires
- **Whisper** (OpenAI) : Transcription notes vocales
- **text-embedding-3-small** (OpenAI) : Embeddings pour `ai_learning_log` (recherche sémantique)

---

## 7. Scope & MVP Phases

### 7.1 Phase 0 — Fondation

| Inclus | Exclu |
|--------|-------|
| Infrastructure Docker (PostgreSQL 16, Redis 7, n8n, MinIO, Nginx) | Google Ads |
| Schéma DB complet + migrations Prisma + RLS | TikTok Ads |
| Auth JWT + RBAC (Owner, Admin, Editor, Viewer) | Application mobile |
| CRUD marques, produits, comptes sociaux | AI voice calls |
| Dashboard skeleton Next.js 16 | Marketplace templates |
| Express.js API REST avec middleware stack | Prometheus/Grafana |
| Multi-tenant middleware + isolation | White-label UI custom |

### 7.2 Phase 1 — MVP (Agent 1 : Content Flywheel)

| Inclus | Exclu |
|--------|-------|
| MKT-101 à MKT-109 (9 workflows complets) | Instagram, TikTok, Twitter publishing |
| Ingestion texte + audio (Whisper) + URL | Publication vidéo native |
| Claude génération contenu + DALL-E visuels | A/B testing contenu |
| LinkedIn + Facebook publishing | Bulk scheduling |
| Circuit approbation (Slack + email) | |
| Collecte métriques + détection signaux gagnants | |
| Calendrier éditorial | |

### 7.3 Phase 2 — V1 (Agent 3 : Opportunity Hunter)

| Inclus | Exclu |
|--------|-------|
| MKT-301 à MKT-307 (7 workflows complets) | AI voice calls |
| Instagram + Twitter publishing (Agent 1 étendu) | WhatsApp template approval automation |
| Ingestion leads multi-source | Custom scoring models |
| Qualification scoring AI (Claude) | |
| Séquences nurturing email (Resend) + WhatsApp | |
| Analyse réponses + détection intent | |
| Booking appels (Cal.com) + briefing AI | |
| Escalation humaine | |
| Tracking conversion + attribution multi-touch | |

### 7.4 Phase 3 — V2 (Agent 2 : Amplification Engine)

| Inclus | Exclu |
|--------|-------|
| MKT-201 à MKT-206 (6 workflows complets) | Google Ads |
| TikTok publishing (Agent 1 étendu) | Programmatic advertising |
| Veille concurrentielle (Facebook Ad Library) | |
| Proposition campagne AI + créatives DALL-E | |
| Facebook Ads + TikTok Ads lancement auto | |
| Collecte métriques pub + optimisation AI | |
| 5 boucles de feedback inter-agents actives | |

### 7.5 Phase 4 — Hardening

Monitoring Prometheus/Grafana, tests E2E + intégration, documentation OpenAPI, audit sécurité.

### 7.6 Phase 5 — Scale

White-label UI personnalisable, Google Ads, AI voice calls, application mobile React Native, marketplace de templates.

---

## 8. Functional Requirements

### 8.1 Core Platform

| ID | Requirement |
|----|-------------|
| FR-C01 | Un utilisateur peut s'inscrire avec email + mot de passe et reçoit un JWT (access 15min, refresh 7j) |
| FR-C02 | Un Owner peut créer des organisations et des marques rattachées à son tenant |
| FR-C03 | Un Admin peut inviter des utilisateurs et leur attribuer un rôle RBAC (Owner, Admin, Editor, Viewer) |
| FR-C04 | Un Admin peut connecter des comptes sociaux via OAuth (LinkedIn, Facebook, Instagram, TikTok, Twitter) avec stockage chiffré des tokens (AES-256-GCM) |
| FR-C05 | Un Admin peut connecter des comptes publicitaires (Facebook Ads, Google Ads, TikTok Ads) |
| FR-C06 | Un Editor peut créer et gérer des produits/services rattachés à une marque |
| FR-C07 | Le système isole les données par tenant via RLS PostgreSQL — aucune requête ne peut accéder aux données d'un autre tenant |
| FR-C08 | Un Admin peut configurer le branding white-label (logo, couleurs, domaine) pour son tenant |
| FR-C09 | Un utilisateur peut configurer ses préférences de notification (Slack, email, WhatsApp) |
| FR-C10 | Le middleware Express injecte `tenant_id` dans chaque requête authentifiée et le propage à toutes les opérations DB |

### 8.2 Agent 1 — Content Flywheel

| ID | Requirement |
|----|-------------|
| FR-A1-01 | Un Editor peut soumettre un input brut (texte libre, note vocale, URL, image) via dashboard ou API webhook |
| FR-A1-02 | Le système transcrit automatiquement les notes vocales via Whisper et génère un résumé + 3 sujets suggérés via Claude |
| FR-A1-03 | Le système recherche les tendances sectorielles et analyse les contenus récents de la marque pour contextualiser la création |
| FR-A1-04 | Claude génère du contenu adapté aux contraintes de chaque plateforme (LinkedIn 3000 car, Facebook 500 car, Instagram 2200 car + hashtags, Twitter 280 car, TikTok script 30-60s) |
| FR-A1-05 | DALL-E 3 génère des visuels (1024×1024 standard, 1024×1792 stories) alignés avec les guidelines visuelles de la marque |
| FR-A1-06 | Les médias générés sont stockés dans MinIO (bucket `mkt-content-media`, path `{org_id}/originals/{date}_{content_id}.png`) |
| FR-A1-07 | Un contenu généré déclenche automatiquement un circuit d'approbation avec notification multi-canal (Slack blocks avec boutons + email HTML) |
| FR-A1-08 | Un Approver peut approuver, modifier ou rejeter un contenu depuis Slack ou email (callback webhook) |
| FR-A1-09 | Le système relance les approbations en attente depuis > 24h (toutes les 6h, via MKT-105) |
| FR-A1-10 | Un contenu approuvé est automatiquement adapté pour chaque plateforme cible (variantes avec parent_id) |
| FR-A1-11 | Le système publie les contenus planifiés aux heures optimales (scheduler 15min, MKT-107) avec retry (max 3, espacement 30min) |
| FR-A1-12 | Le système collecte les métriques de chaque contenu publié toutes les 2h pendant 30 jours (impressions, reach, engagements, likes, comments, shares, saves, clicks, video_views) |
| FR-A1-13 | Le système calcule un `engagement_score` pondéré : likes×1 + comments×3 + shares×5 + saves×4 + clicks×2 |
| FR-A1-14 | Le système détecte les contenus gagnants (engagement_rate > moyenne + 1.5 × écart-type) toutes les 6h et génère un `content_signal` avec analyse Claude |
| FR-A1-15 | Un Editor peut visualiser le calendrier éditorial drag-and-drop et le pipeline contenu en vue Kanban |

### 8.3 Agent 2 — Amplification Engine

| ID | Requirement |
|----|-------------|
| FR-A2-01 | Le système analyse quotidiennement (6h) les publicités des concurrents via Facebook Ad Library API |
| FR-A2-02 | Claude génère une proposition de campagne complète (objectif, ciblage, budget, structure ad sets, 3 variantes texte, suggestions visuelles, KPIs cibles) à partir d'un content signal ou d'une demande manuelle |
| FR-A2-03 | DALL-E génère 3 variantes de visuels publicitaires par campagne |
| FR-A2-04 | Toute campagne publicitaire passe obligatoirement par un circuit d'approbation humaine (gate dépenses) avec notification haute priorité |
| FR-A2-05 | Le système crée automatiquement les campagnes sur Facebook Ads (campaign + ad sets + creatives + ads) et TikTok Ads via leurs APIs respectives |
| FR-A2-06 | Le système collecte les métriques pub toutes les 4h (impressions, clicks, spend, conversions, CPC, CPM, CTR, ROAS) |
| FR-A2-07 | L'optimisation AI quotidienne (10h) applique des règles : ROAS < 1.0 pendant 3j → pause, CPC > 2× moyenne → ajustement ciblage, CTR > 2× moyenne → scaling +30%, creative surperformante > 50% → concentration |
| FR-A2-08 | Toutes les actions d'optimisation sont loggées dans `ai_learning_log` |
| FR-A2-09 | Un Admin peut consulter les performances publicitaires avec graphiques ROAS, CPC, CPM (Recharts) |

### 8.4 Agent 3 — Opportunity Hunter

| ID | Requirement |
|----|-------------|
| FR-A3-01 | Le système ingère des leads depuis multiples sources (formulaires web, Facebook Lead Ads, Google Ads, TikTok, webinaires, CSV/API) via webhook avec normalisation automatique des champs |
| FR-A3-02 | Le système déduplique les leads par email ou numéro de téléphone et fusionne les données si existant |
| FR-A3-03 | Claude score chaque lead (0-100) selon : complétude profil, qualité source, budget, taille entreprise, pain points, urgence. Température : hot ≥ 70, warm ≥ 40, cold < 40 |
| FR-A3-04 | Un lead hot déclenche automatiquement une proposition de booking (3 créneaux Cal.com) via email ou WhatsApp |
| FR-A3-05 | Un lead warm est inscrit dans une séquence de nurturing personnalisée (email Resend + WhatsApp Business) |
| FR-A3-06 | Claude personnalise chaque message de séquence selon le contexte du lead (interactions, pain points, produit suggéré, langue) |
| FR-A3-07 | Le système exécute les étapes de séquences dues toutes les heures (MKT-303) |
| FR-A3-08 | Le système analyse le sentiment et l'intention de chaque réponse de lead (positive/neutral/negative, interested/needs_info/not_ready/objection/ready_to_buy/unsubscribe) et ajuste le parcours en conséquence |
| FR-A3-09 | Claude génère un briefing AI complet avant chaque appel (score, température, pain points, historique, produit suggéré, objections) |
| FR-A3-10 | Le système escalade automatiquement vers un commercial (MKT-306) en cas de réponse négative, demande complexe, ou lead VIP |
| FR-A3-11 | Le système suit les conversions et calcule l'attribution multi-touch (linéaire) : valeur répartie équitablement entre tous les touchpoints outbound |
| FR-A3-12 | Un Viewer peut consulter le pipeline leads en vue entonnoir interactif avec filtres par température, source, date |

### 8.5 Dashboard & Analytics

| ID | Requirement |
|----|-------------|
| FR-D01 | Le dashboard affiche l'état temps réel des 3 agents via WebSocket events |
| FR-D02 | Le dashboard affiche les KPIs agrégés avec sparklines, rafraîchis toutes les 30s via SSE (`GET /api/analytics/stream`) |
| FR-D03 | Un utilisateur peut consulter les analytics détaillés : contenu (top posts, tendances engagement), pubs (ROAS, meilleur ad set), leads (nouveaux, qualifiés, convertis) |
| FR-D04 | Le système agrège les métriques quotidiennement à 23h59 dans `daily_analytics` (MKT-402) |
| FR-D05 | Le système génère un rapport hebdomadaire AI chaque lundi 8h (MKT-403) : résumé exécutif, performance contenu, performance pub, pipeline leads, insights AI, recommandations |
| FR-D06 | Un utilisateur peut consulter et agir sur la file d'approbation (ApprovalModal : approve/reject/edit) |
| FR-D07 | Le dashboard est responsive et supporte internationalisation FR/EN (next-intl) |

### 8.6 Système & Utilitaires

| ID | Requirement |
|----|-------------|
| FR-S01 | Le système rafraîchit les tokens OAuth toutes les 12h, avant expiration, avec notification urgente en cas d'échec (MKT-401) |
| FR-S02 | La boucle d'apprentissage AI (MKT-404, quotidien 2h) analyse 30 jours de données, génère des insights avec embeddings (text-embedding-3-small), et publie sur `mkt:agent:learning:updated` |
| FR-S03 | La table `agent_messages` persiste tous les messages inter-agents avec dead letter queue (non consommés > 24h → notification admin + re-traitement) |
| FR-S04 | Chaque workflow n8n critique possède un Error Trigger node pour capture et notification d'erreurs |
| FR-S05 | Le système supporte les webhooks bidirectionnels API ↔ n8n avec authentification Header Auth (X-API-Key) |

---

## 9. Non-Functional Requirements

### 9.1 Performance

| ID | Requirement |
|----|-------------|
| NFR-P01 | Le système doit répondre à 95% des requêtes API en moins de 500ms, mesuré par APM |
| NFR-P02 | Le dashboard doit atteindre un Time-to-Interactive < 3s sur connexion 4G, mesuré par Lighthouse |
| NFR-P03 | Les workflows n8n doivent compléter leur exécution dans les limites : MKT-107 < 2min par batch de publications, MKT-108 < 5min par collecte de métriques |
| NFR-P04 | Les événements WebSocket doivent être délivrés au dashboard en < 2s après l'événement source |
| NFR-P05 | Le système doit supporter ≥ 50 publications simultanées (scheduler 15min) sans dégradation |

### 9.2 Security

| ID | Requirement |
|----|-------------|
| NFR-S01 | Authentification JWT avec access token 15min + refresh token 7j, rotation automatique |
| NFR-S02 | RBAC à 4 niveaux (Owner, Admin, Editor, Viewer) appliqué sur chaque endpoint API |
| NFR-S03 | Rate limiting par tier : auth 10 req/15min, API 100 req/15min, par IP + tenant |
| NFR-S04 | Chiffrement at-rest (PostgreSQL TDE) et in-transit (TLS 1.3) |
| NFR-S05 | Tokens API tiers chiffrés en base avec AES-256-GCM |
| NFR-S06 | CORS strict avec whitelist d'origines configurée par tenant |
| NFR-S07 | Protection Helmet.js (XSS, HSTS, CSP, frameguard) sur toutes les routes Express |
| NFR-S08 | Logging structuré JSON avec correlation ID sur chaque requête, sans données sensibles |

### 9.3 Scalability

| ID | Requirement |
|----|-------------|
| NFR-SC01 | Architecture Docker Compose (version 3.8) sur réseau bridge unique (`mkt-network`), containers préfixés `mkt-*` |
| NFR-SC02 | Bull queue (Redis-backed) pour tous les jobs asynchrones (génération contenu, envoi emails, collecte métriques) avec concurrency configurable |
| NFR-SC03 | Multi-tenant RLS permettant ≥ 100 tenants sur la même instance sans modification d'infrastructure |
| NFR-SC04 | MinIO S3-compatible pour stockage média illimité, path-based per-org |

### 9.4 Reliability

| ID | Requirement |
|----|-------------|
| NFR-R01 | Retry automatique avec backoff exponentiel (base 30s, max 3 tentatives) pour toutes les APIs externes |
| NFR-R02 | Health checks avec conditions sur tous les services Docker (PostgreSQL, Redis, n8n, MinIO) |
| NFR-R03 | Métriques de santé temps réel : temps pipeline Agent 1 < 24h, Agent 2 < 48h, Agent 3 premier contact < 1h |
| NFR-R04 | Messages Redis non consommés : warning > 5, critical > 20 |
| NFR-R05 | Format d'erreur uniforme : `{ success: false, error: { code, message, details } }` avec codes HTTP standards |

### 9.5 Compliance

| ID | Requirement |
|----|-------------|
| NFR-CO01 | Conformité RGPD complète : consentement, effacement, portabilité, registre traitements, DPO contact |
| NFR-CO02 | Respect des Terms of Service de chaque plateforme sociale (rate limits, contenu autorisé) |
| NFR-CO03 | Traçabilité complète des actions IA dans `ai_learning_log` (audit trail) |

---

## 10. Data Architecture

### 10.1 Domaines et tables (~25)

| Domaine | Tables | Responsabilité |
|---------|--------|----------------|
| **Core** | `tenants`, `organizations`, `brands`, `products`, `social_accounts`, `ad_accounts` | Entités métier, identité, connexions |
| **Content** (Agent 1) | `content_pillars`, `content_inputs`, `content_pieces`, `content_schedule`, `content_metrics`, `content_signals` | Pipeline contenu complet |
| **Advertising** (Agent 2) | `ad_campaigns`, `ad_sets`, `ad_creatives`, `ad_metrics`, `competitor_ads` | Gestion publicitaire |
| **Leads** (Agent 3) | `leads`, `lead_interactions`, `lead_sequences`, `lead_sequence_enrollments`, `calendar_bookings` | Pipeline conversion |
| **Analytics** | `daily_analytics`, `ai_learning_log` | Agrégation, apprentissage |
| **System** | `platform_users`, `approval_queue`, `agent_messages` | Utilisateurs, approbations, communication inter-agents |

### 10.2 Relations clés

- Toutes les tables portent `tenant_id` + RLS policy
- `content_pieces.parent_id` → self-reference pour variantes multi-plateforme
- `content_signals` → link `content_pieces` (source) vers `ad_campaigns` (amplification)
- `lead_interactions` → historique complet lead (inbound/outbound, email/whatsapp/call)
- `lead_sequence_enrollments` → many-to-many leads ↔ sequences avec état machine
- `agent_messages` → bus de communication inter-agents persisté
- Conventions : PascalCase modèles Prisma, camelCase champs, snake_case tables DB

### 10.3 Conventions DB

- `@id @default(cuid())` pour tous les IDs
- `created_at`, `updated_at` sur chaque table
- Index composite sur `(tenant_id, ...)` pour les requêtes fréquentes
- JSONB pour les données flexibles (AI responses, metadata, targeting)

---

## 11. Integration Requirements

### 11.1 APIs sociales (publication + métriques)

| Service | Usage | Auth |
|---------|-------|------|
| LinkedIn Marketing API | Publication `ugcPosts`, métriques `organizationalEntityShareStatistics` | OAuth 2.0 |
| Facebook Graph API v19+ | Publication `/{page_id}/feed`, métriques `/{post_id}/insights`, Lead Ads webhooks | OAuth 2.0 |
| Instagram Graph API | Publication container → publish, métriques `/{media_id}/insights` | Via Facebook OAuth |
| TikTok Content Posting API | Publication, métriques Research/Creator API | OAuth 2.0 |
| Twitter/X API v2 | Publication `/tweets`, métriques `public_metrics` | OAuth 2.0 |

### 11.2 APIs publicitaires

| Service | Usage | Auth |
|---------|-------|------|
| Facebook Ads API v19 | Campaigns, ad sets, creatives, ads, insights | OAuth + ad_account_id |
| TikTok Ads API v1.3 | Campaign/adgroup/ad create, reporting | OAuth |
| Google Ads API (Phase 5) | Search/display campaigns | OAuth + customer_id |

### 11.3 Services AI

| Service | Usage | Auth |
|---------|-------|------|
| Claude API (Anthropic) | Génération contenu, analyse, qualification, optimisation | API Key |
| DALL-E 3 (OpenAI) | Visuels sociaux + créatives pub | API Key |
| Whisper (OpenAI) | Transcription audio | API Key |
| text-embedding-3-small (OpenAI) | Embeddings pour ai_learning_log | API Key |

### 11.4 Services opérationnels

| Service | Usage | Auth |
|---------|-------|------|
| Resend / SMTP | Email transactionnel + marketing | API Key |
| WhatsApp Business Cloud API | Nurturing leads + notifications | Bearer token |
| Cal.com / Google Calendar | Booking appels qualifiés | API Key |
| Slack | Notifications + approbations interactives | Bot token |
| Stripe | Paiements EUR | API Key |
| Orange Money / Wave | Paiements XOF | API Key |
| MinIO | Stockage média S3-compatible | Access/Secret Key |

---

## 12. Constraints & Assumptions

### 12.1 Constraints

| ID | Contrainte |
|----|-----------|
| CO-01 | Déploiement Docker Compose single-server (pas de Kubernetes en Phase 0-3) |
| CO-02 | n8n Community Edition — pas de fonctionnalités Enterprise (SSO, audit log natif) |
| CO-03 | Budget API AI à surveiller — pas d'estimation de coûts dans la spec actuelle |
| CO-04 | WhatsApp Business API requiert validation Meta (délai 2-4 semaines) |
| CO-05 | Facebook Ad Library API accès limité — nécessite validation app |
| CO-06 | Modèle Claude hardcodé (claude-sonnet-4-20250514) — prévoir mécanisme de mise à jour |

### 12.2 Assumptions

| ID | Hypothèse |
|----|-----------|
| AS-01 | Les utilisateurs cibles disposent de comptes professionnels sur les réseaux sociaux visés |
| AS-02 | Le volume initial est < 1000 publications/mois et < 500 leads/mois par tenant |
| AS-03 | L'approbation humaine est acceptable avec un SLA de 24h (relance automatique) |
| AS-04 | Les APIs des réseaux sociaux restent stables sur la durée du développement (6-12 mois) |
| AS-05 | Un seul serveur (16GB RAM, 4 vCPU minimum) suffit pour Phase 0-3 |

### 12.3 Risques identifiés

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Changement API réseaux sociaux | Haut | Couche d'abstraction par plateforme, monitoring versions API |
| Coûts AI imprévisibles | Moyen | Compteur d'usage par tenant, alertes seuils, cache des résultats similaires |
| Rate limits APIs pub | Moyen | Queue avec throttling, batch processing, retry intelligent |
| Qualité contenu IA insuffisante | Moyen | Circuit approbation humaine obligatoire, feedback loop apprentissage |
| Délais validation WhatsApp/Facebook App | Moyen | Planifier tôt, comptes de dev/test en parallèle |

---

## 13. Traceability Matrix

```
Product Brief Vision
  ↓
Success Criteria (BM-01..07, UM-01..05, TM-01..06)
  ↓
User Journeys (5 journeys couvrant les 5 personas)
  ↓
Functional Requirements
  ├── Core Platform (FR-C01..10)
  ├── Agent 1 — Content Flywheel (FR-A1-01..15)
  ├── Agent 2 — Amplification Engine (FR-A2-01..09)
  ├── Agent 3 — Opportunity Hunter (FR-A3-01..12)
  ├── Dashboard & Analytics (FR-D01..07)
  └── Système & Utilitaires (FR-S01..05)
  ↓
Non-Functional Requirements
  ├── Performance (NFR-P01..05)
  ├── Security (NFR-S01..08)
  ├── Scalability (NFR-SC01..04)
  ├── Reliability (NFR-R01..05)
  └── Compliance (NFR-CO01..03)
  ↓
Implementation Phases (Phase 0 → Phase 5)
```

### Coverage par persona

| Persona | FRs couvrant | Journeys |
|---------|-------------|----------|
| Amadou (Fondateur PME) | FR-C01..02, FR-A1-01..15, FR-A3-04..09, FR-D01..07 | Journey 1, 3 |
| Sophie (Responsable Marketing) | FR-C04..05, FR-A2-01..09, FR-D03..06 | Journey 2 |
| Marc (Directeur Agence) | FR-C02..03, FR-C08, FR-D01..07 | Journey 4 |
| Fatou (Commerciale) | FR-A3-09, FR-A3-12, FR-D01..02 | Journey 5 |
| Admin/Owner | FR-C03..10, FR-S01..05 | Journey 4 |

---

*Document généré selon la méthode BMAD v6.0.0-Beta.7 — Agent PM (John)*
*Input : 2 cahiers des charges (1,563 lignes) + Product Brief*
*58 Functional Requirements | 25 Non-Functional Requirements | 5 User Journeys | 6 Domain Requirements | 6 Innovation aspects*
