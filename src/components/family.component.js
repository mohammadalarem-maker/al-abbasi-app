// family.component.js — مكون الوضع العائلي
import { db } from '../services/firebase-config.js';
import {
  doc, getDoc, updateDoc, onSnapshot,
  arrayUnion, arrayRemove, serverTimestamp
} from 'firebase/firestore';
import { createFamilyGroup, joinFamilyGroup } from '../services/store.service.js';

export class FamilyComponent {
  constructor(containerId, userId) {
    this.containerId = containerId;
    this.userId = userId;
    this.groupId = null;
    this.unsubscribe = null;
  }

  async load() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Load user's family group
    try {
      const snap = await getDoc(doc(db, 'customers', this.userId));
      this.groupId = snap.data()?.familyGroupId || null;
    } catch (e) {}

    this.render(container);
  }

  render(container) {
    container.innerHTML = `
      <div style="padding-bottom:20px;">
        ${this.groupId ? this._renderGroupView() : this._renderJoinView()}
      </div>
    `;
    window._familyComp = this;
    if (this.groupId) this._watchGroup();
  }

  _renderJoinView() {
    return `
      <!-- Header -->
      <div style="text-align:center;padding:24px 0;margin-bottom:16px;">
        <div style="font-size:56px;margin-bottom:12px;">👨‍👩‍👧‍👦</div>
        <div style="font-size:18px;font-weight:900;margin-bottom:6px;">الوضع العائلي</div>
        <div style="font-size:13px;color:var(--c-muted);line-height:1.6;">
          تسوقوا معاً! شارك سلة المشتريات مع أفراد عائلتك وأضيفوا المنتجات بشكل مشترك
        </div>
      </div>

      <!-- Benefits -->
      <div style="margin-bottom:20px;padding:14px;background:var(--c-card);border-radius:var(--r-lg);border:1px solid var(--c-border);">
        <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--c-gold);">✨ مميزات الوضع العائلي</div>
        ${[
          { icon:'🛒', text:'سلة مشتركة بين جميع أفراد العائلة' },
          { icon:'🔔', text:'إشعار فوري عند إضافة منتج' },
          { icon:'👀', text:'كل فرد يرى ما أضافه الآخرون' },
          { icon:'💰', text:'نقاط ولاء مشتركة ومضاعفة' },
        ].map(b => `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;">
            <span style="font-size:18px;">${b.icon}</span>
            <span style="font-size:12px;color:var(--c-muted);">${b.text}</span>
          </div>
        `).join('')}
      </div>

      <!-- Actions -->
      <button onclick="window._familyComp.createGroup()"
        style="width:100%;padding:14px;background:linear-gradient(135deg,#f5a623,#c4831a);color:#fff;border:none;border-radius:var(--r-lg);font-family:var(--ff-ar);font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;box-shadow:0 4px 20px rgba(245,166,35,0.3);">
        👑 إنشاء مجموعة عائلية جديدة
      </button>

      <div style="text-align:center;color:var(--c-muted);font-size:12px;margin:10px 0;">— أو —</div>

      <div style="padding:14px;background:var(--c-card);border-radius:var(--r-lg);border:1px solid var(--c-border);">
        <div style="font-size:12px;font-weight:600;color:var(--c-muted);margin-bottom:8px;">انضم لمجموعة عائلية موجودة</div>
        <input id="fam-code-input" type="text"
          style="width:100%;padding:12px 14px;background:var(--c-surface);border:1px solid var(--c-border);border-radius:12px;color:var(--c-text);font-family:var(--ff-ar);font-size:14px;outline:none;margin-bottom:8px;text-align:center;letter-spacing:4px;"
          placeholder="أدخل رمز الدعوة"
          maxlength="20" />
        <button onclick="window._familyComp.joinGroup()"
          style="width:100%;padding:12px;background:linear-gradient(135deg,#00c48c,#009e71);color:#fff;border:none;border-radius:12px;font-family:var(--ff-ar);font-size:14px;font-weight:700;cursor:pointer;">
          🔗 انضمام
        </button>
      </div>
    `;
  }

  _renderGroupView() {
    return `
      <!-- Group header -->
      <div style="padding:16px;background:linear-gradient(135deg,rgba(245,166,35,0.1),var(--c-card));border-radius:var(--r-xl);border:1px solid rgba(245,166,35,0.2);margin-bottom:14px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">👨‍👩‍👧‍👦</div>
        <div style="font-size:15px;font-weight:700;margin-bottom:4px;">مجموعتك العائلية</div>
        <div style="font-size:11px;color:var(--c-muted);margin-bottom:10px;">كود الدعوة:</div>
        <div style="display:flex;align-items:center;gap:8px;justify-content:center;">
          <div id="group-code" style="font-size:16px;font-weight:900;letter-spacing:4px;color:var(--c-gold);padding:8px 16px;background:rgba(245,166,35,0.1);border-radius:10px;border:1px solid rgba(245,166,35,0.2);">
            ${this.groupId?.slice(0, 8).toUpperCase()}
          </div>
          <button onclick="window._familyComp.copyCode()"
            style="padding:8px 12px;background:var(--c-card);border:1px solid var(--c-border);border-radius:10px;font-family:var(--ff-ar);font-size:12px;cursor:pointer;color:var(--c-text);">
            📋 نسخ
          </button>
        </div>
      </div>

      <!-- Members -->
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">👥 أفراد المجموعة</div>
      <div id="family-members" style="padding:12px;background:var(--c-card);border-radius:var(--r-lg);border:1px solid var(--c-border);margin-bottom:14px;">
        <div style="text-align:center;color:var(--c-muted);font-size:12px;padding:10px;">جاري التحميل...</div>
      </div>

      <!-- Shared cart -->
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">🛒 السلة المشتركة</div>
      <div id="shared-cart" style="padding:12px;background:var(--c-card);border-radius:var(--r-lg);border:1px solid var(--c-border);margin-bottom:14px;">
        <div style="text-align:center;color:var(--c-muted);font-size:12px;padding:10px;">السلة فارغة</div>
      </div>

      <!-- Leave group -->
      <button onclick="window._familyComp.leaveGroup()"
        style="width:100%;padding:11px;background:rgba(255,77,106,0.08);border:1px solid var(--c-red);color:var(--c-red);border-radius:var(--r-lg);font-family:var(--ff-ar);font-size:13px;font-weight:700;cursor:pointer;">
        🚪 مغادرة المجموعة
      </button>
    `;
  }

  _watchGroup() {
    if (!this.groupId) return;
    if (this.unsubscribe) this.unsubscribe();

    this.unsubscribe = onSnapshot(doc(db, 'familyGroups', this.groupId), async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      await this._renderMembers(data.members || []);
      this._renderSharedCart(data.sharedCart || []);
    });
  }

  async _renderMembers(memberIds) {
    const el = document.getElementById('family-members');
    if (!el) return;

    const members = await Promise.all(
      memberIds.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, 'customers', uid));
          return snap.exists() ? { uid, ...snap.data() } : { uid, name: 'عضو', photoURL: null };
        } catch (e) {
          return { uid, name: 'عضو', photoURL: null };
        }
      })
    );

    el.innerHTML = members.map(m => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--c-border);">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#f5a623,#c4831a);display:flex;align-items:center;justify-content:center;font-size:16px;overflow:hidden;flex-shrink:0;">
          ${m.photoURL ? `<img src="${m.photoURL}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
        </div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;">${m.name || 'عضو'}</div>
          ${m.uid === this.userId ? '<div style="font-size:10px;color:var(--c-gold);">أنت</div>' : ''}
        </div>
        ${m.uid === this.userId ? '' : `
          <button onclick="window._familyComp.removeFromGroup('${m.uid}')"
            style="padding:4px 8px;background:rgba(255,77,106,0.1);border:1px solid var(--c-red);border-radius:8px;font-size:10px;cursor:pointer;color:var(--c-red);">
            إزالة
          </button>
        `}
      </div>
    `).join('') || '<div style="text-align:center;color:var(--c-muted);font-size:12px;">لا يوجد أعضاء</div>';
  }

  _renderSharedCart(items) {
    const el = document.getElementById('shared-cart');
    if (!el) return;
    if (!items.length) {
      el.innerHTML = '<div style="text-align:center;color:var(--c-muted);padding:16px;font-size:12px;">السلة المشتركة فارغة</div>';
      return;
    }
    const total = items.reduce((s, i) => s + (i.price * i.qty), 0);
    el.innerHTML = items.map(item => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--c-border);">
        <div style="font-size:22px;">${item.icon || '📦'}</div>
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:700;">${item.name}</div>
          <div style="font-size:10px;color:var(--c-muted);">أضافه: ${item.addedBy || 'عضو'}</div>
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--c-gold);">×${item.qty}</div>
      </div>
    `).join('') + `
      <div style="display:flex;justify-content:space-between;padding:10px 0 0;font-size:13px;font-weight:700;">
        <span>الإجمالي</span>
        <span style="color:var(--c-gold);">${total.toLocaleString('ar')} د.ع</span>
      </div>
    `;
  }

  async createGroup() {
    try {
      this.groupId = await createFamilyGroup(this.userId);
      const container = document.getElementById(this.containerId);
      this.render(container);
      alert('✅ تم إنشاء المجموعة العائلية!\nشارك رمز الدعوة مع عائلتك.');
    } catch (e) {
      alert('حدث خطأ: ' + e.message);
    }
  }

  async joinGroup() {
    const code = document.getElementById('fam-code-input')?.value?.trim().toLowerCase();
    if (!code) return;
    try {
      // Find group by prefix
      const { getDocs, collection, query: q, orderBy: ob } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'familyGroups'));
      const group = snap.docs.find(d => d.id.slice(0, 8).toLowerCase() === code.slice(0, 8));
      if (!group) { alert('رمز الدعوة غير صحيح'); return; }
      await joinFamilyGroup(group.id, this.userId);
      this.groupId = group.id;
      const container = document.getElementById(this.containerId);
      this.render(container);
      alert('✅ انضممت للمجموعة العائلية!');
    } catch (e) {
      alert('حدث خطأ: ' + e.message);
    }
  }

  async removeFromGroup(uid) {
    if (!confirm('هل تريد إزالة هذا العضو من المجموعة؟')) return;
    await updateDoc(doc(db, 'familyGroups', this.groupId), {
      members: arrayRemove(uid),
    });
    await updateDoc(doc(db, 'customers', uid), { familyGroupId: null });
  }

  async leaveGroup() {
    if (!confirm('هل تريد مغادرة المجموعة العائلية؟')) return;
    await updateDoc(doc(db, 'familyGroups', this.groupId), {
      members: arrayRemove(this.userId),
    });
    await updateDoc(doc(db, 'customers', this.userId), { familyGroupId: null });
    this.groupId = null;
    if (this.unsubscribe) { this.unsubscribe(); this.unsubscribe = null; }
    const container = document.getElementById(this.containerId);
    this.render(container);
  }

  copyCode() {
    const code = this.groupId?.slice(0, 8).toUpperCase();
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => alert('✅ تم نسخ رمز الدعوة!'));
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
    delete window._familyComp;
  }
}

export default FamilyComponent;
