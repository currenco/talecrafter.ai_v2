import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();
config({ path: new URL('../../.env', import.meta.url), override: false });

if (!String(process.env.NEON_BRANCH ?? '').startsWith('dev/')) {
  throw new Error('Development seed is restricted to a dev/* Neon branch');
}

const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) throw new Error('A database connection URL is required');

const sql = neon(connectionString);
const profileId = '00000000-0000-4000-8000-000000000101';
const accountId = '00000000-0000-4000-8000-000000000102';
const classicId = '00000000-0000-4000-8000-000000000201';
const classicPublicId = '00000000-0000-4000-8000-000000000202';
const interactiveId = '00000000-0000-4000-8000-000000000301';
const interactivePublicId = '00000000-0000-4000-8000-000000000302';
const nodeId = '00000000-0000-4000-8000-000000000303';

await sql.transaction([
  sql`
    INSERT INTO app.user_profiles (
      id, auth_user_id, email, display_name, avatar_url
    ) VALUES (
      ${profileId}, 'seed:demo-user', 'demo@example.invalid',
      'Demo Storyteller', null
    ) ON CONFLICT (auth_user_id) DO NOTHING
  `,
  sql`
    INSERT INTO app.credit_accounts (id, user_id, balance)
    VALUES (${accountId}, ${profileId}, 5)
    ON CONFLICT (user_id) DO NOTHING
  `,
  sql`
    INSERT INTO app.credit_ledger (
      account_id, amount, balance_after, reason, idempotency_key
    ) VALUES (${accountId}, 5, 5, 'signup', 'seed:demo-user:signup')
    ON CONFLICT (idempotency_key) DO NOTHING
  `,
  sql`
    INSERT INTO app.stories (
      id, public_id, owner_id, slug, kind, status, title, story_subject,
      story_type, age_group, image_style, published_at
    ) VALUES (
      ${classicId}, ${classicPublicId}, ${profileId}, 'the-clockwork-garden',
      'classic', 'published', 'The Clockwork Garden',
      'A child restores a garden powered by kindness.', 'Adventure', '8-12',
      'Storybook', now()
    ) ON CONFLICT (public_id) DO NOTHING
  `,
  sql`
    INSERT INTO app.story_versions (story_id, version, content)
    VALUES (
      ${classicId}, 1,
      ${JSON.stringify({
        title: 'The Clockwork Garden',
        chapters: [
          {
            chapterNumber: 1,
            title: 'The Silent Gate',
            textPrompt:
              'Mira discovers a garden whose clockwork flowers have stopped.',
            imagePrompt: 'A bright clockwork garden behind an old gate',
            imageUrl: '',
          },
        ],
      })}::jsonb
    ) ON CONFLICT (story_id, version) DO NOTHING
  `,
  sql`
    INSERT INTO app.stories (
      id, public_id, owner_id, slug, kind, status, title, story_subject,
      story_type, age_group, image_style
    ) VALUES (
      ${interactiveId}, ${interactivePublicId}, ${profileId},
      'the-lantern-crossroads', 'interactive', 'draft',
      'The Lantern Crossroads', 'Choose a path through a glowing forest.',
      'Fantasy', '8-12', 'Watercolor'
    ) ON CONFLICT (public_id) DO NOTHING
  `,
  sql`
    INSERT INTO app.story_versions (story_id, version, content)
    VALUES (
      ${interactiveId}, 1,
      ${JSON.stringify({
        title: 'The Lantern Crossroads',
        chapters: [],
      })}::jsonb
    ) ON CONFLICT (story_id, version) DO NOTHING
  `,
  sql`
    INSERT INTO app.interactive_stories (
      story_id, root_node_id, current_node_id, total_pages
    ) VALUES (${interactiveId}, ${nodeId}, ${nodeId}, 1)
    ON CONFLICT (story_id) DO NOTHING
  `,
  sql`
    INSERT INTO app.interactive_story_nodes (
      id, story_id, depth, choices, pages, is_active
    ) VALUES (
      ${nodeId}, ${interactiveId}, 0,
      ${JSON.stringify(['Follow the lanterns', 'Cross the silver bridge'])}::jsonb,
      ${JSON.stringify([
        {
          pageNumber: 1,
          title: 'A Fork in the Forest',
          text: 'Two paths shimmer beneath the moon.',
          imagePrompt: 'A moonlit forest crossroads with lanterns',
          imageUrl: '',
        },
      ])}::jsonb,
      true
    ) ON CONFLICT (id) DO NOTHING
  `,
  sql`
    INSERT INTO app.seed_records (namespace, key)
    VALUES ('development', 'phase-2-foundation')
    ON CONFLICT (namespace, key) DO NOTHING
  `,
]);

console.log('seeded development story workflows');
