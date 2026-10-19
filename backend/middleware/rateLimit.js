const crypto = require('crypto');
const { query } = require('../config/database');

// One row per scope and anonymized IP keeps the limiter shared across
// server instances without storing raw IP addresses.
async function consumeRateLimit(scope, ip, limit, windowMs) {
  const key = crypto.createHash('sha256').update(`${scope}:${ip}`).digest('hex');
  const { rows } = await query('select consume_rate_limit($1, $2, $3, $4) as allowed',
    [key, scope, limit, Math.round(windowMs / 1000)]);
  return rows[0].allowed === true;
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
