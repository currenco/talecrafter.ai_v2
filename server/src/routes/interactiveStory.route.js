import { Router } from 'express';
import {
  chooseInteractiveStoryPath,
  completeInteractiveStoryPath,
  createInteractiveStory,
  deleteInteractiveStory,
  getCurrentUserInteractiveStories,
  getInteractiveStory,
  getInteractiveRequest,
} from '../controllers/interactiveStory.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  chooseInteractiveStoryPathSchema,
  completeInteractiveStoryPathSchema,
  createInteractiveStorySchema,
  interactiveStoryIdParamSchema,
  interactiveStoryListSchema,
  interactiveRequestStatusSchema,
} from '../validations/interactiveStory.validation.js';

const router = Router();

router.use(requireAuth);
router.get(
  '/:storyId/requests/:key',
  validate(interactiveRequestStatusSchema),
  getInteractiveRequest
);

router.post(
  '/',
  validate(createInteractiveStorySchema),
  createInteractiveStory
);
router.get(
  '/me',
  validate(interactiveStoryListSchema),
  getCurrentUserInteractiveStories
);
router.get(
  '/:storyId',
  validate(interactiveStoryIdParamSchema),
  getInteractiveStory
);
router.post(
  '/:storyId/choices',
  validate(chooseInteractiveStoryPathSchema),
  chooseInteractiveStoryPath
);
router.post(
  '/:storyId/complete',
  validate(completeInteractiveStoryPathSchema),
  completeInteractiveStoryPath
);
router.delete(
  '/:storyId',
  validate(interactiveStoryIdParamSchema),
  deleteInteractiveStory
);

export default router;
