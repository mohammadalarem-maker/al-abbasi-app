// loyalty.component.js — مكون برنامج الولاء والمكافآت
import { db } from '../services/firebase-config.js';
import {
  doc, getDoc, updateDoc, collection, getDocs,
  query, orderBy, where, serverTimestamp, addDoc, increment
} from 'firebase/firestore';

const REWARDS = [
  { id: 'r1', points: 500,  title: 'خصم 5%',       icon: '🎫', description: 'خصم 5% على طلبك التالي',         type: 'discount', value: 5 },
  { id: 'r2', points: 1000, title: 'توصيل مجاني',   icon: '🚚', description: 'توصيل مجاني لمرة واحدة',         type: 'free_delivery' },
  { id: 'r3', points: 1500, title: 'هدية مفاجئة',   icon: '🎁', description: 'اختر منتجاً مجانياً حتى 5000 د.ع', type: 'free_product' },
  { id: 'r4', points: 3000, title: 'خصم 15%',       icon: '💰', description: 'خصم 15% على طلبك التالي',         type: 'discount', value: 15 },
  { id: 'r5', points: 5000, title: 'عضوية ذهبية',   icon: '👑', description: 'عضوية VIP لشهر كامل',             type: 'vip' },
];

const TIERS = [
  { name: 'فضي',  min: 0,    max: 999,  icon: '🥈', color: '#aaa' },
  { name: 'ذهبي', min: 1000, max: 4999, icon: '🥇', color: '#f5a623' },
  { name: 'بلاتيني', min: 5000, max: 14999, icon: '💎', color: '#4a9eff' },
  { name: 'ماسي',  min: 15000, max: Infinity, icon: '💠', color: '#00c48c' },
];

export class LoyaltyComponent {
  constructor(containerId, userId) {
    this.containerId = containerId;
    this.userId = userId;
    this.userData = null;
  }

  async load() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;padding:40px;">
        <div class="loader-inline" style="width:30px;height:30px;border-width:3px;"></div>
      </div>
    `;

    try {
      const snap = await getDoc(doc(db, 'customers', this.userId));
      this.userData = snap.exists() ? snap.data() : { loyaltyPoints: 0, totalOrders: 0 };
    } catch (e) {
      this.userData = { loyaltyPoints: 0, totalOrders: 0 };
    }

    this.render(container);
  }

  render(container) {
    const pts = this.userData.loyaltyPoints || 0;
    const tier = TIERS.find(t => pts >= t.min && pts <= t.max) || TIERS[0];
    const nextTier = TIERS[TIERS.indexOf(tier) + 1];
    const progress = nextTier
      ? Math.min(100, ((pts - tier.min) / (nextTier.min - tier.min)) * 100)
      : 100;

    container.innerHTML = `
      <!-- Hero points card -->
      <div style="margin-bottom:16px;padding:20px;background:linear-gradient(135deg,#1a2f4a,var(--c-card));border-radius:var(--r-xl);border:1px solid var(--c-border);text-align:center;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;border-radius:50%;background:radial-gradient(circle,rgba(245,166,35,0.15),transparent);"></div>
        <div style="font-size:48px;margin-bottom:8px;">${tier.icon}</div>
        <div style="font-size:13px;font-weight:700;color:${tier.color};margin-bottom:4px;">${tier.name} عضو</div>
        <div style="font-size:44px;font-weight:900;background:linear-gradient(135deg,#f5a623,#ffe08a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
          ${pts.toLocaleString('ar')}
        </div>
        <div style="font-size:14px;color:var(--c-muted);margin-bottom:16px;">نقطة</div>

        ${nextTier ? `
          <div style="text-align:right;margin-bottom:6px;font-size:11px;color:var(--c-muted);">
            ${(nextTier.min - pts).toLocaleString('ar')} نقطة للوصول إلى ${nextTier.icon} ${nextTier.name}
          </div>
          <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:99px;overflow:hidden;">
            <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#f5a623,#ffe08a);border-radius:99px;transition:width 1s ease;"></div>
          </div>
        ` : `
          <div style="font-size:12px;color:var(--c-gold);">🎉 أنت في أعلى مستوى!</div>
        `}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;">
          <div style="padding:10px;background:rgba(0,0,0,0.2);border-radius:var(--r-md);text-align:center;">
            <div style="font-size:18px;font-weight:900;color:var(--c-gold);">${this.userData.totalOrders || 0}</div>
            <div style="font-size:10px;color:var(--c-muted);">إجمالي الطلبات</div>
          </div>
          <div style="padding:10px;background:rgba(0,0,0,0.2);border-radius:var(--r-md);text-align:center;">
            <div style="font-size:18px;font-weight:900;color:var(--c-green);">${Math.floor(pts / 100)}</div>
            <div style="font-size:10px;color:var(--c-muted);">نقاط هذا الشهر</div>
          </div>
        </div>
      </div>

      <!-- How to earn -->
      <div style="margin-bottom:16px;padding:14px;background:var(--c-card);border-radius:var(--r-lg);border:1px solid var(--c-border);">
        <div style="font-size:13px;font-weight:700;margin-bottom:10px;">💡 كيف تكسب النقاط؟</div>
        ${[
          { icon:'🛒', text:'كل 1000 د.ع تسوق = 1 نقطة' },
          { icon:'⭐', text:'أول طلب = 50 نقطة إضافية' },
          { icon:'👥', text:'دعوة صديق = 100 نقطة' },
          { icon:'📅', text:'تسوق أسبوعي = 20 نقطة إضافية' },
        ].map(i => `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
            <span style="font-size:18px;">${i.icon}</span>
            <span style="font-size:12px;color:var(--c-muted);">${i.text}</span>
          </div>
        `).join('')}
      </div>

      <!-- Rewards catalog -->
      <div style="font-size:14px;font-weight:700;margin-bottom:10px;">🎁 استبدال النقاط</div>
      ${REWARDS.map(r => {
        const canRedeem = pts >= r.points;
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--c-card);border-radius:var(--r-lg);border:1px solid ${canRedeem ? 'rgba(245,166,35,0.3)' : 'var(--c-border)'};margin-bottom:10px;opacity:${canRedeem ? 1 : 0.6};">
            <div style="font-size:32px;flex-shrink:0;">${r.icon}</div>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;">${r.title}</div>
              <div style="font-size:11px;color:var(--c-muted);margin-top:2px;">${r.description}</div>
              <div style="font-size:12px;font-weight:700;color:var(--c-gold);margin-top:4px;">⭐ ${r.points.toLocaleString('ar')} نقطة</div>
            </div>
            <button onclick="window._loyaltyComp.redeem('${r.id}')"
              style="padding:8px 14px;border-radius:10px;border:none;font-family:var(--ff-ar);font-size:12px;font-weight:700;cursor:${canRedeem ? 'pointer' : 'not-allowed'};
              background:${canRedeem ? 'linear-gradient(135deg,#f5a623,#c4831a)' : 'var(--c-border)'};
              color:${canRedeem ? '#fff' : 'var(--c-muted)'};">
              ${canRedeem ? 'استبدال' : 'قريباً'}
            </button>
          </div>
        `;
      }).join('')}

      <!-- Transaction history -->
      <div style="font-size:14px;font-weight:700;margin:16px 0 10px;">📜 سجل النقاط</div>
      <div id="loyalty-history" style="padding:14px;background:var(--c-card);border-radius:var(--r-lg);border:1px solid var(--c-border);">
        <div style="text-align:center;color:var(--c-muted);padding:20px;font-size:13px;">
          جاري تحميل السجل...
        </div>
      </div>
    `;

    window._loyaltyComp = this;
    this.loadHistory();
  }

  async loadHistory() {
    const histEl = document.getElementById('loyalty-history');
    if (!histEl) return;
    try {
      const q = query(
        collection(db, 'loyaltyTransactions'),
        where('userId', '==', this.userId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const txs = snap.docs.map(d => d.data());
      if (!txs.length) {
        histEl.innerHTML = '<div style="text-align:center;color:var(--c-muted);padding:16px;font-size:13px;">لا يوجد سجل بعد</div>';
        return;
      }
      histEl.innerHTML = txs.map(tx => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--c-border);">
          <div style="font-size:12px;">${tx.description}</div>
          <div style="font-size:13px;font-weight:700;color:${tx.points > 0 ? 'var(--c-green)' : 'var(--c-red)'};">
            ${tx.points > 0 ? '+' : ''}${tx.points} نقطة
          </div>
        </div>
      `).join('');
    } catch (e) {
      histEl.innerHTML = '<div style="text-align:center;color:var(--c-muted);padding:16px;font-size:13px;">تعذّر تحميل السجل</div>';
    }
  }

  async redeem(rewardId) {
    const reward = REWARDS.find(r => r.id === rewardId);
    if (!reward) return;
    const pts = this.userData.loyaltyPoints || 0;
    if (pts < reward.points) {
      alert(`تحتاج ${reward.points - pts} نقطة إضافية لاستبدال هذه المكافأة`);
      return;
    }
    if (!confirm(`هل تريد استبدال ${reward.points.toLocaleString('ar')} نقطة بـ "${reward.title}"؟`)) return;

    try {
      // Deduct points
      await updateDoc(doc(db, 'customers', this.userId), {
        loyaltyPoints: increment(-reward.points),
      });

      // Log transaction
      await addDoc(collection(db, 'loyaltyTransactions'), {
        userId: this.userId,
        rewardId,
        points: -reward.points,
        description: `استبدال: ${reward.title}`,
        createdAt: serverTimestamp(),
      });

      // Save redeemed coupon
      await addDoc(collection(db, 'coupons'), {
        userId: this.userId,
        rewardId,
        rewardTitle: reward.title,
        rewardType: reward.type,
        rewardValue: reward.value || null,
        used: false,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      this.userData.loyaltyPoints = pts - reward.points;
      alert(`🎉 تهانينا! تم استبدال ${reward.points} نقطة بـ "${reward.title}"\nسيتم تطبيقها على طلبك القادم.`);
      this.load();
    } catch (e) {
      alert('حدث خطأ. يرجى المحاولة مجدداً.');
    }
  }
}

export default LoyaltyComponent;
