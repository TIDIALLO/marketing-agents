---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - prd-synap6ia-marketing.md
  - product-brief-synap6ia-marketing-2026-02-07.md
  - CAHIER_DES_CHARGES.md
  - CAHIER_DES_CHARGES_WORKFLOWS_N8N.md
workflowType: architecture
project_name: Synap6ia Marketing
user_name: Synap6ia
date: 2026-02-08
agent: architect (Winston)
status: complete
completedAt: 2026-02-08
---

# Architecture Decision Document — Synap6ia Marketing

_Ce document consolide les décisions architecturales pour garantir une implémentation cohérente par les agents AI. Chaque section est traçable vers le PRD._

---

## 1. Project Context Analysis

### 1.1 Requirements Overview

**Functional Requirements** : 58 FRs répartis en 6 domaines

| Domaine | FRs | Complexité architecturale |
|---------|-----|---------------------------|
| Core Platform (auth, RBAC, multi-tenant) | 10 | Haute — RLS, middleware injection, chiffrement tokens |
| Agent 1 — Content Flywheel | 15 | Haute — pipeline async 9 workflows, 5 APIs sociales, 2 APIs AI |
| Agent 2 — Amplification Engine | 9 | Haute — APIs publicitaires, optimisation automatique, gate approbation |
| Agent 3 — Opportunity Hunter | 12 | Haute — scoring AI, séquences multi-canal, booking, attribution |
| Dashboard & Analytics | 7 | Moyenne — WebSocket, SSE, Recharts, i18n |
| Système & Utilitaires | 5 | Moyenne — cron jobs, dead letter queue, learning loop |

**Non-Functional Requirements** : 25 NFRs

| Catégorie | NFRs | Impact architectural |
|-----------|------|---------------------|
| Performance | 5 | API < 500ms P95, WebSocket < 2s, scheduler 15min |
| Security | 8 | JWT, RBAC, RLS, AES-256-GCM, Helmet, rate limiting |
| Scalability | 4 | Docker Compose, Bull queue, RLS 100+ tenants, MinIO |
| Reliability | 5 | Retry backoff, health checks, error format uniforme |
| Compliance | 3 | RGPD, ToS plateformes sociales, audit trail AI |

### 1.2 Scale & Complexity Assessment

| Indicateur | Évaluation |
|-----------|------------|
| Complexité globale | **Haute** |
| Domaine technique | Full-stack (Web App + API Backend + Automation Platform) |
| Real-time | Oui — WebSocket events (16 types), SSE KPIs (30s) |
| Multi-tenancy | Oui — RLS PostgreSQL, isolation complète |
| Intégrations externes | 17 services (5 APIs sociales, 3 APIs pub, 4 APIs AI, 5 services ops) |
| Workflows automatisés | 25 workflows n8n inter-connectés |
| Communication inter-services | Redis pub/sub (7 canaux), webhooks bidirectionnels API ↔ n8n |

### 1.3 Cross-Cutting Concerns

| Concern | Impact |
|---------|--------|
| **Multi-tenant isolation** | Touche toutes les tables, toutes les requêtes, tous les endpoints |
| **Circuit d'approbation** | Agent 1 (contenu) + Agent 2 (pub), Slack/email callbacks |
| **Retry & error handling** | Toutes les APIs externes, tous les workflows n8n |
| **Token management** | OAuth social (5 plateformes) + OAuth pub (3 plateformes) + API keys AI |
| **Rate limiting** | Par tenant, par API externe, par endpoint interne |
| **Logging & correlation** | Chaque requête HTTP, chaque exécution workflow, chaque appel AI |
| **RGPD** | Consentement leads, effacement cascade, portabilité, rétention configurable |

---

## 2. Technology Stack Decisions

### 2.1 Frontend

| Technologie | Version | Rationale |
|-------------|---------|-----------|
| **Next.js** | 16 | SSR/SSG, App Router, Server Components, optimized pour SEO et performance |
| **React** | 19 | Concurrent features, Server Components natifs |
| **TypeScript** | 5.x | Typage strict pour réduire les bugs, cohérence codebase |
| **TailwindCSS** | v4 | Utility-first, performance (purge), pas de CSS custom à maintenir |
| **shadcn/ui** | latest | Composants accessibles, customisables, pas de vendor lock-in (code copié) |
| **Recharts** | latest | Graphiques React natifs pour dashboard analytics |
| **next-intl** | latest | Internationalisation FR/EN, formatage dates/nombres |
| **Socket.io-client** | latest | WebSocket côté client pour events temps réel |

### 2.2 Backend

| Technologie | Version | Rationale |
|-------------|---------|-----------|
| **Node.js** | 20+ LTS | Runtime stable, écosystème riche, cohérence avec Next.js |
| **Express.js** | 4.x | Léger, flexible, middleware composable, pattern éprouvé (soc-autopilot-hub) |
| **TypeScript** | 5.x | Même version que frontend, types partagés |
| **Prisma** | latest | Type-safe ORM, migrations auto, excellent DX |
| **Zod** | latest | Validation runtime des inputs API, couplage avec TypeScript |
| **Bull** | latest | Job queue Redis-backed, retry, concurrency, priorités |
| **bcrypt** | latest | Hash mots de passe (cost factor 12) |
| **jsonwebtoken** | latest | JWT access/refresh tokens |
| **Socket.io** | latest | WebSocket serveur pour push events dashboard |
| **helmet** | latest | Security headers HTTP |
| **cors** | latest | CORS strict whitelist |
| **express-rate-limit** | latest | Rate limiting par tier |
| **cookie-parser** | latest | Parsing cookies refresh token |
| **uuid** | latest | Génération UUID pour correlation IDs et références |

### 2.3 Infrastructure

| Technologie | Version | Rationale |
|-------------|---------|-----------|
| **PostgreSQL** | 16 | JSONB natif, RLS, performance, extensions (pgcrypto) |
| **Redis** | 7 | Cache, pub/sub inter-agents, backing store Bull queues |
| **n8n** | latest (Community) | Orchestration workflows, UI visuel, webhook natif, Code nodes JS |
| **MinIO** | latest | S3-compatible self-hosted, stockage média illimité |
| **Nginx** | latest | Reverse proxy, SSL termination, load balancing, rate limiting L7 |
| **Docker Compose** | 3.8 | Conteneurisation, reproducibilité, health checks |
| **Let's Encrypt** | — | Certificats SSL automatiques via certbot |
| **GitHub Actions** | — | CI/CD pipeline (lint, test, build, deploy) |

### 2.4 Services AI

| Service | Fournisseur | Modèle/Version | Usage |
|---------|-------------|-----------------|-------|
| **Claude API** | Anthropic | claude-sonnet-4-20250514 (configurable) | Génération contenu, analyse stratégique, qualification leads, optimisation campagnes |
| **DALL-E 3** | OpenAI | dall-e-3 | Visuels sociaux (1024×1024), créatives pub, stories (1024×1792) |
| **Whisper** | OpenAI | whisper-1 | Transcription notes vocales |
| **Embeddings** | OpenAI | text-embedding-3-small | Vecteurs sémantiques pour ai_learning_log |

> **Note** : Le modèle Claude doit être configurable via variable d'environnement (`AI_CLAUDE_MODEL`) pour éviter l'obsolescence lors de mises à jour de modèle.

---

## 3. Architecture Système

### 3.1 Vue d'ensemble des services

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NGINX Reverse Proxy                          │
│                    (SSL + Rate Limiting L7)                          │
│                                                                     │
│   /              → mkt-dashboard:3000   (Next.js)                   │
│   /api/          → mkt-api:4000        (Express.js)                 │
│   /webhooks/n8n/ → mkt-n8n:5678       (n8n)                        │
│   /media/        → mkt-minio:9000     (MinIO)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ mkt-dashboard│  │ mkt-api      │  │ mkt-n8n      │              │
│  │ Next.js 16   │  │ Express.js 4 │  │ Workflows    │              │
│  │ :3000        │  │ :4000        │  │ :5678        │              │
│  │              │  │              │  │              │              │
│  │ - SSR/SSG    │  │ - REST API   │  │ - 25 wkf     │              │
│  │ - WebSocket  │  │ - Auth/RBAC  │  │ - Webhooks   │              │
│  │ - i18n FR/EN │  │ - Multi-ten  │  │ - Cron jobs  │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                      │
│         │    REST + WS    │    Webhooks + REST│                     │
│         ├─────────────────┤──────────────────┤                      │
│         │                 │                  │                      │
│  ┌──────┴───────┐  ┌──────┴──────┐  ┌───────┴──────┐              │
│  │ mkt-postgres │  │ mkt-redis   │  │ mkt-minio    │              │
│  │ PostgreSQL 16│  │ Redis 7     │  │ S3-compatible│              │
│  │ :5432        │  │ :6379       │  │ :9000        │              │
│  │              │  │             │  │              │              │
│  │ - RLS        │  │ - Pub/Sub   │  │ - Médias     │              │
│  │ - 25+ tables │  │ - Bull queue│  │ - Créatives  │              │
│  │ - TDE        │  │ - Cache     │  │ - Exports    │              │
│  └──────────────┘  └─────────────┘  └──────────────┘              │
│                                                                     │
│                   Docker Network: mkt-network                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Communication inter-services

| Source | Destination | Protocole | Pattern |
|--------|-------------|-----------|---------|
| Dashboard → API | REST + WebSocket | Requêtes HTTP, events push |
| API → Dashboard | WebSocket (Socket.io) | Push events temps réel (16 types) |
| API → n8n | HTTP POST webhook | Déclenchement workflows |
| n8n → API | HTTP POST callback | Résultats workflows, mises à jour |
| n8n → PostgreSQL | pg driver direct | Lecture/écriture données (Postgres nodes) |
| n8n → Redis | Redis client | Pub/sub inter-agents (7 canaux) |
| n8n → APIs externes | HTTP Request | Claude, OpenAI, réseaux sociaux, pubs |
| API → Redis | ioredis | Cache, pub/sub, Bull queue |
| API → PostgreSQL | Prisma ORM | CRUD avec RLS |
| API → MinIO | S3 SDK | Upload/download médias |

### 3.3 Flux de données inter-agents

```
                    ┌─────────────────────┐
                    │    MKT-404          │
                    │ Boucle Apprentissage│
                    │  (quotidien 2h)     │
                    └────────┬────────────┘
                             │
              mkt:agent:learning:updated
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   AGENT 1       │ │   AGENT 2       │ │   AGENT 3       │
│Content Flywheel │ │Amplification Eng│ │Opportunity Hunter│
│  MKT-101→109   │ │  MKT-201→206   │ │  MKT-301→307    │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         │ mkt:agent:1:signals                   │
         ├──────────────────►│                   │
         │                   │ mkt:agent:2:leads │
         │                   ├──────────────────►│
         │                   │                   │
         │ mkt:agent:3:pain_points               │
         │◄──────────────────────────────────────┤
         │                   │                   │
         │ mkt:agent:2:performance               │
         │◄──────────────────┤                   │
         │                   │ mkt:agent:3:insights
         │                   │◄──────────────────┤
         └───────────────────┴───────────────────┘
```

### 3.4 Architecture Multi-tenant

```
Requête HTTP entrante
  │
  ▼
┌──────────────────────────────┐
│ Middleware: authMiddleware    │ ← Vérifie JWT, extrait user_id
│ → Charge user + tenant_id    │
├──────────────────────────────┤
│ Middleware: tenantMiddleware  │ ← Injecte tenant_id dans req.tenantId
│ → SET app.current_tenant_id  │ ← SET sur la connexion PostgreSQL
├──────────────────────────────┤
│ Prisma Query                 │ ← Toutes les queries filtrent sur tenant_id
│ + RLS Policy PostgreSQL      │ ← Double protection : app + DB level
└──────────────────────────────┘
```

**Policies RLS** (appliquées sur chaque table de données) :

```sql
CREATE POLICY tenant_isolation ON {table_name}
  USING (tenant_id = current_setting('app.current_tenant_id')::TEXT);
```

**n8n et multi-tenant** : Les workflows n8n reçoivent `tenant_id` dans le payload webhook et le propagent dans toutes les opérations SQL.

---

## 4. Core Architectural Decisions

### 4.1 Data Architecture

| Décision | Choix | Rationale |
|----------|-------|-----------|
| ORM | **Prisma** avec migrations auto | Type-safe, DX excellent, migrations reproductibles |
| Naming tables DB | **snake_case** (`content_pieces`) | Convention PostgreSQL standard |
| Naming modèles Prisma | **PascalCase** (`ContentPiece`) | Convention Prisma, mapping `@@map("content_pieces")` |
| Naming champs Prisma | **camelCase** (`contentPieceId`) | Convention TypeScript, mapping `@map("content_piece_id")` |
| IDs | **CUID** (`@id @default(cuid())`) | Plus court que UUID, sortable, URL-safe |
| Timestamps | `createdAt` / `updatedAt` sur chaque table | Audit trail, tri chronologique |
| Données flexibles | **JSONB** pour AI responses, metadata, targeting | Flexibilité sans migration pour données semi-structurées |
| Cache | **Redis** avec TTL configurable | Cache requêtes fréquentes (métriques dashboard), invalidation event-driven |
| Migrations | **Prisma Migrate** (dev) / `prisma migrate deploy` (prod) | Reproductibilité, versioning, rollback |

### 4.2 Authentication & Security

| Décision | Choix | Rationale |
|----------|-------|-----------|
| Auth method | **JWT** (access 15min + refresh 7j en HttpOnly cookie) | Stateless, scalable, refresh sécurisé |
| Hash passwords | **bcrypt** (cost factor 12) | Standard industrie, résistant brute force |
| Authorization | **RBAC 4 niveaux** (Owner > Admin > Editor > Viewer) | Simple, suffisant pour le use case, extensible |
| RBAC enforcement | **Middleware Express** par route + vérification Prisma | Double protection app-level |
| Token storage API tiers | **AES-256-GCM** en DB | Chiffrement at-rest, rotation possible |
| Rate limiting | **express-rate-limit** par tier (auth 10/15min, API 100/15min) | Protection brute force + fair usage |
| CORS | **Whitelist stricte** par tenant (origins configurables) | Isolation multi-tenant côté browser |
| Headers sécurité | **Helmet.js** (XSS, HSTS, CSP, frameguard, noSniff) | Protection OWASP Top 10 |
| Webhooks n8n | **Header Auth** (`X-API-Key`) | Simple, efficace pour communication interne |

### 4.3 API Design

| Décision | Choix | Rationale |
|----------|-------|-----------|
| Style API | **REST** (JSON) | Simple, bien compris, suffisant pour le use case |
| Versioning | Pas de versioning URL (v1 unique pour Phase 0-3) | Complexité inutile à ce stade |
| Naming endpoints | **kebab-case**, pluriel (`/api/content-pieces`) | Convention REST standard |
| Naming JSON | **camelCase** (`contentPieceId`) | Convention JavaScript/TypeScript |
| Validation input | **Zod schemas** sur chaque route | Runtime validation + inférence TypeScript |
| Response wrapper | `{ success: true, data: {...} }` / `{ success: false, error: { code, message, details } }` | Format uniforme pour frontend |
| Pagination | `?page=1&limit=20` avec réponse `{ data, pagination: { page, limit, total, totalPages } }` | Simple, prévisible |
| Filtrage | Query params : `?status=published&platform=linkedin` | REST standard |
| Tri | `?sort=createdAt&order=desc` | Convention simple |
| HTTP status codes | Standards (200, 201, 400, 401, 403, 404, 422, 429, 500) | REST conventions |

### 4.4 Real-time Communication

| Décision | Choix | Rationale |
|----------|-------|-----------|
| Push events dashboard | **Socket.io** (WebSocket avec fallback) | 16 types d'events, fiabilité, reconnexion auto |
| KPIs streaming | **SSE** (`GET /api/analytics/stream`, rafraîchissement 30s) | Unidirectionnel, léger, suffisant pour KPIs |
| Inter-agents | **Redis pub/sub** (7 canaux `mkt:agent:*`) | Découplage, persistance via `agent_messages`, fiable |
| Notifications | **Multi-canal** (Slack, email Resend, WhatsApp) selon préférences user | Flexibilité, user choice |

### 4.5 File Storage

| Décision | Choix | Rationale |
|----------|-------|-----------|
| Stockage médias | **MinIO** (S3-compatible, self-hosted) | Illimité, pas de vendor lock-in, API S3 standard |
| Structure buckets | `mkt-content-media` (bucket unique) | Simplicité |
| Path convention | `{org_id}/originals/{date}_{content_id}.{ext}` | Organisé par org, traçable |
| Accès | Via Nginx proxy (`/media/`) avec signed URLs | Sécurisé, performant |

### 4.6 Job Queue & Async Processing

| Décision | Choix | Rationale |
|----------|-------|-----------|
| Queue system | **Bull** (Redis-backed) | Retry, priorités, concurrency, monitoring, éprouvé |
| Queues séparées | `content-generation`, `email-sending`, `metrics-collection`, `media-processing` | Isolation, priorités différentes, concurrency tunable |
| Retry strategy | **Backoff exponentiel** (base 30s, max 3 tentatives) | Standard pour APIs externes |
| Failed jobs | DLQ (dead letter queue) → notification admin | Pas de perte de données |

### 4.7 Logging & Monitoring

| Décision | Choix | Rationale |
|----------|-------|-----------|
| Format logs | **JSON structuré** | Parsable, filtrable, compatible ELK/Loki futur |
| Correlation ID | **UUID** généré par middleware, propagé dans toute la chaîne | Traçabilité requête complète |
| Niveaux | `error`, `warn`, `info`, `debug` | Standard, configurable par env |
| Sensitive data | **Jamais loggé** (tokens, passwords, PII) | Compliance RGPD |
| n8n logs | **Executions n8n** (intégré) + Error Trigger nodes | Monitoring workflows |
| Health checks | **Docker health checks** avec `curl` sur endpoints `/health` | Détection automatique pannes |

---

## 5. Implementation Patterns & Consistency Rules

### 5.1 Express Middleware Stack (ordre strict)

Chaque instance Express doit appliquer les middlewares dans cet ordre exact :

```typescript
// 1. Security headers
app.use(helmet());

// 2. CORS
app.use(cors({ origin: CORS_WHITELIST, credentials: true }));

// 3. Rate limiting
app.use('/api/auth', authRateLimiter);  // 10 req/15min
app.use('/api', apiRateLimiter);         // 100 req/15min

// 4. Cookie parsing
app.use(cookieParser());

// 5. Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 6. Correlation ID
app.use(correlationIdMiddleware);

// 7. Routes
app.use('/api/auth', authRoutes);
app.use('/api', authMiddleware, tenantMiddleware, routes);

// 8. Error handler (toujours dernier)
app.use(globalErrorHandler);
```

### 5.2 Naming Conventions (strictes)

| Contexte | Convention | Exemple |
|----------|-----------|---------|
| Tables PostgreSQL | snake_case, pluriel | `content_pieces`, `ad_campaigns` |
| Colonnes PostgreSQL | snake_case | `created_at`, `tenant_id`, `engagement_rate` |
| Modèles Prisma | PascalCase, singulier | `ContentPiece`, `AdCampaign` |
| Champs Prisma | camelCase | `createdAt`, `tenantId`, `engagementRate` |
| Endpoints API | kebab-case, pluriel | `/api/content-pieces`, `/api/ad-campaigns` |
| Query params | camelCase | `?contentPieceId=xxx&sortBy=createdAt` |
| JSON request/response | camelCase | `{ contentPiece: { engagementRate: 5.2 } }` |
| Variables TypeScript | camelCase | `const engagementRate = 5.2;` |
| Fonctions TypeScript | camelCase | `function calculateEngagementScore()` |
| Classes TypeScript | PascalCase | `class ContentService` |
| Interfaces TypeScript | PascalCase, préfixe `I` interdit | `interface ContentPiece` (pas `IContentPiece`) |
| Types TypeScript | PascalCase | `type ContentStatus = 'draft' \| 'published'` |
| Enums TypeScript | PascalCase + UPPER_CASE membres | `enum ContentStatus { DRAFT, PUBLISHED }` |
| Composants React | PascalCase | `ContentPipeline.tsx`, `AdPerformanceChart.tsx` |
| Fichiers composants | PascalCase | `ContentPipeline.tsx` |
| Fichiers utilitaires | camelCase | `formatDate.ts`, `calculateScore.ts` |
| Fichiers routes API | camelCase | `contentPieces.ts`, `adCampaigns.ts` |
| Containers Docker | préfixe `mkt-` | `mkt-api`, `mkt-dashboard`, `mkt-postgres` |
| Workflows n8n | `MKT-{agent}{seq}` | `MKT-101`, `MKT-203`, `MKT-404` |
| Canaux Redis | `mkt:` namespace | `mkt:agent:1:signals`, `mkt:notifications` |
| Variables d'environnement | UPPER_SNAKE_CASE | `DATABASE_URL`, `AI_CLAUDE_MODEL` |

### 5.3 API Response Format (uniforme)

**Succès** :

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

**Succès (item unique)** :

```json
{
  "success": true,
  "data": { ... }
}
```

**Erreur** :

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email invalide",
    "details": [
      { "field": "email", "message": "Format email invalide" }
    ]
  }
}
```

**Codes d'erreur standardisés** :

| Code HTTP | Error Code | Usage |
|-----------|------------|-------|
| 400 | `VALIDATION_ERROR` | Input invalide (Zod) |
| 401 | `UNAUTHORIZED` | Token manquant ou expiré |
| 403 | `FORBIDDEN` | Permissions insuffisantes (RBAC) |
| 404 | `NOT_FOUND` | Ressource inexistante |
| 409 | `CONFLICT` | Duplication (email, etc.) |
| 422 | `UNPROCESSABLE_ENTITY` | Logique métier violée |
| 429 | `RATE_LIMITED` | Trop de requêtes |
| 500 | `INTERNAL_ERROR` | Erreur serveur inattendue |

### 5.4 Error Handling Pattern

```typescript
// Service layer — lance des erreurs métier typées
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

// Route handler — try/catch avec asyncHandler wrapper
const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Global error handler — dernier middleware
const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';

  logger.error({
    correlationId: req.correlationId,
    statusCode,
    code,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message,
      details: err instanceof AppError ? err.details : undefined,
    },
  });
};
```

### 5.5 Prisma Model Pattern

Chaque modèle Prisma suit cette structure :

```prisma
model ContentPiece {
  id        String   @id @default(cuid())
  tenantId  String   @map("tenant_id")
  // ... champs métier ...
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@map("content_pieces")
  @@index([tenantId])
}
```

**Règles** :
- `@id @default(cuid())` pour tous les IDs
- `tenantId` obligatoire sur toutes les tables de données
- `@@map("snake_case")` pour le nom de table
- `@map("snake_case")` pour les champs composés
- `createdAt` + `updatedAt` sur chaque modèle
- `@@index([tenantId])` minimum sur chaque table

### 5.6 Route Handler Pattern

```typescript
// Fichier : src/routes/contentPieces.ts
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { contentPieceService } from '../services/contentPieceService';

const router = Router();

const createContentPieceSchema = z.object({
  brandId: z.string().cuid(),
  platform: z.enum(['linkedin', 'facebook', 'instagram', 'tiktok', 'twitter']),
  body: z.string().min(1).max(5000),
  // ...
});

router.post(
  '/',
  requireRole('editor'),
  validate(createContentPieceSchema),
  asyncHandler(async (req, res) => {
    const piece = await contentPieceService.create(req.tenantId, req.body);
    res.status(201).json({ success: true, data: piece });
  })
);

export default router;
```

### 5.7 Service Layer Pattern

```typescript
// Fichier : src/services/contentPieceService.ts
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export const contentPieceService = {
  async create(tenantId: string, data: CreateContentPieceInput) {
    const brand = await prisma.brand.findFirst({
      where: { id: data.brandId, tenantId },
    });
    if (!brand) throw new AppError(404, 'NOT_FOUND', 'Brand not found');

    return prisma.contentPiece.create({
      data: { ...data, tenantId, status: 'draft' },
    });
  },

  async findMany(tenantId: string, filters: ContentPieceFilters) {
    const { page = 1, limit = 20, status, platform } = filters;
    const where = { tenantId, ...(status && { status }), ...(platform && { platform }) };

    const [data, total] = await Promise.all([
      prisma.contentPiece.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contentPiece.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
};
```

### 5.8 React Component Pattern

```typescript
// Fichier : src/components/ContentPipeline.tsx
'use client';

import { useState } from 'react';
import { useContentPieces } from '@/hooks/useContentPieces';
import { ContentPieceCard } from './ContentPieceCard';

interface ContentPipelineProps {
  brandId: string;
}

export function ContentPipeline({ brandId }: ContentPipelineProps) {
  const [status, setStatus] = useState<ContentStatus>('all');
  const { data, isLoading, error } = useContentPieces({ brandId, status });

  if (isLoading) return <ContentPipelineSkeleton />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div className="grid gap-4">
      {data.map((piece) => (
        <ContentPieceCard key={piece.id} piece={piece} />
      ))}
    </div>
  );
}
```

**Règles composants** :
- `'use client'` uniquement si hooks ou interactivité nécessaire
- Props typées via interface dédiée
- Loading → Skeleton component
- Error → ErrorDisplay component standardisé
- Pas de logique métier dans les composants (déléguée aux hooks/services)

### 5.9 WebSocket Events Pattern

```typescript
// Côté serveur : émission d'events
io.to(`tenant:${tenantId}`).emit('content:published', {
  contentPieceId: piece.id,
  platform: piece.platform,
  platformPostId: response.id,
  timestamp: new Date().toISOString(),
});

// Côté client : écoute
socket.on('content:published', (data: ContentPublishedEvent) => {
  // Mise à jour React Query cache
  queryClient.invalidateQueries(['contentPieces']);
  toast.success(`Contenu publié sur ${data.platform}`);
});
```

**Convention event names** : `{domain}:{action}` en kebab-case (`content:published`, `lead:qualified`, `campaign:optimized`).

### 5.10 n8n Workflow Convention

| Règle | Détail |
|-------|--------|
| Nommage workflow | `MKT-{agent}{seq} : {Nom descriptif}` |
| Active par défaut | `false` — activation manuelle après validation |
| Auth webhooks | Header Auth (`X-API-Key`) |
| Contexte données | `$json` pour accéder aux données |
| Code nodes | JavaScript ES2022 |
| Credentials | Référées par nom, jamais en dur |
| Error handling | Error Trigger node sur chaque workflow critique |
| Tenant propagation | `tenant_id` dans chaque payload, propagé dans toutes les queries SQL |
| Logging | `console.log` dans Code nodes pour debug, Error Trigger pour alertes |

---

## 6. Project Structure

### 6.1 Monorepo Structure

```
agents-marketing/
├── .github/
│   └── workflows/
│       ├── ci.yml                          # Lint + test + build
│       └── deploy.yml                      # Deploy to production
├── docker/
│   ├── docker-compose.yml                  # Stack complète
│   ├── docker-compose.dev.yml              # Overrides développement
│   ├── .env.example                        # Variables d'environnement template
│   ├── nginx/
│   │   ├── nginx.conf                      # Config Nginx principale
│   │   └── ssl/                            # Certificats SSL
│   └── postgres/
│       └── init-rls.sql                    # Policies RLS initiales
├── packages/
│   └── shared/                             # Types et utilitaires partagés
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types/                      # Types partagés frontend ↔ backend
│           │   ├── api.ts                  # ApiResponse, ApiError, Pagination
│           │   ├── auth.ts                 # User, Role, JwtPayload
│           │   ├── content.ts              # ContentPiece, ContentStatus, ContentSignal
│           │   ├── ads.ts                  # AdCampaign, AdSet, AdCreative, AdMetrics
│           │   ├── leads.ts                # Lead, LeadInteraction, LeadSequence
│           │   ├── analytics.ts            # DailyAnalytics, KPIs
│           │   └── events.ts               # WebSocket event types (16 types)
│           ├── constants/                  # Constantes partagées
│           │   ├── platforms.ts            # PLATFORMS, PLATFORM_LIMITS
│           │   ├── roles.ts                # ROLES, PERMISSIONS
│           │   └── errors.ts               # ERROR_CODES
│           └── utils/                      # Utilitaires purs
│               ├── formatDate.ts
│               └── validateEmail.ts
├── apps/
│   ├── api/                                # Express.js Backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma              # Schéma DB complet (~25 modèles)
│   │   │   ├── migrations/                # Historique migrations
│   │   │   └── seed.ts                    # Données de seed (dev)
│   │   └── src/
│   │       ├── index.ts                   # Entry point, server start
│   │       ├── app.ts                     # Express app setup (middleware stack)
│   │       ├── config/
│   │       │   ├── env.ts                 # Validation env vars (Zod)
│   │       │   ├── cors.ts                # CORS whitelist config
│   │       │   └── redis.ts               # Redis connection config
│   │       ├── lib/
│   │       │   ├── prisma.ts              # Prisma client singleton
│   │       │   ├── redis.ts               # Redis client (ioredis)
│   │       │   ├── bull.ts                # Bull queue definitions
│   │       │   ├── socket.ts              # Socket.io server setup
│   │       │   ├── minio.ts               # MinIO S3 client
│   │       │   ├── logger.ts              # Winston/Pino JSON logger
│   │       │   ├── errors.ts              # AppError class
│   │       │   └── ai/
│   │       │       ├── claude.ts           # Claude API wrapper
│   │       │       ├── openai.ts           # OpenAI API wrapper (DALL-E, Whisper, Embeddings)
│   │       │       └── prompts/            # System prompts par use case
│   │       │           ├── contentGeneration.ts
│   │       │           ├── leadQualification.ts
│   │       │           ├── campaignProposal.ts
│   │       │           └── responseAnalysis.ts
│   │       ├── middleware/
│   │       │   ├── auth.ts                # JWT verification + user loading
│   │       │   ├── tenant.ts              # Tenant injection + RLS SET
│   │       │   ├── rbac.ts                # Role-based access control
│   │       │   ├── validate.ts            # Zod validation middleware
│   │       │   ├── rateLimiter.ts         # Rate limiting config
│   │       │   ├── correlationId.ts       # UUID correlation ID generation
│   │       │   ├── asyncHandler.ts        # Async error wrapper
│   │       │   └── errorHandler.ts        # Global error handler
│   │       ├── routes/
│   │       │   ├── index.ts               # Route aggregator
│   │       │   ├── auth.ts                # /api/auth (6 endpoints)
│   │       │   ├── organizations.ts       # /api/organizations (5 endpoints)
│   │       │   ├── brands.ts              # /api/brands (6 endpoints)
│   │       │   ├── products.ts            # /api/products (5 endpoints)
│   │       │   ├── socialAccounts.ts      # /api/social-accounts (8 endpoints)
│   │       │   ├── contentPillars.ts      # /api/content/pillars (5 endpoints)
│   │       │   ├── contentPieces.ts       # /api/content/pieces (8 endpoints)
│   │       │   ├── contentSchedule.ts     # /api/content/schedule (5 endpoints)
│   │       │   ├── contentMetrics.ts      # /api/content/metrics (4 endpoints)
│   │       │   ├── adCampaigns.ts         # /api/ads/campaigns (7 endpoints)
│   │       │   ├── adCreatives.ts         # /api/ads/creatives (5 endpoints)
│   │       │   ├── leads.ts               # /api/leads (8 endpoints)
│   │       │   ├── leadSequences.ts       # /api/leads/sequences (6 endpoints)
│   │       │   ├── calendar.ts            # /api/calendar (4 endpoints)
│   │       │   ├── analytics.ts           # /api/analytics (5 endpoints)
│   │       │   ├── approvals.ts           # /api/approvals (4 endpoints)
│   │       │   ├── webhooks.ts            # /api/webhooks (6 endpoints internes n8n)
│   │       │   └── admin/
│   │       │       └── tenants.ts         # /api/admin/tenants (5 endpoints)
│   │       ├── services/
│   │       │   ├── authService.ts
│   │       │   ├── organizationService.ts
│   │       │   ├── brandService.ts
│   │       │   ├── socialAccountService.ts
│   │       │   ├── contentService.ts
│   │       │   ├── adCampaignService.ts
│   │       │   ├── leadService.ts
│   │       │   ├── analyticsService.ts
│   │       │   ├── approvalService.ts
│   │       │   └── webhookService.ts
│   │       ├── jobs/
│   │       │   ├── contentGenerationJob.ts
│   │       │   ├── emailSendingJob.ts
│   │       │   ├── metricsCollectionJob.ts
│   │       │   └── mediaProcessingJob.ts
│   │       └── __tests__/
│   │           ├── setup.ts               # Test setup (Prisma test client)
│   │           ├── routes/                # Route integration tests
│   │           ├── services/              # Service unit tests
│   │           └── middleware/            # Middleware unit tests
│   │
│   └── dashboard/                          # Next.js Frontend
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── public/
│       │   └── locales/
│       │       ├── fr.json                # Traductions françaises
│       │       └── en.json                # Traductions anglaises
│       └── src/
│           ├── app/
│           │   ├── layout.tsx             # Root layout (providers, theme)
│           │   ├── page.tsx               # Dashboard home (/)
│           │   ├── login/
│           │   │   └── page.tsx           # Login page
│           │   ├── content/
│           │   │   ├── page.tsx           # Content management
│           │   │   └── calendar/
│           │   │       └── page.tsx       # Calendrier éditorial
│           │   ├── ads/
│           │   │   └── page.tsx           # Gestion publicités
│           │   ├── leads/
│           │   │   └── page.tsx           # Pipeline leads
│           │   ├── analytics/
│           │   │   └── page.tsx           # Tableaux de bord
│           │   ├── approvals/
│           │   │   └── page.tsx           # File d'approbation
│           │   ├── brands/
│           │   │   └── page.tsx           # Gestion marques
│           │   └── settings/
│           │       └── page.tsx           # Configuration compte
│           ├── components/
│           │   ├── ui/                    # shadcn/ui components (Button, Card, Dialog, etc.)
│           │   ├── layout/
│           │   │   ├── Sidebar.tsx
│           │   │   ├── Header.tsx
│           │   │   └── MobileNav.tsx
│           │   ├── dashboard/
│           │   │   ├── AgentStatusCard.tsx
│           │   │   ├── MetricsDashboard.tsx
│           │   │   └── QuickActions.tsx
│           │   ├── content/
│           │   │   ├── ContentPipeline.tsx
│           │   │   ├── ContentPieceCard.tsx
│           │   │   ├── CalendarView.tsx
│           │   │   └── ContentEditor.tsx
│           │   ├── ads/
│           │   │   ├── AdPerformanceChart.tsx
│           │   │   ├── CampaignCard.tsx
│           │   │   └── CampaignCreator.tsx
│           │   ├── leads/
│           │   │   ├── LeadFunnel.tsx
│           │   │   ├── LeadCard.tsx
│           │   │   └── LeadTimeline.tsx
│           │   └── shared/
│           │       ├── ApprovalModal.tsx
│           │       ├── ErrorDisplay.tsx
│           │       ├── LoadingSkeleton.tsx
│           │       └── DataTable.tsx
│           ├── hooks/
│           │   ├── useAuth.ts
│           │   ├── useSocket.ts           # WebSocket connection + event handlers
│           │   ├── useContentPieces.ts
│           │   ├── useAdCampaigns.ts
│           │   ├── useLeads.ts
│           │   └── useAnalytics.ts
│           ├── lib/
│           │   ├── api.ts                 # API client (fetch wrapper with auth)
│           │   ├── socket.ts              # Socket.io client singleton
│           │   └── utils.ts               # UI utilities (cn, formatters)
│           └── providers/
│               ├── AuthProvider.tsx
│               ├── SocketProvider.tsx
│               ├── ThemeProvider.tsx
│               └── IntlProvider.tsx
│
├── workflows/                              # n8n Workflow Definitions
│   ├── agent-1-content/
│   │   ├── MKT-101-ingestion.json
│   │   ├── MKT-102-research.json
│   │   ├── MKT-103-generation.json
│   │   ├── MKT-104-approval.json
│   │   ├── MKT-105-reminder.json
│   │   ├── MKT-106-adaptation.json
│   │   ├── MKT-107-publication.json
│   │   ├── MKT-108-metrics.json
│   │   └── MKT-109-signals.json
│   ├── agent-2-amplification/
│   │   ├── MKT-201-competitive.json
│   │   ├── MKT-202-campaign-proposal.json
│   │   ├── MKT-203-approval-gate.json
│   │   ├── MKT-204-launch.json
│   │   ├── MKT-205-metrics.json
│   │   └── MKT-206-optimization.json
│   ├── agent-3-leads/
│   │   ├── MKT-301-ingestion.json
│   │   ├── MKT-302-qualification.json
│   │   ├── MKT-303-followup.json
│   │   ├── MKT-304-response-analysis.json
│   │   ├── MKT-305-booking.json
│   │   ├── MKT-306-escalation.json
│   │   └── MKT-307-conversion.json
│   └── utilities/
│       ├── MKT-401-token-refresh.json
│       ├── MKT-402-daily-analytics.json
│       ├── MKT-403-weekly-report.json
│       └── MKT-404-learning-loop.json
│
├── _bmad/                                  # BMAD Method (ne pas modifier)
├── _bmad-output/                           # Artefacts BMAD générés
│   ├── planning-artifacts/
│   │   ├── product-brief-synap6ia-marketing-2026-02-07.md
│   │   ├── prd-synap6ia-marketing.md
│   │   └── architecture-synap6ia-marketing.md
│   └── implementation-artifacts/
│
├── CAHIER_DES_CHARGES.md
├── CAHIER_DES_CHARGES_WORKFLOWS_N8N.md
├── package.json                            # Root package.json (workspaces)
├── turbo.json                              # Turborepo config (build pipeline)
├── tsconfig.base.json                      # TypeScript base config
├── .gitignore
├── .env.example
└── README.md
```

### 6.2 Mapping FRs → Structure

| FRs | Fichiers impactés |
|-----|-------------------|
| FR-C01..C10 (Core) | `apps/api/src/routes/auth.ts`, `middleware/auth.ts`, `middleware/tenant.ts`, `middleware/rbac.ts`, `services/authService.ts` |
| FR-A1-01..15 (Content) | `apps/api/src/routes/contentPieces.ts`, `services/contentService.ts`, `jobs/contentGenerationJob.ts`, `workflows/agent-1-content/` |
| FR-A2-01..09 (Ads) | `apps/api/src/routes/adCampaigns.ts`, `services/adCampaignService.ts`, `workflows/agent-2-amplification/` |
| FR-A3-01..12 (Leads) | `apps/api/src/routes/leads.ts`, `services/leadService.ts`, `workflows/agent-3-leads/` |
| FR-D01..07 (Dashboard) | `apps/dashboard/src/components/`, `hooks/`, `app/` |
| FR-S01..05 (System) | `workflows/utilities/`, `apps/api/src/lib/` |

---

## 7. Docker Compose Architecture

### 7.1 Services

```yaml
# docker/docker-compose.yml
version: "3.8"

services:
  mkt-postgres:
    image: postgres:16-alpine
    container_name: mkt-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - mkt-postgres-data:/var/lib/postgresql/data
      - ./postgres/init-rls.sql:/docker-entrypoint-initdb.d/init-rls.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - mkt-network

  mkt-redis:
    image: redis:7-alpine
    container_name: mkt-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - mkt-redis-data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - mkt-network

  mkt-minio:
    image: minio/minio:latest
    container_name: mkt-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - mkt-minio-data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - mkt-network

  mkt-api:
    build:
      context: ../
      dockerfile: apps/api/Dockerfile
    container_name: mkt-api
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@mkt-postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@mkt-redis:6379
      - NODE_ENV=${NODE_ENV}
    ports:
      - "4000:4000"
    depends_on:
      mkt-postgres:
        condition: service_healthy
      mkt-redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
    networks:
      - mkt-network

  mkt-dashboard:
    build:
      context: ../
      dockerfile: apps/dashboard/Dockerfile
    container_name: mkt-dashboard
    environment:
      - NEXT_PUBLIC_API_URL=http://mkt-api:4000
    ports:
      - "3000:3000"
    depends_on:
      mkt-api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 15s
      timeout: 5s
      retries: 3
    networks:
      - mkt-network

  mkt-n8n:
    image: n8nio/n8n:latest
    container_name: mkt-n8n
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=mkt-postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=${N8N_DB:-n8n}
      - DB_POSTGRESDB_USER=${POSTGRES_USER}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - WEBHOOK_URL=${N8N_WEBHOOK_URL}
    volumes:
      - mkt-n8n-data:/home/node/.n8n
    ports:
      - "5678:5678"
    depends_on:
      mkt-postgres:
        condition: service_healthy
      mkt-redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5678/healthz"]
      interval: 15s
      timeout: 5s
      retries: 3
    networks:
      - mkt-network

  mkt-nginx:
    image: nginx:alpine
    container_name: mkt-nginx
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      mkt-api:
        condition: service_healthy
      mkt-dashboard:
        condition: service_healthy
      mkt-n8n:
        condition: service_healthy
    networks:
      - mkt-network

volumes:
  mkt-postgres-data:
  mkt-redis-data:
  mkt-minio-data:
  mkt-n8n-data:

networks:
  mkt-network:
    driver: bridge
```

### 7.2 Variables d'environnement requises

```bash
# Database
POSTGRES_DB=synap6ia_marketing
POSTGRES_USER=mkt_user
POSTGRES_PASSWORD=<strong_password>

# Redis
REDIS_PASSWORD=<strong_password>

# MinIO
MINIO_ACCESS_KEY=<access_key>
MINIO_SECRET_KEY=<secret_key>

# n8n
N8N_ENCRYPTION_KEY=<random_32_chars>
N8N_WEBHOOK_URL=https://yourdomain.com/webhooks/n8n

# AI
AI_CLAUDE_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=<api_key>
OPENAI_API_KEY=<api_key>

# Auth
JWT_SECRET=<random_64_chars>
JWT_REFRESH_SECRET=<random_64_chars>

# App
NODE_ENV=production
APP_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com

# External services
SLACK_BOT_TOKEN=<token>
RESEND_API_KEY=<api_key>
CALCOM_API_KEY=<api_key>
STRIPE_SECRET_KEY=<api_key>
```

---

## 8. Architecture Validation

### 8.1 Coherence Check

| Validation | Statut | Notes |
|-----------|--------|-------|
| Stack frontend cohérente (Next.js 16 + React 19 + TS 5.x + Tailwind v4) | ✅ | Versions compatibles |
| Stack backend cohérente (Node 20+ + Express 4 + Prisma + TypeScript) | ✅ | Pattern éprouvé soc-autopilot-hub |
| Infrastructure Docker cohérente (Compose 3.8, health checks, single network) | ✅ | Pattern éprouvé soc-autopilot-hub |
| Multi-tenant (RLS + middleware + Prisma) cohérent | ✅ | Triple protection |
| Communication inter-services (REST + WS + Redis pub/sub + webhooks) | ✅ | Chaque canal a un rôle clair |
| 25 workflows n8n mappés aux FRs | ✅ | Couverture complète agents 1-3 + utils |
| Types partagés (packages/shared) | ✅ | Évite la duplication frontend ↔ backend |

### 8.2 Requirements Coverage

| PRD Section | Architecture Coverage |
|------------|----------------------|
| FR-C01..10 (Core) | ✅ Auth middleware, tenant middleware, RBAC, routes, services |
| FR-A1-01..15 (Content) | ✅ Routes, services, jobs, 9 workflows n8n, MinIO storage |
| FR-A2-01..09 (Ads) | ✅ Routes, services, 6 workflows n8n, approval gate |
| FR-A3-01..12 (Leads) | ✅ Routes, services, 7 workflows n8n, multi-canal nurturing |
| FR-D01..07 (Dashboard) | ✅ Next.js pages, components, hooks, WebSocket, SSE |
| FR-S01..05 (System) | ✅ 4 workflows utilitaires, Redis pub/sub, agent_messages |
| NFR-P01..05 (Performance) | ✅ Bull queue, Socket.io, SSE, scheduler architecture |
| NFR-S01..08 (Security) | ✅ JWT, RBAC, RLS, AES-256-GCM, Helmet, rate limit, CORS |
| NFR-SC01..04 (Scalability) | ✅ Docker, Bull concurrency, RLS 100+ tenants, MinIO |
| NFR-R01..05 (Reliability) | ✅ Retry backoff, health checks, error format, DLQ |
| NFR-CO01..03 (Compliance) | ✅ RGPD cascade delete, audit trail ai_learning_log |

### 8.3 Implementation Readiness Checklist

| Critère | Statut |
|---------|--------|
| Stack technique entièrement décidée | ✅ |
| Naming conventions complètes et sans ambiguïté | ✅ |
| API response format standardisé | ✅ |
| Error handling pattern défini | ✅ |
| Middleware stack order défini | ✅ |
| Prisma model pattern défini | ✅ |
| React component pattern défini | ✅ |
| WebSocket event naming convention définie | ✅ |
| n8n workflow conventions définies | ✅ |
| Docker Compose architecture définie | ✅ |
| Project structure complète (directory tree) | ✅ |
| Types partagés identifiés | ✅ |
| Variables d'environnement documentées | ✅ |
| FR → fichier mapping clair | ✅ |

---

*Document généré selon la méthode BMAD v6.0.0-Beta.7 — Agent Architect (Winston)*
*Input : PRD (58 FRs, 25 NFRs) + 2 cahiers des charges (1,563 lignes) + Product Brief*
*Décisions architecturales : 35+ | Patterns d'implémentation : 10 | Validation : 3 axes*
