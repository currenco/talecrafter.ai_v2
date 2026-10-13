# Creator Subscription Rollout

## Product Rules

- Both plans can sign in with Google or GitHub and read published stories.
- Free creation requires a linked GitHub identity, allows Classic only, and uses the user's encrypted Pollinations token. Limits reset each UTC calendar month: 3 projects, 24 successful images and 6 image-to-story ideas.
- Creator is USD 9 per automatically renewing month: 15 projects, 120 successful images and 60 ideas per paid invoice period. Branching continuations consume images, not another project. Covers count as images. Unused allowances do not roll over. Cancel renewal from `/pricing`.
- Creator generation uses the server-only `POLLINATIONS_PLATFORM_KEY`, never the user's token or the public application/referral key. Gemini remains the text provider.
- Failed project attempts release their project reservation. Successfully persisted partial images retain usage. Failed image uploads release personal image reservations, but global provider-attempt usage is retained because a timeout may still cost Pollen.
- PDF and creator-pack APIs require a current paid period. Public responses exclude character descriptions and scene-generation prompts. This is feature access control, not DRM against printing public content.
- Old credit accounts, ledger and payment records remain archival database structures. No balance grants, spending, adjustments, purchases or conversions are active. Never delete financial records as part of rollout.

## Configuration And Deployment

### Initial Free Launch (Payments Disabled)

Set `NODE_ENV=production` and `CREATOR_CHECKOUT_ENABLED=false` on the backend. Configure the normal Neon Auth/database, Gemini, Cloudinary and user-funded Pollinations OAuth credentials. Razorpay keys, the Creator plan ID, platform image key and platform attempt cap are not required for a Free-only launch. Retain them if there are already paying subscribers so cancellation and renewal reconciliation continue working.

Subscription migrations are required even when payments are disabled: `/users/me` uses the new entitlement tables. Development and production are migrated through `0009`. Keep the frontend `API_BASE_URL` pointed at the deployed `/api/v1` backend and configure production Auth origins/callbacks.

Production migrations `0008` and `0009` were applied together in a transaction on 2026-10-13 to `br-weathered-silence-b50uwstn` in project `fancy-sound-44626490`. Existing migration checksums matched, and counts remained at 133 stories and 6 profiles. The pre-migration snapshot is `snap-restless-credit-b5g40dcz` (`before-creator-subscriptions-2026-10-13`). Do not rerun these migrations manually.

For this release:

- Render: set `NODE_ENV=production`, `CREATOR_CHECKOUT_ENABLED=false`, `CLIENT_ORIGIN=https://www.talecrafterai.com` and the matching `CORS_ORIGIN`. Keep existing production database/Auth, Gemini, Cloudinary and Pollinations credentials, including the existing token encryption key.
- Frontend: set `API_BASE_URL=https://talecrafter-ai-v2.onrender.com/api/v1`, and keep production `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`. Rebuild after changing these settings.
- Remove obsolete `RATE_LIMIT_DIAGNOSTICS`. Request-rate middleware and its dependency are removed; authentication, plan allowances, provider budgets and progressive polling remain. Public endpoints have no application-level request throttling until it is reintroduced.
- Payment and platform-funded-image credentials may remain unset while checkout is disabled. Do not leave malformed placeholder values in optional variables: provided values are still validated.
- Deploy the backend before the frontend. Verify `/api/v1/health`, authenticated `/api/v1/users/me`, legacy story reading, Free Classic generation and `/pricing`. Check `/api/v1/payments/availability` returns `checkoutEnabled: false`.

The public `/api/v1/payments/availability` endpoint exposes only a boolean, never credentials. Pricing shows Creator as coming soon and directs users to Free when checkout is disabled. Direct subscription creation is rejected server-side. Free users still need linked GitHub plus their own Pollinations key for Classic creation. Paid-only features stay restricted; no automatic premium trial or platform-funded Free generation is granted.

### Later Payment Activation

1. Confirm both environments remain migrated through `0009`. For future migrations, back up and review changes, then test using `npm run db:migrate` from `server/` against an explicitly verified development URL. That script is restricted to `dev/*`; production requires a separately approved execution of the reviewed SQL and checksum records in a transaction. No migrations are applied automatically by application startup.
2. Confirm Neon Auth `neon_auth.account` columns `userId` and `providerId`. Test Google-to-GitHub account linking in development with the corresponding trusted origin and callback URLs.
3. Enable Razorpay Subscriptions and confirm international recurring USD card eligibility for the merchant account. Create a plan with `period=monthly`, `interval=1`, item `amount=900`, `currency=USD`. Test and live plans and keys are separate.
4. Keep existing `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` on the backend. Add `RAZORPAY_CREATOR_PLAN_ID`. No frontend payment key variable is needed: the backend returns only the public key ID at checkout.
5. Use `https://talecrafter-ai-v2.onrender.com/api/v1/payments/razorpay/webhook` in the matching Razorpay environment. Subscribe to subscription charged, activated, authenticated, pending, halted, cancelled, completed and expired events, plus `refund.processed` and `payment.dispute.created`. Use the exact backend webhook secret, not the API secret. Test mode needs a publicly reachable backend/tunnel.
6. Add a funded secret `POLLINATIONS_PLATFORM_KEY` and `POLLINATIONS_PLATFORM_MONTHLY_ATTEMPT_LIMIT`. Set an explicit provider-side Pollen spending budget on that key, restricted to the configured image model. The application cap counts attempts, not dollars; it is not a substitute for a provider spending limit.
7. Keep `CREATOR_CHECKOUT_ENABLED=false` until all sandbox workflows pass and the platform key is funded. Flip it to `true` only in the ready environment. Disabling new checkout does not cancel existing subscriptions or stop renewal webhooks.

The application does not automatically purchase Pollen. Operators replenish it and monitor remaining funds. A shared attempt cap needs headroom for all sold subscriptions, retries and failures. Do not sell capacity that cannot be funded.

## Payment Safety And Recovery

- Checkout authenticates a recurring mandate. It does not by itself prove that a full monthly invoice was paid. Server verification uses HMAC over `payment_id|server_subscription_id`, then fetches the captured payment and its paid invoice from Razorpay.
- Access is granted only for a matching USD 9 paid invoice with billing dates. Unpaid, expired and future periods do not grant access. Cancellation preserves the already paid period; a current-cycle refund or dispute revokes it.
- Unique invoice/payment IDs prevent duplicate fulfillment. Transaction-scoped advisory locks serialize payment confirmation with refund/dispute recording. Delayed older invoices cannot overwrite a newer paid period. Holds also cover refunds/disputes delivered before the charge event.
- Confirmed refunds are recorded as holds; refund initiation and dispute-resolution/reinstatement are manual operational processes, not implemented admin actions. Reconcile against provider records before any manual reinstatement.
- Users can refresh subscription status on `/pricing` if a webhook is delayed. Failed renewals do not extend `paid_through`; access naturally expires and falls back to Free.
- If external subscription creation times out, the local row stays `creating` to prevent duplicate mandates. Locate the provider subscription using its `localSubscriptionId` note before repairing the mapping. Never blindly delete the row and retry. A webhook arriving before mapping is ready returns 503 for retry.
- A stopped process can leave running generation jobs and reservations. Reconcile their provider/storage results before marking them failed and releasing reservations. Do not reset usage indiscriminately.
- Reconcile any previously paid, unfulfilled credit orders separately before rollout. Old order endpoints and fulfillment are removed; historical payment records are retained.
- Razorpay mandates use a maximum of 120 monthly payments, disclosed at checkout. Renewal beyond that requires a new mandate.

## Verification

Run `npm test`, `npm run test:integration`, and `npm run build` in `server/`; run lint, typecheck and build in `client/`. Integration tests use in-memory PostgreSQL with all repository migrations and mocked provider responses. They never load Neon credentials or make provider charges. They validate SQL and replay behavior, but do not replace multi-connection Neon concurrency tests or real Razorpay sandbox checkout.

Browser acceptance: Free Google cannot create until GitHub is linked; Free GitHub can create Classic using its own key but cannot branch/export; a paid Google user without a Pollinations connection can create Classic/branching, inspect the creator pack and export PDF. Test expiry, tab/account switching, modal cancellation, failed payment, delayed webhook, image failure and insufficient platform balance on mobile and desktop.
