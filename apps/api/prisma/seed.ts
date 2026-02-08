import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Tenant ──────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { id: 'seed-tenant-001' },
    update: {},
    create: {
      id: 'seed-tenant-001',
      name: 'Synap6ia Demo',
      plan: 'pro',
    },
  });
  console.log(`  ✓ Tenant: ${tenant.name} (${tenant.id})`);

  // ─── Users ───────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', BCRYPT_ROUNDS);
  const editorHash = await bcrypt.hash('Editor123!', BCRYPT_ROUNDS);

  const admin = await prisma.platformUser.upsert({
    where: { email: 'admin@synap6ia.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@synap6ia.com',
      passwordHash: adminHash,
      firstName: 'Amadou',
      lastName: 'Diallo',
      role: 'owner',
    },
  });
  console.log(`  ✓ User (owner): ${admin.email} / Admin123!`);

  const editor = await prisma.platformUser.upsert({
    where: { email: 'editor@synap6ia.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'editor@synap6ia.com',
      passwordHash: editorHash,
      firstName: 'Fatou',
      lastName: 'Ndiaye',
      role: 'editor',
    },
  });
  console.log(`  ✓ User (editor): ${editor.email} / Editor123!`);

  // ─── Organization ────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: 'seed-org-001' },
    update: {},
    create: {
      id: 'seed-org-001',
      tenantId: tenant.id,
      name: 'Synap6ia Marketing',
      description: 'Organisation de démonstration',
    },
  });

  await prisma.organizationUser.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: admin.id } },
    update: {},
    create: { organizationId: org.id, userId: admin.id, role: 'owner' },
  });
  await prisma.organizationUser.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: editor.id } },
    update: {},
    create: { organizationId: org.id, userId: editor.id, role: 'editor' },
  });
  console.log(`  ✓ Organization: ${org.name}`);

  // ─── Brand ───────────────────────────────────────────────────
  const brand = await prisma.brand.upsert({
    where: { id: 'seed-brand-001' },
    update: {},
    create: {
      id: 'seed-brand-001',
      tenantId: tenant.id,
      organizationId: org.id,
      name: 'TechAfrik',
      brandVoice: 'Professionnel mais accessible. Ton inspirant tourné vers l\'innovation en Afrique de l\'Ouest.',
      targetAudience: 'PME tech, startups et entrepreneurs au Sénégal et Côte d\'Ivoire, 25-45 ans.',
      contentGuidelines: 'Toujours inclure un CTA. Utiliser le français avec des expressions locales. Éviter le jargon technique excessif.',
    },
  });
  console.log(`  ✓ Brand: ${brand.name}`);

  // ─── Products ────────────────────────────────────────────────
  await prisma.product.upsert({
    where: { id: 'seed-product-001' },
    update: {},
    create: {
      id: 'seed-product-001',
      brandId: brand.id,
      name: 'TechAfrik Pro',
      description: 'Suite logicielle tout-en-un pour PME africaines',
    },
  });
  await prisma.product.upsert({
    where: { id: 'seed-product-002' },
    update: {},
    create: {
      id: 'seed-product-002',
      brandId: brand.id,
      name: 'TechAfrik Academy',
      description: 'Formation en ligne pour entrepreneurs tech',
    },
  });
  console.log('  ✓ Products: 2 created');

  // ─── Content Pieces ──────────────────────────────────────────
  const contentPieces = [
    {
      id: 'seed-content-001',
      tenantId: tenant.id,
      brandId: brand.id,
      platform: 'linkedin',
      title: '5 tendances tech qui transforment les PME en Afrique de l\'Ouest',
      body: 'L\'Afrique de l\'Ouest connaît une révolution technologique sans précédent. Voici 5 tendances qui redéfinissent le paysage des PME :\n\n1. 📱 Mobile-first : 80% des transactions passent par le mobile\n2. 🤖 IA accessible : des solutions adaptées au marché local\n3. 💰 Fintech : Orange Money, Wave transforment les paiements\n4. ☁️ Cloud local : des datacenters arrivent à Dakar\n5. 🎓 EdTech : formation continue pour les entrepreneurs\n\nQuelle tendance impacte le plus votre business ?',
      hashtags: JSON.stringify(['TechAfrique', 'PME', 'Innovation', 'Senegal']),
      status: 'published',
      engagementScore: 85.5,
      publishedAt: new Date('2026-02-01'),
    },
    {
      id: 'seed-content-002',
      tenantId: tenant.id,
      brandId: brand.id,
      platform: 'facebook',
      title: 'Comment automatiser votre marketing avec l\'IA',
      body: '🚀 Vous passez trop de temps sur votre marketing ?\n\nAvec TechAfrik Pro, automatisez :\n✅ La création de contenu\n✅ La gestion des leads\n✅ Les campagnes publicitaires\n\nRésultat : 3x plus de leads, 2x moins de temps.\n\n👉 Demandez votre démo gratuite !',
      hashtags: JSON.stringify(['Marketing', 'Automatisation', 'IA']),
      status: 'approved',
      engagementScore: 0,
    },
    {
      id: 'seed-content-003',
      tenantId: tenant.id,
      brandId: brand.id,
      platform: 'instagram',
      title: 'Témoignage client — Moussa, fondateur de DigiServ',
      body: '"Grâce à TechAfrik Pro, j\'ai triplé mon chiffre d\'affaires en 6 mois. L\'IA me suggère exactement le bon contenu pour ma cible."\n\n— Moussa Keita, DigiServ Abidjan\n\n#Témoignage #Succès #Entrepreneuriat',
      hashtags: JSON.stringify(['Témoignage', 'Succès', 'Entrepreneuriat']),
      status: 'draft',
      engagementScore: 0,
    },
    {
      id: 'seed-content-004',
      tenantId: tenant.id,
      brandId: brand.id,
      platform: 'tiktok',
      title: '60 secondes pour comprendre le marketing automation',
      body: 'Script vidéo TikTok :\n[0-5s] Hook : "Vous perdez 10h/semaine sur votre marketing ?"\n[5-20s] Problème : montrer les tâches répétitives\n[20-45s] Solution : démo rapide TechAfrik Pro\n[45-60s] CTA : "Lien en bio pour votre essai gratuit"',
      hashtags: JSON.stringify(['MarketingTips', 'Automation', 'Business']),
      status: 'scheduled',
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
  console.log(`  ✓ Content pieces: ${contentPieces.length} created`);

  // ─── Content Metrics (for published piece) ───────────────────
  const metricsData = [
    { impressions: 1200, engagements: 95, likes: 67, comments: 12, shares: 16, clicks: 45, engagementRate: 0.079 },
    { impressions: 2300, engagements: 180, likes: 120, comments: 28, shares: 32, clicks: 89, engagementRate: 0.078 },
    { impressions: 1800, engagements: 145, likes: 98, comments: 19, shares: 28, clicks: 67, engagementRate: 0.081 },
    { impressions: 3100, engagements: 260, likes: 175, comments: 35, shares: 50, clicks: 112, engagementRate: 0.084 },
    { impressions: 2700, engagements: 220, likes: 150, comments: 30, shares: 40, clicks: 95, engagementRate: 0.081 },
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
  console.log('  ✓ Content metrics: 5 days of data');

  // ─── Leads ───────────────────────────────────────────────────
  const leads = [
    { id: 'seed-lead-001', firstName: 'Ibrahim', lastName: 'Sow', email: 'ibrahim@digiserv.sn', company: 'DigiServ', source: 'form', score: 85, temperature: 'hot', status: 'qualified', gdprConsent: true },
    { id: 'seed-lead-002', firstName: 'Aïssatou', lastName: 'Ba', email: 'aissatou@nexatech.ci', company: 'NexaTech', source: 'ad', score: 62, temperature: 'warm', status: 'nurturing', gdprConsent: true },
    { id: 'seed-lead-003', firstName: 'Ousmane', lastName: 'Diop', email: 'ousmane@startupdk.sn', company: 'StartupDK', source: 'webinar', score: 45, temperature: 'warm', status: 'new', gdprConsent: true },
    { id: 'seed-lead-004', firstName: 'Mariama', lastName: 'Camara', email: 'mariama@soleilmedia.sn', company: 'Soleil Media', source: 'referral', score: 91, temperature: 'hot', status: 'opportunity', gdprConsent: true },
    { id: 'seed-lead-005', firstName: 'Cheikh', lastName: 'Fall', email: 'cheikh@innovlab.ci', company: 'InnovLab', source: 'form', score: 30, temperature: 'cold', status: 'new', gdprConsent: false },
    { id: 'seed-lead-006', firstName: 'Aminata', lastName: 'Touré', email: 'aminata@quickpay.sn', company: 'QuickPay', source: 'ad', score: 78, temperature: 'hot', status: 'converted', gdprConsent: true, convertedAt: new Date('2026-02-05'), conversionValue: 2500000 },
  ];

  for (const lead of leads) {
    await prisma.lead.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: lead.email } },
      update: {},
      create: { tenantId: tenant.id, brandId: brand.id, ...lead },
    });
  }
  console.log(`  ✓ Leads: ${leads.length} created`);

  // ─── Lead Interactions ───────────────────────────────────────
  const interactions = [
    { leadId: 'seed-lead-001', direction: 'inbound', channel: 'form', content: 'Demande de démo via formulaire site web', aiSentiment: 'positive', aiIntent: 'interested' },
    { leadId: 'seed-lead-001', direction: 'outbound', channel: 'email', content: 'Email de bienvenue + lien de démo envoyé', aiSentiment: null, aiIntent: null },
    { leadId: 'seed-lead-001', direction: 'inbound', channel: 'email', content: 'Merci pour la démo, je souhaite en savoir plus sur les tarifs', aiSentiment: 'positive', aiIntent: 'ready_to_buy' },
    { leadId: 'seed-lead-002', direction: 'inbound', channel: 'form', content: 'Clic sur publicité Facebook — page de capture', aiSentiment: 'neutral', aiIntent: 'needs_info' },
    { leadId: 'seed-lead-002', direction: 'outbound', channel: 'whatsapp', content: 'Bonjour Aïssatou ! Suite à votre intérêt pour TechAfrik...', aiSentiment: null, aiIntent: null },
    { leadId: 'seed-lead-004', direction: 'inbound', channel: 'phone', content: 'Appel entrant — veut un devis pour 10 utilisateurs', aiSentiment: 'positive', aiIntent: 'ready_to_buy' },
  ];

  for (const interaction of interactions) {
    await prisma.leadInteraction.create({ data: interaction });
  }
  console.log(`  ✓ Lead interactions: ${interactions.length} created`);

  // ─── Ad Campaigns ────────────────────────────────────────────
  // Need a social account + ad account first
  const socialAccount = await prisma.socialAccount.upsert({
    where: { brandId_platform: { brandId: brand.id, platform: 'facebook' } },
    update: {},
    create: {
      id: 'seed-social-001',
      brandId: brand.id,
      platform: 'facebook',
      platformUserId: 'fb-123456',
      platformUsername: 'TechAfrik',
      accessTokenEncrypted: 'encrypted-placeholder',
      status: 'active',
    },
  });

  const adAccount = await prisma.adAccount.upsert({
    where: { id: 'seed-adaccount-001' },
    update: {},
    create: {
      id: 'seed-adaccount-001',
      socialAccountId: socialAccount.id,
      platform: 'facebook',
      platformAccountId: 'act_987654',
      name: 'TechAfrik Ads',
      status: 'active',
    },
  });

  const campaigns = [
    {
      id: 'seed-campaign-001',
      tenantId: tenant.id,
      brandId: brand.id,
      adAccountId: adAccount.id,
      name: 'Campagne Leads Q1 2026',
      platform: 'facebook',
      objective: 'leads',
      dailyBudget: 15000,
      totalBudget: 450000,
      status: 'active',
      targeting: { ageMin: 25, ageMax: 45, genders: ['all'], interests: ['Technology', 'Business', 'Entrepreneurship'], locations: ['Sénégal', 'Côte d\'Ivoire'], customAudiences: [] },
      kpiTargets: { targetCpc: 150, targetCtr: 0.025, targetRoas: 3.5 },
    },
    {
      id: 'seed-campaign-002',
      tenantId: tenant.id,
      brandId: brand.id,
      adAccountId: adAccount.id,
      name: 'Notoriété TechAfrik Academy',
      platform: 'facebook',
      objective: 'awareness',
      dailyBudget: 8000,
      totalBudget: 240000,
      status: 'draft',
      targeting: { ageMin: 20, ageMax: 35, genders: ['all'], interests: ['Education', 'Online Learning'], locations: ['Sénégal'], customAudiences: [] },
      kpiTargets: { targetCpc: 100, targetCtr: 0.03, targetRoas: 2.0 },
    },
  ];

  for (const campaign of campaigns) {
    await prisma.adCampaign.upsert({
      where: { id: campaign.id },
      update: {},
      create: campaign,
    });
  }
  console.log(`  ✓ Ad campaigns: ${campaigns.length} created`);

  // ─── Ad Creatives ────────────────────────────────────────────
  await prisma.adCreative.upsert({
    where: { id: 'seed-creative-001' },
    update: {},
    create: {
      id: 'seed-creative-001',
      campaignId: 'seed-campaign-001',
      title: 'Boostez votre marketing avec l\'IA',
      body: 'TechAfrik Pro automatise votre marketing. 3x plus de leads, 2x moins d\'effort. Essai gratuit !',
      imageUrl: 'https://placehold.co/1200x628/6366f1/white?text=TechAfrik+Pro',
      callToActionType: 'SIGN_UP',
    },
  });
  await prisma.adCreative.upsert({
    where: { id: 'seed-creative-002' },
    update: {},
    create: {
      id: 'seed-creative-002',
      campaignId: 'seed-campaign-001',
      title: 'Témoignage : +200% de leads en 3 mois',
      body: 'Découvrez comment Moussa a triplé son CA grâce à TechAfrik Pro. Votre tour ?',
      imageUrl: 'https://placehold.co/1200x628/10b981/white?text=Témoignage+Client',
      callToActionType: 'LEARN_MORE',
    },
  });
  console.log('  ✓ Ad creatives: 2 created');

  // ─── Ad Metrics ──────────────────────────────────────────────
  const adMetricsData = [
    { impressions: 5200, clicks: 130, spend: 14500, conversions: 8, cpc: 111, cpm: 2788, ctr: 0.025, roas: 3.8 },
    { impressions: 6100, clicks: 158, spend: 15000, conversions: 11, cpc: 95, cpm: 2459, ctr: 0.026, roas: 4.1 },
    { impressions: 4800, clicks: 115, spend: 13200, conversions: 6, cpc: 115, cpm: 2750, ctr: 0.024, roas: 3.2 },
    { impressions: 7200, clicks: 195, spend: 15000, conversions: 14, cpc: 77, cpm: 2083, ctr: 0.027, roas: 4.7 },
    { impressions: 5900, clicks: 148, spend: 14800, conversions: 9, cpc: 100, cpm: 2508, ctr: 0.025, roas: 3.5 },
  ];

  for (let i = 0; i < adMetricsData.length; i++) {
    await prisma.adMetrics.create({
      data: {
        campaignId: 'seed-campaign-001',
        ...adMetricsData[i],
        collectedAt: new Date(Date.now() - (adMetricsData.length - i) * 86400000),
      },
    });
  }
  console.log('  ✓ Ad metrics: 5 days of data');

  // ─── Approval Queue ──────────────────────────────────────────
  await prisma.approvalQueue.upsert({
    where: { id: 'seed-approval-001' },
    update: {},
    create: {
      id: 'seed-approval-001',
      tenantId: tenant.id,
      entityType: 'content_piece',
      entityId: 'seed-content-002',
      status: 'pending',
      priority: 'high',
    },
  });
  await prisma.approvalQueue.upsert({
    where: { id: 'seed-approval-002' },
    update: {},
    create: {
      id: 'seed-approval-002',
      tenantId: tenant.id,
      entityType: 'ad_campaign',
      entityId: 'seed-campaign-002',
      status: 'pending',
      priority: 'medium',
    },
  });
  console.log('  ✓ Approval queue: 2 pending items');

  // ─── Daily Analytics ─────────────────────────────────────────
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    await prisma.dailyAnalytics.upsert({
      where: { organizationId_date: { organizationId: org.id, date } },
      update: {},
      create: {
        tenantId: tenant.id,
        organizationId: org.id,
        date,
        contentsPublished: Math.floor(Math.random() * 3) + 1,
        impressions: Math.floor(Math.random() * 5000) + 2000,
        engagements: Math.floor(Math.random() * 300) + 100,
        avgEngagementRate: +(Math.random() * 0.05 + 0.03).toFixed(3),
        adSpend: Math.floor(Math.random() * 5000) + 10000,
        leadsGenerated: Math.floor(Math.random() * 5) + 1,
        leadsQualified: Math.floor(Math.random() * 3),
        conversions: Math.floor(Math.random() * 2),
      },
    });
  }
  console.log('  ✓ Daily analytics: 7 days of data');

  // ─── Summary ─────────────────────────────────────────────────
  console.log('\n✅ Seed completed!\n');
  console.log('┌──────────────────────────────────────────────┐');
  console.log('│  Comptes de démonstration                    │');
  console.log('├──────────────────────────────────────────────┤');
  console.log('│  👤 Owner:  admin@synap6ia.com / Admin123!   │');
  console.log('│  ✏️  Editor: editor@synap6ia.com / Editor123! │');
  console.log('└──────────────────────────────────────────────┘');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
