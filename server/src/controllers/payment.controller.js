import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  createRazorpayOrder,
  processRazorpayWebhook,
  verifyAndFulfillRazorpayPayment,
} from '../services/payment.service.js';

export const createOrder = asyncHandler(async (req, res) => {
  const order = await createRazorpayOrder({
    authUserId: req.auth.userId,
    planId: req.validated.body.planId,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, order, 'Payment order created'));
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const payment = await verifyAndFulfillRazorpayPayment({
    authUserId: req.auth.userId,
    ...req.validated.body,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, payment, 'Payment verified'));
});

export const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const result = await processRazorpayWebhook({
    rawBody: req.body,
    signature: req.get('x-razorpay-signature'),
    eventId: req.get('x-razorpay-event-id'),
  });
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Webhook processed'));
});
