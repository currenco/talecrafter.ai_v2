import { Router } from 'express';
import {
  backfillAdminStorySlugs,
  getAdminStories,
  getAdminUsers,
  getAdminUserStories,
  removeAdminStory,
  removeAdminUser,
} from '../controllers/admin.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  adminBackfillSlugsSchema,
  adminListSchema,
  adminUserLibrarySchema,
  adminStoryIdParamSchema,
  adminUserIdParamSchema,
} from '../validations/admin.validation.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.use((_req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
});

router.get('/stories', validate(adminListSchema), getAdminStories);
router.get('/users', validate(adminListSchema), getAdminUsers);
router.get(
  '/users/:userId/stories',
  validate(adminUserLibrarySchema),
  getAdminUserStories
);
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
