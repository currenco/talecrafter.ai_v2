import { randomUUID } from 'node:crypto';
import Razorpay from 'razorpay';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { PaymentEvents, Payments } from '../db/schema.js';
import ApiError from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import {
  CREDIT_PLANS,
  isValidRazorpaySignature,
  isValidRazorpayWebhookSignature,
} from '../utils/razorpay.js';
import { getUserByProfileId, syncUserFromAuth } from './user.service.js';

const getPlan = planId => {
  const plan = CREDIT_PLANS.find(item => item.id === planId);
  if (!plan) throw new ApiError(400, 'Invalid credit plan');
  if (!Number.isInteger(plan.amount) || plan.amount < 100) {
    throw new ApiError(500, 'Credit plan amount is invalid');
  }
  return plan;
};

const getRazorpayConfig = () => {
  const keyId = String(process.env.RAZORPAY_KEY_ID ?? '').trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET ?? '').trim();
  if (!keyId || !keySecret) {
    throw new ApiError(503, 'Razorpay is not configured');
  }
  return { keyId, keySecret };
};

const getRazorpay = () => {
  const { keyId, keySecret } = getRazorpayConfig();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const getRazorpayWebhookSecret = () => {
  const secret = String(process.env.RAZORPAY_WEBHOOK_SECRET ?? '').trim();
  if (!secret) {
    throw new ApiError(503, 'Razorpay webhook is not configured');
  }
  return secret;
};

const getPaymentByOrderId = async orderId => {
  const [payment] = await db
    .select()
    .from(Payments)
    .where(
      and(
        eq(Payments.provider, 'razorpay'),
        eq(Payments.providerSessionId, orderId)
      )
    )
    .limit(1);
  return payment ?? null;
};

export const createRazorpayOrder = async ({ authUserId, planId }) => {
  const user = await syncUserFromAuth(authUserId);
  const plan = getPlan(planId);
  const paymentId = randomUUID();

  let order;
  try {
    order = await getRazorpay().orders.create({
      amount: plan.amount,
      currency: plan.currency,
      receipt: paymentId,
      notes: {
        paymentId,
        planId: plan.id,
        userId: user.id,
      },
    });
  } catch (error) {
    logger.error('Razorpay order creation failed', {
      statusCode: error?.statusCode,
      message: error?.error?.description ?? error?.message,
    });
    if (error?.statusCode === 401) {
      throw new ApiError(503, 'Secure checkout is temporarily unavailable');
    }
    throw new ApiError(500, 'Unable to create payment order');
  }

  if (!order?.id || order.amount !== plan.amount || order.currency !== 'INR') {
    throw new ApiError(502, 'Payment provider returned an invalid order');
  }

  try {
    await db.insert(Payments).values({
      id: paymentId,
      provider: 'razorpay',
      providerSessionId: order.id,
      userId: user.id,
      userEmail: user.userEmail,
      planId: plan.id,
      amountCents: plan.amount,
      currency: plan.currency.toLowerCase(),
      credits: plan.credits,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    logger.error('Unable to persist Razorpay order', {
      orderId: order.id,
      paymentId,
      message: error?.message,
    });
    throw error;
  }

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
  };
};

export const fulfillRazorpayPayment = async ({
  payment,
  razorpayPaymentId,
  providerEventId = `checkout:${razorpayPaymentId}`,
  eventType = 'checkout.verified',
  eventPayload,
}) => {
  if (payment.status === 'fulfilled') {
    return {
      status: 'fulfilled',
      idempotent: true,
      user: await getUserByProfileId(payment.userId),
    };
  }
  if (payment.status !== 'pending') {
    throw new ApiError(409, 'Payment order cannot be fulfilled');
  }

  const payload = JSON.stringify(
    eventPayload ?? {
      razorpayOrderId: payment.providerSessionId,
      razorpayPaymentId,
    }
  );
  const result = await db.execute(sql`
    WITH event_recorded AS (
      INSERT INTO app.payment_events (
        payment_id, provider, provider_event_id, event_type, payload, processed_at
      )
      VALUES (
        ${payment.id}, 'razorpay', ${providerEventId}, ${eventType},
        CAST(${payload} AS jsonb), now()
      )
      ON CONFLICT (provider, provider_event_id) DO NOTHING
      RETURNING id
    ), claimed AS (
      UPDATE app.payments
      SET
        status = 'fulfilled',
        provider_payment_intent_id = ${razorpayPaymentId},
        fulfilled_at = now(),
        updated_at = now()
      WHERE id = ${payment.id}
        AND provider = 'razorpay'
        AND provider_session_id = ${payment.providerSessionId}
        AND status = 'pending'
        AND EXISTS (SELECT 1 FROM event_recorded)
      RETURNING id, user_id, credits
    ), credited AS (
      UPDATE app.credit_accounts account
      SET balance = account.balance + claimed.credits, updated_at = now()
      FROM claimed
      WHERE account.user_id = claimed.user_id
      RETURNING account.id, account.user_id, account.balance,
        claimed.id AS payment_id, claimed.credits
    ), recorded AS (
      INSERT INTO app.credit_ledger (
        account_id, amount, balance_after, reason, idempotency_key,
        reference_type, reference_id
      )
      SELECT id, credits, balance, 'payment', 'payment:' || payment_id,
        'payment', payment_id::text
      FROM credited
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING account_id
    )
    SELECT
      profile.id,
      profile.auth_user_id AS "authUserId",
      profile.email AS "userEmail",
      profile.display_name AS "userName",
      profile.avatar_url AS "userImage",
      profile.role,
      credited.balance AS credit
    FROM credited
    INNER JOIN recorded ON recorded.account_id = credited.id
    INNER JOIN app.user_profiles profile ON profile.id = credited.user_id
  `);

  const fulfilledUser = result.rows?.[0];
  if (!fulfilledUser) {
    const current = await getPaymentByOrderId(payment.providerSessionId);
    if (current?.status === 'fulfilled') {
      return {
        status: 'fulfilled',
        idempotent: true,
        user: await getUserByProfileId(payment.userId),
      };
    }
    throw new ApiError(409, 'Payment could not be fulfilled');
  }

  return { status: 'fulfilled', idempotent: false, user: fulfilledUser };
};

export const verifyAndFulfillRazorpayPayment = async ({
  authUserId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  const user = await syncUserFromAuth(authUserId);
  const payment = await getPaymentByOrderId(razorpayOrderId);
  if (!payment) throw new ApiError(404, 'Payment order not found');
  if (payment.userId !== user.id) {
    throw new ApiError(403, 'This payment order does not belong to you');
  }

  const { keySecret } = getRazorpayConfig();
  const signatureValid = isValidRazorpaySignature({
    orderId: payment.providerSessionId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
    secret: keySecret,
  });
  if (!signatureValid) {
    throw new ApiError(400, 'Invalid payment signature');
  }
  return fulfillRazorpayPayment({ payment, razorpayPaymentId });
};

const getWebhookEventId = ({ eventId, eventType, paymentId }) => {
  const safeEventId = String(eventId ?? '').trim();
  if (safeEventId && safeEventId.length <= 200) {
    return `webhook:${safeEventId}`;
  }
  return `webhook:${eventType}:${paymentId}`;
};

const recordRazorpayEvent = async ({
  payment,
  providerEventId,
  eventType,
  eventPayload,
}) => {
  await db
    .insert(PaymentEvents)
    .values({
      paymentId: payment?.id ?? null,
      provider: 'razorpay',
      providerEventId,
      eventType,
      payload: eventPayload,
      processedAt: new Date(),
    })
    .onConflictDoNothing();
};

export const processRazorpayWebhook = async ({
  rawBody,
  signature,
  eventId,
}) => {
  const signatureValid = isValidRazorpayWebhookSignature({
    rawBody,
    signature,
    secret: getRazorpayWebhookSecret(),
  });
  if (!signatureValid) {
    throw new ApiError(400, 'Invalid Razorpay webhook signature');
  }

  let eventPayload;
  try {
    eventPayload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new ApiError(400, 'Invalid Razorpay webhook payload');
  }

  const eventType = String(eventPayload?.event ?? '');
  const providerPayment = eventPayload?.payload?.payment?.entity;
  if (
    !providerPayment?.id ||
    !providerPayment?.order_id ||
    !['payment.captured', 'payment.failed'].includes(eventType)
  ) {
    return { status: 'ignored', eventType: eventType || 'unknown' };
  }

  const payment = await getPaymentByOrderId(providerPayment.order_id);
  const providerEventId = getWebhookEventId({
    eventId,
    eventType,
    paymentId: providerPayment.id,
  });

  if (!payment) {
    logger.warn('Ignoring Razorpay webhook for an unknown order', {
      eventType,
      orderId: providerPayment.order_id,
      paymentId: providerPayment.id,
    });
    return { status: 'ignored', eventType };
  }

  if (eventType === 'payment.failed') {
    await recordRazorpayEvent({
      payment,
      providerEventId,
      eventType,
      eventPayload,
    });
    return { status: 'recorded', eventType };
  }

  const amountMatches = providerPayment.amount === payment.amountCents;
  const currencyMatches =
    String(providerPayment.currency ?? '').toLowerCase() === payment.currency;
  if (
    providerPayment.status !== 'captured' ||
    !amountMatches ||
    !currencyMatches
  ) {
    logger.error('Razorpay captured payment does not match stored order', {
      orderId: providerPayment.order_id,
      paymentId: providerPayment.id,
      status: providerPayment.status,
      amountMatches,
      currencyMatches,
    });
    throw new ApiError(400, 'Razorpay payment does not match the order');
  }

  return fulfillRazorpayPayment({
    payment,
    razorpayPaymentId: providerPayment.id,
    providerEventId,
    eventType,
    eventPayload,
  });
};
