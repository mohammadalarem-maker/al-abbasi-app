// seed.js — سكريبت البيانات الأولية
// Run: node seed.js (after setting FIREBASE_PROJECT_ID in env)
// Or use Firebase Console to import this data manually

const SEED_PRODUCTS = [
  // فواكه
  { name: 'تفاح أحمر', category: 'fruits', price: 5000, stock: 50, unit: 'كيلو', icon: '🍎', barcode: '6901111000001' },
  { name: 'موز', category: 'fruits', price: 3500, stock: 40, unit: 'كيلو', icon: '🍌', barcode: '6901111000002' },
  { name: 'برتقال', category: 'fruits', price: 4000, stock: 35, unit: 'كيلو', icon: '🍊', barcode: '6901111000003' },
  { name: 'عنب أخضر', category: 'fruits', price: 7000, stock: 20, unit: 'كيلو', icon: '🍇', barcode: '6901111000004' },
  { name: 'رمان', category: 'fruits', price: 8000, stock: 15, unit: 'كيلو', icon: '🍎', barcode: '6901111000005' },

  // خضروات
  { name: 'طماطم', category: 'vegetables', price: 2500, stock: 60, unit: 'كيلو', icon: '🍅', barcode: '6901111000010' },
  { name: 'خيار', category: 'vegetables', price: 2000, stock: 45, unit: 'كيلو', icon: '🥒', barcode: '6901111000011' },
  { name: 'بطاطا', category: 'vegetables', price: 3000, stock: 80, unit: 'كيلو', icon: '🥔', barcode: '6901111000012' },
  { name: 'بصل', category: 'vegetables', price: 2000, stock: 70, unit: 'كيلو', icon: '🧅', barcode: '6901111000013' },
  { name: 'ثوم', category: 'vegetables', price: 1500, stock: 50, unit: '250 غرام', icon: '🧄', barcode: '6901111000014' },

  // لحوم
  { name: 'دجاج كامل', category: 'meat', price: 12000, stock: 30, unit: 'كيلو', icon: '🍗', barcode: '6901111000020' },
  { name: 'لحم بقر مفروم', category: 'meat', price: 18000, stock: 25, unit: 'كيلو', icon: '🥩', barcode: '6901111000021' },
  { name: 'سمك مشوي', category: 'meat', price: 15000, stock: 20, unit: 'كيلو', icon: '🐟', barcode: '6901111000022' },

  // ألبان
  { name: 'حليب طازج', category: 'dairy', price: 3000, stock: 40, unit: 'لتر', icon: '🥛', barcode: '6901111000030' },
  { name: 'لبنة', category: 'dairy', price: 4500, stock: 30, unit: '500 غرام', icon: '🧀', barcode: '6901111000031' },
  { name: 'زبادي', category: 'dairy', price: 2500, stock: 35, unit: '4 حبات', icon: '🥛', barcode: '6901111000032' },
  { name: 'جبن أبيض', category: 'dairy', price: 8000, stock: 25, unit: 'كيلو', icon: '🧀', barcode: '6901111000033' },

  // مخبوزات
  { name: 'خبز صمون', category: 'bakery', price: 1000, stock: 100, unit: '6 حبات', icon: '🍞', barcode: '6901111000040' },
  { name: 'خبز توست', category: 'bakery', price: 2500, stock: 50, unit: 'ربطة', icon: '🍞', barcode: '6901111000041' },
  { name: 'كعك بالزعتر', category: 'bakery', price: 3500, stock: 30, unit: 'كيلو', icon: '🫓', barcode: '6901111000042' },

  // مشروبات
  { name: 'ماء معدني', category: 'beverages', price: 500, stock: 200, unit: '1.5 لتر', icon: '💧', barcode: '6901111000050' },
  { name: 'عصير برتقال', category: 'beverages', price: 2000, stock: 60, unit: '1 لتر', icon: '🧃', barcode: '6901111000051' },
  { name: 'كولا 350مل', category: 'beverages', price: 1500, stock: 100, unit: '350 مل', icon: '🥤', barcode: '6901111000052' },
  { name: 'شاي أحمر', category: 'beverages', price: 5000, stock: 40, unit: '100 كيس', icon: '🍵', barcode: '6901111000053' },

  // سناكس
  { name: 'شيبس', category: 'snacks', price: 1500, stock: 80, unit: 'كيس', icon: '🍟', barcode: '6901111000060' },
  { name: 'شوكولاتة', category: 'snacks', price: 3000, stock: 50, unit: 'حبة', icon: '🍫', barcode: '6901111000061' },
  { name: 'بسكويت', category: 'snacks', price: 2000, stock: 60, unit: 'علبة', icon: '🍪', barcode: '6901111000062' },

  // منزلية
  { name: 'صابون سائل', category: 'household', price: 4000, stock: 35, unit: '500 مل', icon: '🧴', barcode: '6901111000070' },
  { name: 'معجون أسنان', category: 'household', price: 3500, stock: 40, unit: 'أنبوب', icon: '🪥', barcode: '6901111000071' },
  { name: 'شامبو', category: 'household', price: 6000, stock: 25, unit: '400 مل', icon: '🧴', barcode: '6901111000072' },
];

const SEED_RECIPES = [
  {
    name: 'دجاج مشوي',
    icon: '🍗',
    ingredients: [
      { name: 'دجاج كامل', qty: 1 },
      { name: 'ثوم', qty: 0.25 },
      { name: 'طماطم', qty: 0.5 },
    ],
  },
  {
    name: 'سلطة خضراء',
    icon: '🥗',
    ingredients: [
      { name: 'خيار', qty: 0.5 },
      { name: 'طماطم', qty: 0.5 },
      { name: 'بصل', qty: 0.25 },
    ],
  },
  {
    name: 'إفطار كامل',
    icon: '🍳',
    ingredients: [
      { name: 'خبز توست', qty: 1 },
      { name: 'لبنة', qty: 1 },
      { name: 'جبن أبيض', qty: 0.25 },
      { name: 'زبادي', qty: 1 },
    ],
  },
];

module.exports = { SEED_PRODUCTS, SEED_RECIPES };

/*
  للتشغيل اليدوي عبر Firebase Admin SDK:

  const admin = require('firebase-admin');
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const { SEED_PRODUCTS, SEED_RECIPES } = require('./seed.js');

  async function seed() {
    const batch = db.batch();
    SEED_PRODUCTS.forEach(p => {
      const ref = db.collection('products').doc();
      batch.set(ref, { ...p, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    SEED_RECIPES.forEach(r => {
      const ref = db.collection('recipes').doc();
      batch.set(ref, { ...r, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
    console.log('✅ Seed complete!');
  }
  seed();
*/
