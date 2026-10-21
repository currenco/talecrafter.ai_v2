import { Router } from 'express';
import { getCurrentUser } from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { z } from 'zod';
import { validate } from '../middlewares/validate.middleware.js';
import { paginationQuerySchema } from '../validations/common.validation.js';
import { getPublicProfile } from '../services/publicProfile.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

const router = Router();

router.get('/me', requireAuth, getCurrentUser);
router.get(
  '/:userId/profile',
  validate(
    z.object({
      params: z.object({ userId: z.string().uuid() }),
      query: paginationQuerySchema,
    })
  ),
  asyncHandler(async (req, res) => {
    if (req.authError) throw req.authError;
    res.set('Cache-Control', 'private, no-store');
    const profile = await getPublicProfile(
      req.params.userId,
      req.validated.query,
      !req.auth?.userId
    );
    return res.json(new ApiResponse(200, profile, 'Creator profile fetched'));
  })
);

export default router;
