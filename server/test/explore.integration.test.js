import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { subscriptionDb } from './helpers/subscription-db.js';
import { publicStoriesQuerySchema } from '../src/validations/story.validation.js';
import { sitemapQuerySchema } from '../src/validations/story.validation.js';

test('public genre and art filters combine before pagination and exclude drafts', async () => {
  const { pg, db } = await subscriptionDb();
  const { Stories, StoryVersions, UserProfiles } =
    await import('../src/db/schema.js');
  const { listPublicStories, listPublicGenres, listPublicArtStyles } =
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
        imageStyle: ['Watercolor', 'Watercolor', 'Anime', 'Secret style', '  '][index],
        status,
      });
      await db
        .insert(StoryVersions)
        .values({ storyId: id, output: { title: `Story ${index}` } });
    }
    assert.deepEqual(await listPublicGenres(), ['Fantasy', 'Mystery']);
    assert.deepEqual(await listPublicArtStyles(), ['Anime', 'Watercolor']);
    assert.equal((await listPublicStories({ artStyle: 'watercolor' })).length, 2);
    const filtered = await listPublicStories({ genre: 'fantasy', artStyle: 'watercolor' });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].imageStyle, 'Watercolor');
    assert.deepEqual(await listPublicStories({ genre: 'Mystery', artStyle: 'Anime' }), []);
    assert.deepEqual(await listPublicStories({ artStyle: 'Secret style' }), []);
    assert.deepEqual(await listPublicStories({ artStyle: "' OR 1=1 --" }), []);
    const artFirst = await listPublicStories({ artStyle: 'Watercolor', limit: 1 });
    const artSecond = await listPublicStories({ artStyle: 'Watercolor', limit: 1, offset: 1 });
    assert.notEqual(artFirst[0].storyId, artSecond[0].storyId);
    assert.deepEqual(await listPublicStories({ artStyle: 'Watercolor', offset: 2 }), []);
    assert.equal(publicStoriesQuerySchema.parse({ query: { artStyle: ' Anime ' } }).query.artStyle, 'Anime');
    for (const artStyle of [['Anime'], 'a'.repeat(81)]) {
      assert.equal(publicStoriesQuerySchema.safeParse({ query: { artStyle } }).success, false);
    }
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
    assert.equal((await listPublicStories({ preview: true, artStyle: 'Anime', limit: 50 })).length, 8);
    assert.deepEqual(await listPublicStories({ preview: true, artStyle: 'Anime', offset: 8 }), []);
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
