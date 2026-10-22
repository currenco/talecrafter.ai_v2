import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test, { mock } from 'node:test';
import { subscriptionDb } from './helpers/subscription-db.js';
import { imageFundingError } from '../src/utils/pollinationsBalance.js';

test('generation checks permissions without user quotas and preserves the platform budget', async () => {
  const { pg, db } = await subscriptionDb();
  const jobs = await import('../src/services/generationJob.service.js');
  const access = await import('../src/services/entitlement.service.js');
  const users = await import('../src/services/user.service.js');
  mock.module('../src/services/user.service.js', {
    namedExports: {
      ...users,
      syncUserFromAuth: async () => ({ id: profileId }),
    },
  });
  mock.module('../src/services/generation.service.js', {
    namedExports: {
      generateNarrativeText: async () => 'An idea',
    },
  });
  const { generateGemini } =
    await import('../src/controllers/ai.controller.js');
  const { UserProfiles, CreatorSubscriptions } =
    await import('../src/db/schema.js');
  const profileId = randomUUID();
  const authUserId = randomUUID();
  const generateIdea = () =>
    new Promise((resolve, reject) => {
      generateGemini(
        { auth: { userId: authUserId }, validated: { body: {} } },
        {
          status: () => ({ json: resolve }),
        },
        reject
      );
    });
  const options = {
    profileId,
    kind: 'classic',
    request: { storySubject: 'A garden' },
    provider: 'test',
    model: 'test',
  };
  try {
    await db.insert(UserProfiles).values({
      id: profileId,
      authUserId,
      userEmail: 'free@example.invalid',
      userName: 'Free',
    });
    assert.equal((await access.getEntitlement(profileId)).canCreate, true);
    assert.equal((await access.assertGenerationAccess(profileId)).plan, 'free');
    await pg.query('INSERT INTO neon_auth.account VALUES ($1,$2)', [
      authUserId,
      'google',
    ]);
    await assert.rejects(
      jobs.reserveGenerationForProfile({
        ...options,
        kind: 'interactive_starter',
        idempotencyKey: 'no-creator',
      }),
      e => e.statusCode === 403
    );
    const first = await jobs.reserveGenerationForProfile({
      ...options,
      idempotencyKey: 'first-story',
    });
    await assert.rejects(
      jobs.reserveGenerationForProfile({
        ...options,
        idempotencyKey: 'first-story',
      }),
      e => e.statusCode === 425
    );
    await jobs.buildGenerationSuccessUpdate({
      jobId: first.job.id,
      result: { slug: 'garden' },
      storyId: null,
      startedAt: Date.now(),
    });
    assert.deepEqual(
      (
        await jobs.reserveGenerationForProfile({
          ...options,
          idempotencyKey: 'first-story',
        })
      ).result,
      { slug: 'garden' }
    );
    await assert.rejects(
      jobs.reserveGenerationForProfile({
        ...options,
        idempotencyKey: 'first-story',
        request: {},
      }),
      e => e.statusCode === 409
    );
    const second = await jobs.reserveGenerationForProfile({
      ...options,
      idempotencyKey: 'second-story',
    });
    await Promise.all(
      [1, 2, 3].map(() =>
        jobs.failGenerationJob({
          jobId: second.job.id,
          error: new Error('Test failure'),
          startedAt: Date.now(),
        })
      )
    );
    const used = async () =>
      (
        await pg.query(
          'SELECT used FROM app.plan_usage_buckets WHERE key LIKE $1',
          ['user:' + profileId + ':%:projects']
        )
      ).rows[0]?.used ?? 0;
    assert.equal(await used(), 0);
    const exhausted = await jobs.reserveGenerationForProfile({
      ...options,
      idempotencyKey: 'exhausted-balance',
    });
    await jobs.failGenerationJob({
      jobId: exhausted.job.id,
      error: imageFundingError('free'),
      startedAt: Date.now(),
    });
    const fundingFailure = await pg.query(
      'SELECT status, error_code FROM app.generation_jobs WHERE id = $1',
      [exhausted.job.id]
    );
    assert.equal(fundingFailure.rows[0].status, 'failed');
    assert.equal(
      fundingFailure.rows[0].error_code,
      'POLLINATIONS_BALANCE_EXHAUSTED'
    );
    const concurrent = await Promise.allSettled(
      [1, 2, 3].map(() =>
        jobs.reserveGenerationForProfile({
          ...options,
          idempotencyKey: 'concurrent-story',
        })
      )
    );
    assert.equal(concurrent.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(await used(), 0);
    await jobs.reserveGenerationForProfile({
      ...options,
      idempotencyKey: 'third-story',
    });
    await jobs.reserveGenerationForProfile({
      ...options,
      idempotencyKey: 'fourth-story',
    });
    const freeAccess = await access.getEntitlement(profileId);
    assert.equal(freeAccess.period, null);
    assert.equal(freeAccess.projectLimit, undefined);
    assert.equal(freeAccess.imageLimit, undefined);
    for (let i = 0; i < 25; i++) {
      assert.equal(await access.reserveImage(profileId), null);
    }
    for (let i = 0; i < 7; i++) {
      await generateIdea();
    }
    assert.equal(
      (await pg.query('SELECT * FROM app.plan_usage_buckets')).rows.length,
      0
    );
    // Existing exhausted counters from the old Free plan no longer block access.
    for (const [kind, limit] of [
      ['projects', 3],
      ['images', 24],
      ['ideas', 6],
    ]) {
      await pg.query(
        'INSERT INTO app.plan_usage_buckets (key, used) VALUES ($1, $2)',
        [
          `user:${profileId}:${new Date().toISOString().slice(0, 7)}:${kind}`,
          limit,
        ]
      );
    }
    await jobs.reserveGenerationForProfile({
      ...options,
      idempotencyKey: 'old-quota-story',
    });
    assert.equal(await access.reserveImage(profileId), null);
    await generateIdea();
    await pg.exec('DELETE FROM app.plan_usage_buckets');
    // Creation permissions do not depend on the sign-in provider.
    await pg.exec('DELETE FROM neon_auth.account');
    assert.equal(await access.reserveImage(profileId), null);
    await generateIdea();
    await db.insert(CreatorSubscriptions).values({
      userId: profileId,
      providerPlanId: 'plan_test',
      periodStart: new Date(Date.now() - 1000),
      paidThrough: new Date(Date.now() + 86400000),
      status: 'active',
    });
    assert.equal(
      (await access.assertGenerationAccess(profileId, 'interactive_starter'))
        .plan,
      'creator'
    );
    process.env.POLLINATIONS_PLATFORM_MONTHLY_ATTEMPT_LIMIT = '1';
    await access.reserveImage(profileId);
    await assert.rejects(
      access.reserveImage(profileId),
      e => e.statusCode === 503 && e.error[0].code === 'PLATFORM_BUDGET_REACHED'
    );
    assert.equal(
      (
        await pg.query(
          "SELECT used FROM app.plan_usage_buckets WHERE key LIKE 'platform:%'"
        )
      ).rows[0].used,
      1
    );
    assert.equal(
      (
        await pg.query(
          "SELECT used FROM app.plan_usage_buckets WHERE key LIKE '%:images'"
        )
      ).rows.length,
      0
    );
    // Creator can exceed all former quotas, even with exhausted historical counters.
    process.env.POLLINATIONS_PLATFORM_MONTHLY_ATTEMPT_LIMIT = '1000';
    const creatorAccess = await access.getEntitlement(profileId);
    assert.equal(creatorAccess.projectLimit, undefined);
    assert.equal(creatorAccess.imageLimit, undefined);
    for (const [kind, limit] of [
      ['projects', 15],
      ['images', 120],
      ['ideas', 60],
    ]) {
      await pg.query(
        'INSERT INTO app.plan_usage_buckets (key, used) VALUES ($1, $2)',
        [`user:${profileId}:${creatorAccess.period}:${kind}`, limit]
      );
    }
    for (let i = 0; i < 16; i++)
      await jobs.reserveGenerationForProfile({
        ...options,
        idempotencyKey: `creator-story-${i}`,
      });
    for (let i = 0; i < 61; i++) await generateIdea();
    for (let i = 0; i < 121; i++) await access.reserveImage(profileId);
    const counters = await pg.query(
      "SELECT used FROM app.plan_usage_buckets WHERE key LIKE 'user:%' ORDER BY used"
    );
    assert.deepEqual(
      counters.rows.map(row => row.used),
      [15, 60, 120]
    );
    // Many simultaneous reservations cannot overspend a bounded bucket.
    const reservations = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        access.reserveUsage({ bucket: 'bounded', limit: 3 })
      )
    );
    assert.equal(reservations.filter(r => r.status === 'fulfilled').length, 3);
  } finally {
    await pg.close();
    mock.restoreAll();
  }
});
