const crypto = require('crypto');
const session = require('express-session');
const { query } = require('./database');

const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000;

// Stores admin sessions in the admin_sessions table, keyed by a hash of the session id.
class PgSessionStore extends session.Store {
  documentId(sessionId) {
    return crypto.createHash('sha256').update(sessionId).digest('hex');
  }

  expiresAt(sessionData) {
    const cookieExpiry = sessionData?.cookie?.expires;
    const expiry = cookieExpiry ? new Date(cookieExpiry) : new Date(Date.now() + DEFAULT_TTL_MS);
    return Number.isNaN(expiry.getTime()) ? new Date(Date.now() + DEFAULT_TTL_MS) : expiry;
  }

  get(sessionId, callback) {
    Promise.resolve().then(async () => {
      const { rows } = await query('select session, expires_at from admin_sessions where id = $1', [this.documentId(sessionId)]);
      const row = rows[0];
      if (!row) return callback(null, null);
      if (new Date(row.expires_at) <= new Date()) {
        await this.destroy(sessionId);
        return callback(null, null);
      }
      return callback(null, row.session || null);
    }).catch(callback);
  }

  set(sessionId, sessionData, callback = () => {}) {
    query(
      `insert into admin_sessions (id, session, expires_at) values ($1, $2, $3)
       on conflict (id) do update set session = excluded.session, expires_at = excluded.expires_at`,
      [this.documentId(sessionId), JSON.stringify(sessionData), this.expiresAt(sessionData)]
    ).then(() => callback(null)).catch(callback);
  }

  touch(sessionId, sessionData, callback = () => {}) {
    this.set(sessionId, sessionData, callback);
  }

  destroy(sessionId, callback = () => {}) {
    return query('delete from admin_sessions where id = $1', [this.documentId(sessionId)])
      .then(() => callback(null)).catch(callback);
  }
}

module.exports = PgSessionStore;
