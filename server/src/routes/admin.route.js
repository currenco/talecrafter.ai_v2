import { Router } from 'express';
import {
  backfillAdminStorySlugs,
  getAdminStories,
  getAdminUsers,
  removeAdminStory,
  removeAdminUser,
} from '../controllers/admin.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  adminBackfillSlugsSchema,
  adminListSchema,
  adminStoryIdParamSchema,
  adminUserIdParamSchema,
} from '../validations/admin.validation.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/stories', validate(adminListSchema), getAdminStories);
router.get('/users', validate(adminListSchema), getAdminUsers);
router.post(
  '/stories/backfill-slugs',
  validate(adminBackfillSlugsSchema),
  backfillAdminStorySlugs
);
router.delete(
  '/stories/:storyId',
  validate(adminStoryIdParamSchema),
  removeAdminStory
);
router.delete(
  '/users/:userId',
  validate(adminUserIdParamSchema),
  removeAdminUser
);

export default router;
