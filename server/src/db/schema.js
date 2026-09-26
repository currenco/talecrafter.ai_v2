import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const appSchema = pgSchema('app');

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const UserProfiles = appSchema.table(
  'user_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authUserId: text('auth_user_id').notNull(),
    userEmail: varchar('email', { length: 320 }).notNull(),
    userName: varchar('display_name', { length: 160 }).notNull(),
    userImage: text('avatar_url'),
    role: varchar('role', { length: 20 }).default('user').notNull(),
    ...timestamps,
  },
  table => [
    uniqueIndex('user_profiles_auth_user_id_unique').on(table.authUserId),
    index('user_profiles_email_idx').on(table.userEmail),
    check('user_profiles_role_check', sql`${table.role} IN ('user', 'admin')`),
  ]
);

export const CreditAccounts = appSchema.table(
  'credit_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => UserProfiles.id, { onDelete: 'cascade' }),
    balance: integer('balance').default(5).notNull(),
    ...timestamps,
  },
  table => [
    uniqueIndex('credit_accounts_user_id_unique').on(table.userId),
    check('credit_accounts_balance_check', sql`${table.balance} >= 0`),
  ]
);

export const CreditLedger = appSchema.table(
  'credit_ledger',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => CreditAccounts.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    reason: varchar('reason', { length: 40 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    referenceType: varchar('reference_type', { length: 40 }),
    referenceId: text('reference_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    uniqueIndex('credit_ledger_idempotency_key_unique').on(
      table.idempotencyKey
    ),
    index('credit_ledger_account_created_idx').on(
      table.accountId,
      table.createdAt
    ),
    check('credit_ledger_amount_check', sql`${table.amount} <> 0`),
    check('credit_ledger_balance_after_check', sql`${table.balanceAfter} >= 0`),
  ]
);

export const Stories = appSchema.table(
  'stories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storyId: uuid('public_id').defaultRandom().notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => UserProfiles.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 90 }).notNull(),
    kind: varchar('kind', { length: 20 }).default('classic').notNull(),
    status: varchar('status', { length: 20 }).default('published').notNull(),
    title: text('title').notNull(),
    storySubject: text('story_subject'),
    storyType: varchar('story_type', { length: 80 }),
    ageGroup: varchar('age_group', { length: 40 }),
    imageStyle: varchar('image_style', { length: 80 }),
    coverImage: text('cover_image_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  table => [
    uniqueIndex('stories_public_id_unique').on(table.storyId),
    uniqueIndex('stories_slug_unique').on(table.slug),
    index('stories_owner_created_idx').on(table.ownerId, table.createdAt),
    index('stories_public_status_created_idx').on(
      table.status,
      table.createdAt
    ),
    index('stories_type_idx').on(table.storyType),
    check(
      'stories_kind_check',
      sql`${table.kind} IN ('classic', 'interactive')`
    ),
    check(
      'stories_status_check',
      sql`${table.status} IN ('draft', 'published', 'archived')`
    ),
  ]
);

export const StoryVersions = appSchema.table(
  'story_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => Stories.id, { onDelete: 'cascade' }),
    version: integer('version').default(1).notNull(),
    output: jsonb('content').notNull(),
    providerPayload: jsonb('provider_payload'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    uniqueIndex('story_versions_story_version_unique').on(
      table.storyId,
      table.version
    ),
    index('story_versions_story_created_idx').on(
      table.storyId,
      table.createdAt
    ),
    check('story_versions_version_check', sql`${table.version} > 0`),
  ]
);

export const InteractiveStories = appSchema.table('interactive_stories', {
  storyId: uuid('story_id')
    .primaryKey()
    .references(() => Stories.id, { onDelete: 'cascade' }),
  rootNodeId: uuid('root_node_id').notNull(),
  currentNodeId: uuid('current_node_id').notNull(),
  totalPages: integer('total_pages').default(0).notNull(),
  compiledPages: jsonb('compiled_pages'),
  ...timestamps,
});

export const InteractiveStoryNodes = appSchema.table(
  'interactive_story_nodes',
  {
    nodeId: uuid('id').defaultRandom().primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => Stories.id, { onDelete: 'cascade' }),
    parentNodeId: uuid('parent_node_id').references(
      () => InteractiveStoryNodes.nodeId,
      { onDelete: 'set null' }
    ),
    depth: integer('depth').default(0).notNull(),
    choiceTaken: text('choice_taken'),
    choices: jsonb('choices'),
    selectedChoice: text('selected_choice'),
    pages: jsonb('pages').default([]).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    index('interactive_nodes_story_created_idx').on(
      table.storyId,
      table.createdAt
    ),
    index('interactive_nodes_parent_idx').on(table.parentNodeId),
    uniqueIndex('interactive_nodes_one_active_per_story')
      .on(table.storyId)
      .where(sql`${table.isActive} = true`),
    check('interactive_nodes_depth_check', sql`${table.depth} >= 0`),
  ]
);

export const Assets = appSchema.table(
  'assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => UserProfiles.id, { onDelete: 'cascade' }),
    storyId: uuid('story_id').references(() => Stories.id, {
      onDelete: 'cascade',
    }),
    provider: varchar('provider', { length: 40 }).notNull(),
    bucket: varchar('bucket', { length: 120 }).notNull(),
    objectKey: text('object_key').notNull(),
    access: varchar('access', { length: 20 }).notNull(),
    mimeType: varchar('mime_type', { length: 120 }).notNull(),
    byteSize: integer('byte_size').notNull(),
    status: varchar('status', { length: 20 }).default('ready').notNull(),
    ...timestamps,
  },
  table => [
    uniqueIndex('assets_provider_bucket_key_unique').on(
      table.provider,
      table.bucket,
      table.objectKey
    ),
    index('assets_owner_created_idx').on(table.ownerId, table.createdAt),
    index('assets_story_idx').on(table.storyId),
    check('assets_access_check', sql`${table.access} IN ('public', 'private')`),
    check('assets_byte_size_check', sql`${table.byteSize} >= 0`),
    check(
      'assets_status_check',
      sql`${table.status} IN ('pending', 'ready', 'failed', 'deleted')`
    ),
  ]
);

export const GenerationJobs = appSchema.table(
  'generation_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => UserProfiles.id, { onDelete: 'cascade' }),
    storyId: uuid('story_id').references(() => Stories.id, {
      onDelete: 'set null',
    }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    requestHash: varchar('request_hash', { length: 64 })
      .default('legacy')
      .notNull(),
    kind: varchar('kind', { length: 40 }).notNull(),
    provider: varchar('provider', { length: 40 }).default('unknown').notNull(),
    model: varchar('model', { length: 120 }).default('unknown').notNull(),
    creditCost: integer('credit_cost').default(0).notNull(),
    attemptCount: integer('attempt_count').default(1).notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    request: jsonb('request').notNull(),
    result: jsonb('result'),
    errorCode: varchar('error_code', { length: 80 }),
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps,
  },
  table => [
    uniqueIndex('generation_jobs_owner_idempotency_unique').on(
      table.ownerId,
      table.idempotencyKey
    ),
    index('generation_jobs_owner_created_idx').on(
      table.ownerId,
      table.createdAt
    ),
    check(
      'generation_jobs_status_check',
      sql`${table.status} IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')`
    ),
    check('generation_jobs_credit_cost_check', sql`${table.creditCost} >= 0`),
    check(
      'generation_jobs_attempt_count_check',
      sql`${table.attemptCount} > 0`
    ),
    check(
      'generation_jobs_duration_check',
      sql`${table.durationMs} IS NULL OR ${table.durationMs} >= 0`
    ),
  ]
);

export const StripeProducts = appSchema.table(
  'stripe_products',
  {
    planId: varchar('plan_id', { length: 80 }).primaryKey(),
    productId: varchar('product_id', { length: 255 }).notNull(),
    priceId: varchar('price_id', { length: 255 }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 10 }).default('usd').notNull(),
    credits: integer('credits').notNull(),
    ...timestamps,
  },
  table => [
    uniqueIndex('stripe_products_product_id_unique').on(table.productId),
    uniqueIndex('stripe_products_price_id_unique').on(table.priceId),
    check('stripe_products_amount_check', sql`${table.amountCents} > 0`),
    check('stripe_products_credits_check', sql`${table.credits} > 0`),
  ]
);

export const Payments = appSchema.table(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => UserProfiles.id, { onDelete: 'restrict' }),
    provider: varchar('provider', { length: 40 }).default('stripe').notNull(),
    providerSessionId: varchar('provider_session_id', {
      length: 255,
    }).notNull(),
    providerPaymentIntentId: varchar('provider_payment_intent_id', {
      length: 255,
    }),
    providerProductId: varchar('provider_product_id', { length: 255 }),
    providerPriceId: varchar('provider_price_id', { length: 255 }),
    userEmail: varchar('email_snapshot', { length: 320 }).notNull(),
    planId: varchar('plan_id', { length: 80 }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 10 }).default('usd').notNull(),
    credits: integer('credits').notNull(),
    status: varchar('status', { length: 40 }).default('pending').notNull(),
    fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
    ...timestamps,
  },
  table => [
    uniqueIndex('payments_provider_session_unique').on(
      table.provider,
      table.providerSessionId
    ),
    uniqueIndex('payments_provider_intent_unique').on(
      table.provider,
      table.providerPaymentIntentId
    ),
    index('payments_user_created_idx').on(table.userId, table.createdAt),
    index('payments_status_idx').on(table.status),
    check('payments_amount_check', sql`${table.amountCents} > 0`),
    check('payments_credits_check', sql`${table.credits} > 0`),
    check(
      'payments_status_check',
      sql`${table.status} IN ('pending', 'fulfilled', 'failed', 'cancelled', 'refunded')`
    ),
  ]
);

export const PaymentEvents = appSchema.table(
  'payment_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    paymentId: uuid('payment_id').references(() => Payments.id, {
      onDelete: 'set null',
    }),
    provider: varchar('provider', { length: 40 }).notNull(),
    providerEventId: varchar('provider_event_id', { length: 255 }).notNull(),
    eventType: varchar('event_type', { length: 120 }).notNull(),
    payload: jsonb('payload').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    uniqueIndex('payment_events_provider_event_unique').on(
      table.provider,
      table.providerEventId
    ),
    index('payment_events_payment_idx').on(table.paymentId),
  ]
);

export const SeedRecords = appSchema.table(
  'seed_records',
  {
    namespace: varchar('namespace', { length: 80 }).notNull(),
    key: varchar('key', { length: 120 }).notNull(),
    appliedAt: timestamp('applied_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [primaryKey({ columns: [table.namespace, table.key] })]
);
