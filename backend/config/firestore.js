const fs = require('fs');
const os = require('os');
const path = require('path');
const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

function getFirestoreDb() {
  const existing = getApps().find((app) => app.name === 'in4tech-firestore');
  if (existing) return getFirestore(existing);

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

  const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount?.project_id;
  if (!projectId) {
    const error = new Error('FIREBASE_PROJECT_ID is not configured.');
    error.code = 'FIREBASE_NOT_CONFIGURED';
    throw error;
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath && !fs.existsSync(credentialsPath)) {
    const error = new Error('The configured Google credentials file does not exist.');
    error.code = 'FIREBASE_CREDENTIALS_MISSING';
    throw error;
  }
  const gcloudAdcPath = process.platform === 'win32'
    ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'gcloud', 'application_default_credentials.json')
    : path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');
  const hasRuntimeCredentials = credentialsPath || fs.existsSync(gcloudAdcPath) ||
    process.env.K_SERVICE || process.env.FUNCTION_TARGET || process.env.GAE_ENV;
  if (!serviceAccount && !hasRuntimeCredentials) {
    const error = new Error('No Firebase Admin credentials are configured.');
    error.code = 'FIREBASE_CREDENTIALS_MISSING';
    throw error;
  }

  const app = initializeApp({
    projectId,
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault()
  }, 'in4tech-firestore');
  return getFirestore(app);
}

async function checkFirestoreConnection() {
  // A metadata read verifies credentials, Firestore availability, and access without writing data.
  await getFirestoreDb().listCollections();
  return true;
}

function contactDocument(data) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone || null,
    company: data.company || null,
    subject: data.subject,
    service: data.service || null,
    message: data.message,
    createdAt: FieldValue.serverTimestamp()
  };
}

function contactFromSnapshot(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    first_name: data.firstName || '',
    last_name: data.lastName || '',
    email: data.email || '',
    phone: data.phone || null,
    company: data.company || null,
    subject: data.subject || '',
    service: data.service || null,
    message: data.message || '',
    created_at: data.createdAt?.toDate?.() || null
  };
}

module.exports = { checkFirestoreConnection, contactDocument, contactFromSnapshot, getFirestoreDb };
