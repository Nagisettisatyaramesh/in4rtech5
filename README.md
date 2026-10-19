# In4rtech website

An Express site and API. Contact submissions, blog posts, admin sessions and shared request limits are stored in PostgreSQL.

## Configure the database

1. Create a PostgreSQL database and a user that owns it, for example in `psql` as the `postgres` superuser:

   ```sql
   create user in4rtech_app with password 'choose-a-password';
   create database in4rtech_app_db owner in4rtech_app;
   ```

2. Copy `.env.example` to `.env` and set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD`. Also set `SESSION_SECRET`.
3. Run `npm start` and open <http://localhost:5000>. <http://localhost:5000/api/health> should report `"connection": "connected"`.

Tables are created automatically: on first database use the server applies any SQL files in `backend/db/migrations` that haven't run yet, in name order, and records them in `schema_migrations`. To add a change, create the next numbered file (for example `002_add_column.sql`). `npm run db:migrate` applies pending migrations without starting the server.

**Database over SSH.** If the database only listens on a remote server, set `SSH_ENABLED=true` with `SSH_HOST`, `SSH_PORT`, `SSH_USER` and `SSH_PASSWORD` (or `SSH_KEY_PATH` for a private key). The server opens a tunnel and connects to `DB_REMOTE_HOST:DB_REMOTE_PORT` as seen from that machine; `DB_HOST` and `DB_PORT` are then ignored.

**TLS.** `DB_SSLMODE` accepts `disable`, `prefer`, `require` or `verify-full`. Hosted databases usually need `require`; `prefer` connects without TLS.

## Configure admin sign-in

1. In `.env`, set `ADMIN_USERNAME` to a username you choose.
2. In a terminal at the project folder, run `npm run admin:password`. Enter a password with at least 12 characters twice. The helper hides your typing and prints a bcrypt hash.
3. Copy the printed hash into `.env` as the value for `ADMIN_PASSWORD_HASH` (replace the whole placeholder value). Keep the hash private.
4. Restart the server with `npm start`, then open <http://localhost:5000/admin.html> and sign in with your username and password.

The helper does not save or print the plain password. The admin area lists contact submissions and has a **Blog posts** tab for writing, previewing, publishing, editing and deleting articles, which appear at `/blog.html`.

Contact submissions are limited to 5 per IP per hour and admin sign-in to 10 attempts per 15 minutes. Limits are shared through the `request_limits` table; expired limits and sessions are cleaned up automatically.

## Contact emails

Each new enquiry is emailed to `CONTACT_TO` (comma-separate several addresses). Without email settings, enquiries are still saved and visible in the admin area.

- **Gmail SMTP:** set `EMAIL_USER` to the Gmail address and `EMAIL_PASS` to a Google [app password](https://myaccount.google.com/apppasswords) (needs 2-Step Verification). Emails are sent from `EMAIL_USER`, which is also copied on each one.
- **Resend:** alternatively set `RESEND_API_KEY` and `CONTACT_FROM` to email through [Resend](https://resend.com). `CONTACT_FROM` must use a domain verified in Resend. Gmail is used when both are set.

## Deploy

The root `index.js` exports the Express app for Vercel, and `npm run vercel-build` prepares the frontend assets.

For Vercel, configure `SESSION_SECRET`, the `DB_*` settings for a database reachable from the internet, `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH`, plus the email settings if used. Never commit `.env`.
