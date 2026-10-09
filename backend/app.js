require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const { checkFirestoreConnection } = require('./config/firestore');
const { checkRealtimeDatabaseConnection } = require('./config/realtimeDatabase');
const FirestoreSessionStore = require('./config/firestoreSessionStore');
const sessionStore = new FirestoreSessionStore();
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const blogRoutes = require('./routes/blogRoutes');

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
if (process.env.FRONTEND_ORIGIN) app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
// Articles can be long; every other endpoint keeps the small body limit.
app.use('/api/admin/blogs', express.json({ limit: '300kb' }));
app.use(express.json({ limit: '20kb' }));
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('Set SESSION_SECRET before starting in production.');
}
app.use(session({
  name: 'in4tech.sid', secret: process.env.SESSION_SECRET || 'development-only-change-this-secret',
  store: sessionStore, resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 }
}));

app.get('/api/health', async (req, res) => {
  let firestore = 'unavailable';
  let realtimeDatabase = 'unavailable';
  try {
    await checkFirestoreConnection();
    firestore = 'connected';
  } catch (error) {
    console.error(`Firestore health check failed (${error.code || 'unknown'}).`);
  }
  try {
    await checkRealtimeDatabaseConnection();
    realtimeDatabase = 'connected';
  } catch (error) {
    console.error(`Realtime Database health check failed (${error.code || 'unknown'}).`);
  }
  const connected = firestore === 'connected' && realtimeDatabase === 'connected';
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'degraded', firestore, realtimeDatabase, contactStorage: 'realtime-database', sessionStorage: 'firestore' });
});
app.use('/api/contact', contactRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/admin', adminRoutes);
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html')));
app.use((error, req, res, next) => {
  console.error(error.message);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again shortly.' });
});

module.exports = app;
