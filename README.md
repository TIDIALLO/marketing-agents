# Synap6ia Marketing Engine

Plateforme d'automatisation marketing pilotee par IA pour vendre [SOC Autopilot Hub](https://synap6ia.com). Trois agents specialises orchestres via n8n dans un monorepo Turborepo.

## Agents

| Agent | Nom | Mission |
|-------|-----|---------|
| Agent 1 | **Content Flywheel** | Creation > Adaptation > Publication > Tracking > Signaux gagnants |
| Agent 2 | **Amplification Engine** | Veille concurrentielle > Creatives pub > Campagnes ads > Scaling |
| Agent 3 | **Opportunity Hunter** | Ingestion leads > Qualification AI > Nurturing > Booking d'appels |

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 15 + React 19 + Tailwind CSS 4 |
| Backend | Express.js 4 + TypeScript 5.7 |
| Base de donnees | PostgreSQL 16 (Prisma ORM) |
| Cache / Pub-Sub | Redis 7 |
| Workflows | n8n (26 workflows MKT-101 a MKT-404) |
| IA | Claude API (contenu/emails) + OpenAI (DALL-E/Whisper) |
| Email | Resend |
| Reverse proxy | Nginx |
| Monorepo | Turborepo |

## Architecture

```
agents-marketing/
  apps/
    api/            # Express.js REST API (port 4100)
    dashboard/      # Next.js dashboard (port 3100)
  packages/
    shared/         # Types, constantes, utilitaires partages
  workflows/        # 26 definitions de workflows n8n (JSON)
  docker/           # Docker Compose, Dockerfiles, Nginx
```

## Modeles de donnees (30)

**Auth** : PlatformUser, PasswordResetToken
**Marque** : Brand, Product, LandingPage
**Contenu** : ContentPillar, ContentInput, ContentPiece, ContentSchedule, ContentMetrics, ContentSignal
**Leads** : Lead, CalendarBooking, LeadSequence, LeadSequenceEnrollment, LeadInteraction
**Publicite** : SocialAccount, AdAccount, AdCampaign, AdSet, AdCreative, AdMetrics, CompetitorAd
**Email** : EmailTemplate, EmailCampaign
**Systeme** : AiLearningLog, DailyAnalytics, AgentMessage, WorkflowError, ApprovalQueue

## Demarrage rapide

### Prerequis

- Node.js >= 20
- Docker & Docker Compose
- npm >= 10

### 1. Cloner et installer

```bash
git clone https://github.com/TIDIALLO/marketing-agents.git
cd marketing-agents
npm install
```

### 2. Configurer l'environnement

```bash
cp .env.example apps/api/.env
# Editer apps/api/.env avec vos valeurs
```

### 3. Demarrer l'infrastructure

```bash
cd docker
cp .env.example .env
docker compose up -d
```

Services lances :
- **PostgreSQL** : `localhost:5433`
- **Redis** : `localhost:6380`
- **n8n** : `localhost:5679`
- **Nginx** : `localhost:80`

### 4. Initialiser la base de donnees

```bash
cd apps/api
npx prisma db push
npx tsx prisma/seed.ts
```

### 5. Lancer les applications

```bash
# Depuis la racine
npm run dev
```

- **API** : http://localhost:4100
- **Dashboard** : http://localhost:3100

Compte admin par defaut : `admin@synap6ia.com` / `Admin123!`

## Tests

```bash
# Tous les tests (532 tests, 76 fichiers)
npm test

# Par workspace
npm run test --filter=@synap6ia/api       # 390 tests unitaires + 38 E2E
npm run test --filter=@synap6ia/dashboard  # 74 tests
npm run test --filter=@synap6ia/shared     # 30 tests

# E2E uniquement
cd apps/api && npm run test:e2e

# Type-checking
npx turbo lint
```

## Deploiement production

```bash
cd docker
cp .env.prod.example .env.prod
# Editer .env.prod avec les vraies valeurs

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## Workflows n8n (26)

| Groupe | IDs | Role |
|--------|-----|------|
| Content Flywheel | MKT-101 a 109 | Generation, adaptation, publication, signaux |
| Amplification Engine | MKT-201 a 206 | Veille, creatives, campagnes, scaling |
| Opportunity Hunter | MKT-301 a 307 | Leads, qualification, nurturing, booking |
| Utilities | MKT-401 a 404 | Health check, reporting, cleanup, learning |

## Routes API

| Groupe | Prefix |
|--------|--------|
| Auth | `/api/auth` |
| Brands | `/api/brands` |
| Products | `/api/products` |
| Content | `/api/content` |
| Leads | `/api/leads` |
| Nurturing | `/api/leads/nurturing` |
| Landing Pages | `/api/landing-pages` |
| Email Marketing | `/api/email-marketing` |
| Advertising | `/api/advertising` |
| Analytics | `/api/analytics` |
| Approval | `/api/approval` |
| Settings | `/api/settings` |
| System | `/api/system` |
| Webhooks | `/api/webhooks` |
| n8n Internal | `/api/internal` |
| Public pages | `/p/:slug` |

## Statut

- [x] Cahier des charges complet
- [x] BMAD installe (v6.0.0-Beta.7)
- [x] Product Brief
- [x] PRD (Product Requirements Document)
- [x] Architecture Document
- [x] Epics & Stories (10 epics, 62 stories)
- [x] Implementation (30 modeles, 21 routes, 26 services, 26 workflows)
- [x] Tests (532 tests, 76 fichiers)
- [x] Docker (dev + prod)
- [x] Dashboard (20 pages, i18n FR/EN)
