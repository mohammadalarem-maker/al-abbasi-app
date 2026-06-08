// auth.service.js — خدمة المصادقة المزدوجة
import { auth, googleProvider, db } from './firebase-config.js';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Preferences } from '@capacitor/preferences';
import CryptoUtils from '../utils/crypto.utils.js';

// ==========================================
// 🔐 ADMIN / STAFF — Offline Authentication
// ==========================================

const ADMIN_KEY = 'admin_credentials';
const DEFAULT_ADMIN = { username: 'alsarem', password: '12345678' };

export async function initAdminCredentials() {
  const { value } = await Preferences.get({ key: ADMIN_KEY });
  if (!value) {
    const encrypted = CryptoUtils.encrypt(JSON.stringify(DEFAULT_ADMIN));
    await Preferences.set({ key: ADMIN_KEY, value: encrypted });
  }
}

export async function adminLogin(username, password) {
  try {
    const { value } = await Preferences.get({ key: ADMIN_KEY });
    if (!value) {
      await initAdminCredentials();
      return adminLogin(username, password);
    }
    const creds = JSON.parse(CryptoUtils.decrypt(value));
    if (creds.username === username && creds.password === password) {
      const adminSession = {
        uid: 'admin-local',
        role: 'admin',
        username,
        loginTime: Date.now()
      };
      await Preferences.set({ key: 'admin_session', value: JSON.stringify(adminSession) });
      return { success: true, user: adminSession };
    }
    return { success: false, error: 'بيانات الدخول غير صحيحة' };
  } catch (e) {
    return { success: false, error: 'حدث خطأ. تحقق من البيانات.' };
  }
}

export async function updateAdminCredentials(newUsername, newPassword, currentPassword) {
  const { value } = await Preferences.get({ key: ADMIN_KEY });
  const creds = JSON.parse(CryptoUtils.decrypt(value));
  if (creds.password !== currentPassword) {
    return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
  }
  const newCreds = { username: newUsername, password: newPassword };
  await Preferences.set({ key: ADMIN_KEY, value: CryptoUtils.encrypt(JSON.stringify(newCreds)) });
  return { success: true };
}

export async function getAdminSession() {
  const { value } = await Preferences.get({ key: 'admin_session' });
  if (!value) return null;
  const session = JSON.parse(value);
  // Session expires after 12 hours
  if (Date.now() - session.loginTime > 12 * 60 * 60 * 1000) {
    await Preferences.remove({ key: 'admin_session' });
    return null;
  }
  return session;
}

export async function adminLogout() {
  await Preferences.remove({ key: 'admin_session' });
}

// Staff login (stored in Firestore)
export async function staffLogin(username, password) {
  try {
    const staffRef = doc(db, 'staff', username);
    const staffDoc = await getDoc(staffRef);
    if (!staffDoc.exists()) return { success: false, error: 'الموظف غير موجود' };
    const staff = staffDoc.data();
    const hashedInput = CryptoUtils.hash(password);
    if (staff.passwordHash !== hashedInput) return { success: false, error: 'كلمة المرور غير صحيحة' };
    const session = {
      uid: staffDoc.id,
      role: staff.role,
      name: staff.name,
      loginTime: Date.now()
    };
    await Preferences.set({ key: 'admin_session', value: JSON.stringify(session) });
    return { success: true, user: session };
  } catch (e) {
    // Offline fallback
    return { success: false, error: 'تعذّر الاتصال. تحقق من الإنترنت.' };
  }
}

// ==========================================
// 👤 CUSTOMER — Firebase Google Auth
// ==========================================

export async function customerGoogleLogin() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    await syncCustomerProfile(user);
    return { success: true, user };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function customerEmailRegister(email, password, name) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await syncCustomerProfile(result.user, name);
    return { success: true, user: result.user };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function customerEmailLogin(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function syncCustomerProfile(user, displayName = null) {
  const userRef = doc(db, 'customers', user.uid);
  const existing = await getDoc(userRef);
  if (!existing.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: displayName || user.displayName || 'عميل جديد',
      email: user.email,
      photoURL: user.photoURL || null,
      loyaltyPoints: 0,
      totalOrders: 0,
      createdAt: serverTimestamp(),
      familyGroupId: null
    });
  }
}

export function onCustomerAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function customerLogout() {
  await signOut(auth);
}
