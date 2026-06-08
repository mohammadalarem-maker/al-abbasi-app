// main.js — نقطة دخول التطبيق الرئيسية
import { renderLoginScreen } from './screens/login.screen.js';
import { CustomerScreen } from './screens/customer.screen.js';
import { AdminScreen } from './screens/admin.screen.js';
import { getAdminSession, onCustomerAuthChange, initAdminCredentials } from './services/auth.service.js';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';

// ============================================
// APP INIT
// ============================================
class AlAbbasiApp {
  constructor() {
    this.currentScreen = null;
    this.authUnsubscribe = null;
  }

  async boot() {
    // Setup status bar
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0d1520' });
    } catch (e) {}

    // Init admin default credentials
    await initAdminCredentials();

    // Show splash for minimum 2s
    await this.showSplash();

    // Check existing sessions
    await this.checkSessions();

    // Handle hardware back button
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) App.exitApp();
    });
  }

  async showSplash() {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const splash = document.getElementById('splash');
        const appEl = document.getElementById('app');
        if (splash) {
          splash.classList.add('fade-out');
          setTimeout(() => {
            splash.style.display = 'none';
            appEl.classList.remove('hidden');
          }, 500);
        }
        resolve();
      }, 2200);
    });
  }

  async checkSessions() {
    // Check admin session first (offline)
    const adminSession = await getAdminSession();
    if (adminSession) {
      this.showAdmin(adminSession);
      return;
    }

    // Then check Firebase customer auth
    this.authUnsubscribe = onCustomerAuthChange((user) => {
      if (user && this.currentScreen !== 'customer') {
        this.showCustomer(user);
      } else if (!user && this.currentScreen !== 'login' && this.currentScreen !== 'admin') {
        this.showLogin();
      }
    });

    // Default to login if no session found after short delay
    setTimeout(() => {
      if (!this.currentScreen) this.showLogin();
    }, 1500);
  }

  showLogin() {
    this.currentScreen = 'login';
    this.hideAllScreens();
    const container = document.getElementById('screen-login');
    container.classList.remove('hidden');
    renderLoginScreen(
      container,
      (user) => this.showCustomer(user),
      (admin) => this.showAdmin(admin)
    );
  }

  showCustomer(user) {
    this.currentScreen = 'customer';
    this.hideAllScreens();
    const container = document.getElementById('screen-customer');
    container.classList.remove('hidden');
    if (window._customerScreen) window._customerScreen.destroy();
    new CustomerScreen(container, user, () => this.showLogin());
  }

  showAdmin(admin) {
    this.currentScreen = 'admin';
    this.hideAllScreens();
    const container = document.getElementById('screen-admin');
    container.classList.remove('hidden');
    if (window._adminScreen) window._adminScreen.destroy();
    new AdminScreen(container, admin, () => this.showLogin());
  }

  hideAllScreens() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  }
}

// Boot the app
const app = new AlAbbasiApp();
app.boot();
