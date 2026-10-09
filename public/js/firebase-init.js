import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDIlrGf1s723boT3UwIQSNhOqk31UPELyA',
  authDomain: 'in4rtech-f4510.firebaseapp.com',
  projectId: 'in4rtech-f4510',
  storageBucket: 'in4rtech-f4510.firebasestorage.app',
  messagingSenderId: '490427886040',
  appId: '1:490427886040:web:9e1b9224cdc534339e2aad',
  measurementId: 'G-0JVQP936LC'
};

const app = initializeApp(firebaseConfig);
window.in4techFirebaseApp = app;

isSupported()
  .then((supported) => {
    if (!supported) return;
    const analytics = getAnalytics(app);
    window.in4techAnalytics = analytics;
  })
  .catch(() => {
    // Analytics may be unavailable in private browsing or restricted environments.
  });
