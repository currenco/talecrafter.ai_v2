import { createHmac, timingSafeEqual } from 'node:crypto';

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
