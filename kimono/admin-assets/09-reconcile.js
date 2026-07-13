// ── RECONCILE 對帳 ──
function initReconMonths(){
  const monthInput = document.getElementById('recon-month');
  const daySel = document.getElementById('recon-day');
  if (!monthInput || !daySel) return;
  const now = typeof nowAsJstLocalDate === 'function' ? nowAsJstLocalDate() : new Date();
  const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  if (!/^\d{4}-\d{2}$/.test(monthInput.value || '')) monthInput.value = currentMonth;
  updateReconcileDayOptions(monthInput.value, daySel.value || 'all');
}

function updateReconcileDayOptions(month, selectedDay) {
  const daySel = document.getElementById('recon-day');
  if (!daySel) return;
  if (!/^\d{4}-\d{2}$/.test(month || '')) {
    daySel.innerHTML = '<option value="all" selected>全部日期</option>';
    daySel.disabled = true;
    return;
  }
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const day = String(selectedDay || 'all');
  const normalizedDay = day === 'all' || (Number(day) >= 1 && Number(day) <= daysInMonth) ? day : 'all';
  daySel.disabled = false;
  daySel.innerHTML = '<option value="all"'+(normalizedDay === 'all' ? ' selected' : '')+'>整月</option>' +
    Array.from({ length: daysInMonth }, (_, index) => {
      const value = String(index + 1);
      return '<option value="'+value+'"'+(value === normalizedDay ? ' selected' : '')+'>'+value+'日</option>';
    }).join('');
}

function getReconcileMonthFilter() {
  const monthInput = document.getElementById('recon-month');
  return monthInput ? (monthInput.value || 'all') : 'all';
}

function getReconcileDayFilter() {
  const daySel = document.getElementById('recon-day');
  return daySel && !daySel.disabled ? (daySel.value || 'all') : 'all';
}

function setReconcileMonthFilter(value) {
  const monthInput = document.getElementById('recon-month');
  const filter = /^\d{4}-\d{2}$/.test(value || '') ? value : '';
  if (monthInput) monthInput.value = filter;
  updateReconcileDayOptions(filter, 'all');
  return filter || 'all';
}

function handleReconMonthChange() {
  const monthInput = document.getElementById('recon-month');
  const daySel = document.getElementById('recon-day');
  updateReconcileDayOptions(monthInput && monthInput.value, daySel && daySel.value);
  renderReconcile();
}

function handleReconDayChange() {
  renderReconcile();
}

function orderMatchesReconcileMonth(o, filter, day) {
  if (!filter || filter === 'all') return true;
  const m = bookingMonth(o);
  if (m !== filter) return false;
  if (!day || day === 'all') return true;
  const booking = typeof parseBookingDate === 'function' ? parseBookingDate(o.bookingDate) : new Date(o.bookingDate);
  return !!booking && !isNaN(booking) && booking.getDate() === Number(day);
}

function reconcileAmounts(o) {
  const kimonoPrice = Number(o.price || o.kimonoPrice || 0);
  const hairFee = Number(o.hairFee || 0);
  const makeupFee = typeof orderMakeupFee === 'function' ? orderMakeupFee(o) : Number(o.makeupFee || 0);
  const photoFee = Number(o.photoFee || 0);
  const discountRefund = Number(o.discountRefundAmount || 0);
  const overtimeDamageDeduction = Number(o.overtimeDamageDeduction || o.overtimeDamageDeductionJpy || 0);
  const deposit = reconcileDeposit(o);
  const actualReceived = Number(
    o.storeActualReceived !== undefined ? o.storeActualReceived : o.storeActualReceivedJpy
  ) || 0;
  const total = typeof orderDisplayTotal === 'function'
    ? orderDisplayTotal(o)
    : Math.max(0, kimonoPrice + hairFee + makeupFee + photoFee + overtimeDamageDeduction - discountRefund);
  const balance = Math.max(0, total - deposit - actualReceived);
  const platformFee = kimonoPrice * 0.5;
  const storeBalance = total - platformFee;
  const settlementAmount = platformFee - deposit - balance;
  return {
    deposit,
    kimonoPrice,
    hairFee,
    makeupFee,
    photoFee,
    discountRefund,
    overtimeDamageDeduction,
    total,
    actualReceived,
    balance,
    platformFee,
    storeBalance,
    platformPayable: settlementAmount,
    storeReceivable: settlementAmount
  };
}

function reconcileDeposit(o) {
  if (typeof orderPaidDeposit === 'function') return orderPaidDeposit(o);
  return Math.max(0, Number(o && o.deposit || 0) - Number(o && (o.refundAmount !== undefined ? o.refundAmount : o.refundAmountJpy) || 0));
}

// ── 對帳列表整體編輯 ──
// 金額欄位沿用訂單詳情的計算與權限：店鋪只有在結帳流程中能調整款項。
let isReconBulkEditing = false;

function reconcileInlineCanEdit(o) {
  if (currentRole !== 'store') return true;
  return ['confirmed', 'checked_in'].includes(orderStatusOf(o));
}

function reconcileInlineInput(orderId, field, value) {
  return '<input class="recon-inline-input" type="number" min="0" step="1" inputmode="numeric" '+
    'data-recon-order="'+adminEsc(orderId)+'" data-recon-field="'+field+'" value="'+Math.max(0, Number(value) || 0)+'" '+
    'oninput="updateReconcileInlinePreview(\''+adminEsc(orderId)+'\')">';
}

function reconcileInlineValue(orderId, field, fallback) {
  const input = document.querySelector('.recon-inline-input[data-recon-order="'+CSS.escape(orderId)+'"][data-recon-field="'+field+'"]');
  return Math.max(0, Math.round(Number(input ? input.value : fallback) || 0));
}

function reconcileInlineDraft(orderId) {
  const order = allOrders.find(o => o.orderId === orderId);
  if (!order) return null;
  const amount = reconcileAmounts(order);
  const draft = Object.assign({}, order, {
    price: reconcileInlineValue(orderId, 'kimonoPrice', amount.kimonoPrice),
    kimonoPrice: reconcileInlineValue(orderId, 'kimonoPrice', amount.kimonoPrice),
    hairFee: reconcileInlineValue(orderId, 'hairFee', amount.hairFee),
    makeupFee: reconcileInlineValue(orderId, 'makeupFee', amount.makeupFee),
    photoFee: reconcileInlineValue(orderId, 'photoFee', amount.photoFee),
    discountRefundAmount: reconcileInlineValue(orderId, 'discountRefundAmount', amount.discountRefund),
    overtimeDamageDeduction: reconcileInlineValue(orderId, 'overtimeDamageDeduction', amount.overtimeDamageDeduction),
    storeActualReceived: reconcileInlineValue(orderId, 'storeActualReceived', amount.actualReceived)
  });
  if (currentRole !== 'store') {
    // 列表顯示的是「已收訂金」（已扣退款），儲存時轉回訂單詳情使用的原始訂金。
    draft.deposit = reconcileInlineValue(orderId, 'deposit', amount.deposit) + Number(order.refundAmount || order.refundAmountJpy || 0);
  }
  return draft;
}

function reconcileInlinePreviewCell(orderId, key, value, className) {
  return '<span data-recon-preview="'+key+'" data-recon-order="'+adminEsc(orderId)+'" class="'+(className || '')+'">'+value+'</span>';
}

function updateReconcileInlinePreview(orderId) {
  const draft = reconcileInlineDraft(orderId);
  if (!draft) return;
  const amount = reconcileAmounts(draft);
  const values = {
    total: fmtY0(amount.total),
    balance: fmtY0(amount.balance),
    platformFee: fmtY0(amount.platformFee),
    storeBalance: fmtY0(amount.storeBalance),
    platformPayable: fmtSignedY0(amount.platformPayable),
    storeReceivable: fmtSignedY0(amount.storeReceivable)
  };
  Object.entries(values).forEach(([key, value]) => {
    document.querySelectorAll('[data-recon-preview="'+key+'"][data-recon-order="'+CSS.escape(orderId)+'"]').forEach(el => { el.textContent = value; });
  });
}

function reconcileDraftValues(draft) {
  return {
    deposit: Math.max(0, Math.round(Number(draft.deposit || 0))),
    kimonoPrice: Math.max(0, Math.round(Number(draft.kimonoPrice || 0))),
    hairFee: Math.max(0, Math.round(Number(draft.hairFee || 0))),
    makeupFee: Math.max(0, Math.round(Number(draft.makeupFee || 0))),
    photoFee: Math.max(0, Math.round(Number(draft.photoFee || 0))),
    discountRefundAmount: Math.max(0, Math.round(Number(draft.discountRefundAmount || 0))),
    overtimeDamageDeduction: Math.max(0, Math.round(Number(draft.overtimeDamageDeduction || 0))),
    storeActualReceived: Math.max(0, Math.round(Number(draft.storeActualReceived || 0)))
  };
}

function reconcileDraftHasChanges(order, draft) {
  const current = reconcileDraftValues(order);
  const next = reconcileDraftValues(draft);
  const fields = ['kimonoPrice', 'hairFee', 'makeupFee', 'photoFee', 'discountRefundAmount', 'overtimeDamageDeduction', 'storeActualReceived'];
  if (currentRole !== 'store') fields.push('deposit');
  return fields.some(field => current[field] !== next[field]);
}

function syncReconcileBulkEditActions() {
  const editButton = document.getElementById('recon-edit-btn');
  const bulkActions = document.getElementById('recon-bulk-actions');
  if (editButton) editButton.classList.toggle('hidden', isReconBulkEditing);
  if (bulkActions) bulkActions.classList.toggle('hidden', !isReconBulkEditing);
  ['recon-month', 'recon-day', 'recon-sort', 'recon-status', 'recon-brand', 'recon-export'].forEach(id => {
    const control = document.getElementById(id);
    if (control) control.disabled = isReconBulkEditing;
  });
}

function startReconcileBulkEdit() {
  isReconBulkEditing = true;
  renderReconcile();
  const firstInput = document.querySelector('.recon-inline-input');
  if (firstInput) firstInput.focus();
}

function cancelReconcileBulkEdit() {
  isReconBulkEditing = false;
  renderReconcile();
}

async function persistReconcileDraft(order, draft) {
  const values = reconcileDraftValues(draft);
  if (useFirebaseAdmin()) {
    const token = await getFreshAdminToken();
    const apiBaseUrl = (KIMONO_CONFIG.API_BASE_URL || '').replace(/\/$/, '');
    const firebasePayload = {
      orderId: order.firebaseDocId || order.orderId,
      kimonoPriceJpy: values.kimonoPrice,
      hairFeeJpy: values.hairFee,
      makeupFeeJpy: values.makeupFee,
      photoFeeJpy: values.photoFee,
      discountRefundAmountJpy: values.discountRefundAmount,
      overtimeDamageDeductionJpy: values.overtimeDamageDeduction,
      storeActualReceivedJpy: values.storeActualReceived,
      ...(currentRole === 'store' ? { checkout: true } : { depositJpy: values.deposit })
    };
    const res = await fetch(apiBaseUrl + '/updateOrderByStaff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(firebasePayload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status !== 'success') throw new Error(data.message || '儲存失敗');
    const updatedOrder = typeof adminMutationOrderToLocal === 'function'
      ? adminMutationOrderToLocal(data.order || {}, order)
      : Object.assign({}, order, draft);
    mergeOrderIntoLocalList(order.orderId, updatedOrder);
    return;
  }
  const payload = {
    action: 'adminUpdate', agent: currentAgent, token: adminToken, orderId: order.orderId,
    name: order.name || '', phone: order.phone || '', email: order.email || '', bookingDate: order.bookingDate || '',
    pax: order.pax || '', plan: order.plan || '', platform: order.platform || '', hair: order.hair || 'false',
    hairPlan: order.hairPlan || '', makeup: order.makeupPlan || normalizeMakeupPlan(order), photo: order.photo || 'false',
    photoPlan: order.photoPlan || '', confirmed: order.confirmed ? 'TRUE' : 'FALSE',
    deposit: values.deposit, kimonoPrice: values.kimonoPrice, hairFee: values.hairFee, makeupFee: values.makeupFee,
    photoFee: values.photoFee, coupon: order.coupon || '', rate: order.rate || '',
    discountRefundAmount: values.discountRefundAmount, overtimeDamageDeduction: values.overtimeDamageDeduction,
    storeActualReceived: values.storeActualReceived, refundAmt: order.refundAmount || 0, refundDate: order.refundTime || '',
    refundReason: order.refundReason || '', note: order.remark || order.note || '', storeNote: order.storeNote || ''
  };
  if (currentRole === 'store') {
    ['name', 'phone', 'email', 'confirmed', 'deposit', 'refundAmt', 'refundDate', 'refundReason'].forEach(key => delete payload[key]);
  }
  const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
  const data = await res.json();
  if (data.status !== 'ok' && data.status !== 'success') throw new Error(data.message || '儲存失敗');
  const localPayload = Object.assign({}, payload, { deposit: values.deposit });
  mergeOrderIntoLocalList(order.orderId, adminOrderPatchFromFormPayload(localPayload));
}

async function saveReconcileBulkEdit() {
  const saveButton = document.getElementById('recon-bulk-save-btn');
  const orderIds = [...new Set([...document.querySelectorAll('.recon-inline-input[data-recon-order]')]
    .map(input => input.dataset.reconOrder).filter(Boolean))];
  const changes = orderIds.map(orderId => {
    const order = allOrders.find(item => item.orderId === orderId);
    const draft = reconcileInlineDraft(orderId);
    return order && draft && reconcileDraftHasChanges(order, draft) ? { order, draft } : null;
  }).filter(Boolean);
  if (!changes.length) {
    cancelReconcileBulkEdit();
    toast('沒有需要儲存的變更', 'warning');
    return;
  }
  if (currentRole === 'store' && !confirm('確認提交 ' + changes.length + ' 筆消費與付款金額？\n儲存後，這些訂單會依尾款自動轉為「已完成」或「待付尾款」。')) return;
  if (saveButton) { saveButton.disabled = true; saveButton.textContent = '儲存中…'; }
  const failures = [];
  for (const change of changes) {
    try {
      await persistReconcileDraft(change.order, change.draft);
    } catch (error) {
      failures.push(change.order.orderId + '：' + (error.message || error));
    }
  }
  isReconBulkEditing = false;
  renderReconcile();
  if (failures.length) toast('已儲存 ' + (changes.length - failures.length) + ' 筆；' + failures.length + ' 筆失敗：' + failures[0], 'error');
  else toast('已儲存 ' + changes.length + ' 筆對帳變更', 'success');
  if (typeof scheduleQuietOrdersRefresh === 'function') scheduleQuietOrdersRefresh(700);
}

function fmtSignedY0(n) {
  const amount = Number(n) || 0;
  if (amount === 0) return '¥0';
  return (amount > 0 ? '+¥' : '-¥') + Math.abs(amount).toLocaleString();
}

function reconcileStatusBadge(o) {
  if(o._recState==='matched') return {html:'<span class="badge badge-confirmed">✓ 已對帳</span>', rowClass:'match'};
  if(o._recState==='overpaid') return {html:'<span class="badge badge-anomaly">⚠ 超收異常</span>', rowClass:'mismatch'};
  if(o._recState==='partial') return {html:'<span class="badge" style="background:#DBEAFE;color:#1E40AF">△ 待收尾款</span>', rowClass:''};
  return {html:'<span class="badge badge-pending">○ 未對帳</span>', rowClass:'pending'};
}

function shouldShowStoreReceivable(o) {
  const status = typeof orderStatusOf === 'function' ? orderStatusOf(o) : String(o && o.status || '');
  return status === 'balance_due' || status === 'completed';
}

function renderReconcileOrderStatus(o) {
  const status = typeof orderStatusOf === 'function' ? orderStatusOf(o) : String(o && o.status || (o && o.confirmed ? 'confirmed' : 'pending_review'));
  const meta = typeof orderStatusMeta === 'function'
    ? orderStatusMeta(status)
    : { label: status || '未知狀態', icon: '•', css: 'status-unknown' };
  return '<span class="order-status-control '+meta.css+'">'+
    '<span class="order-status-icon" aria-hidden="true">'+meta.icon+'</span>'+
    '<span>'+meta.label+'</span>'+
  '</span>';
}

function reconcileOrderStatusLabel(o) {
  const status = typeof orderStatusOf === 'function' ? orderStatusOf(o) : String(o && o.status || (o && o.confirmed ? 'confirmed' : 'pending_review'));
  const meta = typeof orderStatusMeta === 'function' ? orderStatusMeta(status) : null;
  return meta ? meta.label : (status || '未知狀態');
}

function reconcileOrderStatusRank(o) {
  const status = typeof orderStatusOf === 'function' ? orderStatusOf(o) : String(o && o.status || (o && o.confirmed ? 'confirmed' : 'pending_review'));
  const order = {
    pending_payment: 0,
    pending_review: 1,
    confirmed: 2,
    checked_in: 3,
    balance_due: 4,
    completed: 5,
    refund_requested: 6,
    refunding: 7,
    refunded: 8,
    cancelled: 9
  };
  return order[status] == null ? 99 : order[status];
}

function renderReconcileStats(list) {
  const total = list.length;
  const matched = list.filter(o=>o._recState==='matched').length;
  const rate = total ? Math.round(matched / total * 100) : 0;
  const amounts = list.map(reconcileAmounts);
  const sum = key => amounts.reduce((totalAmount, amount) => totalAmount + amount[key], 0);
  const grid = document.getElementById('recon-stats-grid');
  const card1 = document.getElementById('recon-stat-card-1');
  const card2 = document.getElementById('recon-stat-card-2');
  const card3 = document.getElementById('recon-stat-card-3');
  const label1 = document.getElementById('recon-stat-label-1');
  const label2 = document.getElementById('recon-stat-label-2');
  const label3 = document.getElementById('recon-stat-label-3');
  const value1 = document.getElementById('recon-stat-expect');
  const value2 = document.getElementById('recon-stat-received');
  const value3 = document.getElementById('recon-stat-diff');

  document.getElementById('recon-stat-total').textContent = total;
  document.getElementById('recon-stat-rate').textContent = rate + '%';

  if (currentRole === 'store') {
    grid.classList.remove('md:grid-cols-5');
    grid.classList.add('md:grid-cols-4');
    card1.className = 'stat-card green';
    card2.className = 'stat-card red';
    card3.style.display = 'none';
    label1.textContent = '店鋪利潤';
    label2.textContent = '需付平台';
    value1.className = 'stat-num green';
    value2.className = 'stat-num red';
    value1.style.fontSize = '22px';
    value2.style.fontSize = '22px';
    value1.textContent = fmtY0(sum('storeBalance'));
    value2.textContent = fmtSignedY0(sum('platformPayable'));
    return;
  }

  grid.classList.remove('md:grid-cols-4');
  grid.classList.add('md:grid-cols-5');
  card1.className = 'stat-card gold';
  card2.className = 'stat-card green';
  card3.className = 'stat-card red';
  card3.style.display = '';
  label1.textContent = '總價';
  label2.textContent = '平台費';
  label3.textContent = '需收店鋪';
  value1.className = 'stat-num';
  value2.className = 'stat-num green';
  value3.className = 'stat-num red';
  value1.style.fontSize = '22px';
  value2.style.fontSize = '22px';
  value3.style.fontSize = '22px';
  value1.textContent = fmtY0(sum('total'));
  value2.textContent = fmtY0(sum('platformFee'));
  value3.textContent = fmtSignedY0(list.reduce((totalAmount, order) => {
    return shouldShowStoreReceivable(order) ? totalAmount + reconcileAmounts(order).storeReceivable : totalAmount;
  }, 0));
}

function renderReconcile(){
  syncReconcileBulkEditActions();
  const month = getReconcileMonthFilter();
  const day = getReconcileDayFilter();
  const status = document.getElementById('recon-status').value;
  const firebaseRole = localStorage.getItem('admin_firebaseRole') || '';
  const showStoreColumn = firebaseRole === 'head_store_manager';
  const brandEl = document.getElementById('recon-brand');
  const brand = brandEl ? brandEl.value : 'all';
  if (brandEl) {
    brandEl.classList.toggle('hidden', !canSeeMultipleBrandPlatforms());
    if (!canSeeMultipleBrandPlatforms()) brandEl.value = 'all';
  }
  let list = allOrders.slice();
  // v2.5: 店家身份只看自己門市的對帳，agent 看全部
  if (currentRole === 'store' && firebaseRole !== 'head_store_manager' && currentStoreKey) {
    list = list.filter(o => orderBelongsToStore(o, currentStoreKey));
  }
  if(month && month!=='all') list = list.filter(o=>orderMatchesReconcileMonth(o, month, day));
  if(brand && brand!=='all') list = list.filter(o=>orderBrandPlatform(o)===brand);

  // 計算對帳狀態
  list = list.map(o=>{
    const expect = expectedDeposit(o);
    const got = reconcileDeposit(o);
    const tc = totalCharge(o);
    // v2.4.20 對帳狀態：
    //   matched   = 已收 ≥ 應收訂金 且 ≤ 體驗總額（合理範圍）
    //   partial   = 已收 < 應收訂金（少收 → 待店家現場收尾款，不算異常）
    //   overpaid  = 已收 > 體驗總額（真的超收 → 必須退款 / 處理）
    //   unmatched = 待確認 / 無訂金資料
    // v2.4.20: 加 walk-in 偵測 — walk-in 訂單 deposit=0 但已確認也算對帳完成
    const isWalkIn = (o.platform === 'WALK_IN') ||
                     (String(o.platform||'').toLowerCase().indexOf('walk-in') === 0) ||
                     (String(o.source||'').toLowerCase().indexOf('walk-in@') === 0) ||
                     (String(o.introducer||'').toLowerCase().indexOf('walk-in@') === 0);
    let recState = 'unmatched';
    if(tc>0 && got>tc) recState = 'overpaid';
    else if(isWalkIn && o.confirmed) recState = 'matched';   // ★ walk-in 已確認 = 已對帳
    else if(o.confirmed && expect>0 && got>=expect) recState = 'matched';
    else if(o.confirmed && expect>0 && got>0 && got<expect) recState = 'partial';
    else if(o.confirmed && got>0) recState = 'matched';
    else if(got>0 && got<expect) recState = 'partial';
    return {...o, _expect:expect, _got:got, _tc:tc, _recState:recState, _diff:got-expect, _isWalkIn:isWalkIn};
  });

  if(status!=='all') list = list.filter(o=>{
    const orderStatus = typeof orderStatusOf === 'function' ? orderStatusOf(o) : String(o && o.status || (o && o.confirmed ? 'confirmed' : 'pending_review'));
    return orderStatus === status;
  });

  renderReconcileStats(list);

  const tbl = document.getElementById('recon-table');
  if(!list.length){ tbl.innerHTML='<div class="text-center text-slate-600 py-8 font-semibold">本期無資料</div>'; return; }

  list.sort((a,b)=>{
    // v2.4.20: 依使用者選擇排序
    const sortMode = (document.getElementById('recon-sort')||{}).value || 'status-asc';
    const orderA = reconcileOrderStatusRank(a);
    const orderB = reconcileOrderStatusRank(b);
    const dateA = jstMillis(a.bookingDate);
    const dateB = jstMillis(b.bookingDate);
    if (sortMode === 'date-asc') return dateA - dateB;
    if (sortMode === 'date-desc') return dateB - dateA;
    // status-asc / status-desc：先狀態，再日期
    if(orderA!==orderB) return sortMode === 'status-desc' ? orderB-orderA : orderA-orderB;
    return sortMode === 'status-desc' ? dateB - dateA : dateA - dateB;
    return jstMillis(b.bookingDate)-jstMillis(a.bookingDate);
  });

  // v2.4.20: list 為空時提供有用引導
  if (!list.length) {
    const archivedSet = new Set(window.__archivedMonthsList || []);
    if (archivedSet.has(month)) {
      tbl.innerHTML = '<div class="text-center py-12">' +
        '<div class="text-5xl mb-3">📦</div>' +
        '<div class="text-lg font-bold text-[#1A365D] mb-2">' + fmtMonth(month) + ' 已關帳並歸檔</div>' +
        '<div class="text-sm text-slate-600 mb-4">該月訂單已從主表搬到「歷史檔案」分頁</div>' +
        '<button onclick="switchSection(\'archive\',document.querySelector(\'[data-sec=archive]\'))" class="btn-navy px-5 py-2 rounded-xl text-sm">📁 前往歷史檔案查看 →</button>' +
        '</div>';
    } else {
      tbl.innerHTML = '<div class="text-center py-12 text-slate-500 font-semibold">' + fmtMonth(month) + ' 沒有訂單資料</div>';
    }
    return;
  }
  const brandHeader = canSeeMultipleBrandPlatforms() ? '<th>平台</th>' : '';
  tbl.innerHTML = '<table class="data-table"><thead><tr>'+
    (currentRole === 'store'
      ? '<th>狀態</th>' + (showStoreColumn ? '<th>門市</th>' : '') + '<th>訂單號</th>' + brandHeader + '<th>客戶</th><th>體驗日期</th>'+
        '<th class="num">已收訂金</th><th class="num">髮型費</th><th class="num">化妝費</th><th class="num">攝影費</th>'+
        '<th class="num">折扣與退款</th><th class="num">超時污損費</th><th class="num">和服原價</th><th class="num">總價</th>'+
        '<th class="num">實際收款</th><th class="num">平台費</th>'+
        '<th class="num">店鋪利潤</th><th class="num">需付平台</th>'
      : '<th>狀態</th><th>訂單號</th>' + brandHeader + '<th>客戶</th><th>體驗日期</th>'+
        '<th class="num">已收訂金</th><th class="num">折扣與退款</th><th class="num">超時污損費</th><th class="num">和服原價</th><th class="num">總價</th>'+
        '<th class="num">店鋪實收</th><th class="num">尾款</th>'+
        '<th class="num">平台費</th><th class="num">需收店鋪</th>')+
    '<th class="recon-action-cell">詳情</th>'+
    '</tr></thead><tbody>'+
    list.map(o=>{
      const statusBadge = reconcileStatusBadge(o);
      const amount = reconcileAmounts(o);
      const showStoreReceivable = shouldShowStoreReceivable(o);
      const isEditing = isReconBulkEditing && reconcileInlineCanEdit(o);
      const amountCell = (field, value, editable, className) => {
        const classes = 'num ' + (className || '');
        return '<td class="'+classes+'">'+(isEditing && editable
          ? reconcileInlineInput(o.orderId, field, value)
          : fmtY0(value))+'</td>';
      };
      const previewCell = (key, value, className) => '<td class="num '+(className || '')+'">'+(
        isEditing ? reconcileInlinePreviewCell(o.orderId, key, value, '') : value
      )+'</td>';
      const commonCells =
        '<td>'+renderReconcileOrderStatus(o)+'</td>'+
        (showStoreColumn ? '<td class="font-mono text-sm whitespace-nowrap">'+adminEsc(o.storeKey || o.storeId || '—')+'</td>' : '')+
        '<td class="font-mono text-sm whitespace-nowrap"><button class="recon-order-link" onclick="openEdit(\''+adminJsArg(o.orderId||'')+'\')">'+adminEsc(o.orderId||'')+'</button></td>'+
        (canSeeMultipleBrandPlatforms() ? '<td>'+platformBadge(o)+'</td>' : '')+
        '<td class="font-bold whitespace-nowrap">'+(o.name||'—')+'</td>'+
        '<td>'+fmtDate(o.bookingDate)+'</td>';
      const amountCells = currentRole === 'store'
        ? '<td class="num">'+fmtY0(amount.deposit)+'</td>'+
          amountCell('hairFee', amount.hairFee, true)+
          amountCell('makeupFee', amount.makeupFee, true)+
          amountCell('photoFee', amount.photoFee, true)+
          amountCell('discountRefundAmount', amount.discountRefund, true)+
          amountCell('overtimeDamageDeduction', amount.overtimeDamageDeduction, true)+
          amountCell('kimonoPrice', amount.kimonoPrice, true)+
          previewCell('total', fmtY0(amount.total), 'font-bold')+
          amountCell('storeActualReceived', amount.actualReceived, true)+
          previewCell('platformFee', fmtY0(amount.platformFee))+
          previewCell('storeBalance', fmtY0(amount.storeBalance), 'font-bold text-[#C9A961]')+
          previewCell('platformPayable', fmtSignedY0(amount.platformPayable), 'font-bold')
        : amountCell('deposit', amount.deposit, true)+
          amountCell('discountRefundAmount', amount.discountRefund, true)+
          amountCell('overtimeDamageDeduction', amount.overtimeDamageDeduction, true)+
          amountCell('kimonoPrice', amount.kimonoPrice, true)+
          previewCell('total', fmtY0(amount.total), 'font-bold')+
          amountCell('storeActualReceived', amount.actualReceived, true)+
          previewCell('balance', fmtY0(amount.balance), 'font-bold')+
          previewCell('platformFee', fmtY0(amount.platformFee), 'font-bold text-[#C9A961]')+
          '<td class="num font-bold" style="color:#991B1B">'+(showStoreReceivable
            ? (isEditing ? reconcileInlinePreviewCell(o.orderId, 'storeReceivable', fmtSignedY0(amount.storeReceivable), '') : fmtSignedY0(amount.storeReceivable))
            : '')+'</td>';
      const actionCell = '<td class="recon-action-cell"><div class="recon-inline-actions">'+
        '<button class="recon-inline-detail" onclick="openEdit(\''+adminJsArg(o.orderId||'')+'\')">詳情</button></div></td>';
      return '<tr class="recon-row '+statusBadge.rowClass+(isEditing ? ' is-inline-editing' : '')+'">'+
        commonCells+amountCells+actionCell+
      '</tr>';
    }).join('')+'</tbody></table>';
}

function exportReconCSV(){
  const month = getReconcileMonthFilter();
  const day = getReconcileDayFilter();
  const brandEl = document.getElementById('recon-brand');
  const brand = brandEl ? brandEl.value : 'all';
  let list = allOrders.slice();
  if (currentRole === 'store' && currentStoreKey) {
    list = list.filter(o => orderBelongsToStore(o, currentStoreKey));
  }
  if(month && month!=='all') list = list.filter(o=>orderMatchesReconcileMonth(o, month, day));
  if(brand && brand!=='all') list = list.filter(o=>orderBrandPlatform(o)===brand);
  const headers = currentRole === 'store'
    ? ['平台','狀態','訂單號','客戶','體驗日期','已收訂金','髮型費','化妝費','攝影費','折扣與退款','超時污損費','和服原價','總價','實際收款','平台費','店鋪利潤','需付平台']
    : ['平台','狀態','訂單號','客戶','體驗日期','已收訂金','折扣與退款','超時污損費','和服原價','總價','店鋪實收','尾款','平台費','需收店鋪'];
  const rows = list.map(o=>{
    const st = reconcileOrderStatusLabel(o);
    const amount = reconcileAmounts(o);
    return currentRole === 'store'
      ? [platformLabel(orderBrandPlatform(o)), st, o.orderId, o.name, fmtDate(o.bookingDate), amount.deposit, amount.hairFee, amount.makeupFee, amount.photoFee, amount.discountRefund, amount.overtimeDamageDeduction, amount.kimonoPrice, amount.total, amount.actualReceived, amount.platformFee, amount.storeBalance, amount.platformPayable]
      : [platformLabel(orderBrandPlatform(o)), st, o.orderId, o.name, fmtDate(o.bookingDate), amount.deposit, amount.discountRefund, amount.overtimeDamageDeduction, amount.kimonoPrice, amount.total, amount.actualReceived, amount.balance, amount.platformFee, shouldShowStoreReceivable(o) ? amount.storeReceivable : ''];
  });
  const csv = [headers, ...rows].map(r=>r.map(c=>'"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='kimono-reconcile-'+(month||'all')+'.csv'; a.click();
  URL.revokeObjectURL(url);
  toast('已匯出對帳資料');
}

// ── v2.4.32 自動配對銀行入帳 ──
function renderFirebaseReconcilePreview(){
  const month = getReconcileMonthFilter();
  const day = getReconcileDayFilter();
  let list = filterOrdersForRole(allOrders.slice());
  if(month && month!=='all') list = list.filter(o=>orderMatchesReconcileMonth(o, month, day));
  const rows = list.map(o=>{
    const expect = expectedDeposit(o);
    const got = reconcileDeposit(o);
    const total = totalCharge(o);
    const due = Math.max(0, total - got);
    let state = 'ok', label = '已對帳';
    if (total > 0 && got > total) { state = 'over'; label = '超收異常'; }
    else if (expect > 0 && got === 0) { state = 'missing'; label = '未收訂金'; }
    else if (expect > 0 && got < expect) { state = 'partial'; label = '訂金不足'; }
    else if (!o.confirmed && got > 0) { state = 'review'; label = '已收款待確認'; }
    return { o, expect, got, total, due, state, label };
  });
  const need = rows.filter(r=>r.state!=='ok');
  const summary = {
    ok: rows.length - need.length,
    missing: need.filter(r=>r.state==='missing').length,
    partial: need.filter(r=>r.state==='partial').length,
    over: need.filter(r=>r.state==='over').length,
    review: need.filter(r=>r.state==='review').length
  };
  const tableRows = need.slice(0, 30).map(r=>{
    const cls = r.state === 'over' ? 'text-red-700' : (r.state === 'review' ? 'text-blue-700' : 'text-amber-700');
    return '<tr class="border-t">' +
      '<td class="p-2 font-mono text-xs">' + adminEsc(r.o.orderId) + '</td>' +
      '<td class="p-2 font-bold">' + adminEsc(r.o.name || '—') + '</td>' +
      '<td class="p-2 text-right">¥' + Number(r.expect||0).toLocaleString() + '</td>' +
      '<td class="p-2 text-right">¥' + Number(r.got||0).toLocaleString() + '</td>' +
      '<td class="p-2 text-right">¥' + Number(r.due||0).toLocaleString() + '</td>' +
      '<td class="p-2 font-bold ' + cls + '">' + r.label + '</td>' +
      '<td class="p-2 text-right"><button onclick="openEdit(\'' + adminEsc(r.o.orderId) + '\')" class="px-2 py-1 bg-[#1A365D] text-white text-xs rounded">查看</button></td>' +
    '</tr>';
  }).join('');
  const body = '<div class="text-sm space-y-3">' +
    '<div class="grid grid-cols-2 md:grid-cols-5 gap-2">' +
      '<div class="p-3 rounded-lg bg-emerald-50"><div class="text-xs text-slate-500">正常</div><div class="font-bold text-emerald-700">' + summary.ok + '</div></div>' +
      '<div class="p-3 rounded-lg bg-amber-50"><div class="text-xs text-slate-500">未收訂金</div><div class="font-bold text-amber-700">' + summary.missing + '</div></div>' +
      '<div class="p-3 rounded-lg bg-amber-50"><div class="text-xs text-slate-500">訂金不足</div><div class="font-bold text-amber-700">' + summary.partial + '</div></div>' +
      '<div class="p-3 rounded-lg bg-red-50"><div class="text-xs text-slate-500">超收</div><div class="font-bold text-red-700">' + summary.over + '</div></div>' +
      '<div class="p-3 rounded-lg bg-blue-50"><div class="text-xs text-slate-500">待確認</div><div class="font-bold text-blue-700">' + summary.review + '</div></div>' +
    '</div>' +
    '<div class="text-xs text-slate-500">Firebase 版目前依訂單中的訂金、總額、確認狀態自動掃描；尚未接銀行流水匯入，因此不會自動改寫入帳資料。</div>' +
    (need.length ? '<table class="w-full text-xs mt-2 border border-slate-200"><thead><tr class="bg-slate-100"><th class="p-2 text-left">訂單號</th><th class="p-2 text-left">客戶</th><th class="p-2 text-right">應收訂金</th><th class="p-2 text-right">已收</th><th class="p-2 text-right">尾款</th><th class="p-2 text-left">狀態</th><th class="p-2"></th></tr></thead><tbody>' + tableRows + '</tbody></table>' : '<div class="p-4 bg-emerald-50 text-emerald-700 rounded-lg font-bold">目前沒有需要人工處理的對帳異常。</div>') +
  '</div>';
  const html = '<div class="modal-overlay" onclick="if(event.target===this)this.remove()" style="display:flex">' +
    '<div class="modal-frame" style="max-width:780px;height:auto;max-height:80vh">' +
    '<button onclick="this.closest(\'.modal-overlay\').remove()" class="modal-floating-close" aria-label="關閉自動對帳掃描">×</button>' +
    '<div class="modal-box" style="max-width:780px;height:auto;max-height:80vh;padding-top:72px">' +
    '<h3 class="font-bold text-lg text-[#1A365D] mb-3 modal-title-block">🤖 Firebase 自動對帳掃描</h3>' +
    body +
    '<div class="flex gap-2 mt-4 pt-3 border-t"><button onclick="this.closest(\'.modal-overlay\').remove();showSection(\'reconcile\')" class="flex-1 bg-[#1A365D] hover:bg-blue-900 text-white py-2 rounded-lg font-bold">前往對帳分頁</button><button onclick="this.closest(\'.modal-overlay\').remove()" class="flex-1 bg-slate-200 hover:bg-slate-300 py-2 rounded-lg">關閉</button></div>' +
    '</div></div></div>';
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstChild);
}
async function runAutoReconcile(){
  if (useFirebaseAdmin()) { renderFirebaseReconcilePreview(); return; }
  if (currentAgent !== 'Jun') { toast('需要主管權限', 'error'); return; }
  toast('正在掃描収款辨識…');
  let res;
  try {
    const r = await fetch(GAS_URL + '?_cb=' + Date.now(), {
      method:'POST', credentials:'omit', cache:'no-store',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({ action:'autoReconcile', token:adminToken, preview:true })
    });
    res = await r.json();
  } catch(e) { toast('連線失敗：'+e.message, 'error'); return; }
  if (res.status !== 'ok') { toast(res.message || '掃描失敗', 'error'); return; }
  const m = res.matches || 0, a = res.ambiguous || 0, u = res.unlinked || 0;
  let body = '<div class="text-sm space-y-2">' +
    '<div>📊 掃描完成，<b class="text-emerald-700">'+m+'</b> 筆可自動配對、<span class="text-amber-700">'+a+'</span> 筆需人工確認、<span class="text-slate-500">'+u+'</span> 筆找不到對應訂單</div>';
  if (m > 0 && res.matchSamples) {
    body += '<div class="mt-2"><b>會自動填入訂單號的銀行入帳（前 10 筆）：</b></div>' +
      '<table class="w-full text-xs mt-2 border border-slate-200"><thead><tr class="bg-slate-100"><th class="p-1 text-left">銀行 row</th><th class="p-1 text-left">訂單號</th><th class="p-1 text-right">金額</th><th class="p-1 text-right">日期差</th></tr></thead><tbody>' +
      res.matchSamples.slice(0,10).map(s=>'<tr class="border-t"><td class="p-1">'+s.bankRow+'</td><td class="p-1 font-mono">'+s.orderId+'</td><td class="p-1 text-right">¥'+s.amount.toLocaleString()+'</td><td class="p-1 text-right">'+s.daysDiff.toFixed(1)+' 天</td></tr>').join('') +
      '</tbody></table>';
  }
  if (a > 0 && res.ambiguousSamples) {
    body += '<div class="mt-3 text-amber-700"><b>⚠️ 多個候選（不會自動處理）：</b><br>' +
      res.ambiguousSamples.map(s=>'銀行 row '+s.bankRow+'：¥'+s.amount.toLocaleString()+' ↔ '+s.candidates.join(' / ')).join('<br>') + '</div>';
  }
  body += '</div>';
  const html = '<div class="modal-overlay" onclick="if(event.target===this)this.remove()" style="display:flex">' +
    '<div class="modal-frame" style="max-width:640px;height:auto;max-height:80vh">' +
    '<button onclick="this.closest(\'.modal-overlay\').remove()" class="modal-floating-close" aria-label="關閉自動配對預覽">×</button>' +
    '<div class="modal-box" style="max-width:640px;height:auto;max-height:80vh;padding-top:72px">' +
    '<h3 class="font-bold text-lg text-[#1A365D] mb-3 modal-title-block">🤖 自動配對預覽</h3>' +
    body +
    '<div class="flex gap-2 mt-4 pt-3 border-t">' +
      (m > 0 ? '<button onclick="confirmAutoReconcile(this)" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-bold">✓ 套用 '+m+' 筆配對</button>' : '') +
      '<button onclick="this.closest(\'.modal-overlay\').remove()" class="flex-1 bg-slate-200 hover:bg-slate-300 py-2 rounded-lg">取消</button>' +
    '</div></div></div></div>';
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstChild);
}
async function confirmAutoReconcile(btn){
  if (useFirebaseAdmin()) { toast('Firebase 模式下自動對帳尚未遷移；舊 GAS 寫入已停用', 'warning'); return; }
  btn.disabled = true; btn.textContent = '套用中…';
  try {
    const r = await fetch(GAS_URL + '?_cb=' + Date.now(), {
      method:'POST', credentials:'omit', cache:'no-store',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({ action:'autoReconcile', token:adminToken, preview:false })
    });
    const res = await r.json();
    if (res.status !== 'ok') { toast(res.message || '套用失敗', 'error'); return; }
    btn.closest('.modal-overlay').remove();
    toast('✅ 已自動配對 '+res.matches+' 筆', 'success');
    if (typeof loadOrders === 'function') loadOrders();
  } catch(e) {
    toast('連線失敗：'+e.message, 'error');
    btn.disabled = false;
  }
}

// ── A4 EXCEL EXPORT ──
function csvCleanText(value){
  return String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').trim();
}
function csvBookingDateTime(value){
  if (!value) return '';
  const d = typeof parseBookingDate === 'function' ? parseBookingDate(value) : new Date(value);
  if (!d || isNaN(d)) return csvCleanText(value);
  return d.getFullYear() + '/' +
    String(d.getMonth() + 1).padStart(2, '0') + '/' +
    String(d.getDate()).padStart(2, '0') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0');
}
function csvYesNo(value){
  return value ? '有' : '無';
}
function csvMakeupLabel(o){
  const plan = typeof normalizeMakeupPlan === 'function' ? normalizeMakeupPlan(o) : String(o && o.makeupPlan || '').trim();
  const labels = {
    Basic: '基礎化妝',
    Standard: '精緻化妝',
    Premium: '高級化妝',
    No: '無'
  };
  if (labels[plan]) return labels[plan];
  if (/Premium|高級|高级|8000/.test(plan)) return '高級化妝';
  if (/Standard|精緻|精致|5000/.test(plan)) return '精緻化妝';
  if (/Basic|基礎|基础|3000/.test(plan)) return '基礎化妝';
  return (typeof orderHasMakeup === 'function' ? orderHasMakeup(o) : (o && (o.makeup === true || o.makeup === 'true' || o.makeup === '是'))) ? '基礎化妝' : '無';
}
function csvPlatformNote(o){
  const parts = [o && (o.proofNote || o.platformNote || o.platformRemark || o.sourceNote)]
    .map(csvCleanText)
    .flatMap(text => text.split(/\s*[;；]\s*/))
    .filter(text => !/化妝造型|化妝費|makeup/i.test(text))
    .filter(Boolean);
  return parts.filter((part, idx) => parts.indexOf(part) === idx).join(' ');
}
function csvHtml(value){
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function orderExportTableData(list){
  const headers = ['訂單號','姓名','電話','預約時間','人數','髮型','化妝','攝影','平台備註','已付定金','和服價格','備註'];
  const rows = list.map(o=>[
    o.orderId,
    o.name,
    o.phone,
    csvBookingDateTime(o.bookingDate),
    formatGuestCount(o),
    csvYesNo(typeof orderHasHair === 'function' ? orderHasHair(o) : (o.hair === true || o.hair === 'true' || o.hair === '是')),
    csvMakeupLabel(o),
    csvYesNo(typeof orderHasPhoto === 'function' ? orderHasPhoto(o) : (o.photo === true || o.photo === 'true' || o.photo === '是')),
    csvPlatformNote(o),
    typeof orderPaidDeposit === 'function' ? orderPaidDeposit(o) : reconcileDeposit(o),
    o.price || o.kimonoPrice || 0,
    csvCleanText(o.remark || o.note || '')
  ]);
  return { headers, rows };
}
function orderExportHtml(list, title){
  const { headers, rows } = orderExportTableData(list);
  const generatedAt = new Date().toLocaleString('zh-TW', { hour12:false });
  const colClasses = ['col-id','col-name','col-phone','col-time','col-count','col-small','col-makeup','col-small','col-note','col-money','col-money','col-remark'];
  return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">'+
    '<head><meta charset="utf-8"><title>'+csvHtml(title)+'</title>'+
    '<style>'+
    '@page Section1{size:11.69in 8.27in;margin:.25in .22in .25in .22in;mso-page-orientation:landscape}'+
    'div.Section1{page:Section1}'+
    'body{font-family:"Noto Sans TC","Microsoft JhengHei",Arial,sans-serif;color:#111827;margin:0}'+
    '.print-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px}'+
    'h1{font-size:15pt;margin:0}.meta{font-size:8.5pt;color:#475569}'+
    'table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.2pt}'+
    'th,td{border:1px solid #b8c2cc;padding:3px 4px;vertical-align:top;line-height:1.2;word-break:break-word;mso-number-format:"\\@"}'+
    'th{background:#eef2f7;font-weight:800;text-align:left;white-space:nowrap}'+
    '.num{text-align:right;mso-number-format:"0"}'+
    '.col-id{width:70pt}.col-name{width:58pt}.col-phone{width:66pt}.col-time{width:78pt}.col-count{width:34pt}.col-small{width:34pt}.col-makeup{width:54pt}.col-note{width:150pt}.col-money{width:56pt}.col-remark{width:120pt}'+
    '</style>'+
    '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>訂單列印表</x:Name><x:WorksheetOptions><x:FitToPage/><x:Print><x:FitWidth>1</x:FitWidth><x:FitHeight>0</x:FitHeight><x:ValidPrinterInfo/><x:PaperSizeIndex>9</x:PaperSizeIndex><x:HorizontalResolution>600</x:HorizontalResolution><x:VerticalResolution>600</x:VerticalResolution></x:Print><x:Selected/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->'+
    '</head><body><div class="Section1">'+
    '<div class="print-head"><h1>'+csvHtml(title)+'</h1><div class="meta">共 '+rows.length+' 筆 · '+csvHtml(generatedAt)+'</div></div>'+
    '<table><colgroup>'+
    colClasses.map(cls => '<col class="'+cls+'">').join('')+
    '</colgroup><thead><tr>'+
    headers.map((h, i) => {
      return '<th class="'+colClasses[i]+'">'+csvHtml(h)+'</th>';
    }).join('')+
    '</tr></thead><tbody>'+
    rows.map(row => '<tr>'+row.map((c, i) => '<td class="'+colClasses[i]+' '+(i === 9 || i === 10 ? 'num' : '')+'">'+csvHtml(c)+'</td>').join('')+'</tr>').join('')+
    '</tbody></table></div></body></html>';
}
function ordersToA4Excel(list, title){
  const html = orderExportHtml(list, title || '訂單列印表');
  const blob = new Blob(['\ufeff'+html], {type:'application/vnd.ms-excel;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'kimono-orders-table-'+new Date().toISOString().slice(0,10)+'.xls';
  a.click();
  URL.revokeObjectURL(url);
}
function currentOrderExportList(){
  // v2.4.29: store 角色匯出只能匯自家
  const allowed = filterOrdersForRole(allOrders);
  const visibleList = Array.isArray(window.__ordersFilteredList) ? window.__ordersFilteredList : allowed;
  const visibleIds = new Set(visibleList.map(o => o && o.orderId).filter(Boolean));
  return allowed.filter(o => visibleIds.has(o.orderId));
}
function exportCSV(){
  const list = currentOrderExportList();
  if(!list.length){ toast('無資料可匯出','warning'); return; }
  ordersToA4Excel(list, '訂單列印表');
  toast('已匯出表格');
}
function batchExportCSV(){
  if(!selectedIds.size){ toast('請先選取訂單','warning'); return; }
  // v2.4.29: 雙重保險，store 角色僅匯出自家訂單
  const allowed = filterOrdersForRole(allOrders);
  const list = allowed.filter(o=>selectedIds.has(o.orderId));
  ordersToA4Excel(list, '選取訂單列印表');
  toast('已匯出表格 '+list.length+' 筆');
}
