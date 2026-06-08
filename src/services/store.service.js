// store.service.js — خدمات المنتجات والطلبات
import { db, storage } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, increment, writeBatch,
  arrayUnion, arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ==========================================
// 🛒 PRODUCTS
// ==========================================

export function watchProducts(callback) {
  const q = query(collection(db, 'products'), orderBy('category'), orderBy('name'));
  return onSnapshot(q, (snap) => {
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(products);
  });
}

export function watchCategory(category, callback) {
  const q = query(
    collection(db, 'products'),
    where('category', '==', category),
    orderBy('name')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function getProductByBarcode(barcode) {
  const q = query(collection(db, 'products'), where('barcode', '==', barcode), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function addProduct(product, imageFile = null) {
  let imageURL = product.imageURL || '';
  if (imageFile) {
    const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
    const snapshot = await uploadBytes(storageRef, imageFile);
    imageURL = await getDownloadURL(snapshot.ref);
  }
  return await addDoc(collection(db, 'products'), {
    ...product,
    imageURL,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateProduct(id, data, imageFile = null) {
  let imageURL = data.imageURL;
  if (imageFile) {
    const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
    const snapshot = await uploadBytes(storageRef, imageFile);
    imageURL = await getDownloadURL(snapshot.ref);
  }
  await updateDoc(doc(db, 'products', id), {
    ...data,
    imageURL: imageURL || data.imageURL,
    updatedAt: serverTimestamp()
  });
}

export async function updateStock(productId, delta) {
  await updateDoc(doc(db, 'products', productId), {
    stock: increment(delta),
    updatedAt: serverTimestamp()
  });
}

// ==========================================
// 🏷️ BANNERS / ADS
// ==========================================

export function watchBanners(callback) {
  const q = query(collection(db, 'banners'), where('active', '==', true), orderBy('order'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function uploadBanner(imageFile, title, link = '') {
  const storageRef = ref(storage, `banners/${Date.now()}_${imageFile.name}`);
  const snapshot = await uploadBytes(storageRef, imageFile);
  const imageURL = await getDownloadURL(snapshot.ref);
  const count = (await getDocs(collection(db, 'banners'))).size;
  return await addDoc(collection(db, 'banners'), {
    imageURL, title, link,
    active: true,
    order: count + 1,
    createdAt: serverTimestamp()
  });
}

// ==========================================
// 🛍️ CART & ORDERS
// ==========================================

export async function placeOrder(customerId, cartItems, paymentMethod, phone = '') {
  const total = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const batch = writeBatch(db);

  const orderRef = doc(collection(db, 'orders'));
  batch.set(orderRef, {
    customerId,
    items: cartItems,
    total,
    paymentMethod,
    phone,
    status: 'pending',
    createdAt: serverTimestamp()
  });

  // Deduct stock
  cartItems.forEach(item => {
    const productRef = doc(db, 'products', item.id);
    batch.update(productRef, { stock: increment(-item.qty) });
  });

  // Add loyalty points (1 point per 1000 IQD)
  const points = Math.floor(total / 1000);
  if (customerId && points > 0) {
    const customerRef = doc(db, 'customers', customerId);
    batch.update(customerRef, {
      loyaltyPoints: increment(points),
      totalOrders: increment(1)
    });
  }

  await batch.commit();
  return orderRef.id;
}

export function watchOrders(callback, statusFilter = null) {
  let q = statusFilter
    ? query(collection(db, 'orders'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'))
    : query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function updateOrderStatus(orderId, status) {
  await updateDoc(doc(db, 'orders', orderId), { status, updatedAt: serverTimestamp() });
}

// ==========================================
// 📋 RECIPES — التسوق بالوصفة
// ==========================================

export function watchRecipes(callback) {
  const q = query(collection(db, 'recipes'), orderBy('name'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ==========================================
// 👥 FAMILY GROUP
// ==========================================

export async function createFamilyGroup(creatorId) {
  const groupRef = await addDoc(collection(db, 'familyGroups'), {
    creatorId,
    members: [creatorId],
    sharedCart: [],
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'customers', creatorId), { familyGroupId: groupRef.id });
  return groupRef.id;
}

export async function joinFamilyGroup(groupId, userId) {
  await updateDoc(doc(db, 'familyGroups', groupId), {
    members: arrayUnion(userId)
  });
  await updateDoc(doc(db, 'customers', userId), { familyGroupId: groupId });
}

export function watchFamilyCart(groupId, callback) {
  return onSnapshot(doc(db, 'familyGroups', groupId), (snap) => {
    if (snap.exists()) callback(snap.data().sharedCart || []);
  });
}

// ==========================================
// 📊 REPORTS & SHIFTS
// ==========================================

export async function getSalesSummary(startDate, endDate) {
  const q = query(
    collection(db, 'orders'),
    where('createdAt', '>=', startDate),
    where('createdAt', '<=', endDate),
    where('status', '==', 'completed')
  );
  const snap = await getDocs(q);
  const orders = snap.docs.map(d => d.data());
  return {
    totalRevenue: orders.reduce((s, o) => s + o.total, 0),
    totalOrders: orders.length,
    orders
  };
}

export async function startShift(staffId) {
  return await addDoc(collection(db, 'shifts'), {
    staffId,
    startTime: serverTimestamp(),
    endTime: null,
    sales: 0,
    status: 'active'
  });
}

export async function endShift(shiftId, sales) {
  await updateDoc(doc(db, 'shifts', shiftId), {
    endTime: serverTimestamp(),
    sales,
    status: 'closed'
  });
}

// ==========================================
// 🔔 IN-APP NOTIFICATIONS
// ==========================================

export async function createNotification(type, message, data = {}) {
  await addDoc(collection(db, 'notifications'), {
    type, message, data,
    read: false,
    createdAt: serverTimestamp()
  });
}

export function watchNotifications(callback) {
  const q = query(
    collection(db, 'notifications'),
    where('read', '==', false),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
