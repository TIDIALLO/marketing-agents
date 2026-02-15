# MarketingEngine — Résumé de tous les fichiers du projet

> **Généré le** : 2026-02-08
> **Fichiers source** : 134 | **Lignes TypeScript** : 10 789
> **Modèles Prisma** : 31 | **Endpoints API** : ~80 | **Tests** : 76

---

## Table des matières

1. [Racine du projet](#1-racine-du-projet)
2. [Documentation (`docs/`)](#2-documentation)
3. [Infrastructure Docker (`docker/`)](#3-infrastructure-docker)
4. [Package partagé (`packages/shared/`)](#4-package-partagé)
5. [API Express.js (`apps/api/`)](#5-api-expressjs)
   - [Configuration](#51-configuration)
   - [Prisma](#52-prisma)
   - [Entrypoint](#53-entrypoint)
   - [Libs](#54-libs)
   - [Middleware](#55-middleware)
   - [Routes](#56-routes)
   - [Services](#57-services)
   - [Tests](#58-tests)
6. [Dashboard Next.js (`apps/dashboard/`)](#6-dashboard-nextjs)
   - [Configuration](#61-configuration)
   - [Pages](#62-pages)
   - [Composants](#63-composants)
   - [Providers](#64-providers)
   - [i18n et Libs](#65-i18n-et-libs)
7. [BMAD Method](#7-bmad-method)
8. [Statistiques globales](#8-statistiques-globales)

---

## 1. Racine du projet

| Fichier | Description |
|---------|-------------|
| `package.json` | Monorepo root — workspaces (`apps/*`, `packages/*`), Turborepo |
| `package-lock.json` | Lockfile npm |
| `turbo.json` | Config Turborepo (pipelines build, lint, test) |
| `tsconfig.base.json` | Config TypeScript partagée (ES2022, strict, noUncheckedIndexedAccess) |
| `.env.example` | Variables d'environnement exemple |
| `.gitignore` | Exclusions git |
| `README.md` | README du projet |
| `CAHIER_DES_CHARGES.md` | Spécification fonctionnelle complète (~800 lignes) |
| `CAHIER_DES_CHARGES_WORKFLOWS_N8N.md` | Spécification workflows n8n (~760 lignes) |

---

## 2. Documentation

| Fichier | Description |
|---------|-------------|
| `docs/RESUME-PROJET.md` | Résumé complet du projet en français (~500 lignes) |
| `docs/RESUME-PROJET.pdf` | Version PDF du résumé (107 Ko) |
| `docs/RESUME-FICHIERS.md` | Ce fichier — inventaire de tous les fichiers du projet |

---

## 3. Infrastructure Docker

| Fichier | Description |
|---------|-------------|
| `docker/docker-compose.yml` | Stack production : PostgreSQL 16, Redis 7, n8n, MinIO, Nginx — préfixe `mkt-*` |
| `docker/docker-compose.dev.yml` | Override développement (ports exposés, volumes hot-reload) |
| `docker/.env` | Variables Docker |
| `docker/.env.example` | Variables Docker exemple |
| `docker/nginx/nginx.conf` | Reverse proxy (API :4000, Dashboard :3000, n8n :5678, MinIO :9001) |
| `docker/postgres/init-rls.sql` | Script SQL activation Row-Level Security multi-tenant |

---

## 4. Package partagé

**`packages/shared/`** — Types et constantes partagés entre API et Dashboard.

| Fichier | Description |
|---------|-------------|
| `package.json` | Package `@mktengine/shared` |
| `tsconfig.json` | Config TS (ESNext) |
| **`src/index.ts`** | Barrel export principal |

### Types (`src/types/`)

| Fichier | Description |
|---------|-------------|
| `index.ts` | Re-export de tous les types |
| `api.ts` | `ApiResponse<T>`, `ApiError`, `ErrorCode` (11 codes), `Pagination`, `PaginationParams` |
| `auth.ts` | `Role`, `JwtPayload`, `User`, `LoginRequest`, `RegisterRequest`, `AuthTokens` |
| `brands.ts` | Types marques et produits |
| `content.ts` | Types contenus (`ContentPiece`, `ContentInput`, piliers) |
| `organizations.ts` | Types organisations et invitations |
| `leads.ts` | Types leads, scoring, séquences |
| `ads.ts` | Types campagnes pub, creatives, métriques |
| `analytics.ts` | Types analytics et KPI |
| `events.ts` | Types événements WebSocket/Redis |

### Constantes (`src/constants/`)

| Fichier | Description |
|---------|-------------|
| `index.ts` | Barrel export constantes |
| `roles.ts` | `ROLES` (4 rôles), `ROLE_HIERARCHY`, `PERMISSIONS` (19 permissions RBAC) |
| `errors.ts` | Messages d'erreur standardisés en français |
| `platforms.ts` | Plateformes supportées (LinkedIn, Facebook, Instagram, Twitter, TikTok) |

### Utilitaires (`src/utils/`)

| Fichier | Description |
|---------|-------------|
| `index.ts` | Barrel export utils |
| `formatDate.ts` | Formatage dates FR |
| `validateEmail.ts` | Validation email par regex |

### Tests (`src/__tests__/`)

| Fichier | Tests | Description |
|---------|-------|-------------|
| `roles.test.ts` | 8 | ROLES, ROLE_HIERARCHY, PERMISSIONS (19 permissions) |

---

## 5. API Express.js

**`apps/api/`** — Backend REST API.

### 5.1 Configuration

| Fichier | Description |
|---------|-------------|
| `package.json` | `@mktengine/api` — Express 4, Prisma 6, Vitest 3, Zod, ioredis, Socket.io, bcrypt, jsonwebtoken |
| `tsconfig.json` | Config TS (CommonJS, node moduleResolution) |
| `vitest.config.ts` | Config Vitest (environnement node, alias `@mktengine/shared`) |
| `.env` | Variables d'environnement API |

### 5.2 Prisma

| Fichier | Description |
|---------|-------------|
| `prisma/schema.prisma` | **31 modèles** de base de données (voir liste ci-dessous) |
| `prisma/rls-activate.sql` | Script SQL activation RLS par table |

**Modèles Prisma (31)** :

| Modèle | Description |
|--------|-------------|
| `Tenant` | Locataire SaaS (isolation multi-tenant) |
| `PlatformUser` | Utilisateur plateforme (auth, rôle, tenant) |
| `PasswordResetToken` | Token réinitialisation mot de passe (SHA-256) |
| `Organization` | Organisation client |
| `OrganizationUser` | Relation utilisateur ↔ organisation |
| `UserInvitation` | Invitation par email |
| `Brand` | Marque gérée |
| `Product` | Produit d'une marque |
| `SocialAccount` | Compte réseau social connecté (OAuth) |
| `AdAccount` | Compte publicitaire (Facebook Ads, TikTok Ads) |
| `ContentPillar` | Pilier de contenu éditorial |
| `ContentInput` | Entrée contenu (texte, audio, URL) |
| `ContentPiece` | Contenu généré par l'IA |
| `ApprovalQueue` | File d'approbation (contenu ou campagne) |
| `ContentSchedule` | Planification publication |
| `ContentMetrics` | Métriques de performance contenu |
| `ContentSignal` | Signal de contenu gagnant |
| `Lead` | Lead capturé (multi-source) |
| `CalendarBooking` | Rendez-vous auto-booking |
| `LeadSequence` | Séquence de nurturing |
| `LeadSequenceEnrollment` | Inscription lead dans une séquence |
| `LeadInteraction` | Interaction avec un lead |
| `CompetitorAd` | Publicité concurrente détectée |
| `AdCampaign` | Campagne publicitaire |
| `AdSet` | Ensemble de publicités |
| `AdCreative` | Creative publicitaire |
| `AdMetrics` | Métriques pub (impressions, clics, ROAS) |
| `AiLearningLog` | Journal d'apprentissage IA (+ embeddings) |
| `DailyAnalytics` | Agrégation métriques quotidiennes |
| `AgentMessage` | Message inter-agents (bus persistant + DLQ) |
| `WorkflowError` | Erreur workflow n8n |

### 5.3 Entrypoint

| Fichier | Description |
|---------|-------------|
| `src/index.ts` | Démarrage serveur HTTP + Socket.io (port 4000) |
| `src/app.ts` | App Express — middleware stack complet, montage de toutes les routes |

**Ordre du middleware stack** : Helmet → CORS → Cookie Parser → Body Parser → Correlation ID → Health Check → Rate Limiter → Routes publiques (auth, webhooks) → Routes protégées (authMiddleware + tenantMiddleware) → 404 → Error Handler

### 5.4 Libs

| Fichier | Description |
|---------|-------------|
| `src/lib/prisma.ts` | Singleton PrismaClient (cache global en dev) |
| `src/lib/jwt.ts` | `generateAccessToken`, `generateRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`, `setRefreshCookie`, `clearRefreshCookie` |
| `src/lib/errors.ts` | Classe `AppError(statusCode, code, message, details?)` |
| `src/lib/redis.ts` | Singleton ioredis + `publishEvent(channel, data)` avec fallback dev |
| `src/lib/socket.ts` | Socket.io — rooms par tenant, `emitToTenant(tenantId, event, data)` |
| `src/lib/email.ts` | Abstraction Resend — 7 fonctions : `sendPasswordResetEmail`, `sendInvitationEmail`, `sendApprovalEmail`, `sendApprovalReminderEmail`, `sendNurturingEmail`, `sendEscalationEmail`, `sendWeeklyReportEmail`, `sendLeadProposalEmail` |
| `src/lib/slack.ts` | `sendSlackNotification(payload)` — webhook Slack avec fallback console dev |
| `src/lib/ai.ts` | Claude (analyse/génération texte), OpenAI Whisper (transcription audio), DALL-E (génération visuels), embeddings text-embedding-3-small |
| `src/lib/n8n.ts` | `triggerN8nWebhook(workflowId, data)` — déclenchement workflows n8n |
| `src/lib/minio.ts` | Client MinIO — upload, download, URLs pré-signées |
| `src/lib/encryption.ts` | AES-256-GCM encrypt/decrypt pour tokens OAuth et credentials |

### 5.5 Middleware

| Fichier | Description |
|---------|-------------|
| `src/middleware/auth.ts` | `authMiddleware` — vérifie header `Bearer` JWT, peuple `req.user` |
| `src/middleware/tenant.ts` | `tenantMiddleware` — extrait `tenantId` du JWT pour isolation multi-tenant |
| `src/middleware/requireRole.ts` | `requireRole(...roles)` + `requirePermission(permission)` — contrôle RBAC |
| `src/middleware/validate.ts` | `validate(zodSchema)` — validation Zod avec détails par champ |
| `src/middleware/errorHandler.ts` | `globalErrorHandler` — AppError → code HTTP, CORS → 403, générique → 500, log JSON structuré |
| `src/middleware/asyncHandler.ts` | `asyncHandler<P>()` — wrapper async/await avec `.catch(next)`, générique pour params routes |
| `src/middleware/rateLimiter.ts` | Rate limiter Express (100 requêtes / 15 min) |
| `src/middleware/correlationId.ts` | Injection UUID `req.correlationId` pour traçabilité des requêtes |
| `src/middleware/apiKeyAuth.ts` | Vérification header `X-API-Key` pour webhooks n8n (passthrough en dev) |

### 5.6 Routes

~80 endpoints répartis en 13 fichiers.

| Fichier | Préfixe | Endpoints principaux |
|---------|---------|----------------------|
| `src/routes/auth.ts` | `/api/auth` | POST register, login, refresh, logout, forgot-password, reset-password |
| `src/routes/organizations.ts` | `/api/organizations` | CRUD organisations, invitations, gestion membres |
| `src/routes/brands.ts` | `/api/brands` | CRUD marques + produits, piliers de contenu |
| `src/routes/social-accounts.ts` | `/api/social-accounts` | OAuth connect/disconnect, refresh status |
| `src/routes/settings.ts` | `/api/settings` | Préférences notifications, white-label branding |
| `src/routes/content.ts` | `/api/content` | Inputs, pipeline IA, CRUD contenus, publication |
| `src/routes/approval.ts` | `/api/approval` | Queue, approve/reject (tokens email+Slack), rappels automatiques |
| `src/routes/analytics.ts` | `/api/analytics` | SSE stream KPIs, dashboard, tendances, signaux, agrégation quotidienne, rapport hebdo |
| `src/routes/leads.ts` | `/api/leads` | Ingestion multi-source, déduplication, scoring IA, auto-booking, briefing, funnel |
| `src/routes/nurturing.ts` | `/api/leads/nurturing` | Séquences, follow-ups email/WhatsApp, intention, objections, escalation, conversion |
| `src/routes/advertising.ts` | `/api/advertising` | Veille concurrentielle, campagnes IA, approbation, lancement Facebook/TikTok, optimisation |
| `src/routes/system.ts` | `/api/system` | Health, OAuth refresh, bus messages, DLQ, feedback loops, erreurs (12 endpoints) |
| `src/routes/webhooks.ts` | `/api/webhooks` | Callbacks n8n (content, metrics, leads, ad-lead, error) — protégés par API key |

### 5.7 Services

16 fichiers de logique métier.

| Fichier | Description |
|---------|-------------|
| `src/services/auth.service.ts` | Register (création tenant + user), login, refresh (rotation token), logout, forgotPassword (no email enumeration), resetPassword |
| `src/services/organization.service.ts` | CRUD organisations, invitations par email avec expiration 7j, gestion membres et rôles |
| `src/services/brand.service.ts` | CRUD marques + produits, piliers de contenu éditorial |
| `src/services/social-account.service.ts` | Connexion OAuth réseaux sociaux, stockage tokens chiffrés AES-256-GCM |
| `src/services/content.service.ts` | Pipeline contenu IA complet : input → recherche → génération Claude → visuels DALL-E → MinIO |
| `src/services/approval.service.ts` | Circuit d'approbation Slack + Email avec tokens d'action SHA-256, relances automatiques |
| `src/services/publishing.service.ts` | Adaptation multi-plateforme (LinkedIn/Facebook/Instagram/Twitter/TikTok), publication automatisée, calendrier éditorial |
| `src/services/metrics.service.ts` | Collecte métriques 5 plateformes, calcul score engagement, détection signaux contenu gagnant |
| `src/services/analytics.service.ts` | Dashboard KPI, tendances temporelles, analyse performance globale |
| `src/services/reporting.service.ts` | SSE streaming KPIs (30s refresh), agrégation quotidienne DailyAnalytics, rapport hebdo Claude + email/Slack, queue approbation enrichie |
| `src/services/lead.service.ts` | Capture leads multi-source, déduplication/fusion intelligente, scoring IA Claude, auto-booking calendrier, briefing commercial IA |
| `src/services/nurturing.service.ts` | Séquences nurturing, follow-up personnalisé email/WhatsApp, détection intention, gestion objections IA, escalation humaine |
| `src/services/advertising.service.ts` | Veille concurrentielle pub, proposition campagne IA Claude, lancement Facebook/TikTok Ads, collecte métriques, optimisation IA |
| `src/services/oauth-refresh.service.ts` | Refresh tokens OAuth AES-256-GCM, scan comptes expirants (<24h), notification Slack en cas d'échec |
| `src/services/agent-bus.service.ts` | Bus messages persistant DB + Redis pub/sub, consommation, DLQ (expiration 24h, 3 retries max, alertes Slack par niveau) |
| `src/services/feedback-loop.service.ts` | 5 boucles feedback inter-agents : contenu→pub (`amplifyWinningContent`), pub→leads (`ingestAdLead`), leads→contenu (`analyzeConversionPatterns`), learning loop IA (`runLearningLoop` + embeddings), pub→contenu (`extractAdCreativeInsights`) |
| `src/services/monitoring.service.ts` | Health check 3 agents (Flywheel <24h, Amplification <48h, Hunter <1h), logging erreurs workflows n8n, alertes Slack |

### 5.8 Tests

13 fichiers, 76 tests unitaires Vitest.

| Fichier | Tests | Couverture |
|---------|-------|------------|
| `src/lib/__tests__/errors.test.ts` | 4 | Classe AppError (statusCode, code, message, details, stack) |
| `src/lib/__tests__/jwt.test.ts` | 7 | Access/Refresh tokens, tampering, cross-verification |
| `src/lib/__tests__/slack.test.ts` | 3 | Mode dev, webhook fetch, gestion erreur réseau |
| `src/middleware/__tests__/auth.test.ts` | 4 | Pas de header, mauvais préfixe, token invalide, token valide |
| `src/middleware/__tests__/requireRole.test.ts` | 8 | Vérification rôles + permissions RBAC (owner, admin, editor, viewer) |
| `src/middleware/__tests__/validate.test.ts` | 5 | Zod : données valides, email invalide, mot de passe court, champs manquants, strict |
| `src/middleware/__tests__/errorHandler.test.ts` | 5 | AppError, CORS 403, erreur générique 500, correlationId |
| `src/middleware/__tests__/asyncHandler.test.ts` | 3 | Appel fonction, rejet → next(err), résolution sans next |
| `src/middleware/__tests__/apiKeyAuth.test.ts` | 4 | Passthrough dev, clé manquante, mauvaise clé, bonne clé |
| `src/services/__tests__/auth.service.test.ts` | 11 | Login (email inconnu, mauvais mot de passe, succès), refresh, logout, forgotPassword (no enumeration), resetPassword (invalide, expiré, utilisé, succès) |
| `src/services/__tests__/agent-bus.service.test.ts` | 8 | Publish persistent, consume, DLQ (retry + vide), stats (ok, warning, critical) |
| `src/services/__tests__/monitoring.service.test.ts` | 6 | logWorkflowError + Slack, health (degraded, healthy, critical messages), listErrors |

---

## 6. Dashboard Next.js

**`apps/dashboard/`** — Interface utilisateur.

### 6.1 Configuration

| Fichier | Description |
|---------|-------------|
| `package.json` | Next.js 16, React 19, Tailwind CSS 4, lucide-react, next-intl, clsx, tailwind-merge |
| `tsconfig.json` | Config TS (paths `@/*` → `src/*`) |
| `next.config.ts` | Configuration Next.js |
| `postcss.config.mjs` | PostCSS + Tailwind |
| `next-env.d.ts` | Types Next.js générés automatiquement |

### 6.2 Pages

| Fichier | Route | Description |
|---------|-------|-------------|
| `src/app/layout.tsx` | `/` | Layout racine — `AuthProvider` + `IntlProvider` + `ThemeProvider`, polices Inter |
| `src/app/globals.css` | — | Styles globaux Tailwind + variables CSS thème (clair/sombre) |
| `src/app/(auth)/layout.tsx` | `/login`, `/register` | Layout auth (centré, carte blanche, logo) |
| `src/app/(auth)/login/page.tsx` | `/login` | Page connexion (email + mot de passe + lien inscription) |
| `src/app/(auth)/register/page.tsx` | `/register` | Page inscription (prénom, nom, email, mot de passe) |
| `src/app/(dashboard)/layout.tsx` | `/` | Layout dashboard (Sidebar + Header + zone main) — i18n |
| `src/app/(dashboard)/page.tsx` | `/` | Page d'accueil — 4 cartes KPI, statut 3 agents IA — i18n |

### 6.3 Composants

| Fichier | Description |
|---------|-------------|
| `src/components/layout/Header.tsx` | Header — titre page, bouton toggle langue (Globe FR/EN), menu utilisateur |
| `src/components/layout/Sidebar.tsx` | Sidebar navigation — items traduits via `useTranslations('nav')` |
| `src/components/ui/button.tsx` | Composant Button (variants : default, outline, ghost, destructive ; tailles : default, sm, lg, icon) |
| `src/components/ui/card.tsx` | Composants `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `src/components/ui/input.tsx` | Composant Input avec forwarded ref |
| `src/components/ui/label.tsx` | Composant Label |

### 6.4 Providers

| Fichier | Description |
|---------|-------------|
| `src/providers/AuthProvider.tsx` | Context auth — `login()`, `register()`, `logout()`, refresh token automatique, redirection |
| `src/providers/IntlProvider.tsx` | `NextIntlClientProvider` — détection locale (localStorage > navigator.language > fr), hook `useLocale` |
| `src/providers/ThemeProvider.tsx` | Provider thème sombre/clair |

### 6.5 i18n et Libs

| Fichier | Description |
|---------|-------------|
| `src/i18n/config.ts` | Config locales (`fr`, `en`), `defaultLocale: 'fr'`, `getMessages(locale)` |
| `src/lib/api.ts` | Client API fetch — intercepteur Authorization Bearer, refresh token auto sur 401 |
| `src/lib/utils.ts` | Helper `cn()` (clsx + tailwind-merge) |
| `messages/fr.json` | Traductions françaises (~100 clés : common, nav, header, dashboard, agents, auth) |
| `messages/en.json` | Traductions anglaises (~100 clés) |

---

## 7. BMAD Method

### `_bmad/` — Framework (215 fichiers, 2.1 Mo)

Framework BMAD v6.0.0-Beta.7 : agents, personas, templates, checklists, guides.
Utilisé pour piloter le développement du projet de l'analyse à l'implémentation.

### `_bmad-output/` — Artefacts générés

| Artefact | Description |
|----------|-------------|
| Product Brief | Vision produit, personas, proposition de valeur |
| PRD | 58 exigences fonctionnelles, 25 non-fonctionnelles |
| Architecture | 35+ décisions, 10 patterns, diagrammes |
| Epics & Stories | 10 epics, 62 stories avec critères d'acceptation |
| Sprint Status | Suivi YAML — 62/62 stories = 100% complété |

---

## 8. Statistiques globales

| Métrique | Valeur |
|----------|--------|
| **Fichiers source** | 134 |
| **Lignes TypeScript** | 10 789 |
| **Modèles Prisma** | 31 |
| **Endpoints API** | ~80 |
| **Routes (fichiers)** | 13 |
| **Services** | 16 |
| **Middleware** | 9 |
| **Libs** | 11 |
| **Composants UI** | 6 |
| **Pages** | 5 |
| **Providers** | 3 |
| **Tests unitaires** | 76 (13 fichiers) |
| **Locales i18n** | 2 (FR / EN) |
| **Commits git** | 18 |
| **Epics BMAD** | 10 (62 stories, 100% complétés) |
