import { randomUUID } from 'node:crypto';
import Razorpay from 'razorpay';
import { creatorCheckoutEnabled } from '../config/env.js';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import ApiError from '../utils/ApiError.js';
import { isValidRazorpayWebhookSignature } from '../utils/razorpay.js';
import { CREATOR_PLAN } from '../utils/plans.js';
import {
  paidInvoicePeriod,
  validSubscriptionSignature,
} from '../utils/subscriptions.js';
import { syncUserFromAuth } from './user.service.js';

const config = () => {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const planId = process.env.RAZORPAY_CREATOR_PLAN_ID;
  if (!key || !secret || !planId)
    throw new ApiError(503, 'Creator checkout is not configured');
  return { key, secret, planId };
};
const provider = () => {
  const { key, secret } = config();
  return new Razorpay({ key_id: key, key_secret: secret });
};
const callProvider = async operation => {
  try {
    return await operation(provider());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      502,
      'Payment provider is temporarily unavailable. Please retry.'
    );
  }
};
const subscriptionFor = async userId => {
  const result = await db.execute(
    sql`SELECT * FROM app.creator_subscriptions WHERE user_id = ${userId}`
  );
  return result.rows[0];
};
const ownedSubscription = async (authUserId, subscriptionId) => {
  const user = await syncUserFromAuth(authUserId);
  const subscription = await subscriptionFor(user.id);
  if (
    !subscription?.provider_subscription_id ||
    (subscriptionId && subscription.provider_subscription_id !== subscriptionId)
  ) {
    throw new ApiError(404, 'Subscription not found');
  }
  return { user, subscription };
};

export const subscriptionStatus = async authUserId => {
  const user = await syncUserFromAuth(authUserId);
  return {
    user,
    checkoutEnabled: creatorCheckoutEnabled(),
  };
};

export const createSubscription = async authUserId => {
  if (!creatorCheckoutEnabled())
    throw new ApiError(503, 'Creator subscriptions are not available yet');
  const { user, checkoutEnabled } = await subscriptionStatus(authUserId);
  if (!checkoutEnabled)
    throw new ApiError(503, 'Creator subscriptions are not available yet');
  if (user.plan === 'creator')
    throw new ApiError(409, 'Creator is already active');
  const { planId, key } = config();
  const existing = await subscriptionFor(user.id);
  if (
    existing &&
    ['created', 'authenticated'].includes(existing.status) &&
    existing.provider_subscription_id
  ) {
    return { subscriptionId: existing.provider_subscription_id, key };
  }
  if (
    existing &&
    !['cancelled', 'completed', 'expired'].includes(existing.status)
  ) {
    throw new ApiError(
      409,
      'A subscription already exists. Refresh its status or contact support.'
    );
  }
  const plan = await callProvider(api => api.plans.fetch(planId));
  if (
    plan.period !== 'monthly' ||
    plan.interval !== 1 ||
    plan.item?.amount !== CREATOR_PLAN.amount ||
    plan.item?.currency !== CREATOR_PLAN.currency
  ) {
    throw new ApiError(503, 'Creator billing plan must be USD 9 per month');
  }
  const id = randomUUID();
  // Claim before calling the external API so concurrent clicks cannot create two mandates.
  const claimed = await db.execute(sql`
    INSERT INTO app.creator_subscriptions (id, user_id, provider_plan_id)
    VALUES (${id}, ${user.id}, ${planId})
    ON CONFLICT (user_id) DO UPDATE SET
      provider_plan_id = EXCLUDED.provider_plan_id, status = 'creating',
      provider_subscription_id = NULL, period_start = NULL, paid_through = NULL,
      revoked = false, cancel_at_period_end = false, updated_at = now()
    WHERE app.creator_subscriptions.status IN ('cancelled','completed','expired')
      AND (app.creator_subscriptions.paid_through IS NULL OR app.creator_subscriptions.paid_through <= now())
    RETURNING id
  `);
  if (!claimed.rows[0])
    throw new ApiError(409, 'Subscription setup is already in progress');
  // Leave an ambiguous failed creation locked for reconciliation, never blindly create a second mandate.
  const sub = await callProvider(api =>
    api.subscriptions.create({
      plan_id: planId,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notes: { profileId: user.id, localSubscriptionId: claimed.rows[0].id },
    })
  );
  if (!sub.id || sub.plan_id !== planId)
    throw new ApiError(502, 'Invalid subscription response');
  await db.execute(sql`
    UPDATE app.creator_subscriptions SET provider_subscription_id = ${sub.id},
      status = ${sub.status}, period_start = NULL, paid_through = NULL,
      revoked = false, cancel_at_period_end = false, updated_at = now()
    WHERE user_id = ${user.id} AND status = 'creating'
  `);
  return { subscriptionId: sub.id, key };
};

const recordPaidInvoice = async (local, paymentId) => {
  const payment = await callProvider(api => api.payments.fetch(paymentId));
  if (!payment.invoice_id) return false; // Mandate authorisation is not a paid subscription cycle.
  const invoice = await callProvider(api =>
    api.invoices.fetch(payment.invoice_id)
  );
  const period = paidInvoicePeriod({
    payment,
    invoice,
    subscriptionId: local.provider_subscription_id,
  });
  if (!period || period.start > new Date()) return false;
  await db.batch([
    db.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${payment.id}, 0))`
    ),
    db.execute(sql`
    WITH inserted AS (
      INSERT INTO app.subscription_invoices
        (provider_payment_id, subscription_id, provider_invoice_id, period_start, period_end, amount, currency)
      VALUES (${payment.id}, ${local.id}, ${invoice.id}, ${period.start}, ${period.end},
        ${payment.amount}, ${payment.currency})
      ON CONFLICT DO NOTHING RETURNING period_start, period_end
    )
    UPDATE app.creator_subscriptions s SET period_start = inserted.period_start,
      paid_through = inserted.period_end,
      revoked = EXISTS (SELECT 1 FROM app.subscription_holds WHERE provider_payment_id = ${payment.id}),
      updated_at = now()
    FROM inserted WHERE s.id = ${local.id}
      AND s.provider_subscription_id = ${local.provider_subscription_id}
      AND (s.paid_through IS NULL OR inserted.period_end > s.paid_through)
  `),
  ]);
  return true;
};

export const verifySubscription = async ({
  authUserId,
  razorpaySubscriptionId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  const { user, subscription } = await ownedSubscription(
    authUserId,
    razorpaySubscriptionId
  );
  if (
    !validSubscriptionSignature({
      paymentId: razorpayPaymentId,
      subscriptionId: subscription.provider_subscription_id,
      signature: razorpaySignature,
      secret: config().secret,
    })
  )
    throw new ApiError(400, 'Invalid payment signature');
  await recordPaidInvoice(subscription, razorpayPaymentId);
  return subscriptionStatus(user.authUserId);
};

export const refreshSubscription = async authUserId => {
  const { subscription } = await ownedSubscription(authUserId);
  const sub = await callProvider(api =>
    api.subscriptions.fetch(subscription.provider_subscription_id)
  );
  if (sub.plan_id !== subscription.provider_plan_id)
    throw new ApiError(502, 'Subscription plan mismatch');
  const invoices = await callProvider(api =>
    api.invoices.all({
      subscription_id: sub.id,
      count: 100,
    })
  );
  for (const invoice of invoices.items ?? []) {
    if (
      invoice.status === 'paid' &&
      invoice.payment_id &&
      Number(invoice.billing_end) * 1000 > Date.now()
    )
      await recordPaidInvoice(subscription, invoice.payment_id);
  }
  await db.execute(sql`UPDATE app.creator_subscriptions SET status = ${sub.status}, updated_at = now()
    WHERE id = ${subscription.id} AND provider_subscription_id = ${sub.id}`);
  return subscriptionStatus(authUserId);
};

export const cancelSubscription = async authUserId => {
  const { subscription } = await ownedSubscription(authUserId);
  if (
    !subscription.cancel_at_period_end &&
    !['cancelled', 'completed', 'expired'].includes(subscription.status)
  ) {
    const atPeriodEnd = Boolean(
      subscription.paid_through &&
      new Date(subscription.paid_through) > new Date()
    );
    const cancelled = await callProvider(api =>
      api.subscriptions.cancel(
        subscription.provider_subscription_id,
        atPeriodEnd
      )
    );
    await db.execute(sql`UPDATE app.creator_subscriptions SET cancel_at_period_end = true, status = ${cancelled.status}, updated_at = now()
      WHERE id = ${subscription.id} AND provider_subscription_id = ${subscription.provider_subscription_id}`);
  }
  return subscriptionStatus(authUserId);
};

export const processRazorpayWebhook = async ({ rawBody, signature }) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new ApiError(503, 'Razorpay webhook is not configured');
  if (!isValidRazorpayWebhookSignature({ rawBody, signature, secret })) {
    throw new ApiError(400, 'Invalid Razorpay webhook signature');
  }
  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new ApiError(400, 'Invalid webhook payload');
  }
  if (
    event.event === 'refund.processed' ||
    event.event === 'payment.dispute.created'
  ) {
    const paymentId =
      event.payload?.refund?.entity?.payment_id ??
      event.payload?.dispute?.entity?.payment_id;
    if (paymentId) {
      await db.batch([
        db.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${paymentId}, 0))`
        ),
        db.execute(sql`INSERT INTO app.subscription_holds(provider_payment_id, reason)
          VALUES (${paymentId}, ${event.event}) ON CONFLICT DO NOTHING`),
        db.execute(sql`
      WITH changed AS (
        UPDATE app.subscription_invoices SET refunded = true WHERE provider_payment_id = ${paymentId}
        RETURNING subscription_id, period_end
      )
      UPDATE app.creator_subscriptions s SET revoked = true, updated_at = now()
      FROM changed WHERE s.id = changed.subscription_id AND s.paid_through = changed.period_end
    `),
      ]);
    }
    return { status: 'processed' };
  }
  const sub = event.payload?.subscription?.entity;
  if (!sub?.id || !String(event.event).startsWith('subscription.'))
    return { status: 'ignored' };
  const result = await db.execute(sql`SELECT * FROM app.creator_subscriptions
    WHERE provider_subscription_id = ${sub.id}`);
  const local = result.rows[0];
  if (!local) {
    if (sub.notes?.localSubscriptionId) {
      const pending =
        await db.execute(sql`SELECT id FROM app.creator_subscriptions
        WHERE id::text = ${String(sub.notes.localSubscriptionId)} AND status = 'creating'`);
      if (pending.rows[0])
        throw new ApiError(
          503,
          'Subscription mapping is not ready; retry webhook'
        );
    }
    return { status: 'ignored' };
  }
  if (sub.plan_id !== local.provider_plan_id)
    throw new ApiError(400, 'Subscription plan mismatch');
  const paymentId = event.payload?.payment?.entity?.id;
  if (event.event === 'subscription.charged' && paymentId) {
    if (!(await recordPaidInvoice(local, paymentId)))
      throw new ApiError(503, 'Paid invoice is not ready; retry webhook');
  }
  // Fetch current state instead of applying possibly delayed/out-of-order status payloads.
  const current = await callProvider(api => api.subscriptions.fetch(sub.id));
  await db.execute(sql`UPDATE app.creator_subscriptions SET status = ${current.status}, updated_at = now()
    WHERE id = ${local.id} AND provider_subscription_id = ${sub.id}`);
  return { status: 'processed' };
};
