// printer.service.js — خدمة الطابعة الحرارية البلوتوث
// تعتمد على Web Bluetooth API المتاحة في Capacitor WebView

const ESC = 0x1B;
const GS  = 0x1D;

class PrinterService {
  constructor() {
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.connected = false;
    // UUID الشائع لطابعات ESC/POS البلوتوث
    this.SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
    this.CHAR_UUID    = '00002af1-0000-1000-8000-00805f9b34fb';
  }

  // ---- اتصال بالطابعة ----
  async connect() {
    if (!navigator.bluetooth) {
      throw new Error('البلوتوث غير مدعوم في هذا الجهاز');
    }
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'RPP' },
          { namePrefix: 'BlueTooth Printer' },
          { namePrefix: 'POS' },
          { namePrefix: 'Printer' },
          { services: [this.SERVICE_UUID] },
        ],
        optionalServices: [this.SERVICE_UUID],
      });
      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService(this.SERVICE_UUID);
      this.characteristic = await service.getCharacteristic(this.CHAR_UUID);
      this.connected = true;
      this.device.addEventListener('gattserverdisconnected', () => {
        this.connected = false;
        console.warn('🖨️ Printer disconnected');
      });
      return true;
    } catch (e) {
      this.connected = false;
      throw new Error('فشل الاتصال بالطابعة: ' + e.message);
    }
  }

  async disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.connected = false;
  }

  // ---- إرسال بيانات خام ----
  async _write(data) {
    if (!this.connected || !this.characteristic) {
      throw new Error('الطابعة غير متصلة');
    }
    // إرسال على دفعات (chunk) لتفادي الحجم الأقصى للـ BLE packet
    const CHUNK = 512;
    for (let i = 0; i < data.length; i += CHUNK) {
      await this.characteristic.writeValueWithoutResponse(
        new Uint8Array(data.slice(i, i + CHUNK))
      );
      await new Promise(r => setTimeout(r, 50));
    }
  }

  // ---- تحويل نص عربي إلى بيانات طباعة ----
  _encodeText(text) {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(text));
  }

  // ---- أوامر الطابعة ESC/POS ----
  _init()         { return [ESC, 0x40]; }
  _alignCenter()  { return [ESC, 0x61, 0x01]; }
  _alignRight()   { return [ESC, 0x61, 0x02]; }
  _alignLeft()    { return [ESC, 0x61, 0x00]; }
  _bold(on)       { return [ESC, 0x45, on ? 1 : 0]; }
  _doubleHeight() { return [GS,  0x21, 0x01]; }
  _normalSize()   { return [GS,  0x21, 0x00]; }
  _newLine(n = 1) { return Array(n).fill(0x0A); }
  _cut()          { return [GS,  0x56, 0x42, 0x00]; }
  _divider()      { return this._encodeText('--------------------------------\n'); }

  // ---- طباعة فاتورة كاملة ----
  async printInvoice(order) {
    if (!this.connected) await this.connect();

    const bytes = [
      ...this._init(),

      // Header
      ...this._alignCenter(),
      ...this._bold(true),
      ...this._doubleHeight(),
      ...this._encodeText('تطبيق العباسي\n'),
      ...this._normalSize(),
      ...this._bold(false),
      ...this._encodeText('سوبرماركت العائلة الأول\n'),
      ...this._divider(),

      // Order info
      ...this._alignRight(),
      ...this._encodeText(`رقم الطلب: #${order.id.slice(-6)}\n`),
      ...this._encodeText(`التاريخ: ${new Date().toLocaleDateString('ar-IQ')}\n`),
      ...this._encodeText(`الوقت: ${new Date().toLocaleTimeString('ar-IQ')}\n`),
      ...this._encodeText(`طريقة الدفع: ${order.paymentMethod === 'wallet' ? 'دفع إلكتروني' : 'اتصال وطلب'}\n`),
      ...this._divider(),

      // Items
      ...this._alignRight(),
      ...this._bold(true),
      ...this._encodeText('الصنف              الكمية    السعر\n'),
      ...this._bold(false),
      ...this._divider(),

      ...(order.items || []).flatMap(item => [
        ...this._encodeText(
          `${item.name.padEnd(16).slice(0,16)}  x${String(item.qty).padStart(2)}  ${(item.price * item.qty).toLocaleString('ar')} د.ع\n`
        ),
      ]),
      ...this._divider(),

      // Total
      ...this._bold(true),
      ...this._alignRight(),
      ...this._encodeText(`المجموع: ${(order.total || 0).toLocaleString('ar')} د.ع\n`),
      ...this._bold(false),
      ...this._divider(),

      // Footer
      ...this._alignCenter(),
      ...this._encodeText('شكراً لتسوقكم معنا\n'),
      ...this._encodeText('نتمنى لكم يوماً سعيداً\n'),
      ...this._newLine(3),
      ...this._cut(),
    ];

    await this._write(bytes);
    return true;
  }

  // ---- طباعة تقرير الوردية ----
  async printShiftReport(shift) {
    if (!this.connected) await this.connect();

    const bytes = [
      ...this._init(),
      ...this._alignCenter(),
      ...this._bold(true),
      ...this._doubleHeight(),
      ...this._encodeText('تقرير الوردية\n'),
      ...this._normalSize(),
      ...this._bold(false),
      ...this._encodeText('تطبيق العباسي\n'),
      ...this._divider(),
      ...this._alignRight(),
      ...this._encodeText(`الموظف: ${shift.staffName}\n`),
      ...this._encodeText(`بداية الوردية: ${shift.startTime}\n`),
      ...this._encodeText(`نهاية الوردية: ${shift.endTime}\n`),
      ...this._divider(),
      ...this._bold(true),
      ...this._encodeText(`إجمالي المبيعات: ${(shift.sales || 0).toLocaleString('ar')} د.ع\n`),
      ...this._encodeText(`عدد الطلبات: ${shift.ordersCount || 0}\n`),
      ...this._bold(false),
      ...this._divider(),
      ...this._alignCenter(),
      ...this._encodeText('توقيع الموظف: ___________\n'),
      ...this._newLine(3),
      ...this._cut(),
    ];

    await this._write(bytes);
    return true;
  }

  // ---- طباعة ملصق سعر ----
  async printPriceTag(product) {
    if (!this.connected) await this.connect();

    const bytes = [
      ...this._init(),
      ...this._alignCenter(),
      ...this._bold(true),
      ...this._doubleHeight(),
      ...this._encodeText(`${product.name}\n`),
      ...this._normalSize(),
      ...this._encodeText(`${(product.price || 0).toLocaleString('ar')} د.ع\n`),
      ...this._bold(false),
      ...this._encodeText(`${product.unit || ''}\n`),
      ...this._newLine(2),
      ...this._cut(),
    ];

    await this._write(bytes);
    return true;
  }

  // ---- طباعة HTML fallback (للمتصفح) ----
  static printHTMLInvoice(order) {
    const win = window.open('', '_blank', 'width=380,height=680');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8"/>
        <title>فاتورة #${order.id?.slice(-6)}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size:14px; padding:20px; direction:rtl; }
          .center { text-align:center; }
          .title { font-size:22px; font-weight:900; color:#f5a623; margin-bottom:4px; }
          .sub { font-size:12px; color:#888; margin-bottom:12px; }
          hr { border:none; border-top:1px dashed #ccc; margin:10px 0; }
          .row { display:flex; justify-content:space-between; padding:5px 0; font-size:13px; }
          .bold { font-weight:700; }
          .total { font-size:17px; font-weight:900; color:#f5a623; }
          .footer { text-align:center; color:#888; font-size:12px; margin-top:16px; }
          table { width:100%; border-collapse:collapse; margin:8px 0; }
          th { font-size:12px; color:#888; padding:5px 2px; border-bottom:1px solid #eee; }
          td { font-size:12px; padding:5px 2px; border-bottom:1px solid #f0f0f0; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="title">🛒 تطبيق العباسي</div>
          <div class="sub">سوبرماركت العائلة الأول</div>
        </div>
        <hr/>
        <div class="row"><span>رقم الطلب</span><span class="bold">#${order.id?.slice(-6)}</span></div>
        <div class="row"><span>التاريخ</span><span>${new Date().toLocaleDateString('ar-IQ')}</span></div>
        <div class="row"><span>طريقة الدفع</span><span>${order.paymentMethod === 'wallet' ? '💳 إلكتروني' : '📞 اتصال'}</span></div>
        <hr/>
        <table>
          <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr></thead>
          <tbody>
            ${(order.items || []).map(i => `
              <tr>
                <td>${i.name}</td>
                <td class="center">×${i.qty}</td>
                <td>${(i.price * i.qty).toLocaleString('ar')} د.ع</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <hr/>
        <div class="row"><span class="bold">الإجمالي</span><span class="total">${(order.total || 0).toLocaleString('ar')} د.ع</span></div>
        <div class="footer">
          <p>شكراً لتسوقكم معنا 🙏</p>
          <p style="margin-top:4px;">نتمنى لكم يوماً سعيداً</p>
        </div>
        <script>setTimeout(() => window.print(), 400);</script>
      </body>
      </html>
    `);
    win.document.close();
  }
}

export const printerService = new PrinterService();
export default printerService;
