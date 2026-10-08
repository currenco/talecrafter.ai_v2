import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(new URL('../lib/story-generation.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

class ApiClientError extends Error {
  constructor(message, statusCode, retryAfterMs) {
    super(message);
    this.statusCode = statusCode;
    this.retryAfterMs = retryAfterMs;
  }
}

const fixture = (responses, hidden = false) => {
  let now = 0;
  let calls = 0;
  const delays = [];
  const listeners = new Set();
  const document = {
    visibilityState: hidden ? 'hidden' : 'visible',
    addEventListener: (_name, listener) => listeners.add(listener),
    removeEventListener: (_name, listener) => listeners.delete(listener),
  };
  const exports = {};
  runInNewContext(source, {
    exports,
    Date: { now: () => now },
    document,
    window: {
      setTimeout: (callback, milliseconds) => {
        delays.push(milliseconds);
        now += milliseconds;
        callback();
      },
    },
    require: () => ({
      ApiClientError,
      apiFetch: async () => {
        calls += 1;
        const response = responses.shift();
        if (response instanceof Error) throw response;
        return response;
      },
    }),
  });
  return {
    run: () => exports.waitForStoryPublication({ storyId: 'story', token: 'test' }),
    calls: () => calls,
    delays,
    show: () => {
      document.visibilityState = 'visible';
      for (const listener of listeners) listener();
    },
    listeners,
  };
};

test('backs off to ten seconds and stops immediately after publication', async () => {
  const f = fixture([...Array(7).fill({ status: 'draft', generationStatus: 'running' }), { status: 'published' }]);
  await f.run();
  assert.deepEqual(f.delays, [2000, 3000, 4500, 6750, 10000, 10000, 10000]);
  assert.equal(f.calls(), 8);
});

test('hidden tabs issue no status requests and resume on visibility', async () => {
  const f = fixture([{ status: 'published' }], true);
  const pending = f.run();
  await Promise.resolve();
  assert.equal(f.calls(), 0);
  f.show();
  await pending;
  assert.equal(f.calls(), 1);
  assert.equal(f.listeners.size, 0);
});

test('honors rate-limit cooldown and preserves terminal failures', async () => {
  const f = fixture([new ApiClientError('Limited', 429, 45000), { status: 'published' }]);
  await f.run();
  assert.deepEqual(f.delays, [45000]);
  const failed = fixture([{ status: 'draft', generationStatus: 'failed', errorMessage: 'Provider failed' }]);
  await assert.rejects(failed.run(), /Provider failed/);
  assert.equal(failed.calls(), 1);
});
