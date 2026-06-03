// v2.5 Walk-in 助手（從 store.html 移植）
function parseGuests(s) {
  if (s === null || s === undefined) return { adults: 1, children: 0 };
  if (typeof s === 'number') return { adults: s, children: 0 };
  const str = String(s);
  const a = str.match(/(\d+)\s*大/);
  const c = str.match(/(\d+)\s*小/);
  return { adults: a ? parseInt(a[1]) : (parseInt(str) || 1), children: c ? parseInt(c[1]) : 0 };
}
function guestsLabel(adults, children) {
  return children > 0 ? adults + '大' + children + '小' : adults + '大';
}

// ============================================================
// v2.4 Walk-in 現場訂單
// ============================================================
let wiCount = { adults: 1, children: 0 };
function showWalkInFab() {
  const fab = document.getElementById('walkInFab');
  if (fab) fab.classList.remove('hidden');
}
function hideWalkInFab() {
  const fab = document.getElementById('walkInFab');
  if (fab) fab.classList.add('hidden');
}
function openWalkInModal() {
  // Reset
  wiCount = { adults: 1, children: 0 };
  document.getElementById('wi-cnt-a').textContent = 1;
  document.getElementById('wi-cnt-c').textContent = 0;
  ['wi-name','wi-phone','wi-pp','wi-hf','wi-pf','wi-note'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('wi-hair').checked = false;
  document.getElementById('wi-photo').checked = false;
  document.getElementById('wi-nationality').value = '台灣';
  // Build plan dropdowns + auto-fill price
  wiRebuildPlans();
  document.getElementById('wi-pp').value = wiSumPrice();
  // Reset discount to 無折 (default)
  wiSetDisc(10);
  const r10 = document.querySelector('input[name="wi-disc"][value="10"]'); if (r10) r10.checked = true;
  wiCalc();
  document.getElementById('wiErr').classList.add('hidden');
  document.getElementById('walkInModal').classList.add('show');
}
function closeWalkInModal() {
  document.getElementById('walkInModal').classList.remove('show');
}
const ADULT_PLANS = [
  { value: '素雅和服',  label: '素雅和服 ¥3,000', price: 3000 },
  { value: '俏麗和服',  label: '俏麗和服 ¥5,000', price: 5000 },
  { value: '精緻和服',  label: '精緻和服 ¥8,000', price: 8000 },
  { value: '浴衣',     label: '浴衣 ¥3,000',     price: 3000 },
  { value: '振袖',     label: '振袖 ¥38,000',    price: 38000 },
  { value: '男士和服',  label: '男士和服 ¥5,000', price: 5000 },
  { value: '武士袴',    label: '武士袴 ¥20,000',  price: 20000 }
];
const KID_PLANS = [
  { value: '兒童和服', label: '兒童和服 ¥5,000', price: 5000 }
];
function wiRebuildPlans() {
  const wrap = document.getElementById('wi-plan-rows');
  if (!wrap) return;
  let html = '';
  for (let i = 1; i <= wiCount.adults; i++) {
    html += '<div class="flex items-center gap-2"><span class="w-12 text-xs text-slate-500 font-sans">大人' + i + '</span><select data-pp-idx="A' + i + '" class="wi-plan-sel flex-1 border-2 border-slate-200 focus:border-[#1A365D] outline-none rounded-lg px-2 py-2 text-sm font-sans bg-white" onchange="wiCalc()">';
    ADULT_PLANS.forEach((p, j) => {
      html += '<option value="' + p.value + '" data-price="' + p.price + '"' + (j===0?' selected':'') + '>' + p.label + '</option>';
    });
    html += '</select></div>';
  }
  for (let i = 1; i <= wiCount.children; i++) {
    html += '<div class="flex items-center gap-2"><span class="w-12 text-xs text-slate-500 font-sans">小孩' + i + '</span><select data-pp-idx="C' + i + '" class="wi-plan-sel flex-1 border-2 border-slate-200 focus:border-[#1A365D] outline-none rounded-lg px-2 py-2 text-sm font-sans bg-white" onchange="wiCalc()">';
    KID_PLANS.forEach((p, j) => {
      html += '<option value="' + p.value + '" data-price="' + p.price + '"' + (j===0?' selected':'') + '>' + p.label + '</option>';
    });
    html += '</select></div>';
  }
  wrap.innerHTML = html;
}
function wiSumPrice() {
  const sels = document.querySelectorAll('.wi-plan-sel');
  let total = 0;
  sels.forEach(s => { total += Number(s.options[s.selectedIndex]?.dataset.price) || 0; });
  return total;
}
function wiChg(type, delta) {
  if (type === 'adults') wiCount.adults = Math.max(1, wiCount.adults + delta);
  if (type === 'children') wiCount.children = Math.max(0, wiCount.children + delta);
  document.getElementById('wi-cnt-a').textContent = wiCount.adults;
  document.getElementById('wi-cnt-c').textContent = wiCount.children;
  wiRebuildPlans();
  // Auto-fill suggested price (sum of selected plans) if pp is empty
  const ppEl = document.getElementById('wi-pp');
  ppEl.value = wiSumPrice();
  wiCalc();
}
let wiDiscount = 10;  // default: 無折 = 5:5
function wiSetDisc(d) {
  wiDiscount = Number(d) || 10;
  // Update visual: highlight selected
  ['10','9','85','8'].forEach(k => {
    const el = document.getElementById('wi-disc-' + k + '-l');
    if (!el) return;
    const v = k === '85' ? 8.5 : Number(k);
    if (v === wiDiscount) {
      el.className = 'flex items-center justify-center border-2 border-[#1A365D] bg-[#1A365D] text-white rounded-lg py-2 cursor-pointer font-sans text-sm font-bold';
    } else {
      el.className = 'flex items-center justify-center border-2 border-slate-200 rounded-lg py-2 cursor-pointer font-sans text-sm font-bold text-slate-600';
    }
  });
  wiCalc();
}
function wiCalc() {
  // Auto-fill 和服原價 from selected plans if user hasn't manually changed
  const ppEl = document.getElementById('wi-pp');
  const sumPrice = wiSumPrice();
  // Always show suggested sum unless user typed something
  if (!ppEl.dataset.userEdited) ppEl.value = sumPrice;
  const pp = Number(ppEl.value) || 0;
  const hf = Number(document.getElementById('wi-hf').value) || 0;
  const pf = Number(document.getElementById('wi-pf').value) || 0;
  const d = wiDiscount;
  const discounted = Math.round(pp * d / 10);
  const extras = hf + pf;
  const due = discounted + extras;
  const shopKeep = Math.round(pp * 0.5) + extras;
  const ours = discounted - Math.round(pp * 0.5);
  document.getElementById('wi-due').textContent = '¥' + fmtY(due);
  // Display: just amount + 折數 label (no hardcoded "9 折" text)
  const discLabel = d < 10 ? ' (' + d + ' 折)' : '';
  document.getElementById('wi-discounted').textContent = '¥' + fmtY(discounted) + discLabel;
  document.getElementById('wi-extras').textContent = '¥' + fmtY(extras);
  document.getElementById('wi-shop').textContent = '¥' + fmtY(shopKeep);
  // wi-ours element no longer in DOM after we removed the cooperation section, guard
  const oursEl = document.getElementById('wi-ours');
  if (oursEl) oursEl.textContent = '¥' + fmtY(ours) + (ours < 0 ? ' ⚠️' : '');
}
// Track manual edit on pp
document.addEventListener('DOMContentLoaded', () => {
  const ppEl = document.getElementById('wi-pp');
  if (ppEl) ppEl.addEventListener('input', () => { ppEl.dataset.userEdited = '1'; });
});
async function wiSubmit() {
  const name = document.getElementById('wi-name').value.trim();
  const phone = document.getElementById('wi-phone').value.trim();
  const nationality = document.getElementById('wi-nationality').value;
  // Collect plans from per-person dropdowns
  const planSels = document.querySelectorAll('.wi-plan-sel');
  const plans = [];
  planSels.forEach(s => {
    const idx = s.dataset.ppIdx;
    plans.push(idx + ':' + s.value);
  });
  const plan = plans.join('; ');
  const pp = Number(document.getElementById('wi-pp').value) || 0;
  const hf = Number(document.getElementById('wi-hf').value) || 0;
  const pf = Number(document.getElementById('wi-pf').value) || 0;
  const hair = document.getElementById('wi-hair').checked ? '是' : '否';
  const photo = document.getElementById('wi-photo').checked ? '是' : '否';
  const note = document.getElementById('wi-note').value.trim();
  const err = document.getElementById('wiErr');
  err.classList.add('hidden');

  if (!name) { err.textContent = '請填客人姓名'; err.classList.remove('hidden'); return; }
  // v2.4.42d: removed 請填和服款式 validation since 每人選和服款式 UI is hidden
  if (pp <= 0) { err.textContent = '請填和服原價'; err.classList.remove('hidden'); return; }

  const btn = document.getElementById('wiSubmitBtn');
  btn.textContent = '建單中…'; btn.disabled = true;

  try {
    if (useFirebaseAdmin()) {
      const d = await callFirebaseAdminFunction('/createWalkInOrder', {
        clientRequestId: 'walkin-' + Date.now() + '-' + Math.random().toString(36).slice(2),
        storeCode: currentStoreKey || undefined,
        name, phone, nationality,
        adults: wiCount.adults,
        children: wiCount.children,
        plan,
        hair: document.getElementById('wi-hair').checked,
        photo: document.getElementById('wi-photo').checked,
        kimonoPriceJpy: pp,
        hairFeeJpy: hf,
        photoFeeJpy: pf,
        discountRate: wiDiscount,
        note
      });
      closeWalkInModal();
      await loadOrders();
      alert('✅ 現場訂單已建立！\n編號：' + ((d.order && d.order.orderNo) || '已寫入'));
      return;
    }
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'storeWalkIn',
        storeKey: currentStoreKey, token: adminToken,
        name, phone, nationality,
        adults: wiCount.adults, children: wiCount.children,
        plan, hair, photo,
        planPrice: pp, hairFee: hf, photoFee: pf,
        discount: wiDiscount,
        note
      })
    });
    const d = await res.json();
    if (d.status !== 'success') {
      err.textContent = d.message || '建單失敗';
      err.classList.remove('hidden');
      return;
    }
    closeWalkInModal();
    await loadOrders();
    alert('✅ 現場訂單已建立！\n編號：' + (d.orderId || '已寫入'));
  } catch (e) {
    err.textContent = '網路錯誤：' + e.message;
    err.classList.remove('hidden');
  } finally {
    btn.textContent = '確認建單'; btn.disabled = false;
  }
}
// Show FAB after successful login
// (loadOrders is defined elsewhere in admin)

// v2.5g: 舊的 wrapper 已整合進原 applyRolePermissions (line 1082)
