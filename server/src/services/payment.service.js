import Stripe from 'stripe';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { Payments, StripeProducts } from '../db/schema.js';
import ApiError from '../utils/ApiError.js';
import { syncUserFromAuth } from './user.service.js';

export const CREDIT_PLANS = [
  {
    id: 'basic',
    title: 'Basic',
    price: 1.99,
    amountCents: 199,
    credits: 10,
    subtitle: 'Great for getting started',
    highlighted: false,
  },
  {
    id: 'premium',
    title: 'Premium',
    price: 3.99,
    amountCents: 399,
    credits: 75,
    subtitle: 'Most popular for regular creators',
    highlighted: true,
  },
  {
    id: 'ultimate',
    title: 'Ultimate',
    price: 5.99,
    amountCents: 599,
    credits: 150,
    subtitle: 'Best value for high-volume usage',
    highlighted: false,
  },
];

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new ApiError(503, 'Stripe is not configured');
  }

  return new Stripe(secretKey);
};

const getPlan = planId => {
  const plan = CREDIT_PLANS.find(item => item.id === planId);
  if (!plan) throw new ApiError(400, 'Invalid credit plan');
  return plan;
};

const getAppOrigin = () => {
  const configured = String(process.env.CLIENT_ORIGIN ?? '').trim();
  if (configured) return configured.replace(/\/$/, '');
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000';
  throw new ApiError(503, 'Client origin is not configured');
};

const getPaymentBySessionId = async sessionId => {
  const rows = await db
    .select()
    .from(Payments)
    .where(
      and(
        eq(Payments.provider, 'stripe'),
        eq(Payments.providerSessionId, sessionId)
      )
    )
    .limit(1);

  return rows[0] ?? null;
};

const defaultPriceIdFromProduct = product => {
  const value = product.default_price;
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.id ?? null;
};

const assertCatalogEntryMatchesPlan = ({ catalogEntry, plan }) => {
  if (
    catalogEntry.amountCents !== plan.amountCents ||
    catalogEntry.currency !== 'usd' ||
    catalogEntry.credits !== plan.credits
  ) {
    throw new ApiError(
      503,
      `Stripe catalog entry for plan "${plan.id}" is out of date`
    );
  }
};

const getStripeProductForPlan = async plan => {
  const existing = await db
    .select()
    .from(StripeProducts)
    .where(eq(StripeProducts.planId, plan.id))
    .limit(1);

  if (existing[0]) {
    assertCatalogEntryMatchesPlan({ catalogEntry: existing[0], plan });
    return existing[0];
  }

  const stripe = getStripe();
  const product = await stripe.products.create(
    {
      name: `TaleCrafter AI ${plan.title} Credits`,
      description: `${plan.credits} story generation credits`,
      default_price_data: {
        currency: 'usd',
        unit_amount: plan.amountCents,
      },
      metadata: {
        planId: plan.id,
        credits: String(plan.credits),
      },
    },
    {
      idempotencyKey: `credit-plan:${plan.id}:usd:${plan.amountCents}:${plan.credits}`,
    }
  );
  const priceId = defaultPriceIdFromProduct(product);

  if (!priceId) {
    throw new ApiError(502, 'Stripe did not create a default product price');
  }

  await db
    .insert(StripeProducts)
    .values({
      planId: plan.id,
      productId: product.id,
      priceId,
      amountCents: plan.amountCents,
      currency: 'usd',
      credits: plan.credits,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: StripeProducts.planId });

  const catalogEntries = await db
    .select()
    .from(StripeProducts)
    .where(eq(StripeProducts.planId, plan.id))
    .limit(1);
  const catalogEntry = catalogEntries[0];

  if (!catalogEntry) {
    throw new ApiError(502, 'Unable to persist the Stripe product');
  }

  assertCatalogEntryMatchesPlan({ catalogEntry, plan });
  return catalogEntry;
};

const paymentIntentIdFromSession = session => {
  const value = session.payment_intent;
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.id ?? null;
};

const assertSessionMatchesPlan = ({ session, payment }) => {
  const plan = getPlan(payment.planId);

  if (session.mode !== 'payment') {
    throw new ApiError(400, 'Invalid checkout session type');
  }

  if (
    session.currency !== payment.currency ||
    session.amount_total !== payment.amountCents
  ) {
    throw new ApiError(
      400,
      'Checkout session amount does not match the payment ledger'
    );
  }

  if (
    plan.amountCents !== payment.amountCents ||
    plan.credits !== payment.credits
  ) {
    throw new ApiError(
      400,
      'Payment ledger does not match the configured plan'
    );
  }

  if (session.metadata?.userId !== payment.userId) {
    throw new ApiError(
      403,
      'Checkout session user does not match the payment ledger'
    );
  }

  if (session.metadata?.priceId !== payment.providerPriceId) {
    throw new ApiError(
      400,
      'Checkout session price does not match the payment ledger'
    );
  }
};

export const createStripeCheckoutSession = async ({ userId, planId }) => {
  const user = await syncUserFromAuth(userId);
  const plan = getPlan(planId);
  const appOrigin = getAppOrigin();
  const stripe = getStripe();
  const product = await getStripeProductForPlan(plan);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: user.id,
    customer_email: user.userEmail,
    success_url: `${appOrigin}/buy-credits?stripe_session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appOrigin}/buy-credits?stripe_cancelled=1`,
    line_items: [
      {
        price: product.priceId,
        quantity: 1,
      },
    ],
    metadata: {
      planId: plan.id,
      credits: String(plan.credits),
      priceId: product.priceId,
      userId: user.id,
    },
  });

  if (!session.url) {
    throw new ApiError(502, 'Unable to create Stripe checkout session');
  }

  try {
    await db
      .insert(Payments)
      .values({
        provider: 'stripe',
        providerSessionId: session.id,
        providerProductId: product.productId,
        providerPriceId: product.priceId,
        userId: user.id,
        userEmail: user.userEmail,
        planId: plan.id,
        amountCents: plan.amountCents,
        currency: 'usd',
        credits: plan.credits,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing({
        target: [Payments.provider, Payments.providerSessionId],
      });
  } catch (error) {
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
    throw error;
  }

  return { url: session.url, sessionId: session.id };
};

export const getStripeCheckoutStatus = async ({ userId, sessionId }) => {
  const safeSessionId = String(sessionId ?? '').trim();
  if (!safeSessionId) throw new ApiError(400, 'Stripe session ID is required');

  const user = await syncUserFromAuth(userId);
  const payment = await getPaymentBySessionId(safeSessionId);

  if (!payment) throw new ApiError(404, 'Payment not found');
  if (payment.userId !== user.id) {
    throw new ApiError(403, 'This checkout session does not belong to you');
  }

  return {
    status: payment.status,
    credits: payment.credits,
    fulfilledAt: payment.fulfilledAt,
    user,
  };
};

export const fulfillStripeCheckoutSession = async ({ session, rawEvent }) => {
  const safeSessionId = String(session?.id ?? '').trim();
  if (!safeSessionId) throw new ApiError(400, 'Stripe session ID is required');

  const payment = await getPaymentBySessionId(safeSessionId);
  if (!payment) throw new ApiError(404, 'Payment ledger entry not found');

  assertSessionMatchesPlan({ session, payment });

  if (payment.status === 'fulfilled') {
    return { status: 'fulfilled', idempotent: true };
  }

  if (session.status !== 'complete') {
    throw new ApiError(409, 'Checkout session is not complete');
  }

  if (session.payment_status === 'unpaid') {
    return { status: 'pending', idempotent: true };
  }

  const paymentIntentId = paymentIntentIdFromSession(session);
  const rawEventJson = JSON.stringify(rawEvent ?? null);
  const providerEventId = String(
    rawEvent?.id ?? `checkout:${safeSessionId}:${session.payment_status}`
  );
  const eventType = String(rawEvent?.type ?? 'checkout.session.completed');
  const result = await db.execute(sql`
    WITH event_recorded AS (
      INSERT INTO app.payment_events (
        payment_id, provider, provider_event_id, event_type, payload, processed_at
      )
      VALUES (
        ${payment.id}, 'stripe', ${providerEventId}, ${eventType},
        CAST(${rawEventJson} AS jsonb), now()
      )
      ON CONFLICT (provider, provider_event_id) DO NOTHING
      RETURNING id
    ), claimed AS (
      UPDATE app.payments
      SET
        status = 'fulfilled',
        provider_payment_intent_id = ${paymentIntentId},
        fulfilled_at = now(),
        updated_at = now()
      WHERE provider = 'stripe'
        AND provider_session_id = ${safeSessionId}
        AND status = 'pending'
        AND EXISTS (SELECT 1 FROM event_recorded)
      RETURNING id, user_id, credits
    ),
    credited AS (
      UPDATE app.credit_accounts account
      SET balance = account.balance + claimed.credits, updated_at = now()
      FROM claimed
      WHERE account.user_id = claimed.user_id
      RETURNING account.id, account.user_id, account.balance, claimed.id AS payment_id,
        claimed.credits
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
      'fulfilled' AS status,
      profile.id,
      profile.email AS "userEmail",
      profile.display_name AS "userName",
      profile.avatar_url AS "userImage",
      credited.balance AS credit
    FROM credited
    INNER JOIN recorded ON recorded.account_id = credited.id
    INNER JOIN app.user_profiles profile ON profile.id = credited.user_id
  `);

  const row = result.rows?.[0];
  if (!row) {
    const current = await getPaymentBySessionId(safeSessionId);
    if (current?.status === 'fulfilled') {
      return { status: 'fulfilled', idempotent: true };
    }
    throw new ApiError(409, 'Payment could not be fulfilled');
  }

  return {
    status: 'fulfilled',
    user: {
      id: row.id,
      userEmail: row.userEmail,
      userName: row.userName,
      userImage: row.userImage,
      credit: row.credit,
    },
  };
};

export const markStripeCheckoutFailed = async ({ session, rawEvent }) => {
  const safeSessionId = String(session?.id ?? '').trim();
  if (!safeSessionId) return { status: 'ignored' };

  const rawEventJson = JSON.stringify(rawEvent ?? null);
  const providerEventId = String(
    rawEvent?.id ?? `checkout:${safeSessionId}:failed`
  );
  const eventType = String(
    rawEvent?.type ?? 'checkout.session.async_payment_failed'
  );
  const result = await db.execute(sql`
    WITH payment AS (
      SELECT id FROM app.payments
      WHERE provider = 'stripe' AND provider_session_id = ${safeSessionId}
      LIMIT 1
    ), event_recorded AS (
      INSERT INTO app.payment_events (
        payment_id, provider, provider_event_id, event_type, payload, processed_at
      )
      SELECT id, 'stripe', ${providerEventId}, ${eventType},
        CAST(${rawEventJson} AS jsonb), now()
      FROM payment
      ON CONFLICT (provider, provider_event_id) DO NOTHING
      RETURNING payment_id
    )
    UPDATE app.payments
    SET status = 'failed', updated_at = now()
    WHERE id IN (SELECT payment_id FROM event_recorded)
      AND status = 'pending'
    RETURNING status
  `);

  return result.rows?.[0] ?? { status: 'ignored' };
};

export const constructStripeWebhookEvent = ({ rawBody, signature }) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new ApiError(503, 'Stripe webhook secret is not configured');
  }

  if (!signature) {
    throw new ApiError(400, 'Stripe signature is required');
  }

  const stripe = getStripe();

  try {
    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    throw new ApiError(400, 'Invalid Stripe webhook signature');
  }
};
