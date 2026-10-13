import { readFile } from 'node:fs/promises';
import { mock } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { PgDialect } from 'drizzle-orm/pg-core';
import * as schema from '../../src/db/schema.js';

// Ephemeral PostgreSQL; never loads credentials or connects to Neon.
export const subscriptionDb = async () => {
  const pg = new PGlite();
  const journal = JSON.parse(
    await readFile(
      new URL('../../src/db/migrations/meta/_journal.json', import.meta.url),
      'utf8'
    )
  );
  for (const entry of journal.entries) {
    const migration = await readFile(
      new URL(`../../src/db/migrations/${entry.tag}.sql`, import.meta.url),
      'utf8'
    );
    await pg.exec(migration);
  }
  await pg.exec(`CREATE SCHEMA neon_auth;
    CREATE TABLE neon_auth."user" (id text PRIMARY KEY, email text, name text, image text);
    CREATE TABLE neon_auth.account ("userId" uuid, "providerId" text);`);
  const db = drizzle(pg, { schema });
  const dialect = new PgDialect();
  db.batch = queries =>
    pg.transaction(async tx => {
      const results = [];
      for (const query of queries) {
        const compiled = dialect.sqlToQuery(query.getSQL());
        results.push(await tx.query(compiled.sql, compiled.params));
      }
      return results;
    });
  mock.module('../../src/db/index.js', { namedExports: { db } });
  return { pg, db };
};
