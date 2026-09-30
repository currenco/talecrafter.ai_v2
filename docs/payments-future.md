# Payments Reference

Credit purchases use Razorpay Standard Web Checkout. Order creation and
signature verification are owned by the Express backend; the browser never
receives the Razorpay Key Secret or controls plan amounts.

## Credit Packs

- Basic: 10 credits for INR 199
- Premium: 75 credits for INR 399
- Ultimate: 150 credits for INR 599

Prices are stored in paise in backend code. The client sends only a plan ID.

## API Flow

1. The authenticated client posts a plan ID to
   `POST /api/v1/payments/razorpay/orders`.
2. The backend creates a Razorpay order and records a pending payment linked to
   the stable application user ID.
3. Standard Checkout returns the payment ID, order ID, and signature to the
   browser.
4. The browser posts those values to
   `POST /api/v1/payments/razorpay/verify`.
5. The backend verifies the HMAC signature using its stored order ID, then
   atomically fulfills the payment and credits the append-only ledger.
6. Razorpay independently posts captured and failed payment events to
   `POST /api/v1/payments/razorpay/webhook`. The backend verifies the exact raw
   body with the separate webhook secret and reconciles captured payments
   through the same idempotent fulfillment transaction.

Duplicate verification requests are idempotent. Invalid signatures never
change payment or credit state.

## Environment

Server-only:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Browser-safe:

- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

The public Key ID must belong to the same Razorpay account and mode as the
server credentials.

## Before Live Mode

- Replace all test keys with live keys in the deployment environment.
- Enable automatic payment capture in the Razorpay Dashboard.
- Configure the public backend webhook URL and subscribe to `payment.captured`
  and `payment.failed`.
- Test duplicate callbacks, failed payments, and ledger reconciliation on a
  non-production database.
