import { Router } from 'express';
import {
  createStory,
  deleteStory,
  getCurrentUserStories,
  getPublicStories,
  getPublicGenres,
  getPublicArtStyles,
  getSitemapStories,
  getRelatedStoryList,
  getStoryIdDetail,
  getStorySlugDetail,
  getStoryGenerationStatus,
  resumeStoryGeneration,
  getCreatorPack,
} from '../controllers/story.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createStorySchema,
  currentUserStoriesQuerySchema,
  relatedStoriesQuerySchema,
  storyIdParamSchema,
  publicStoriesQuerySchema,
  sitemapQuerySchema,
} from '../validations/story.validation.js';

const router = Router();

router.get('/', validate(publicStoriesQuerySchema), getPublicStories);
router.get('/genres', getPublicGenres);
router.get('/art-styles', getPublicArtStyles);
router.get('/sitemap', validate(sitemapQuerySchema), getSitemapStories);
router.post('/', requireAuth, validate(createStorySchema), createStory);
router.get(
  '/me',
  requireAuth,
  validate(currentUserStoriesQuerySchema),
  getCurrentUserStories
);
router.get(
  '/me/:storyId/status',
  requireAuth,
  validate(storyIdParamSchema),
  getStoryGenerationStatus
);
router.post(
  '/:storyId/resume',
  requireAuth,
  validate(storyIdParamSchema),
  resumeStoryGeneration
);
router.get('/slug/:slug', getStorySlugDetail);
router.get(
  '/:storyId/creator-pack',
  requireAuth,
  validate(storyIdParamSchema),
  getCreatorPack
);
router.get('/id/:storyId', getStoryIdDetail);
router.get(
  '/:storyId/related',
  validate(relatedStoriesQuerySchema),
  getRelatedStoryList
);
router.delete(
  '/:storyId',
  requireAuth,
  validate(storyIdParamSchema),
  deleteStory
);

export default router;
