# Phase 5 Core Domain And Generation

Date: 2026-09-19

Status: complete.

## Scope

Phase 5 connects classic and interactive generation to the fresh application schema and makes each provider-backed command observable and idempotent. Public exploration, slug-based reading, interactive branching, completion into a published book, and browser PDF export remain product capabilities.

## Generation Boundary

Controllers and domain services call `generation.service.js`. That application-owned facade currently delegates text generation to Gemini and image-source generation to Pollinations. Replacing either provider does not require changing controllers, ownership checks, credit accounting, story persistence, or storage persistence.

Cloudinary persistence remains independently isolated behind the Phase 4 `ObjectStorage` boundary.

## Request Identity

These authenticated commands require an `Idempotency-Key` header:

- Classic story creation
- Interactive starter creation
- Interactive continuation
- Interactive completion

Keys accept 8 to 255 letters, numbers, dots, underscores, colons, or hyphens. Each job stores a canonical SHA-256 request hash. Reusing a key with a different operation or payload returns `409`. Reusing a running key returns `425`; a completed key returns the stored identifiers or current interactive state.

The client retains a key after an ambiguous network failure or `425` response. A confirmed terminal API failure releases it, allowing a new attempt. Changing the story payload or selected choice also creates a new key.

## Credit Transaction

The legacy `POST /users/me/credits/decrement` endpoint was removed. Clients cannot mutate balances directly; generation claims, payment fulfillment, and administrative adjustments each own their ledger writes.

For credit-bearing starter requests, one PostgreSQL statement:

1. Confirms sufficient balance.
2. Claims the owner-scoped idempotency key.
3. Creates a running generation job.
4. Decrements the credit account.
5. Writes the charge ledger entry.

If no job is claimed, no balance changes. A failure claims only a running job, marks it failed, restores its recorded credit cost, and writes one uniquely keyed refund entry in the same statement. Repeated failure callbacks cannot refund twice.

Interactive continuation and completion jobs have a zero credit cost but use the same identity, status, provider, duration, and failure model.

## Job Lifecycle

Generation jobs record:

- Owner and optional story
- Idempotency key and request hash
- Operation kind
- Provider and model
- Credit cost and attempt count
- Pending/running/succeeded/failed/cancelled status
- Original request and successful result identifiers
- Error code and bounded error message
- Start, completion, and duration timing

Successful classic and interactive mutations use Neon HTTP batches to commit domain records, assets, and the job-success transition atomically.

## Story Identity And Discovery

Internal UUID primary keys remain database relationships. Separate public UUIDs identify API resources, while unique slugs provide human-readable published routes. Public exploration remains enabled because it is part of the retained baseline. Public list, ID, slug, and related-story reads expose published stories only; draft interactive stories remain owner-protected.

## Verification

The live Neon integration test verifies:

- One claim and charge for concurrent requests sharing a key
- `425` while the claimed job is running
- Cached identifiers after success
- A conflicting payload rejected for a reused key
- Story creation and job success committed in one batch
- Exactly one story after successful replay
- Atomic failure status and refund
- No second refund from repeated failure callbacks
- Provider, model, attempt, duration, and status audit data

Server lint, formatting, unit tests, database verification, client type checking, client lint, and the production Next.js build pass after the migration.

## Operational Notes

The migration is additive and was applied to `dev/platform-poc`. Pollinations returned `402` during the earlier Phase 4 end-to-end source check, so its account/key allowance must be restored before a live story-generation smoke test. That external provider condition does not affect the verified job, credit, database, or Cloudinary contracts.
