import { createHmac, timingSafeEqual } from 'node:crypto';

export const CREDIT_PLANS = [
  {
    id: 'basic',
    title: 'Basic',
    amount: 19900,
    currency: 'INR',
    credits: 10,
  },
  {
    id: 'premium',
    title: 'Premium',
    amount: 39900,
    currency: 'INR',
    credits: 75,
  },
  {
    id: 'ultimate',
    title: 'Ultimate',
    amount: 59900,
    currency: 'INR',
    credits: 150,
  },
];

export const isValidRazorpaySignature = ({
  orderId,
  paymentId,
  signature,
  secret,
}) => {
  const safeSignature = String(signature ?? '')
    .trim()
    .toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(safeSignature)) return false;

  const expected = createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const received = Buffer.from(safeSignature, 'hex');
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};

export const isValidRazorpayWebhookSignature = ({
  rawBody,
  signature,
  secret,
}) => {
  if (!Buffer.isBuffer(rawBody)) return false;

  const safeSignature = String(signature ?? '')
    .trim()
    .toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(safeSignature)) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const received = Buffer.from(safeSignature, 'hex');
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};
