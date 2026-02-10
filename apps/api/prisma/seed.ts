import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('Seeding database...');

  // ─── User (single owner) ──────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', BCRYPT_ROUNDS);

  const admin = await prisma.platformUser.upsert({
    where: { email: 'admin@synap6ia.com' },
    update: {},
    create: {
      id: 'seed-user-001',
      email: 'admin@synap6ia.com',
      passwordHash: adminHash,
      firstName: 'Amadou',
      lastName: 'Diallo',
      role: 'owner',
    },
  });
  console.log(`  User (owner): ${admin.email} / Admin123!`);

  // ─── Brand ───────────────────────────────────────────────────
  const brand = await prisma.brand.upsert({
    where: { id: 'seed-brand-001' },
    update: {},
    create: {
      id: 'seed-brand-001',
      userId: admin.id,
      name: 'Synap6ia',
      brandVoice: 'Expert technique mais accessible. Ton confiant et orienté résultats. Nous parlons le langage des CTOs et DSI qui veulent sécuriser leur infrastructure sans complexité.',
      targetAudience: 'CTOs, DSI, RSSI et responsables IT de PME en Afrique de l\'Ouest (Sénégal, Côte d\'Ivoire) et France. Entreprises de 10 à 500 employés cherchant à automatiser leur cybersécurité.',
      contentGuidelines: 'Toujours inclure un CTA vers la démo ou le site. Mettre en avant le ROI et les gains de temps. Éviter le jargon cyber excessif — rester concret avec des cas d\'usage.',
    },
  });
  console.log(`  Brand: ${brand.name}`);

  // ─── Product: SOC Autopilot Hub ───────────────────────────────
  const product = await prisma.product.upsert({
    where: { id: 'seed-product-001' },
    update: {},
    create: {
      id: 'seed-product-001',
      brandId: brand.id,
      name: 'SOC Autopilot Hub',
      slug: 'soc-autopilot-hub',
      tagline: 'Votre SOC automatisé, prêt en 24h',
      description: 'Plateforme SOC automatisée tout-en-un pour PME. Détection, réponse et conformité sans équipe cyber dédiée.',
      longDescription: `SOC Autopilot Hub est la première plateforme SOC entièrement automatisée conçue pour les PME africaines et françaises.

**Le problème** : Les PME sont les cibles #1 des cyberattaques, mais n'ont ni le budget ni l'expertise pour un SOC traditionnel (300K€/an minimum).

**Notre solution** :
- Déploiement en 24h, pas en 6 mois
- Détection automatique des menaces 24/7
- Réponse automatisée aux incidents
- Rapports de conformité (ISO 27001, RGPD) générés automatiquement
- Workflows n8n personnalisables pour votre contexte

**Résultats clients** :
- 95% des alertes traitées automatiquement
- Temps de détection moyen : 3 minutes (vs 197 jours industrie)
- Économie de 70% vs SOC traditionnel`,
      pricing: {
        plans: [
          { name: 'Starter', price: 299, currency: 'EUR', period: 'mois', features: ['Jusqu\'à 50 endpoints', 'Détection automatique', 'Dashboard temps réel', 'Support email'] },
          { name: 'Pro', price: 599, currency: 'EUR', period: 'mois', features: ['Jusqu\'à 200 endpoints', 'Tout Starter +', 'Réponse automatisée', 'Rapports conformité', 'Support prioritaire', 'API access'] },
          { name: 'Enterprise', price: null, currency: 'EUR', period: 'mois', features: ['Endpoints illimités', 'Tout Pro +', 'Déploiement on-premise', 'SLA 99.9%', 'Account manager dédié', 'Formations équipe'] },
        ],
      },
      features: [
        { icon: 'shield', title: 'Détection 24/7', description: 'Surveillance continue de votre infrastructure avec IA' },
        { icon: 'zap', title: 'Réponse automatique', description: 'Isolation et remédiation automatique des menaces' },
        { icon: 'clock', title: 'Déploiement 24h', description: 'Opérationnel en 24h, pas en 6 mois' },
        { icon: 'file-text', title: 'Conformité auto', description: 'Rapports ISO 27001 et RGPD générés automatiquement' },
        { icon: 'trending-down', title: '-70% coûts', description: '70% moins cher qu\'un SOC traditionnel' },
        { icon: 'users', title: 'Sans équipe cyber', description: 'Pas besoin de recruter des analystes SOC' },
      ],
      testimonials: [
        { name: 'Ibrahim Sow', company: 'DigiServ Dakar', role: 'CTO', quote: 'SOC Autopilot Hub nous a permis de passer notre audit de sécurité en 2 semaines. Avant, on ne savait même pas par où commencer.', avatar: null },
        { name: 'Mariama Camara', company: 'Soleil Media', role: 'DSI', quote: 'On a détecté et bloqué une tentative de ransomware automatiquement. Sans le SOC, on aurait perdu des semaines de données.', avatar: null },
        { name: 'Cheikh Fall', company: 'InnovLab Abidjan', role: 'CEO', quote: 'Le rapport de conformité RGPD généré automatiquement nous a fait gagner 3 mois de travail consultant.', avatar: null },
      ],
      ctaText: 'Demander une démo gratuite',
      ctaUrl: 'https://synap6ia.com/demo',
      isActive: true,
      sortOrder: 1,
    },
  });
  console.log(`  Product: ${product.name}`);

  // ─── Content Pieces ──────────────────────────────────────────
  const contentPieces = [
    {
      id: 'seed-content-001',
      brandId: brand.id,
      platform: 'linkedin',
      title: 'Pourquoi 60% des PME ferment après une cyberattaque',
      body: 'Chiffre choc : 60% des PME victimes d\'une cyberattaque ferment dans les 6 mois.\n\nLe problème ? Ce n\'est pas le manque de solutions. C\'est le manque de solutions ADAPTÉES aux PME.\n\nUn SOC traditionnel coûte 300K€/an et nécessite 5 analystes.\nUn SOC Autopilot ? 299€/mois, déployé en 24h.\n\n3 choses que SOC Autopilot Hub fait différemment :\n\n1. Détection automatique 24/7 — pas d\'équipe de nuit nécessaire\n2. Réponse automatisée — isolement des menaces en 3 minutes\n3. Rapports conformité — ISO 27001 et RGPD en un clic\n\nVotre PME mérite la même protection que les grands groupes.\n\n→ Lien en commentaire pour une démo gratuite\n\n#Cybersécurité #PME #SOC #Sénégal #Innovation',
      hashtags: JSON.stringify(['Cybersécurité', 'PME', 'SOC', 'Sénégal', 'Innovation']),
      status: 'published',
      engagementScore: 92.3,
      publishedAt: new Date('2026-02-01'),
    },
    {
      id: 'seed-content-002',
      brandId: brand.id,
      platform: 'linkedin',
      title: 'Comment automatiser votre conformité RGPD avec l\'IA',
      body: 'La conformité RGPD vous coûte combien de temps par mois ?\n\nSi la réponse est "plus de 2 heures", vous faites probablement tout à la main.\n\nAvec SOC Autopilot Hub :\n✅ Scan automatique de votre infrastructure\n✅ Détection des données personnelles non protégées\n✅ Rapport de conformité généré en 1 clic\n✅ Alertes en temps réel si non-conformité détectée\n\nRésultat pour nos clients : 3 mois de travail consultant économisés.\n\n👉 Demandez votre audit gratuit',
      hashtags: JSON.stringify(['RGPD', 'Conformité', 'IA', 'PME']),
      status: 'approved',
      engagementScore: 0,
    },
    {
      id: 'seed-content-003',
      brandId: brand.id,
      platform: 'twitter',
      title: 'Thread cybersécurité PME',
      body: 'Une PME sur deux a subi une cyberattaque en 2025.\n\nMais seulement 14% ont un SOC.\n\nLe SOC Autopilot Hub change ça : 299€/mois, déployé en 24h.\n\n→ synap6ia.com/demo',
      hashtags: JSON.stringify(['CyberSec', 'PME', 'SOC']),
      status: 'draft',
      engagementScore: 0,
    },
  ];

  for (const piece of contentPieces) {
    await prisma.contentPiece.upsert({
      where: { id: piece.id },
      update: {},
      create: piece,
    });
  }
  console.log(`  Content pieces: ${contentPieces.length} created`);

  // ─── Content Metrics (for published piece) ───────────────────
  const metricsData = [
    { impressions: 3200, engagements: 245, likes: 167, comments: 32, shares: 46, clicks: 89, engagementRate: 0.077 },
    { impressions: 4500, engagements: 380, likes: 250, comments: 55, shares: 75, clicks: 134, engagementRate: 0.084 },
    { impressions: 3800, engagements: 310, likes: 198, comments: 48, shares: 64, clicks: 112, engagementRate: 0.082 },
    { impressions: 5100, engagements: 460, likes: 295, comments: 65, shares: 100, clicks: 167, engagementRate: 0.090 },
    { impressions: 4700, engagements: 420, likes: 270, comments: 60, shares: 90, clicks: 145, engagementRate: 0.089 },
  ];

  for (let i = 0; i < metricsData.length; i++) {
    await prisma.contentMetrics.create({
      data: {
        contentPieceId: 'seed-content-001',
        platform: 'linkedin',
        ...metricsData[i],
        collectedAt: new Date(Date.now() - (metricsData.length - i) * 86400000),
      },
    });
  }
  console.log('  Content metrics: 5 days of data');

  // ─── Leads (interested in cybersecurity) ─────────────────────
  const leads = [
    { id: 'seed-lead-001', firstName: 'Ibrahim', lastName: 'Sow', email: 'ibrahim@digiserv.sn', company: 'DigiServ', source: 'form', score: 85, temperature: 'hot', status: 'qualified', gdprConsent: true },
    { id: 'seed-lead-002', firstName: 'Aissatou', lastName: 'Ba', email: 'aissatou@nexatech.ci', company: 'NexaTech', source: 'ad', score: 62, temperature: 'warm', status: 'nurturing', gdprConsent: true },
    { id: 'seed-lead-003', firstName: 'Ousmane', lastName: 'Diop', email: 'ousmane@startupdk.sn', company: 'StartupDK', source: 'webinar', score: 45, temperature: 'warm', status: 'new', gdprConsent: true },
    { id: 'seed-lead-004', firstName: 'Mariama', lastName: 'Camara', email: 'mariama@soleilmedia.sn', company: 'Soleil Media', source: 'referral', score: 91, temperature: 'hot', status: 'opportunity', gdprConsent: true },
    { id: 'seed-lead-005', firstName: 'Cheikh', lastName: 'Fall', email: 'cheikh@innovlab.ci', company: 'InnovLab', source: 'form', score: 30, temperature: 'cold', status: 'new', gdprConsent: false },
    { id: 'seed-lead-006', firstName: 'Aminata', lastName: 'Toure', email: 'aminata@quickpay.sn', company: 'QuickPay Fintech', source: 'ad', score: 78, temperature: 'hot', status: 'converted', gdprConsent: true, convertedAt: new Date('2026-02-05'), conversionValue: 3588 },
    { id: 'seed-lead-007', firstName: 'Jean-Pierre', lastName: 'Dupont', email: 'jp.dupont@securitech.fr', company: 'SecuriTech Paris', source: 'form', score: 72, temperature: 'hot', status: 'qualified', gdprConsent: true },
    { id: 'seed-lead-008', firstName: 'Fatou', lastName: 'Ndiaye', email: 'fatou@banqueatlantique.sn', company: 'Banque Atlantique', source: 'referral', score: 88, temperature: 'hot', status: 'opportunity', gdprConsent: true },
  ];

  for (const lead of leads) {
    await prisma.lead.upsert({
      where: { brandId_email: { brandId: brand.id, email: lead.email } },
      update: {},
      create: { brandId: brand.id, ...lead },
    });
  }
  console.log(`  Leads: ${leads.length} created`);

  // ─── Lead Interactions ───────────────────────────────────────
  const interactions = [
    { leadId: 'seed-lead-001', direction: 'inbound', channel: 'form', content: 'Intéressé par SOC Autopilot Hub. Nous sommes une ESN de 45 personnes à Dakar, victimes d\'un phishing le mois dernier.', aiSentiment: 'positive', aiIntent: 'interested' },
    { leadId: 'seed-lead-001', direction: 'outbound', channel: 'email', content: 'Email de bienvenue avec lien de démo SOC Autopilot Hub envoyé.', aiSentiment: null, aiIntent: null },
    { leadId: 'seed-lead-001', direction: 'inbound', channel: 'email', content: 'La démo m\'a convaincu. Quel est le tarif pour 50 postes ? On aimerait déployer avant fin mars.', aiSentiment: 'positive', aiIntent: 'ready_to_buy' },
    { leadId: 'seed-lead-004', direction: 'inbound', channel: 'phone', content: 'Appel entrant — veut un devis pour 120 postes + conformité RGPD. Budget validé en interne.', aiSentiment: 'positive', aiIntent: 'ready_to_buy' },
    { leadId: 'seed-lead-008', direction: 'inbound', channel: 'form', content: 'Banque Atlantique cherche une solution SOC conforme aux normes BCEAO. Besoin de présentation au CODIR.', aiSentiment: 'positive', aiIntent: 'interested' },
  ];

  for (const interaction of interactions) {
    await prisma.leadInteraction.create({ data: interaction });
  }
  console.log(`  Lead interactions: ${interactions.length} created`);

  // ─── Lead Sequences (Nurturing) ─────────────────────────────
  await prisma.leadSequence.upsert({
    where: { id: 'seed-sequence-001' },
    update: {},
    create: {
      id: 'seed-sequence-001',
      name: 'Découverte SOC Autopilot',
      steps: [
        { order: 1, channel: 'email', delayHours: 0, bodyPrompt: 'Email de bienvenue : remercier pour l\'intérêt porté à SOC Autopilot Hub. Présenter les 3 avantages clés (déploiement 24h, -70% coûts, conformité auto). Inclure un lien vers la démo interactive.' },
        { order: 2, channel: 'email', delayHours: 48, bodyPrompt: 'Cas d\'usage concret : partager comment DigiServ Dakar a détecté et bloqué automatiquement une attaque ransomware grâce à SOC Autopilot Hub. Chiffres clés et témoignage.' },
        { order: 3, channel: 'email', delayHours: 96, bodyPrompt: 'Proposition de démo personnalisée : proposer un appel de 20min pour montrer SOC Autopilot Hub configuré pour leur secteur. Inclure 3 créneaux.' },
        { order: 4, channel: 'email', delayHours: 168, bodyPrompt: 'Relance douce : rappeler la proposition de démo, ajouter un 2ème témoignage client, et offrir un audit de sécurité gratuit.' },
      ],
    },
  });

  await prisma.leadSequence.upsert({
    where: { id: 'seed-sequence-002' },
    update: {},
    create: {
      id: 'seed-sequence-002',
      name: 'Lead Chaud — Closing',
      steps: [
        { order: 1, channel: 'email', delayHours: 0, bodyPrompt: 'Proposition RDV immédiat : le lead est très intéressé par SOC Autopilot Hub. Proposer un appel dans les 24h avec créneaux précis. Mentionner l\'offre de déploiement gratuit.' },
        { order: 2, channel: 'email', delayHours: 24, bodyPrompt: 'Relance 24h : relancer avec un angle ROI (combien coûte une cyberattaque vs le prix de SOC Autopilot). Dernière chance avant de repasser en nurturing.' },
      ],
    },
  });
  console.log('  Lead sequences: 2 created');

  // ─── Approval Queue ──────────────────────────────────────────
  await prisma.approvalQueue.upsert({
    where: { id: 'seed-approval-001' },
    update: {},
    create: {
      id: 'seed-approval-001',
      entityType: 'content_piece',
      entityId: 'seed-content-002',
      status: 'pending',
      priority: 'high',
    },
  });
  console.log('  Approval queue: 1 pending item');

  // ─── Daily Analytics ─────────────────────────────────────────
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    await prisma.dailyAnalytics.upsert({
      where: { brandId_date: { brandId: brand.id, date } },
      update: {},
      create: {
        brandId: brand.id,
        date,
        contentsPublished: Math.floor(Math.random() * 3) + 1,
        impressions: Math.floor(Math.random() * 5000) + 2000,
        engagements: Math.floor(Math.random() * 300) + 100,
        avgEngagementRate: +(Math.random() * 0.05 + 0.06).toFixed(3),
        adSpend: 0,
        leadsGenerated: Math.floor(Math.random() * 5) + 1,
        leadsQualified: Math.floor(Math.random() * 3),
        conversions: Math.floor(Math.random() * 2),
      },
    });
  }
  console.log('  Daily analytics: 7 days of data');

  // ─── Summary ─────────────────────────────────────────────────
  console.log('\nSeed completed!\n');
  console.log('Login: admin@synap6ia.com / Admin123!');
  console.log('Brand: Synap6ia');
  console.log('Product: SOC Autopilot Hub');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
