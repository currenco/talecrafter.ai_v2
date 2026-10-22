import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test, { mock } from 'node:test';
import { eq, sql } from 'drizzle-orm';
import { subscriptionDb } from './helpers/subscription-db.js';

test('dashboard uses current interactive page totals instead of starter chapters', async () => {
  const { pg, db } = await subscriptionDb();
  const {
    Stories,
    StoryVersions,
    UserProfiles,
    InteractiveStories,
    GenerationJobs,
  } = await import('../src/db/schema.js');
  const ownerId = randomUUID();
  const ownerAuthId = randomUUID();
  const userService = await import('../src/services/user.service.js');
  mock.module('../src/services/user.service.js', {
    namedExports: {
      ...userService,
      syncUserFromAuth: async () => ({ id: ownerId }),
    },
  });
  const { listCurrentUserStories } =
    await import('../src/services/story.service.js');
  const { getInteractiveRequestStatus } =
    await import('../src/services/interactiveStory.service.js');
  try {
    await db.insert(UserProfiles).values({
      id: ownerId,
      authUserId: ownerAuthId,
      userEmail: 'draft@example.invalid',
      userName: 'Draft reader',
    });
    const id = randomUUID();
    await db.insert(Stories).values({
      id,
      ownerId,
      slug: 'draft-count',
      title: 'Draft',
      kind: 'interactive',
      status: 'draft',
    });
    await db.insert(StoryVersions).values({
      storyId: id,
      output: {
        chapters: Array.from({ length: 8 }, () => ({ title: 'Page' })),
      },
    });
    await db.insert(InteractiveStories).values({
      storyId: id,
      rootNodeId: randomUUID(),
      currentNodeId: randomUUID(),
      totalPages: 11,
    });
    const query = { userId: 'owner', status: 'draft' };
    const first = await listCurrentUserStories(query);
    assert.equal(first.items[0].totalPages, 11);
    assert.equal(first.items[0].output.chapters.length, 8);
    const key = randomUUID();
    const request = { userId: 'owner', storyId: first.items[0].storyId, key };
    assert.deepEqual(await getInteractiveRequestStatus(request), {
      status: 'not_found',
    });
    await db.insert(GenerationJobs).values({
      ownerId,
      storyId: id,
      idempotencyKey: key,
      kind: 'interactive_continue',
      status: 'running',
      request: {},
    });
    assert.deepEqual(await getInteractiveRequestStatus(request), {
      status: 'running',
    });
    await db
      .update(GenerationJobs)
      .set({ status: 'failed' })
      .where(eq(GenerationJobs.idempotencyKey, key));
    assert.deepEqual(await getInteractiveRequestStatus(request), {
      status: 'failed',
    });
    await db
      .update(GenerationJobs)
      .set({ status: 'succeeded' })
      .where(eq(GenerationJobs.idempotencyKey, key));
    const saved = await getInteractiveRequestStatus(request);
    assert.equal(saved.status, 'succeeded');
    assert.equal(saved.state.story.totalPages, 11);
    await assert.rejects(
      getInteractiveRequestStatus({ ...request, key: 'bad' })
    );
    const otherOwner = randomUUID();
    await db.insert(UserProfiles).values({
      id: otherOwner,
      authUserId: randomUUID(),
      userEmail: 'other@example.invalid',
      userName: 'Other',
    });
    const otherId = randomUUID();
    const otherPublicId = randomUUID();
    await db.insert(Stories).values({
      id: otherId,
      storyId: otherPublicId,
      ownerId: otherOwner,
      slug: 'private-other',
      title: 'Other',
      kind: 'interactive',
      status: 'draft',
    });
    await db.insert(InteractiveStories).values({
      storyId: otherId,
      rootNodeId: randomUUID(),
      currentNodeId: randomUUID(),
      totalPages: 5,
    });
    await assert.rejects(
      getInteractiveRequestStatus({ ...request, storyId: otherPublicId })
    );
    await db
      .update(InteractiveStories)
      .set({ totalPages: 14 })
      .where(eq(InteractiveStories.storyId, id));
    assert.equal((await listCurrentUserStories(query)).items[0].totalPages, 14);

    const classicId = randomUUID();
    await db.insert(Stories).values({
      id: classicId,
      ownerId,
      slug: 'classic-draft',
      title: 'Classic',
      status: 'draft',
    });
    await db
      .insert(StoryVersions)
      .values({ storyId: classicId, output: { chapters: [{ title: 'One' }] } });
    const results = await listCurrentUserStories(query);
    assert.equal(results.items.length, 2);
    assert.equal(
      results.items.find(item => item.id === classicId).totalPages,
      null
    );
    const { listAdminUsers, getAdminUserLibrary } =
      await import('../src/services/admin.service.js');
    const { CreatorSubscriptions } = await import('../src/db/schema.js');
    await db.insert(CreatorSubscriptions).values({
      userId: ownerId,
      providerPlanId: 'test-plan',
      periodStart: new Date(Date.now() - 1000),
      paidThrough: new Date(Date.now() + 86400000),
    });
    const users = await listAdminUsers({});
    assert.deepEqual(
      users.items.find(user => user.id === ownerId).signInMethods,
      []
    );
    await db.execute(sql`INSERT INTO neon_auth.account ("userId", "providerId") VALUES
      (${ownerAuthId}, 'google'), (${ownerAuthId}, 'github'), (${ownerAuthId}, 'google'), (${randomUUID()}, 'credential')`);
    const linkedUsers = await listAdminUsers({});
    assert.deepEqual(
      linkedUsers.items.find(user => user.id === ownerId).signInMethods,
      ['github', 'google']
    );
    assert.deepEqual(
      linkedUsers.items.find(user => user.id === otherOwner).signInMethods,
      []
    );
    assert.equal(users.items.find(user => user.id === ownerId).storyCount, 2);
    assert.equal(users.items.find(user => user.id === ownerId).plan, 'creator');
    assert.equal(users.items.find(user => user.id === otherOwner).plan, 'free');
    const library = await getAdminUserLibrary(ownerId, { limit: 1 });
    assert.equal(library.user.id, ownerId);
    assert.deepEqual(library.user.signInMethods, ['github', 'google']);
    assert.equal(library.user.authUserId, undefined);
    assert.equal(library.pagination.totalCount, 2);
    assert.equal(library.pagination.hasMore, true);
    assert.equal(library.items.length, 1);
    assert.notEqual(library.items[0].id, otherId);
    assert.equal(library.items[0].status, 'draft');
    const next = await getAdminUserLibrary(ownerId, { limit: 1, offset: 1 });
    assert.notEqual(next.items[0].id, library.items[0].id);
    assert.equal(next.pagination.hasMore, false);
    assert.equal(
      (await getAdminUserLibrary(ownerId, { offset: 2 })).items.length,
      0
    );
    await assert.rejects(
      getAdminUserLibrary(randomUUID(), {}),
      error => error.statusCode === 404
    );
    const importedId = randomUUID();
    const newestId = randomUUID();
    await db.insert(UserProfiles).values([
      {
        id: importedId,
        authUserId: 'legacy:storybook:99',
        userEmail: 'old@example.invalid',
        userName: 'Imported user',
        createdAt: new Date('2099-01-01'),
      },
      {
        id: newestId,
        authUserId: randomUUID(),
        userEmail: 'new@example.invalid',
        userName: 'New version user',
        createdAt: new Date('2098-01-01'),
      },
    ]);
    const orderedUsers = await listAdminUsers({ limit: 50 });
    assert.equal(orderedUsers.items[0].id, newestId);
    assert.equal(orderedUsers.items.at(-1).id, importedId);
    assert.equal(
      (await listAdminUsers({ limit: 1, offset: 0 })).items[0].id,
      newestId
    );
    assert.equal(
      (await listAdminUsers({ limit: 1, offset: 3 })).items[0].id,
      importedId
    );
  } finally {
    await pg.close();
  }
});
