import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

test('footer, guide and checkout support links open the email handler', () => {
  for (const path of ['../app/(components)/Footer.tsx', '../app/how-to-use/page.tsx', '../components/CreatorCheckout.tsx']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /href=\{`mailto:\$\{legalContactEmail\}`\}/);
  }
  const footer = readFileSync(new URL('../app/(components)/Footer.tsx', import.meta.url), 'utf8');
  assert.match(footer, /Email support at/);
  assert.match(footer, />\{legalContactEmail\}<\/a>/);
  assert.match(footer, /underline underline-offset-4/);
});
