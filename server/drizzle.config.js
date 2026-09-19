import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config();
config({ path: new URL('../.env', import.meta.url), override: false });

const url = process.env.DATABASE_URL_UNPOOLED;

if (!url) {
  throw new Error('DATABASE_URL_UNPOOLED is required for schema migrations');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.js',
  out: './src/db/migrations',
  dbCredentials: { url },
  schemaFilter: ['app'],
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
