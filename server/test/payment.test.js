import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  CREDIT_PLANS,
  isValidRazorpaySignature,
  isValidRazorpayWebhookSignature,
} from '../src/utils/razorpay.js';

test('Razorpay credit plans use valid minimum subunit amounts', () => {
  for (const plan of CREDIT_PLANS) {
    assert.equal(Number.isInteger(plan.amount), true);
    assert.equal(plan.amount >= 100, true);
    assert.equal(plan.currency, 'INR');
  }
});

test('validates Razorpay payment signatures', () => {
  const secret = 'test-secret';
  const orderId = 'order_test_123';
  const paymentId = 'pay_test_123';
  const signature = createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert.equal(
    isValidRazorpaySignature({ orderId, paymentId, signature, secret }),
    true
  );
  assert.equal(
    isValidRazorpaySignature({
      orderId,
      paymentId: 'pay_tampered',
      signature,
      secret,
    }),
    false
  );
  assert.equal(
    isValidRazorpaySignature({
      orderId,
      paymentId,
      signature: 'not-a-signature',
      secret,
    }),
    false
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
