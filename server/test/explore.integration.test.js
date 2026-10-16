import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { subscriptionDb } from './helpers/subscription-db.js';
import { publicStoriesQuerySchema } from '../src/validations/story.validation.js';

test('public genre filters apply before pagination and exclude drafts', async () => {
  const { pg, db } = await subscriptionDb();
  const { Stories, StoryVersions, UserProfiles } =
    await import('../src/db/schema.js');
  const { listPublicStories, listPublicGenres } =
    await import('../src/services/story.service.js');
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
        status,
      });
      await db
        .insert(StoryVersions)
        .values({ storyId: id, output: { title: `Story ${index}` } });
    }
    assert.deepEqual(await listPublicGenres(), ['Fantasy', 'Mystery']);
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
      (await listPublicStories({ preview: true, genre: 'Fantasy', limit: 50 }))
        .length,
      8
    );
    assert.equal(
      (await listPublicStories({ preview: false, limit: 50 })).length,
      14
    );
  } finally {
    await pg.close();
  }
});
