import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { isDeepStrictEqual } from 'node:util';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { Stories, StoryVersions } from '../src/db/schema.js';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    source: { type: 'string' },
    backup: { type: 'string' },
    'expected-host': { type: 'string' },
    apply: { type: 'boolean', default: false },
  },
});
const host = new URL(process.env.DATABASE_URL).hostname;
if (
  !values.source ||
  !values['expected-host'] ||
  host !== values['expected-host']
)
  throw new Error('Provide --source and the exact --expected-host');
if (values.apply && !values.backup)
  throw new Error('--backup is required for apply');
const source = JSON.parse(await readFile(values.source, 'utf8'));
if (source.host === host)
  throw new Error('Source and target must be different databases');
const rows = await db
  .select({
    id: StoryVersions.id,
    storyId: Stories.storyId,
    output: StoryVersions.output,
    imageStyle: Stories.imageStyle,
  })
  .from(StoryVersions)
  .innerJoin(Stories, eq(Stories.id, StoryVersions.storyId))
  .where(and(eq(Stories.status, 'published'), eq(StoryVersions.version, 1)));
const targets = new Map(rows.map(row => [row.storyId, row]));
const stripBible = output => {
  const copy = globalThis.structuredClone(output);
  delete copy.characterDescriptions;
  for (const chapter of copy.chapters) delete chapter.animationDirection;
  return copy;
};
const planned = [];
const skipped = [];
const seen = new Set();
for (const candidate of source.candidates) {
  if (seen.has(candidate.storyId)) throw new Error('Duplicate source story');
  seen.add(candidate.storyId);
  const target = targets.get(candidate.storyId);
  if (!target) {
    skipped.push({
      storyId: candidate.storyId,
      reason: 'not_published_on_target',
    });
    continue;
  }
  if (
    !Object.keys(candidate.output.characterDescriptions ?? {}).length ||
    !candidate.output.chapters?.length ||
    candidate.output.chapters.some(
      ch =>
        typeof ch.animationDirection !== 'string' ||
        !ch.animationDirection.trim()
    )
  )
    throw new Error(`Incomplete source: ${candidate.storyId}`);
  if (
    target.imageStyle !== candidate.imageStyle ||
    !isDeepStrictEqual(stripBible(target.output), stripBible(candidate.output))
  ) {
    skipped.push({
      storyId: candidate.storyId,
      reason: 'source_content_differs',
    });
    continue;
  }
  const output = {
    ...target.output,
    characterDescriptions: Object.keys(
      target.output.characterDescriptions ?? {}
    ).length
      ? target.output.characterDescriptions
      : candidate.output.characterDescriptions,
    chapters: target.output.chapters.map((chapter, index) => ({
      ...chapter,
      animationDirection: chapter.animationDirection?.trim()
        ? chapter.animationDirection
        : candidate.output.chapters[index].animationDirection,
    })),
  };
  if (!isDeepStrictEqual(output, target.output))
    planned.push({ ...target, expected: output });
}
console.log(
  JSON.stringify({
    targetHost: host,
    reviewed: source.candidates.length,
    planned: planned.length,
    skipped,
  })
);
if (!values.apply) process.exit(0);
// Write a private, exclusive backup before touching any target rows.
await writeFile(
  values.backup,
  JSON.stringify({ host, createdAt: new Date().toISOString(), rows, planned }),
  { flag: 'wx', mode: 0o600 }
);
let saved = 0;
for (const row of planned) {
  const updated = await db
    .update(StoryVersions)
    .set({ output: row.expected })
    .where(
      and(
        eq(StoryVersions.id, row.id),
        sql`${StoryVersions.output} = ${JSON.stringify(row.output)}::jsonb`,
        sql`EXISTS (SELECT 1 FROM ${Stories} WHERE ${Stories.id} = ${StoryVersions.storyId} AND ${Stories.status} = 'published')`
      )
    )
    .returning({ output: StoryVersions.output });
  if (!updated.length)
    throw new Error(
      `Concurrent change; stopped after ${saved} saves: ${row.storyId}`
    );
  if (!isDeepStrictEqual(updated[0].output, row.expected))
    throw new Error('Saved content verification failed');
  saved++;
  console.log(JSON.stringify({ storyId: row.storyId, saved }));
}
console.log(JSON.stringify({ saved, backup: values.backup, providerCalls: 0 }));
