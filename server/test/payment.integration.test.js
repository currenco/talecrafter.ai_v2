import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { config } from 'dotenv';

config();
process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

const enabled = process.env.RUN_INTEGRATION_TESTS === 'true';

test(
  'concurrent Razorpay captured webhooks grant credits exactly once',
  { skip: !enabled },
  async () => {
    assert.match(String(process.env.NEON_BRANCH ?? ''), /^dev\//);
    const [{ eq }, { db }, schema, paymentService] = await Promise.all([
      import('drizzle-orm'),
      import('../src/db/index.js'),
      import('../src/db/schema.js'),
      import('../src/services/payment.service.js'),
    ]);
    const { CreditAccounts, PaymentEvents, Payments, UserProfiles } = schema;
    const suffix = randomUUID().replaceAll('-', '');
    const profileId = randomUUID();
    const userEmail = `payment-test-${suffix}@example.invalid`;
    const orderId = `order_test_${suffix}`;
    const razorpayPaymentId = `pay_test_${suffix}`;
    const webhookSecret = `webhook-secret-${suffix}`;
    const rawBody = Buffer.from(
      JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: razorpayPaymentId,
              order_id: orderId,
              amount: 19900,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      })
    );
    const signature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

    let paymentId;
    try {
      await db.insert(UserProfiles).values({
        id: profileId,
        authUserId: `test:${suffix}`,
        userEmail,
        userName: 'Payment Test',
        userImage: '',
      });
      await db.insert(CreditAccounts).values({ userId: profileId, balance: 5 });
      const [payment] = await db
        .insert(Payments)
        .values({
          userId: profileId,
          provider: 'razorpay',
          providerSessionId: orderId,
          userEmail,
          planId: 'basic',
          amountCents: 19900,
          currency: 'inr',
          credits: 10,
          status: 'pending',
        })
        .returning();
      paymentId = payment.id;

      const results = await Promise.all([
        paymentService.processRazorpayWebhook({
          rawBody,
          signature,
          eventId: `event_${suffix}`,
        }),
        paymentService.processRazorpayWebhook({
          rawBody,
          signature,
          eventId: `event_${suffix}`,
        }),
      ]);

      const [account] = await db
        .select({ credit: CreditAccounts.balance })
        .from(CreditAccounts)
        .where(eq(CreditAccounts.userId, profileId));
      const [storedPayment] = await db
        .select({ status: Payments.status })
        .from(Payments)
        .where(eq(Payments.providerSessionId, orderId));

      assert.equal(account.credit, 15);
      assert.equal(storedPayment.status, 'fulfilled');
      assert.equal(results.filter(result => result.idempotent).length, 1);
    } finally {
      if (paymentId) {
        await db
          .delete(PaymentEvents)
          .where(eq(PaymentEvents.paymentId, paymentId));
      }
      await db.delete(Payments).where(eq(Payments.providerSessionId, orderId));
      await db.delete(UserProfiles).where(eq(UserProfiles.id, profileId));
    }
  }
);
