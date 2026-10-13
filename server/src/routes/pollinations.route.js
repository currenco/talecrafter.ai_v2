import { Router } from 'express';
import {
  connectPollinations,
  getPollinationsStatus,
  handlePollinationsCallback,
  removePollinationsConnection,
} from '../controllers/pollinations.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { pollinationsCallbackSchema } from '../validations/pollinations.validation.js';

const router = Router();

router.use(requireAuth);
router.get('/status', getPollinationsStatus);
router.post('/connect', connectPollinations);
router.post(
  '/callback',
  validate(pollinationsCallbackSchema),
  handlePollinationsCallback
);
router.delete('/connection', removePollinationsConnection);

export default router;
