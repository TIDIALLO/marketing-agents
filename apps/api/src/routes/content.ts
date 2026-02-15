import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import * as contentService from '../services/content.service';
import * as publishingService from '../services/publishing.service';
import * as visualService from '../services/visual.service';
import * as repurposeService from '../services/repurpose.service';
import { COPY_FRAMEWORKS } from '../lib/copy-frameworks';

// ─── Schemas ─────────────────────────────────────────────────

const createInputSchema = z.object({
  brandId: z.string().min(1, 'Marque requise'),
  inputType: z.enum(['text', 'url'], { errorMap: () => ({ message: 'Type invalide (text, url)' }) }),
  rawContent: z.string().min(1, 'Contenu requis'),
  sourceUrl: z.string().url().optional(),
  pillarId: z.string().optional(),
});

const createPillarSchema = z.object({
  brandId: z.string().min(1, 'Marque requise'),
  name: z.string().trim().min(1, 'Nom requis'),
  description: z.string().trim().optional(),
});

const generatePieceSchema = z.object({
  platform: z.enum(['linkedin', 'facebook', 'instagram', 'tiktok', 'twitter'], {
    errorMap: () => ({ message: 'Plateforme invalide' }),
  }),
  framework: z.enum(['pas', 'aida', 'storytelling', 'hook-based', 'listicle', 'contrarian']).optional(),
});

const updatePieceSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  hashtags: z.array(z.string()).optional(),
  callToAction: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['draft', 'review', 'approved', 'scheduled', 'published', 'failed'], {
    errorMap: () => ({ message: 'Statut invalide' }),
  }),
});

const scheduleSchema = z.object({
  socialAccountId: z.string().min(1, 'Compte social requis'),
  scheduledAt: z.string().datetime({ message: 'Date invalide (ISO 8601)' }),
});

const rescheduleSchema = z.object({
  scheduledAt: z.string().datetime({ message: 'Date invalide (ISO 8601)' }),
});

const router = Router();

// ─── Content Pillars ─────────────────────────────────────────

router.post(
  '/pillars',
  requirePermission('content:create'),
  validate(createPillarSchema),
  asyncHandler(async (req, res) => {
    const pillar = await contentService.createPillar(req.body);
    res.status(201).json({ success: true, data: pillar });
  }),
);

router.get(
  '/pillars',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const brandId = req.query.brandId as string | undefined;
    const pillars = await contentService.listPillars(brandId);
    res.json({ success: true, data: pillars });
  }),
);

// ─── Content Inputs (Stories 3.1, 3.2) ───────────────────────

// POST /api/content/inputs — create text/url input
router.post(
  '/inputs',
  requirePermission('content:create'),
  validate(createInputSchema),
  asyncHandler(async (req, res) => {
    const input = await contentService.createInput(
      req.user!.userId,
      req.body,
    );
    res.status(201).json({ success: true, data: input });
  }),
);

// POST /api/content/inputs/audio — create audio input (Story 3.2)
router.post(
  '/inputs/audio',
  requirePermission('content:create'),
  asyncHandler(async (req, res) => {
    // For multipart audio upload, the body contains brandId and buffer
    const { brandId, pillarId } = req.body;
    if (!brandId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'brandId requis' },
      });
      return;
    }

    // Audio file expected as base64 in body (or via multipart middleware)
    const audioBase64 = req.body.audio as string | undefined;
    const filename = req.body.filename as string ?? 'audio.webm';

    if (!audioBase64) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Fichier audio requis (champ audio en base64)' },
      });
      return;
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const input = await contentService.createAudioInput(
      req.user!.userId,
      { brandId, audioBuffer, filename, pillarId },
    );
    res.status(201).json({ success: true, data: input });
  }),
);

// GET /api/content/inputs — list
router.get(
  '/inputs',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const brandId = req.query.brandId as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await contentService.listInputs(brandId, { skip: (page - 1) * limit, take: limit });
    res.json({ success: true, data: result.data, pagination: { page, limit, total: result.total } });
  }),
);

// GET /api/content/inputs/:id — detail
router.get<{ id: string }>(
  '/inputs/:id',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const input = await contentService.getInputById(req.params.id);
    res.json({ success: true, data: input });
  }),
);

// POST /api/content/inputs/:id/research — trigger AI research (Story 3.3)
router.post<{ id: string }>(
  '/inputs/:id/research',
  requirePermission('content:create'),
  asyncHandler(async (req, res) => {
    const input = await contentService.runAiResearch(req.params.id);
    res.json({ success: true, data: input });
  }),
);

// POST /api/content/inputs/:id/generate — generate content piece (Story 3.4)
router.post<{ id: string }>(
  '/inputs/:id/generate',
  requirePermission('content:create'),
  validate(generatePieceSchema),
  asyncHandler(async (req, res) => {
    const piece = await contentService.generateContentPiece(
      req.params.id,
      req.body.platform,
      req.body.framework,
    );
    res.status(201).json({ success: true, data: piece });
  }),
);

// ─── Content Pieces (Stories 3.4, 3.5) ───────────────────────

// GET /api/content/pieces — list
router.get(
  '/pieces',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await contentService.listPieces(
      {
        brandId: req.query.brandId as string | undefined,
        status: req.query.status as string | undefined,
      },
      { skip: (page - 1) * limit, take: limit },
    );
    res.json({ success: true, data: result.data, pagination: { page, limit, total: result.total } });
  }),
);

// GET /api/content/pieces/:id — detail
router.get<{ id: string }>(
  '/pieces/:id',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const piece = await contentService.getPieceById(req.params.id);
    res.json({ success: true, data: piece });
  }),
);

// PUT /api/content/pieces/:id — update piece
router.put<{ id: string }>(
  '/pieces/:id',
  requirePermission('content:create'),
  validate(updatePieceSchema),
  asyncHandler(async (req, res) => {
    const piece = await contentService.updatePiece(req.params.id, req.body);
    res.json({ success: true, data: piece });
  }),
);

// PUT /api/content/pieces/:id/status — update status
router.put<{ id: string }>(
  '/pieces/:id/status',
  requirePermission('content:approve'),
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const piece = await contentService.updatePieceStatus(
      req.params.id,
      req.body.status,
    );
    res.json({ success: true, data: piece });
  }),
);

// POST /api/content/pieces/:id/generate-visual — generate template-based visual (Story 3.5)
router.post<{ id: string }>(
  '/pieces/:id/generate-visual',
  requirePermission('content:create'),
  asyncHandler(async (req, res) => {
    const { templateId, overrides } = req.body;

    if (templateId) {
      // Template-based visual generation
      const result = await visualService.generateVisualFromTemplate(
        req.params.id,
        templateId,
        overrides,
      );
      res.json({ success: true, data: result });
    } else {
      // Auto-suggest and generate
      const suggestion = await visualService.suggestTemplate(req.params.id);
      const result = await visualService.generateVisualFromTemplate(
        req.params.id,
        suggestion.templateId,
        suggestion.variables,
      );
      res.json({ success: true, data: result });
    }
  }),
);

// GET /api/content/templates — list available visual templates
router.get(
  '/templates',
  requirePermission('content:view'),
  asyncHandler(async (_req, res) => {
    const templates = visualService.listTemplates();
    res.json({ success: true, data: templates });
  }),
);

// GET /api/content/frameworks — list copy frameworks
router.get(
  '/frameworks',
  requirePermission('content:view'),
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: COPY_FRAMEWORKS });
  }),
);

// POST /api/content/pieces/:id/repurpose — repurpose to other formats
router.post<{ id: string }>(
  '/pieces/:id/repurpose',
  requirePermission('content:create'),
  validate(z.object({
    targetFormats: z.array(z.enum(['thread', 'blog-draft', 'newsletter', 'carousel'])).min(1),
  })),
  asyncHandler(async (req, res) => {
    const results = await repurposeService.repurposePiece(
      req.params.id,
      req.body.targetFormats,
    );
    res.json({ success: true, data: results });
  }),
);

// POST /api/content/pieces/:id/adapt — adapt to all platforms (Story 4.4)
router.post<{ id: string }>(
  '/pieces/:id/adapt',
  requirePermission('content:create'),
  asyncHandler(async (req, res) => {
    const result = await publishingService.adaptToAllPlatforms(req.params.id);
    res.json({ success: true, data: result });
  }),
);

// POST /api/content/pieces/:id/schedule — manual schedule (Story 4.5)
router.post<{ id: string }>(
  '/pieces/:id/schedule',
  requirePermission('content:approve'),
  validate(scheduleSchema),
  asyncHandler(async (req, res) => {
    const schedule = await publishingService.scheduleContent(
      req.params.id,
      req.body.socialAccountId,
      new Date(req.body.scheduledAt),
    );
    res.status(201).json({ success: true, data: schedule });
  }),
);

// ─── Content Schedules (Stories 4.5, 4.6) ────────────────────

// POST /api/content/schedules/publish-due — batch publish (MKT-107 scheduler)
router.post(
  '/schedules/publish-due',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const results = await publishingService.publishScheduledContent();
    res.json({ success: true, data: results });
  }),
);

// GET /api/content/schedules — list (Story 4.6 calendar data)
router.get(
  '/schedules',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const result = await publishingService.listSchedules(
      {
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        brandId: req.query.brandId as string | undefined,
        status: req.query.status as string | undefined,
      },
      { skip: (page - 1) * limit, take: limit },
    );
    res.json({ success: true, data: result.data, pagination: { page, limit, total: result.total } });
  }),
);

// PUT /api/content/schedules/:id — reschedule (Story 4.6 drag-and-drop)
router.put<{ id: string }>(
  '/schedules/:id',
  requirePermission('content:approve'),
  validate(rescheduleSchema),
  asyncHandler(async (req, res) => {
    const schedule = await publishingService.updateSchedule(
      req.params.id,
      { scheduledAt: new Date(req.body.scheduledAt) },
    );
    res.json({ success: true, data: schedule });
  }),
);

// POST /api/content/schedules/:id/publish — manual single publish (Story 4.5)
router.post<{ id: string }>(
  '/schedules/:id/publish',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    const piece = await publishingService.publishSingle(req.params.id);
    res.json({ success: true, data: piece });
  }),
);

export { router as contentRoutes };
