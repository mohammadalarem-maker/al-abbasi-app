// admin.screen.js — لوحة تحكم الإدارة الكاملة
import {
  watchProducts, watchOrders, watchNotifications,
  addProduct, updateProduct, updateStock,
  updateOrderStatus, createNotification,
  uploadBanner, getSalesSummary,
  startShift, endShift
} from '../services/store.service.js';
import { adminLogout } from '../services/auth.service.js';

export class AdminScreen {
  constructor(container, user, onLogout) {
    this.container = container;
    this.user = user;
    this.onLogout = onLogout;
    this.products = [];
    this.orders = [];
    this.notifications = [];
    this.activeTab = 'dashboard';
    this.unsubscribers = [];
    this.currentShiftId = null;
    this.render();
    this.init();
  }

  render() {
    const tabs = [
      { id: 'dashboard', icon: '📊', label: 'الرئيسية' },
      { id: 'products', icon: '📦', label: 'المنتجات' },
      { id: 'orders', icon: '🛒', label: 'الطلبات' },
      { id: 'banners', icon: '🖼️', label: 'الإعلانات' },
      { id: 'staff', icon: '👥', label: 'الموظفين' },
      { id: 'reports', icon: '📈', label: 'التقارير' },
      { id: 'scanner', icon: '📷', label: 'الباركود' },
    ];

    this.container.innerHTML = `
      <!-- Admin Top Bar -->
      <div class="admin-topbar">
        <div>
          <div class="admin-topbar-title">⚙️ لوحة التحكم</div>
          <div style="font-size: 11px; color: var(--c-muted);">${this.user?.role === 'admin' ? '👑 مالك' : `👤 ${this.user?.role || 'موظف'}`} — ${this.user?.username || this.user?.name || ''}</div>
        </div>
        <div class="admin-topbar-actions">
          <div class="notif-btn" onclick="window._adminScreen.toggleNotifications()">
            🔔
            <div class="notif-badge hidden" id="notif-count">0</div>
          </div>
          <div class="notif-btn" onclick="window._adminScreen.logout()" style="background: rgba(255,77,106,0.1); border-color: var(--c-red);">
            🚪
          </div>
        </div>
      </div>

      <!-- Nav Tabs -->
      <div class="admin-nav-tabs">
        ${tabs.map(t => `
          <button class="admin-tab ${t.id === 'dashboard' ? 'active' : ''}"
            id="tab-${t.id}" onclick="window._adminScreen.switchTab('${t.id}')">
            ${t.icon} ${t.label}
          </button>
        `).join('')}
      </div>

      <!-- Content Area -->
      <div class="admin-content" id="admin-content">
        <!-- Loaded by switchTab -->
      </div>

      <!-- Notifications Panel -->
      <div id="notif-panel" class="modal-overlay hidden">
        <div class="modal" style="max-height: 70vh;">
          <div class="modal-header">
            <div class="modal-title">🔔 الإشعارات</div>
            <button class="cart-close" onclick="window._adminScreen.toggleNotifications()">✕</button>
          </div>
          <div class="modal-body" id="notif-list" style="padding: 0;">
          </div>
        </div>
      </div>

      <!-- Notification Toasts -->
      <div class="notif-toast-container" id="admin-toast-container"></div>
    `;

    window._adminScreen = this;
    this.renderDashboard();
  }

  async init() {
    // Real-time products
    const unsubProd = watchProducts((p) => {
      this.products = p;
      this.checkLowStock(p);
      if (this.activeTab === 'products') this.renderProductsList();
    });

    // Real-time orders
    const unsubOrders = watchOrders((o) => {
      const newOrders = o.filter(order => !this.orders.find(x => x.id === order.id));
      this.orders = o;
      newOrders.forEach(order => {
        this.showToast(`🛒 طلب جديد! #${order.id.slice(-6)} — ${(order.total||0).toLocaleString('ar')} د.ع`, 'success');
      });
      if (this.activeTab === 'orders') this.renderOrdersList();
      this.updateDashboardStats();
    });

    // Real-time notifications
    const unsubNotif = watchNotifications((notifs) => {
      this.notifications = notifs;
      const badge = document.getElementById('notif-count');
      if (badge) {
        badge.textContent = notifs.length;
        badge.classList.toggle('hidden', notifs.length === 0);
      }
      this.renderNotificationList();
    });

    this.unsubscribers.push(unsubProd, unsubOrders, unsubNotif);
  }

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.admin-tab').forEach(t => {
      t.classList.toggle('active', t.id === `tab-${tab}`);
    });
    const content = document.getElementById('admin-content');
    content.innerHTML = '';
    switch (tab) {
      case 'dashboard': this.renderDashboard(); break;
      case 'products': this.renderProductsList(); break;
      case 'orders': this.renderOrdersList(); break;
      case 'banners': this.renderBannersPanel(); break;
      case 'staff': this.renderStaffPanel(); break;
      case 'reports': this.renderReportsPanel(); break;
      case 'scanner': this.renderScannerPanel(); break;
    }
  }

  renderDashboard() {
    const content = document.getElementById('admin-content');
    const todayOrders = this.orders.filter(o => {
      const d = o.createdAt?.toDate?.() || new Date(o.createdAt?.seconds * 1000);
      return d && new Date().toDateString() === d.toDateString();
    });
    const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
    const pending = this.orders.filter(o => o.status === 'pending').length;
    const lowStock = this.products.filter(p => (p.stock || 0) <= 5 && (p.stock || 0) > 0).length;
    const outStock = this.products.filter(p => (p.stock || 0) === 0).length;

    content.innerHTML = `
      <!-- Shift Control -->
      <div class="admin-card" style="margin-bottom: 16px; background: linear-gradient(135deg, rgba(245,166,35,0.1), var(--c-card));">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="font-size: 13px; font-weight: 700;">🕒 إدارة الوردية</div>
            <div style="font-size: 11px; color: var(--c-muted);" id="shift-status-text">
              ${this.currentShiftId ? 'الوردية نشطة' : 'لا توجد وردية نشطة'}
            </div>
          </div>
          <button class="btn ${this.currentShiftId ? 'btn-red' : 'btn-green'}" 
            style="width: auto; padding: 10px 20px; font-size: 13px;"
            onclick="window._adminScreen.toggleShift()">
            ${this.currentShiftId ? '⏹ إنهاء الوردية' : '▶️ بدء الوردية'}
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-val">${todayRevenue.toLocaleString('ar')}</div>
          <div class="stat-label">مبيعات اليوم (د.ع)</div>
          <div class="stat-delta up">▲ ${todayOrders.length} طلب</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-val">${this.products.length}</div>
          <div class="stat-label">إجمالي المنتجات</div>
          <div class="stat-delta ${outStock > 0 ? 'down' : 'up'}">${outStock > 0 ? `▼ ${outStock} نفد` : '✓ مخزون سليم'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🛒</div>
          <div class="stat-val">${pending}</div>
          <div class="stat-label">طلبات قيد التنفيذ</div>
          <div class="stat-delta ${pending > 0 ? 'down' : 'up'}">${pending > 0 ? 'تحتاج مراجعة' : '✓ لا طلبات معلقة'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚠️</div>
          <div class="stat-val">${lowStock}</div>
          <div class="stat-label">مخزون منخفض</div>
          <div class="stat-delta down">${outStock} نفد كلياً</div>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="admin-section-title">🛒 آخر الطلبات</div>
      <div class="admin-card">
        ${this.orders.slice(0, 5).map(o => this.renderOrderRow(o)).join('') || 
          '<div style="color:var(--c-muted);text-align:center;padding:20px;font-size:13px;">لا توجد طلبات بعد</div>'}
      </div>

      <!-- Low Stock Alert -->
      ${lowStock > 0 ? `
        <div class="admin-section-title">⚠️ تنبيه المخزون</div>
        <div class="admin-card">
          ${this.products.filter(p => (p.stock || 0) <= 5).slice(0, 5).map(p => `
            <div class="product-list-item">
              <div class="product-list-thumb">${p.imageURL ? `<img src="${p.imageURL}" />` : '📦'}</div>
              <div class="product-list-info">
                <div class="product-list-name">${p.name}</div>
                <div class="product-list-meta">
                  <span class="${(p.stock||0) === 0 ? 'stock-badge stock-out' : 'stock-badge stock-low'}">
                    ${(p.stock||0) === 0 ? 'نفد' : `${p.stock} وحدة`}
                  </span>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="window._adminScreen.quickUpdateStock('${p.id}')">
                ➕ إضافة مخزون
              </button>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  renderOrderRow(order) {
    const statusMap = {
      pending: { label: 'معلّق', color: '#ffa500' },
      processing: { label: 'يُعالج', color: 'var(--c-blue)' },
      completed: { label: 'مكتمل', color: 'var(--c-green)' },
      cancelled: { label: 'ملغي', color: 'var(--c-red)' },
    };
    const s = statusMap[order.status] || statusMap.pending;
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--c-border);">
        <div>
          <div style="font-size:12px;font-weight:700;">#${order.id.slice(-6)}</div>
          <div style="font-size:11px;color:var(--c-muted);">${order.items?.length || 0} منتج</div>
        </div>
        <div style="font-size:13px;font-weight:900;color:var(--c-gold);">${(order.total||0).toLocaleString('ar')} د.ع</div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span style="font-size:10px;font-weight:700;color:${s.color};background:${s.color}22;padding:3px 8px;border-radius:var(--r-full);">${s.label}</span>
          ${order.status === 'pending' ? `
            <button class="btn btn-green btn-sm" style="width:auto;padding:4px 10px;font-size:11px;" onclick="window._adminScreen.processOrder('${order.id}')">
              قبول
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderProductsList() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-size:16px;font-weight:700;">📦 المنتجات (${this.products.length})</div>
        <button class="btn btn-gold btn-sm" style="width:auto;padding:10px 16px;" onclick="window._adminScreen.openAddProduct()">
          ➕ منتج جديد
        </button>
      </div>
      <div style="margin-bottom:12px;">
        <input type="search" class="form-input" placeholder="ابحث في المنتجات..."
          oninput="window._adminScreen.filterProducts(this.value)" />
      </div>
      <div class="admin-card" id="product-list-container">
        ${this.products.map(p => this.renderProductListItem(p)).join('') ||
          '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">لا توجد منتجات</div></div>'}
      </div>
    `;
  }

  renderProductListItem(p) {
    const stockClass = (p.stock||0) === 0 ? 'stock-out' : (p.stock||0) <= 5 ? 'stock-low' : 'stock-ok';
    const stockLabel = (p.stock||0) === 0 ? 'نفد' : `${p.stock} وحدة`;
    return `
      <div class="product-list-item" id="pitem-${p.id}">
        <div class="product-list-thumb">
          ${p.imageURL ? `<img src="${p.imageURL}" />` : '📦'}
        </div>
        <div class="product-list-info">
          <div class="product-list-name">${p.name}</div>
          <div class="product-list-meta">
            <span>${(p.price||0).toLocaleString('ar')} د.ع</span>
            <span class="stock-badge ${stockClass}">${stockLabel}</span>
            <span style="font-size:10px;">${p.category || ''}</span>
          </div>
        </div>
        <div class="product-list-actions">
          <button class="action-btn" title="تعديل" onclick="window._adminScreen.openEditProduct('${p.id}')">✏️</button>
          <button class="action-btn" title="مخزون" onclick="window._adminScreen.quickUpdateStock('${p.id}')">📦</button>
          <button class="action-btn" title="حذف" onclick="window._adminScreen.deleteProduct('${p.id}')" style="border-color:var(--c-red);">🗑️</button>
        </div>
      </div>
    `;
  }

  filterProducts(query) {
    const container = document.getElementById('product-list-container');
    if (!container) return;
    const q = query.toLowerCase();
    const filtered = q
      ? this.products.filter(p => p.name?.toLowerCase().includes(q) || p.barcode?.includes(q))
      : this.products;
    container.innerHTML = filtered.map(p => this.renderProductListItem(p)).join('') ||
      '<div class="empty-state"><div class="empty-state-text">لا توجد نتائج</div></div>';
  }

  openAddProduct() {
    this.openProductModal();
  }

  openEditProduct(id) {
    const product = this.products.find(p => p.id === id);
    this.openProductModal(product);
  }

  openProductModal(product = null) {
    const isEdit = !!product;
    const categories = ['fruits', 'vegetables', 'meat', 'dairy', 'bakery', 'beverages', 'snacks', 'household', 'hygiene', 'other'];
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${isEdit ? '✏️ تعديل منتج' : '➕ منتج جديد'}</div>
          <button class="cart-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">اسم المنتج *</label>
            <input type="text" class="form-input" id="pm-name" value="${product?.name || ''}" placeholder="اسم المنتج" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label class="form-label">السعر (د.ع) *</label>
              <input type="number" class="form-input" id="pm-price" value="${product?.price || ''}" placeholder="0" />
            </div>
            <div class="form-group">
              <label class="form-label">المخزون *</label>
              <input type="number" class="form-input" id="pm-stock" value="${product?.stock || ''}" placeholder="0" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label class="form-label">الوحدة</label>
              <input type="text" class="form-input" id="pm-unit" value="${product?.unit || ''}" placeholder="كيلو / علبة..." />
            </div>
            <div class="form-group">
              <label class="form-label">الباركود</label>
              <input type="text" class="form-input" id="pm-barcode" value="${product?.barcode || ''}" placeholder="6901234567890" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">القسم</label>
            <select class="form-input" id="pm-category">
              ${categories.map(c => `<option value="${c}" ${product?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">الوصف</label>
            <textarea class="form-input" id="pm-desc" rows="2" placeholder="وصف المنتج...">${product?.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">صورة المنتج</label>
            <input type="file" class="form-input" id="pm-image" accept="image/*" style="padding:8px;" />
            ${product?.imageURL ? `<img src="${product.imageURL}" style="margin-top:8px;width:80px;height:80px;object-fit:cover;border-radius:var(--r-md);" />` : ''}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" style="flex:1;" onclick="this.closest('.modal-overlay').remove()">إلغاء</button>
          <button class="btn btn-gold" style="flex:2;" id="pm-save">
            ${isEdit ? '💾 حفظ التعديلات' : '➕ إضافة المنتج'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('pm-save').addEventListener('click', async () => {
      const data = {
        name: document.getElementById('pm-name').value.trim(),
        price: parseFloat(document.getElementById('pm-price').value) || 0,
        stock: parseInt(document.getElementById('pm-stock').value) || 0,
        unit: document.getElementById('pm-unit').value.trim(),
        barcode: document.getElementById('pm-barcode').value.trim(),
        category: document.getElementById('pm-category').value,
        description: document.getElementById('pm-desc').value.trim(),
      };
      if (!data.name) return alert('الرجاء إدخال اسم المنتج');
      const imageFile = document.getElementById('pm-image').files[0] || null;
      try {
        if (isEdit) {
          await updateProduct(product.id, data, imageFile);
          this.showToast('✅ تم تحديث المنتج', 'success');
          await createNotification('product_update', `تم تحديث المنتج: ${data.name}`);
        } else {
          await addProduct(data, imageFile);
          this.showToast('✅ تم إضافة المنتج بنجاح', 'success');
          await createNotification('product_add', `تم إضافة منتج جديد: ${data.name}`);
        }
        overlay.remove();
      } catch (e) {
        alert('حدث خطأ: ' + e.message);
      }
    });
  }

  async quickUpdateStock(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    const qty = prompt(`إضافة مخزون لـ "${product.name}"\nالمخزون الحالي: ${product.stock || 0}\n\nأدخل الكمية المضافة:`);
    if (!qty || isNaN(qty)) return;
    await updateStock(productId, parseInt(qty));
    this.showToast(`✅ تم تحديث مخزون ${product.name}`, 'success');
    if ((product.stock || 0) + parseInt(qty) <= 5) {
      await createNotification('low_stock', `⚠️ مخزون منخفض: ${product.name} (${(product.stock||0)+parseInt(qty)} وحدة)`, { productId });
    }
  }

  async deleteProduct(id) {
    const product = this.products.find(p => p.id === id);
    if (!confirm(`هل تريد حذف "${product?.name}"؟`)) return;
    const { deleteDoc, doc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase-config.js');
    await deleteDoc(doc(db, 'products', id));
    this.showToast('🗑️ تم حذف المنتج', 'alert');
  }

  renderOrdersList() {
    const content = document.getElementById('admin-content');
    const statusFilters = ['all', 'pending', 'processing', 'completed', 'cancelled'];
    content.innerHTML = `
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:12px;margin-bottom:12px;">
        ${statusFilters.map(s => `
          <button class="btn btn-ghost btn-sm" style="white-space:nowrap;width:auto;padding:8px 14px;"
            onclick="window._adminScreen.filterOrders('${s}', this)">
            ${s === 'all' ? 'الكل' : s === 'pending' ? 'معلّق' : s === 'processing' ? 'يُعالج' : s === 'completed' ? 'مكتمل' : 'ملغي'}
          </button>
        `).join('')}
      </div>
      <div id="orders-list">
        ${this.orders.map(o => this.renderOrderCard(o)).join('') ||
          '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">لا توجد طلبات</div></div>'}
      </div>
    `;
  }

  renderOrderCard(order) {
    const statusMap = { pending: 'معلّق', processing: 'يُعالج', completed: 'مكتمل', cancelled: 'ملغي' };
    return `
      <div class="admin-card" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div>
            <div style="font-size:14px;font-weight:700;">طلب #${order.id.slice(-6)}</div>
            <div style="font-size:11px;color:var(--c-muted);">${order.paymentMethod === 'call' ? '📞 اتصال' : '💳 إلكتروني'}</div>
          </div>
          <div style="font-size:18px;font-weight:900;color:var(--c-gold);">${(order.total||0).toLocaleString('ar')} د.ع</div>
        </div>
        <div style="font-size:12px;color:var(--c-muted);margin-bottom:10px;">
          ${(order.items||[]).map(i => `${i.name} × ${i.qty}`).join(' • ')}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${order.status === 'pending' ? `
            <button class="btn btn-green btn-sm" style="width:auto;" onclick="window._adminScreen.processOrder('${order.id}')">✅ قبول</button>
            <button class="btn btn-red btn-sm" style="width:auto;" onclick="window._adminScreen.cancelOrder('${order.id}')">❌ رفض</button>
          ` : ''}
          ${order.status === 'processing' ? `
            <button class="btn btn-gold btn-sm" style="width:auto;" onclick="window._adminScreen.completeOrder('${order.id}')">✓ إتمام</button>
          ` : ''}
          <button class="btn btn-ghost btn-sm" style="width:auto;" onclick="window._adminScreen.printInvoice('${order.id}')">🖨️ طباعة</button>
        </div>
      </div>
    `;
  }

  async processOrder(id) {
    await updateOrderStatus(id, 'processing');
    this.showToast('✅ تم قبول الطلب', 'success');
  }
  async cancelOrder(id) {
    await updateOrderStatus(id, 'cancelled');
    this.showToast('❌ تم إلغاء الطلب', 'alert');
  }
  async completeOrder(id) {
    await updateOrderStatus(id, 'completed');
    this.showToast('✅ تم إتمام الطلب', 'success');
  }

  filterOrders(status, btn) {
    document.querySelectorAll('#orders-list').forEach(el => {});
    const list = document.getElementById('orders-list');
    const filtered = status === 'all' ? this.orders : this.orders.filter(o => o.status === status);
    list.innerHTML = filtered.map(o => this.renderOrderCard(o)).join('') ||
      '<div class="empty-state"><div class="empty-state-text">لا توجد طلبات في هذا القسم</div></div>';
  }

  renderBannersPanel() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="admin-section-title">🖼️ رفع إعلان / لافتة جديدة</div>
      <div class="admin-card">
        <div class="form-group">
          <label class="form-label">عنوان الإعلان</label>
          <input type="text" class="form-input" id="b-title" placeholder="عروض الأسبوع..." />
        </div>
        <div class="form-group">
          <label class="form-label">صورة الإعلان *</label>
          <input type="file" class="form-input" id="b-image" accept="image/*" style="padding:8px;" />
        </div>
        <button class="btn btn-gold" onclick="window._adminScreen.uploadBannerHandler()">
          ⬆️ رفع الإعلان
        </button>
      </div>
      <div class="admin-section-title">الإعلانات الحالية</div>
      <div id="banners-list" class="admin-card">
        <div style="color:var(--c-muted);font-size:13px;text-align:center;padding:20px;">جاري التحميل...</div>
      </div>
    `;
    this.loadBannersList();
  }

  async loadBannersList() {
    const { watchBanners } = await import('../services/store.service.js');
    watchBanners((banners) => {
      const list = document.getElementById('banners-list');
      if (!list) return;
      list.innerHTML = banners.map(b => `
        <div class="product-list-item">
          <div class="product-list-thumb" style="width:60px;height:40px;border-radius:var(--r-sm);">
            <img src="${b.imageURL}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--r-sm);" />
          </div>
          <div class="product-list-info">
            <div class="product-list-name">${b.title}</div>
            <div class="product-list-meta">
              <span class="${b.active ? 'stock-badge stock-ok' : 'stock-badge stock-out'}">${b.active ? 'نشط' : 'مخفي'}</span>
            </div>
          </div>
          <button class="action-btn" onclick="window._adminScreen.toggleBanner('${b.id}', ${!b.active})">
            ${b.active ? '👁️' : '🙈'}
          </button>
        </div>
      `).join('') || '<div style="text-align:center;color:var(--c-muted);padding:20px;">لا توجد إعلانات</div>';
    });
  }

  async uploadBannerHandler() {
    const title = document.getElementById('b-title').value.trim() || 'إعلان العباسي';
    const imageFile = document.getElementById('b-image').files[0];
    if (!imageFile) return alert('الرجاء اختيار صورة');
    try {
      await uploadBanner(imageFile, title);
      this.showToast('✅ تم رفع الإعلان بنجاح', 'success');
      document.getElementById('b-title').value = '';
      document.getElementById('b-image').value = '';
    } catch (e) {
      alert('حدث خطأ: ' + e.message);
    }
  }

  async toggleBanner(id, active) {
    const { updateDoc, doc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase-config.js');
    await updateDoc(doc(db, 'banners', id), { active });
    this.showToast(active ? '👁️ تم تفعيل الإعلان' : '🙈 تم إخفاء الإعلان', 'info');
  }

  renderStaffPanel() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="admin-section-title">👥 إدارة الموظفين والصلاحيات</div>
      <button class="btn btn-gold" style="margin-bottom:16px;" onclick="window._adminScreen.openAddStaff()">
        ➕ إضافة موظف
      </button>
      <div class="admin-card" id="staff-list">
        <div style="color:var(--c-muted);font-size:13px;text-align:center;padding:20px;">جاري التحميل...</div>
      </div>
    `;
    this.loadStaffList();
  }

  async loadStaffList() {
    const { getDocs, collection } = await import('firebase/firestore');
    const { db } = await import('../services/firebase-config.js');
    const snap = await getDocs(collection(db, 'staff'));
    const staff = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const list = document.getElementById('staff-list');
    if (!list) return;
    const roleLabels = { cashier: 'كاشير', inventory: 'جرد مخزون', manager: 'مدير', admin: 'مالك' };
    list.innerHTML = staff.map(s => `
      <div class="product-list-item">
        <div class="product-list-thumb" style="font-size:22px;">👤</div>
        <div class="product-list-info">
          <div class="product-list-name">${s.name} (@${s.id})</div>
          <div class="product-list-meta">
            <span class="stock-badge stock-ok">${roleLabels[s.role] || s.role}</span>
          </div>
        </div>
        <button class="action-btn" onclick="window._adminScreen.deleteStaff('${s.id}')">🗑️</button>
      </div>
    `).join('') || '<div style="text-align:center;color:var(--c-muted);padding:20px;">لا يوجد موظفون</div>';
  }

  openAddStaff() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">➕ إضافة موظف</div>
          <button class="cart-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">الاسم</label>
            <input type="text" class="form-input" id="s-name" placeholder="اسم الموظف" /></div>
          <div class="form-group"><label class="form-label">اسم المستخدم</label>
            <input type="text" class="form-input" id="s-username" placeholder="username" /></div>
          <div class="form-group"><label class="form-label">كلمة المرور</label>
            <input type="password" class="form-input" id="s-pass" placeholder="••••••••" /></div>
          <div class="form-group"><label class="form-label">الصلاحية</label>
            <select class="form-input" id="s-role">
              <option value="cashier">كاشير</option>
              <option value="inventory">جرد مخزون</option>
              <option value="manager">مدير</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">إلغاء</button>
          <button class="btn btn-gold" id="s-save">➕ إضافة</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('s-save').addEventListener('click', async () => {
      const CryptoUtils = (await import('../utils/crypto.utils.js')).default;
      const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../services/firebase-config.js');
      const name = document.getElementById('s-name').value.trim();
      const username = document.getElementById('s-username').value.trim();
      const pass = document.getElementById('s-pass').value;
      const role = document.getElementById('s-role').value;
      if (!name || !username || !pass) return alert('الرجاء إكمال جميع الحقول');
      await setDoc(doc(db, 'staff', username), {
        name, role,
        passwordHash: CryptoUtils.hash(pass),
        createdAt: serverTimestamp()
      });
      this.showToast('✅ تم إضافة الموظف', 'success');
      overlay.remove();
      this.loadStaffList();
    });
  }

  async deleteStaff(id) {
    if (!confirm('هل تريد حذف هذا الموظف؟')) return;
    const { deleteDoc, doc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase-config.js');
    await deleteDoc(doc(db, 'staff', id));
    this.showToast('🗑️ تم حذف الموظف', 'alert');
    this.loadStaffList();
  }

  renderReportsPanel() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="admin-section-title">📈 تقارير المبيعات</div>
      <div class="admin-card" style="margin-bottom:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div class="form-group">
            <label class="form-label">من تاريخ</label>
            <input type="date" class="form-input" id="r-from" />
          </div>
          <div class="form-group">
            <label class="form-label">إلى تاريخ</label>
            <input type="date" class="form-input" id="r-to" />
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-gold btn-sm" style="width:auto;" onclick="window._adminScreen.generateReport()">
            📊 إنشاء تقرير
          </button>
          <button class="btn btn-green btn-sm" style="width:auto;" onclick="window._adminScreen.exportExcel()">
            📊 Excel
          </button>
          <button class="btn btn-ghost btn-sm" style="width:auto;" onclick="window._adminScreen.exportPDF()">
            📄 PDF
          </button>
        </div>
      </div>
      <div id="report-result"></div>
    `;
    // Set defaults
    const today = new Date();
    const fromDate = new Date(today); fromDate.setDate(1);
    document.getElementById('r-from').value = fromDate.toISOString().split('T')[0];
    document.getElementById('r-to').value = today.toISOString().split('T')[0];
  }

  async generateReport() {
    const from = new Date(document.getElementById('r-from').value);
    const to = new Date(document.getElementById('r-to').value);
    to.setHours(23, 59, 59);
    const { Timestamp } = await import('firebase/firestore');
    const summary = await getSalesSummary(Timestamp.fromDate(from), Timestamp.fromDate(to));
    const result = document.getElementById('report-result');
    result.innerHTML = `
      <div class="stats-grid" style="margin-bottom:16px;">
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-val">${summary.totalRevenue.toLocaleString('ar')}</div>
          <div class="stat-label">الإيرادات (د.ع)</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🛒</div>
          <div class="stat-val">${summary.totalOrders}</div>
          <div class="stat-label">إجمالي الطلبات</div>
        </div>
      </div>
      <div class="admin-card">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;">تفاصيل الطلبات</div>
        ${summary.orders.slice(0, 20).map(o => this.renderOrderRow(o)).join('') ||
          '<div style="text-align:center;color:var(--c-muted);">لا توجد طلبات في هذه الفترة</div>'}
      </div>
    `;
  }

  async exportExcel() {
    const XLSX = (await import('xlsx')).default;
    const data = this.orders.map(o => ({
      'رقم الطلب': o.id.slice(-6),
      'الإجمالي': o.total,
      'الحالة': o.status,
      'طريقة الدفع': o.paymentMethod,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المبيعات');
    XLSX.writeFile(wb, 'al-abbasi-report.xlsx');
  }

  async exportPDF() {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.text('تقرير مبيعات تطبيق العباسي', 14, 20);
    autoTable(pdf, {
      head: [['رقم الطلب', 'الإجمالي', 'الحالة']],
      body: this.orders.map(o => [o.id.slice(-6), `${o.total} د.ع`, o.status]),
      startY: 30,
    });
    pdf.save('al-abbasi-report.pdf');
  }

  renderScannerPanel() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="admin-section-title">📷 قارئ الباركود</div>
      <div class="admin-card">
        <div id="scanner-container" style="border-radius:var(--r-lg);overflow:hidden;"></div>
        <div id="scan-result" style="margin-top:12px;padding:12px;background:var(--c-surface);border-radius:var(--r-md);min-height:60px;"></div>
        <div style="display:flex;gap:10px;margin-top:12px;">
          <button class="btn btn-gold" id="start-scan">📷 بدء المسح</button>
          <button class="btn btn-ghost hidden" id="stop-scan">⏹ إيقاف</button>
        </div>
      </div>
    `;
    this.initScanner();
  }

  async initScanner() {
    const { Html5Qrcode } = await import('html5-qrcode');
    let scanner = null;
    document.getElementById('start-scan').addEventListener('click', async () => {
      scanner = new Html5Qrcode('scanner-container');
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          document.getElementById('scan-result').innerHTML =
            `<div style="color:var(--c-green);font-weight:700;">✅ كود: ${decodedText}</div>`;
          const { getProductByBarcode } = await import('../services/store.service.js');
          const product = await getProductByBarcode(decodedText);
          if (product) {
            document.getElementById('scan-result').innerHTML += `
              <div style="margin-top:8px;font-size:13px;">
                <div><strong>${product.name}</strong></div>
                <div>السعر: ${product.price} د.ع | المخزون: ${product.stock}</div>
              </div>
            `;
          } else {
            document.getElementById('scan-result').innerHTML += `
              <div style="margin-top:8px;font-size:13px;color:var(--c-red);">⚠️ المنتج غير موجود في قاعدة البيانات</div>
            `;
          }
        },
        (err) => {}
      );
      document.getElementById('start-scan').classList.add('hidden');
      document.getElementById('stop-scan').classList.remove('hidden');
    });
    document.getElementById('stop-scan').addEventListener('click', async () => {
      if (scanner) await scanner.stop();
      document.getElementById('start-scan').classList.remove('hidden');
      document.getElementById('stop-scan').classList.add('hidden');
    });
  }

  async toggleShift() {
    if (!this.currentShiftId) {
      const ref = await startShift(this.user?.uid || 'admin');
      this.currentShiftId = ref.id;
      this.showToast('▶️ تم بدء الوردية', 'success');
    } else {
      const todaySales = this.orders
        .filter(o => o.status === 'completed')
        .reduce((s, o) => s + (o.total || 0), 0);
      await endShift(this.currentShiftId, todaySales);
      this.currentShiftId = null;
      this.showToast('⏹ تم إنهاء الوردية', 'info');
    }
    this.renderDashboard();
  }

  checkLowStock(products) {
    const lowItems = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 3);
    const outItems = products.filter(p => (p.stock || 0) === 0);
    if (outItems.length > 0) {
      this.showToast(`⚠️ ${outItems.length} منتج نفد من المخزون!`, 'alert');
    }
  }

  updateDashboardStats() {
    if (this.activeTab === 'dashboard') this.renderDashboard();
  }

  toggleNotifications() {
    const panel = document.getElementById('notif-panel');
    panel.classList.toggle('hidden');
    panel.classList.toggle('open');
  }

  renderNotificationList() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    if (!this.notifications.length) {
      list.innerHTML = '<div class="empty-state" style="padding:24px;"><div class="empty-state-icon" style="font-size:36px;">🔔</div><div class="empty-state-text">لا توجد إشعارات جديدة</div></div>';
      return;
    }
    list.innerHTML = this.notifications.map(n => `
      <div style="padding:12px 20px;border-bottom:1px solid var(--c-border);display:flex;gap:12px;align-items:flex-start;"
        onclick="window._adminScreen.markRead('${n.id}')">
        <span style="font-size:20px;">${n.type === 'low_stock' ? '⚠️' : n.type.includes('order') ? '🛒' : '📢'}</span>
        <div>
          <div style="font-size:13px;font-weight:600;">${n.message}</div>
        </div>
      </div>
    `).join('');
  }

  async markRead(id) {
    const { updateDoc, doc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase-config.js');
    await updateDoc(doc(db, 'notifications', id), { read: true });
  }

  async printInvoice(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(`
      <html dir="rtl"><head><title>فاتورة</title>
      <style>body{font-family:Arial;padding:20px;direction:rtl;} h2{color:#f5a623;} hr{border-top:1px dashed #ccc;}</style>
      </head><body>
      <h2>🛒 تطبيق العباسي</h2>
      <hr/>
      <p><strong>رقم الطلب:</strong> #${order.id.slice(-6)}</p>
      <p><strong>طريقة الدفع:</strong> ${order.paymentMethod}</p>
      <hr/>
      ${order.items.map(i => `<p>${i.name} × ${i.qty} = ${i.price * i.qty} د.ع</p>`).join('')}
      <hr/>
      <h3>الإجمالي: ${order.total} د.ع</h3>
      <script>window.print();</script>
      </body></html>
    `);
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('admin-toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `notif-toast type-${type}`;
    toast.innerHTML = `
      <span class="notif-toast-icon">${type === 'success' ? '✅' : type === 'alert' ? '⚠️' : 'ℹ️'}</span>
      <span class="notif-toast-text">${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toast-out 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  async logout() {
    if (confirm('هل تريد تسجيل الخروج من لوحة التحكم؟')) {
      await adminLogout();
      this.destroy();
      this.onLogout();
    }
  }

  destroy() {
    this.unsubscribers.forEach(fn => fn());
    delete window._adminScreen;
  }
}
