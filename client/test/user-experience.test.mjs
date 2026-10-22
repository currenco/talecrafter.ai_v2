import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { Buffer } from 'node:buffer';
import ts from 'typescript';

async function loadModule(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { safeReturnPath, returnPathFromSearch, authHref } = await loadModule('../lib/auth-navigation.ts');
const { apiErrorMessage, userErrorMessage } = await loadModule('../lib/user-messages.ts');
const { retryPolicy } = await loadModule('../lib/interactive-recovery.ts');
const { characterBibleSections } = await loadModule('../lib/character-bible-content.ts');

async function loadProgressModule() {
  const source = readFileSync(new URL('../lib/story-generation.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  const isolated = outputText.replace(/^import .*;$/gm, '');
  const mocks = `class ApiClientError extends Error { constructor(message, statusCode, retry, code) { super(message); this.statusCode=statusCode; this.code=code; } }
    const apiErrorMessage = (message) => message || 'Generation failed';
    const refreshAccessToken = async () => 'refreshed';`;
  return import(`data:text/javascript;base64,${Buffer.from(mocks + isolated).toString('base64')}`);
}

test('Classic progress uses one stream and handles split frames without status polling', async () => {
  const { streamStoryProgress } = await loadProgressModule();
  const original = globalThis.fetch;
  let requests = 0;
  const updates = [];
  globalThis.fetch = async url => {
    requests++;
    assert.match(url, /\/events$/);
    const frames = ': heartbeat\n\ndata: {"generationStatus":"running","completedImages":1}\n\ndata: {"generationStatus":"succeeded","status":"published"}\n\n';
    const bytes = new globalThis.TextEncoder().encode(frames);
    return new globalThis.Response(new globalThis.ReadableStream({ start(controller) {
      controller.enqueue(bytes.slice(0, 35));
      controller.enqueue(bytes.slice(35));
      controller.close();
    } }), { headers: { 'content-type': 'text/event-stream' } });
  };
  try {
    const result = await streamStoryProgress({ storyId: 'test', token: 'token', onProgress: value => updates.push(value) });
    assert.equal(result.status, 'published');
    assert.equal(updates.length, 2);
    assert.equal(requests, 1);
  } finally { globalThis.fetch = original; }
});

test('terminal image failure retains its code and does not reconnect or regenerate', async () => {
  const { waitForStoryPublication } = await loadProgressModule();
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return new globalThis.Response('data: {"generationStatus":"failed","status":"draft","errorCode":"POLLINATIONS_BALANCE_EXHAUSTED"}\n\n', { headers: { 'content-type': 'text/event-stream' } });
  };
  try {
    await assert.rejects(waitForStoryPublication({ storyId: 'test', token: 'token' }), error => error.code === 'POLLINATIONS_BALANCE_EXHAUSTED');
    assert.equal(requests, 1);
  } finally { globalThis.fetch = original; }
});

test('Explore only offers genre filtering and does not fetch art-style options', () => {
  const source = readFileSync(new URL('../app/explore/ExploreClient.tsx', import.meta.url), 'utf8');
  assert.match(source, /id="explore-genre"/);
  assert.doesNotMatch(source, /explore-art-style|\/stories\/art-styles|setArtStyles|query\.set\("artStyle"/);
  assert.doesNotMatch(source, /searchParams\.get\("artStyle"/);
});

test('draft recovery stays in a dialog rather than a block above the reader', () => {
  const source = readFileSync(new URL('../app/draft-story/[id]/DraftReader.tsx', import.meta.url), 'utf8');
  assert.match(source, /generationNotice=\{notice\}/);
  assert.match(source, /<ModalBody[\s\S]*<PollinationsUpgradeNotice \/>[\s\S]*<\/ModalBody>/);
  assert.doesNotMatch(source, /<section aria-live/);
  assert.match(source, /View options/);
});

test('character bible exports selected settings, descriptions and readable scene prompts', () => {
  const sections = characterBibleSections({
    title: 'Garden', settings: { subject: 'Find a garden', genre: 'Fantasy', ageGroup: '8-12', artStyle: 'Watercolor', format: 'Classic' },
    characters: { Mira: { appearance: 'Red coat', bestFriend: 'Leo' } },
    scenes: [{ title: 'Gate', textPrompt: ['Mira arrives.', 'Leo follows.'], imagePrompt: 'watercolor-red-coat-in-a-garden', animationDirection: 'Slow push toward Mira; keep her red coat and watercolor texture.' }],
  });
  const text = sections.map(section => section.text).join('\n');
  for (const expected of ['Art style: Watercolor', 'Age group: 8-12', 'Genre: Fantasy', 'Story format: Classic', 'Story idea: Find a garden', 'best Friend: Leo', 'Mira arrives.', 'watercolor red coat in a garden']) assert.ok(text.includes(expected));
  assert.doesNotMatch(text, /\{"|watercolor-red/);
  assert.match(text, /How to animate this scene\nSlow push toward Mira/);
  assert.equal(sections.find(section => section.text === 'Garden').role, 'title');
  assert.equal(sections.find(section => section.text === 'Character profiles').pageBreak, true);
  assert.equal(sections.find(section => section.text === 'Scene 1: Gate').pageBreak, true);
  assert.match(text, /Narration\nMira arrives/);
});

test('uncertain outcomes retain keys and only terminal failures allow new attempts', () => {
  for (const status of ['unknown', 'not_found']) assert.deepEqual(retryPolicy(status), { allowed: true, newKey: false });
  for (const status of ['failed', 'cancelled']) assert.deepEqual(retryPolicy(status), { allowed: true, newKey: true });
  for (const status of ['running', 'reserved', 'succeeded']) assert.deepEqual(retryPolicy(status), { allowed: false, newKey: false });
});

test('recovery performs one status read without timer-based polling', () => {
  const source = readFileSync(new URL('../app/interactive-story/[id]/page.tsx', import.meta.url), 'utf8');
  const recovery = source.slice(source.indexOf('const reconcileGeneration'), source.indexOf('const retryGeneration'));
  assert.equal((recovery.match(/await apiFetch/g) ?? []).length, 1);
  assert.doesNotMatch(recovery, /setTimeout|setInterval|attempts|while\s*\(/);
});

test('opening an interactive draft does not display the generation overlay', () => {
  const source = readFileSync(new URL('../app/interactive-story/[id]/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /\[loading, setLoading\] = useState\(true\)/);
  assert.match(source, /aria-label="Opening your story"/);
  assert.match(source, /CustomLoader isLoading=\{generatingNext\}/);
  assert.doesNotMatch(source, /isLoading=\{loading \|\| generatingNext\}/);
});

test('plan and story destinations survive encoded auth links and legacy redirects', () => {
  for (const destination of ['/pricing#creator', '/create-story', '/explore?genre=Sci-fi', '/story/example']) {
    const link = authHref('/sign-up', destination);
    assert.equal(returnPathFromSearch(link.slice(link.indexOf('?'))), destination);
  }
  assert.equal(returnPathFromSearch('?redirect_url=%2Fcreate-story'), '/create-story');
});

test('auth return paths reject external origins, backslashes, and control characters', () => {
  for (const path of ['https://evil.example', '//evil.example', '/\\evil.example', '/\nevil.example', 'javascript:alert(1)', null]) {
    assert.equal(safeReturnPath(path), '/dashboard');
  }
});

test('API failures explain recovery without exposing infrastructure details', () => {
  assert.match(apiErrorMessage('secret database error', 500), /try later/i);
  assert.doesNotMatch(apiErrorMessage('Gemini API key is not configured', 500), /Gemini|API key/);
  assert.match(apiErrorMessage('Payment provider authentication failed', 401), /Checkout is temporarily unavailable/);
  assert.match(apiErrorMessage('anything', 403, 'CREATOR_REQUIRED'), /Creator/);
  assert.match(apiErrorMessage('anything', 503, 'PLATFORM_BUDGET_REACHED'), /My Stories/);
  assert.match(apiErrorMessage('Invalid payment signature', 400), /before paying again/);
  assert.match(apiErrorMessage(undefined, 429), /Wait/);
});

test('authentication and network errors have useful next steps, unknown messages stay private', () => {
  assert.match(userErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD' }), /Forgot password/);
  assert.match(userErrorMessage({ code: 'OTP_EXPIRED' }), /new code/);
  assert.match(userErrorMessage(new TypeError('Failed to fetch')), /internet connection/);
  assert.equal(userErrorMessage(new Error('sensitive provider detail'), 'Try again.'), 'Try again.');
  assert.match(userErrorMessage({ name: 'AuthTokenUnavailableError' }), /account/);
});
