import express, { Router } from 'express';
import { creatorCheckoutEnabled } from '../config/env.js';
import ApiResponse from '../utils/ApiResponse.js';
import {
  getSubscription,
  createCreatorSubscription,
  verifyCreatorSubscription,
  refreshCreatorSubscription,
  cancelCreatorSubscription,
  handleRazorpayWebhook,
} from '../controllers/payment.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { verifyRazorpaySubscriptionSchema } from '../validations/payment.validation.js';

const router = Router();
export const paymentWebhookRouter = Router();
paymentWebhookRouter.post(
  '/razorpay/webhook',
  express.raw({ type: 'application/json', limit: '256kb' }),
  handleRazorpayWebhook
);
router.use((_req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
});
router.get('/availability', (_req, res) =>
  res.json(
    new ApiResponse(
      200,
      { checkoutEnabled: creatorCheckoutEnabled() },
      'Checkout availability'
    )
  )
);
router.use(requireAuth);
router.get('/subscription', getSubscription);
router.post('/subscription', createCreatorSubscription);
router.post(
  '/subscription/verify',
  validate(verifyRazorpaySubscriptionSchema),
  verifyCreatorSubscription
);
router.post('/subscription/refresh', refreshCreatorSubscription);
router.post('/subscription/cancel', cancelCreatorSubscription);
export default router;
