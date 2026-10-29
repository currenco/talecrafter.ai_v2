import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

test('password visibility is shared by sign-in, sign-up and password reset', () => {
  for (const path of [
    '../app/(auth)/sign-in/[[...sign-in]]/page.tsx',
    '../app/(auth)/sign-up/[[...sign-up]]/page.tsx',
    '../app/(auth)/forgot-password/page.tsx',
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /<PasswordField/);
    assert.doesNotMatch(source, /type="password"/);
  }
});

test('passwords start hidden and the visibility button cannot submit the form', () => {
  const source = readFileSync(new URL('../app/(auth)/PasswordField.tsx', import.meta.url), 'utf8');
  assert.match(source, /useState\(false\)/);
  assert.match(source, /type=\{visible \? "text" : "password"\}/);
  assert.match(source, /type="button"/);
  assert.match(source, /aria-label=\{action\}/);
  assert.match(source, /visible \? "Hide password" : "Show password"/);
  assert.match(source, /setVisible\(value => !value\)/);
  assert.match(source, /htmlFor=\{inputId\}/);
});
