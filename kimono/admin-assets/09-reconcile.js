// ── RECONCILE 對帳 ──
function initReconMonths(){
  const hidden = document.getElementById('recon-month');
  const yearSel = document.getElementById('recon-year');
  const monthSel = document.getElementById('recon-month-part');
  if (!hidden || !yearSel || !monthSel) return;
  // v2.4.20: 每次都重建（不再用 cache 阻擋），並合併歷史檔案月份
  const months = new Set();
  allOrders.forEach(o=>{ const m=bookingMonth(o); if(m) months.add(m); });
  // v2.4.43: 不只依賴已載入訂單，固定補前後月份，避免只剩「全部 / 當月」。
  const now = new Date();
  for (let i = -6; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.add(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
  }
  // 加歷史檔案已關帳月份（從 window.__archivedMonthsList 取，由 loadArchivedList 設定）
  const archivedSet = new Set(window.__archivedMonthsList || []);
  archivedSet.forEach(m => months.add(m));
  const sorted = [...months].sort().reverse();
  const cur = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  if(!sorted.includes(cur)) sorted.unshift(cur);
  const currentValue = hidden.value || cur;
  const prevSelected = currentValue && (currentValue === 'all' || /^\d{4}$/.test(currentValue) || sorted.includes(currentValue))
    ? currentValue
    : cur;
  const years = [...new Set(sorted.map(m => m.slice(0, 4)))].sort().reverse();
  const selectedYear = prevSelected === 'all' ? 'all' : prevSelected.slice(0, 4);
  const selectedMonth = /^\d{4}-\d{2}$/.test(prevSelected) ? prevSelected.slice(5, 7) : 'all';
  yearSel.innerHTML = '<option value="all"'+(selectedYear==='all'?' selected':'')+'>全部年份</option>' +
    years.map(y => '<option value="'+y+'"'+(y===selectedYear?' selected':'')+'>'+y+'年</option>').join('');
  updateReconcileMonthOptions(selectedYear, selectedMonth, sorted, archivedSet, cur);
  syncReconcileMonthFilter();
}

function updateReconcileMonthOptions(year, selectedMonth, sorted, archivedSet, cur) {
  const monthSel = document.getElementById('recon-month-part');
  if (!monthSel) return;
  if (!year || year === 'all') {
    monthSel.innerHTML = '<option value="all" selected>全部月份</option>';
    monthSel.disabled = true;
    return;
  }
  monthSel.disabled = false;
  const yearMonths = new Set(sorted.filter(m => m.slice(0, 4) === year).map(m => m.slice(5, 7)));
  for (let i = 1; i <= 12; i++) yearMonths.add(String(i).padStart(2, '0'));
  const monthOptions = [...yearMonths].sort().map(mm=>{
    const m = year + '-' + mm;
    const label = Number(mm)+'月';
    const selected = (mm === selectedMonth) ? ' selected' : '';
    return '<option value="'+mm+'"'+selected+'>'+label+'</option>';
  }).join('');
  monthSel.innerHTML = '<option value="all"'+(selectedMonth==='all'?' selected':'')+'>全年</option>' + monthOptions;
}

function syncReconcileMonthFilter() {
  const hidden = document.getElementById('recon-month');
  const yearSel = document.getElementById('recon-year');
  const monthSel = document.getElementById('recon-month-part');
  if (!hidden) return 'all';
  const year = yearSel ? yearSel.value : 'all';
  const month = monthSel ? monthSel.value : 'all';
  hidden.value = !year || year === 'all' ? 'all' : (month && month !== 'all' ? year + '-' + month : year);
  return hidden.value;
}

function getReconcileMonthFilter() {
  const hidden = document.getElementById('recon-month');
  const yearSel = document.getElementById('recon-year');
  const monthSel = document.getElementById('recon-month-part');
  if (yearSel && monthSel) return syncReconcileMonthFilter();
  return hidden ? (hidden.value || 'all') : 'all';
}

function setReconcileMonthFilter(value) {
  const hidden = document.getElementById('recon-month');
  const yearSel = document.getElementById('recon-year');
  const monthSel = document.getElementById('recon-month-part');
  const filter = value || 'all';
  if (hidden) hidden.value = filter;
  if (!yearSel || !monthSel) return filter;
  if (filter === 'all') {
    yearSel.value = 'all';
    updateReconcileMonthOptions('all', 'all', [], new Set(), '');
    return syncReconcileMonthFilter();
  }
  const year = filter.slice(0, 4);
  const month = /^\d{4}-\d{2}$/.test(filter) ? filter.slice(5, 7) : 'all';
  yearSel.value = year;
  const now = new Date();
  const cur = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const months = [];
  for (let i = -6; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
  }
  allOrders.forEach(o=>{ const m=bookingMonth(o); if(m) months.push(m); });
  const archivedSet = new Set(window.__archivedMonthsList || []);
  archivedSet.forEach(m => months.push(m));
  updateReconcileMonthOptions(year, month, [...new Set(months)].sort().reverse(), archivedSet, cur);
  return syncReconcileMonthFilter();
}

function handleReconYearChange() {
  const yearSel = document.getElementById('recon-year');
  const monthSel = document.getElementById('recon-month-part');
  if (yearSel && monthSel) {
    const selectedMonth = yearSel.value === 'all' ? 'all' : (monthSel.value || 'all');
    const now = new Date();
    const cur = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
    const months = [];
    for (let i = -6; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
    }
    allOrders.forEach(o=>{ const m=bookingMonth(o); if(m) months.push(m); });
    const archivedSet = new Set(window.__archivedMonthsList || []);
    archivedSet.forEach(m => months.push(m));
    updateReconcileMonthOptions(yearSel.value, selectedMonth, [...new Set(months)].sort().reverse(), archivedSet, cur);
  }
  syncReconcileMonthFilter();
  renderReconcile();
}

function handleReconMonthChange() {
  syncReconcileMonthFilter();
  renderReconcile();
}

function orderMatchesReconcileMonth(o, filter) {
  if (!filter || filter === 'all') return true;
  const m = bookingMonth(o);
  if (/^\d{4}$/.test(filter)) return m && m.slice(0, 4) === filter;
  return m === filter;
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
  const month = getReconcileMonthFilter();
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
  if(month && month!=='all') list = list.filter(o=>orderMatchesReconcileMonth(o, month));
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
        '<th class="num">已收訂金</th><th class="num">和服原價</th>'+
        '<th class="num">髮型費</th><th class="num">化妝費</th><th class="num">攝影費</th>'+
        '<th class="num">折扣與退款</th><th class="num">超時污損費</th><th class="num">總價</th>'+
        '<th class="num">實際收款</th><th class="num">平台費</th>'+
        '<th class="num">店鋪利潤</th><th class="num">需付平台</th>'
      : '<th>狀態</th><th>訂單號</th>' + brandHeader + '<th>客戶</th><th>體驗日期</th>'+
        '<th class="num">已收訂金</th><th class="num">和服原價</th>'+
        '<th class="num">折扣與退款</th><th class="num">超時污損費</th><th class="num">總價</th>'+
        '<th class="num">店鋪實收</th><th class="num">尾款</th>'+
        '<th class="num">平台費</th><th class="num">需收店鋪</th>')+
    '</tr></thead><tbody>'+
    list.map(o=>{
      const statusBadge = reconcileStatusBadge(o);
      const amount = reconcileAmounts(o);
      const showStoreReceivable = shouldShowStoreReceivable(o);
      const commonCells =
        '<td>'+renderReconcileOrderStatus(o)+'</td>'+
        (showStoreColumn ? '<td class="font-mono text-sm whitespace-nowrap">'+adminEsc(o.storeKey || o.storeId || '—')+'</td>' : '')+
        '<td class="font-mono text-sm whitespace-nowrap">'+(o.orderId||'')+'</td>'+
        (canSeeMultipleBrandPlatforms() ? '<td>'+platformBadge(o)+'</td>' : '')+
        '<td class="font-bold whitespace-nowrap">'+(o.name||'—')+'</td>'+
        '<td>'+fmtDate(o.bookingDate)+'</td>';
      const amountCells = currentRole === 'store'
        ? '<td class="num">'+fmtY0(amount.deposit)+'</td>'+
          '<td class="num">'+fmtY0(amount.kimonoPrice)+'</td>'+
          '<td class="num">'+fmtY0(amount.hairFee)+'</td>'+
          '<td class="num">'+fmtY0(amount.makeupFee)+'</td>'+
          '<td class="num">'+fmtY0(amount.photoFee)+'</td>'+
          '<td class="num">'+fmtY0(amount.discountRefund)+'</td>'+
          '<td class="num">'+fmtY0(amount.overtimeDamageDeduction)+'</td>'+
          '<td class="num font-bold">'+fmtY0(amount.total)+'</td>'+
          '<td class="num">'+fmtY0(amount.actualReceived)+'</td>'+
          '<td class="num">'+fmtY0(amount.platformFee)+'</td>'+
          '<td class="num font-bold text-[#C9A961]">'+fmtY0(amount.storeBalance)+'</td>'+
          '<td class="num font-bold" style="color:#991B1B">'+fmtSignedY0(amount.platformPayable)+'</td>'
        : '<td class="num">'+fmtY0(amount.deposit)+'</td>'+
          '<td class="num">'+fmtY0(amount.kimonoPrice)+'</td>'+
          '<td class="num">'+fmtY0(amount.discountRefund)+'</td>'+
          '<td class="num">'+fmtY0(amount.overtimeDamageDeduction)+'</td>'+
          '<td class="num font-bold">'+fmtY0(amount.total)+'</td>'+
          '<td class="num">'+fmtY0(amount.actualReceived)+'</td>'+
          '<td class="num font-bold" style="color:#991B1B">'+fmtY0(amount.balance)+'</td>'+
          '<td class="num font-bold text-[#C9A961]">'+fmtY0(amount.platformFee)+'</td>'+
          '<td class="num font-bold" style="color:#991B1B">'+(showStoreReceivable ? fmtSignedY0(amount.storeReceivable) : '')+'</td>';
      return '<tr class="recon-row '+statusBadge.rowClass+'" onclick="openEdit(\''+(o.orderId||'')+'\')">'+
        commonCells+amountCells+
      '</tr>';
    }).join('')+'</tbody></table>';
}

function exportReconCSV(){
  const month = getReconcileMonthFilter();
  const brandEl = document.getElementById('recon-brand');
  const brand = brandEl ? brandEl.value : 'all';
  let list = allOrders.slice();
  if (currentRole === 'store' && currentStoreKey) {
    list = list.filter(o => orderBelongsToStore(o, currentStoreKey));
  }
  if(month && month!=='all') list = list.filter(o=>orderMatchesReconcileMonth(o, month));
  if(brand && brand!=='all') list = list.filter(o=>orderBrandPlatform(o)===brand);
  const headers = currentRole === 'store'
    ? ['平台','狀態','訂單號','客戶','體驗日期','已收訂金','和服原價','髮型費','化妝費','攝影費','折扣與退款','超時污損費','總價','實際收款','平台費','店鋪利潤','需付平台']
    : ['平台','狀態','訂單號','客戶','體驗日期','已收訂金','和服原價','折扣與退款','超時污損費','總價','店鋪實收','尾款','平台費','需收店鋪'];
  const rows = list.map(o=>{
    const st = reconcileOrderStatusLabel(o);
    const amount = reconcileAmounts(o);
    return currentRole === 'store'
      ? [platformLabel(orderBrandPlatform(o)), st, o.orderId, o.name, fmtDate(o.bookingDate), amount.deposit, amount.kimonoPrice, amount.hairFee, amount.makeupFee, amount.photoFee, amount.discountRefund, amount.overtimeDamageDeduction, amount.total, amount.actualReceived, amount.platformFee, amount.storeBalance, amount.platformPayable]
      : [platformLabel(orderBrandPlatform(o)), st, o.orderId, o.name, fmtDate(o.bookingDate), amount.deposit, amount.kimonoPrice, amount.discountRefund, amount.overtimeDamageDeduction, amount.total, amount.actualReceived, amount.balance, amount.platformFee, shouldShowStoreReceivable(o) ? amount.storeReceivable : ''];
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
  let list = filterOrdersForRole(allOrders.slice());
  if(month && month!=='all') list = list.filter(o=>orderMatchesReconcileMonth(o, month));
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

// ── CSV EXPORT ──
function ordersToCSV(list){
  const headers = ['訂單號','姓名','電話','Email','體驗日期','人數','款式','來源','訂金','和服','髮型費','化妝費','攝影費','總計','確認','退款金額','備註'];
  const rows = list.map(o=>[o.orderId, o.name, o.phone, o.email, o.bookingDate? fmtDate(o.bookingDate):'', formatGuestCount(o), o.plan||'', o.platform||'', reconcileDeposit(o), o.price||o.kimonoPrice||0, o.hairFee||0, o.makeupFee||0, o.photoFee||0, totalAmount(o), o.confirmed?'已確認':'待確認', o.refundAmount||0, (o.remark||'').replace(/[\r\n]+/g,' ')]);
  const csv = [headers, ...rows].map(r=>r.map(c=>'"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'kimono-orders-'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
  URL.revokeObjectURL(url);
}
function exportCSV(){
  // v2.4.29: store 角色匯出只能匯自家
  const allowed = filterOrdersForRole(allOrders);
  const visibleList = Array.isArray(window.__ordersFilteredList) ? window.__ordersFilteredList : allowed;
  const visibleIds = new Set(visibleList.map(o => o && o.orderId).filter(Boolean));
  const list = allowed.filter(o => visibleIds.has(o.orderId));
  if(!list.length){ toast('無資料可匯出','warning'); return; }
  ordersToCSV(list);
  toast('已匯出 CSV');
}
function batchExportCSV(){
  if(!selectedIds.size){ toast('請先選取訂單','warning'); return; }
  // v2.4.29: 雙重保險，store 角色僅匯出自家訂單
  const allowed = filterOrdersForRole(allOrders);
  ordersToCSV(allowed.filter(o=>selectedIds.has(o.orderId)));
  toast('已匯出 '+selectedIds.size+' 筆');
}
