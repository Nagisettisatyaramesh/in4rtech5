const crypto = require('crypto');
const { getFirestoreDb } = require('../config/firestore');

// Fixed document per route and anonymized IP keeps the limiter shared across
// serverless instances without storing raw IP addresses.
async function consumeRateLimit(scope, ip, limit, windowMs) {
  const key = crypto.createHash('sha256').update(`${scope}:${ip}`).digest('hex');
  const ref = getFirestoreDb().collection('requestLimits').doc(key);
  return getFirestoreDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const now = Date.now();
    const data = snapshot.exists ? snapshot.data() : {};
    const resetAt = data.resetAt?.toMillis ? data.resetAt.toMillis() : 0;
    if (!resetAt || resetAt <= now) {
      transaction.set(ref, { scope, count: 1, resetAt: new Date(now + windowMs) });
      return true;
    }
    if ((data.count || 0) >= limit) return false;
    transaction.update(ref, { count: (data.count || 0) + 1 });
    return true;
  });
}

function rateLimit(scope, limit, windowMs) {
  return async (req, res, next) => {
    try {
      const allowed = await consumeRateLimit(scope, req.ip || req.socket.remoteAddress || 'unknown', limit, windowMs);
      if (!allowed) return res.status(429).json({ success: false, message: 'Too many requests. Please wait and try again.' });
      return next();
    } catch (error) {
      console.error(`Request rate limit unavailable (${error.code || 'unknown'}).`);
      return res.status(503).json({ success: false, message: 'This service is temporarily unavailable. Please try again shortly.' });
    }
  };
}

module.exports = { consumeRateLimit, rateLimit };
