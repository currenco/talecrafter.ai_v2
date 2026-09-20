import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';

config();
process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

const enabled = process.env.RUN_DATABASE_TESTS === 'true';

test(
  'fresh schema enforces ownership, balances, and idempotency',
  { skip: !enabled },
  async () => {
    assert.match(String(process.env.NEON_BRANCH ?? ''), /^dev\//);
    const [{ eq }, { db }, schema] = await Promise.all([
      import('drizzle-orm'),
      import('../src/db/index.js'),
      import('../src/db/schema.js'),
    ]);
    const {
      Assets,
      CreditAccounts,
      CreditLedger,
      GenerationJobs,
      Stories,
      StoryVersions,
      UserProfiles,
    } = schema;
    const suffix = randomUUID();
    const profileId = randomUUID();
    const storyId = randomUUID();
    const accountId = randomUUID();

    try {
      await db.insert(UserProfiles).values({
        id: profileId,
        authUserId: `schema-test:${suffix}`,
        userEmail: `schema-${suffix}@example.invalid`,
        userName: 'Schema Test',
      });
      await db
        .insert(CreditAccounts)
        .values({ id: accountId, userId: profileId, balance: 5 });
      await db.insert(CreditLedger).values({
        accountId,
        amount: 5,
        balanceAfter: 5,
        reason: 'signup',
        idempotencyKey: `schema-test:${suffix}:signup`,
      });
      await assert.rejects(
        db.insert(CreditLedger).values({
          accountId,
          amount: 1,
          balanceAfter: 6,
          reason: 'duplicate',
          idempotencyKey: `schema-test:${suffix}:signup`,
        })
      );
      await assert.rejects(
        db
          .update(CreditAccounts)
          .set({ balance: -1 })
          .where(eq(CreditAccounts.id, accountId))
      );

      await db.insert(Stories).values({
        id: storyId,
        ownerId: profileId,
        slug: `schema-test-${suffix}`,
        title: 'Schema Test Story',
      });
      const assetId = randomUUID();
      await db.batch([
        db
          .insert(StoryVersions)
          .values({ storyId, version: 1, output: { chapters: [] } }),
        db.insert(Assets).values({
          id: assetId,
          ownerId: profileId,
          storyId,
          provider: 'cloudinary',
          bucket: 'schema-test',
          objectKey: `schema-test/${suffix}`,
          access: 'public',
          mimeType: 'image/png',
          byteSize: 4,
        }),
      ]);
      await assert.rejects(
        db.insert(Assets).values({
          ownerId: profileId,
          storyId,
          provider: 'cloudinary',
          bucket: 'schema-test',
          objectKey: `schema-test/${suffix}`,
          access: 'public',
          mimeType: 'image/png',
          byteSize: 4,
        })
      );
      await db.insert(GenerationJobs).values({
        ownerId: profileId,
        idempotencyKey: `generation:${suffix}`,
        kind: 'classic',
        request: {},
      });
      await assert.rejects(
        db.insert(GenerationJobs).values({
          ownerId: profileId,
          idempotencyKey: `generation:${suffix}`,
          kind: 'classic',
          request: {},
        })
      );

      await db.delete(UserProfiles).where(eq(UserProfiles.id, profileId));
      const [remainingStory] = await db
        .select()
        .from(Stories)
        .where(eq(Stories.id, storyId));
      assert.equal(remainingStory, undefined);
      const [remainingAsset] = await db
        .select()
        .from(Assets)
        .where(eq(Assets.id, assetId));
      assert.equal(remainingAsset, undefined);
    } finally {
      await db.delete(UserProfiles).where(eq(UserProfiles.id, profileId));
    }
  }
);
