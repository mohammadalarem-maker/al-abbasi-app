// customer.screen.js — واجهة العملاء الكاملة
import { watchProducts, watchBanners, watchRecipes, watchFamilyCart, placeOrder } from '../services/store.service.js';
import { customerLogout, onCustomerAuthChange } from '../services/auth.service.js';
import { Network } from '@capacitor/network';

const CATEGORIES = [
  { id: 'all', label: 'الكل', icon: '🏪' },
  { id: 'fruits', label: 'فواكه', icon: '🍎' },
  { id: 'vegetables', label: 'خضروات', icon: '🥦' },
  { id: 'meat', label: 'لحوم', icon: '🥩' },
  { id: 'dairy', label: 'ألبان', icon: '🥛' },
  { id: 'bakery', label: 'مخبوزات', icon: '🍞' },
  { id: 'beverages', label: 'مشروبات', icon: '🧃' },
  { id: 'snacks', label: 'سناكس', icon: '🍫' },
  { id: 'household', label: 'منزلية', icon: '🧹' },
  { id: 'hygiene', label: 'تنظيف', icon: '🧼' },
];

export class CustomerScreen {
  constructor(container, user, onLogout) {
    this.container = container;
    this.user = user;
    this.onLogout = onLogout;
    this.cart = [];
    this.products = [];
    this.banners = [];
    this.recipes = [];
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.bannerIndex = 0;
    this.bannerTimer = null;
    this.unsubscribers = [];
    this.isOnline = true;
    this.render();
    this.init();
  }

  render() {
    this.container.innerHTML = `
      <!-- Top Bar -->
      <div class="top-bar">
        <div class="top-bar-menu" id="menu-btn" onclick="window._customerScreen.toggleDrawer()">
          <span></span><span></span><span></span>
        </div>
        <div class="search-bar">
          <input type="search" class="search-input" id="search-input"
            placeholder="ابحث عن منتج..." 
            oninput="window._customerScreen.onSearch(this.value)" />
          <span class="search-icon" onclick="window._customerScreen.startVoiceSearch()">🎤</span>
        </div>
        <div class="cart-btn" onclick="window._customerScreen.toggleCart()">
          🛒
          <div class="cart-badge hidden" id="cart-badge">0</div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="customer-content" id="customer-main">
        <!-- Banner Slider -->
        <div class="banner-slider" id="banner-area">
          <div id="banner-default" class="banner-default">
            <div style="font-size: 48px;">🏪</div>
            <div class="banner-default-text">تطبيق العباسي</div>
            <div style="color: var(--c-muted); font-size: 13px;">العروض والتخفيضات تحمّل...</div>
          </div>
        </div>

        <!-- Loyalty Points -->
        <div id="loyalty-bar" style="margin: 12px 16px; padding: 12px 16px; background: linear-gradient(135deg, rgba(245,166,35,0.1), rgba(196,131,26,0.05)); border: 1px solid rgba(245,166,35,0.2); border-radius: var(--r-lg); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">⭐</span>
            <div>
              <div style="font-size: 12px; font-weight: 600; color: var(--c-gold);">نقاط الولاء</div>
              <div style="font-size: 20px; font-weight: 900;" id="points-display">0</div>
            </div>
          </div>
          <div style="text-align: left;">
            <div style="font-size: 11px; color: var(--c-muted);">اجمع 1000 نقطة</div>
            <div style="font-size: 11px; color: var(--c-muted);">واحصل على هدية</div>
          </div>
        </div>

        <!-- Recipes Quick Add -->
        <div id="recipes-section" style="padding: 0 16px 16px;">
          <div class="section-label">🍳 تسوق بالوصفة</div>
          <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px;">
            <div id="recipes-strip"></div>
          </div>
        </div>

        <!-- Categories -->
        <div class="section-label">الأقسام</div>
        <div class="categories-strip" id="categories">
          ${CATEGORIES.map(c => `
            <div class="cat-chip ${c.id === 'all' ? 'active' : ''}"
              onclick="window._customerScreen.selectCategory('${c.id}')">
              <span class="cat-chip-icon">${c.icon}</span>
              <span class="cat-chip-label">${c.label}</span>
            </div>
          `).join('')}
        </div>

        <!-- Products Grid -->
        <div class="section-label" id="products-label">جميع المنتجات</div>
        <div class="products-grid" id="products-grid">
          ${[...Array(6)].map(() => `
            <div class="product-card">
              <div class="skeleton" style="aspect-ratio:1;"></div>
              <div class="product-info">
                <div class="skeleton" style="height:14px; margin-bottom:6px;"></div>
                <div class="skeleton" style="height:10px; width:60%; margin-bottom:8px;"></div>
                <div class="skeleton" style="height:28px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Bottom Nav -->
      <div class="bottom-nav">
        <button class="nav-item active" onclick="window._customerScreen.setView('home')">
          <span class="nav-item-icon">🏠</span>
          <span class="nav-item-label">الرئيسية</span>
        </button>
        <button class="nav-item" onclick="window._customerScreen.setView('recipes')">
          <span class="nav-item-icon">🍳</span>
          <span class="nav-item-label">الوصفات</span>
        </button>
        <button class="nav-item" onclick="window._customerScreen.setView('orders')">
          <span class="nav-item-icon">📦</span>
          <span class="nav-item-label">طلباتي</span>
        </button>
        <button class="nav-item" onclick="window._customerScreen.setView('loyalty')">
          <span class="nav-item-icon">⭐</span>
          <span class="nav-item-label">نقاطي</span>
        </button>
      </div>

      <!-- Navigation Drawer -->
      <div class="drawer-overlay" id="drawer-overlay" onclick="window._customerScreen.toggleDrawer()"></div>
      <div class="drawer" id="nav-drawer">
        <div class="drawer-header">
          <div class="drawer-user-avatar" id="drawer-avatar">
            ${this.user?.photoURL ? `<img src="${this.user.photoURL}" />` : '👤'}
          </div>
          <div class="drawer-user-name">${this.user?.displayName || this.user?.email || 'عميل'}</div>
          <div class="drawer-user-points">⭐ <span id="drawer-points">0</span> نقطة</div>
        </div>
        <div class="drawer-menu">
          <div class="drawer-section-title">التسوق</div>
          <button class="drawer-menu-item" onclick="window._customerScreen.setView('home'); window._customerScreen.toggleDrawer()">
            <span class="drawer-menu-item-icon">🏠</span> الرئيسية
          </button>
          <button class="drawer-menu-item" onclick="window._customerScreen.setView('recipes'); window._customerScreen.toggleDrawer()">
            <span class="drawer-menu-item-icon">🍳</span> تسوق بالوصفة
          </button>
          <button class="drawer-menu-item" onclick="window._customerScreen.setView('orders'); window._customerScreen.toggleDrawer()">
            <span class="drawer-menu-item-icon">📦</span> طلباتي
          </button>
          <div class="drawer-divider"></div>
          <div class="drawer-section-title">الحساب</div>
          <button class="drawer-menu-item" onclick="window._customerScreen.setView('loyalty'); window._customerScreen.toggleDrawer()">
            <span class="drawer-menu-item-icon">⭐</span> برنامج الولاء
          </button>
          <button class="drawer-menu-item" onclick="window._customerScreen.openFamilyGroup()">
            <span class="drawer-menu-item-icon">👨‍👩‍👧</span> الوضع العائلي
          </button>
          <div class="drawer-divider"></div>
          <button class="drawer-menu-item" onclick="window._customerScreen.toggleDarkMode()">
            <span class="drawer-menu-item-icon" id="dark-mode-icon">🌙</span>
            <span id="dark-mode-label">الوضع الليلي</span>
          </button>
          <button class="drawer-menu-item" style="color: var(--c-red);" onclick="window._customerScreen.logout()">
            <span class="drawer-menu-item-icon">🚪</span> تسجيل الخروج
          </button>
        </div>
      </div>

      <!-- Cart Panel -->
      <div class="cart-panel" id="cart-panel">
        <div class="cart-panel-overlay" onclick="window._customerScreen.toggleCart()"></div>
        <div class="cart-panel-sheet">
          <div class="cart-header">
            <div class="cart-title">🛒 سلة المشتريات</div>
            <button class="cart-close" onclick="window._customerScreen.toggleCart()">✕</button>
          </div>
          <div class="cart-items" id="cart-items-list">
            <div class="empty-state">
              <div class="empty-state-icon">🛒</div>
              <div class="empty-state-text">السلة فارغة</div>
            </div>
          </div>
          <div class="cart-footer">
            <div class="cart-total-row">
              <span>الإجمالي</span>
              <span class="cart-total-val" id="cart-total">0 د.ع</span>
            </div>
            <div class="checkout-options">
              <button class="btn btn-green" style="flex: 1;" onclick="window._customerScreen.checkout('wallet')">
                💳 دفع إلكتروني
              </button>
              <button class="btn btn-gold" style="flex: 1;" onclick="window._customerScreen.checkout('call')">
                📞 اتصال وطلب
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    window._customerScreen = this;
  }

  async init() {
    // Watch products
    const unsubProducts = watchProducts((products) => {
      this.products = products;
      this.renderProducts();
    });
    this.unsubscribers.push(unsubProducts);

    // Watch banners
    const unsubBanners = watchBanners((banners) => {
      this.banners = banners;
      this.renderBanners();
    });
    this.unsubscribers.push(unsubBanners);

    // Watch recipes
    const unsubRecipes = watchRecipes((recipes) => {
      this.recipes = recipes;
      this.renderRecipes();
    });
    this.unsubscribers.push(unsubRecipes);

    // Network status
    Network.addListener('networkStatusChange', status => {
      this.isOnline = status.connected;
      this.updateOnlineStatus();
    });

    // Load user loyalty points
    this.loadLoyaltyPoints();

    // Dark mode
    const isDark = localStorage.getItem('darkMode') !== 'false';
    if (!isDark) document.body.classList.add('light');
    this.updateDarkModeButton();
  }

  async loadLoyaltyPoints() {
    if (!this.user?.uid) return;
    try {
      const { db } = await import('../services/firebase-config.js');
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'customers', this.user.uid));
      if (snap.exists()) {
        const points = snap.data().loyaltyPoints || 0;
        document.getElementById('points-display').textContent = points.toLocaleString('ar');
        document.getElementById('drawer-points').textContent = points.toLocaleString('ar');
      }
    } catch (e) {}
  }

  renderBanners() {
    if (!this.banners.length) return;
    clearInterval(this.bannerTimer);
    const area = document.getElementById('banner-area');
    area.innerHTML = `
      <div class="banner-track" id="banner-track">
        ${this.banners.map(b => `
          <div class="banner-slide">
            <img src="${b.imageURL}" alt="${b.title}" loading="lazy"
              onerror="this.style.display='none'" />
            <div class="banner-slide-overlay">
              <div class="banner-text">${b.title}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="banner-dots">
        ${this.banners.map((_, i) => `<div class="banner-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}
      </div>
    `;
    this.startBannerSlider();
  }

  startBannerSlider() {
    if (this.banners.length <= 1) return;
    this.bannerTimer = setInterval(() => {
      this.bannerIndex = (this.bannerIndex + 1) % this.banners.length;
      const track = document.getElementById('banner-track');
      if (track) track.style.transform = `translateX(${this.bannerIndex * 100}%)`;
      document.querySelectorAll('.banner-dot').forEach((d, i) => {
        d.classList.toggle('active', i === this.bannerIndex);
      });
    }, 4000);
  }

  renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    let filtered = this.products;
    if (this.activeCategory !== 'all') {
      filtered = filtered.filter(p => p.category === this.activeCategory);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.barcode?.includes(q)
      );
    }
    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">لا توجد منتجات</div>
      </div>`;
      return;
    }
    grid.innerHTML = filtered.map(p => this.renderProductCard(p)).join('');
  }

  renderProductCard(p) {
    const inStock = (p.stock || 0) > 0;
    const inCart = this.cart.find(i => i.id === p.id);
    return `
      <div class="product-card" onclick="window._customerScreen.openProduct('${p.id}')">
        ${!inStock ? `<div class="out-of-stock-badge">نفد</div>` : ''}
        <div class="product-img-wrap">
          ${p.imageURL
            ? `<img class="product-img" src="${p.imageURL}" alt="${p.name}" loading="lazy" />`
            : `<div class="product-img-placeholder">${CATEGORIES.find(c => c.id === p.category)?.icon || '📦'}</div>`
          }
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-unit">${p.unit || ''}</div>
          <div class="product-footer">
            <div class="product-price">${(p.price || 0).toLocaleString('ar')} <span>د.ع</span></div>
            <button class="add-to-cart" 
              onclick="event.stopPropagation(); window._customerScreen.addToCart('${p.id}')"
              ${!inStock ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
              ${inCart ? inCart.qty : '+'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderRecipes() {
    const strip = document.getElementById('recipes-strip');
    if (!strip || !this.recipes.length) {
      document.getElementById('recipes-section').style.display = 'none';
      return;
    }
    strip.style.display = 'flex';
    strip.style.gap = '10px';
    strip.innerHTML = this.recipes.map(r => `
      <div onclick="window._customerScreen.addRecipeToCart('${r.id}')"
        style="min-width: 120px; padding: 12px; background: var(--c-card); border-radius: var(--r-lg);
        border: 1px solid var(--c-border); cursor: pointer; text-align: center;">
        <div style="font-size: 28px; margin-bottom: 6px;">${r.icon || '🍳'}</div>
        <div style="font-size: 12px; font-weight: 700;">${r.name}</div>
        <div style="font-size: 10px; color: var(--c-muted); margin-top: 4px;">${r.ingredients?.length || 0} مواد</div>
        <div style="margin-top: 8px; font-size: 11px; color: var(--c-gold); font-weight: 700;">+ أضف للسلة</div>
      </div>
    `).join('');
  }

  selectCategory(id) {
    this.activeCategory = id;
    document.querySelectorAll('.cat-chip').forEach(c => {
      c.classList.toggle('active', c.textContent.trim().includes(CATEGORIES.find(x => x.id === id)?.label || ''));
    });
    const label = document.getElementById('products-label');
    const cat = CATEGORIES.find(c => c.id === id);
    if (label) label.textContent = cat ? `${cat.icon} ${cat.label}` : 'المنتجات';
    this.renderProducts();
  }

  onSearch(query) {
    this.searchQuery = query;
    this.renderProducts();
  }

  startVoiceSearch() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('البحث الصوتي غير مدعوم في هذا الجهاز');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'ar-IQ';
    recognition.start();
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      document.getElementById('search-input').value = text;
      this.onSearch(text);
    };
  }

  addToCart(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    const existing = this.cart.find(i => i.id === productId);
    if (existing) {
      existing.qty++;
    } else {
      this.cart.push({ ...product, qty: 1 });
    }
    this.updateCartBadge();
    this.renderProducts();
    this.showAddedFeedback();
  }

  addRecipeToCart(recipeId) {
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe?.ingredients) return;
    recipe.ingredients.forEach(ing => {
      const product = this.products.find(p =>
        p.name?.toLowerCase().includes(ing.name?.toLowerCase())
      );
      if (product) this.addToCart(product.id);
    });
    this.showToast(`✅ تم إضافة مقاضي ${recipe.name} للسلة`, 'success');
  }

  updateCartBadge() {
    const total = this.cart.reduce((s, i) => s + i.qty, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) {
      badge.textContent = total;
      badge.classList.toggle('hidden', total === 0);
    }
  }

  toggleCart() {
    const panel = document.getElementById('cart-panel');
    const isOpen = panel.classList.contains('open');
    if (!isOpen) this.renderCartItems();
    panel.classList.toggle('open');
  }

  renderCartItems() {
    const list = document.getElementById('cart-items-list');
    const total = this.cart.reduce((s, i) => s + i.price * i.qty, 0);
    if (!this.cart.length) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">🛒</div>
        <div class="empty-state-text">السلة فارغة</div>
      </div>`;
    } else {
      list.innerHTML = this.cart.map(item => `
        <div class="cart-item">
          <div class="cart-item-img">
            ${item.imageURL
              ? `<img src="${item.imageURL}" style="width:100%;height:100%;object-fit:cover;" />`
              : `📦`
            }
          </div>
          <div style="flex: 1; min-width: 0;">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">${(item.price * item.qty).toLocaleString('ar')} د.ع</div>
          </div>
          <div class="qty-control">
            <button class="qty-btn" onclick="window._customerScreen.updateCartQty('${item.id}', -1)">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="window._customerScreen.updateCartQty('${item.id}', 1)">+</button>
          </div>
        </div>
      `).join('');
    }
    document.getElementById('cart-total').textContent =
      `${total.toLocaleString('ar')} د.ع`;
  }

  updateCartQty(productId, delta) {
    const item = this.cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) this.cart = this.cart.filter(i => i.id !== productId);
    this.updateCartBadge();
    this.renderCartItems();
    this.renderProducts();
  }

  async checkout(method) {
    if (!this.cart.length) return;
    if (method === 'call') {
      const total = this.cart.reduce((s, i) => s + i.price * i.qty, 0);
      const msg = encodeURIComponent(
        `طلب جديد من تطبيق العباسي:\n${this.cart.map(i => `- ${i.name} × ${i.qty}`).join('\n')}\nالإجمالي: ${total.toLocaleString('ar')} د.ع`
      );
      window.open(`https://wa.me/9647XXXXXXX?text=${msg}`, '_blank');
      return;
    }
    // Place order via Firestore
    try {
      const orderId = await placeOrder(
        this.user?.uid,
        this.cart,
        method,
        this.user?.phoneNumber || ''
      );
      this.cart = [];
      this.updateCartBadge();
      this.toggleCart();
      this.showToast(`✅ تم إرسال طلبك بنجاح! رقم الطلب: ${orderId.slice(-6)}`, 'success');
    } catch (e) {
      this.showToast('❌ حدث خطأ أثناء إرسال الطلب', 'alert');
    }
  }

  toggleDrawer() {
    const drawer = document.getElementById('nav-drawer');
    const overlay = document.getElementById('drawer-overlay');
    drawer.classList.toggle('open');
    overlay.classList.toggle('open');
  }

  openFamilyGroup() {
    this.toggleDrawer();
    this.showToast('👨‍👩‍👧 ميزة الوضع العائلي — قريباً!', 'info');
  }

  toggleDarkMode() {
    document.body.classList.toggle('light');
    const isLight = document.body.classList.contains('light');
    localStorage.setItem('darkMode', !isLight);
    this.updateDarkModeButton();
  }

  updateDarkModeButton() {
    const isLight = document.body.classList.contains('light');
    const icon = document.getElementById('dark-mode-icon');
    const label = document.getElementById('dark-mode-label');
    if (icon) icon.textContent = isLight ? '☀️' : '🌙';
    if (label) label.textContent = isLight ? 'الوضع الليلي' : 'الوضع الليلي (مفعّل)';
  }

  setView(view) {
    document.querySelectorAll('.nav-item').forEach((b, i) => {
      b.classList.toggle('active', ['home','recipes','orders','loyalty'][i] === view);
    });
    // TODO: implement additional view screens
    if (view !== 'home') this.showToast('🚧 قيد التطوير — قريباً!', 'info');
  }

  openProduct(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;
    // Simple product detail modal
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal" style="max-height: 70vh;">
        <div class="modal-header">
          <div class="modal-title">${product.name}</div>
          <button class="cart-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          ${product.imageURL ? `<img src="${product.imageURL}" style="width:100%;border-radius:var(--r-lg);margin-bottom:16px;max-height:200px;object-fit:cover;">` : ''}
          <div style="font-size:24px;font-weight:900;color:var(--c-gold);margin-bottom:8px;">${(product.price||0).toLocaleString('ar')} د.ع</div>
          <div style="font-size:13px;color:var(--c-muted);margin-bottom:8px;">${product.unit||''}</div>
          ${product.description ? `<div style="font-size:14px;line-height:1.6;">${product.description}</div>` : ''}
          <div style="margin-top:12px;font-size:12px;color:${(product.stock||0)>5?'var(--c-green)':(product.stock||0)>0?'orange':'var(--c-red)'};">
            ${(product.stock||0)>5?'✅ متوفر':(product.stock||0)>0?`⚠️ كمية محدودة (${product.stock})`:'❌ نفد المخزون'}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-gold" onclick="window._customerScreen.addToCart('${product.id}'); this.closest('.modal-overlay').remove();" ${(product.stock||0)<=0?'disabled':''}>
            🛒 أضف إلى السلة
          </button>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  showAddedFeedback() {
    const btn = document.querySelector('.cart-btn');
    if (btn) {
      btn.style.transform = 'scale(1.2)';
      setTimeout(() => btn.style.transform = '', 200);
    }
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'notif-toast-container';
      document.body.appendChild(container);
    }
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
    }, 3500);
  }

  updateOnlineStatus() {
    const existing = document.getElementById('offline-banner');
    if (!this.isOnline && !existing) {
      const banner = document.createElement('div');
      banner.id = 'offline-banner';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:var(--c-red);color:#fff;text-align:center;padding:6px;font-size:12px;font-weight:700;';
      banner.textContent = '⚠️ أنت غير متصل بالإنترنت — يعمل في وضع عدم الاتصال';
      document.body.prepend(banner);
    } else if (this.isOnline && existing) {
      existing.remove();
    }
  }

  async logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
      await customerLogout();
      this.destroy();
      this.onLogout();
    }
  }

  destroy() {
    this.unsubscribers.forEach(fn => fn());
    clearInterval(this.bannerTimer);
    delete window._customerScreen;
  }
}
