import express, { Router } from 'express';
import {
  createOrder,
  handleRazorpayWebhook,
  verifyPayment,
} from '../controllers/payment.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { paymentRateLimit } from '../middlewares/rateLimit.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createRazorpayOrderSchema,
  verifyRazorpayPaymentSchema,
} from '../validations/payment.validation.js';

const router = Router();

export const paymentWebhookRouter = Router();

paymentWebhookRouter.post(
  '/razorpay/webhook',
  express.raw({ type: 'application/json', limit: '256kb' }),
  handleRazorpayWebhook
);

router.post(
  '/razorpay/orders',
  paymentRateLimit,
  requireAuth,
  validate(createRazorpayOrderSchema),
  createOrder
);
router.post(
  '/razorpay/verify',
  paymentRateLimit,
  requireAuth,
  validate(verifyRazorpayPaymentSchema),
  verifyPayment
);

export default router;
