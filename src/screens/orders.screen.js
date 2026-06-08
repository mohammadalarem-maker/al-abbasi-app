// orders.screen.js — شاشة الطلبات للعميل
import { db } from '../services/firebase-config.js';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const STATUS_MAP = {
  pending:    { label: 'قيد الانتظار', icon: '⏳', color: '#ffa500', bg: 'rgba(255,165,0,0.12)' },
  processing: { label: 'قيد التجهيز',  icon: '🔄', color: '#4a9eff', bg: 'rgba(74,158,255,0.12)' },
  completed:  { label: 'تم التسليم',   icon: '✅', color: '#00c48c', bg: 'rgba(0,196,140,0.12)' },
  cancelled:  { label: 'ملغي',         icon: '❌', color: '#ff4d6a', bg: 'rgba(255,77,106,0.12)' },
};

export class OrdersScreen {
  constructor(container, userId) {
    this.container = container;
    this.userId = userId;
    this.orders = [];
    this.unsubscribe = null;
    this.activeFilter = 'all';
    this.render();
    this.watchOrders();
  }

  render() {
    this.container.innerHTML = `
      <!-- Header -->
      <div style="padding:14px 16px;background:var(--c-surface);border-bottom:1px solid var(--c-border);">
        <div style="font-size:17px;font-weight:900;">📦 طلباتي</div>
      </div>

      <!-- Filter tabs -->
      <div style="display:flex;gap:0;background:var(--c-surface);border-bottom:1px solid var(--c-border);overflow-x:auto;">
        ${[
          { id:'all', label:'الكل' },
          { id:'pending', label:'قيد الانتظار' },
          { id:'processing', label:'قيد التجهيز' },
          { id:'completed', label:'مكتملة' },
          { id:'cancelled', label:'ملغية' },
        ].map(f => `
          <button id="of-${f.id}" onclick="window._ordersScreen.setFilter('${f.id}')"
            style="flex-shrink:0;padding:11px 14px;font-family:var(--ff-ar);font-size:12px;font-weight:600;
            border:none;background:transparent;cursor:pointer;white-space:nowrap;
            color:${f.id === 'all' ? 'var(--c-gold)' : 'var(--c-muted)'};
            border-bottom:${f.id === 'all' ? '2px solid var(--c-gold)' : '2px solid transparent'};
            transition:all 0.2s;">
            ${f.label}
          </button>
        `).join('')}
      </div>

      <!-- Orders list -->
      <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px;">
        <div id="orders-list">
          ${this._skeletons(3)}
        </div>
      </div>
    `;
    window._ordersScreen = this;
  }

  _skeletons(n) {
    return Array(n).fill(0).map(() => `
      <div style="background:var(--c-card);border-radius:var(--r-lg);padding:14px;margin-bottom:12px;border:1px solid var(--c-border);">
        <div class="skeleton" style="height:14px;width:40%;margin-bottom:8px;"></div>
        <div class="skeleton" style="height:11px;width:65%;margin-bottom:8px;"></div>
        <div class="skeleton" style="height:28px;margin-top:10px;"></div>
      </div>
    `).join('');
  }

  watchOrders() {
    if (!this.userId) { this._renderEmpty(); return; }
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', this.userId),
      orderBy('createdAt', 'desc')
    );
    this.unsubscribe = onSnapshot(q, (snap) => {
      this.orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderList();
    }, () => this._renderEmpty());
  }

  setFilter(filter) {
    this.activeFilter = filter;
    document.querySelectorAll('[id^="of-"]').forEach(btn => {
      const isActive = btn.id === `of-${filter}`;
      btn.style.color = isActive ? 'var(--c-gold)' : 'var(--c-muted)';
      btn.style.borderBottom = isActive ? '2px solid var(--c-gold)' : '2px solid transparent';
    });
    this.renderList();
  }

  renderList() {
    const list = document.getElementById('orders-list');
    if (!list) return;

    const filtered = this.activeFilter === 'all'
      ? this.orders
      : this.orders.filter(o => o.status === this.activeFilter);

    if (!filtered.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:48px 20px;color:var(--c-muted);">
          <div style="font-size:52px;margin-bottom:14px;">📭</div>
          <div style="font-size:15px;font-weight:600;">لا توجد طلبات هنا</div>
          <div style="font-size:12px;margin-top:6px;">ابدأ التسوق الآن!</div>
        </div>`;
      return;
    }

    list.innerHTML = filtered.map(order => this._renderOrderCard(order)).join('');
  }

  _renderOrderCard(order) {
    const s = STATUS_MAP[order.status] || STATUS_MAP.pending;
    const date = order.createdAt?.toDate?.()
      ? order.createdAt.toDate().toLocaleDateString('ar-IQ', { year:'numeric', month:'short', day:'numeric' })
      : 'غير محدد';
    const itemsPreview = (order.items || []).slice(0, 3).map(i => i.name).join(' • ');
    const moreItems = (order.items || []).length > 3 ? ` +${order.items.length - 3}` : '';

    return `
      <div style="background:var(--c-card);border:1px solid var(--c-border);border-radius:var(--r-lg);padding:14px;margin-bottom:12px;box-shadow:0 4px 16px rgba(0,0,0,0.2);">
        <!-- Order header -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
          <div>
            <div style="font-size:13px;font-weight:700;">طلب #${order.id.slice(-6).toUpperCase()}</div>
            <div style="font-size:11px;color:var(--c-muted);margin-top:2px;">${date}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
            <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;background:${s.bg};color:${s.color};">
              ${s.icon} ${s.label}
            </span>
            <span style="font-size:12px;color:var(--c-muted);">
              ${order.paymentMethod === 'call' ? '📞 اتصال' : '💳 إلكتروني'}
            </span>
          </div>
        </div>

        <!-- Items preview -->
        <div style="font-size:11px;color:var(--c-muted);margin-bottom:10px;padding:8px 10px;background:var(--c-surface);border-radius:var(--r-md);">
          ${itemsPreview}${moreItems}
        </div>

        <!-- Total & actions -->
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:11px;color:var(--c-muted);">الإجمالي</div>
            <div style="font-size:17px;font-weight:900;color:var(--c-gold);">${(order.total || 0).toLocaleString('ar')} د.ع</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="window._ordersScreen.viewDetails('${order.id}')"
              style="padding:8px 14px;background:var(--c-surface);border:1px solid var(--c-border);border-radius:10px;font-family:var(--ff-ar);font-size:12px;font-weight:600;cursor:pointer;color:var(--c-text);">
              التفاصيل
            </button>
            ${order.status === 'completed' ? `
              <button onclick="window._ordersScreen.reorder('${order.id}')"
                style="padding:8px 14px;background:linear-gradient(135deg,#f5a623,#c4831a);border:none;border-radius:10px;font-family:var(--ff-ar);font-size:12px;font-weight:700;cursor:pointer;color:#fff;">
                🔄 إعادة الطلب
              </button>
            ` : ''}
            ${order.status === 'pending' ? `
              <button onclick="window._ordersScreen.cancelOrder('${order.id}')"
                style="padding:8px 14px;background:rgba(255,77,106,0.1);border:1px solid var(--c-red);border-radius:10px;font-family:var(--ff-ar);font-size:12px;font-weight:700;cursor:pointer;color:var(--c-red);">
                إلغاء
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Progress steps -->
        ${order.status !== 'cancelled' ? this._renderProgressBar(order.status) : ''}
      </div>
    `;
  }

  _renderProgressBar(status) {
    const steps = ['pending', 'processing', 'completed'];
    const idx = steps.indexOf(status);
    const labels = ['استلام الطلب', 'قيد التجهيز', 'تم التسليم'];
    return `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--c-border);">
        <div style="display:flex;align-items:center;justify-content:space-between;position:relative;">
          ${steps.map((s, i) => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;position:relative;">
              <div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;
                background:${i <= idx ? 'var(--c-gold)' : 'var(--c-border)'};
                color:${i <= idx ? '#fff' : 'var(--c-muted)'};">
                ${i < idx ? '✓' : i + 1}
              </div>
              <div style="font-size:9px;color:${i <= idx ? 'var(--c-gold)' : 'var(--c-muted)'};text-align:center;">${labels[i]}</div>
              ${i < steps.length - 1 ? `
                <div style="position:absolute;top:12px;right:-50%;width:100%;height:2px;background:${i < idx ? 'var(--c-gold)' : 'var(--c-border)'};z-index:-1;"></div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  viewDetails(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;
    const s = STATUS_MAP[order.status] || STATUS_MAP.pending;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `
      <div style="background:var(--c-surface);border-radius:22px;width:100%;max-height:80%;overflow-y:auto;border:1px solid var(--c-border);">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px 12px;border-bottom:1px solid var(--c-border);position:sticky;top:0;background:var(--c-surface);">
          <div style="font-size:15px;font-weight:700;">تفاصيل الطلب #${order.id.slice(-6).toUpperCase()}</div>
          <button onclick="this.closest('.modal-overlay').remove()" style="width:30px;height:30px;background:var(--c-card);border-radius:50%;display:flex;align-items:center;justify-content:center;border:none;color:var(--c-muted);font-size:16px;cursor:pointer;">✕</button>
        </div>
        <div style="padding:16px 18px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
            <span style="font-size:12px;color:var(--c-muted);">الحالة</span>
            <span style="font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;background:${s.bg};color:${s.color};">${s.icon} ${s.label}</span>
          </div>
          <div style="font-size:12px;font-weight:700;color:var(--c-muted);margin-bottom:8px;">المنتجات</div>
          ${(order.items || []).map(item => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--c-border);">
              <div>
                <div style="font-size:13px;font-weight:600;">${item.name}</div>
                <div style="font-size:11px;color:var(--c-muted);">×${item.qty} × ${(item.price || 0).toLocaleString('ar')} د.ع</div>
              </div>
              <div style="font-size:13px;font-weight:700;color:var(--c-gold);">${(item.price * item.qty).toLocaleString('ar')} د.ع</div>
            </div>
          `).join('')}
          <div style="display:flex;justify-content:space-between;padding-top:12px;font-size:15px;font-weight:700;">
            <span>الإجمالي</span>
            <span style="color:var(--c-gold);">${(order.total || 0).toLocaleString('ar')} د.ع</span>
          </div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  async reorder(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order || !window._customerScreen) return;
    order.items?.forEach(item => {
      window._customerScreen.cart.push({ ...item, qty: item.qty });
    });
    window._customerScreen.updateCartBadge();
    alert('✅ تم إضافة منتجات الطلب السابق إلى سلتك!');
  }

  async cancelOrder(orderId) {
    if (!confirm('هل تريد إلغاء هذا الطلب؟')) return;
    const { updateOrderStatus } = await import('../services/store.service.js');
    await updateOrderStatus(orderId, 'cancelled');
  }

  _renderEmpty() {
    const list = document.getElementById('orders-list');
    if (list) list.innerHTML = `
      <div style="text-align:center;padding:48px 20px;color:var(--c-muted);">
        <div style="font-size:52px;margin-bottom:14px;">📭</div>
        <div style="font-size:15px;font-weight:600;">لا توجد طلبات بعد</div>
        <div style="font-size:12px;margin-top:6px;">ابدأ التسوق الآن!</div>
      </div>`;
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
    delete window._ordersScreen;
  }
}

export default OrdersScreen;
