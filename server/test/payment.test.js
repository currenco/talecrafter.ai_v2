import test from 'node:test';
import assert from 'node:assert/strict';
import { publicStory } from '../src/utils/publicStory.js';

test('public story projection preserves readable text but excludes creator-only data', () => {
  const source = {
    storyId: 'test',
    output: {
      title: 'Title',
      characterDescriptions: { Mira: 'Secret' },
      chapters: [
        {
          title: 'Scene',
          textPrompt: 'The full story text',
          imagePrompt: 'Private prompt',
          imageUrl: '/image.png',
        },
      ],
    },
  };
  const result = publicStory(source);
  assert.equal(result.output.chapters[0].textPrompt, 'The full story text');
  assert.equal(result.output.chapters[0].imagePrompt, undefined);
  assert.equal(result.output.characterDescriptions, undefined);
  assert.equal(source.output.characterDescriptions.Mira, 'Secret');
});
import { createHmac } from 'node:crypto';
import { isValidRazorpayWebhookSignature } from '../src/utils/razorpay.js';
import {
  paidInvoicePeriod,
  validSubscriptionSignature,
} from '../src/utils/subscriptions.js';
import {
  CREATOR_PLAN,
  hasCreatorAccess,
  generationPermission,
  freePeriod,
} from '../src/utils/plans.js';

test('Creator is a USD 9 monthly plan with bounded usage', () => {
  assert.equal(CREATOR_PLAN.amount, 900);
  assert.equal(CREATOR_PLAN.currency, 'USD');
  assert.equal(CREATOR_PLAN.projects, 15);
  assert.equal(CREATOR_PLAN.images, 120);
});
test('subscription signatures bind payment to server-owned subscription in correct order', () => {
  const secret = 'test-secret';
  const paymentId = 'pay_test';
  const subscriptionId = 'sub_test';
  const signature = createHmac('sha256', secret)
    .update(paymentId + '|' + subscriptionId)
    .digest('hex');
  assert.equal(
    validSubscriptionSignature({
      secret,
      paymentId,
      subscriptionId,
      signature,
    }),
    true
  );
  for (const bad of ['bad', '', undefined, 'f'.repeat(64)]) {
    assert.equal(
      validSubscriptionSignature({
        secret,
        paymentId,
        subscriptionId,
        signature: bad,
      }),
      false
    );
  }
  assert.equal(
    validSubscriptionSignature({
      secret,
      paymentId,
      subscriptionId: 'sub_other',
      signature,
    }),
    false
  );
  const reversed = createHmac('sha256', secret)
    .update(subscriptionId + '|' + paymentId)
    .digest('hex');
  assert.equal(
    validSubscriptionSignature({
      secret,
      paymentId,
      subscriptionId,
      signature: reversed,
    }),
    false
  );
});
test('only captured exact-price paid invoices grant a bounded billing period', () => {
  const payment = {
    id: 'pay_test',
    invoice_id: 'inv_test',
    status: 'captured',
    amount: 900,
    currency: 'USD',
    amount_refunded: 0,
  };
  const invoice = {
    id: 'inv_test',
    payment_id: 'pay_test',
    subscription_id: 'sub_test',
    status: 'paid',
    amount_paid: 900,
    currency: 'USD',
    billing_start: 1790812800,
    billing_end: 1793491200,
  };
  const check = (p = payment, i = invoice) =>
    paidInvoicePeriod({ payment: p, invoice: i, subscriptionId: 'sub_test' });
  assert.ok(check());
  for (const change of [
    { status: 'authorized' },
    { amount: 100 },
    { currency: 'INR' },
    { amount_refunded: 1 },
    { invoice_id: 'inv_other' },
  ]) {
    assert.equal(check({ ...payment, ...change }), null);
  }
  for (const change of [
    { subscription_id: 'sub_other' },
    { payment_id: 'pay_other' },
    { status: 'issued' },
    { amount_paid: 0 },
    { billing_end: null },
    { billing_start: null },
  ]) {
    assert.equal(check(payment, { ...invoice, ...change }), null);
  }
});
test('access expires by paid period, not cached active status', () => {
  const now = new Date('2026-10-12T00:00:00Z');
  const period = { periodStart: '2026-10-01', paidThrough: '2026-11-01' };
  assert.equal(hasCreatorAccess(period, now), true);
  assert.equal(hasCreatorAccess({ ...period, status: 'cancelled' }, now), true);
  assert.equal(hasCreatorAccess({ ...period, revoked: true }, now), false);
  assert.equal(hasCreatorAccess({ ...period, paidThrough: now }, now), false);
  assert.equal(
    hasCreatorAccess({ ...period, periodStart: '2026-10-20' }, now),
    false
  );
  assert.equal(hasCreatorAccess({ status: 'active' }, now), false);
  assert.equal(freePeriod(now), '2026-10');
});
test('only Free creation requires linked GitHub; branching is Creator-only', () => {
  assert.equal(
    generationPermission({
      creator: false,
      githubConnected: false,
      kind: 'classic',
    }),
    'GITHUB_REQUIRED'
  );
  assert.equal(
    generationPermission({
      creator: false,
      githubConnected: true,
      kind: 'classic',
    }),
    null
  );
  for (const kind of [
    'interactive_starter',
    'interactive_continue',
    'interactive_complete',
  ]) {
    assert.equal(
      generationPermission({ creator: false, githubConnected: true, kind }),
      'CREATOR_REQUIRED'
    );
    assert.equal(
      generationPermission({ creator: true, githubConnected: false, kind }),
      null
    );
  }
  assert.equal(
    generationPermission({
      creator: true,
      githubConnected: false,
      kind: 'classic',
    }),
    null
  );
});
test('validates Razorpay webhook signatures against the raw body', () => {
  const secret = 'webhook-secret-that-is-long-enough';
  const rawBody = Buffer.from(
    JSON.stringify({ event: 'payment.captured', payload: { payment: {} } })
  );
  const signature = createHmac('sha256', secret).update(rawBody).digest('hex');

  assert.equal(
    isValidRazorpayWebhookSignature({ rawBody, signature, secret }),
    true
  );
  assert.equal(
    isValidRazorpayWebhookSignature({
      rawBody: Buffer.from(`${rawBody.toString()} `),
      signature,
      secret,
    }),
    false
  );
  assert.equal(
    isValidRazorpayWebhookSignature({
      rawBody,
      signature: 'not-a-signature',
      secret,
    }),
    false
  );
});
