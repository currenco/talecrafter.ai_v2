import { z } from 'zod';
export const verifyRazorpaySubscriptionSchema = z.object({
  body: z.object({
    razorpayPaymentId: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
    razorpaySubscriptionId: z.string().regex(/^sub_[a-zA-Z0-9]+$/),
    razorpaySignature: z.string().regex(/^[a-fA-F0-9]{64}$/),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
