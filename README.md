# In4Tech website

The Express API stores contact submissions in Firebase Realtime Database and admin sessions and shared request limits in Cloud Firestore. Firebase credentials are used only by the backend.

## Configure Firebase

1. Enable Realtime Database in Firebase project `in4rtech-c90a0` in the Asia Southeast 1 region. Admin SDK writes use service account IAM permissions rather than client database rules.
2. Keep Cloud Firestore in project `in4rtech-f4510` for admin sessions.
3. Create a service account key with access to both projects and save it outside this repository. Never commit or share the private key.
4. Copy `.env.example` to `.env`, set `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `GOOGLE_APPLICATION_CREDENTIALS` to the service-account file path. Or use `FIREBASE_SERVICE_ACCOUNT_JSON` in hosting secrets. Set the Firestore project ID and Realtime Database project ID/URL as shown in `.env.example`.

Open <http://localhost:5000>. Contact submissions are stored at Realtime Database path `/contacts`; admin sessions remain in Firestore collection `sessions`. Check <http://localhost:5000/api/health>; both services should report `connected`.

## Configure admin sign-in

1. In `.env`, set `ADMIN_USERNAME` to a username you choose.
2. In a terminal at the project folder, run `npm run admin:password`. Enter a password with at least 12 characters twice. The helper hides your typing and prints a bcrypt hash.
3. Copy the printed hash into `.env` as the value for `ADMIN_PASSWORD_HASH` (replace the whole placeholder value). Keep the hash private.
4. Restart the server with `npm start`, then open <http://localhost:5000/admin.html> and sign in with your username and password.

The helper does not save or print the plain password. The admin inbox uses the backend session and lists contact submissions from Firebase Realtime Database.

The `sessions` collection stores an `expiresAt` timestamp. Firestore TTL cleanup is optional for sessions. The `requestLimits` collection uses `resetAt` timestamps; enable Firestore TTL on `requestLimits.resetAt` to automatically remove expired rate-limit records. Rate limits continue to work if TTL is not enabled, but expired records may remain in Firestore. Contact submissions are limited to 5 per IP per hour and admin sign-in to 10 attempts per 15 minutes; these limits are shared through Firestore.

## Deploy

The root `index.js` exports the Express app for Vercel, and `npm.cmd run vercel-build` prepares the frontend assets. A Vercel project ZIP must include the root `index.js`, `backend/`, `frontend/`, `public/`, `scripts/`, `package.json`, `package-lock.json`, and `vercel.json`.

For Vercel, configure `FIREBASE_PROJECT_ID=in4rtech-f4510`, `FIREBASE_DATABASE_PROJECT_ID=in4rtech-c90a0`, `FIREBASE_DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `SESSION_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD_HASH`. The service account needs access to both Firebase projects. Never include `.env` or a service-account file in the ZIP.
