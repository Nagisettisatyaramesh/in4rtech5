const bcrypt = require('bcryptjs');
const { contactFromValue, getRealtimeDatabase } = require('../config/realtimeDatabase');
const { consumeRateLimit } = require('../middleware/rateLimit');

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
      if (saveError) return res.status(500).json({ success: false, message: 'Could not save your sign-in session. Check the Firestore session configuration and try again.' });
      return res.json({ success: true, message: 'Signed in.' });
    });
  });
}

async function listContacts(req, res, next) {
  try {
    const snapshot = await getRealtimeDatabase().ref('contacts').once('value');
    const contacts = [];
    snapshot.forEach((child) => {
      contacts.push(contactFromValue(child.key, child.val()));
    });
    contacts.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    res.json({ success: true, contacts: contacts.slice(0, 250) });
  } catch (error) { next(error); }
}

async function getContact(req, res, next) {
  try {
    const snapshot = await getRealtimeDatabase().ref(`contacts/${req.params.id}`).once('value');
    if (!snapshot.exists()) return res.status(404).json({ success: false, message: 'Submission not found.' });
    res.json({ success: true, contact: contactFromValue(snapshot.key, snapshot.val()) });
  } catch (error) { next(error); }
}

async function deleteContact(req, res, next) {
  try {
    const document = getRealtimeDatabase().ref(`contacts/${req.params.id}`);
    const snapshot = await document.once('value');
    if (!snapshot.exists()) return res.status(404).json({ success: false, message: 'Submission not found.' });
    await document.remove();
    res.json({ success: true, message: 'Submission deleted.' });
  } catch (error) { next(error); }
}

function logout(req, res) {
  req.session.destroy(() => res.clearCookie('in4tech.sid').json({ success: true, message: 'Signed out.' }));
}

module.exports = { login, listContacts, getContact, deleteContact, logout };
