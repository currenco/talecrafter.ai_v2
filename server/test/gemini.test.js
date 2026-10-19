import assert from 'node:assert/strict';
import test from 'node:test';
import { parseContinuationPayload } from '../src/services/plottwist.service.js';
import {
  generateStoryJson,
  getStoryGenerationConfig,
  INTERACTIVE_STARTER_PAGE_COUNT,
  normalizeStoryDraft,
  STORY_PAGE_COUNT,
  storyGenerationConfig,
  tryParseGeminiJson,
} from '../src/services/gemini.service.js';

const buildStory = pageCount => ({
  title: 'A Seven Page Story',
  characterDescriptions: {
    hero: 'Mira has curly black hair, round glasses, and a yellow coat.',
  },
  chapters: Array.from({ length: pageCount }, (_, index) => ({
    chapterNumber: index + 10,
    title: `Page ${index + 1}`,
    textPrompt: `Story text for page ${index + 1}`,
    imagePrompt: `mira-page-${index + 1}`,
    animationDirection: `Slow push toward Mira on page ${index + 1}; keep her appearance and art style consistent.`,
  })),
});

test('normalizes story output to no more than seven pages', () => {
  const story = normalizeStoryDraft(buildStory(STORY_PAGE_COUNT + 2));

  assert.equal(story.chapters.length, STORY_PAGE_COUNT);
  assert.deepEqual(
    story.chapters.map(chapter => chapter.chapterNumber),
    [1, 2, 3, 4, 5, 6, 7]
  );
});

test('rejects a story with fewer than seven pages', () => {
  assert.throws(
    () => normalizeStoryDraft(buildStory(STORY_PAGE_COUNT - 1)),
    /must contain exactly 7 pages/
  );
});

test('rejects an incomplete page before image generation begins', () => {
  const story = buildStory(STORY_PAGE_COUNT);
  story.chapters[2].imagePrompt = '';

  assert.throws(() => normalizeStoryDraft(story), /story page 3 is incomplete/);
});

test('configures Gemini to return exactly seven structured chapters', () => {
  assert.equal(storyGenerationConfig.responseMimeType, 'application/json');
  assert.equal(
    storyGenerationConfig.responseSchema.properties.chapters.minItems,
    7
  );
  assert.equal(
    storyGenerationConfig.responseSchema.properties.chapters.maxItems,
    7
  );
});

test('parses JSON wrapped in markdown and surrounding text', () => {
  const parsed = tryParseGeminiJson(
    `Here is the story:\n\`\`\`json\n${JSON.stringify(buildStory(7))}\n\`\`\``
  );

  assert.equal(parsed.title, 'A Seven Page Story');
  assert.equal(parsed.chapters.length, 7);
});

test('repairs malformed classic story output before failing the request', async () => {
  const calls = [];
  const story = await generateStoryJson({
    formData: { storySubject: 'A moonlit library' },
    generateText: async request => {
      calls.push(request);
      return calls.length === 1
        ? '{"title": "Broken"'
        : JSON.stringify(buildStory(7));
    },
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[1].mode, 'story-generation');
  assert.match(calls[1].prompt, /not valid story JSON/);
  assert.equal(story.chapters.length, 7);
});

test('repairs structurally incomplete story output', async () => {
  const calls = [];
  const story = await generateStoryJson({
    formData: { storySubject: 'A moonlit library' },
    generateText: async request => {
      calls.push(request);
      return JSON.stringify(
        calls.length === 1 ? buildStory(3) : buildStory(STORY_PAGE_COUNT)
      );
    },
  });

  assert.equal(calls.length, 2);
  assert.match(calls[1].prompt, /exactly 7 pages/);
  assert.equal(story.chapters.length, 7);
});

test('returns a controlled error when both story attempts are invalid', async () => {
  await assert.rejects(
    () =>
      generateStoryJson({
        formData: { storySubject: 'A moonlit library' },
        generateText: async () => 'not json',
      }),
    /could not produce a valid 7-page story after retry/
  );
});

test('new stories generate and preserve animation directions in the initial response', async () => {
  let calls = 0;
  const story = await generateStoryJson({
    formData: { storySubject: 'A garden', imageStyle: 'Watercolor' },
    generateText: async request => {
      calls++;
      assert.match(request.prompt, /animationDirection/);
      assert.match(request.prompt, /Return exactly 7 chapters/);
      assert.match(
        request.prompt,
        /Make page 7 a complete and satisfying conclusion/
      );
      assert.equal(request.pageCount, 7);
      return JSON.stringify(buildStory(7));
    },
  });
  assert.equal(calls, 1);
  assert.equal(
    story.chapters[0].animationDirection,
    buildStory(7).chapters[0].animationDirection
  );
});

test('Classic repairs an old five-page response into seven pages', async () => {
  const calls = [];
  const story = await generateStoryJson({
    formData: { storySubject: 'A garden' },
    generateText: async request => {
      calls.push(request);
      return JSON.stringify(buildStory(calls.length === 1 ? 5 : 7));
    },
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].pageCount, 7);
  assert.match(calls[1].prompt, /7-page story/);
  assert.equal(story.chapters.length, 7);
});

test('Plot Twist starters and their repair retain five-page schemas and decision endings', async () => {
  const calls = [];
  const story = await generateStoryJson({
    formData: { storySubject: 'A garden' },
    interactive: true,
    generateText: async request => {
      calls.push(request);
      assert.equal(request.pageCount, INTERACTIVE_STARTER_PAGE_COUNT);
      assert.match(request.prompt, /End page 5 at a meaningful decision point/);
      return JSON.stringify(buildStory(calls.length === 1 ? 3 : 5));
    },
  });
  assert.equal(calls.length, 2);
  assert.equal(story.chapters.length, 5);
  const interactiveSchema = getStoryGenerationConfig(
    INTERACTIVE_STARTER_PAGE_COUNT
  ).responseSchema.properties.chapters;
  assert.equal(interactiveSchema.minItems, 5);
  assert.equal(interactiveSchema.maxItems, 5);
  assert.equal(
    getStoryGenerationConfig().responseSchema.properties.chapters.minItems,
    7
  );
  assert.equal(
    storyGenerationConfig.responseSchema.properties.chapters.maxItems,
    7
  );
});

test('missing animation directions trigger the bounded story repair', async () => {
  let calls = 0;
  const story = await generateStoryJson({
    formData: { storySubject: 'A garden' },
    generateText: async () => {
      const output = buildStory(7);
      if (++calls === 1) delete output.chapters[0].animationDirection;
      return JSON.stringify(output);
    },
  });
  assert.equal(calls, 2);
  assert.ok(story.chapters.every(chapter => chapter.animationDirection));
});

test('Plot Twist continuation preserves directions and rejects missing directions', () => {
  const page = {
    text: 'Mira opens the gate.',
    imagePrompt: 'Mira at the gate',
    animationDirection: 'Slow push toward the gate.',
  };
  const raw = JSON.stringify({ pages: [page], choices: ['Enter', 'Wait'] });
  assert.equal(
    parseContinuationPayload(raw).pages[0].animationDirection,
    page.animationDirection
  );
  assert.throws(
    () =>
      parseContinuationPayload(
        JSON.stringify({ pages: [{ ...page, animationDirection: '' }] })
      ),
    /missing scene animation directions/
  );
});
