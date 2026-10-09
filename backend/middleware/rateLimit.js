const crypto = require('crypto');
const { getSupabase, unwrap } = require('../config/supabase');

// One row per scope and anonymized IP keeps the limiter shared across
// serverless instances without storing raw IP addresses.
async function consumeRateLimit(scope, ip, limit, windowMs) {
  const key = crypto.createHash('sha256').update(`${scope}:${ip}`).digest('hex');
  return unwrap(await getSupabase().rpc('consume_rate_limit', {
    p_key: key, p_scope: scope, p_limit: limit, p_window_seconds: Math.round(windowMs / 1000)
  })) === true;
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
