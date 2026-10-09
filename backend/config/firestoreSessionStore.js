const crypto = require('crypto');
const session = require('express-session');
const { getFirestoreDb } = require('./firestore');

const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000;

class FirestoreSessionStore extends session.Store {
  constructor() {
    super();
    this.collection = 'sessions';
  }

  documentId(sessionId) {
    return crypto.createHash('sha256').update(sessionId).digest('hex');
  }

  expiresAt(sessionData) {
    const cookieExpiry = sessionData?.cookie?.expires;
    const expiry = cookieExpiry ? new Date(cookieExpiry) : new Date(Date.now() + DEFAULT_TTL_MS);
    return Number.isNaN(expiry.getTime()) ? new Date(Date.now() + DEFAULT_TTL_MS) : expiry;
  }

  get(sessionId, callback) {
    Promise.resolve().then(() => getFirestoreDb().collection(this.collection).doc(this.documentId(sessionId)).get())
      .then(async (snapshot) => {
        if (!snapshot.exists) return callback(null, null);
        const stored = snapshot.data();
        if (!stored.expiresAt || stored.expiresAt.toDate() <= new Date()) {
          await snapshot.ref.delete();
          return callback(null, null);
        }
        return callback(null, stored.session || null);
      })
      .catch(callback);
  }

  set(sessionId, sessionData, callback = () => {}) {
    // Firestore rejects undefined values; Express session cookies include optional
    // fields such as domain and sameSite that are undefined by default.
    const serializableSession = JSON.parse(JSON.stringify(sessionData));
    Promise.resolve().then(() => getFirestoreDb().collection(this.collection).doc(this.documentId(sessionId)).set({
      session: serializableSession,
      expiresAt: this.expiresAt(sessionData)
    })).then(() => callback(null)).catch(callback);
  }

  touch(sessionId, sessionData, callback = () => {}) {
    this.set(sessionId, sessionData, callback);
  }

  destroy(sessionId, callback = () => {}) {
    Promise.resolve().then(() => getFirestoreDb().collection(this.collection).doc(this.documentId(sessionId)).delete())
      .then(() => callback(null)).catch(callback);
  }
}

module.exports = FirestoreSessionStore;
