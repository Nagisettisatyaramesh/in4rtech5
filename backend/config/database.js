// PostgreSQL connection for the website's server, configured with the DB_* variables in .env.
// With SSH_ENABLED=true it connects through an SSH tunnel to DB_REMOTE_HOST:DB_REMOTE_PORT on SSH_HOST.
// Pending migrations in backend/db/migrations run automatically on first use.
const net = require('net');
const { Pool } = require('pg');
const { migrate } = require('../db/migrate');

let poolPromise;

function configError(message) {
  const error = new Error(message);
  error.code = 'DB_NOT_CONFIGURED';
  return error;
}

// node-postgres has no automatic fallback, so "prefer" and "allow" connect without TLS.
function sslOption(mode = 'disable') {
  switch (mode.toLowerCase()) {
    case 'require': return { rejectUnauthorized: false };
    case 'verify-ca':
    case 'verify-full': return { rejectUnauthorized: true };
    default: return false;
  }
}

// Opens an SSH connection and a local port that forwards to the database on the remote side.
function openSshTunnel() {
  const { Client } = require('ssh2');
  const remoteHost = process.env.DB_REMOTE_HOST || '127.0.0.1';
  const remotePort = Number(process.env.DB_REMOTE_PORT || 5432);
  if (!process.env.SSH_HOST || !process.env.SSH_USER) throw configError('SSH_ENABLED is true but SSH_HOST or SSH_USER is missing.');

  return new Promise((resolve, reject) => {
    const ssh = new Client();
    ssh.on('ready', () => {
      const server = net.createServer((socket) => {
        ssh.forwardOut(socket.remoteAddress || '127.0.0.1', socket.remotePort || 0, remoteHost, remotePort, (error, stream) => {
          if (error) return socket.destroy(error);
          socket.pipe(stream).pipe(socket);
        });
      });
      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => resolve({ host: '127.0.0.1', port: server.address().port }));
      ssh.on('close', () => { server.close(); poolPromise = null; });
    });
    ssh.on('error', (error) => { error.code = error.code || 'SSH_TUNNEL_FAILED'; reject(error); });
    ssh.connect({
      host: process.env.SSH_HOST,
      port: Number(process.env.SSH_PORT || 22),
      username: process.env.SSH_USER,
      password: process.env.SSH_PASSWORD || undefined,
      privateKey: process.env.SSH_KEY_PATH ? require('fs').readFileSync(process.env.SSH_KEY_PATH) : undefined,
      readyTimeout: 15000,
      keepaliveInterval: 30000
    });
  });
}

async function createPool() {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (!DB_NAME || !DB_USER) throw configError('Set DB_NAME and DB_USER (and DB_HOST, DB_PORT, DB_PASSWORD) in .env.');
  const endpoint = process.env.SSH_ENABLED === 'true'
    ? await openSshTunnel()
    : { host: DB_HOST || '127.0.0.1', port: Number(DB_PORT || 5432) };

  const pool = new Pool({
    ...endpoint,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: sslOption(process.env.DB_SSLMODE),
    max: Number(process.env.DB_POOL_MAX || 5),
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });
  pool.on('error', (error) => console.error(`Idle database connection error: ${error.message}`));
  await migrate(pool);
  return pool;
}

function getPool() {
  if (!poolPromise) poolPromise = createPool().catch((error) => { poolPromise = null; throw error; });
  return poolPromise;
}

async function query(text, params) {
  const pool = await getPool();
  return pool.query(text, params);
}

async function checkDatabaseConnection() {
  await query('select 1');
  return true;
}

module.exports = { checkDatabaseConnection, getPool, query };
