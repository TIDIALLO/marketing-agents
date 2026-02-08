import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { setRefreshCookie, clearRefreshCookie, verifyRefreshToken } from '../lib/jwt';
import { AppError } from '../lib/errors';
import * as authService from '../services/auth.service';

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(128, 'Le mot de passe ne doit pas dépasser 128 caractères'),
  firstName: z.string().trim().min(1, 'Prénom requis'),
  lastName: z.string().trim().min(1, 'Nom requis'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(128, 'Le mot de passe ne doit pas dépasser 128 caractères'),
});

const router = Router();

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.register(req.body);
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ success: true, data: { user, accessToken } });
  })
);

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    setRefreshCookie(res, refreshToken);
    res.json({ success: true, data: { user, accessToken } });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Refresh token manquant');
    }
    const { accessToken, refreshToken } = await authService.refresh(token);
    setRefreshCookie(res, refreshToken);
    res.json({ success: true, data: { accessToken } });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const decoded = verifyRefreshToken(token);
        await authService.logout(decoded.userId);
      } catch {
        // Token invalid/expired — still clear cookie
      }
    }
    clearRefreshCookie(res);
    res.json({ success: true, data: { message: 'Déconnexion réussie' } });
  })
);

router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    res.json({ success: true, data: { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé' } });
  })
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ success: true, data: { message: 'Mot de passe réinitialisé avec succès' } });
  })
);

export { router as authRoutes };
