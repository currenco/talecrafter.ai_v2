# New Product Migration Plan

This document is the canonical migration plan for rebuilding the product progressively inside this repository.

## Working Agreement

- All source deletion, addition, and modification happens in this existing repository.
- `client/` remains the Next.js frontend and `server/` remains the Express API unless a later phase explicitly approves a different boundary.
- Do not create a second application repository or maintain a parallel rewrite.
- Keep the project runnable at the end of every implementation phase.
- Do not combine unrelated phases into one large migration.
- Inspect dependencies and affected flows before each phase, confirm the implementation plan, then edit.
- Run the phase verification checklist and inspect the final diff before marking a phase complete.
- New infrastructure may be provisioned in external provider dashboards, but all schemas, migrations, configuration examples, adapters, and application code belong in this repository.
- Never commit real credentials. Store only variable names and safe examples in tracked environment templates.
- Old production data is optional. The new product and new schema must not be constrained by backward compatibility with the old product.

## Target Direction

The current target architecture is:

```text
Next.js client
      |
      v
Express API
      |
      +-- Neon Managed Better Auth
      +-- Neon PostgreSQL + Drizzle
      +-- Neon Object Storage
      +-- Stripe
      +-- AI and image-generation providers
```

Preferred choices:

- Database: a fresh Neon PostgreSQL project.
- ORM and migrations: Drizzle, owned by `server/`.
- Authentication: Neon Managed Better Auth, subject to the Phase 1 proof of concept.
- File storage: Neon Object Storage, subject to the Phase 1 proof of concept.
- API: keep the existing Express service during the migration.
- Payments: keep Stripe behind the Express API.
- AI providers: keep provider-specific code behind backend-owned service interfaces.
- MongoDB: not planned. The product has relational ownership, payment, credit, slug, and story-tree requirements that fit PostgreSQL.

Neon Functions and Neon AI Gateway are future options, not requirements for the initial migration. They must not be introduced until the core product is stable.

## Status Legend

- `not started`: no implementation work has begun.
- `in progress`: implementation or verification is underway.
- `blocked`: a documented decision or external prerequisite prevents progress.
- `complete`: implementation, tests, and review are finished.

## Phase 0 - Repository Reset And Baseline

Status: complete

Goal: remove old-product surface area and establish a trustworthy baseline before changing infrastructure.

Completed:

- Removed old SEO metadata, sitemap, robots, verification, analytics, and advertising code.
- Removed the old generator landing pages, contact page, legal pages, and custom not-found page.
- Removed the demo video and moving-border components.
- Removed stale links and empty source directories.
- Removed the orphaned feedback component and forwarding route.
- Removed unused direct client dependencies left by deleted UI.
- Preserved story slug generation and slug-based story routes.
- Audited tracked environment templates and confirmed real credentials remain ignored.
- Replaced stale architecture documentation with the new-product transition baseline.
- Verified client typecheck, client lint, production build, server lint, and server tests.

Retained baseline capabilities:

- Classic illustrated stories
- Interactive branching stories
- User dashboard and story management
- Credits and Stripe payments
- Public exploration and slug-based story reading
- PDF export and browser narration
- Administrative management

Deferred or removed from the baseline:

- Feedback collection will be reconsidered with the new product UI.
- Product branding, Clerk, Cloudinary, and the current database schema remain temporarily and are replaced only in their dedicated phases.

Exit criteria:

- The repository has a reproducible baseline ready to checkpoint.
- No obsolete routes or imports remain.
- The retained product capabilities are explicitly listed.
- Existing verification commands pass.

## Phase 1 - Platform Proof Of Concept

Status: not started

Goal: validate the new managed services before coupling the application to them.

Infrastructure tasks:

- Create a fresh Neon project for the new product.
- Select a region close to the API deployment and expected users.
- Create separate production and non-production environments.
- Enable Neon Managed Better Auth in non-production.
- Create test public and private Object Storage buckets.
- Record required environment variable names in tracked `.env.example` files.
- Store real credentials only in local untracked files and deployment secret managers.

Authentication proof:

- Verify email/password signup, login, logout, email verification, and password reset.
- Verify the required social provider, initially Google if retained.
- Verify server-side session validation from Express.
- Verify protected Next.js navigation and redirects.
- Verify admin authorization without comparing email addresses.
- Confirm whether managed auth supports every required hook and feature.

Storage proof:

- Upload an image from the backend.
- Serve a public story image.
- Generate and consume access for a private object.
- Delete an object and verify failure behavior.
- Test object-size limits, content-type validation, latency, CDN behavior, and expected cost.
- Determine whether the product needs transformations that require Cloudinary or another image service.

Decision gate:

- Use Neon Managed Better Auth if the proof covers all product requirements.
- Use self-hosted Better Auth in Express with Neon PostgreSQL if custom plugins or handlers are required.
- Use Neon Object Storage if persistence and delivery are sufficient.
- Retain Cloudinary only if required image transformation or delivery features are missing.
- Stop and document the decision before Phase 2.

Exit criteria:

- Auth and storage choices are recorded with known limitations.
- Non-production credentials and safe environment templates exist.
- No production data or production credentials were used in the proof.

## Phase 2 - Fresh Database Foundation

Status: not started

Goal: define the new product schema without inheriting weak ownership or payment patterns.

Schema principles:

- Use stable generated IDs for application entities.
- Use the auth provider user ID as the identity boundary.
- Never use email as a foreign key or authorization key.
- Keep email as mutable profile data or an immutable transaction snapshot where required.
- Use PostgreSQL `jsonb` only for genuinely variable story/provider payloads.
- Use foreign keys, unique constraints, checks, and explicit deletion behavior.
- Use timezone-aware timestamps and consistent snake_case names.
- Keep auth-owned tables in their provider-managed schema.
- Keep application-owned tables in the application schema.

Planned application entities:

- `user_profiles`
- `credit_accounts`
- `credit_ledger`
- `stories`
- `story_versions` or `story_chapters`, based on the retained editor model
- `interactive_stories`
- `interactive_story_nodes`
- `assets`
- `generation_jobs`
- `payments`
- `payment_events`

Implementation tasks:

- Write a schema decision record before editing the Drizzle definitions.
- Replace the current schemas with the approved fresh schema.
- Generate reviewed SQL migrations; do not rely only on schema push.
- Add seed data for development without real user information.
- Add indexes based on actual query paths.
- Add database-level idempotency constraints for payments, credit mutations, and generation requests.
- Add migration and schema tests.

Exit criteria:

- A fresh database can be created entirely from repository migrations.
- Seeded development data supports the retained workflows.
- Ownership uses stable user IDs everywhere.
- Payment and credit operations have enforceable idempotency rules.

## Phase 3 - Authentication Migration

Status: not started

Goal: replace Clerk end to end without leaving mixed authorization paths.

Client tasks:

- Add the selected Better Auth or Neon Auth client.
- Replace `ClerkProvider`, Clerk hooks, user controls, and auth components.
- Rebuild sign-in, sign-up, verification, reset, and sign-out flows.
- Replace Clerk route protection in `client/proxy.ts`.
- Update authenticated API requests to use the selected session mechanism.
- Replace frontend ownership and cache keys based on email.

Server tasks:

- Mount or integrate the selected auth server/API before body parsing where required.
- Replace Clerk middleware with session validation owned by the selected auth system.
- Replace Clerk user lookup and synchronization code.
- Resolve application profiles through stable auth user IDs.
- Implement role-based admin authorization.
- Update CORS, cookie, trusted-origin, and proxy configuration for local and deployed environments.

Removal tasks:

- Remove all Clerk imports, middleware, environment variables, and packages.
- Remove Clerk-specific profile synchronization and naming.
- Confirm no service accepts a user ID or email supplied by the browser as proof of ownership.

Verification:

- Signup, login, logout, reset, verification, social login, and expired-session tests.
- Protected-page and protected-API tests.
- Cross-user ownership denial tests.
- Admin allow/deny tests.
- Cookie and CORS tests against the real client/API domain arrangement.

Exit criteria:

- `rg -i "clerk" client server` returns no application references.
- Every protected server operation derives identity from a validated session.
- Client and server checks pass.

## Phase 4 - Storage Migration

Status: not started

Goal: replace provider-specific image persistence with an application-owned storage boundary.

Implementation tasks:

- Introduce a backend `ObjectStorage` interface.
- Implement upload, fetch/access, and delete operations for the selected provider.
- Store bucket and object keys as durable identity; treat public URLs as derived delivery values.
- Add an `assets` record for ownership, MIME type, byte size, status, provider, and object key.
- Use predictable object paths such as `users/{userId}/stories/{storyId}/{assetId}`.
- Validate source domains, MIME types, content lengths, decoded sizes, and request timeouts.
- Keep uploads backend-owned unless a later design explicitly approves short-lived signed direct uploads.
- Update story generation, interactive generation, avatars, exports, and deletion flows.

Removal tasks:

- Remove Cloudinary code, environment variables, and dependency only after all active upload paths use the new adapter.
- Preserve old remote URLs only for optional imported records.

Verification:

- Public and private upload tests.
- Invalid MIME, oversized source, timeout, and provider failure tests.
- Asset ownership and deletion tests.
- Story generation tests confirming persisted images survive provider source expiry.

Exit criteria:

- All new assets are represented in the database and selected object storage.
- No active application path depends directly on Cloudinary.
- Failed storage operations cannot leave completed story records with missing required assets.

## Phase 5 - Core Domain And Generation Refactor

Status: not started

Goal: adapt retained product workflows to the new schema and identity model.

Implementation tasks:

- Update classic story creation to use new IDs, jobs, assets, and credit ledger entries.
- Update interactive story creation, branching, completion, and export.
- Make generation requests idempotent.
- Record provider, model, status, attempt count, timing, and failure information in `generation_jobs`.
- Make credit reservation, completion, and refund transactional.
- Keep provider-specific Gemini and Pollinations code behind service interfaces.
- Preserve unique human-readable slugs independently from primary keys.
- Decide whether public story exploration remains part of the new product before rebuilding it.

Exit criteria:

- Retained story workflows use only the new schema.
- Failed and retried generation cannot double-charge credits or duplicate stories.
- Provider replacement does not require changing controllers or database ownership logic.

## Phase 6 - Payments And Credit Ledger

Status: not started

Goal: rebuild purchasing around the fresh user IDs and append-only credit accounting.

Implementation tasks:

- Keep Stripe session creation server-owned.
- Store the application user ID on payment records and Stripe metadata.
- Store customer email only as a transaction snapshot.
- Store each Stripe event ID with a unique constraint.
- Apply payment fulfillment and ledger credits atomically.
- Add ledger entries for signup grants, purchases, generation charges, refunds, and admin adjustments.
- Maintain a cached balance only if it is transactionally updated with the ledger.
- Replace email-based admin credit mutation with user-ID-based operations and audit information.

Verification:

- Duplicate and concurrent webhook tests.
- Wrong-user checkout status tests.
- Failed and delayed payment tests.
- Credit charge/refund transaction tests.
- Ledger-to-balance reconciliation test.

Exit criteria:

- A payment can credit an account exactly once.
- Every balance change has an auditable ledger entry.
- No payment authorization depends on mutable email.

## Phase 7 - Product UI And Documentation Reset

Status: not started

Goal: finish the visible transition from the old product to the new product.

Implementation tasks:

- Replace old brand names, copy, logos, imagery, links, and pricing assumptions.
- Rework navigation around the retained workflows.
- Remove unused pages, components, assets, dependencies, and empty directories after replacement.
- Rebuild legal, contact, metadata, analytics, and SEO only when the new product identity is final.
- Update README files, architecture notes, environment documentation, and deployment instructions.
- Document operational tasks for auth, storage, Stripe, AI providers, migrations, and backups.

Exit criteria:

- No old-product branding or provider documentation remains unless intentionally retained.
- New developers can configure and run the project from tracked documentation.
- Production-required environment variables are documented without exposing values.

## Phase 8 - Optional Legacy Data Import

Status: not started

Goal: import useful old data without allowing it to shape or weaken the new architecture.

Rules:

- This phase begins only after the new schema and auth system are stable.
- Import scripts must live in `server/scripts/` and be repeatable, auditable, and dry-run capable.
- Never write directly from an unreviewed export into production tables.
- Do not import old sessions, password material, or obsolete provider configuration.

Possible import scope:

- Public stories worth preserving.
- Story ownership after a verified account-claim flow.
- Credit balances only with an explicit business decision and opening ledger entries.
- Payment summaries required for support or accounting.
- Existing Cloudinary assets by retaining URLs initially or copying objects in a controlled job.

Account claiming:

- A new user must verify the email address before claiming matching legacy records.
- Matching an unverified email is never sufficient authorization.
- Imported records receive new application IDs and preserve the old ID only in a dedicated legacy reference field.

Exit criteria:

- Dry-run output reports counts, validation failures, and collisions.
- Re-running the import does not duplicate records.
- Imported records satisfy all new constraints.
- The new product remains fully functional when no old data is imported.

## Phase 9 - Production Readiness And Cutover

Status: not started

Goal: prove the new product can be deployed, observed, recovered, and operated safely.

Verification checklist:

- Client lint, typecheck, and production build.
- Server lint, unit tests, integration tests, and startup checks.
- Fresh database migration from zero.
- Auth end-to-end tests.
- Storage end-to-end tests.
- Story generation and failure/refund tests.
- Stripe webhook idempotency tests.
- Authorization tests for every owner/admin mutation.
- Rate-limit and malformed-request tests.
- Backup and restore exercise.
- Secret and environment-variable audit.
- Dependency and dead-code audit.
- Manual mobile and desktop smoke testing.

Cutover rules:

- Use a documented maintenance and rollback procedure.
- Take a final backup before any optional import.
- Do not reuse development credentials in production.
- Keep the old database read-only for a defined retention period if legacy import remains possible.
- Remove old infrastructure only after the new product has passed the agreed observation window.

Exit criteria:

- All required checks pass in the production-like environment.
- Monitoring and operational ownership are documented.
- Rollback has been tested or rehearsed.
- The product owner explicitly approves launch.

## Phase Execution Template

Use this checklist whenever a phase starts:

1. Re-read this roadmap and inspect the current repository state.
2. Confirm the exact phase scope and decisions with the product owner.
3. List affected files, database objects, environment variables, integrations, and risks.
4. Create or update tests before high-risk behavior changes where practical.
5. Implement the smallest coherent step inside this repository.
6. Run focused checks, then the broader client/server verification appropriate to the change.
7. Inspect `git diff`, document assumptions and remaining risks, and update phase status.
8. Do not start the next phase until the current exit criteria are met or explicitly waived.

## Decisions Still Required

- Which login methods are required at launch?
- Does auth require custom Better Auth plugins or hooks?
- Are images public, private, or mixed?
- Are runtime image transformations required?
- Where will the Next.js client and Express API be deployed?
- What regions and data-residency requirements apply?
- Which AI providers and models are required for launch?
- Which, if any, legacy records should users be able to claim?
