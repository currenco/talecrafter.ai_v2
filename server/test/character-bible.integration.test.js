import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { subscriptionDb } from './helpers/subscription-db.js';

test('character bible backfill preserves content, existing bibles and concurrent edits', async () => {
  const { db, pg } = await subscriptionDb();
  const { Stories, StoryVersions, UserProfiles } =
    await import('../src/db/schema.js');
  const {
    listMissingCharacterBibles,
    backfillCharacterBible,
    characterBiblePrompt,
  } = await import('../src/services/characterBible.service.js');
  try {
    const ownerId = randomUUID();
    await db.insert(UserProfiles).values({
      id: ownerId,
      authUserId: randomUUID(),
      userEmail: 'bible@example.invalid',
      userName: 'Reader',
    });
    const output = {
      title: 'The garden',
      chapters: [
        {
          title: 'Gate',
          textPrompt: 'Mira helps her friend Leo open the garden.',
          imageUrl: 'unchanged.jpg',
          imagePrompt: 'Mira in a red coat',
        },
      ],
    };
    for (const [index, [status, bible]] of [
      ['published', null],
      ['published', { Mira: 'Existing' }],
      ['draft', null],
    ].entries()) {
      const id = randomUUID();
      await db.insert(Stories).values({
        id,
        ownerId,
        slug: `bible-${index}`,
        title: 'Garden',
        status,
      });
      await db.insert(StoryVersions).values({
        storyId: id,
        output: { ...output, characterDescriptions: bible },
      });
    }
    const candidates = await listMissingCharacterBibles();
    const candidate = candidates.find(
      item => !item.output.characterDescriptions
    );
    assert.equal(candidates.length, 2);
    const existing = candidates.find(item => item.output.characterDescriptions);
    await backfillCharacterBible(existing, async () =>
      JSON.stringify({
        animationDirections: [
          'Slowly approach the gate; preserve the red coat and art style.',
        ],
      })
    );
    const [preserved] = await db
      .select()
      .from(StoryVersions)
      .where(eq(StoryVersions.id, existing.id));
    assert.deepEqual(preserved.output.characterDescriptions, {
      Mira: 'Existing',
    });
    assert.match(characterBiblePrompt(candidate.output), /red coat/);
    assert.throws(() => characterBiblePrompt({ chapters: [] }));
    await assert.rejects(
      backfillCharacterBible(
        candidate,
        async () => '{"characterDescriptions":{}}'
      )
    );
    assert.equal((await listMissingCharacterBibles()).length, 1);
    assert.equal(
      await backfillCharacterBible(candidate, async () =>
        JSON.stringify({
          characterDescriptions: { Mira: 'Helps Leo; wears a red coat.' },
          animationDirections: [
            'Slowly approach the gate; preserve the red coat and art style.',
          ],
        })
      ),
      'saved'
    );
    assert.equal((await listMissingCharacterBibles()).length, 0);
    const [saved] = await db
      .select()
      .from(StoryVersions)
      .where(eq(StoryVersions.id, candidate.id));
    assert.deepEqual(
      saved.output.chapters.map(
        ({ animationDirection: _animationDirection, ...chapter }) => chapter
      ),
      output.chapters
    );
    assert.match(saved.output.chapters[0].animationDirection, /red coat/);
    assert.equal(saved.output.title, output.title);
    assert.equal(
      await backfillCharacterBible(candidate, async () =>
        JSON.stringify({
          characterDescriptions: { Mira: 'Replacement' },
          animationDirections: ['Replacement motion'],
        })
      ),
      'skipped_changed'
    );
    await db
      .update(StoryVersions)
      .set({ output: { ...output, title: 'Edited' } })
      .where(eq(StoryVersions.id, candidate.id));
    assert.equal(
      await backfillCharacterBible(candidate, async () =>
        JSON.stringify({
          characterDescriptions: { Mira: 'Stale source' },
          animationDirections: ['Stale motion'],
        })
      ),
      'skipped_changed'
    );
  } finally {
    await pg.close();
  }
});
