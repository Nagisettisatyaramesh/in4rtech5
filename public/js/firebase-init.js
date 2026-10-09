import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCFExaZK8I4so1k7G5fssEq06BzAtIxwPQ',
  authDomain: 'in4rtech-c90a0.firebaseapp.com',
  databaseURL: 'https://in4rtech-c90a0-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'in4rtech-c90a0',
  storageBucket: 'in4rtech-c90a0.firebasestorage.app',
  messagingSenderId: '213747703952',
  appId: '1:213747703952:web:cb607122fc3c8d693db815',
  measurementId: 'G-FEQN2Q09YE'
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
window.in4techFirebaseApp = app;
window.in4techRealtimeDatabase = database;

isSupported()
  .then((supported) => {
    if (!supported) return;
    const analytics = getAnalytics(app);
    window.in4techAnalytics = analytics;
  })
  .catch(() => {
    // Analytics may be unavailable in private browsing or restricted environments.
  });
