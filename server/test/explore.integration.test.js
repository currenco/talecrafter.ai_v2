import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import test from 'node:test';
import { subscriptionDb } from './helpers/subscription-db.js';
import { publicStoriesQuerySchema } from '../src/validations/story.validation.js';
import { sitemapQuerySchema } from '../src/validations/story.validation.js';

test('public genre filtering paginates, excludes drafts and ignores retired art filters', async () => {
  const { pg, db } = await subscriptionDb();
  const { CreatorSubscriptions, Stories, StoryVersions, UserProfiles } =
    await import('../src/db/schema.js');
  const { listPublicStories, listPublicGenres } =
    await import('../src/services/story.service.js');
  const { listSitemapStories } = await import('../src/services/seo.service.js');
  try {
    const ownerId = randomUUID();
    await db.insert(UserProfiles).values({
      id: ownerId,
      authUserId: randomUUID(),
      userEmail: 'genres@example.invalid',
      userName: 'Genre test',
    });
    for (const [index, [storyType, status]] of [
      ['Fantasy', 'published'],
      ['Mystery', 'published'],
      ['Fantasy', 'published'],
      ['Secret', 'draft'],
      ['', 'published'],
    ].entries()) {
      const id = randomUUID();
      await db.insert(Stories).values({
        id,
        ownerId,
        slug: `genre-${index}`,
        title: `Story ${index}`,
        storyType,
        imageStyle: ['Watercolor', 'Watercolor', 'Anime', 'Secret style', '  '][
          index
        ],
        status,
      });
      await db
        .insert(StoryVersions)
        .values({ storyId: id, output: { title: `Story ${index}` } });
    }
    assert.deepEqual(await listPublicGenres(), ['Fantasy', 'Mystery']);
    assert.equal(
      (await listPublicStories({ artStyle: 'watercolor' })).length,
      4
    );
    const filtered = await listPublicStories({
      genre: 'fantasy',
      artStyle: 'watercolor',
    });
    assert.equal(filtered.length, 2);
    assert.deepEqual(
      new Set(filtered.map(story => story.imageStyle)),
      new Set(['Watercolor', 'Anime'])
    );
    assert.equal(
      publicStoriesQuerySchema.parse({ query: { artStyle: ' Anime ' } }).query
        .artStyle,
      undefined
    );
    const all = await listPublicStories({});
    assert.equal(all.length, 4);
    const first = await listPublicStories({
      genre: 'fantasy',
      limit: 1,
      offset: 0,
    });
    const second = await listPublicStories({
      genre: 'Fantasy',
      limit: 1,
      offset: 1,
    });
    assert.equal(first[0].storyType, 'Fantasy');
    assert.equal(second[0].storyType, 'Fantasy');
    assert.notEqual(first[0].storyId, second[0].storyId);
    assert.deepEqual(
      await listPublicStories({ genre: 'Fantasy', offset: 2 }),
      []
    );
    assert.deepEqual(await listPublicStories({ genre: 'Secret' }), []);
    assert.deepEqual(await listPublicStories({ genre: "' OR 1=1 --" }), []);
    assert.equal(
      publicStoriesQuerySchema.parse({
        query: { genre: ' Fantasy ', limit: '12' },
      }).query.genre,
      'Fantasy'
    );
    assert.equal(
      publicStoriesQuerySchema.safeParse({ query: { genre: ['Fantasy'] } })
        .success,
      false
    );
    for (let index = 0; index < 10; index += 1) {
      const id = randomUUID();
      await db.insert(Stories).values({
        id,
        ownerId,
        slug: `preview-${index}`,
        title: 'Preview',
        storyType: 'Fantasy',
        imageStyle: 'Anime',
      });
      await db
        .insert(StoryVersions)
        .values({ storyId: id, output: { title: 'Preview' } });
    }
    assert.equal(
      (await listPublicStories({ preview: true, limit: 50 })).length,
      8
    );
    assert.equal(
      (await listPublicStories({ preview: true, limit: 50, offset: 7 })).length,
      1
    );
    assert.deepEqual(await listPublicStories({ preview: true, offset: 8 }), []);
    assert.equal(
      (await listPublicStories({ preview: true, artStyle: 'Anime', limit: 50 }))
        .length,
      8
    );
    assert.deepEqual(
      await listPublicStories({ preview: true, artStyle: 'Anime', offset: 8 }),
      []
    );
    assert.equal(
      (await listPublicStories({ preview: true, genre: 'Fantasy', limit: 50 }))
        .length,
      8
    );
    assert.equal(
      (await listPublicStories({ preview: false, limit: 50 })).length,
      14
    );
    const sitemap = await listSitemapStories();
    const { getPublicProfile } =
      await import('../src/services/publicProfile.service.js');
    const { publicStory } = await import('../src/utils/publicStory.js');
    const profile = await getPublicProfile(ownerId, { limit: 50 });
    assert.equal(profile.user.storyCount, 14);
    assert.equal(profile.items.length, 14);
    assert.equal(profile.user.plan, 'free');
    await db.insert(CreatorSubscriptions).values({
      userId: ownerId,
      providerPlanId: 'test-plan',
      periodStart: new Date(Date.now() - 86400000),
      paidThrough: new Date(Date.now() + 86400000),
    });
    assert.equal((await getPublicProfile(ownerId, {})).user.plan, 'creator');
    await db
      .update(CreatorSubscriptions)
      .set({ revoked: true })
      .where(eq(CreatorSubscriptions.userId, ownerId));
    assert.equal((await getPublicProfile(ownerId, {})).user.plan, 'free');
    await db
      .update(CreatorSubscriptions)
      .set({ revoked: false, paidThrough: new Date(Date.now() - 1000) })
      .where(eq(CreatorSubscriptions.userId, ownerId));
    assert.equal((await getPublicProfile(ownerId, {})).user.plan, 'free');
    assert.deepEqual(Object.keys(profile.user).sort(), [
      'id',
      'plan',
      'storyCount',
      'userImage',
      'userName',
    ]);
    assert.ok(profile.items.every(story => story.status === 'published'));
    assert.ok(!JSON.stringify(profile).includes('genres@example.invalid'));
    const preview = await getPublicProfile(ownerId, { limit: 50 }, true);
    assert.equal(preview.items.length, 8);
    assert.equal(preview.pagination.hasMore, true);
    assert.equal(
      (await getPublicProfile(ownerId, { offset: 8 }, true)).items.length,
      0
    );
    const page = await getPublicProfile(ownerId, { offset: 12, limit: 12 });
    assert.equal(page.items.length, 2);
    assert.equal(page.pagination.hasMore, false);
    await assert.rejects(getPublicProfile(randomUUID(), {}), {
      statusCode: 404,
    });
    assert.equal(publicStory(all[0]).userEmail, undefined);
    assert.equal(
      publicStory({ userEmail: 'private', output: null }).userEmail,
      undefined
    );
    assert.equal(sitemap.totalCount, 14);
    assert.equal(sitemap.items.length, 14);
    assert.equal(sitemap.pageSize, 1000);
    assert.ok(sitemap.items.every(item => item.slug !== 'genre-3'));
    assert.deepEqual(Object.keys(sitemap.items[0]).sort(), [
      'slug',
      'updatedAt',
    ]);
    assert.deepEqual((await listSitemapStories(1)).items, []);
    assert.equal(sitemapQuerySchema.parse({ query: {} }).query.page, 0);
    const otherOwner = randomUUID();
    await db.insert(UserProfiles).values({
      id: otherOwner,
      authUserId: randomUUID(),
      userEmail: 'other@example.invalid',
      userName: 'Other creator',
    });
    await db.insert(Stories).values([
      {
        id: randomUUID(),
        ownerId: otherOwner,
        title: 'Other creator',
        slug: 'other-creator-story',
        status: 'published',
      },
      {
        id: randomUUID(),
        ownerId,
        title: 'Archived secret',
        slug: 'archived-secret-story',
        status: 'archived',
      },
    ]);
    const privateCheck = await getPublicProfile(ownerId, { limit: 50 });
    assert.equal(privateCheck.user.storyCount, 14);
    assert.ok(
      privateCheck.items.every(
        story =>
          !['Other creator', 'Archived secret'].includes(story.output.title)
      )
    );
    const otherProfile = await getPublicProfile(otherOwner, {});
    assert.equal(otherProfile.items.length, 1);
    assert.equal(otherProfile.items[0].output.title, 'Other creator');
    for (const page of ['-1', '1.5', 'invalid', '100001']) {
      assert.equal(
        sitemapQuerySchema.safeParse({ query: { page } }).success,
        false
      );
    }
  } finally {
    await pg.close();
  }
});
