# Remaining Product Roadmap

This document is the continuation handoff for future development in this repository. It intentionally excludes completed implementation history and lists only work that remains.

## Working Rules

- Make all changes inside this repository. Keep `client/` as the Next.js frontend and `server/` as the Express API unless the product owner explicitly approves an architectural change.
- Inspect the existing implementation before editing. Preserve working behavior and established service boundaries.
- Never commit real credentials. Keep only safe variable names in tracked environment examples.
- Use reviewed Drizzle SQL migrations for schema changes. Do not use schema push or ad hoc production SQL.
- Test focused behavior first, then run the relevant client and server builds before completing a phase.
- Do not restart completed platform migrations or recreate one-time import tooling.

## Current Baseline

Treat these as existing constraints, not future tasks:

```text
Next.js client
      |
      v
Express API
      |
      +-- Neon Managed Better Auth
      +-- Neon PostgreSQL + Drizzle
      +-- Cloudinary media storage
      +-- Razorpay Standard Checkout
      +-- Gemini text generation
      +-- Pollinations user-funded image generation
```

- The active database schema is represented by migrations `0000` through `0007`.
- Development uses `dev/platform-poc`; the deployed application uses the existing `production` branch.
- Legacy stories and historical user references are already present on both branches. Do not rerun or recreate legacy import scripts.
- Historical users in `app.legacy_users` are informational records only. They are not Auth users, profiles, credit accounts, or owners. Returning people authenticate as fresh users.
- Legacy story images continue using their original Cloudinary URLs. New media uses the current Cloudinary account.
- Existing stories remain assigned to the selected administrator account; no account-claim workflow is planned.

## 1. Complete Payments And Credit Ledger

Status: in progress

Razorpay order creation, Standard Checkout, signature verification, signed webhook reconciliation, and idempotent purchase fulfillment already exist. Complete only the remaining work below.

Tasks:

- Implement refund handling with append-only ledger entries and idempotent Razorpay event processing.
- Implement administrator credit adjustments by stable profile ID, including reason, actor, and audit metadata.
- Confirm every balance mutation has a corresponding ledger entry.
- Add a ledger-to-cached-balance reconciliation command or test.
- Finalize production pricing, credit packages, supported currencies, and Razorpay presentation rules.

Verification:

- Duplicate and concurrent webhook tests.
- Failed, delayed, refunded, and partially processed payment tests.
- Wrong-user checkout and payment-status authorization tests.
- Signup, purchase, generation charge, generation refund, payment refund, and admin adjustment reconciliation.

Exit criteria:

- Every balance change is auditable and applied exactly once.
- Refunds cannot over-credit an account.
- No payment or administrator authorization depends on mutable email.

## 2. Product UI, Brand, And Documentation

Status: not started

Tasks:

- Finalize the product name, positioning, visual identity, logo, copy, and imagery.
- Replace remaining old-brand text, assets, links, and pricing assumptions.
- Rework navigation around creation, drafts, published stories, credits, and account settings.
- Audit responsive behavior and complete mobile and desktop workflows.
- Remove unused pages, components, assets, dependencies, and empty directories after replacement.
- Recreate legal, contact, metadata, analytics, and SEO only after the product identity is final.
- Update the root README, environment setup, deployment instructions, and operational runbooks.
- Document Auth, Cloudinary, Razorpay, AI-provider, migration, backup, and restore operations.

Exit criteria:

- No accidental old-product branding remains.
- A new developer can configure and run both applications from tracked documentation.
- Production variables are documented without exposing values.
- Core workflows are usable on mobile and desktop.

## 3. Story-To-Video Pipeline

Status: not started

Goal: reduce the current multi-provider workflow by turning the generated story package into a consistent, complete video rather than a single short clip.

Design tasks:

- Confirm the launch output: stitched scene video, narration, captions, music, aspect ratio, resolution, and export format.
- Evaluate current Pollinations video models, duration limits, image-to-video support, pricing, wallet permissions, concurrency, and commercial terms before implementation.
- Use the existing story, character descriptions, scene prompts, and generated images as the canonical continuity package.
- Design scene-level image-to-video generation instead of sending the entire story to one short-video request.
- Define character reference handling, deterministic prompt templates, visual-style locks, seeds where supported, and retry rules.
- Design a backend job model for per-scene status, provider IDs, retries, cost, artifacts, and final assembly.
- Select a proven video composition pipeline for stitching clips, narration, captions, transitions, and audio. Do not implement media composition from scratch.
- Decide storage, retention, deletion, download, and failed-job refund behavior before charging users.

Verification requirements:

- Character and style consistency across multiple scenes.
- Resumable generation after individual scene failure.
- No duplicate provider charge or application credit charge on retries.
- Final duration and scene ordering match the story timeline.
- Mobile playback and downloadable output work reliably.

Exit criteria:

- A complete story can produce one coherent video artifact through a resumable, auditable job.
- The user sees progress and can recover from partial failure without restarting successful scenes.
- Provider limits and costs are reflected in product pricing and credit reservations.

## 4. Performance, Caching, And Query Efficiency

Status: not started

Goal: make repeat navigation fast and reduce avoidable Neon compute usage without serving stale authentication, credit, payment, draft, or generation state.

Tasks:

- Apply the existing pagination query validation consistently to the remaining public list routes.
- Remove unconditional one-minute session validation. Refresh near JWT expiry, after a recognized authentication `401`, and on visibility/online recovery with throttling so background tabs do not keep Neon active.
- Add TanStack Query as the client server-state layer with centralized query keys, request deduplication, explicit `staleTime`/`gcTime`, bounded retries, and mutation-driven invalidation.
- Replace the remaining Explore `sessionStorage` cache with versioned, timestamped query persistence. Any future dashboard persistence must scope private entries by stable Auth user ID and clear them on logout or account change.
- Cache public story lists, published story details, and related stories at the Next.js/server layer so one cached response can serve multiple users. Use explicit lifetimes and targeted tags rather than caching only inside each browser.
- Keep `/users/me`, credits, payments, drafts, admin data, Pollinations credentials, and generation state private. Never place them in a shared or public CDN cache.
- Use short-lived memory caching for credits and invalidate or update it immediately after verified payment, refund, generation charge, generation refund, or administrator adjustment.
- Poll generation status only while a job is active. Stop polling on completion, failure, navigation, or an inactive tab.
- Move administrator search and story-type filtering to validated server query parameters before the admin datasets become large. The current controls intentionally filter only the pages already loaded.
- Add deterministic ordering to every paginated query and migrate high-volume classic-story lists from offset pagination to cursor pagination when justified by measured dataset size and query plans.
- Verify the application uses the pooled Neon connection for runtime traffic, select only fields needed by list views, and inspect high-frequency/slow queries before adding indexes.
- Do not add Redis initially. Reconsider a shared external cache only when multiple backend instances, cross-instance invalidation, queues, or measured cache pressure require it.

Initial cache policy:

| Data                                     | Client policy                                    | Shared server policy                                                |
| ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| Public story list                        | stale for 2 minutes; session persistence         | revalidate after 60 seconds; stale-while-revalidate allowed         |
| Published story detail                   | stale for 15 minutes                             | cache for 15-60 minutes; invalidate on publish/update/delete        |
| Related stories                          | stale for 5 minutes                              | cache for 5-10 minutes                                              |
| User story lists                         | stale for 1 minute; per-user session persistence | private; no shared cache                                            |
| User profile                             | stale for 5 minutes in memory                    | private; no shared cache                                            |
| Credits and payment status               | stale for at most 15-30 seconds in memory        | private; invalidate immediately after mutation/webhook confirmation |
| Active generation status                 | uncached while polling                           | no shared cache                                                     |
| Auth tokens and Pollinations credentials | memory only                                      | never persist in browser storage or public caches                   |

Verification:

- Confirm warm navigation does not issue duplicate API or database requests.
- Confirm two concurrent components requesting the same query share one in-flight request.
- Confirm logout/account switching cannot display another user's cached data.
- Confirm create, publish, delete, payment, refund, and credit-adjustment mutations invalidate only the affected queries.
- Confirm public cache hits avoid backend/database work and private responses include no public cache directives.
- Confirm an idle browser does not continuously call Auth or database-backed endpoints and Neon can reach scale-to-zero.
- Compare query count, transferred rows, response latency, and Neon active-compute time before and after implementation.
- Test pagination with duplicate timestamps, newly inserted stories, deletions between pages, empty pages, and maximum allowed page size.

Exit criteria:

- Repeat page visits render cached data immediately and revalidate according to the documented policy.
- Public traffic is served from a shared cache where safe, while sensitive and mutable data remains private and promptly consistent.
- Background browser activity no longer keeps Neon compute active without useful work.

## 5. Production Readiness And Launch

Status: not started

Required checks:

- Client lint, typecheck, and production build.
- Server lint, unit tests, integration tests, and startup checks.
- Fresh database creation from migrations `0000` through `0007` and any later reviewed migrations.
- Auth end-to-end tests against production-like domains.
- Cloudinary upload, delivery, and deletion tests.
- Story generation, retry, draft, publish, and refund tests.
- Razorpay live-mode checkout and webhook idempotency tests using final pricing.
- Authorization tests for every owner and administrator mutation.
- Rate-limit, malformed-request, and provider-timeout tests.
- Secret, environment-variable, dependency, and dead-code audits.
- Backup and restore rehearsal.
- Monitoring, alerting, request tracing, and operational ownership.
- Manual mobile and desktop smoke testing.

Launch rules:

- Use documented deployment, maintenance, rollback, and incident procedures.
- Do not reuse development credentials in production.
- Keep the old database read-only until the retention period is explicitly closed.
- Remove old infrastructure only after the new product passes the agreed observation window.
- Launch requires explicit product-owner approval after all required checks pass.

## Open Decisions

- Final brand, customer promise, and primary workflow.
- Final credit packages, prices, currencies, taxes, and refund policy.
- Whether public story exploration remains a launch feature.
- Video output specification, provider/model selection, and per-story cost ceiling.
- Monitoring provider, backup retention, and old-database retirement date.

## Execution Checklist

For each remaining phase:

1. Inspect the repository and verify the roadmap item is still unfinished.
2. Confirm scope, product decisions, affected files, integrations, and risks.
3. Implement the smallest complete increment using existing boundaries.
4. Add focused tests and run the relevant broader builds.
5. Inspect the final diff and document unresolved risks.
6. Update this file by removing completed tasks rather than adding implementation history.
