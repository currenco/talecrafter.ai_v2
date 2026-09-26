import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeStoryDraft,
  STORY_PAGE_COUNT,
} from '../src/services/gemini.service.js';

const buildStory = pageCount => ({
  title: 'A Five Page Story',
  characterDescriptions: {
    hero: 'Mira has curly black hair, round glasses, and a yellow coat.',
  },
  chapters: Array.from({ length: pageCount }, (_, index) => ({
    chapterNumber: index + 10,
    title: `Page ${index + 1}`,
    textPrompt: `Story text for page ${index + 1}`,
    imagePrompt: `mira-page-${index + 1}`,
  })),
});

test('normalizes story output to no more than five pages', () => {
  const story = normalizeStoryDraft(buildStory(STORY_PAGE_COUNT + 2));

  assert.equal(story.chapters.length, STORY_PAGE_COUNT);
  assert.deepEqual(
    story.chapters.map(chapter => chapter.chapterNumber),
    [1, 2, 3, 4, 5]
  );
});

test('rejects a story with fewer than five pages', () => {
  assert.throws(
    () => normalizeStoryDraft(buildStory(STORY_PAGE_COUNT - 1)),
    /must contain exactly 5 pages/
  );
});

test('rejects an incomplete page before image generation begins', () => {
  const story = buildStory(STORY_PAGE_COUNT);
  story.chapters[2].imagePrompt = '';

  assert.throws(() => normalizeStoryDraft(story), /story page 3 is incomplete/);
});
