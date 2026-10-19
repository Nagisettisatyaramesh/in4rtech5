// Applies pending database migrations without starting the server: npm run db:migrate
require('dotenv').config();
const { getPool } = require('../backend/config/database');

getPool()
  .then(async (pool) => {
    console.log('Database is up to date.');
    await pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(`Migration failed (${error.code || 'unknown'}): ${error.message}`);
    process.exit(1);
  });
