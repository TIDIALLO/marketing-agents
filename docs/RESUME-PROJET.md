# MarketingEngine — Documentation Technique Complète

> **Version** : 1.0.0 | **Date** : 8 février 2026 | **Méthode** : BMAD v6.0.0-Beta.7

---

## Table des matières

1. [Vision et Marché](#1-vision-et-marché)
2. [Les 3 Agents IA](#2-les-3-agents-ia)
3. [Stack Technique](#3-stack-technique)
4. [Architecture Monorepo](#4-architecture-monorepo)
5. [Base de Données — 31 Modèles](#5-base-de-données--31-modèles)
6. [API — 14 Routes, ~90 Endpoints](#6-api--14-routes-90-endpoints)
7. [Middleware Stack](#7-middleware-stack)
8. [Intégrations Externes](#8-intégrations-externes)
9. [Sécurité](#9-sécurité)
10. [Les 10 Epics Implémentés](#10-les-10-epics-implémentés)
11. [Chiffres du Projet](#11-chiffres-du-projet)
12. [Historique Git](#12-historique-git)
13. [Prochaines Étapes](#13-prochaines-étapes)

---

## 1. Vision et Marché

**MarketingEngine** est un autopilot marketing IA SaaS multi-tenant orchestrant **3 agents spécialisés** pour automatiser le cycle complet : **création de contenu → amplification publicitaire → conversion de leads**.

Les agents communiquent via des **boucles de feedback inter-agents** (Redis pub/sub + bus persistant), créant un **système auto-améliorant**.

| Dimension | Valeur |
|---|---|
| **Marché cible** | PME Afrique de l'Ouest (Sénégal, Côte d'Ivoire) + France |
| **Modèle économique** | SaaS B2B multi-tenant + white-label resale pour agences |
| **Langues** | Interface FR/EN, contenu généré multilingue |
| **Méthode** | BMAD v6.0.0-Beta.7 (Breakthrough Method of Agile AI Driven Development) |

### Personas cibles

| Persona | Rôle | Contexte |
|---|---|---|
| **Amadou** — Fondateur PME (Dakar) | Owner | Agence immobilière, gère le marketing seul |
| **Sophie** — Resp. Marketing (Abidjan) | Editor | Seule marketeuse, chaîne de restaurants |
| **Marc** — Directeur Agence (Paris) | Owner white-label | Agence 8 pers., gère 12 clients |
| **Fatou** — Commerciale terrain | Viewer | Consulte leads qualifiés + briefings IA |

### Métriques de succès

| Métrique | Cible |
|---|---|
| Temps création contenu (input → publication) | < 24h |
| Volume contenu / marque / mois | ≥ 20 pièces multi-plateforme |
| Taux qualification leads | ≥ 80% scorés automatiquement |
| Délai premier contact lead | < 1h après ingestion |
| ROAS campagnes pub | ≥ 2.0 après 30 jours |
| Disponibilité plateforme | ≥ 99.5% uptime |

---

## 2. Les 3 Agents IA

### Agent 1 — Content Flywheel

Responsable de la création, approbation et publication de contenu multi-plateforme.

- **Entrée** : Note vocale, texte, URL → Whisper transcription → Claude résumé + suggestions
- **Recherche** : Claude analyse tendances sectorielles + contenu récent
- **Génération** : Claude rédige le contenu + DALL-E 3 génère les visuels
- **Approbation** : Slack + email avec boutons Approuver/Rejeter (tokens SHA-256)
- **Publication** : Adaptation multi-plateforme + scheduling aux heures optimales
- **Analytics** : Métriques collectées, engagement score calculé, signaux gagnants détectés
- **Workflows n8n** : MKT-101 à MKT-109

### Agent 2 — Amplification Engine

Responsable des campagnes publicitaires automatisées et de l'optimisation ROAS.

- **Veille concurrentielle** : Facebook Ad Library + Claude analyse
- **Propositions IA** : Claude génère campagne complète + DALL-E créatives
- **Approbation** : Gate d'approbation avec preview budget/targeting
- **Lancement** : Facebook Ads + TikTok Ads avec IDs plateforme
- **Optimisation** : Collecte métriques, détection anomalies (CPC spike, ROAS drop), Claude recommandations
- **Workflows n8n** : MKT-201 à MKT-206

### Agent 3 — Opportunity Hunter

Responsable de la capture, qualification, nurturing et conversion de leads.

- **Ingestion** : Multi-source (formulaires, Facebook Lead Ads, CSV) avec déduplication email/phone
- **Qualification** : Claude scoring 0-100 (hot ≥ 70, warm ≥ 40, cold < 40)
- **Auto-booking** : Hot leads → Cal.com slots + message personnalisé Claude
- **Nurturing** : Séquences email/WhatsApp avec personnalisation IA par étape
- **Intent detection** : Claude analyse sentiment + intention (ready_to_buy, objection, unsubscribe)
- **Attribution** : Multi-touch linear attribution avec tracking conversion
- **Workflows n8n** : MKT-301 à MKT-307

### Boucles de Feedback Inter-Agents

```
Agent 1 (Content) ←→ Agent 2 (Ads)
     ↑                    ↓
     └── Agent 3 (Leads) ←┘
            ↓
     AI Learning Loop (MKT-404)
```

| Boucle | Direction | Description |
|---|---|---|
| Content → Amplification | Agent 1 → 2 | Contenus gagnants → propositions de campagne auto |
| Amplification → Leads | Agent 2 → 3 | Leads pub ingérés avec attribution complète |
| Leads → Content | Agent 3 → 1 | Pain points → sujets de contenu auto-générés |
| Ads → Content | Agent 2 → 1 | Créatives gagnantes → insights pour contenu organique |
| AI Learning Loop | Tous | Analyse 30j, patterns, embeddings, amélioration continue |

---

## 3. Stack Technique

```
┌──────────────────────────────────────────────────────┐
│                   NGINX (Reverse Proxy)               │
├───────────────────────┬──────────────────────────────┤
│  Next.js 15 (Dashboard)  │   Express.js 4 (API)      │
│  React 19 + Tailwind     │   TypeScript strict        │
│  next-intl (FR/EN)       │   Zod validation           │
│  Socket.io client        │   JWT + RBAC               │
├───────────────────────┴──────────────────────────────┤
│               Prisma ORM (31 modèles)                 │
├──────────────────────────────────────────────────────┤
│ PostgreSQL 16  │  Redis 7   │  MinIO    │  n8n       │
│ (RLS multi-    │ (pub/sub,  │ (object   │ (25        │
│  tenant)       │  bus, DLQ) │  storage) │  workflows)│
└────────────────┴────────────┴───────────┴────────────┘
```

### Dépendances principales (API)

| Package | Version | Usage |
|---|---|---|
| express | 4.21 | Framework HTTP |
| @prisma/client | 6.3 | ORM PostgreSQL |
| jsonwebtoken | 9.0 | JWT auth |
| bcrypt | 5.1 | Hash mots de passe |
| ioredis | 5.4 | Client Redis |
| socket.io | 4.8 | WebSocket temps réel |
| zod | 3.24 | Validation schémas |
| helmet | 8.0 | Security headers |
| minio | 8.0 | Stockage objet |
| resend | 6.9 | Emails transactionnels |

### Dépendances principales (Dashboard)

| Package | Version | Usage |
|---|---|---|
| next | 15.1 | Framework React SSR |
| react | 19.0 | UI |
| next-intl | 4.1 | Internationalisation |
| recharts | 2.15 | Graphiques |
| socket.io-client | 4.8 | WebSocket client |
| tailwindcss | 4.0 | CSS utility-first |
| lucide-react | 0.563 | Icônes |

---

## 4. Architecture Monorepo

```
agents-marketing/
├── apps/
│   ├── api/                              ← Express.js backend
│   │   ├── prisma/schema.prisma           (664 lignes, 31 modèles)
│   │   └── src/
│   │       ├── lib/          (11 fichiers, 475 lignes)
│   │       │   ├── ai.ts         Claude + Whisper + DALL-E
│   │       │   ├── email.ts      7 templates email (Resend)
│   │       │   ├── encryption.ts AES-256-GCM
│   │       │   ├── errors.ts     AppError class
│   │       │   ├── jwt.ts        Access + Refresh tokens
│   │       │   ├── minio.ts      Object storage
│   │       │   ├── n8n.ts        Webhook triggers
│   │       │   ├── prisma.ts     Client singleton
│   │       │   ├── redis.ts      ioredis pub/sub
│   │       │   ├── slack.ts      Slack webhooks
│   │       │   └── socket.ts     Socket.io tenant rooms
│   │       ├── middleware/   (9 fichiers, 221 lignes)
│   │       │   ├── apiKeyAuth.ts  X-API-Key pour n8n
│   │       │   ├── asyncHandler.ts Generic async wrapper
│   │       │   ├── auth.ts        JWT Bearer verification
│   │       │   ├── correlationId.ts X-Correlation-ID
│   │       │   ├── errorHandler.ts  Global error handler
│   │       │   ├── rateLimiter.ts   Rate limiting
│   │       │   ├── requireRole.ts   RBAC permissions
│   │       │   ├── tenant.ts        Tenant isolation
│   │       │   └── validate.ts      Zod validation
│   │       ├── routes/       (13 fichiers, 1 647 lignes)
│   │       ├── services/     (16 fichiers, 4 702 lignes)
│   │       ├── app.ts         (97 lignes) Express setup
│   │       └── index.ts       (12 lignes) HTTP + Socket.io server
│   └── dashboard/                        ← Next.js frontend
│       ├── messages/           fr.json + en.json (~100 clés chacun)
│       └── src/
│           ├── app/            Next.js App Router (auth + dashboard)
│           ├── components/     UI components (Header, Sidebar, Button, Card...)
│           ├── lib/            API client + utils
│           ├── providers/      Auth + Theme + Intl providers
│           └── i18n/           Config locales
├── packages/
│   └── shared/                           ← Types, constantes, utils
│       └── src/
│           ├── constants/      Rôles, permissions, erreurs, plateformes
│           ├── types/          API, Auth, Content, Leads, Ads, Analytics, Events
│           └── utils/          Email validation, date formatting
├── docker/
│   ├── docker-compose.yml      PostgreSQL 16, Redis 7, MinIO, Nginx
│   └── docker-compose.dev.yml  Override développement
├── _bmad-output/                         ← Documentation BMAD
│   ├── planning-artifacts/     PRD, Architecture, Epics (3 085 lignes)
│   └── implementation-artifacts/ Sprint status (108 lignes)
├── turbo.json                  Turborepo config
├── package.json                Monorepo root
└── .env.example                Variables d'environnement
```

---

## 5. Base de Données — 31 Modèles

### Auth et Tenant

| Modèle | Champs | Description |
|---|---|---|
| **Tenant** | 8 | Entité racine multi-tenant (plan, logo, couleurs, domaine custom) |
| **PlatformUser** | 11 | Comptes utilisateurs (email, hash, rôle, refresh token, prefs notif) |
| **PasswordResetToken** | 5 | Tokens de réinitialisation (hash SHA-256, expiration) |

### Organisation

| Modèle | Champs | Description |
|---|---|---|
| **Organization** | 5 | Organisations sous un tenant |
| **OrganizationUser** | 4 | Appartenance utilisateur-organisation avec rôle |
| **UserInvitation** | 6 | Invitations par email (token hashé, expiration 7j) |

### Marques

| Modèle | Champs | Description |
|---|---|---|
| **Brand** | 8 | Marques (voix, audience cible, guidelines contenu/visuel en JSON) |
| **Product** | 5 | Produits associés aux marques |
| **SocialAccount** | 9 | Comptes sociaux connectés (tokens chiffrés AES-256-GCM) |
| **AdAccount** | 8 | Comptes publicitaires (credentials chiffrés) |

### Pipeline Contenu

| Modèle | Champs | Description |
|---|---|---|
| **ContentPillar** | 6 | Piliers de contenu thématiques |
| **ContentInput** | 13 | Entrées brutes (texte/audio/URL, transcription, résumé IA) |
| **ContentPiece** | 15 | Contenus générés (titre, body, hashtags, CTA, media, score) |
| **ApprovalQueue** | 12 | File d'approbation (token action, reminders, priorité) |
| **ContentSchedule** | 8 | Programmation publication (retries, errors) |
| **ContentMetrics** | 11 | Métriques par plateforme (impressions, reach, engagement...) |
| **ContentSignal** | 5 | Signaux contenu gagnant (type, force, recommandation IA) |

### Analytics

| Modèle | Champs | Description |
|---|---|---|
| **DailyAnalytics** | 10 | Agrégation quotidienne (contenus, impressions, leads, conversions) |

### Leads

| Modèle | Champs | Description |
|---|---|---|
| **Lead** | 17 | Leads (score, température, UTM, RGPD, attribution) |
| **CalendarBooking** | 9 | Rendez-vous (slots proposés, briefing IA, Cal.com) |
| **LeadSequence** | 5 | Séquences nurturing (étapes en JSON) |
| **LeadSequenceEnrollment** | 8 | Inscription lead dans séquence (étape courante, next action) |
| **LeadInteraction** | 7 | Historique interactions (direction, channel, sentiment, intent) |

### Publicité

| Modèle | Champs | Description |
|---|---|---|
| **CompetitorAd** | 7 | Veille concurrentielle (contenu, analyse IA) |
| **AdCampaign** | 13 | Campagnes (budget, targeting, KPIs, proposition IA) |
| **AdSet** | 6 | Ensembles de publicités |
| **AdCreative** | 7 | Créatives publicitaires (titre, body, image, CTA) |
| **AdMetrics** | 10 | Métriques pub (impressions, clicks, spend, ROAS, CPC, CTR) |

### Système

| Modèle | Champs | Description |
|---|---|---|
| **AiLearningLog** | 10 | Journal apprentissage IA (input/output, embeddings, outcome) |
| **AgentMessage** | 10 | Bus messages inter-agents (channel, payload, DLQ, retries) |
| **WorkflowError** | 7 | Erreurs workflows n8n (workflow, noeud, message, stack) |

### Patterns Prisma

- **Nommage** : Modèles PascalCase, champs camelCase, tables `@@map("snake_case")`
- **IDs** : `@id @default(cuid())`
- **Timestamps** : `createdAt @default(now())`, `updatedAt @updatedAt`
- **Multi-tenant** : `tenantId` indexé sur tous les modèles métier
- **JSON flexible** : `brandVoice`, `targeting`, `kpiTargets`, `steps`, `proposedSlots`
- **Chiffrement** : Tokens OAuth stockés chiffrés (`accessTokenEncrypted`)

---

## 6. API — 14 Routes, ~90 Endpoints

### Routes publiques (sans authentification)

| Route | Endpoints | Description |
|---|---|---|
| `GET /health` | 1 | Health check |
| `POST /api/auth/register` | 1 | Inscription + création tenant |
| `POST /api/auth/login` | 1 | Connexion |
| `POST /api/auth/refresh` | 1 | Renouvellement access token |
| `POST /api/auth/logout` | 1 | Déconnexion |
| `POST /api/auth/forgot-password` | 1 | Demande réinitialisation |
| `POST /api/auth/reset-password` | 1 | Réinitialisation mot de passe |
| `GET /api/approval/resolve/:token` | 1 | Résolution approbation par token |
| `POST /api/webhooks/mkt-301` | 1 | Ingestion lead |
| `POST /api/webhooks/mkt-304` | 1 | Réponse lead inbound |
| `POST /api/webhooks/mkt-307` | 1 | Événement conversion |
| `POST /api/webhooks/mkt-301-ad` | 1 | Lead pub avec attribution (API Key) |
| `POST /api/webhooks/n8n-error` | 1 | Erreur workflow n8n (API Key) |

### Routes protégées (JWT + tenant)

| Route | Endpoints | Description |
|---|---|---|
| `/api/organizations` | 5 | CRUD organisations + invitations |
| `/api/brands` | 8 | CRUD marques + produits + piliers contenu |
| `/api/social-accounts` | 5 | CRUD comptes sociaux + OAuth connect |
| `/api/content` | 12 | Inputs, génération IA, CRUD pieces, schedules, publication |
| `/api/approval` | 5 | Submit, queue enrichie, resolve, reminders |
| `/api/analytics` | 10 | Dashboard, top posts, trends, SSE stream, signaux, rapports |
| `/api/leads` | 8 | CRUD leads, pipeline funnel, AI score, booking, briefing |
| `/api/leads/nurturing` | 10 | Séquences CRUD, enrollment, follow-ups, analyze, escalate |
| `/api/advertising` | 9 | Campaigns, propose, approve, launch, pause, competitors, optimize |
| `/api/system` | 12 | Health, OAuth, messages bus, DLQ, feedback loops, errors |
| `/api/admin` | 3 | White-label, notifications |
| `/api/me` | 1 | Profil utilisateur courant |

---

## 7. Middleware Stack

L'ordre des middleware est critique et suit cette séquence stricte :

```
Request entrante
  │
  ├── 1. Helmet (security headers)
  ├── 2. CORS (whitelist origins, credentials: true)
  ├── 3. Cookie Parser
  ├── 4. Body Parser (JSON 10mb + urlencoded)
  ├── 5. Correlation ID (X-Correlation-ID auto-généré)
  ├── 6. Health Check (/health — avant rate limiting)
  ├── 7. Rate Limiter
  │       ├── Auth : 5 requêtes / 15 min
  │       └── API : 100 requêtes / 15 min
  ├── 8. Routes publiques (auth, approval token, webhooks)
  ├── 9. Auth Middleware (JWT Bearer verification)
  ├── 10. Tenant Middleware (extraction tenantId du JWT)
  ├── 11. Routes protégées
  ├── 12. 404 Catch-all
  └── 13. Global Error Handler
          │
          Response
```

---

## 8. Intégrations Externes

| Service | Usage | Mode Dev |
|---|---|---|
| **Claude API** (Anthropic) | Génération contenu, scoring leads, rapports, optimisation | Mock response |
| **OpenAI Whisper** | Transcription audio → texte | Mock transcription |
| **OpenAI DALL-E 3** | Génération visuels (1024x1024) | Placeholder URL |
| **OpenAI Embeddings** | text-embedding-3-small (1536D) pour AI Learning Loop | Mock vector |
| **Resend** | Emails transactionnels (7 templates) | Console.log |
| **Slack Webhooks** | Notifications approbation, alertes, rapports | Console.log |
| **Cal.com** | Booking automatique pour hot leads | Mock slots |
| **Facebook / Instagram API** | Publication, métriques, Lead Ads | Mock responses |
| **LinkedIn API** | Publication, métriques | Mock responses |
| **TikTok API** | Publication, métriques, Ads | Mock responses |
| **Twitter API** | Publication, métriques | Mock responses |
| **MinIO** | Stockage objet (visuels, médias) | Container local |
| **n8n** | 25 workflows (MKT-1xx à MKT-4xx) | Graceful skip |

Tous les services externes ont un **mode dev gracieux** : quand la clé API n'est pas configurée, le système retourne des mocks réalistes et continue de fonctionner.

---

## 9. Sécurité

### Authentification

- **JWT Access Token** : 15 minutes, signé HS256
- **JWT Refresh Token** : 7 jours, httpOnly cookie secure, rotation à chaque usage
- **Hash refresh token** : SHA-256 stocké en base (pas le token brut)
- **Bcrypt** : 12 rounds pour les mots de passe

### Autorisation (RBAC)

4 rôles hiérarchiques avec 17 permissions granulaires :

| Rôle | Niveau | Permissions clés |
|---|---|---|
| **Owner** | 4 | Tout (tenant, users, brands, content, ads, leads, settings) |
| **Admin** | 3 | Users, brands, content, ads, leads (pas tenant) |
| **Editor** | 2 | Brands (edit/view), content (create/view), leads (manage/view) |
| **Viewer** | 1 | Lecture seule sur tout |

### Isolation Multi-Tenant

- Chaque requête filtrée par `tenantId` extrait du JWT
- Row-Level Security (RLS) PostgreSQL
- Index sur `tenantId` sur tous les modèles métier

### Chiffrement

- **AES-256-GCM** : Tokens OAuth, credentials ad accounts
- **SHA-256** : Action tokens d'approbation (raw dans URL, hash en base)
- **X-API-Key** : Authentification webhooks n8n → API

### Protections

- **Helmet** : Security headers HTTP
- **CORS** : Whitelist origins stricte
- **Rate Limiting** : 5/15min (auth), 100/15min (API)
- **Zod** : Validation stricte de tous les body
- **Pas d'énumération** : `forgotPassword` ne révèle pas l'existence d'un email

---

## 10. Les 10 Epics Implémentés

### Phase 0 — Fondation

**Epic 1 : Project Foundation & User Authentication** (7 stories)
- Initialisation monorepo Turborepo
- Docker Compose (PostgreSQL, Redis, MinIO, Nginx)
- Express.js scaffold avec middleware stack
- JWT auth (register, login, refresh, logout)
- Password reset flow avec email
- RBAC 4 rôles + multi-tenant RLS
- Next.js dashboard scaffold (auth flow, layout, sidebar)

**Epic 2 : Brand Management & Integrations** (6 stories)
- Organisations + invitations utilisateurs
- Marques + produits avec guidelines IA
- Comptes sociaux OAuth (5 plateformes)
- Comptes publicitaires
- White-label branding (logo, couleurs, domaine custom)
- Préférences de notifications (Slack, email, WhatsApp)

### Phase 1 — Content Flywheel

**Epic 3 : Content Creation AI Pipeline** (5 stories)
- Soumission d'inputs texte avec piliers de contenu
- Transcription audio Whisper + résumé IA
- Recherche IA (tendances, contenu récent) via Claude
- Génération de contenu multi-plateforme (Claude)
- Génération visuels DALL-E 3 + stockage MinIO

**Epic 4 : Content Approval & Multi-Platform Publishing** (6 stories)
- Circuit d'approbation Slack (preview + boutons action)
- Notifications email avec liens approuver/rejeter (tokens SHA-256)
- Système de relance (24h interval, max 3, escalation admin)
- Adaptation multi-plateforme (LinkedIn, Facebook, Instagram, TikTok, Twitter)
- Publication automatisée aux heures optimales (3 retries, 30min backoff)
- Calendrier éditorial (schedules CRUD)

**Epic 5 : Content Performance & Dashboard** (6 stories)
- Collecte métriques LinkedIn + Facebook
- Collecte métriques Instagram + Twitter + TikTok
- Calcul engagement score (likes×1 + comments×3 + shares×5 + saves×4 + clicks×2)
- Détection contenu gagnant (seuil = mean + 1.5×stddev) + Claude analyse
- Dashboard analytics (overview, top posts, trends, signaux)
- WebSocket temps réel (Socket.io, tenant rooms, emitToTenant)

### Phase 2 — Opportunity Hunter

**Epic 6 : Lead Capture & AI Qualification** (6 stories)
- Ingestion multi-source (formulaires, webhooks, CSV)
- Déduplication par email/phone + merge intelligent
- Scoring IA Claude 0-100 (hot/warm/cold)
- Auto-booking Cal.com pour hot leads + message personnalisé
- Briefing IA commercial (résumé, pain points, objections, discussion points)
- Dashboard pipeline funnel (par température, statut, source)

**Epic 7 : Lead Nurturing & Conversion** (6 stories)
- Gestion séquences nurturing (CRUD + étapes JSON)
- Follow-up personnalisé email/WhatsApp (Claude par étape)
- Analyse réponse : sentiment + intent detection (Claude)
- Gestion objections IA (réponse personnalisée sur même canal)
- Escalation humaine (résumé Claude, Slack + email)
- Tracking conversion + attribution multi-touch linéaire

### Phase 3 — Amplification Engine

**Epic 8 : Advertising Campaign Management** (7 stories)
- Recherche concurrentielle (Facebook Ad Library + Claude analyse)
- Propositions campagne IA (budget, targeting, KPIs, créatives DALL-E)
- Gate d'approbation campagne (réutilisation système approval)
- Lancement Facebook Ads (mock avec IDs plateforme)
- Lancement TikTok Ads (mock avec IDs plateforme)
- Collecte métriques pub + détection anomalies
- Optimisation IA (Claude analyse + règles automatiques + AiLearningLog)

**Epic 9 : Analytics, Reports & Internationalization** (5 stories)
- KPI streaming SSE (GET /api/analytics/stream, refresh 30s)
- Agrégation quotidienne DailyAnalytics (MKT-402)
- Rapport hebdomadaire IA Claude (email + Slack) (MKT-403)
- Queue approbation enrichie avec preview entité
- Internationalisation FR/EN (next-intl, détection auto locale)

**Epic 10 : Inter-Agent Communication & System Utilities** (8 stories)
- OAuth token refresh automatique (MKT-401, AES-256-GCM)
- Bus messages persistant + Dead Letter Queue (24h, 3 retries)
- Feedback loop Content → Amplification (signal → campagne auto)
- Feedback loop Amplification → Leads (attribution complète)
- Feedback loop Leads → Content (pain points → contenu auto)
- AI Learning Loop (30j analyse, patterns, embeddings OpenAI) (MKT-404)
- Feedback loop Ads → Content (créatives gagnantes → guidelines)
- Monitoring n8n (error logging, health check 3 agents, alertes Slack)

---

## 11. Chiffres du Projet

| Métrique | Valeur |
|---|---|
| Commits Git | 17 |
| Epics | 10/10 (100%) |
| User Stories | 62/62 (100%) |
| Fichiers TypeScript (API) | 52 |
| Lignes code API | 7 737 |
| Fichiers Dashboard | 19 |
| Lignes code Dashboard | 1 142 |
| Fichiers Shared | 18 |
| Lignes code Shared | 732 |
| Modèles Prisma | 31 |
| Lignes Schema | 664 |
| Endpoints API | ~90 |
| Routes | 14 |
| Services | 16 |
| Middleware | 9 |
| Libraries | 11 |
| Templates email | 7 |
| Fichiers i18n | 2 (~100 clés FR + ~100 clés EN) |
| Documentation BMAD | 3 193 lignes |
| **Total lignes de code** | **~10 300** |
| Durée développement | 4 jours (5-8 février 2026) |

---

## 12. Historique Git

```
839041d Epic 10 — Bus inter-agents, OAuth refresh, feedback loops, monitoring
063e915 Epic 9  — SSE KPIs, analytics quotidien, rapports IA, i18n FR/EN
cb7d193 Epic 8  — Campagnes pub, optimisation IA
52205c9 Epic 7  — Nurturing leads, intent detection, attribution
2407aaf Epic 6  — Capture leads, qualification IA, auto-booking
1cb2605 Epic 5  — Métriques contenu, signaux, WebSocket temps réel
bbe850e Epic 4  — Approbation contenu, publication multi-plateforme
92aeb4f Epic 3  — Pipeline création contenu IA (Claude + Whisper + DALL-E)
17e9736 Epic 2  — Gestion marques, comptes sociaux, intégrations
3ac3df5 Story 1.7 — Scaffold dashboard Next.js
a3b4429 Story 1.6 — RBAC + isolation multi-tenant RLS
772ccae Story 1.5 — Flux réinitialisation mot de passe
bdc21ed Story 1.3 — CORS + rate limiter
8845065 Story 1.4 — Auth JWT (register/login/refresh/logout)
62b8a7e Story 1.2 — Infrastructure Docker Compose
7f912c8 Story 1.1 — Initialisation monorepo
9a687cc Commit initial — cahier des charges + setup BMAD
```

---

## 13. Prochaines Étapes

### Déploiement

1. **Prisma Migration** : `npx prisma migrate dev` en staging
2. **Variables d'environnement** : Configurer `.env` (clés API, DB, Redis, Slack...)
3. **Docker** : `docker compose up -d` pour l'infrastructure
4. **n8n Workflows** : Importer les 25 workflows (MKT-1xx à MKT-4xx)

### Qualité

5. **Tests unitaires** : Vitest pour services et middleware
6. **Tests d'intégration** : Supertest pour les endpoints API
7. **CI/CD** : Pipeline GitHub Actions (lint, test, build, deploy)

### Production

8. **Monitoring** : Configurer alerting Slack/email
9. **SSL/TLS** : Certificats Let's Encrypt via Nginx
10. **Backup** : PostgreSQL pg_dump automatisé
11. **Scaling** : PM2 cluster mode ou Kubernetes

---

*Document généré automatiquement — MarketingEngine v1.0.0*
