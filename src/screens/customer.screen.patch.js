// customer.screen.patch.js — patch لتوصيل الشاشات الفرعية
// هذا الملف يوضح كيفية توصيل المكونات الجديدة بـ customer.screen.js
// انسخ هذا الكود داخل setView() في customer.screen.js

/*
  استبدل setView() الموجودة بهذه:

  async setView(view) {
    document.querySelectorAll('.nav-item').forEach((b, i) => {
      b.classList.toggle('active', ['home','recipes','orders','loyalty'][i] === view);
    });

    const main = document.getElementById('customer-main');

    switch(view) {
      case 'home':
        this._renderHomeContent(main);
        break;

      case 'orders':
        main.innerHTML = `<div id="orders-view" style="height:100%;display:flex;flex-direction:column;"></div>`;
        const { OrdersScreen } = await import('./orders.screen.js');
        if (this._ordersScreen) this._ordersScreen.destroy();
        this._ordersScreen = new OrdersScreen(document.getElementById('orders-view'), this.user?.uid);
        break;

      case 'loyalty':
        main.innerHTML = `<div id="loyalty-view" style="overflow-y:auto;height:100%;padding:14px;"></div>`;
        const { LoyaltyComponent } = await import('../components/loyalty.component.js');
        const lc = new LoyaltyComponent('loyalty-view', this.user?.uid);
        await lc.load();
        break;

      case 'recipes':
        main.innerHTML = `<div id="recipes-view" style="overflow-y:auto;height:100%;padding:14px;"></div>`;
        this._renderRecipesView(document.getElementById('recipes-view'));
        break;
    }
  }

  _renderHomeContent(main) {
    // Re-render all home content (banners, loyalty, categories, products)
    // Already done in initial render; just reset scroll
    main.scrollTop = 0;
    this.renderProducts();
  }

  _renderRecipesView(container) {
    if (!this.recipes.length) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">🍳</div>
        <div class="empty-state-text">لا توجد وصفات بعد</div>
      </div>`;
      return;
    }
    container.innerHTML = `
      <div style="font-size:16px;font-weight:700;margin-bottom:14px;">🍳 تسوق بالوصفة</div>
      <div style="font-size:13px;color:var(--c-muted);margin-bottom:16px;">أضف كل مكونات وصفة كاملة بضغطة واحدة!</div>
      ${this.recipes.map(r => `
        <div style="background:var(--c-card);border:1px solid var(--c-border);border-radius:var(--r-lg);padding:14px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
            <div style="font-size:36px;">${r.icon || '🍳'}</div>
            <div>
              <div style="font-size:14px;font-weight:700;">${r.name}</div>
              <div style="font-size:11px;color:var(--c-muted);">${r.ingredients?.length || 0} مواد</div>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
            ${(r.ingredients || []).map(ing => `
              <span style="padding:3px 10px;background:rgba(245,166,35,0.1);border:1px solid rgba(245,166,35,0.2);border-radius:99px;font-size:10px;color:var(--c-gold);">
                ${ing.name} × ${ing.qty}
              </span>
            `).join('')}
          </div>
          <button onclick="window._customerScreen.addRecipeToCart('${r.id}')"
            style="width:100%;padding:10px;background:linear-gradient(135deg,#f5a623,#c4831a);color:#fff;border:none;border-radius:12px;font-family:var(--ff-ar);font-size:13px;font-weight:700;cursor:pointer;">
            🛒 أضف كل المواد للسلة
          </button>
        </div>
      `).join('')}
    `;
  }

  // في toggleDrawer أضف:
  openFamilyGroup() {
    this.toggleDrawer();
    const main = document.getElementById('customer-main');
    main.innerHTML = `<div id="family-view" style="overflow-y:auto;height:100%;padding:14px;"></div>`;
    import('../components/family.component.js').then(({ FamilyComponent }) => {
      const fc = new FamilyComponent('family-view', this.user?.uid);
      fc.load();
    });
  }
*/

export {}; // placeholder export
