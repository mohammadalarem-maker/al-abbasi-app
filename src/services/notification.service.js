// notification.service.js — خدمة الإشعارات اللحظية
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const NOTIF_TYPES = {
  new_order:     { icon: '🛒', title: 'طلب جديد!',        color: '#00c48c' },
  low_stock:     { icon: '⚠️', title: 'تحذير المخزون',    color: '#ffa500' },
  out_of_stock:  { icon: '❌', title: 'نفد المخزون!',      color: '#ff4d6a' },
  product_add:   { icon: '📦', title: 'منتج جديد',         color: '#4a9eff' },
  product_update:{ icon: '✏️', title: 'تحديث منتج',        color: '#4a9eff' },
  sale_complete: { icon: '✅', title: 'تم إتمام بيع',      color: '#00c48c' },
  shift_start:   { icon: '▶️', title: 'بدء الوردية',       color: '#f5a623' },
  shift_end:     { icon: '⏹', title: 'إنهاء الوردية',     color: '#f5a623' },
};

class NotificationService {
  constructor() {
    this._listeners = [];
    this._notifId = 1;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      // Request local notification permissions
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display === 'granted') {
        console.log('✅ Local notifications permission granted');
      }

      // Push notifications setup
      await PushNotifications.requestPermissions();
      await PushNotifications.register();

      PushNotifications.addListener('registration', token => {
        console.log('FCM Token:', token.value);
        this._saveFCMToken(token.value);
      });

      PushNotifications.addListener('pushNotificationReceived', notif => {
        this._dispatchToListeners({
          type: notif.data?.type || 'info',
          title: notif.title,
          message: notif.body,
          data: notif.data,
        });
      });

    } catch (e) {
      console.warn('Push notifications not available:', e.message);
    }
  }

  // ---- Dispatch in-app notification ----
  async send(type, message, data = {}) {
    const meta = NOTIF_TYPES[type] || { icon: 'ℹ️', title: 'إشعار', color: '#4a9eff' };

    const notif = {
      id: this._notifId++,
      type,
      icon: meta.icon,
      title: meta.title,
      message,
      data,
      timestamp: Date.now(),
    };

    // Haptic feedback
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {}

    // Local OS notification (Android tray)
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: notif.id,
          title: `${meta.icon} ${meta.title}`,
          body: message,
          channelId: 'al-abbasi-alerts',
          smallIcon: 'ic_stat_notify',
          iconColor: meta.color,
          extra: data,
        }]
      });
    } catch (e) {}

    // Save to Firestore for real-time sync across devices
    try {
      await addDoc(collection(db, 'notifications'), {
        type,
        message,
        data,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (e) {}

    // Notify all in-app listeners
    this._dispatchToListeners(notif);
    return notif;
  }

  // ---- Shorthand helpers ----
  async newOrder(orderId, total) {
    return this.send('new_order', `طلب #${orderId.slice(-6)} — ${total.toLocaleString('ar')} د.ع`, { orderId });
  }

  async lowStock(productName, stock, productId) {
    const type = stock === 0 ? 'out_of_stock' : 'low_stock';
    const msg = stock === 0
      ? `"${productName}" نفد من المخزون!`
      : `مخزون "${productName}" منخفض — ${stock} وحدات متبقية`;
    return this.send(type, msg, { productId, stock });
  }

  async saleComplete(orderId, total) {
    return this.send('sale_complete', `تم إتمام الطلب #${orderId.slice(-6)} — ${total.toLocaleString('ar')} د.ع`, { orderId });
  }

  async productAdded(name) {
    return this.send('product_add', `تمت إضافة منتج جديد: "${name}"`, { name });
  }

  // ---- Listener system (for in-app UI) ----
  onNotification(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(l => l !== callback);
    };
  }

  _dispatchToListeners(notif) {
    this._listeners.forEach(fn => {
      try { fn(notif); } catch (e) {}
    });
  }

  async _saveFCMToken(token) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key: 'fcm_token', value: token });
    } catch (e) {}
  }

  // ---- Create notification channel for Android ----
  async createChannel() {
    try {
      await LocalNotifications.createChannel({
        id: 'al-abbasi-alerts',
        name: 'تنبيهات العباسي',
        description: 'إشعارات المخزون والطلبات',
        importance: 4,
        visibility: 1,
        vibration: true,
        sound: 'default',
        lights: true,
        lightColor: '#f5a623',
      });
    } catch (e) {}
  }
}

export const notificationService = new NotificationService();
export default notificationService;
