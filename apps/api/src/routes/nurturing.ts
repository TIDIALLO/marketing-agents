import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import * as nurturingService from '../services/nurturing.service';

// ─── Schemas ─────────────────────────────────────────────────

const stepSchema = z.object({
  order: z.number().int().min(0),
  channel: z.enum(['email', 'whatsapp']),
  delayHours: z.number().int().min(1),
  bodyPrompt: z.string().min(1, 'Prompt requis'),
});

const createSequenceSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis'),
  steps: z.array(stepSchema).min(1, 'Au moins une étape requise'),
});

const updateSequenceSchema = z.object({
  name: z.string().trim().min(1).optional(),
  steps: z.array(stepSchema).min(1).optional(),
});

const enrollSchema = z.object({
  sequenceId: z.string().min(1, 'Séquence requise'),
});

const analyzeResponseSchema = z.object({
  channel: z.enum(['email', 'whatsapp', 'phone', 'form']),
  content: z.string().min(1, 'Contenu requis'),
});

const escalateSchema = z.object({
  assignTo: z.string().min(1, 'Assignation requise'),
  reason: z.string().optional(),
});

const conversionSchema = z.object({
  conversionValue: z.number().min(0, 'Valeur requise'),
  source: z.string().optional(),
});

const router = Router();

// ─── Sequences CRUD (Story 7.1) ──────────────────────────────

router.post(
  '/sequences',
  requirePermission('content:create'),
  validate(createSequenceSchema),
  asyncHandler(async (req, res) => {
    const seq = await nurturingService.createSequence(req.body);
    res.status(201).json({ success: true, data: seq });
  }),
);

router.get(
  '/sequences',
  requirePermission('content:view'),
  asyncHandler(async (_req, res) => {
    const sequences = await nurturingService.listSequences();
    res.json({ success: true, data: sequences });
  }),
);

router.get<{ id: string }>(
  '/sequences/:id',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const seq = await nurturingService.getSequenceById(req.params.id);
    res.json({ success: true, data: seq });
  }),
);

router.put<{ id: string }>(
  '/sequences/:id',
  requirePermission('content:create'),
  validate(updateSequenceSchema),
  asyncHandler(async (req, res) => {
    const seq = await nurturingService.updateSequence(req.params.id, req.body);
    res.json({ success: true, data: seq });
  }),
);

router.delete<{ id: string }>(
  '/sequences/:id',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    await nurturingService.deleteSequence(req.params.id);
    res.json({ success: true, data: null });
  }),
);

// ─── Enrollment (Story 7.1) ──────────────────────────────────

// POST /api/leads/nurturing/:leadId/enroll
router.post<{ leadId: string }>(
  '/:leadId/enroll',
  requirePermission('content:create'),
  validate(enrollSchema),
  asyncHandler(async (req, res) => {
    const enrollment = await nurturingService.enrollLead(
      req.params.leadId,
      req.body.sequenceId,
    );
    res.status(201).json({ success: true, data: enrollment });
  }),
);

// ─── Follow-Up Execution (Story 7.2) — MKT-303 scheduler ────

router.post(
  '/execute-followups',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const results = await nurturingService.executeFollowUps();
    res.json({ success: true, data: results });
  }),
);

// ─── Response Analysis (Story 7.3) ───────────────────────────

// POST /api/leads/nurturing/:leadId/analyze-response
router.post<{ leadId: string }>(
  '/:leadId/analyze-response',
  requirePermission('content:create'),
  validate(analyzeResponseSchema),
  asyncHandler(async (req, res) => {
    const result = await nurturingService.analyzeResponse(
      req.params.leadId,
      req.body,
    );
    res.json({ success: true, data: result });
  }),
);

// ─── Escalation (Story 7.5) ─────────────────────────────────

// POST /api/leads/nurturing/:leadId/escalate
router.post<{ leadId: string }>(
  '/:leadId/escalate',
  requirePermission('content:approve'),
  validate(escalateSchema),
  asyncHandler(async (req, res) => {
    const result = await nurturingService.escalateToHuman(
      req.params.leadId,
      req.body.assignTo,
      req.body.reason,
    );
    res.json({ success: true, data: result });
  }),
);

// ─── Conversion (Story 7.6) ─────────────────────────────────

// POST /api/leads/nurturing/:leadId/convert
router.post<{ leadId: string }>(
  '/:leadId/convert',
  requirePermission('content:approve'),
  validate(conversionSchema),
  asyncHandler(async (req, res) => {
    const result = await nurturingService.trackConversion(
      req.params.leadId,
      req.body,
    );
    res.json({ success: true, data: result });
  }),
);

export { router as nurturingRoutes };
