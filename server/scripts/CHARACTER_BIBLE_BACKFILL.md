# Character Bible Backfill

Run from `server` using the intended database environment. This is an operator-only script, not a public API or startup migration. Creator access stays enforced by the existing story-pack endpoint.

```bash
node scripts/backfill-character-bibles.js
node scripts/backfill-character-bibles.js --apply --limit 10
```

The default dry run counts eligible published stories and estimates input tokens from character count. This is not an exact token count or price quote; output tokens are additional. Apply makes at most one text-generation request per attempted story, sequentially. It does not generate images.

Only version 1 of published stories with missing character descriptions or missing scene animation directions is eligible. Existing descriptions and existing directions, draft stories and other versions are preserved. Sources are the saved full chapter text, image prompts, and selected art style, not an inspection of the illustrations. Unknown visual details stay unspecified. Each scene gets suggested subject, camera and background motion with continuity guidance. This does not generate video. Downloads do not call AI.

Run only one instance at a time to avoid paying for duplicate extraction. Conditional writes protect concurrent edits and existing descriptions, but do not prevent concurrent AI calls from two operators. Each successful result is saved immediately; rerunning skips completed stories. Failures remain eligible for a later run. Three consecutive failures stop the run. Interrupts stop after the current request; interrupted requests may still incur provider costs.

Inspect the first batch in Creator story packs before increasing the limit. Repeat batches until a dry run reports no eligible stories. Review `manual_review` stories separately; their source text is missing or too large. No schema migration is needed. Only missing `characterDescriptions` and chapter `animationDirection` fields are filled; original text, prompts, image URLs and publication dates are preserved.

## Manually reviewed text (no provider requests)

`manual-character-bibles.js` accepts editorial JSON instead of calling a generation provider. It is restricted to the approved development database host. Do not remove that guard to run against production without a separate review and approval.

```bash
node scripts/manual-character-bibles.js --export --snapshot /tmp/bible-source.json
node scripts/manual-character-bibles.js --snapshot /tmp/bible-source.json --edits /tmp/bible-edits.json
node scripts/manual-character-bibles.js --apply --snapshot /tmp/bible-source.json --edits /tmp/bible-edits.json
node scripts/manual-character-bibles.js --verify --snapshot /tmp/bible-source.json --edits /tmp/bible-edits.json
```

The edits file is an array of `{ storyId, animationDirections, characterDescriptions? }` objects. Write exactly one direction per source chapter, in source order, using the saved narrative and image prompt. Include descriptions only when missing. Review the content individually; do not replace missing directions with generic templates. No illustration or video is generated or inspected by this tool.

Export refuses to overwrite an existing snapshot. Validation checks IDs, duplicate edits, lengths and missing descriptions before any write. Apply preserves existing descriptions and directions and uses the original content as a concurrency guard. Verify reads each edited row and checks its entire content against the expected merged snapshot, including all unchanged fields. An interrupted apply can be rerun; already changed rows are skipped and can be verified separately.

Local source snapshots, reviewed text and progress records belong in the gitignored `.tools/character-bible-backfill/` directory, not in source control. The progress record distinguishes reviewed stories, pending writing, and content-review exclusions; it is not proof of persistence until `--verify` succeeds.

## Promote reviewed content

`promote-character-bibles.js` reads a reviewed `{ host, candidates }` source snapshot and compares it with the target database. Set `DATABASE_URL` through your secure environment, then provide `--source` and `--expected-host`. Without `--apply` it only reports planned changes. Applying also requires `--backup` pointing to a new private JSON file outside source control.

Only matching published version-1 stories are updated. The comparison excludes bible fields but requires all other saved output and the selected art style to match. Missing descriptions and animation directions are filled; existing fields are retained. No accounts, payments, story text, image URLs or settings are copied. Each conditional update verifies the returned output and stops on a concurrent change. Keep the backup for rollback and independently read back the updated rows after applying. Promotion makes no AI requests. Exclude unreviewed stories from the source file.
