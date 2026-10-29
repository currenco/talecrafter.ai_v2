import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

test('story deletion requires confirmation in the library and admin list', () => {
  const card = readFileSync(new URL('../app/dashboard/_components/StoryItemCard.tsx', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../app/admin/page.tsx', import.meta.url), 'utf8');
  assert.match(card, /setDeleteOpen\(true\)/);
  assert.match(card, /onConfirm=\{handleDelete\}/);
  assert.doesNotMatch(card, /onClick=\{handleDelete\}/);
  assert.match(admin, /onClick=\{\(\) => setDeleteStoryId\(story.storyId\)\}/);
  assert.match(admin, /<DeleteStoryDialog/);
});

test('confirmation offers cancellation and guards duplicate deletion requests', () => {
  const dialog = readFileSync(new URL('../components/DeleteStoryDialog.tsx', import.meta.url), 'utf8');
  assert.match(dialog, /Are you sure you want to delete this story\?/);
  assert.match(dialog, /onPress=\{onClose\}>Cancel/);
  assert.match(dialog, /if \(busy.current\) return/);
  assert.match(dialog, /if \(await onConfirm\(\)\) onClose\(\)/);
  assert.match(dialog, /isDismissable=\{!pending\}/);
});
