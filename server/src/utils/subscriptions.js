import { createHmac, timingSafeEqual } from 'node:crypto';
import { CREATOR_PLAN } from './plans.js';

export const validSubscriptionSignature = ({
  paymentId,
  subscriptionId,
  signature,
  secret,
}) => {
  if (typeof signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(signature))
    return false;
  const expected = createHmac('sha256', secret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
};

export const paidInvoicePeriod = ({ payment, invoice, subscriptionId }) => {
  const start = Number(invoice?.billing_start);
  const end = Number(invoice?.billing_end);
  if (
    payment?.status !== 'captured' ||
    Number(payment.amount_refunded ?? 0) !== 0 ||
    payment.amount !== CREATOR_PLAN.amount ||
    payment.currency !== CREATOR_PLAN.currency ||
    invoice?.status !== 'paid' ||
    invoice.subscription_id !== subscriptionId ||
    invoice.payment_id !== payment.id ||
    payment.invoice_id !== invoice.id ||
    invoice.currency !== CREATOR_PLAN.currency ||
    invoice.amount_paid !== CREATOR_PLAN.amount ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start <= 0 ||
    end <= start ||
    end - start > 32 * 86400
  )
    return null;
  return { start: new Date(start * 1000), end: new Date(end * 1000) };
};
