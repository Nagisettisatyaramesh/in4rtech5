const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
// Any fixed number works; it stops two server instances migrating at the same time.
const LOCK_ID = 4847321;

// Applies each .sql file in migrations/ once, in name order, recording it in schema_migrations.
async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query('select pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`);
    const { rows } = await client.query('select name from schema_migrations');
    const applied = new Set(rows.map((row) => row.name));
    const pending = fs.readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith('.sql') && !applied.has(file)).sort();

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query('begin');
        await client.query(sql);
        await client.query('insert into schema_migrations (name) values ($1)', [file]);
        await client.query('commit');
        console.log(`Applied database migration ${file}.`);
      } catch (error) {
        await client.query('rollback');
        error.message = `Migration ${file} failed: ${error.message}`;
        throw error;
      }
    }
    return pending;
  } finally {
    await client.query('select pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
  }
}

module.exports = { migrate };
