import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { URL } from 'node:url';
import { Buffer } from 'node:buffer';

const source = readFileSync(new URL('../lib/email-validation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { emailValidationMessage } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('common provider suffix typos explain the correction', () => {
  assert.match(emailValidationMessage('patidarharshita454@gmail.com.com'), /did you mean gmail.com/);
  assert.match(emailValidationMessage('name@GMAIL.COM.COM'), /did you mean gmail.com/);
});

test('malformed emails receive actionable format feedback', () => {
  for (const email of ['', 'name', 'name@', '@gmail.com', 'name@@gmail.com', 'name@domain..com', 'first..last@gmail.com', 'name@-example.com']) {
    assert.ok(emailValidationMessage(email), email);
  }
});

test('valid international and multi-level domains are not treated as duplicate suffix typos', () => {
  for (const email of ['name@gmail.com', 'first.last+test@example.com', 'name@company.co.uk', 'name@company.com.au', 'name@xn--bcher-kva.de']) {
    assert.equal(emailValidationMessage(email), '', email);
  }
});
