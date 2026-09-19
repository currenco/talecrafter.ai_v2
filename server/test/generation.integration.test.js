import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { config } from 'dotenv';

config();
config({ path: new URL('../../.env', import.meta.url), override: true });
process.env.DATABASE_URL =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

const enabled = process.env.RUN_GENERATION_TESTS === 'true';

test(
  'generation jobs charge, replay, and refund exactly once',
  { skip: !enabled, timeout: 60_000 },
  async () => {
    assert.match(String(process.env.NEON_BRANCH ?? ''), /^dev\//);
    const [{ db }, schema, { eq }, jobs] = await Promise.all([
      import('../src/db/index.js'),
      import('../src/db/schema.js'),
      import('drizzle-orm'),
      import('../src/services/generationJob.service.js'),
    ]);
    const {
      CreditAccounts,
      CreditLedger,
      GenerationJobs,
      Stories,
      UserProfiles,
    } = schema;
    const profileId = randomUUID();
    const accountId = randomUUID();
    const suffix = randomUUID();
    const request = { storySubject: 'An idempotent moonlit journey' };
    const reservationOptions = {
      profileId,
      kind: 'classic',
      request,
      provider: 'test-provider',
      model: 'test-model',
      creditCost: 1,
    };

    const getBalance = async () => {
      const [account] = await db
        .select({ balance: CreditAccounts.balance })
        .from(CreditAccounts)
        .where(eq(CreditAccounts.id, accountId));
      return account.balance;
    };

    try {
      await db.insert(UserProfiles).values({
        id: profileId,
        authUserId: `generation-test:${suffix}`,
        userEmail: `generation-${suffix}@example.invalid`,
        userName: 'Generation Test',
      });
      await db
        .insert(CreditAccounts)
        .values({ id: accountId, userId: profileId, balance: 3 });
      await db.insert(CreditLedger).values({
        accountId,
        amount: 3,
        balanceAfter: 3,
        reason: 'signup',
        idempotencyKey: `generation-test:${suffix}:signup`,
      });

      const successKey = `generation-test:${randomUUID()}`;
      const first = await jobs.reserveGenerationForProfile({
        ...reservationOptions,
        idempotencyKey: successKey,
      });
      assert.equal(first.cached, false);
      assert.equal(first.user.credit, 2);

      await assert.rejects(
        jobs.reserveGenerationForProfile({
          ...reservationOptions,
          idempotencyKey: successKey,
        }),
        error => error.statusCode === 425
      );

      const successResult = { storyId: randomUUID(), slug: 'cached-story' };
      const internalStoryId = randomUUID();
      await db.batch([
        db.insert(Stories).values({
          id: internalStoryId,
          storyId: successResult.storyId,
          ownerId: profileId,
          slug: `cached-story-${suffix}`,
          title: 'Cached Story',
        }),
        jobs.buildGenerationSuccessUpdate({
          jobId: first.job.id,
          storyId: internalStoryId,
          result: successResult,
          startedAt: Date.now() - 10,
        }),
      ]);
      const replay = await jobs.reserveGenerationForProfile({
        ...reservationOptions,
        idempotencyKey: successKey,
      });
      assert.equal(replay.cached, true);
      assert.deepEqual(replay.result, successResult);
      assert.equal(await getBalance(), 2);
      const ownerStories = await db
        .select({ id: Stories.id })
        .from(Stories)
        .where(eq(Stories.ownerId, profileId));
      assert.equal(ownerStories.length, 1);

      await assert.rejects(
        jobs.reserveGenerationForProfile({
          ...reservationOptions,
          idempotencyKey: successKey,
          request: { storySubject: 'A different request' },
        }),
        error => error.statusCode === 409
      );

      const failureKey = `generation-test:${randomUUID()}`;
      const failed = await jobs.reserveGenerationForProfile({
        ...reservationOptions,
        idempotencyKey: failureKey,
      });
      assert.equal(await getBalance(), 1);
      await jobs.failGenerationJob({
        jobId: failed.job.id,
        error: new Error('Expected provider failure'),
        startedAt: Date.now() - 10,
      });
      await jobs.failGenerationJob({
        jobId: failed.job.id,
        error: new Error('Repeated failure callback'),
        startedAt: Date.now() - 10,
      });
      assert.equal(await getBalance(), 2);

      const concurrentKey = `generation-test:${randomUUID()}`;
      const concurrent = await Promise.allSettled(
        Array.from({ length: 3 }, () =>
          jobs.reserveGenerationForProfile({
            ...reservationOptions,
            idempotencyKey: concurrentKey,
          })
        )
      );
      const fulfilled = concurrent.filter(item => item.status === 'fulfilled');
      const rejected = concurrent.filter(item => item.status === 'rejected');
      assert.equal(fulfilled.length, 1);
      assert.equal(rejected.length, 2);
      assert.ok(rejected.every(item => item.reason.statusCode === 425));
      assert.equal(await getBalance(), 1);

      await jobs.failGenerationJob({
        jobId: fulfilled[0].value.job.id,
        error: new Error('Concurrent test cleanup'),
        startedAt: Date.now() - 10,
      });
      assert.equal(await getBalance(), 2);

      const rows = await db
        .select()
        .from(GenerationJobs)
        .where(eq(GenerationJobs.ownerId, profileId));
      assert.equal(rows.length, 3);
      assert.equal(
        rows.find(row => row.id === first.job.id)?.status,
        'succeeded'
      );
      assert.equal(
        rows.find(row => row.id === failed.job.id)?.status,
        'failed'
      );
      assert.ok(rows.every(row => row.attemptCount === 1));
      assert.ok(rows.every(row => row.provider === 'test-provider'));
      assert.ok(rows.every(row => row.model === 'test-model'));
    } finally {
      await db.delete(UserProfiles).where(eq(UserProfiles.id, profileId));
    }
  }
);
