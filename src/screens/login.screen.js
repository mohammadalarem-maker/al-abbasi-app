// login.screen.js — شاشة الدخول المزدوجة
import {
  adminLogin, getAdminSession,
  customerGoogleLogin, customerEmailLogin, customerEmailRegister,
  updateAdminCredentials
} from '../services/auth.service.js';

export function renderLoginScreen(container, onCustomerLogin, onAdminLogin) {
  container.innerHTML = `
    <div style="background: var(--c-bg); min-height: 100vh; overflow-y: auto; display: flex; flex-direction: column;">
      
      <!-- Hero -->
      <div class="login-hero">
        <div class="login-logo-wrap">
          <div class="login-logo-badge">🛒</div>
          <div class="login-app-name">تطبيق العباسي</div>
          <div class="login-tagline">سوبرماركت العائلة الأول</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="login-tabs" style="margin: 0 24px 0;">
        <button class="login-tab active" id="tab-customer" onclick="switchTab('customer')">
          🛍️ دخول العملاء
        </button>
        <button class="login-tab" id="tab-admin" onclick="switchTab('admin')">
          ⚙️ الإدارة والموظفين
        </button>
      </div>

      <!-- Customer Panel -->
      <div class="login-panel active" id="panel-customer">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 14px; color: var(--c-muted);">مرحباً بك! سجّل دخولك للتسوق بسهولة</div>
        </div>
        
        <!-- Google Login -->
        <button class="btn btn-google" id="btn-google-login" style="margin-bottom: 12px;">
          <img src="https://www.google.com/favicon.ico" width="18" height="18" style="border-radius: 50%;" />
          متابعة مع Google
        </button>
        
        <div class="divider-text">أو سجّل بالبريد الإلكتروني</div>

        <!-- Email Tabs -->
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          <button class="btn btn-ghost" id="btn-show-login" onclick="showEmailMode('login')"
            style="flex: 1; padding: 10px; font-size: 13px; border-radius: var(--r-md);">
            دخول
          </button>
          <button class="btn btn-ghost" id="btn-show-register" onclick="showEmailMode('register')"
            style="flex: 1; padding: 10px; font-size: 13px; border-radius: var(--r-md);">
            حساب جديد
          </button>
        </div>

        <!-- Login Form -->
        <div id="form-login">
          <div class="form-group">
            <label class="form-label">البريد الإلكتروني</label>
            <div class="input-icon-wrap">
              <span class="input-icon">📧</span>
              <input type="email" class="form-input" id="c-email" placeholder="example@email.com" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">كلمة المرور</label>
            <div class="input-icon-wrap">
              <span class="input-icon">🔒</span>
              <input type="password" class="form-input" id="c-password" placeholder="كلمة المرور" />
            </div>
          </div>
          <button class="btn btn-gold" id="btn-email-login">
            <span>دخول</span>
          </button>
        </div>

        <!-- Register Form -->
        <div id="form-register" class="hidden">
          <div class="form-group">
            <label class="form-label">الاسم الكامل</label>
            <div class="input-icon-wrap">
              <span class="input-icon">👤</span>
              <input type="text" class="form-input" id="r-name" placeholder="محمد أحمد" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">البريد الإلكتروني</label>
            <div class="input-icon-wrap">
              <span class="input-icon">📧</span>
              <input type="email" class="form-input" id="r-email" placeholder="example@email.com" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">كلمة المرور</label>
            <div class="input-icon-wrap">
              <span class="input-icon">🔒</span>
              <input type="password" class="form-input" id="r-password" placeholder="8 أحرف على الأقل" />
            </div>
          </div>
          <button class="btn btn-green" id="btn-email-register">
            <span>إنشاء حساب</span>
          </button>
        </div>

        <div id="customer-error" class="hidden" style="color: var(--c-red); font-size: 13px; text-align: center; margin-top: 12px; padding: 10px; background: rgba(255,77,106,0.1); border-radius: var(--r-md);"></div>
      </div>

      <!-- Admin Panel -->
      <div class="login-panel hidden" id="panel-admin">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 14px; color: var(--c-muted);">يعمل بدون إنترنت ✓</div>
        </div>

        <div class="form-group">
          <label class="form-label">اسم المستخدم</label>
          <div class="input-icon-wrap">
            <span class="input-icon">👤</span>
            <input type="text" class="form-input" id="a-username" placeholder="alsarem" autocomplete="username" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">كلمة المرور</label>
          <div class="input-icon-wrap">
            <span class="input-icon">🔑</span>
            <input type="password" class="form-input" id="a-password" placeholder="••••••••" autocomplete="current-password" />
          </div>
        </div>

        <button class="btn btn-gold" id="btn-admin-login" style="margin-bottom: 12px;">
          <span>دخول لوحة التحكم</span>
        </button>

        <!-- Change credentials toggle -->
        <button class="btn btn-ghost" onclick="toggleChangeCredentials()" style="font-size: 13px;">
          🔧 تغيير بيانات الدخول
        </button>
        
        <div id="change-credentials-form" class="hidden" style="margin-top: 16px; padding: 16px; background: var(--c-card); border-radius: var(--r-lg); border: 1px solid var(--c-border);">
          <div style="font-size: 13px; font-weight: 700; margin-bottom: 12px; color: var(--c-gold);">🔒 تغيير بيانات الإدارة</div>
          <div class="form-group">
            <label class="form-label">كلمة المرور الحالية</label>
            <input type="password" class="form-input" id="ch-current" placeholder="كلمة المرور الحالية" />
          </div>
          <div class="form-group">
            <label class="form-label">اسم المستخدم الجديد</label>
            <input type="text" class="form-input" id="ch-username" />
          </div>
          <div class="form-group">
            <label class="form-label">كلمة المرور الجديدة</label>
            <input type="password" class="form-input" id="ch-password" />
          </div>
          <button class="btn btn-green" id="btn-change-creds" style="font-size: 13px; padding: 10px;">
            حفظ البيانات الجديدة
          </button>
          <div id="change-success" class="hidden" style="color: var(--c-green); font-size: 12px; text-align: center; margin-top: 8px;">
            ✅ تم تغيير البيانات بنجاح
          </div>
        </div>

        <div id="admin-error" class="hidden" style="color: var(--c-red); font-size: 13px; text-align: center; margin-top: 12px; padding: 10px; background: rgba(255,77,106,0.1); border-radius: var(--r-md);"></div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 20px; color: var(--c-muted); font-size: 12px;">
        تطبيق العباسي © 2024 — جميع الحقوق محفوظة
      </div>
    </div>
  `;

  // ---- Tab switching ----
  window.switchTab = (tab) => {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.login-panel').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
    document.getElementById(`tab-${tab}`).classList.add('active');
    const panel = document.getElementById(`panel-${tab}`);
    panel.classList.remove('hidden'); panel.classList.add('active');
  };

  window.showEmailMode = (mode) => {
    const isLogin = mode === 'login';
    document.getElementById('form-login').classList.toggle('hidden', !isLogin);
    document.getElementById('form-register').classList.toggle('hidden', isLogin);
    document.getElementById('btn-show-login').style.background = isLogin ? 'var(--c-gold)' : '';
    document.getElementById('btn-show-login').style.color = isLogin ? '#fff' : '';
    document.getElementById('btn-show-register').style.background = !isLogin ? 'var(--c-gold)' : '';
    document.getElementById('btn-show-register').style.color = !isLogin ? '#fff' : '';
  };

  window.toggleChangeCredentials = () => {
    const f = document.getElementById('change-credentials-form');
    f.classList.toggle('hidden');
  };

  // ---- Google Login ----
  document.getElementById('btn-google-login').addEventListener('click', async () => {
    setLoading('btn-google-login', true);
    const result = await customerGoogleLogin();
    setLoading('btn-google-login', false);
    if (result.success) onCustomerLogin(result.user);
    else showError('customer-error', result.error);
  });

  // ---- Email Login ----
  document.getElementById('btn-email-login').addEventListener('click', async () => {
    const email = document.getElementById('c-email').value.trim();
    const password = document.getElementById('c-password').value;
    if (!email || !password) return showError('customer-error', 'الرجاء إدخال البريد وكلمة المرور');
    setLoading('btn-email-login', true);
    const result = await customerEmailLogin(email, password);
    setLoading('btn-email-login', false);
    if (result.success) onCustomerLogin(result.user);
    else showError('customer-error', result.error);
  });

  // ---- Email Register ----
  document.getElementById('btn-email-register').addEventListener('click', async () => {
    const name = document.getElementById('r-name').value.trim();
    const email = document.getElementById('r-email').value.trim();
    const password = document.getElementById('r-password').value;
    if (!name || !email || !password) return showError('customer-error', 'الرجاء إكمال جميع الحقول');
    if (password.length < 8) return showError('customer-error', 'كلمة المرور يجب أن تكون 8 أحرف أو أكثر');
    setLoading('btn-email-register', true);
    const result = await customerEmailRegister(email, password, name);
    setLoading('btn-email-register', false);
    if (result.success) onCustomerLogin(result.user);
    else showError('customer-error', result.error);
  });

  // ---- Admin Login ----
  document.getElementById('btn-admin-login').addEventListener('click', async () => {
    const username = document.getElementById('a-username').value.trim();
    const password = document.getElementById('a-password').value;
    if (!username || !password) return showError('admin-error', 'الرجاء إدخال اسم المستخدم وكلمة المرور');
    setLoading('btn-admin-login', true);
    const result = await adminLogin(username, password);
    setLoading('btn-admin-login', false);
    if (result.success) onAdminLogin(result.user);
    else showError('admin-error', result.error);
  });

  // Enter key support
  document.getElementById('a-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-admin-login').click();
  });

  // ---- Change credentials ----
  document.getElementById('btn-change-creds').addEventListener('click', async () => {
    const current = document.getElementById('ch-current').value;
    const newUser = document.getElementById('ch-username').value.trim();
    const newPass = document.getElementById('ch-password').value;
    if (!current || !newUser || !newPass) return;
    if (newPass.length < 6) return showError('admin-error', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    const result = await updateAdminCredentials(newUser, newPass, current);
    if (result.success) {
      document.getElementById('change-success').classList.remove('hidden');
      setTimeout(() => document.getElementById('change-success').classList.add('hidden'), 3000);
    } else {
      showError('admin-error', result.error);
    }
  });

  showEmailMode('login');
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="loader-inline"></span>`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
  }
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}
