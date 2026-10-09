const fs = require('fs');
const os = require('os');
const path = require('path');
const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

function getRealtimeDatabase() {
  const existing = getApps().find((app) => app.name === 'in4tech-realtime-database');
  if (existing) return getDatabase(existing);

  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (_) {
      const error = new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.');
      error.code = 'FIREBASE_CREDENTIALS_INVALID';
      throw error;
    }
  }

  const projectId = process.env.FIREBASE_DATABASE_PROJECT_ID || 'in4rtech-c90a0';
  const databaseURL = process.env.FIREBASE_DATABASE_URL || 'https://in4rtech-c90a0-default-rtdb.asia-southeast1.firebasedatabase.app';
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath && !fs.existsSync(credentialsPath)) {
    const error = new Error('The configured Google credentials file does not exist.');
    error.code = 'FIREBASE_CREDENTIALS_MISSING';
    throw error;
  }
  const adcPath = process.platform === 'win32'
    ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'gcloud', 'application_default_credentials.json')
    : path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');
  const hasRuntimeCredentials = credentialsPath || fs.existsSync(adcPath) ||
    process.env.K_SERVICE || process.env.FUNCTION_TARGET || process.env.GAE_ENV;
  if (!serviceAccount && !hasRuntimeCredentials) {
    const error = new Error('No Firebase Admin credentials are configured.');
    error.code = 'FIREBASE_CREDENTIALS_MISSING';
    throw error;
  }

  const app = initializeApp({
    projectId,
    databaseURL,
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault()
  }, 'in4tech-realtime-database');
  return getDatabase(app);
}

async function checkRealtimeDatabaseConnection() {
  // Keep health probes away from /contacts, which contains personal information.
  await getRealtimeDatabase().ref('_health').limitToFirst(1).once('value');
}

function contactRecord(data) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone || null,
    company: data.company || null,
    subject: data.subject,
    service: data.service || null,
    message: data.message,
    createdAt: new Date().toISOString()
  };
}

function contactFromValue(id, value) {
  return {
    id,
    first_name: value.firstName || '',
    last_name: value.lastName || '',
    email: value.email || '',
    phone: value.phone || null,
    company: value.company || null,
    subject: value.subject || '',
    service: value.service || null,
    message: value.message || '',
    created_at: value.createdAt || null
  };
}

module.exports = { checkRealtimeDatabaseConnection, contactFromValue, contactRecord, getRealtimeDatabase };
