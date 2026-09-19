# Phase 2 Database Foundation

Status: implemented and verified on `dev/platform-poc`

## Decision

The new product uses a fresh PostgreSQL schema named `app`, owned by the Express backend and managed with Drizzle definitions plus generated SQL migrations.

Neon Managed Auth continues to own the separate `neon_auth` schema. Application records reference the provider's stable user subject through `app.user_profiles.auth_user_id`; application tables do not foreign-key into provider-managed tables.

## Story Model

The retained editor reads and writes a complete ordered chapter collection. It does not independently edit or query chapters, so story content is stored as immutable version payloads in `story_versions.content` (`jsonb`) rather than as chapter rows.

`stories` owns stable identity, owner, slug, lifecycle, discovery fields, and cover delivery data. Interactive stories add one detail row and normalized branch nodes. The active-node partial unique index prevents two simultaneously active branches for one story.

## Ownership And Credits

- `user_profiles.id` is the application ownership key.
- `user_profiles.auth_user_id` is unique and is the only link to the active identity provider.
- Email is mutable profile data. Payments retain an email snapshot for receipts, but email is not an ownership or authorization key.
- Each profile has one `credit_account`.
- Every balance mutation and its `credit_ledger` record are written atomically.
- Ledger idempotency keys are unique, and balances cannot become negative.

## Payments And Generation

- Payment provider session IDs, payment intent IDs, and webhook event IDs have database uniqueness constraints.
- Stripe fulfillment claims the pending payment, grants credits, and records the ledger mutation in one statement.
- Generation jobs require an owner-scoped idempotency key.
- Assets have stable provider/bucket/object-key identity and are ready for the storage adapter in Phase 4.

## Migration Workflow

- `npm run db:generate` generates SQL from `src/db/schema.js`.
- `npm run db:migrate` applies reviewed SQL with `DATABASE_URL_UNPOOLED`.
- `npm run db:seed` installs deterministic fake development records.
- Migration and seed scripts refuse to run unless `NEON_BRANCH` starts with `dev/`.
- Applied migration checksums are recorded in `public.app_schema_migrations`; modifying an applied SQL file is rejected.

The seed uses only `example.invalid` data and fixed development UUIDs. It covers a classic published story, a draft interactive story, a profile, and a credit account.

## Deletion Rules

- Deleting a profile cascades to its stories, assets, generation jobs, credit account, and ledger.
- Deleting a story cascades to versions, interactive details/nodes, and story assets.
- Deleting a payment is restricted through its profile relationship so financial history cannot be orphaned accidentally.
- Deleting a payment sets historical payment-event references to null.
- Deleting a story referenced by a generation job sets the job's story reference to null.

Interactive root/current node IDs are intentionally not foreign keys because creating a story and its first node is cyclic. Node ownership is enforced by the node-to-story foreign key, while parent node references use `ON DELETE SET NULL`.

## Verification

Verified on the isolated `dev/platform-poc` branch:

- Fresh migrations apply and re-run idempotently.
- Development seed applies and re-runs idempotently.
- Duplicate credit and generation idempotency keys are rejected.
- Negative credit balances are rejected.
- Profile deletion cascades through owned story data.
- Concurrent Stripe fulfillment grants credits exactly once.
- Seeded classic-story reads return the expected slug and version payload.
- Server lint, formatting, unit tests, and production dependency audit pass.

Production was not migrated or seeded in this phase.
