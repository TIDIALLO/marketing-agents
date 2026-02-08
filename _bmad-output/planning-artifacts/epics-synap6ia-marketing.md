---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - prd-synap6ia-marketing.md
  - architecture-synap6ia-marketing.md
  - product-brief-synap6ia-marketing-2026-02-07.md
  - CAHIER_DES_CHARGES.md
  - CAHIER_DES_CHARGES_WORKFLOWS_N8N.md
workflowType: epics-stories
project_name: Synap6ia Marketing
date: 2026-02-08
agent: pm (John)
status: complete
totalEpics: 10
totalStories: 62
---

# Synap6ia Marketing — Epic Breakdown

## Overview

Découpage complet du projet Synap6ia Marketing en 10 epics orientées valeur utilisateur et 62 stories avec acceptance criteria BDD. Chaque epic est autonome et délivre de la valeur indépendamment. Les stories sont ordonnées sans dépendances forward — chaque story ne dépend que des stories précédentes.

---

## Requirements Inventory

### Functional Requirements (58)

| Groupe | IDs | Count |
|--------|-----|-------|
| Core Platform | FR-C01..C10 | 10 |
| Agent 1 — Content Flywheel | FR-A1-01..A1-15 | 15 |
| Agent 2 — Amplification Engine | FR-A2-01..A2-09 | 9 |
| Agent 3 — Opportunity Hunter | FR-A3-01..A3-12 | 12 |
| Dashboard & Analytics | FR-D01..D07 | 7 |
| Système & Utilitaires | FR-S01..S05 | 5 |

### Non-Functional Requirements (25)

| Groupe | IDs | Count |
|--------|-----|-------|
| Performance | NFR-P01..P05 | 5 |
| Security | NFR-S01..S08 | 8 |
| Scalability | NFR-SC01..SC04 | 4 |
| Reliability | NFR-R01..R05 | 5 |
| Compliance | NFR-CO01..CO03 | 3 |

### Additional Requirements (Architecture)

- AR-01 : Monorepo Turborepo (apps/api + apps/dashboard + packages/shared)
- AR-02 : Docker Compose 3.8 avec health checks et préfixe mkt-*
- AR-03 : Express middleware stack ordre strict (Helmet → CORS → Rate Limit → Cookie → Body → Correlation → Routes → Error)
- AR-04 : Prisma pattern (PascalCase models, cuid IDs, @@map snake_case)
- AR-05 : API response format uniforme ({ success, data/error })

---

## FR Coverage Map

| FR | Epic | Story |
|----|------|-------|
| FR-C01 | Epic 1 | 1.4, 1.5 |
| FR-C02 | Epic 1 | 1.6 |
| FR-C03 | Epic 2 | 2.1 |
| FR-C04 | Epic 2 | 2.3 |
| FR-C05 | Epic 2 | 2.4 |
| FR-C06 | Epic 2 | 2.2 |
| FR-C07 | Epic 1 | 1.3, 1.6 |
| FR-C08 | Epic 2 | 2.5 |
| FR-C09 | Epic 2 | 2.6 |
| FR-C10 | Epic 1 | 1.6 |
| FR-A1-01 | Epic 3 | 3.1, 3.2 |
| FR-A1-02 | Epic 3 | 3.2, 3.3 |
| FR-A1-03 | Epic 3 | 3.3 |
| FR-A1-04 | Epic 3 | 3.4 |
| FR-A1-05 | Epic 3 | 3.5 |
| FR-A1-06 | Epic 3 | 3.5 |
| FR-A1-07 | Epic 4 | 4.1 |
| FR-A1-08 | Epic 4 | 4.1, 4.2 |
| FR-A1-09 | Epic 4 | 4.3 |
| FR-A1-10 | Epic 4 | 4.4 |
| FR-A1-11 | Epic 4 | 4.5 |
| FR-A1-12 | Epic 5 | 5.1, 5.2 |
| FR-A1-13 | Epic 5 | 5.3 |
| FR-A1-14 | Epic 5 | 5.4 |
| FR-A1-15 | Epic 4 | 4.6 |
| FR-A2-01 | Epic 8 | 8.1 |
| FR-A2-02 | Epic 8 | 8.2 |
| FR-A2-03 | Epic 8 | 8.2 |
| FR-A2-04 | Epic 8 | 8.3 |
| FR-A2-05 | Epic 8 | 8.4, 8.5 |
| FR-A2-06 | Epic 8 | 8.6 |
| FR-A2-07 | Epic 8 | 8.7 |
| FR-A2-08 | Epic 8 | 8.7 |
| FR-A2-09 | Epic 5 | 5.5 |
| FR-A3-01 | Epic 6 | 6.1 |
| FR-A3-02 | Epic 6 | 6.2 |
| FR-A3-03 | Epic 6 | 6.3 |
| FR-A3-04 | Epic 6 | 6.4 |
| FR-A3-05 | Epic 7 | 7.1 |
| FR-A3-06 | Epic 7 | 7.2 |
| FR-A3-07 | Epic 7 | 7.2, 7.3 |
| FR-A3-08 | Epic 7 | 7.4 |
| FR-A3-09 | Epic 6 | 6.5 |
| FR-A3-10 | Epic 7 | 7.5 |
| FR-A3-11 | Epic 7 | 7.6 |
| FR-A3-12 | Epic 6 | 6.6 |
| FR-D01 | Epic 5 | 5.6 |
| FR-D02 | Epic 9 | 9.1 |
| FR-D03 | Epic 5 | 5.5 |
| FR-D04 | Epic 9 | 9.2 |
| FR-D05 | Epic 9 | 9.3 |
| FR-D06 | Epic 9 | 9.4 |
| FR-D07 | Epic 9 | 9.5 |
| FR-S01 | Epic 10 | 10.1 |
| FR-S02 | Epic 10 | 10.5 |
| FR-S03 | Epic 10 | 10.2 |
| FR-S04 | Epic 10 | 10.2 |
| FR-S05 | Epic 10 | 10.1 |

**Couverture : 58/58 FRs (100%)**

---

## Epic List

| Epic | Titre | FRs | Stories | Phase |
|------|-------|-----|---------|-------|
| 1 | Project Foundation & User Authentication | FR-C01, C02, C07, C10 + AR-01..05 | 7 | Phase 0 |
| 2 | Brand Management & Integrations | FR-C03..C06, C08, C09 | 6 | Phase 0 |
| 3 | Content Creation AI Pipeline | FR-A1-01..A1-06 | 5 | Phase 1 |
| 4 | Content Approval & Multi-Platform Publishing | FR-A1-07..A1-11, A1-15 | 6 | Phase 1 |
| 5 | Content Performance & Dashboard | FR-A1-12..A1-14, FR-A2-09, FR-D01, D03 | 6 | Phase 1 |
| 6 | Lead Capture & AI Qualification | FR-A3-01..A3-04, A3-09, A3-12 | 6 | Phase 2 |
| 7 | Lead Nurturing & Conversion | FR-A3-05..A3-08, A3-10, A3-11 | 6 | Phase 2 |
| 8 | Advertising Campaign Management | FR-A2-01..A2-08 | 7 | Phase 3 |
| 9 | Analytics, Reports & Internationalization | FR-D02, D04..D07, FR-S02 | 5 | Phase 1-3 |
| 10 | Inter-Agent Communication & System Utilities | FR-S01, S03..S05 | 8 | Phase 3 |

---

## Epic 1: Project Foundation & User Authentication

**Goal** : Les utilisateurs peuvent créer un compte, se connecter et gérer leur organisation sur une infrastructure multi-tenant sécurisée.

**FRs** : FR-C01, FR-C02, FR-C07, FR-C10 + AR-01..AR-05
**NFRs** : NFR-S01..S08, NFR-SC01, NFR-R02, NFR-R05

### Story 1.1: Initialize Monorepo Project Structure

As a developer,
I want a monorepo correctly structuré avec Turborepo,
So that all apps and packages share consistent tooling and types.

**Acceptance Criteria:**

**Given** un nouveau checkout du repository
**When** `npm install` est exécuté à la racine
**Then** Turborepo installe les dépendances de `apps/api`, `apps/dashboard`, et `packages/shared`
**And** `tsconfig.base.json` est hérité par tous les packages
**And** le package `@synap6ia/shared` exporte les types depuis `src/types/` et `src/constants/`

### Story 1.2: Set Up Docker Compose Infrastructure

As a developer,
I want une stack Docker Compose fonctionnelle,
So that all services (PostgreSQL, Redis, MinIO, Nginx) démarrent avec health checks.

**Acceptance Criteria:**

**Given** le fichier `docker/docker-compose.yml` est configuré
**When** `docker compose up -d` est exécuté
**Then** les services `mkt-postgres`, `mkt-redis`, `mkt-minio`, `mkt-nginx` démarrent
**And** chaque service passe son health check dans les 60 secondes
**And** tous les services communiquent sur le réseau `mkt-network`
**And** les volumes persistants sont créés (`mkt-postgres-data`, `mkt-redis-data`, `mkt-minio-data`)

### Story 1.3: Express API Scaffold with Middleware Stack

As a developer,
I want un serveur Express.js configuré avec le middleware stack complet,
So that all future routes bénéficient de security headers, CORS, rate limiting, et error handling.

**Acceptance Criteria:**

**Given** l'application Express est créée dans `apps/api/src/app.ts`
**When** une requête HTTP est envoyée à `/health`
**Then** le serveur répond `200 { success: true, data: { status: "ok" } }`
**And** les headers Helmet sont présents (X-Content-Type-Options, Strict-Transport-Security, etc.)
**And** les requêtes CORS non autorisées sont rejetées avec `403`
**And** le rate limiter est actif (10 req/15min sur `/api/auth`, 100 req/15min sur `/api`)
**And** les erreurs non gérées retournent `{ success: false, error: { code: "INTERNAL_ERROR", message } }`
**And** chaque requête a un header `X-Correlation-Id` unique

### Story 1.4: User Registration & Login with JWT

As a new user,
I want m'inscrire avec email et mot de passe et recevoir un JWT,
So that I can access the platform securely.

**Acceptance Criteria:**

**Given** les tables Prisma `Tenant` et `PlatformUser` sont créées avec ce story
**When** `POST /api/auth/register` avec `{ email, password, firstName, lastName }`
**Then** un `Tenant` est créé automatiquement, un `PlatformUser` avec role `owner` est créé
**And** le mot de passe est hashé avec bcrypt (cost 12)
**And** un access token JWT (15min) est retourné dans le body
**And** un refresh token JWT (7j) est placé dans un cookie HttpOnly Secure
**And** `POST /api/auth/login` avec credentials valides retourne les mêmes tokens
**And** `POST /api/auth/refresh` avec le cookie refresh retourne un nouvel access token
**And** `POST /api/auth/logout` invalide le refresh token

### Story 1.5: Password Reset Flow

As a user who forgot their password,
I want réinitialiser mon mot de passe via email,
So that I can regain access to my account.

**Acceptance Criteria:**

**Given** un utilisateur existant
**When** `POST /api/auth/forgot-password` avec `{ email }`
**Then** un token de réinitialisation est envoyé par email (Resend ou console en dev)
**And** `POST /api/auth/reset-password` avec `{ token, newPassword }` met à jour le mot de passe
**And** les tokens de réinitialisation expirent après 1h
**And** un token utilisé ne peut pas être réutilisé

### Story 1.6: RBAC Middleware & Multi-Tenant Isolation

As a platform owner,
I want que chaque requête soit isolée par tenant et que les rôles soient respectés,
So that data is never leaked between tenants and permissions are enforced.

**Acceptance Criteria:**

**Given** un utilisateur authentifié avec un JWT valide
**When** une requête est faite à n'importe quel endpoint `/api/*`
**Then** le middleware `authMiddleware` extrait le user et son `tenantId` du JWT
**And** le middleware `tenantMiddleware` exécute `SET app.current_tenant_id` sur la connexion PostgreSQL
**And** les RLS policies PostgreSQL filtrent toutes les requêtes par `tenant_id`
**And** un `editor` ne peut pas accéder aux endpoints réservés `admin` ou `owner` (retour `403`)
**And** les 4 rôles sont opérationnels : Owner > Admin > Editor > Viewer

### Story 1.7: Next.js Dashboard Scaffold with Authentication

As a user,
I want accéder à un dashboard sécurisé après login,
So that I can start using the platform.

**Acceptance Criteria:**

**Given** l'app Next.js est créée dans `apps/dashboard/`
**When** un utilisateur non authentifié accède à `/`
**Then** il est redirigé vers `/login`
**And** après login réussi, il est redirigé vers le dashboard `/`
**And** le layout inclut Sidebar, Header, et zone de contenu
**And** les providers sont configurés (AuthProvider, ThemeProvider)
**And** TailwindCSS v4 + shadcn/ui sont fonctionnels
**And** le dashboard affiche une page skeleton "Welcome" avec le nom de l'utilisateur

---

## Epic 2: Brand Management & Integrations

**Goal** : Les utilisateurs peuvent créer des marques, connecter des comptes sociaux et configurer leur espace de travail.

**FRs** : FR-C03..FR-C06, FR-C08, FR-C09

### Story 2.1: Organization & User Invitation

As an owner,
I want créer une organisation et inviter des collaborateurs avec des rôles spécifiques,
So that my team can access the platform with appropriate permissions.

**Acceptance Criteria:**

**Given** les tables `Organization` sont créées avec ce story
**When** `POST /api/organizations` avec `{ name, description }`
**Then** une organisation rattachée au tenant est créée
**And** `POST /api/organizations/:id/invite` avec `{ email, role }` envoie une invitation
**And** l'invité peut s'inscrire et est rattaché à l'organisation avec le rôle spécifié
**And** seuls les `owner` et `admin` peuvent inviter des utilisateurs

### Story 2.2: Brand & Product Management

As an admin,
I want créer des marques et des produits rattachés,
So that AI agents can generate content aligned with each brand's identity.

**Acceptance Criteria:**

**Given** les tables `Brand` et `Product` sont créées avec ce story
**When** `POST /api/brands` avec `{ name, brandVoice, targetAudience, contentGuidelines, visualGuidelines }`
**Then** une marque est créée, rattachée à l'organisation et au tenant
**And** les champs JSONB `brandVoice`, `targetAudience`, `contentGuidelines` acceptent du texte libre
**And** CRUD complet sur les produits via `/api/products` (rattachés à une brand)
**And** un editor peut créer/modifier des produits, un viewer ne peut que consulter
**And** les pages dashboard `/brands` et détail brand sont fonctionnelles

### Story 2.3: Social Account OAuth Connection

As an admin,
I want connecter les comptes sociaux de mes marques via OAuth,
So that the platform can publish content and collect metrics.

**Acceptance Criteria:**

**Given** la table `SocialAccount` est créée avec ce story
**When** l'utilisateur clique "Connecter LinkedIn" dans `/settings`
**Then** le flow OAuth 2.0 LinkedIn est lancé, l'access token et refresh token sont stockés
**And** les tokens sont chiffrés en base avec AES-256-GCM
**And** le flow fonctionne pour LinkedIn et Facebook (Instagram via Facebook)
**And** les comptes connectés s'affichent dans le dashboard avec statut (active/expired)
**And** un admin peut déconnecter un compte social

### Story 2.4: Ad Account Connection

As an admin,
I want connecter mes comptes publicitaires (Facebook Ads, TikTok Ads),
So that the platform can create and manage ad campaigns.

**Acceptance Criteria:**

**Given** la table `AdAccount` est créée avec ce story
**When** `POST /api/social-accounts/:id/ad-accounts` avec credentials pub
**Then** le compte publicitaire est lié au compte social de la marque
**And** les credentials sont chiffrés en base (AES-256-GCM)
**And** la page settings affiche les comptes pub connectés avec statut

### Story 2.5: White-Label Branding Configuration

As an owner,
I want configurer le branding white-label de mon tenant (logo, couleurs, domaine),
So that the platform appears as my own brand to my clients.

**Acceptance Criteria:**

**Given** des champs `logo`, `primaryColor`, `secondaryColor`, `customDomain` existent sur le `Tenant`
**When** `PUT /api/admin/tenants/:id/branding` avec les données de branding
**Then** le branding est mis à jour
**And** le dashboard Next.js applique les couleurs et le logo du tenant
**And** seul un `owner` peut modifier le branding

### Story 2.6: User Notification Preferences

As a user,
I want configurer mes préférences de notification (Slack, email, WhatsApp),
So that I receive approvals and alerts on my preferred channel.

**Acceptance Criteria:**

**Given** un champ `notificationPreferences` JSONB existe sur `PlatformUser`
**When** `PUT /api/auth/me/notifications` avec `{ slack: true, email: true, whatsapp: false }`
**Then** les préférences sont sauvegardées
**And** le circuit d'approbation (epics suivants) utilisera ces préférences pour router les notifications
**And** la page settings affiche les toggles de préférence

---

## Epic 3: Content Creation AI Pipeline

**Goal** : Les utilisateurs peuvent soumettre des inputs bruts et obtenir du contenu IA généré automatiquement (texte + visuels).

**FRs** : FR-A1-01..FR-A1-06

### Story 3.1: Content Input Submission

As an editor,
I want soumettre un input brut (texte, URL) via le dashboard ou l'API,
So that the AI can transform it into marketing content.

**Acceptance Criteria:**

**Given** les tables `ContentInput` et `ContentPillar` sont créées avec ce story
**When** `POST /api/content/inputs` avec `{ inputType: "text", rawContent: "..." }`
**Then** l'input est sauvegardé avec `status: "pending"` et le `tenantId` correct
**And** le workflow n8n MKT-101 est déclenché via webhook avec l'input_id
**And** le dashboard `/content` affiche un formulaire de soumission d'input
**And** les types supportés sont `text` et `url` (audio dans story suivante)

### Story 3.2: Audio Input with Whisper Transcription

As an editor,
I want soumettre une note vocale qui sera transcrite automatiquement,
So that I can create content from spoken ideas on the go.

**Acceptance Criteria:**

**Given** le workflow MKT-101 est opérationnel (story 3.1)
**When** `POST /api/content/inputs` avec `{ inputType: "audio" }` et fichier audio multipart
**Then** le fichier est envoyé à OpenAI Whisper pour transcription
**And** Claude génère un résumé et 3 sujets suggérés à partir de la transcription
**And** l'input est mis à jour avec `transcription`, `aiSummary`, `aiSuggestedTopics`
**And** le dashboard affiche la transcription et les sujets suggérés

### Story 3.3: AI Content Research & Strategy

As the Content Flywheel agent,
I want analyser le contexte de la marque et les tendances pour préparer la génération,
So that generated content is relevant and strategic.

**Acceptance Criteria:**

**Given** un content input traité (story 3.1/3.2)
**When** le workflow MKT-102 est déclenché
**Then** Claude analyse l'input dans le contexte de la marque (brand voice, audience, contenus récents)
**And** Claude retourne `{ topic, angle, keyMessages, platforms, formatSuggestions, hashtagSuggestions }`
**And** les suggestions sont sauvegardées sur le content input
**And** le workflow MKT-103 est déclenché automatiquement avec les données de recherche

### Story 3.4: AI Content Generation with Claude

As the Content Flywheel agent,
I want générer du contenu textuel adapté à chaque plateforme,
So that each piece respects platform constraints and brand voice.

**Acceptance Criteria:**

**Given** les données de recherche (story 3.3) et la table `ContentPiece` créée avec ce story
**When** le workflow MKT-103 est déclenché
**Then** Claude génère un contenu respectant les contraintes plateforme (LinkedIn 3000 car, Facebook 500 car, Instagram 2200 car, Twitter 280 car, TikTok script 30-60s)
**And** le contenu inclut `title`, `body`, `hashtags`, `callToAction`
**And** un `ContentPiece` est créé avec `status: "review"`
**And** le contenu est rattaché au bon `tenantId`, `brandId`, et `contentInputId`

### Story 3.5: DALL-E Visual Generation & MinIO Storage

As the Content Flywheel agent,
I want générer des visuels avec DALL-E et les stocker dans MinIO,
So that each content piece has a professional visual aligned with brand guidelines.

**Acceptance Criteria:**

**Given** un contenu textuel généré (story 3.4)
**When** le workflow MKT-103 appelle DALL-E 3
**Then** un visuel est généré (1024×1024 standard, 1024×1792 pour stories)
**And** le visuel est uploadé dans MinIO : `mkt-content-media/{orgId}/originals/{date}_{contentId}.png`
**And** l'URL du média est sauvegardée sur le `ContentPiece`
**And** le workflow déclenche MKT-104 pour l'approbation

---

## Epic 4: Content Approval & Multi-Platform Publishing

**Goal** : Les utilisateurs peuvent approuver le contenu IA et le publier automatiquement sur plusieurs plateformes aux heures optimales.

**FRs** : FR-A1-07..FR-A1-11, FR-A1-15

### Story 4.1: Content Approval Circuit via Slack

As an approver,
I want recevoir une notification Slack avec preview du contenu et pouvoir approuver en un clic,
So that I can validate content quickly without opening the dashboard.

**Acceptance Criteria:**

**Given** la table `ApprovalQueue` est créée avec ce story et un contenu en `status: "review"` existe
**When** le workflow MKT-104 est déclenché
**Then** un enregistrement `ApprovalQueue` est créé avec `entityType: "content_piece"`
**And** une notification Slack est envoyée avec blocks (preview texte, miniature image, boutons Approuver/Modifier/Rejeter)
**And** le callback webhook Slack met à jour `ContentPiece.status` à `approved`/`draft`
**And** si approuvé, le workflow MKT-106 est déclenché

### Story 4.2: Email Approval Notifications

As an approver with email preferences,
I want recevoir les approbations par email avec liens d'action,
So that I can approve content from my inbox.

**Acceptance Criteria:**

**Given** un utilisateur avec `notificationPreferences.email: true`
**When** le workflow MKT-104 est déclenché pour cet utilisateur
**Then** un email HTML est envoyé via Resend avec preview du contenu et liens Approuver/Rejeter
**And** les liens incluent un token d'authentification unique (expiration 72h)
**And** cliquer sur le lien met à jour le statut du contenu sans login supplémentaire

### Story 4.3: Approval Reminder System

As a content manager,
I want que les approbations en attente soient relancées automatiquement,
So that content doesn't get stuck waiting for review.

**Acceptance Criteria:**

**Given** des approbations `status: "pending"` depuis plus de 24h
**When** le scheduler MKT-105 s'exécute (toutes les 6h)
**Then** une relance est envoyée sur le canal préféré de l'approbateur
**And** un compteur de relances est incrémenté sur l'`ApprovalQueue`
**And** les relances s'arrêtent après 3 tentatives (notification admin)

### Story 4.4: Multi-Platform Content Adaptation

As the Content Flywheel agent,
I want adapter un contenu approuvé pour chaque plateforme cible,
So that one input generates optimized content for all connected social accounts.

**Acceptance Criteria:**

**Given** un contenu approuvé et les comptes sociaux actifs de la marque
**When** le workflow MKT-106 est déclenché
**Then** la table `ContentSchedule` est créée avec ce story
**And** Claude adapte le contenu aux contraintes de chaque plateforme cible (excluant la plateforme source)
**And** chaque variante est créée comme `ContentPiece` avec `parentId` pointant vers le contenu source
**And** si le format d'image est différent (stories, carousel), DALL-E génère une variante
**And** chaque variante est planifiée dans `ContentSchedule` avec heure optimale par plateforme

### Story 4.5: Automated Social Media Publishing

As the Content Flywheel agent,
I want publier automatiquement les contenus planifiés aux heures prévues,
So that content goes live consistently without manual intervention.

**Acceptance Criteria:**

**Given** des contenus planifiés dans `ContentSchedule` avec `status: "scheduled"` et `scheduledAt <= NOW()`
**When** le scheduler MKT-107 s'exécute (toutes les 15min)
**Then** les contenus sont publiés via les APIs (LinkedIn `ugcPosts`, Facebook `/{pageId}/feed`)
**And** `ContentSchedule.status` passe à `published` avec `publishedAt`
**And** `ContentPiece.platformPostId` est mis à jour avec l'ID retourné par la plateforme
**And** en cas d'erreur : `status: "failed"`, retry max 3 fois (espacement 30min)
**And** au-delà de 3 retries : notification admin

### Story 4.6: Editorial Calendar Dashboard View

As an editor,
I want visualiser et gérer le calendrier éditorial en drag-and-drop,
So that I can plan and reschedule content publications.

**Acceptance Criteria:**

**Given** des contenus planifiés dans `ContentSchedule`
**When** l'utilisateur accède à `/content/calendar`
**Then** un calendrier mensuel/hebdomadaire affiche les publications planifiées par plateforme
**And** le drag-and-drop permet de reprogrammer un contenu (mise à jour `scheduledAt`)
**And** les couleurs distinguent les statuts (scheduled, published, failed)
**And** un clic sur un contenu ouvre un détail avec preview

---

## Epic 5: Content Performance & Dashboard

**Goal** : Les utilisateurs peuvent suivre la performance de leurs contenus, détecter les gagnants, et consulter un dashboard temps réel.

**FRs** : FR-A1-12..FR-A1-14, FR-A2-09, FR-D01, FR-D03

### Story 5.1: Content Metrics Collection — LinkedIn & Facebook

As the Content Flywheel agent,
I want collecter les métriques de chaque contenu publié toutes les 2h,
So that performance data is available for analysis and signal detection.

**Acceptance Criteria:**

**Given** la table `ContentMetrics` est créée avec ce story et des contenus publiés depuis < 30 jours
**When** le scheduler MKT-108 s'exécute
**Then** les métriques LinkedIn (`organizationalEntityShareStatistics`) et Facebook (`/{postId}/insights`) sont collectées
**And** les métriques sont normalisées : impressions, reach, engagements, likes, comments, shares, saves, clicks, videoViews
**And** un enregistrement `ContentMetrics` est créé par collecte par contenu

### Story 5.2: Content Metrics Collection — Instagram, Twitter, TikTok

As the Content Flywheel agent,
I want collecter les métriques Instagram, Twitter et TikTok,
So that all platforms are covered for performance analysis.

**Acceptance Criteria:**

**Given** le collecteur de métriques LinkedIn/Facebook est opérationnel (story 5.1)
**When** des contenus sont publiés sur Instagram, Twitter ou TikTok
**Then** les métriques sont collectées via leurs APIs respectives et normalisées
**And** le même format `ContentMetrics` est utilisé pour toutes les plateformes

### Story 5.3: Engagement Score Calculation

As the Content Flywheel agent,
I want calculer un score d'engagement pondéré pour chaque contenu,
So that content performance can be ranked and compared.

**Acceptance Criteria:**

**Given** des métriques collectées pour un contenu
**When** le workflow MKT-108 termine la collecte
**Then** le `engagementScore` est calculé : likes×1 + comments×3 + shares×5 + saves×4 + clicks×2
**And** le `engagementRate` est calculé : (likes + comments + shares) / impressions × 100
**And** `ContentPiece.engagementScore` est mis à jour

### Story 5.4: Winning Content Signal Detection

As the Content Flywheel agent,
I want détecter automatiquement les contenus qui surperforment,
So that they can be amplified by the Amplification Engine.

**Acceptance Criteria:**

**Given** la table `ContentSignal` est créée avec ce story et des métriques récentes existent
**When** le scheduler MKT-109 s'exécute (toutes les 6h)
**Then** le seuil est calculé : moyenne engagement_rate + 1.5 × écart-type
**And** les contenus au-dessus du seuil sont identifiés comme gagnants
**And** Claude analyse pourquoi chaque contenu surperforme et recommande une stratégie d'amplification
**And** un `ContentSignal` est créé avec `signalType`, `signalStrength`, `aiRecommendation`
**And** un message est publié sur Redis `mkt:agent:1:signals`
**And** une notification Slack alerte des contenus gagnants détectés

### Story 5.5: Content & Ad Performance Dashboard

As a user,
I want consulter les performances contenu et pub sur un dashboard visuel,
So that I can understand what works and make informed decisions.

**Acceptance Criteria:**

**Given** des métriques contenu et pub existent
**When** l'utilisateur accède à `/analytics`
**Then** le dashboard affiche : top posts par engagement, tendances engagement, graphiques ROAS/CPC/CPM (Recharts)
**And** des filtres par date, plateforme, et marque sont disponibles
**And** les sparklines montrent les tendances sur 7/30 jours

### Story 5.6: Real-Time Agent Status via WebSocket

As a user,
I want voir l'état temps réel des 3 agents sur le dashboard,
So that I know what the system is doing at any moment.

**Acceptance Criteria:**

**Given** Socket.io est configuré sur le serveur (`apps/api/src/lib/socket.ts`)
**When** l'utilisateur est connecté au dashboard
**Then** une connexion WebSocket est établie et rejointe au room `tenant:{tenantId}`
**And** les events `content:generated`, `content:published`, `content:signal`, `lead:new`, `lead:qualified`, `campaign:launched` sont reçus en temps réel
**And** les `AgentStatusCard` affichent le dernier event et le statut de chaque agent
**And** les notifications toast apparaissent pour les events importants

---

## Epic 6: Lead Capture & AI Qualification

**Goal** : Les leads sont capturés depuis toutes les sources, dédupliqués, scorés automatiquement par IA, et les leads chauds reçoivent une proposition de rendez-vous.

**FRs** : FR-A3-01..FR-A3-04, FR-A3-09, FR-A3-12

### Story 6.1: Lead Ingestion Multi-Source

As the Opportunity Hunter agent,
I want capturer les leads depuis multiples sources via webhook,
So that no lead is lost regardless of origin.

**Acceptance Criteria:**

**Given** la table `Lead` est créée avec ce story
**When** `POST /api/webhooks/mkt-301` est appelé avec des données lead (formulaire, Facebook Lead Ads, etc.)
**Then** les champs sont normalisés (firstName, lastName, email lowercase, phone sans espaces, company, source, UTM params)
**And** le `gdprConsent` est enregistré
**And** le `tenantId` est rattaché au lead
**And** le workflow MKT-302 est déclenché pour qualification

### Story 6.2: Lead Deduplication & Merge

As the Opportunity Hunter agent,
I want dédupliquer les leads par email ou téléphone,
So that the pipeline stays clean and lead data is enriched.

**Acceptance Criteria:**

**Given** un lead entrant dont l'email ou le téléphone existe déjà
**When** le workflow MKT-301 détecte un doublon
**Then** les nouvelles données sont fusionnées avec le lead existant (pas de perte d'information)
**And** la `source` est mise à jour si plus qualitative
**And** un nouveau lead unique est créé seulement si aucun doublon n'est trouvé

### Story 6.3: AI Lead Scoring & Qualification

As the Opportunity Hunter agent,
I want scorer chaque lead avec Claude (0-100) et déterminer sa température,
So that hot leads are fast-tracked and cold leads enter long-term nurturing.

**Acceptance Criteria:**

**Given** un lead à qualifier
**When** le workflow MKT-302 est déclenché
**Then** Claude score le lead selon : complétude profil, qualité source, budget, taille entreprise, pain points, urgence
**And** la température est déterminée : hot ≥ 70, warm ≥ 40, cold < 40
**And** `Lead.score` et `Lead.temperature` sont mis à jour
**And** un lead `hot` déclenche MKT-305 (booking)
**And** un lead `warm` est enrolé dans une séquence de nurturing
**And** un message Redis `mkt:agent:3:new_lead` est publié pour le dashboard temps réel

### Story 6.4: Hot Lead Auto-Booking

As a hot lead,
I want recevoir automatiquement une proposition de créneau d'appel,
So that I can quickly speak with a sales representative.

**Acceptance Criteria:**

**Given** la table `CalendarBooking` est créée avec ce story et un lead scoré `hot`
**When** le workflow MKT-305 est déclenché
**Then** 3 créneaux disponibles sont récupérés via Cal.com API
**And** Claude génère un message de proposition personnalisé
**And** le message est envoyé par email ou WhatsApp selon les données du lead
**And** un `CalendarBooking` est créé avec `status: "pending"`

### Story 6.5: AI Sales Briefing Generation

As a sales representative (Fatou),
I want recevoir un briefing IA complet avant chaque appel,
So that I have full context without manual preparation.

**Acceptance Criteria:**

**Given** un lead avec un appel booké
**When** Claude génère le briefing
**Then** le briefing inclut : score, température, pain points, historique interactions, produit suggéré, objections soulevées
**And** le briefing est stocké dans `CalendarBooking.aiBriefing`
**And** le commercial reçoit une notification Slack avec résumé et lien dashboard

### Story 6.6: Lead Pipeline Funnel Dashboard

As a user,
I want consulter le pipeline leads en vue entonnoir interactif,
So that I can see the conversion funnel at a glance.

**Acceptance Criteria:**

**Given** des leads à différentes températures et statuts existent
**When** l'utilisateur accède à `/leads`
**Then** un entonnoir interactif affiche les leads par température (hot → warm → cold)
**And** des filtres par source, date, et statut sont disponibles
**And** un clic sur un lead ouvre son détail (timeline interactions, score, briefing)
**And** la vue se met à jour en temps réel via WebSocket

---

## Epic 7: Lead Nurturing & Conversion

**Goal** : Les leads warm reçoivent des séquences de nurturing personnalisées multi-canal, les réponses sont analysées, et les conversions sont trackées.

**FRs** : FR-A3-05..FR-A3-08, FR-A3-10, FR-A3-11

### Story 7.1: Lead Sequence Management

As a marketing manager,
I want créer et gérer des séquences de nurturing (email + WhatsApp),
So that leads are automatically nurtured based on their profile.

**Acceptance Criteria:**

**Given** les tables `LeadSequence` et `LeadSequenceEnrollment` sont créées avec ce story
**When** `POST /api/leads/sequences` avec `{ name, steps: [{ channel, delay, bodyPrompt }] }`
**Then** une séquence est créée avec ses étapes
**And** CRUD complet est disponible sur les séquences
**And** un lead peut être enrolé dans une séquence via `POST /api/leads/:id/enroll`
**And** `LeadSequenceEnrollment` est créé avec `status: "active"`, `currentStep: 0`, `nextActionAt`

### Story 7.2: Personalized Email & WhatsApp Follow-Up

As the Opportunity Hunter agent,
I want envoyer des follow-ups personnalisés par email et WhatsApp,
So that each lead receives relevant, personalized communication.

**Acceptance Criteria:**

**Given** la table `LeadInteraction` est créée avec ce story et des enrollments actifs avec `nextActionAt <= NOW()`
**When** le scheduler MKT-303 s'exécute (toutes les heures)
**Then** Claude personnalise chaque message selon le contexte (interactions, pain points, produit, langue)
**And** les emails sont envoyés via Resend avec template HTML
**And** les messages WhatsApp sont envoyés via WhatsApp Business Cloud API
**And** une `LeadInteraction` est créée (`direction: "outbound"`, `channel`, `content`)
**And** `currentStep` est incrémenté, `nextActionAt` est recalculé
**And** si dernière étape : `enrollment.status = "completed"`

### Story 7.3: Response Analysis & Intent Detection

As the Opportunity Hunter agent,
I want analyser automatiquement les réponses des leads (sentiment, intention),
So that the nurturing path adapts to lead behavior.

**Acceptance Criteria:**

**Given** un webhook reçoit une réponse de lead (email reply ou WhatsApp)
**When** le workflow MKT-304 est déclenché
**Then** Claude analyse le message et retourne : sentiment (positive/neutral/negative), intent (interested/needs_info/not_ready/objection/ready_to_buy/unsubscribe), action recommandée
**And** une `LeadInteraction` est créée (`direction: "inbound"`, `aiSentiment`, `aiIntent`)
**And** `Lead.temperature` est mis à jour si changement
**And** `ready_to_buy` → MKT-305 (booking), `objection` → réponse Claude + continue, `unsubscribe` → pause séquence

### Story 7.4: Lead Response to Objections

As the Opportunity Hunter agent,
I want répondre automatiquement aux objections identifiées,
So that leads receive relevant counter-arguments without human delay.

**Acceptance Criteria:**

**Given** une réponse de lead avec `intent: "objection"`
**When** le workflow MKT-304 détecte l'objection
**Then** Claude génère une réponse ciblée à l'objection dans le ton de la marque
**And** la réponse est envoyée sur le même canal que la réponse du lead
**And** la séquence continue normalement

### Story 7.5: Human Escalation Workflow

As the Opportunity Hunter agent,
I want escalader automatiquement vers un commercial quand nécessaire,
So that complex cases receive human attention.

**Acceptance Criteria:**

**Given** une condition d'escalation (réponse négative, demande complexe, lead VIP)
**When** le workflow MKT-306 est déclenché
**Then** Claude génère un résumé pour le commercial (historique, recommandations)
**And** une notification Slack + email est envoyée au commercial assigné
**And** `Lead.status` passe à `opportunity` avec `assignedTo` renseigné
**And** le lead est visible en priorité dans le dashboard pipeline

### Story 7.6: Conversion Tracking & Multi-Touch Attribution

As a marketing manager,
I want suivre les conversions et comprendre l'attribution multi-touch,
So that I know which channels and content drive conversions.

**Acceptance Criteria:**

**Given** un événement de conversion (achat, inscription, etc.)
**When** le workflow MKT-307 reçoit l'événement
**Then** l'attribution multi-touch linéaire est calculée : `conversionValue / touchpoints.length`
**And** `Lead.status` passe à `converted` avec `convertedAt` et `conversionValue`
**And** les métriques de conversion sont attribuées aux `AdCampaign` et `ContentPiece` sources
**And** un message Redis `mkt:agent:3:conversion` est publié pour les agents 1 et 2
**And** une notification Slack alerte de la conversion

---

## Epic 8: Advertising Campaign Management

**Goal** : L'IA propose des campagnes publicitaires basées sur les contenus gagnants, les soumet à approbation humaine obligatoire, les lance et les optimise automatiquement.

**FRs** : FR-A2-01..FR-A2-08

### Story 8.1: Competitive Ad Research

As the Amplification Engine agent,
I want analyser quotidiennement les publicités des concurrents,
So that campaign proposals are informed by competitive intelligence.

**Acceptance Criteria:**

**Given** la table `CompetitorAd` est créée avec ce story et des concurrents sont configurés par marque
**When** le scheduler MKT-201 s'exécute (quotidien 6h)
**Then** les pubs actives des concurrents sont récupérées via Facebook Ad Library API
**And** Claude analyse les tendances et stratégies concurrentielles
**And** les résultats sont sauvegardés dans `CompetitorAd`

### Story 8.2: AI Campaign Proposal Generation

As the Amplification Engine agent,
I want générer une proposition de campagne complète à partir d'un content signal,
So that winning organic content can be amplified as paid ads.

**Acceptance Criteria:**

**Given** les tables `AdCampaign`, `AdSet`, `AdCreative` sont créées avec ce story et un `ContentSignal` existe
**When** le workflow MKT-202 est déclenché (via signal ou manuellement)
**Then** Claude génère : objectif, ciblage détaillé, budget recommandé, structure (ad sets, creatives), 3 variantes texte, KPIs cibles
**And** DALL-E génère 3 variantes de visuels pub
**And** `AdCampaign` est créée avec `status: "draft"`, accompagnée de ses `AdSet` et `AdCreative`
**And** le workflow MKT-203 est déclenché pour approbation

### Story 8.3: Mandatory Campaign Approval Gate

As a campaign approver,
I want approuver ou rejeter chaque campagne pub avant lancement (gate obligatoire),
So that no ad spend happens without human authorization.

**Acceptance Criteria:**

**Given** une campagne en `status: "draft"`
**When** le workflow MKT-203 est déclenché
**Then** un `ApprovalQueue` est créé avec `entityType: "ad_campaign"`, `priority: "high"`
**And** une notification haute priorité (Slack + email) est envoyée avec résumé campagne, budget, preview créatives, ciblage
**And** si approuvée → MKT-204 est déclenché
**And** si modifiée → les paramètres sont mis à jour puis re-soumis
**And** si rejetée → la campagne est archivée

### Story 8.4: Facebook Ads Campaign Launch

As the Amplification Engine agent,
I want lancer automatiquement les campagnes approuvées sur Facebook Ads,
So that campaigns go live without manual ad platform configuration.

**Acceptance Criteria:**

**Given** une campagne approuvée pour Facebook Ads
**When** le workflow MKT-204 est déclenché
**Then** la campagne est créée via Facebook Ads API v19 : campaign → ad sets → upload creatives → ads
**And** la campagne est lancée en `status: "ACTIVE"`
**And** les `platformCampaignId`, `platformAdsetId` sont sauvegardés en base
**And** `AdCampaign.status` passe à `active`
**And** une notification confirme le lancement

### Story 8.5: TikTok Ads Campaign Launch

As the Amplification Engine agent,
I want lancer les campagnes sur TikTok Ads,
So that the ad reach extends to TikTok's audience.

**Acceptance Criteria:**

**Given** une campagne approuvée pour TikTok Ads
**When** le workflow MKT-204 est déclenché pour TikTok
**Then** la campagne est créée via TikTok Ads API v1.3 : campaign → adgroup → ad
**And** les IDs plateforme sont sauvegardés en base

### Story 8.6: Ad Metrics Collection

As the Amplification Engine agent,
I want collecter les métriques de toutes les campagnes actives toutes les 4h,
So that performance data is available for optimization.

**Acceptance Criteria:**

**Given** la table `AdMetrics` est créée avec ce story et des campagnes actives existent
**When** le scheduler MKT-205 s'exécute
**Then** les métriques sont collectées par plateforme (impressions, clicks, spend, conversions, CPC, CPM, CTR)
**And** le ROAS est calculé : `conversionValue / spend`
**And** les anomalies sont détectées (CPC spike > 2×, ROAS drop)
**And** une alerte est envoyée si anomalie détectée

### Story 8.7: AI Campaign Optimization

As the Amplification Engine agent,
I want optimiser automatiquement les campagnes chaque jour,
So that budget is allocated to best-performing ads.

**Acceptance Criteria:**

**Given** des métriques sur 7 jours existent par campagne/adset/creative
**When** le scheduler MKT-206 s'exécute (quotidien 10h)
**Then** Claude analyse les performances et recommande des actions
**And** ROAS < 1.0 pendant 3j → ad set/creative pausé via API
**And** CPC > 2× moyenne → ciblage ajusté
**And** CTR > 2× moyenne → budget scalé +30%
**And** creative surperformante > 50% → concentration budget
**And** toutes les actions sont loggées dans `AiLearningLog`
**And** un résumé des optimisations est envoyé via Slack

---

## Epic 9: Analytics, Reports & Internationalization

**Goal** : Les utilisateurs accèdent à des analytics agrégés, des rapports IA hebdomadaires, et peuvent utiliser la plateforme en français ou en anglais.

**FRs** : FR-D02, FR-D04..FR-D07, FR-S02

### Story 9.1: KPI Streaming via SSE

As a user on the dashboard,
I want voir les KPIs se rafraîchir automatiquement toutes les 30s,
So that I always see up-to-date performance data.

**Acceptance Criteria:**

**Given** des métriques existent en base
**When** le dashboard se connecte à `GET /api/analytics/stream`
**Then** un flux SSE est établi avec rafraîchissement toutes les 30s
**And** les KPIs incluent : contenus publiés (24h), engagement total, leads générés, ROAS moyen
**And** les données sont filtrées par `tenantId`

### Story 9.2: Daily Analytics Aggregation

As the system,
I want agréger les métriques quotidiennement,
So that historical analytics are available for reports and trends.

**Acceptance Criteria:**

**Given** la table `DailyAnalytics` est créée avec ce story
**When** le scheduler MKT-402 s'exécute (quotidien 23h59)
**Then** les métriques du jour sont agrégées : contenus publiés, impressions totales, engagements, engagement rate moyen, dépenses pub, leads générés, leads qualifiés, conversions
**And** un enregistrement `DailyAnalytics` est créé par organisation par jour

### Story 9.3: Weekly AI Report Generation

As a marketing manager,
I want recevoir un rapport hebdomadaire IA chaque lundi,
So that I get a strategic overview without manual analysis.

**Acceptance Criteria:**

**Given** des `DailyAnalytics` des 7 derniers jours
**When** le scheduler MKT-403 s'exécute (lundi 8h)
**Then** Claude génère un rapport : résumé exécutif (3 phrases), performance contenu (top 3, tendances), performance pub (ROAS, meilleur ad set), pipeline leads (nouveaux, qualifiés, convertis), insights AI, recommandations semaine à venir
**And** le rapport est envoyé par email aux owners/admins
**And** un résumé est posté dans Slack #marketing-reports

### Story 9.4: Approval Management Dashboard

As an approver,
I want consulter et gérer la file d'approbation depuis le dashboard,
So that I can approve content and campaigns efficiently.

**Acceptance Criteria:**

**Given** des approbations en attente existent
**When** l'utilisateur accède à `/approvals`
**Then** la file affiche les approbations triées par priorité et ancienneté
**And** chaque item montre un preview (contenu ou campagne)
**And** un `ApprovalModal` permet d'approuver, rejeter, ou demander une modification
**And** l'action met à jour le statut et déclenche le workflow suivant

### Story 9.5: Dashboard Internationalization FR/EN

As a user,
I want utiliser le dashboard en français ou en anglais,
So that the platform is accessible to my preferred language.

**Acceptance Criteria:**

**Given** les fichiers de traduction `public/locales/fr.json` et `en.json`
**When** l'utilisateur change de langue dans les settings
**Then** toute l'interface bascule dans la langue choisie (labels, messages, formats date/nombre)
**And** `next-intl` est configuré avec détection automatique de la locale
**And** les formats de date et nombre s'adaptent (DD/MM/YYYY vs MM/DD/YYYY, virgule vs point décimal)

---

## Epic 10: Inter-Agent Communication & System Utilities

**Goal** : Les 3 agents communiquent via Redis pub/sub avec persistance, les tokens OAuth sont rafraîchis automatiquement, et le système apprend de ses performances.

**FRs** : FR-S01, FR-S03..FR-S05

### Story 10.1: OAuth Token Refresh Utility

As the system,
I want rafraîchir automatiquement les tokens OAuth avant expiration,
So that social account integrations never break silently.

**Acceptance Criteria:**

**Given** des comptes sociaux avec tokens proches de l'expiration (< 24h)
**When** le scheduler MKT-401 s'exécute (toutes les 12h)
**Then** les tokens sont rafraîchis par plateforme (LinkedIn, Facebook, TikTok, Twitter)
**And** les nouveaux tokens sont chiffrés et sauvegardés en base
**And** en cas d'échec de refresh → notification urgente à l'admin
**And** les webhooks API ↔ n8n utilisent Header Auth (`X-API-Key`) vérifié par middleware

### Story 10.2: Agent Messages Bus & Dead Letter Queue

As the system,
I want que tous les messages inter-agents soient persistés et les non-consommés soient relancés,
So that no inter-agent communication is lost.

**Acceptance Criteria:**

**Given** la table `AgentMessage` est créée avec ce story
**When** un workflow publie sur Redis (ex: `mkt:agent:1:signals`)
**Then** le message est aussi persisté dans `AgentMessage` (channel, payload JSONB, correlationId)
**And** un consumer marque le message comme `consumed: true` avec `consumedAt`
**And** les messages non consommés après 24h déclenchent une notification admin + re-traitement
**And** chaque workflow critique a un Error Trigger node pour capture et notification d'erreurs

### Story 10.3: Content → Amplification Feedback Loop

As the system,
I want que les contenus gagnants déclenchent automatiquement des propositions de campagne pub,
So that organic success is amplified automatically.

**Acceptance Criteria:**

**Given** MKT-109 publie un signal sur `mkt:agent:1:signals`
**When** MKT-202 reçoit le signal
**Then** une proposition de campagne est automatiquement générée basée sur le contenu gagnant
**And** le `ContentSignal` est lié à l'`AdCampaign` proposée
**And** la traçabilité contenu → signal → campagne est complète

### Story 10.4: Amplification → Leads Feedback Loop

As the system,
I want que les leads des publicités soient automatiquement ingérés avec attribution complète,
So that the lead pipeline is fed by ad campaigns.

**Acceptance Criteria:**

**Given** des webhooks Facebook/TikTok Lead Ads sont configurés
**When** un lead est généré par une publicité
**Then** MKT-301 ingère le lead avec attribution complète (campaignId, adSetId, creativeId, contentSignalId)
**And** la source est marquée comme `ad` avec la plateforme publicitaire

### Story 10.5: Leads → Content Feedback Loops

As the system,
I want que les données de conversion et pain points remontent vers la création de contenu,
So that content strategy improves based on real conversion data.

**Acceptance Criteria:**

**Given** la table `AiLearningLog` est créée avec ce story
**When** MKT-307 détecte une conversion → publie sur `mkt:agent:3:insights`
**And** MKT-304 détecte des pain points récurrents → publie sur `mkt:agent:3:pain_points`
**Then** MKT-404 analyse les patterns de conversion et ajuste les recommandations de contenu
**And** des `ContentInput` automatiques sont créés avec sujets basés sur les pain points récurrents
**And** les insights sont stockés dans `AiLearningLog` avec embeddings (text-embedding-3-small)

### Story 10.6: AI Learning Loop

As the system,
I want analyser 30 jours de données et identifier des patterns pour améliorer les stratégies,
So that the entire system gets smarter over time.

**Acceptance Criteria:**

**Given** des données de performance (contenu, pub, leads) sur 30 jours
**When** le scheduler MKT-404 s'exécute (quotidien 2h)
**Then** Claude analyse les données et identifie des patterns (type, description, confiance 0-1, action)
**And** des embeddings OpenAI sont générés pour chaque insight (recherche sémantique future)
**And** les insights sont comparés aux précédents (validation/invalidation)
**And** un message Redis `mkt:agent:learning:updated` notifie tous les agents
**And** les agents rechargent leurs contextes avec les insights à jour

### Story 10.7: Ads → Content Performance Feedback

As the system,
I want que les messages/visuels gagnants en pub remontent vers la création de contenu,
So that organic content benefits from paid performance data.

**Acceptance Criteria:**

**Given** MKT-205/206 identifie des créatives pub surperformantes
**When** un message est publié sur `mkt:agent:2:performance`
**Then** les insights sur les messages et visuels gagnants sont intégrés dans les guidelines de génération de contenu
**And** la prochaine exécution de MKT-102 utilise ces insights comme contexte

### Story 10.8: n8n Error Handling & Monitoring

As an admin,
I want que les erreurs de workflows soient capturées et notifiées,
So that system failures are detected and resolved quickly.

**Acceptance Criteria:**

**Given** un workflow n8n échoue pendant l'exécution
**When** le Error Trigger node capture l'erreur
**Then** une notification est envoyée (Slack + email admin)
**And** l'erreur est loggée avec le workflow ID, l'étape en erreur, et le message
**And** les métriques de santé sont vérifiables : Agent 1 < 24h, Agent 2 < 48h, Agent 3 premier contact < 1h
**And** Redis messages non consommés > 5 déclenche un warning, > 20 un critical

---

## Validation Summary

### FR Coverage

| Validation | Résultat |
|-----------|----------|
| FRs couverts | 58/58 (100%) |
| NFRs adressés | 25/25 via patterns architecture + stories spécifiques |
| Architecture Requirements (AR) | 5/5 via Epic 1 |

### Epic Quality

| Critère | Résultat |
|---------|----------|
| Chaque epic délivre de la valeur utilisateur | ✅ |
| Chaque epic est autonome (pas de dépendance forward entre epics) | ✅ |
| Les stories sont ordonnées sans dépendance forward | ✅ |
| Chaque story crée uniquement les tables DB dont elle a besoin | ✅ |
| Acceptance criteria en format BDD (Given/When/Then) | ✅ |
| Stories de taille implémentable par un agent dev | ✅ |

### Dependency Chain

```
Epic 1 (Auth & Foundation) — standalone
  └─ Epic 2 (Brands & Integrations) — requires auth
       └─ Epic 3 (Content Creation) — requires brands + social accounts
            └─ Epic 4 (Approval & Publishing) — requires content pieces
                 └─ Epic 5 (Performance & Dashboard) — requires published content
Epic 6 (Lead Capture) — requires auth + brands (can run after Epic 2)
  └─ Epic 7 (Nurturing & Conversion) — requires leads
Epic 8 (Advertising) — requires content signals (Epic 5) + ad accounts (Epic 2)
Epic 9 (Analytics & i18n) — requires metrics data (runs incrementally)
Epic 10 (Inter-Agent & Utilities) — requires all agents (runs incrementally)
```

---

*Document généré selon la méthode BMAD v6.0.0-Beta.7 — Agent PM (John)*
*Input : PRD (58 FRs, 25 NFRs) + Architecture (35+ decisions) + 2 cahiers des charges*
*10 Epics | 62 Stories | 100% FR coverage | BDD Acceptance Criteria*
