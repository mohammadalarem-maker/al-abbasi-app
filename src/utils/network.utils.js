// network.utils.js — أدوات الشبكة والعمل بدون إنترنت
import { Network } from '@capacitor/network';

class NetworkUtils {
  constructor() {
    this._status = true;
    this._listeners = [];
    this._init();
  }

  async _init() {
    const status = await Network.getStatus();
    this._status = status.connected;
    Network.addListener('networkStatusChange', (s) => {
      const wasOnline = this._status;
      this._status = s.connected;
      this._listeners.forEach(fn => fn(s.connected, wasOnline));
      this._showBanner(s.connected);
    });
  }

  get isOnline() { return this._status; }

  onChange(callback) {
    this._listeners.push(callback);
    return () => { this._listeners = this._listeners.filter(l => l !== callback); };
  }

  _showBanner(online) {
    let banner = document.getElementById('_network-banner');
    if (!online) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = '_network-banner';
        banner.style.cssText = `
          position:fixed;top:0;left:0;right:0;z-index:99999;
          background:linear-gradient(135deg,#ff4d6a,#cc2a43);
          color:#fff;text-align:center;
          padding:8px 16px;font-family:var(--ff-ar);
          font-size:12px;font-weight:700;
          box-shadow:0 2px 12px rgba(0,0,0,0.4);
          animation:fadein 0.3s ease;
        `;
        banner.textContent = '⚠️ لا يوجد اتصال بالإنترنت — بعض الميزات غير متاحة';
        document.body.prepend(banner);
      }
    } else {
      if (banner) {
        banner.style.background = 'linear-gradient(135deg,#00c48c,#009e71)';
        banner.textContent = '✅ عاد الاتصال بالإنترنت — جاري المزامنة...';
        setTimeout(() => banner?.remove(), 3000);
      }
    }
  }

  // Retry wrapper: إعادة المحاولة عند عودة الإنترنت
  async withRetry(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (e) {
        if (i === maxRetries - 1) throw e;
        if (!this._status) {
          // Wait for online
          await new Promise(resolve => {
            const unsub = this.onChange((online) => {
              if (online) { unsub(); resolve(); }
            });
          });
        } else {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }
  }
}

export const networkUtils = new NetworkUtils();
export default networkUtils;
