import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { deepStrictEqual } from 'node:assert';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const { values } = parseArgs({
  options: {
    export: { type: 'boolean', default: false },
    apply: { type: 'boolean', default: false },
    verify: { type: 'boolean', default: false },
    snapshot: { type: 'string' },
    edits: { type: 'string' },
  },
});
const host = new URL(process.env.DATABASE_URL).hostname;
// This one-time editorial backfill is restricted to the approved development branch.
if (host !== 'ep-solitary-brook-b5h062pj-pooler.c-7.us-east-2.aws.neon.tech')
  throw new Error('This tool only supports the approved development database');
if (!values.snapshot) throw new Error('--snapshot is required');
if ([values.export, values.apply, values.verify].filter(Boolean).length > 1)
  throw new Error('Choose only one of --export, --apply, or --verify');
if (!values.export && !values.edits) throw new Error('--edits is required');
const { listMissingCharacterBibles, backfillCharacterBible } =
  await import('../src/services/characterBible.service.js');

if (values.export) {
  if (values.apply) throw new Error('Export and apply are separate operations');
  const candidates = [];
  let after;
  for (;;) {
    const batch = await listMissingCharacterBibles({ after, limit: 25 });
    if (!batch.length) break;
    candidates.push(...batch);
    after = batch.at(-1).id;
  }
  await writeFile(values.snapshot, JSON.stringify({ host, candidates }), {
    flag: 'wx',
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      stories: candidates.length,
      scenes: candidates.reduce((n, c) => n + c.output.chapters.length, 0),
    })
  );
} else {
  const snapshot = JSON.parse(await readFile(values.snapshot, 'utf8'));
  if (snapshot.host !== host)
    throw new Error('Snapshot database does not match');
  const edits = z
    .array(
      z
        .object({
          storyId: z.string().uuid(),
          animationDirections: z.array(z.string().trim().min(1).max(3000)),
          characterDescriptions: z
            .record(
              z.string().trim().min(1).max(120),
              z.string().trim().min(1).max(3000)
            )
            .optional(),
        })
        .strict()
    )
    .parse(JSON.parse(await readFile(values.edits, 'utf8')));
  const seen = new Set();
  const candidates = new Map(snapshot.candidates.map(c => [c.storyId, c]));
  for (const edit of edits) {
    if (seen.has(edit.storyId)) throw new Error('Duplicate story edit');
    seen.add(edit.storyId);
    const candidate = candidates.get(edit.storyId);
    if (
      !candidate ||
      edit.animationDirections.length !== candidate.output.chapters.length
    )
      throw new Error(`Scene count mismatch: ${edit.storyId}`);
    if (
      !Object.keys(candidate.output.characterDescriptions ?? {}).length &&
      !Object.keys(edit.characterDescriptions ?? {}).length
    )
      throw new Error(`Missing character descriptions: ${edit.storyId}`);
  }
  let saved = 0;
  let verified = 0;
  for (const edit of edits) {
    if (values.verify) {
      const { db } = await import('../src/db/index.js');
      const { StoryVersions } = await import('../src/db/schema.js');
      const candidate = candidates.get(edit.storyId);
      const [row] = await db
        .select({ output: StoryVersions.output })
        .from(StoryVersions)
        .where(eq(StoryVersions.id, candidate.id));
      const expected = {
        ...candidate.output,
        characterDescriptions: Object.keys(
          candidate.output.characterDescriptions ?? {}
        ).length
          ? candidate.output.characterDescriptions
          : edit.characterDescriptions,
        chapters: candidate.output.chapters.map((chapter, index) => ({
          ...chapter,
          animationDirection: chapter.animationDirection?.trim()
            ? chapter.animationDirection
            : edit.animationDirections[index],
        })),
      };
      deepStrictEqual(
        row?.output,
        expected,
        `Content mismatch: ${edit.storyId}`
      );
      verified++;
      continue;
    }
    if (!values.apply) continue;
    // The injected callback supplies reviewed text locally; it never invokes an AI provider.
    const status = await backfillCharacterBible(
      candidates.get(edit.storyId),
      async () => JSON.stringify(edit)
    );
    if (status === 'saved') saved++;
    console.log(JSON.stringify({ storyId: edit.storyId, status }));
  }
  console.log(
    JSON.stringify({
      validated: edits.length,
      saved,
      verified,
      apply: values.apply,
    })
  );
}
