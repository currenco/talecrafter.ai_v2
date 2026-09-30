import { z } from 'zod';
import { nonEmptyString } from './common.validation.js';

const planId = z.enum(['basic', 'premium', 'ultimate']);

export const createRazorpayOrderSchema = z.object({
  body: z.object({ planId }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const verifyRazorpayPaymentSchema = z.object({
  body: z.object({
    razorpayPaymentId: nonEmptyString('Razorpay payment ID'),
    razorpayOrderId: nonEmptyString('Razorpay order ID'),
    razorpaySignature: nonEmptyString('Razorpay signature'),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
