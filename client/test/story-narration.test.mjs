import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(
  readFileSync(new URL('../lib/story-narration.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText, { exports });

function setup() {
  const spoken = [], states = [], errors = [];
  let cancels = 0;
  const synth = {
    paused: false,
    speak: utterance => spoken.push(utterance),
    cancel: () => { cancels++; },
    pause() { this.paused = true; },
    resume() { this.paused = false; },
  };
  class Utterance { constructor(text) { this.text = text; } }
  const player = exports.createStoryNarration(synth, Utterance, state => states.push(state), message => errors.push(message));
  return { player, synth, spoken, states, errors, cancels: () => cancels };
}

test('switching chapters cancels only the old audio and ignores its late events', () => {
  const { player, spoken, states, cancels } = setup();
  player.toggle(0, 'First chapter');
  const lateEnd = spoken[0].onend;
  const lateError = spoken[0].onerror;
  player.toggle(1, 'Second chapter');
  lateEnd();
  lateError({ error: 'interrupted' });
  assert.equal(cancels(), 1);
  assert.equal(states.at(-1).key, 1);
  assert.equal(spoken[1].text, 'Second chapter');
  spoken[1].onend();
  assert.equal(states.at(-1).key, null);
});

test('pause and resume keep the current utterance instead of restarting it', () => {
  const { player, synth, spoken, states } = setup();
  player.toggle(0, 'A story');
  player.toggle(0, 'A story');
  assert.equal(synth.paused, true);
  assert.equal(states.at(-1).paused, true);
  player.toggle(0, 'A story');
  assert.equal(synth.paused, false);
  assert.equal(spoken.length, 1);
});

test('failed playback resets controls and explains recovery; empty text is not queued', () => {
  const { player, spoken, states, errors } = setup();
  player.toggle(0, '  ');
  assert.equal(spoken.length, 0);
  assert.match(errors[0], /no story text/);
  player.toggle(0, 'A story');
  spoken[0].onerror({ error: 'voice-unavailable' });
  assert.equal(states.at(-1).key, null);
  assert.match(errors[1], /text-to-speech voice/);
});

test('leaving the reader detaches handlers and cancels its active audio once', () => {
  const { player, spoken, cancels } = setup();
  player.toggle(0, 'A story');
  player.stop();
  player.stop();
  assert.equal(cancels(), 1);
  assert.equal(spoken[0].onend, null);
  assert.equal(spoken[0].onerror, null);
});
