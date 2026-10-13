import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  createSubscription,
  verifySubscription,
  subscriptionStatus,
  refreshSubscription,
  cancelSubscription,
  processRazorpayWebhook,
} from '../services/payment.service.js';

export const getSubscription = asyncHandler(async (req, res) =>
  res.json(
    new ApiResponse(
      200,
      await subscriptionStatus(req.auth.userId),
      'Subscription fetched'
    )
  )
);
export const createCreatorSubscription = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        await createSubscription(req.auth.userId),
        'Subscription created'
      )
    )
);
export const verifyCreatorSubscription = asyncHandler(async (req, res) =>
  res.json(
    new ApiResponse(
      200,
      await verifySubscription({
        authUserId: req.auth.userId,
        ...req.validated.body,
      }),
      'Subscription verified'
    )
  )
);
export const refreshCreatorSubscription = asyncHandler(async (req, res) =>
  res.json(
    new ApiResponse(
      200,
      await refreshSubscription(req.auth.userId),
      'Subscription refreshed'
    )
  )
);
export const cancelCreatorSubscription = asyncHandler(async (req, res) =>
  res.json(
    new ApiResponse(
      200,
      await cancelSubscription(req.auth.userId),
      'Renewal cancelled'
    )
  )
);
export const handleRazorpayWebhook = asyncHandler(async (req, res) =>
  res.json(
    new ApiResponse(
      200,
      await processRazorpayWebhook({
        rawBody: req.body,
        signature: req.get('x-razorpay-signature'),
      }),
      'Webhook processed'
    )
  )
);
