import { createPool } from '../infrastructure/persistence/pg/pg-unit-of-work';

// Deployment persistence must be PostgreSQL. These guards fail the build if a
// future change reintroduces a silent in-memory fallback.
describe('createPool', () => {
  it.each([
    ['missing', {}],
    ['empty', { DATABASE_URL: '' }],
    ['blank', { DATABASE_URL: '   ' }]
  ])('refuses to build a pool when DATABASE_URL is %s', (_name, env) => {
    expect(() => createPool(env as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL is required/);
  });

  it('builds a pool from a supplied DATABASE_URL', async () => {
    const pool = createPool({
      DATABASE_URL: 'postgresql://fieldrelay:local@127.0.0.1:5432/fieldrelay'
    } as NodeJS.ProcessEnv);
    // Constructing a pool must not open a connection.
    expect(pool.totalCount).toBe(0);
    await pool.end();
  });
});
