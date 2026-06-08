// barcode.component.js — مكون قارئ الباركود
import { getProductByBarcode } from '../services/store.service.js';

export class BarcodeScanner {
  constructor(containerId, onResult) {
    this.containerId = containerId;
    this.onResult = onResult;
    this.scanner = null;
    this.running = false;
    this.manualMode = false;
  }

  async render(parentEl) {
    parentEl.innerHTML = `
      <div style="margin-bottom:14px;">
        <!-- Toggle manual/camera -->
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button id="bc-cam-btn" onclick="window._barcodeComp.startCamera()"
            style="flex:1;padding:10px;background:linear-gradient(135deg,#f5a623,#c4831a);color:#fff;border:none;border-radius:12px;font-family:var(--ff-ar);font-size:13px;font-weight:700;cursor:pointer;">
            📷 فتح الكاميرا
          </button>
          <button onclick="window._barcodeComp.toggleManual()"
            style="flex:1;padding:10px;background:var(--c-card);border:1px solid var(--c-border);color:var(--c-text);border-radius:12px;font-family:var(--ff-ar);font-size:13px;font-weight:700;cursor:pointer;">
            ⌨️ إدخال يدوي
          </button>
        </div>

        <!-- Camera viewfinder -->
        <div id="bc-viewfinder" style="position:relative;">
          <div id="${this.containerId}"
            style="border-radius:16px;overflow:hidden;border:2px solid var(--c-gold);box-shadow:0 0 0 4px rgba(245,166,35,0.1);">
          </div>
          <!-- Scan frame overlay -->
          <div id="bc-frame" class="hidden" style="position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center;">
            <div style="width:200px;height:120px;position:relative;">
              <!-- Corners -->
              <div style="position:absolute;top:0;right:0;width:20px;height:20px;border-top:3px solid var(--c-gold);border-right:3px solid var(--c-gold);border-radius:0 4px 0 0;"></div>
              <div style="position:absolute;top:0;left:0;width:20px;height:20px;border-top:3px solid var(--c-gold);border-left:3px solid var(--c-gold);border-radius:4px 0 0 0;"></div>
              <div style="position:absolute;bottom:0;right:0;width:20px;height:20px;border-bottom:3px solid var(--c-gold);border-right:3px solid var(--c-gold);border-radius:0 0 4px 0;"></div>
              <div style="position:absolute;bottom:0;left:0;width:20px;height:20px;border-bottom:3px solid var(--c-gold);border-left:3px solid var(--c-gold);border-radius:0 0 0 4px;"></div>
              <!-- Scan line -->
              <div id="bc-scanline" style="position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#f5a623,transparent);animation:bcscan 1.5s ease-in-out infinite;"></div>
            </div>
          </div>
        </div>

        <!-- Stop button -->
        <button id="bc-stop-btn" class="hidden" onclick="window._barcodeComp.stop()"
          style="width:100%;margin-top:10px;padding:10px;background:rgba(255,77,106,0.1);border:1px solid var(--c-red);color:var(--c-red);border-radius:12px;font-family:var(--ff-ar);font-size:13px;font-weight:700;cursor:pointer;">
          ⏹ إيقاف الكاميرا
        </button>

        <!-- Manual input -->
        <div id="bc-manual" class="hidden" style="margin-top:10px;">
          <div style="position:relative;">
            <input type="text" id="bc-input"
              style="width:100%;padding:12px 14px;background:var(--c-card);border:1px solid var(--c-border);border-radius:14px;color:var(--c-text);font-family:var(--ff-ar);font-size:14px;outline:none;"
              placeholder="أدخل رقم الباركود..."
              oninput="window._barcodeComp.onManualInput(this.value)"
              onkeypress="if(event.key==='Enter') window._barcodeComp.searchManual()" />
          </div>
          <button onclick="window._barcodeComp.searchManual()"
            style="width:100%;margin-top:8px;padding:11px;background:linear-gradient(135deg,#f5a623,#c4831a);color:#fff;border:none;border-radius:12px;font-family:var(--ff-ar);font-size:13px;font-weight:700;cursor:pointer;">
            🔍 بحث
          </button>
        </div>

        <!-- Scan result -->
        <div id="bc-result" style="margin-top:12px;display:none;">
          <div style="padding:14px;background:var(--c-card);border:1px solid var(--c-border);border-radius:14px;">
            <div style="font-size:11px;color:var(--c-muted);margin-bottom:6px;">نتيجة المسح</div>
            <div id="bc-result-content"></div>
          </div>
        </div>

        <!-- Recent scans -->
        <div id="bc-history" style="margin-top:12px;display:none;">
          <div style="font-size:12px;font-weight:700;color:var(--c-muted);margin-bottom:8px;">آخر عمليات المسح</div>
          <div id="bc-history-list"></div>
        </div>
      </div>
      <style>
        @keyframes bcscan {
          0%,100% { top:10%; opacity:1; }
          50% { top:80%; opacity:0.7; }
        }
      </style>
    `;

    window._barcodeComp = this;
    this._history = [];
  }

  async startCamera() {
    const { Html5Qrcode } = await import('html5-qrcode');

    if (this.running) await this.stop();

    try {
      this.scanner = new Html5Qrcode(this.containerId);

      const config = {
        fps: 15,
        qrbox: { width: 220, height: 120 },
        aspectRatio: 1.5,
        formatsToSupport: [
          Html5Qrcode.BARCODE_FORMAT_EAN_13,
          Html5Qrcode.BARCODE_FORMAT_EAN_8,
          Html5Qrcode.BARCODE_FORMAT_CODE_128,
          Html5Qrcode.BARCODE_FORMAT_CODE_39,
          Html5Qrcode.BARCODE_FORMAT_QR_CODE,
          Html5Qrcode.BARCODE_FORMAT_UPC_A,
          Html5Qrcode.BARCODE_FORMAT_UPC_E,
        ],
      };

      await this.scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => this._onScan(decodedText),
        (error) => { /* ignore scan errors */ }
      );

      this.running = true;
      document.getElementById('bc-cam-btn').style.display = 'none';
      document.getElementById('bc-stop-btn').classList.remove('hidden');
      document.getElementById('bc-frame').classList.remove('hidden');

    } catch (err) {
      this._showResult({
        success: false,
        message: `لا يمكن الوصول للكاميرا: ${err.message}`,
      });
    }
  }

  async stop() {
    if (this.scanner && this.running) {
      try {
        await this.scanner.stop();
        this.scanner.clear();
      } catch (e) {}
    }
    this.running = false;
    this.scanner = null;
    document.getElementById('bc-cam-btn').style.display = '';
    document.getElementById('bc-stop-btn').classList.add('hidden');
    document.getElementById('bc-frame').classList.add('hidden');
  }

  toggleManual() {
    this.manualMode = !this.manualMode;
    const m = document.getElementById('bc-manual');
    m.classList.toggle('hidden', !this.manualMode);
    if (this.manualMode) {
      this.stop();
      document.getElementById('bc-input').focus();
    }
  }

  onManualInput(val) {
    // Auto-search when valid barcode length
    if (val.length >= 8 && /^\d+$/.test(val)) {
      clearTimeout(this._searchTimeout);
      this._searchTimeout = setTimeout(() => this.searchManual(), 400);
    }
  }

  async searchManual() {
    const input = document.getElementById('bc-input');
    const code = input?.value?.trim();
    if (!code) return;
    await this._onScan(code);
  }

  async _onScan(code) {
    // Prevent duplicate rapid scans
    if (this._lastCode === code && Date.now() - this._lastScanTime < 2000) return;
    this._lastCode = code;
    this._lastScanTime = Date.now();

    // Vibrate on scan
    try { navigator.vibrate?.(100); } catch (e) {}

    // Look up product
    let product = null;
    try {
      product = await getProductByBarcode(code);
    } catch (e) {}

    const result = {
      code,
      success: !!product,
      product,
      message: product
        ? `✅ وُجد: ${product.name}`
        : `⚠️ لا يوجد منتج بهذا الباركود`,
    };

    this._addHistory(result);
    this._showResult(result);
    this.onResult?.(result);
  }

  _showResult(result) {
    const el = document.getElementById('bc-result');
    const content = document.getElementById('bc-result-content');
    if (!el || !content) return;

    el.style.display = 'block';

    if (result.product) {
      const p = result.product;
      const stockColor = (p.stock || 0) === 0 ? '#ff4d6a' : (p.stock || 0) <= 5 ? '#ffa500' : '#00c48c';
      content.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;">
          <div style="width:52px;height:52px;border-radius:10px;background:var(--c-surface);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">
            ${p.imageURL ? `<img src="${p.imageURL}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">` : '📦'}
          </div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;">${p.name}</div>
            <div style="font-size:13px;color:var(--c-gold);font-weight:700;margin-top:2px;">${(p.price || 0).toLocaleString('ar')} د.ع</div>
            <div style="font-size:11px;margin-top:2px;color:${stockColor};">
              المخزون: ${(p.stock || 0) === 0 ? 'نفد' : `${p.stock} وحدة`}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button onclick="window._barcodeComp._editStock('${p.id}')"
            style="flex:1;padding:8px;background:rgba(245,166,35,0.1);border:1px solid var(--c-gold);color:var(--c-gold);border-radius:10px;font-family:var(--ff-ar);font-size:12px;font-weight:700;cursor:pointer;">
            📦 تحديث المخزون
          </button>
          <button onclick="window._barcodeComp._editPrice('${p.id}')"
            style="flex:1;padding:8px;background:rgba(0,196,140,0.1);border:1px solid var(--c-green);color:var(--c-green);border-radius:10px;font-family:var(--ff-ar);font-size:12px;font-weight:700;cursor:pointer;">
            ✏️ تعديل السعر
          </button>
        </div>
        <div style="font-size:10px;color:var(--c-muted);margin-top:8px;">باركود: ${result.code}</div>
      `;
    } else {
      content.innerHTML = `
        <div style="color:${result.success === false ? '#ffa500' : 'var(--c-green)'};">
          ${result.message}
        </div>
        ${result.code ? `
          <div style="font-size:11px;color:var(--c-muted);margin-top:6px;">الكود: ${result.code}</div>
          <button onclick="window._adminScreen?.openAddProduct()"
            style="margin-top:10px;width:100%;padding:8px;background:linear-gradient(135deg,#f5a623,#c4831a);color:#fff;border:none;border-radius:10px;font-family:var(--ff-ar);font-size:12px;font-weight:700;cursor:pointer;">
            ➕ إضافة منتج جديد بهذا الباركود
          </button>
        ` : ''}
      `;
    }
  }

  _addHistory(result) {
    this._history.unshift(result);
    if (this._history.length > 10) this._history.pop();
    const histEl = document.getElementById('bc-history');
    const listEl = document.getElementById('bc-history-list');
    if (!histEl || !listEl) return;
    histEl.style.display = 'block';
    listEl.innerHTML = this._history.map(h => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--c-border);">
        <span style="font-size:18px;">${h.product ? '✅' : '⚠️'}</span>
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:600;">${h.product?.name || 'غير معروف'}</div>
          <div style="font-size:10px;color:var(--c-muted);">${h.code}</div>
        </div>
        ${h.product ? `<div style="font-size:11px;font-weight:700;color:var(--c-gold);">${(h.product.price||0).toLocaleString('ar')} د.ع</div>` : ''}
      </div>
    `).join('');
  }

  async _editStock(productId) {
    const qty = prompt('أدخل الكمية المضافة للمخزون:');
    if (!qty || isNaN(qty)) return;
    const { updateStock } = await import('../services/store.service.js');
    await updateStock(productId, parseInt(qty));
    const { createNotification } = await import('../services/store.service.js');
    await createNotification('product_update', `تم تحديث مخزون المنتج`);
    alert('✅ تم تحديث المخزون');
  }

  async _editPrice(productId) {
    const price = prompt('أدخل السعر الجديد (د.ع):');
    if (!price || isNaN(price)) return;
    const { updateProduct } = await import('../services/store.service.js');
    await updateProduct(productId, { price: parseFloat(price) });
    alert('✅ تم تحديث السعر');
  }

  destroy() {
    this.stop();
    delete window._barcodeComp;
  }
}

export default BarcodeScanner;
