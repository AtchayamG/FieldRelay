// Apply a single migration file to the database in DATABASE_URL.
//
//   node scripts/apply-migration.mjs 0008_dispatches.sql
//
// Migrations here are written to be idempotent (CREATE TABLE IF NOT EXISTS and
// friends), so re-running one is safe. That matters because the deployed
// database is shared and nobody should have to remember whether they ran it.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// `pg` is a dependency of the API workspace, not the repo root, and ESM does
// not honour NODE_PATH. Resolve it from the package that actually declares it.
const require = createRequire(join(ROOT, 'apps', 'fieldrelay-api', 'package.json'));
const pg = require('pg');
const name = process.argv[2];

if (!name) {
  console.error('  usage: node scripts/apply-migration.mjs <file.sql>');
  process.exit(1);
}

// `.env` holds the local database; the deployed one lives in Vercel. Prefer the
// pulled production file when it exists, so applying a migration to production
// is explicit rather than an accident of which file was read first.
//   npx vercel env pull .vercel/.env.production --environment=production
const candidates = [
  process.env.MIGRATION_ENV_FILE,
  join(ROOT, '.vercel', '.env.production'),
  join(ROOT, '.env')
].filter(Boolean);

let env = '';
let source = '';
for (const candidate of candidates) {
  try {
    env = readFileSync(candidate, 'utf8');
    source = candidate;
    break;
  } catch {
    // try the next one
  }
}

const line = env.split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
if (!line) {
  console.error('  DATABASE_URL is not set in any of: ' + candidates.join(', '));
  process.exit(1);
}
console.log(`  using ${source.replace(ROOT, '.')}`);
const connectionString = line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');

const sql = readFileSync(join(ROOT, 'infra', 'database', 'migrations', name), 'utf8');

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('COMMIT');
  console.log(`  applied ${name}`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  console.error(`  FAILED ${name}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
