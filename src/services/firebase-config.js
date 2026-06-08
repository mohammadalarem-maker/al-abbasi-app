// firebase-config.js — Al-Abbasi Supermarket
// Firebase Modular SDK v9+

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator
} from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

// 🔧 استبدل هذه القيم بإعدادات مشروع Firebase الخاص بك
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);

// Firestore مع دعم العمل بدون إنترنت
export const db = getFirestore(app);

// تفعيل التخزين المحلي Offline Persistence
enableIndexedDbPersistence(db, { forceOwnership: false })
  .then(() => console.log('✅ Offline persistence enabled'))
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open — offline persistence limited to one tab');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Browser does not support offline persistence');
    }
  });

// Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Storage
export const storage = getStorage(app);

// Messaging (Push Notifications)
export let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn('Firebase Messaging not supported in this environment');
}

export default app;
