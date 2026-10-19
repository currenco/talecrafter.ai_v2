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

test('character bible exports selected settings, descriptions and readable scene prompts', () => {
  const sections = characterBibleSections({
    title: 'Garden', settings: { subject: 'Find a garden', genre: 'Fantasy', ageGroup: '8-12', artStyle: 'Watercolor', format: 'Classic' },
    characters: { Mira: { appearance: 'Red coat', bestFriend: 'Leo' } },
    scenes: [{ title: 'Gate', textPrompt: ['Mira arrives.', 'Leo follows.'], imagePrompt: 'watercolor-red-coat-in-a-garden', animationDirection: 'Slow push toward Mira; keep her red coat and watercolor texture.' }],
  });
  const text = sections.map(section => section.text).join('\n');
  for (const expected of ['Art style: Watercolor', 'Age group: 8-12', 'Genre: Fantasy', 'Story format: Classic', 'Story idea: Find a garden', 'best Friend: Leo', 'Mira arrives.', 'watercolor red coat in a garden']) assert.ok(text.includes(expected));
  assert.doesNotMatch(text, /\{"|watercolor-red/);
  assert.match(text, /Animation direction\nSlow push toward Mira/);
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
  assert.match(apiErrorMessage('anything', 403, 'GITHUB_REQUIRED'), /Connect GitHub/);
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
