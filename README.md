# In4rtech website

An Express site and API. Contact submissions, blog posts, admin sessions and shared request limits are stored in Supabase (Postgres). The Supabase service-role key is used only by the backend.

## Configure Supabase

1. Create a Supabase project, or use an existing one.
2. Open the project's **SQL Editor**, paste the contents of `supabase/schema.sql` and run it. It creates the `contacts`, `blog_posts`, `admin_sessions` and `request_limits` tables and the `consume_rate_limit` function, and is safe to re-run.
3. Copy `.env.example` to `.env`. From **Project Settings → API**, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (the service-role or secret key). Also set `SESSION_SECRET`.

Row level security is enabled on every table with no policies, so the public anon key cannot read or change data; only the server's service-role key can.

Run `npm start` and open <http://localhost:5000>. <http://localhost:5000/api/health> should report `"connection": "connected"`.

## Configure admin sign-in

1. In `.env`, set `ADMIN_USERNAME` to a username you choose.
2. In a terminal at the project folder, run `npm run admin:password`. Enter a password with at least 12 characters twice. The helper hides your typing and prints a bcrypt hash.
3. Copy the printed hash into `.env` as the value for `ADMIN_PASSWORD_HASH` (replace the whole placeholder value). Keep the hash private.
4. Restart the server with `npm start`, then open <http://localhost:5000/admin.html> and sign in with your username and password.

The helper does not save or print the plain password. The admin area lists contact submissions and has a **Blog posts** tab for writing, previewing, publishing, editing and deleting articles, which appear at `/blog.html`.

Contact submissions are limited to 5 per IP per hour and admin sign-in to 10 attempts per 15 minutes. Limits are shared through the `request_limits` table; expired limits and sessions are cleaned up automatically.

## Contact emails

Set `RESEND_API_KEY`, `CONTACT_TO` and `CONTACT_FROM` to email each new enquiry through [Resend](https://resend.com). `CONTACT_FROM` must use a domain verified in Resend. Without these, enquiries are still saved and visible in the admin area.

## Deploy

The root `index.js` exports the Express app for Vercel, and `npm run vercel-build` prepares the frontend assets.

For Vercel, configure `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH`, plus the Resend settings if used. The Vercel Supabase integration adds `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically. Never commit `.env`.
