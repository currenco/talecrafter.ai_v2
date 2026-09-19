import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();
config({ path: new URL('../../.env', import.meta.url), override: false });

const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
  throw new Error('DATABASE_URL_UNPOOLED is required for migrations');
}

if (!String(process.env.NEON_BRANCH ?? '').startsWith('dev/')) {
  throw new Error('Migrations are restricted to a dev/* Neon branch');
}

const sql = neon(connectionString);
const migrationsDir = fileURLToPath(
  new URL('../src/db/migrations/', import.meta.url)
);

await sql`
  CREATE TABLE IF NOT EXISTS public.app_schema_migrations (
    name varchar(255) PRIMARY KEY,
    checksum varchar(64) NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`;

const appliedRows = await sql`
  SELECT name, checksum FROM public.app_schema_migrations
`;
const applied = new Map(appliedRows.map(row => [row.name, row.checksum]));
const files = (await readdir(migrationsDir))
  .filter(name => name.endsWith('.sql'))
  .sort();

for (const name of files) {
  const source = await readFile(path.join(migrationsDir, name), 'utf8');
  const checksum = createHash('sha256').update(source).digest('hex');
  const existingChecksum = applied.get(name);

  if (existingChecksum) {
    if (existingChecksum !== checksum) {
      throw new Error(`Applied migration was modified: ${name}`);
    }
    console.log(`skip ${name}`);
    continue;
  }

  const statements = source
    .split('--> statement-breakpoint')
    .map(statement => statement.trim())
    .filter(Boolean);
  const queries = statements.map(statement => sql.query(statement, []));
  queries.push(sql`
    INSERT INTO public.app_schema_migrations (name, checksum)
    VALUES (${name}, ${checksum})
  `);

  await sql.transaction(queries);
  console.log(`applied ${name}`);
}
