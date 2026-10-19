import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test, { mock } from 'node:test';
import { eq } from 'drizzle-orm';
import { subscriptionDb } from './helpers/subscription-db.js';

test('dashboard uses current interactive page totals instead of starter chapters', async () => {
  const { pg, db } = await subscriptionDb();
  const { Stories, StoryVersions, UserProfiles, InteractiveStories, GenerationJobs } = await import('../src/db/schema.js');
  const ownerId = randomUUID();
  const userService = await import('../src/services/user.service.js');
  mock.module('../src/services/user.service.js', {
    namedExports: { ...userService, syncUserFromAuth: async () => ({ id: ownerId }) },
  });
  const { listCurrentUserStories } = await import('../src/services/story.service.js');
  const { getInteractiveRequestStatus } = await import('../src/services/interactiveStory.service.js');
  try {
    await db.insert(UserProfiles).values({ id: ownerId, authUserId: randomUUID(), userEmail: 'draft@example.invalid', userName: 'Draft reader' });
    const id = randomUUID();
    await db.insert(Stories).values({ id, ownerId, slug: 'draft-count', title: 'Draft', kind: 'interactive', status: 'draft' });
    await db.insert(StoryVersions).values({ storyId: id, output: { chapters: Array.from({ length: 8 }, () => ({ title: 'Page' })) } });
    await db.insert(InteractiveStories).values({ storyId: id, rootNodeId: randomUUID(), currentNodeId: randomUUID(), totalPages: 11 });
    const query = { userId: 'owner', status: 'draft' };
    const first = await listCurrentUserStories(query);
    assert.equal(first.items[0].totalPages, 11);
    assert.equal(first.items[0].output.chapters.length, 8);
    const key = randomUUID();
    const request = { userId: 'owner', storyId: first.items[0].storyId, key };
    assert.deepEqual(await getInteractiveRequestStatus(request), { status: 'not_found' });
    await db.insert(GenerationJobs).values({ ownerId, storyId: id, idempotencyKey: key, kind: 'interactive_continue', status: 'running', request: {} });
    assert.deepEqual(await getInteractiveRequestStatus(request), { status: 'running' });
    await db.update(GenerationJobs).set({ status: 'failed' }).where(eq(GenerationJobs.idempotencyKey, key));
    assert.deepEqual(await getInteractiveRequestStatus(request), { status: 'failed' });
    await db.update(GenerationJobs).set({ status: 'succeeded' }).where(eq(GenerationJobs.idempotencyKey, key));
    const saved = await getInteractiveRequestStatus(request);
    assert.equal(saved.status, 'succeeded');
    assert.equal(saved.state.story.totalPages, 11);
    await assert.rejects(getInteractiveRequestStatus({ ...request, key: 'bad' }));
    const otherOwner = randomUUID();
    await db.insert(UserProfiles).values({ id: otherOwner, authUserId: randomUUID(), userEmail: 'other@example.invalid', userName: 'Other' });
    const otherId = randomUUID();
    const otherPublicId = randomUUID();
    await db.insert(Stories).values({ id: otherId, storyId: otherPublicId, ownerId: otherOwner, slug: 'private-other', title: 'Other', kind: 'interactive', status: 'draft' });
    await db.insert(InteractiveStories).values({ storyId: otherId, rootNodeId: randomUUID(), currentNodeId: randomUUID(), totalPages: 5 });
    await assert.rejects(getInteractiveRequestStatus({ ...request, storyId: otherPublicId }));
    await db.update(InteractiveStories).set({ totalPages: 14 }).where(eq(InteractiveStories.storyId, id));
    assert.equal((await listCurrentUserStories(query)).items[0].totalPages, 14);

    const classicId = randomUUID();
    await db.insert(Stories).values({ id: classicId, ownerId, slug: 'classic-draft', title: 'Classic', status: 'draft' });
    await db.insert(StoryVersions).values({ storyId: classicId, output: { chapters: [{ title: 'One' }] } });
    const results = await listCurrentUserStories(query);
    assert.equal(results.items.length, 2);
    assert.equal(results.items.find(item => item.id === classicId).totalPages, null);
  } finally {
    await pg.close();
  }
});
