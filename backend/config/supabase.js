const { createClient } = require('@supabase/supabase-js');

let client;

// Server-only client. The service-role (secret) key bypasses row level security,
// so it must never be sent to the browser.
function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    const error = new Error('Supabase is not configured.');
    error.code = 'SUPABASE_NOT_CONFIGURED';
    throw error;
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// Supabase returns errors instead of throwing; this turns them into exceptions.
function unwrap({ data, error }) {
  if (error) {
    const wrapped = new Error(error.message);
    wrapped.code = error.code || 'SUPABASE_ERROR';
    throw wrapped;
  }
  return data;
}

async function checkSupabaseConnection() {
  unwrap(await getSupabase().from('blog_posts').select('id', { head: true, count: 'exact' }).limit(1));
  return true;
}

module.exports = { checkSupabaseConnection, getSupabase, unwrap };
