import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { subscriptionDb } from './helpers/subscription-db.js';

test('subscription lifecycle grants only verified paid periods and handles replays and refunds', async () => {
  const { pg } = await subscriptionDb();
  const profileId = randomUUID();
  const subscriptionId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const payments = new Map();
  const invoices = new Map();
  let created = 0;
  let beforeCreate = async () => {};
  let cancels = 0;
  let providerStatus = 'active';
  const sub = {
    id: 'sub_test',
    plan_id: 'plan_test',
    get status() {
      return providerStatus;
    },
  };
  mock.module('razorpay', {
    defaultExport: class {
      plans = {
        fetch: async () => ({
          period: 'monthly',
          interval: 1,
          item: { amount: 900, currency: 'USD' },
        }),
      };
      payments = { fetch: async id => payments.get(id) };
      invoices = {
        fetch: async id => invoices.get(id),
        all: async () => ({ items: [...invoices.values()] }),
      };
      subscriptions = {
        fetch: async () => sub,
        create: async () => {
          created += 1;
          await beforeCreate();
          return {
            id: `sub_new${created}`,
            plan_id: 'plan_test',
            status: 'created',
          };
        },
        cancel: async (id, atPeriodEnd) => {
          assert.equal(id, sub.id);
          assert.equal(atPeriodEnd, true);
          cancels += 1;
          return sub;
        },
      };
    },
  });
  Object.assign(process.env, {
    RAZORPAY_KEY_ID: 'rzp_test_fixture',
    RAZORPAY_KEY_SECRET: 'test-secret',
    RAZORPAY_CREATOR_PLAN_ID: 'plan_test',
    RAZORPAY_WEBHOOK_SECRET: 'webhook-test',
    CREATOR_CHECKOUT_ENABLED: 'true',
    POLLINATIONS_PLATFORM_KEY: 'sk_test',
    POLLINATIONS_PLATFORM_MONTHLY_ATTEMPT_LIMIT: '100',
  });
  const service = await import('../src/services/payment.service.js');
  process.env.CREATOR_CHECKOUT_ENABLED = 'false';
  await assert.rejects(
    service.createSubscription('unauthenticated-fixture'),
    error => error.statusCode === 503
  );
  assert.equal(created, 0);
  process.env.CREATOR_CHECKOUT_ENABLED = 'true';
  const sign = paymentId =>
    createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(paymentId + '|' + sub.id)
      .digest('hex');
  const verify = (
    paymentId,
    signature = sign(paymentId),
    authUserId = 'auth-test'
  ) =>
    service.verifySubscription({
      authUserId,
      razorpaySubscriptionId: sub.id,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    });
  const webhook = async (event, payload) => {
    const rawBody = Buffer.from(JSON.stringify({ event, payload }));
    return service.processRazorpayWebhook({
      rawBody,
      signature: createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex'),
    });
  };
  const paid = (id, start, end) => {
    payments.set(id, {
      id,
      invoice_id: 'inv_' + id,
      status: 'captured',
      amount: 900,
      amount_refunded: 0,
      currency: 'USD',
    });
    invoices.set('inv_' + id, {
      id: 'inv_' + id,
      payment_id: id,
      subscription_id: sub.id,
      status: 'paid',
      amount_paid: 900,
      currency: 'USD',
      billing_start: start,
      billing_end: end,
    });
  };
  try {
    await pg.query(
      'INSERT INTO neon_auth."user" (id,email) VALUES ($1,$2),($3,$4)',
      [
        'auth-test',
        'payer@example.invalid',
        'other-test',
        'other@example.invalid',
      ]
    );
    await pg.query(
      'INSERT INTO app.user_profiles(id,auth_user_id,email,display_name) VALUES ($1,$2,$3,$4)',
      [profileId, 'auth-test', 'payer@example.invalid', 'Test Payer']
    );
    await pg.query(
      'INSERT INTO app.creator_subscriptions(id,user_id,provider_subscription_id,provider_plan_id,status) VALUES($1,$2,$3,$4,$5)',
      [subscriptionId, profileId, sub.id, sub.plan_id, 'authenticated']
    );
    payments.set('pay_mandate', {
      id: 'pay_mandate',
      status: 'authorized',
      amount: 100,
      currency: 'USD',
    });
    assert.equal((await verify('pay_mandate')).user.plan, 'free');
    await assert.rejects(
      verify('pay_mandate', '0'.repeat(64)),
      e => e.statusCode === 400
    );
    await assert.rejects(
      verify('pay_mandate', sign('pay_mandate'), 'other-test'),
      e => e.statusCode === 404
    );
    paid('pay_current', now - 86400, now + 29 * 86400);
    const results = await Promise.all([
      verify('pay_current'),
      verify('pay_current'),
    ]);
    assert.ok(results.every(r => r.user.plan === 'creator'));
    assert.equal(
      (
        await pg.query(
          'SELECT count(*)::int AS n FROM app.subscription_invoices'
        )
      ).rows[0].n,
      1
    );
    await assert.rejects(
      service.createSubscription('auth-test'),
      e => e.statusCode === 409
    );
    await service.cancelSubscription('auth-test');
    assert.equal(
      (await service.subscriptionStatus('auth-test')).user.plan,
      'creator'
    );
    await service.cancelSubscription('auth-test');
    assert.equal(cancels, 1);
    await webhook('refund.processed', {
      refund: { entity: { payment_id: 'pay_current' } },
    });
    assert.equal((await verify('pay_current')).user.plan, 'free');
    paid('pay_old', now - 61 * 86400, now - 31 * 86400);
    assert.equal((await verify('pay_old')).user.plan, 'free');
    assert.equal(
      (
        await pg.query(
          'SELECT extract(epoch FROM paid_through)::bigint AS end FROM app.creator_subscriptions WHERE id=$1',
          [subscriptionId]
        )
      ).rows[0].end,
      now + 29 * 86400
    );
    // A dispute arriving before the corresponding paid invoice must still prevent access.
    paid('pay_held', now, now + 30 * 86400);
    await webhook('payment.dispute.created', {
      dispute: { entity: { payment_id: 'pay_held' } },
    });
    assert.equal((await verify('pay_held')).user.plan, 'free');
    paid('pay_renewal', now + 86400, now + 31 * 86400);
    assert.equal(
      (await verify('pay_renewal')).user.plan,
      'free',
      'future periods cannot unlock access early'
    );
    providerStatus = 'cancelled';
    await service.refreshSubscription('auth-test');
    assert.equal(
      (await service.subscriptionStatus('auth-test')).user.subscriptionStatus,
      'cancelled'
    );
    // Another user's concurrent checkout clicks create one mandate, not two.
    const attempts = await Promise.allSettled([
      service.createSubscription('other-test'),
      service.createSubscription('other-test'),
    ]);
    assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(created, 1);
    await pg.query(
      "UPDATE app.creator_subscriptions SET paid_through=now()-interval '1 day' WHERE id=$1",
      [subscriptionId]
    );
    beforeCreate = async () => {
      const result = await webhook('subscription.cancelled', {
        subscription: { entity: sub },
      });
      assert.equal(result.status, 'ignored');
      const row = (
        await pg.query(
          'SELECT status,provider_subscription_id FROM app.creator_subscriptions WHERE id=$1',
          [subscriptionId]
        )
      ).rows[0];
      assert.equal(row.status, 'creating');
      assert.equal(row.provider_subscription_id, null);
    };
    assert.equal(
      (await service.createSubscription('auth-test')).subscriptionId,
      'sub_new2'
    );
  } finally {
    await pg.close();
    mock.restoreAll();
  }
});
