const bcrypt = require('bcryptjs');
const { getSupabase, unwrap } = require('../config/supabase');
const { consumeRateLimit } = require('../middleware/rateLimit');

const CONTACT_FIELDS = 'id, first_name, last_name, email, phone, company, subject, service, message, created_at';
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));

async function login(req, res) {
  try {
    const allowed = await consumeRateLimit('admin-login', req.ip || req.socket.remoteAddress || 'unknown', 10, 15 * 60 * 1000);
    if (!allowed) return res.status(429).json({ success: false, message: 'Too many sign-in attempts. Please wait 15 minutes and try again.' });
  } catch (error) {
    console.error(`Admin sign-in rate limit unavailable (${error.code || 'unknown'}).`);
    return res.status(503).json({ success: false, message: 'Sign-in is temporarily unavailable. Please try again shortly.' });
  }
  const { username, password } = req.body || {};
  const validUser = typeof username === 'string' && username === process.env.ADMIN_USERNAME;
  const hash = process.env.ADMIN_PASSWORD_HASH || '';
  const hasBcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
  const validPassword = typeof password === 'string' && hasBcryptHash && await bcrypt.compare(password, hash);
  if (!validUser || !validPassword) return res.status(401).json({ success: false, message: 'The username or password is incorrect.' });
  req.session.regenerate((error) => {
    if (error) return res.status(500).json({ success: false, message: 'Could not start a secure session.' });
    req.session.isAdmin = true;
    req.session.save((saveError) => {
      if (saveError) return res.status(500).json({ success: false, message: 'Could not save your sign-in session. Check the Supabase configuration and try again.' });
      return res.json({ success: true, message: 'Signed in.' });
    });
  });
}

async function listContacts(req, res, next) {
  try {
    const contacts = unwrap(await getSupabase().from('contacts').select(CONTACT_FIELDS)
      .order('created_at', { ascending: false }).limit(250));
    res.json({ success: true, contacts });
  } catch (error) { next(error); }
}

async function getContact(req, res, next) {
  try {
    const contact = isUuid(req.params.id) && unwrap(await getSupabase().from('contacts').select(CONTACT_FIELDS)
      .eq('id', req.params.id).maybeSingle());
    if (!contact) return res.status(404).json({ success: false, message: 'Submission not found.' });
    res.json({ success: true, contact });
  } catch (error) { next(error); }
}

async function deleteContact(req, res, next) {
  try {
    const deleted = isUuid(req.params.id) ? unwrap(await getSupabase().from('contacts').delete()
      .eq('id', req.params.id).select('id')) : [];
    if (!deleted.length) return res.status(404).json({ success: false, message: 'Submission not found.' });
    res.json({ success: true, message: 'Submission deleted.' });
  } catch (error) { next(error); }
}

function logout(req, res) {
  req.session.destroy(() => res.clearCookie('in4tech.sid').json({ success: true, message: 'Signed out.' }));
}

module.exports = { login, listContacts, getContact, deleteContact, logout };
