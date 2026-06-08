# 🛒 تطبيق العباسي — Al-Abbasi Supermarket App

تطبيق سوبرماركت هجين (Hybrid App) مبني بـ Capacitor + Vanilla JS + Firebase

---

## 🗂️ هيكل المشروع

```
al-abbasi-app/
├── .github/
│   └── workflows/
│       └── android-build.yml       ← أتمتة البناء CI/CD
├── android/                         ← مجلد Capacitor Android (يُنشأ بـ cap add android)
├── src/
│   ├── main.js                      ← نقطة الدخول + التوجيه
│   ├── screens/
│   │   ├── login.screen.js          ← شاشة الدخول المزدوجة
│   │   ├── customer.screen.js       ← واجهة العملاء
│   │   └── admin.screen.js          ← لوحة تحكم الإدارة
│   ├── services/
│   │   ├── firebase-config.js       ← إعداد Firebase + Offline
│   │   ├── auth.service.js          ← مصادقة العملاء والإدارة
│   │   └── store.service.js         ← قاعدة البيانات (منتجات، طلبات، ...)
│   ├── utils/
│   │   └── crypto.utils.js          ← تشفير بيانات الإدارة المحلية
│   └── styles/
│       └── main.css                 ← نظام التصميم الكامل
├── index.html                       ← الصفحة الرئيسية
├── vite.config.js
├── tailwind.config.js
├── capacitor.config.json
├── firestore.rules                  ← قواعد أمان Firestore
├── storage.rules                    ← قواعد أمان Storage
├── seed.js                          ← بيانات أولية للمنتجات والوصفات
└── package.json
```

---

## ⚙️ خطوات الإعداد

### 1. تثبيت الحزم
```bash
npm install
```

### 2. إعداد Firebase
- أنشئ مشروعاً في [Firebase Console](https://console.firebase.google.com)
- فعّل: **Firestore**, **Authentication (Google + Email)**, **Storage**
- انسخ إعدادات المشروع إلى `src/services/firebase-config.js`
- ارفع قواعد الأمان:
```bash
firebase deploy --only firestore:rules,storage:rules
```

### 3. إضافة بيانات أولية (اختياري)
```bash
node seed.js
```

### 4. تشغيل التطوير
```bash
npm run dev
```

### 5. بناء ومزامنة Android
```bash
npm run build
npx cap add android        # مرة واحدة فقط
npx cap sync android
npx cap open android       # يفتح Android Studio
```

---

## 🔐 بيانات الدخول الافتراضية

| النوع | اسم المستخدم | كلمة المرور |
|-------|-------------|-------------|
| مالك/آدمن | `alsarem` | `12345678` |

> يمكن تغييرها من داخل التطبيق ← شاشة الدخول ← الإدارة ← تغيير البيانات

---

## 🚀 أتمتة البناء (CI/CD)

يتم البناء تلقائياً عند كل `push` على فرع `main`:
- ✅ بناء الويب (Vite)
- ✅ مزامنة Capacitor
- ✅ بناء APK (Debug)
- ✅ رفع APK كـ Artifact

---

## ✨ الميزات

### للعملاء
- 🔐 دخول عبر Google أو البريد الإلكتروني
- 🛒 تصفح وشراء المنتجات
- 🎙️ بحث صوتي
- 🖼️ بانرات إعلانية متحركة
- 🍳 تسوق بالوصفة (إضافة كل مقاضي الوصفة دفعة واحدة)
- ⭐ نظام نقاط الولاء
- 👨‍👩‍👧 الوضع العائلي (مشاركة السلة)
- 🌙 وضع ليلي / نهاري
- 📴 يعمل بدون إنترنت (Offline-First)

### للإدارة والموظفين
- 📊 لوحة تحكم مع إحصائيات لحظية
- 📦 إدارة كاملة للمنتجات (إضافة/تعديل/حذف + صور)
- 🛒 متابعة الطلبات وتغيير حالتها
- 🖼️ رفع الإعلانات والبانرات
- 👥 إدارة الموظفين والصلاحيات
- 📈 تقارير مبيعات + تصدير Excel/PDF
- 📷 قارئ باركود عبر الكاميرا
- 🕒 إدارة الورديات
- 🖨️ طباعة الفواتير
- 🔔 إشعارات لحظية (نقص مخزون، طلبات جديدة)
- 📴 يعمل بدون إنترنت (بيانات الدخول والعمليات تُحفظ محلياً)
