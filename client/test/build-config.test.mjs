import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { URL } from 'node:url';

test('PostCSS matches the reviewed static configuration before it is executed', () => {
  const config = readFileSync(new URL('../postcss.config.mjs', import.meta.url), 'utf8');
  // Update only after reviewing an intentional PostCSS change, never by importing it.
  const digest = createHash('sha256').update(config.replace(/\r\n/g, '\n')).digest('hex');
  assert.equal(
    digest,
    'ac31e2a95ef64fe27ceb4124e101675273107aae2e33bc490b01d919e7f03646',
    'Unreviewed PostCSS configuration. Inspect as text before running Next.js.',
  );
});

test('known disguised executable and automatic editor tasks are absent', () => {
  assert.equal(
    existsSync(new URL('../../public/fonts/fa-solid-700.otf', import.meta.url)),
    false,
    'Known injected executable disguised as a font must not be restored.',
  );
  for (const path of ['../../.vscode/tasks.json', '../../.vscode/settings.json']) {
    const url = new URL(path, import.meta.url);
    if (!existsSync(url)) continue;
    const source = readFileSync(url, 'utf8');
    assert.doesNotMatch(source, /folderOpen|fa-solid-700|"task\.allowAutomaticTasks"\s*:\s*true/);
  }
});
