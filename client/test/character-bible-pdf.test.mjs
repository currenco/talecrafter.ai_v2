import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Buffer } from 'node:buffer';
import { pathToFileURL, URL } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const compile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const dataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const content = dataUrl(compile(await readFile(new URL('../lib/character-bible-content.ts', import.meta.url), 'utf8')));
const source = compile(await readFile(new URL('../lib/character-bible-pdf.ts', import.meta.url), 'utf8'))
  .replace('"./character-bible-content"', JSON.stringify(content))
  .replace('"jspdf"', JSON.stringify(pathToFileURL(require.resolve('jspdf')).href));
const { createCharacterBiblePdf, needsBrowserPdf } = await import(dataUrl(source));

test('bible PDF contains native text, not page images, and paginates long stories', async () => {
  const pdf = await createCharacterBiblePdf({
    title: 'Garden', settings: { artStyle: 'Watercolor' },
    characters: { Mira: 'Mira wears a red coat.' },
    scenes: Array.from({ length: 30 }, (_, index) => ({
      title: `Gate ${index + 1}`, textPrompt: 'Mira enters the garden. '.repeat(40),
      imagePrompt: 'Watercolor garden with a red coat',
      animationDirection: 'Slow push toward Mira while the leaves sway.',
    })),
  });
  const bytes = pdf.output();
  assert.ok(pdf.getNumberOfPages() > 1);
  for (const text of ['Art style: Watercolor', 'Mira wears a red coat.', 'How to animate this scene', 'Slow push toward Mira', 'Narration']) assert.ok(bytes.includes(text));
  assert.doesNotMatch(bytes, /\/Subtype\s*\/Image/);
  assert.match(bytes, /\) Tj/);
});

test('unsupported scripts use browser text printing instead of corrupt PDF glyphs', async () => {
  assert.equal(needsBrowserPdf('Cafe\u00e9\nHello \u2014 world'), false);
  for (const text of ['\u0928\u092e\u0938\u094d\u0924\u0947', '\u4f60\u597d', '\u0645\u0631\u062d\u0628\u0627', '\ud83c\udf3f']) assert.equal(needsBrowserPdf(text), true);
  await assert.rejects(createCharacterBiblePdf({ title: '\u4f60\u597d', characters: {}, scenes: [] }), /browser PDF printing/);
});
