import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(new URL('../lib/story-text.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const exports = {};
runInNewContext(source, { exports });
const { getCleanChapterText } = exports;

test('preserves full public story text when image prompt is omitted or empty', () => {
  const textPrompt = 'Ella walked through the village. Tomorrow would bring a new adventure.';
  for (const imagePrompt of [undefined, null, '']) {
    assert.equal(getCleanChapterText({ textPrompt, imagePrompt }), textPrompt);
  }
});

test('preserves existing removal of appended illustration prompts', () => {
  const imagePrompt = 'A mountain village under a bright sky';
  assert.equal(
    getCleanChapterText({ textPrompt: `Ella arrived home. ${imagePrompt}`, imagePrompt }),
    'Ella arrived home.',
  );
});

test('handles absent chapter text', () => {
  assert.equal(getCleanChapterText({}), '');
});
