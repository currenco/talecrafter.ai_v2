import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';

config();
process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

const enabled = process.env.RUN_INTEGRATION_TESTS === 'true';

test(
  'concurrent Stripe fulfillment grants credits exactly once',
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
    const sessionId = `cs_test_${suffix}`;
    const session = {
      id: sessionId,
      mode: 'payment',
      currency: 'usd',
      amount_total: 199,
      status: 'complete',
      payment_status: 'paid',
      payment_intent: `pi_test_${suffix}`,
      metadata: { userId: profileId, priceId: `price_test_${suffix}` },
    };

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
      const [insertedPayment] = await db
        .insert(Payments)
        .values({
          userId: profileId,
          provider: 'stripe',
          providerSessionId: sessionId,
          providerProductId: `prod_test_${suffix}`,
          providerPriceId: `price_test_${suffix}`,
          userEmail,
          planId: 'basic',
          amountCents: 199,
          currency: 'usd',
          credits: 10,
          status: 'pending',
        })
        .returning({ id: Payments.id });
      paymentId = insertedPayment.id;

      const results = await Promise.all([
        paymentService.fulfillStripeCheckoutSession({
          session,
          rawEvent: {
            id: `evt_a_${suffix}`,
            type: 'checkout.session.completed',
          },
        }),
        paymentService.fulfillStripeCheckoutSession({
          session,
          rawEvent: {
            id: `evt_b_${suffix}`,
            type: 'checkout.session.completed',
          },
        }),
      ]);

      const [account] = await db
        .select({ credit: CreditAccounts.balance })
        .from(CreditAccounts)
        .where(eq(CreditAccounts.userId, profileId));
      const [payment] = await db
        .select({ status: Payments.status })
        .from(Payments)
        .where(eq(Payments.providerSessionId, sessionId));

      assert.equal(account.credit, 15);
      assert.equal(payment.status, 'fulfilled');
      assert.equal(results.filter(result => result.idempotent).length, 1);
    } finally {
      if (paymentId) {
        await db
          .delete(PaymentEvents)
          .where(eq(PaymentEvents.paymentId, paymentId));
      }
      await db
        .delete(Payments)
        .where(eq(Payments.providerSessionId, sessionId));
      await db.delete(UserProfiles).where(eq(UserProfiles.id, profileId));
    }
  }
);
