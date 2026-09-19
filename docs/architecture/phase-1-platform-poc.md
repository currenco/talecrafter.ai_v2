# Phase 1 Platform Proof Of Concept

Date: 2026-09-19

Status: complete.

## Scope And Isolation

- Neon project: `TaleCrafterAI` (`fancy-sound-44626490`)
- Region: AWS US East (Ohio), `aws-us-east-2`
- Production branch: `production`
- Proof branch: `dev/platform-poc`
- The proof used only branch-scoped development credentials and temporary data on `dev/platform-poc`.
- Temporary users, verification records, and storage objects created by automated checks were deleted.
- Existing Clerk and Cloudinary application paths remain active. Their removal belongs to Phases 3 and 4.

The selected region supports the required Neon services. The eventual Express deployment should use the same region or the region decision must be revisited before production launch.

## Reproducible Checks

From `server/`, with the repository root `.env` linked to `dev/platform-poc`:

```bash
npm run poc:auth
npm run poc:storage
```

Both scripts refuse to run unless `NEON_BRANCH` starts with `dev/`. They generate unique test identities/object keys and clean up their own records and objects.

## Authentication Results

Passed against Managed Better Auth:

- Email/password signup and login
- Session restoration and logout
- EdDSA JWT signature, issuer, audience, and stable subject validation
- Next.js unauthenticated redirect (`307`) and authenticated protected render (`200`)
- Express protected API (`200` with a valid token)
- Admin deny for a normal user (`403`) and allow for an admin (`200`)
- Verification-code issuance
- Password-reset-code issuance
- Google OAuth redirect generation using Neon's shared development credentials
- Email verification code delivery and consumption through a real test inbox
- Password reset followed by login with the replacement password
- Google consent, verifier exchange, session restoration, and protected-page rendering

The JWT role is the PostgreSQL role `authenticated`; it is not the Managed Auth user role and Managed Auth does not support custom JWT claims. The proof therefore resolves authorization by the stable JWT subject and performs a server-side role lookup. Phase 2 should move product roles into the application-owned profile schema instead of coupling authorization to `neon_auth` internals.

The manual email and Google checks passed on the isolated development branch. Their temporary users and verification records were removed afterward.

Production prerequisites:

- Configure owned SMTP credentials. Shared SMTP is rate limited and intended only for development.
- Enable email verification; it is disabled by default.
- Configure owned Google OAuth credentials and consent-screen branding.
- Register production trusted domains and disable localhost access on production.
- Keep product authorization in application-owned tables keyed by Auth user ID.

Managed Auth supports the product's current email/password, Google, session, JWT, and basic admin requirements. It does not expose custom claims, MFA, passkeys, or arbitrary Better Auth plugins. If any of those become launch requirements, use self-hosted Better Auth on Express with Neon PostgreSQL.

## Storage Results

The proof used `prod` as a `public_read` bucket and `dev` as a private bucket on the development branch.

Passed:

- Backend S3 upload to both buckets
- Anonymous public image read with matching bytes and `image/png`
- `Cache-Control: public, max-age=31536000, immutable`
- Anonymous private read rejected with `403`
- Sixty-second presigned private read returned `200` with matching bytes
- Invalid MIME type and an object over the 10 MiB application limit rejected before upload
- Object deletion followed by `404`

Observed single-run development latency:

| Operation | Time |
| --- | ---: |
| Public upload | 388 ms |
| Public read | 956 ms |
| Private upload | 1180 ms |
| Signed private read | 257 ms |

These are connectivity checks, not a benchmark. Production monitoring must measure representative object sizes and user regions.

Current Neon limits and delivery considerations:

- Maximum object size is 5 GiB. The product will enforce a smaller 10 MiB story-image limit.
- Requests can return `503 SlowDown`; the Phase 4 adapter needs bounded retries and backoff.
- Public reads use the branch storage endpoint directly. Put a CDN in front of hot production assets.
- Neon stores and serves bytes but does not replace Cloudinary's transformation pipeline. Generate required sizes/formats before upload or through a separate image-processing layer.
- Storage and egress are metered; review the current Neon plan before launch rather than hard-coding rates in this repository.

## Decision Gate

Storage decision: use Neon Object Storage for new product assets. Keep object keys as durable identity, use immutable keys and cache headers, presign private reads, and add a CDN for public delivery. Retain Cloudinary only if Phase 4 confirms a product requirement for dynamic transformations that the backend cannot reasonably own.

Auth decision: use Neon Managed Better Auth. The verified contract fits the current requirements, with application-owned role lookup compensating for fixed JWT claims. Move to self-hosted Better Auth only if a later requirement needs unsupported features such as custom plugins, MFA, passkeys, or custom JWT claims; that would not require changing Neon PostgreSQL or Object Storage.
