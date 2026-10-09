function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
}

module.exports = { requireAdmin };
