import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultEnvFile = path.resolve(scriptDirectory, '../../../.env');

export const loadPocEnvironment = () => {
  const envFile = process.env.PLATFORM_POC_ENV_FILE
    ? path.resolve(process.env.PLATFORM_POC_ENV_FILE)
    : defaultEnvFile;
  const contents = fs.readFileSync(envFile, 'utf8');

  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;

    const name = line.slice(0, separator);
    const value = line.slice(separator + 1).replace(/^['"]|['"]$/g, '');
    if (!process.env[name]) process.env[name] = value;
  }

  if (!process.env.NEON_BRANCH?.startsWith('dev/')) {
    throw new Error('Platform proofs must run on a dev/* Neon branch');
  }

  return process.env;
};

export const requireVariables = (env, names) => {
  const missing = names.filter(name => !env[name]);
  if (missing.length) {
    throw new Error(`Missing required variables: ${missing.join(', ')}`);
  }
};
