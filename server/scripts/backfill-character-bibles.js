import 'dotenv/config';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    limit: { type: 'string', default: '10' },
  },
});
const limit = Number(values.limit);
if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10000)
  throw new Error('--limit must be between 1 and 10000');
const {
  listMissingCharacterBibles,
  backfillCharacterBible,
  characterBiblePrompt,
} = await import('../src/services/characterBible.service.js');
let after;
let eligible = 0;
let invalid = 0;
let approximateInputTokens = 0;
let saved = 0;
let failed = 0;
let attempted = 0;
let consecutiveFailures = 0;
let stopped = false;
process.on('SIGINT', () => {
  stopped = true;
});
process.on('SIGTERM', () => {
  stopped = true;
});
console.log(
  values.apply
    ? `Applying backfill; maximum ${limit} AI requests. Run only one backfill process at a time.`
    : 'Dry run: no AI calls or database writes.'
);
while (!stopped) {
  const candidates = await listMissingCharacterBibles({ after, limit: 25 });
  if (!candidates.length) break;
  for (const candidate of candidates) {
    after = candidate.id;
    if (stopped) break;
    try {
      const prompt = characterBiblePrompt(
        candidate.output,
        candidate.imageStyle
      );
      eligible += 1;
      approximateInputTokens += Math.ceil(prompt.length / 4);
    } catch {
      invalid += 1;
      console.log(
        JSON.stringify({ storyId: candidate.storyId, status: 'manual_review' })
      );
      continue;
    }
    if (!values.apply) continue;
    attempted += 1;
    try {
      const status = await backfillCharacterBible(candidate);
      if (status === 'saved') saved += 1;
      consecutiveFailures = 0;
      console.log(JSON.stringify({ storyId: candidate.storyId, status }));
    } catch (error) {
      failed += 1;
      consecutiveFailures += 1;
      console.error(
        JSON.stringify({
          storyId: candidate.storyId,
          status: 'failed',
          reason:
            error?.name === 'ZodError'
              ? 'invalid_generated_descriptions'
              : 'generation_or_storage_error',
          httpStatus: Number.isInteger(error?.status)
            ? error.status
            : undefined,
          message:
            'No character bible saved. Check provider availability and rerun to retry.',
        })
      );
    }
    if (attempted >= limit || consecutiveFailures >= 3) {
      stopped = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
console.log(
  JSON.stringify({
    mode: values.apply ? 'apply' : 'dry-run',
    eligible,
    invalid,
    attempted,
    saved,
    failed,
    approximateInputTokens,
  })
);
if (failed) process.exitCode = 1;
