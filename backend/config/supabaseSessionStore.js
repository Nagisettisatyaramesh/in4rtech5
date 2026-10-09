const crypto = require('crypto');
const session = require('express-session');
const { getSupabase, unwrap } = require('./supabase');

const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000;

class SupabaseSessionStore extends session.Store {
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
      const row = unwrap(await getSupabase().from('admin_sessions').select('session, expires_at')
        .eq('id', this.documentId(sessionId)).maybeSingle());
      if (!row) return callback(null, null);
      if (new Date(row.expires_at) <= new Date()) {
        await this.destroy(sessionId);
        return callback(null, null);
      }
      return callback(null, row.session || null);
    }).catch(callback);
  }

  set(sessionId, sessionData, callback = () => {}) {
    Promise.resolve().then(async () => {
      unwrap(await getSupabase().from('admin_sessions').upsert({
        id: this.documentId(sessionId),
        session: JSON.parse(JSON.stringify(sessionData)),
        expires_at: this.expiresAt(sessionData).toISOString()
      }));
    }).then(() => callback(null)).catch(callback);
  }

  touch(sessionId, sessionData, callback = () => {}) {
    this.set(sessionId, sessionData, callback);
  }

  destroy(sessionId, callback = () => {}) {
    return Promise.resolve().then(async () => {
      unwrap(await getSupabase().from('admin_sessions').delete().eq('id', this.documentId(sessionId)));
    }).then(() => callback(null)).catch(callback);
  }
}

module.exports = SupabaseSessionStore;
