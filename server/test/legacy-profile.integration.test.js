import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { sql } from 'drizzle-orm';
import { subscriptionDb } from './helpers/subscription-db.js';

test('returning users reclaim imported libraries only with a verified, unambiguous identity', async () => {
  const { pg, db } = await subscriptionDb();
  const { syncUserFromAuth } = await import('../src/services/user.service.js');
  const { UserProfiles, Stories, Assets, CreatorSubscriptions } =
    await import('../src/db/schema.js');
  try {
    const authId = randomUUID();
    const legacyId = randomUUID();
    const email = 'returning@example.invalid';
    await db.execute(
      sql`INSERT INTO neon_auth."user" (id,email,name,"emailVerified") VALUES (${authId},${email},'Returning',false)`
    );
    await db.insert(UserProfiles).values({
      id: legacyId,
      authUserId: 'legacy:storybook:1',
      userEmail: ' Returning@Example.invalid ',
      userName: 'Old name',
    });
    const storyId = randomUUID();
    await db.insert(Stories).values({
      id: storyId,
      ownerId: legacyId,
      slug: 'imported',
      title: 'Imported',
      status: 'published',
    });
    await db.insert(Assets).values({
      ownerId: legacyId,
      storyId,
      provider: 'test',
      bucket: 'test',
      objectKey: 'cover',
      access: 'public',
      mimeType: 'image/png',
      byteSize: 1,
    });
    const current = await syncUserFromAuth(authId);
    assert.notEqual(current.id, legacyId);
    assert.equal(
      (
        await db.execute(
          sql`SELECT owner_id FROM app.stories WHERE id = ${storyId}`
        )
      ).rows[0].owner_id,
      legacyId
    );
    await db.insert(CreatorSubscriptions).values({
      userId: current.id,
      providerPlanId: 'paid-plan',
      paidThrough: new Date(Date.now() + 86400000),
    });
    await db.insert(Stories).values({
      ownerId: current.id,
      slug: 'new-draft',
      title: 'New draft',
      status: 'draft',
    });
    await db.execute(
      sql`UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = ${authId}`
    );
    const linked = await syncUserFromAuth(authId);
    assert.equal(linked.id, current.id);
    assert.equal(linked.role, 'user');
    assert.equal(
      (
        await db.execute(
          sql`SELECT count(*)::int AS count FROM app.stories WHERE owner_id = ${current.id}`
        )
      ).rows[0].count,
      2
    );
    assert.equal(
      (
        await db.execute(
          sql`SELECT owner_id FROM app.assets WHERE story_id = ${storyId}`
        )
      ).rows[0].owner_id,
      current.id
    );
    assert.equal(
      (
        await db.execute(
          sql`SELECT count(*)::int AS count FROM app.user_profiles WHERE id = ${legacyId}`
        )
      ).rows[0].count,
      0
    );
    assert.equal(
      (
        await db.execute(
          sql`SELECT provider_plan_id FROM app.creator_subscriptions WHERE user_id = ${current.id}`
        )
      ).rows[0].provider_plan_id,
      'paid-plan'
    );
    assert.equal((await syncUserFromAuth(authId)).id, current.id);

    // A legacy placeholder with financial history must not be deleted.
    const blockedId = randomUUID();
    await db.insert(UserProfiles).values({
      id: blockedId,
      authUserId: 'legacy:storybook:2',
      userEmail: email,
      userName: 'Unexpected billing',
    });
    await db
      .insert(CreatorSubscriptions)
      .values({ userId: blockedId, providerPlanId: 'legacy-plan' });
    await db
      .insert(Stories)
      .values({ ownerId: blockedId, slug: 'protected', title: 'Protected' });
    await assert.rejects(
      syncUserFromAuth(authId),
      error => error.statusCode === 409
    );
    assert.equal(
      (
        await db.execute(
          sql`SELECT owner_id FROM app.stories WHERE slug = 'protected'`
        )
      ).rows[0].owner_id,
      blockedId
    );
    await db.execute(
      sql`DELETE FROM app.creator_subscriptions WHERE user_id = ${blockedId}`
    );

    const anotherAuth = randomUUID();
    await db.execute(
      sql`INSERT INTO neon_auth."user" (id,email,name,"emailVerified") VALUES (${anotherAuth},${email},'Duplicate identity',true)`
    );
    await assert.rejects(
      syncUserFromAuth(authId),
      error => error.statusCode === 409
    );
    await db.execute(
      sql`DELETE FROM neon_auth."user" WHERE id = ${anotherAuth}`
    );
    await db.insert(UserProfiles).values({
      authUserId: 'legacy:storybook:3',
      userEmail: email,
      userName: 'Ambiguous legacy',
    });
    await assert.rejects(
      syncUserFromAuth(authId),
      error => error.statusCode === 409
    );
    assert.equal(
      (
        await db.execute(
          sql`SELECT owner_id FROM app.stories WHERE slug = 'protected'`
        )
      ).rows[0].owner_id,
      blockedId
    );
  } finally {
    await pg.close();
  }
});
