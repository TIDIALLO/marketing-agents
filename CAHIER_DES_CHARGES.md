# Cahier des Charges - Plateforme Marketing AI Synap6ia

**Version**: 1.0
**Date**: 2026-02-04
**Statut**: Spécification technique complète
**Langue de la documentation**: Français
**Interface utilisateur**: Bilingue FR/EN

---

## 1. Synthèse Exécutive

### 1.1 Vision du Projet

Synap6ia Marketing est une plateforme d'automatisation marketing pilotée par intelligence artificielle. Elle orchestre 3 agents AI spécialisés via n8n pour couvrir l'intégralité du cycle marketing : création de contenu, amplification publicitaire et conversion de leads.

La plateforme est conçue pour un usage interne immédiat, avec une architecture multi-tenant dès le départ permettant une revente future en mode white-label.

### 1.2 Les 3 Agents AI

| Agent | Nom | Rôle Principal |
|-------|-----|----------------|
| **Agent 1** | Content Flywheel | Création → Adaptation → Publication → Tracking → Signaux gagnants |
| **Agent 2** | Amplification Engine | Veille concurrentielle → Créatives pub → Campagnes ads → Scaling |
| **Agent 3** | Opportunity Hunter | Ingestion leads → Qualification AI → Nurturing → Booking d'appels |

### 1.3 Boucles de Feedback Inter-Agents

```
Agent 1 ──(content_signals)──→ Agent 2 : contenu performant → amplifié en pub
Agent 2 ──(ad_leads)──────────→ Agent 3 : leads des pubs → pipeline conversion
Agent 3 ──(conversion_data)──→ Agent 1 : insights sur ce qui convertit réellement
Agent 3 ──(pain_points)──────→ Agent 1 : sujets de contenu basés sur vrais besoins
Agent 2 ──(ad_performance)───→ Agent 1 : quels messages marchent en paid
```

Ces boucles créent un système auto-améliorant où chaque agent nourrit les autres.

---

## 2. Stack Technique

### 2.1 Frontend
| Technologie | Version | Usage |
|-------------|---------|-------|
| Next.js | 16 | Framework React SSR/SSG |
| React | 19 | Bibliothèque UI |
| TypeScript | 5.x | Typage statique |
| TailwindCSS | v4 | Styling utilitaire |
| shadcn/ui | latest | Composants UI |
| Recharts | latest | Graphiques et visualisations |
| next-intl | latest | Internationalisation FR/EN |

### 2.2 Backend
| Technologie | Version | Usage |
|-------------|---------|-------|
| Node.js | 20+ LTS | Runtime serveur |
| Express.js | 4.x | Framework API REST |
| Zod | latest | Validation de schémas |
| Prisma | latest | ORM principal |
| Bull | latest | Job queue (Redis-backed) |
| bcrypt + JWT | latest | Authentification |

### 2.3 Infrastructure
| Composant | Version | Usage |
|-----------|---------|-------|
| PostgreSQL | 16 | Base de données principale |
| Redis | 7 | Cache, pub/sub inter-agents, queues |
| n8n | latest | Orchestration workflows (~25 workflows) |
| MinIO | latest | Stockage média S3-compatible |
| Nginx | latest | Reverse proxy + SSL termination |
| Docker Compose | 3.8 | Conteneurisation |
| Let's Encrypt | - | Certificats SSL automatiques |
| GitHub Actions | - | CI/CD pipeline |

### 2.4 Services AI
| Service | Fournisseur | Usage |
|---------|-------------|-------|
| Claude API | Anthropic | Génération de contenu, analyse, qualification leads |
| DALL-E 3 | OpenAI | Visuels sociaux et créatives publicitaires |
| Whisper | OpenAI | Transcription audio (notes vocales) |
| text-embedding-3-small | OpenAI | Embeddings pour recherche sémantique |

### 2.5 Intégrations Externes
| Service | Usage |
|---------|-------|
| LinkedIn Marketing APIs | Publication + métriques organiques |
| Facebook Graph API v19+ | Publication + métriques + Facebook Ads |
| Instagram Graph API | Publication + métriques |
| TikTok Content Posting API | Publication + TikTok Ads |
| Twitter/X API v2 | Publication + métriques |
| Google Ads API | Campagnes search/display |
| Stripe | Paiements internationaux (EUR) |
| Orange Money / Wave | Paiements mobile money (XOF) |
| WhatsApp Business Cloud API | Notifications + nurturing leads |
| Resend / SMTP | Email transactionnel + marketing |
| Cal.com / Google Calendar | Booking d'appels qualifiés |
| Slack | Notifications internes + approbations |

---

## 3. Architecture Globale

### 3.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    NGINX Reverse Proxy                       │
│                  (SSL + Load Balancing)                       │
├────────────┬────────────┬───────────────┬───────────────────┤
│            │            │               │                   │
│  Next.js   │ Express.js │   n8n         │   MinIO           │
│  Dashboard │ API        │   (Marketing) │   (Media Storage) │
│  :3000     │ :4000      │   :5678       │   :9000           │
│            │            │               │                   │
├────────────┴────────────┴───────────────┴───────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │ Redis        │  │ Bull Queue   │      │
│  │ 16           │  │ 7            │  │ (via Redis)  │      │
│  │ :5432        │  │ :6379        │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│              Docker Network: mkt-network                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Communication Inter-Services

- **API ↔ Dashboard** : REST API + WebSocket (notifications temps réel)
- **API ↔ n8n** : Webhooks bidirectionnels + API REST n8n
- **n8n ↔ DB** : Connexion PostgreSQL directe (pg driver)
- **Inter-Agents** : Redis pub/sub (channels: `agent:1:signals`, `agent:2:leads`, `agent:3:insights`)
- **Jobs asynchrones** : Bull queue via Redis (génération contenu, envoi emails, collecte métriques)

### 3.3 Multi-Tenant

L'architecture multi-tenant est implémentée via :
- Colonne `tenant_id` sur toutes les tables de données
- Row-Level Security (RLS) PostgreSQL
- Middleware Express.js d'injection tenant
- Isolation des credentials API par tenant
- Branding personnalisable par tenant (white-label)

---

## 4. Modèle de Données

### 4.1 Vue d'Ensemble - 6 Domaines, ~25 Tables

| Domaine | Tables | Description |
|---------|--------|-------------|
| **Core** | tenants, organizations, brands, products, social_accounts, ad_accounts | Entités métier fondamentales |
| **Content** (Agent 1) | content_pillars, content_inputs, content_pieces, content_schedule, content_metrics, content_signals | Pipeline de contenu complet |
| **Advertising** (Agent 2) | ad_campaigns, ad_sets, ad_creatives, ad_metrics, competitor_ads | Gestion publicitaire |
| **Leads** (Agent 3) | leads, lead_interactions, lead_sequences, lead_sequence_enrollments, calendar_bookings | Pipeline de conversion |
| **Analytics** | daily_analytics, ai_learning_log | Données analytiques agrégées |
| **System** | platform_users, approval_queue | Utilisateurs et workflows d'approbation |

Voir `docs/02_schema_base_donnees.md` pour le schéma complet et `schemas/init-db.sql` pour le script SQL.

---

## 5. Les 3 Agents en Détail

### 5.1 Agent 1 - Content Flywheel

**Mission** : Transformer des inputs bruts en contenu multi-format publié et suivi.

**Pipeline** :
1. **Ingestion** : Texte libre, notes vocales (Whisper), URLs, transcripts
2. **Recherche** : Tendances secteur, analyse concurrence, niches identifiées
3. **Génération** : Claude produit le contenu, DALL-E génère les visuels
4. **Approbation** : Circuit via Slack, WhatsApp ou email
5. **Adaptation** : Un contenu → 5+ variantes (LinkedIn article, tweet thread, reel script, carousel, story)
6. **Publication** : Automatique aux heures optimales par plateforme
7. **Tracking** : Collecte métriques toutes les 2h (impressions, engagement, clics)
8. **Signaux** : Détection des contenus gagnants → alimentation Agent 2

**Workflows n8n** : MKT-101 à MKT-109

### 5.2 Agent 2 - Amplification Engine

**Mission** : Amplifier les contenus gagnants et gérer les campagnes publicitaires.

**Pipeline** :
1. **Veille** : Scraping Facebook Ad Library, analyse concurrentielle
2. **Proposition** : Claude génère stratégie de campagne (ciblage, budget, créatives)
3. **Approbation** : Gate humaine obligatoire pour les dépenses pub
4. **Lancement** : Création automatique des campagnes sur Facebook/Google/TikTok Ads
5. **Monitoring** : Collecte métriques toutes les 4h (CPC, CPM, ROAS, conversions)
6. **Optimisation** : Pause des sous-performants, scaling des gagnants, A/B test créatives

**Workflows n8n** : MKT-201 à MKT-206

### 5.3 Agent 3 - Opportunity Hunter

**Mission** : Capturer, qualifier et convertir les leads en clients.

**Pipeline** :
1. **Ingestion** : Webhooks formulaires, leads pubs, inscriptions webinaires, contacts manuels
2. **Qualification** : Scoring AI multi-critères (budget, timing, fit produit, engagement)
3. **Nurturing** : Séquences personnalisées email + WhatsApp
4. **Analyse** : Détection sentiment, intention d'achat, objections
5. **Booking** : Proposition automatique de créneaux pour appels qualifiés
6. **Escalation** : Transfert aux commerciaux avec contexte complet
7. **Attribution** : Tracking conversion + attribution multi-touch

**Workflows n8n** : MKT-301 à MKT-307

---

## 6. API REST

~80 endpoints organisés en modules. Voir `docs/04_api_endpoints.md` pour la documentation complète.

### 6.1 Modules API

| Module | Préfixe | Endpoints |
|--------|---------|-----------|
| Auth | `/api/auth` | 6 endpoints |
| Organizations | `/api/organizations` | 5 endpoints |
| Brands | `/api/brands` | 6 endpoints |
| Products | `/api/products` | 5 endpoints |
| Social Accounts | `/api/social-accounts` | 8 endpoints |
| Content Pillars | `/api/content/pillars` | 5 endpoints |
| Content Pieces | `/api/content/pieces` | 8 endpoints |
| Content Schedule | `/api/content/schedule` | 5 endpoints |
| Content Metrics | `/api/content/metrics` | 4 endpoints |
| Ad Campaigns | `/api/ads/campaigns` | 7 endpoints |
| Ad Creatives | `/api/ads/creatives` | 5 endpoints |
| Leads | `/api/leads` | 8 endpoints |
| Lead Sequences | `/api/leads/sequences` | 6 endpoints |
| Calendar | `/api/calendar` | 4 endpoints |
| Analytics | `/api/analytics` | 5 endpoints |
| Approvals | `/api/approvals` | 4 endpoints |
| Webhooks (n8n) | `/api/webhooks` | 6 endpoints (internes) |
| Admin/Tenant | `/api/admin/tenants` | 5 endpoints |

---

## 7. Interface Dashboard

### 7.1 Pages Principales

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Authentification |
| Dashboard | `/` | Vue d'ensemble des 3 agents |
| Contenu | `/content` | Gestion Content Flywheel |
| Calendrier | `/content/calendar` | Planning éditorial |
| Publicités | `/ads` | Gestion Amplification Engine |
| Leads | `/leads` | Pipeline Opportunity Hunter |
| Analytics | `/analytics` | Tableaux de bord analytiques |
| Approbations | `/approvals` | File d'attente d'approbation |
| Marques | `/brands` | Gestion des marques/produits |
| Réglages | `/settings` | Configuration compte et intégrations |

### 7.2 Composants Clés

- **AgentStatusCard** : État temps réel de chaque agent
- **ContentPipeline** : Kanban visuel du pipeline contenu
- **AdPerformanceChart** : Graphiques ROAS, CPC, CPM (Recharts)
- **LeadFunnel** : Entonnoir de conversion interactif
- **ApprovalModal** : Interface d'approbation rapide (approve/reject/edit)
- **CalendarView** : Calendrier éditorial drag-and-drop
- **MetricsDashboard** : KPIs temps réel avec sparklines

Voir `docs/05_frontend_dashboard.md` pour les spécifications UI complètes.

---

## 8. Sécurité et Conformité

### 8.1 Authentification et Autorisation
- JWT avec refresh tokens (access: 15min, refresh: 7j)
- RBAC : Owner, Admin, Editor, Viewer
- Rate limiting par tier (auth: 10/15min, API: 100/15min)
- CORS strict avec whitelist d'origines

### 8.2 Protection des Données
- Chiffrement at-rest (PostgreSQL TDE)
- Chiffrement in-transit (TLS 1.3 everywhere)
- Tokens API chiffrés en base (AES-256-GCM)
- Rotation automatique des tokens OAuth

### 8.3 Conformité RGPD
- Consentement explicite pour chaque lead
- Droit à l'effacement (endpoint dédié)
- Portabilité des données (export JSON/CSV)
- Registre des traitements documenté
- DPO contact défini
- Durée de rétention configurable par type de donnée

Voir `docs/09_securite_rgpd.md` pour les détails complets.

---

## 9. Roadmap de Développement

### Phase 0 - Fondation
- Infrastructure Docker complète
- Base de données + migrations Prisma
- Authentification + RBAC
- CRUD marques/produits/comptes sociaux
- Dashboard skeleton

### Phase 1 - MVP (Agent 1)
- Content Flywheel complet
- LinkedIn + Facebook publishing
- Circuit d'approbation
- Collecte métriques
- Détection signaux gagnants

### Phase 2 - V1 (Agent 3)
- Opportunity Hunter complet
- Instagram + Twitter publishing
- Pipeline lead complet (ingestion → booking)
- Séquences de nurturing

### Phase 3 - V2 (Agent 2)
- Amplification Engine complet
- TikTok publishing
- Facebook/Google/TikTok Ads
- Boucles de feedback inter-agents
- Analytics avancés

### Phase 4 - Hardening
- Monitoring et alerting (Prometheus/Grafana)
- Error handling robuste
- Tests E2E + intégration
- Documentation API (Swagger/OpenAPI)
- Audit sécurité

### Phase 5 - Scale
- Multi-tenant white-label
- Google Ads integration
- AI voice calls
- Application mobile (React Native)
- Marketplace de templates

Voir `docs/10_roadmap_developpement.md` pour le détail de chaque phase.

---

## 10. Documents Associés

| Document | Chemin | Description |
|----------|--------|-------------|
| Architecture Système | `docs/01_architecture_systeme.md` | Architecture globale + diagrammes |
| Schéma Base de Données | `docs/02_schema_base_donnees.md` | Schéma SQL complet + explications |
| Workflows n8n | `docs/03_workflows_n8n.md` | ~25 workflows détaillés |
| API Endpoints | `docs/04_api_endpoints.md` | API REST complète (~80 endpoints) |
| Frontend Dashboard | `docs/05_frontend_dashboard.md` | Pages + composants UI |
| Intégration Réseaux Sociaux | `docs/06_integration_reseaux_sociaux.md` | APIs LinkedIn/FB/IG/TikTok/X |
| Intégration AI | `docs/07_integration_ai.md` | Architecture Claude + OpenAI |
| Flux de Données Agents | `docs/08_flux_donnees_agents.md` | Data flows + feedback loops |
| Sécurité et RGPD | `docs/09_securite_rgpd.md` | Sécurité + conformité |
| Roadmap Développement | `docs/10_roadmap_developpement.md` | 5 phases MVP→Scale |
| Multi-Tenant White-Label | `docs/11_multi_tenant_whitelabel.md` | Architecture multi-tenant |
| Script SQL Init | `schemas/init-db.sql` | Initialisation base de données |
| Schéma Prisma | `schemas/schema.prisma` | Schéma ORM complet |
| Docker Compose | `docker/docker-compose.yml` | Stack de développement |
| Variables d'Environnement | `docker/.env.example` | Configuration requise |

---

## 11. Conventions et Standards

### 11.1 Nommage
- **Base de données** : snake_case (tables, colonnes)
- **API** : camelCase (JSON), kebab-case (URLs)
- **Code** : camelCase (variables, fonctions), PascalCase (composants React, classes)
- **Workflows n8n** : MKT-{agent_number}{sequence} (ex: MKT-103)
- **Docker** : mkt-* préfixe pour tous les containers

### 11.2 Gestion d'Erreurs
- Codes HTTP standards (200, 201, 400, 401, 403, 404, 422, 429, 500)
- Format d'erreur uniforme : `{ success: false, error: { code, message, details } }`
- Logging structuré (JSON) avec correlation ID
- Retry automatique avec backoff exponentiel pour les APIs externes

### 11.3 Internationalisation
- Interface bilingue FR/EN via next-intl
- Contenu généré multilingue (selon configuration marque)
- Messages d'erreur localisés
- Formats de date/nombre selon la locale

---

*Ce document est la synthèse exécutive. Chaque aspect est détaillé dans les documents techniques associés dans le dossier `docs/`.*
