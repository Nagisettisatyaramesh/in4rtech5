require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const { checkSupabaseConnection } = require('./config/supabase');
const SupabaseSessionStore = require('./config/supabaseSessionStore');
const sessionStore = new SupabaseSessionStore();
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
  let connection = 'unavailable';
  try {
    await checkSupabaseConnection();
    connection = 'connected';
  } catch (error) {
    console.error(`Supabase health check failed (${error.code || 'unknown'}).`);
  }
  res.status(connection === 'connected' ? 200 : 503).json({ status: connection === 'connected' ? 'ok' : 'degraded', database: 'supabase', connection });
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
