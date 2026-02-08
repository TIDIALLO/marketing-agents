---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - CAHIER_DES_CHARGES.md
  - CAHIER_DES_CHARGES_WORKFLOWS_N8N.md
date: 2026-02-07
author: Synap6ia
---

# Product Brief: Synap6ia Marketing

## Executive Summary

Synap6ia Marketing est un autopilot marketing piloté par IA qui orchestre 3 agents spécialisés pour couvrir l'intégralité du cycle marketing digital : création de contenu, amplification publicitaire et conversion de leads. La plateforme cible les PME et agences marketing en Afrique de l'Ouest et en France qui n'ont ni le temps, ni les ressources pour gérer efficacement leur présence digitale multi-canal.

Là où les outils existants (Buffer, Hootsuite, HubSpot) traitent chaque fonction en silo, Synap6ia Marketing crée un système auto-améliorant grâce à des boucles de feedback inter-agents : le contenu qui performe est automatiquement amplifié en pub, les leads générés sont qualifiés et nurturés par IA, et les données de conversion remontent pour orienter la création de contenu future.

L'architecture multi-tenant et white-label dès le départ permet un usage interne immédiat puis une revente SaaS à d'autres entreprises et agences.

---

## Core Vision

### Problem Statement

Les PME et agences marketing font face à un trilemme : le marketing digital exige une présence multi-canal constante (LinkedIn, Facebook, Instagram, TikTok, Twitter), une optimisation publicitaire quotidienne, et un suivi rigoureux des leads — mais elles manquent de budget pour embaucher un content manager, un media buyer et un SDR. Le résultat : du contenu produit sans stratégie, des budgets pub gaspillés sans optimisation, et des leads qui tombent dans l'oubli faute de suivi.

### Problem Impact

- **Temps perdu** : 15-20h/semaine de travail marketing manuel répétitif
- **Opportunités manquées** : Leads non suivis dans les premières heures (taux de conversion chute de 80% après 1h)
- **Budget gaspillé** : Campagnes pub non optimisées, ROAS sous-performant
- **Incohérence** : Messages inconsistants entre les canaux, pas de stratégie unifiée
- **Marché sous-desservi** : Les outils existants ne supportent pas les paiements mobile money (Orange Money, Wave) ni les spécificités du marché ouest-africain

### Why Existing Solutions Fall Short

| Solution | Limitation |
|----------|-----------|
| **Buffer / Hootsuite** | Publication uniquement, pas de création IA, pas de qualification de leads, pas d'optimisation pub |
| **HubSpot** | Complet mais coûteux (800€+/mois), pas adapté au marché africain, pas d'agents IA autonomes |
| **Jasper / Copy.ai** | Génération de texte uniquement, pas d'orchestration multi-canal ni de boucles de feedback |
| **Meta Business Suite** | Limité à Facebook/Instagram, pas de qualification de leads IA |
| **Solutions locales** | Fragmentées, pas d'automatisation IA, pas de vision unifiée |

Aucune solution n'offre un système intégré où 3 agents IA se nourrissent mutuellement pour créer un cycle vertueux création → amplification → conversion.

### Proposed Solution

Trois agents IA orchestrés via n8n, supervisés par l'humain uniquement aux points d'approbation critiques :

- **Agent 1 — Content Flywheel** : Transforme un input brut (texte, audio, URL) en contenu multi-plateforme publié aux heures optimales, puis détecte les contenus gagnants
- **Agent 2 — Amplification Engine** : Amplifie les contenus performants en campagnes pub Facebook/Google/TikTok Ads, avec optimisation quotidienne automatique
- **Agent 3 — Opportunity Hunter** : Capture, qualifie et nurture les leads par email + WhatsApp, puis boooke des appels commerciaux pour les leads chauds

Le tout sur une architecture multi-tenant permettant le white-label et la revente SaaS.

### Key Differentiators

1. **Boucles de feedback inter-agents** — Système auto-améliorant unique sur le marché : ce qui convertit en leads oriente la création de contenu, ce qui performe en organique est amplifié en pub
2. **Marché Afrique de l'Ouest natif** — WhatsApp Business, Orange Money, Wave intégrés nativement ; bilingue FR/EN
3. **IA hybride Claude + OpenAI** — Meilleur modèle pour chaque tâche (Claude pour texte/analyse, DALL-E pour visuels, Whisper pour audio)
4. **White-label dès le départ** — Architecture multi-tenant RLS permettant la revente immédiate aux agences
5. **Supervision humaine minimale** — L'humain n'intervient que pour approuver les publications et les dépenses pub

## Target Users

### Primary Users

#### Persona 1 : Amadou — Fondateur PME (Dakar)
- **Profil** : 35 ans, dirige une agence immobilière de 12 personnes au Sénégal
- **Contexte** : Gère le marketing lui-même en plus de tout le reste. Poste quand il y pense sur Facebook et LinkedIn
- **Douleur** : Perd 3-4h/semaine à créer du contenu médiocre, ne suit pas ses leads, n'a jamais lancé de pub payante par manque de temps et d'expertise
- **Objectif** : Avoir une présence digitale professionnelle et constante sans y penser
- **Moment "aha!"** : Voit son premier post généré par l'IA obtenir 10x plus d'engagement que ses posts manuels, et un lead qualifié lui est proposé en appel dans la foulée

#### Persona 2 : Sophie — Responsable Marketing (Abidjan)
- **Profil** : 28 ans, seule responsable marketing d'une chaîne de restaurants (3 établissements)
- **Contexte** : Utilise Canva + Buffer + Excel. Jongle entre 5 réseaux sociaux, gère les pubs Facebook manuellement, pas de CRM
- **Douleur** : Noyée dans l'opérationnel, pas le temps pour la stratégie. Les leads des pubs Facebook finissent dans un fichier Excel jamais relancé
- **Objectif** : Automatiser le répétitif pour se concentrer sur la stratégie et les relations clients
- **Moment "aha!"** : L'Agent 3 a relancé automatiquement 15 leads WhatsApp pendant la nuit, 3 ont booké un appel

#### Persona 3 : Marc — Directeur d'Agence Marketing (Paris)
- **Profil** : 42 ans, dirige une agence de 8 personnes, gère 12 clients
- **Contexte** : Son équipe passe 70% du temps sur de la production de contenu répétitive. Utilise HubSpot mais le coût explose avec le nombre de clients
- **Douleur** : Ne peut pas scaler sans recruter, les marges s'érodent, chaque nouveau client = plus de travail manuel
- **Objectif** : Servir 3x plus de clients avec la même équipe grâce au white-label
- **Moment "aha!"** : Onboarde un nouveau client en 30 min, l'Agent 1 produit les 20 premiers contenus du mois en une après-midi

### Secondary Users

#### Persona 4 : Fatou — Commerciale terrain
- **Profil** : Utilise le dashboard pour consulter les leads qualifiés et les briefings IA avant ses appels
- **Interaction** : Reçoit des notifications WhatsApp/Slack quand un lead chaud est prêt, consulte le briefing IA, ferme la vente

#### Persona 5 : Admin / Owner du tenant
- **Profil** : Configure les marques, connecte les comptes sociaux et pub, gère les permissions RBAC
- **Interaction** : Approuve les contenus et campagnes pub via Slack ou le dashboard

### User Journey

**Amadou (Fondateur PME) — Parcours type :**

1. **Découverte** : Voit une démo sur LinkedIn ou via le bouche-à-oreille (marché Dakar)
2. **Onboarding** : Crée son compte, connecte sa page Facebook et LinkedIn, décrit sa marque et son audience en 10 min
3. **Premier contenu** : Dicte une note vocale sur son téléphone → l'Agent 1 la transforme en post LinkedIn + carousel Instagram → il approuve d'un clic sur Slack
4. **Valeur immédiate** : En 48h, 5 contenus publiés automatiquement aux bonnes heures
5. **Boucle vertueuse** : Après 2 semaines, l'Agent 1 détecte que ses posts sur "investissement immobilier Dakar" performent 3x mieux → l'Agent 2 propose une campagne pub ciblée → les leads arrivent → l'Agent 3 les qualifie et propose des RDV
6. **Routine** : Amadou passe 20 min/semaine à approuver le contenu et consulter ses KPIs, au lieu de 15h de travail manuel
