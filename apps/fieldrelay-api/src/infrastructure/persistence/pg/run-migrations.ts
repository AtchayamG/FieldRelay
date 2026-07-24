import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createPool } from './pg-unit-of-work';

// Applies every unapplied file in infra/database/migrations, in filename order,
// one transaction per file. Each migration records its own version in
// schema_migrations, so the same SQL is safe whether it is applied here or by
// the Compose Postgres init hook.
const MIGRATIONS_DIR = resolve(__dirname, '../../../../../../infra/database/migrations');

export async function runMigrations(directory = MIGRATIONS_DIR): Promise<string[]> {
  const pool = createPool();
  const applied: string[] = [];
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         version    text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`
    );
    const { rows } = await pool.query<{ version: string }>('SELECT version FROM schema_migrations');
    const done = new Set(rows.map((row) => row.version));

    const files = (await readdir(directory)).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      if (done.has(version)) continue;

      const sql = await readFile(join(directory, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        applied.push(version);
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
      } finally {
        client.release();
      }
    }
    return applied;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then((applied) => {
      console.log(
        applied.length > 0
          ? `Applied migrations: ${applied.join(', ')}`
          : 'No migrations to apply.'
      );
    })
    .catch((error: Error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
