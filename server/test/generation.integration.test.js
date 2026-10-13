import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test, { mock } from 'node:test';
import { subscriptionDb } from './helpers/subscription-db.js';

test('generation reservations enforce plans, replay safely, and release failed usage once', async () => {
  const { pg, db } = await subscriptionDb();
  const jobs = await import('../src/services/generationJob.service.js');
  const access = await import('../src/services/entitlement.service.js');
  const { UserProfiles, CreatorSubscriptions } =
    await import('../src/db/schema.js');
  const profileId = randomUUID();
  const authUserId = randomUUID();
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
    await assert.rejects(
      jobs.reserveGenerationForProfile({
        ...options,
        idempotencyKey: 'no-github',
      }),
      e => e.statusCode === 403
    );
    await pg.query('INSERT INTO neon_auth.account VALUES ($1,$2)', [
      authUserId,
      'github',
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
      ).rows[0].used;
    assert.equal(await used(), 1);
    const concurrent = await Promise.allSettled(
      [1, 2, 3].map(() =>
        jobs.reserveGenerationForProfile({
          ...options,
          idempotencyKey: 'concurrent-story',
        })
      )
    );
    assert.equal(concurrent.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(await used(), 2);
    await jobs.reserveGenerationForProfile({
      ...options,
      idempotencyKey: 'third-story',
    });
    await assert.rejects(
      jobs.reserveGenerationForProfile({
        ...options,
        idempotencyKey: 'fourth-story',
      }),
      e => e.statusCode === 429
    );
    assert.equal(await used(), 3);
    // Creator needs no GitHub and has an independent paid-period allowance.
    await pg.exec('DELETE FROM neon_auth.account');
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
    const image = await access.reserveImage(profileId);
    await access.releaseUsage(image);
    await assert.rejects(
      access.reserveImage(profileId),
      e => e.statusCode === 429
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
      ).rows[0].used,
      0
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
