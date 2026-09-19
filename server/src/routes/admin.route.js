import { Router } from 'express';
import {
  backfillAdminStorySlugs,
  getAdminStories,
  getAdminUsers,
  removeAdminStory,
  removeAdminUser,
  setAdminUserCredit,
} from '../controllers/admin.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  adminBackfillSlugsSchema,
  adminStoryIdParamSchema,
  adminUpdateUserCreditSchema,
  adminUserIdParamSchema,
} from '../validations/admin.validation.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/stories', getAdminStories);
router.get('/users', getAdminUsers);
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
router.patch(
  '/users/:userId/credit',
  validate(adminUpdateUserCreditSchema),
  setAdminUserCredit
);

export default router;
