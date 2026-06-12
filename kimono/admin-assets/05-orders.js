// ── DASHBOARD ──
function renderDashboard(){
  // v2.4.29: store 角色 dashboard 只看自家
  const visible = filterOrdersForRole(allOrders);
  const range = document.getElementById('dash-range').value;
  const filtered = visible.filter(o => isInRange(o, range));
  const now = new Date();
  document.getElementById('dash-date').textContent = now.toLocaleDateString('zh-TW',{year:'numeric',month:'long',day:'numeric',weekday:'long'}) + ' · ' + (currentAgent||'');

  const total = filtered.length;
  let pending = 0, confirmed = 0, deposit = 0, due = 0, refund = 0, refundCount = 0;
  filtered.forEach(o => {
    const status = orderStatusOf(o);
    if (status === 'pending_payment' || status === 'pending_review') pending++;
    if (status === 'confirmed') confirmed++;
    deposit += orderPaidDeposit(o);
    if (status === 'balance_due') due += orderDisplayBalance(o);
    const refundAmount = Number(o.refundAmount) || 0;
    refund += refundAmount;
    if (refundAmount > 0) refundCount++;
  });

  document.getElementById('kpi-total').textContent = total;
  document.getElementById('kpi-pending').textContent = pending;
  document.getElementById('kpi-confirmed').textContent = confirmed;
  document.getElementById('kpi-deposit').textContent = fmtY0(deposit);
  document.getElementById('kpi-due').textContent = fmtY0(due);
  document.getElementById('kpi-refund').textContent = fmtY0(refund);

  const confirmRate = total ? Math.round(confirmed/total*100) : 0;
  document.getElementById('kpi-total-trend').textContent = '範圍內全部訂單';
  document.getElementById('kpi-pending-trend').textContent = pending? pending+' 筆需處理' : '已全部處理';
  document.getElementById('kpi-confirmed-trend').textContent = '待到店比例 ' + confirmRate + '%';
  document.getElementById('kpi-deposit-trend').textContent = total? '平均每筆 ¥'+Math.round(deposit/total||0).toLocaleString() : '—';
  document.getElementById('kpi-due-trend').textContent = '待付尾款訂單';
  document.getElementById('kpi-refund-trend').textContent = refundCount? refundCount+' 筆' : '無退款';

  // v2.4.20 D ── 今日入帳計算（今天 JST 收的訂金）
  // v2.4.29: 用 visible (filterOrdersForRole) 取代 allOrders 讓 store 只看自家入帳
  const today0 = new Date(); today0.setHours(0,0,0,0);
  const tomorrow0 = new Date(today0); tomorrow0.setDate(today0.getDate()+1);
  let todayDepSum = 0, todayCount = 0;
  visible.forEach(o => {
    // 用 submitDate 或 paidAt 都行；簡單用 submitDate
    const sd = new Date(o.submitDate || 0);
    const paidDeposit = orderPaidDeposit(o);
    if (!isNaN(sd) && sd >= today0 && sd < tomorrow0 && paidDeposit > 0) {
      todayDepSum += paidDeposit;
      todayCount++;
    }
  });
  const tdEl = document.getElementById('kpi-today-revenue');
  const tdTrend = document.getElementById('kpi-today-revenue-trend');
  if (tdEl) tdEl.textContent = '¥' + todayDepSum.toLocaleString();
  if (tdTrend) tdTrend.textContent = todayCount ? todayCount + ' 筆訂單入帳' : '今天還沒入帳';

  // v2.4.20 F ── 月度預檢按鈕只給 Jun 顯示
  const preBtn = document.getElementById('quick-precheck-btn');
  if (preBtn) {
    if (currentAgent === 'Jun') preBtn.classList.remove('hidden');
    else preBtn.classList.add('hidden');
  }
  // v2.4.32: 自動配對按鈕只給 Jun 顯示
  const autoBtn = document.getElementById('auto-reconcile-btn');
  if (autoBtn) {
    if (currentAgent === 'Jun') autoBtn.classList.remove('hidden');
    else autoBtn.classList.add('hidden');
  }

  renderTrendChart(); // v2.4.20 G
  renderTodos();
  renderHeat();
  renderPlanRatio(filtered);
  renderPlatformRatio(filtered);
  renderUpcoming();
  document.getElementById('tab-count-orders').textContent = allOrders.length;
}

function renderTodos(){
  // v2.4.20: 每筆訂單獨立 + 帶時間戳 + 點處理直接 openEdit + 空 group 隱藏
  // v2.4.29: store 角色只看自家訂單的待辦
  const visible = filterOrdersForRole(allOrders);
  const list = document.getElementById('todo-list');
  const items = [];
  const now = new Date();

  // 1) 客人剛提交退款 (refundReason 含銀行/帳號 + refundAmount=0)
  visible.forEach(o => {
    const hasBank = /銀行[:：]|帳號[:：]/.test(o.refundReason||'');
    if (hasBank && !(Number(o.refundAmount) > 0)) {
      items.push({type:'urgent', icon:'💸', orderId:o.orderId, name:o.name||'—',
        text:'新進退款申請', extra:'(客人已填銀行帳號，待客服確認金額)',
        time: o.submitDate || ''});
    }
  });

  // 2) 訂金超收
  visible.forEach(o => {
    const tc = totalCharge(o); const got = Number(o.deposit)||0;
    if (o.bookingDate && tc>0 && got>tc && !(Number(o.refundAmount)>0)) {
      items.push({type:'urgent', icon:'🧾', orderId:o.orderId, name:o.name||'—',
        text:'訂金超收 ¥'+(got-tc).toLocaleString(), extra:'(已收 ¥'+got.toLocaleString()+' > 體驗 ¥'+tc.toLocaleString()+')',
        time: o.submitDate || ''});
    }
  });

  // 3) 待確認超過 24 小時
  visible.forEach(o => {
    if (!['pending_payment','pending_review'].includes(orderStatusOf(o))) return;
    const c = o.createdAt || o.submitDate;
    if (!c) return;
    const cd = new Date(c);
    if (!isNaN(cd) && (now - cd) > 24*3600*1000) {
      const hours = Math.floor((now - cd) / 3600000);
      items.push({type:'urgent', icon:'🚨', orderId:o.orderId, name:o.name||'—',
        text:'待確認 '+(hours>=24?Math.floor(hours/24)+' 天':hours+' 小時'),
        extra:'(客人匯款後客服未確認)',
        time: c});
    }
  });

  // 4) 退款處理中（已填金額 + 沒填時間）
  visible.forEach(o => {
    if (Number(o.refundAmount)>0 && !o.refundTime) {
      items.push({type:'warn', icon:'↩', orderId:o.orderId, name:o.name||'—',
        text:'退款 ¥'+Number(o.refundAmount).toLocaleString()+(currentRole === 'store' ? ' 待匯款' : ' 已確認待匯款'),
        extra:'(實際匯款後按「✓ 已完成匯款」)',
        time: o.submitDate || ''});
    }
  });

  // v2.4.42f: 5) 明日預約 移除 — 重複「即將到店」 widget 不再重複進「提醒注意」

  // 6) 訂單資料不完整
  visible.forEach(o => {
    if (!isAnomaly(o)) return;
    const missing = [];
    if (!o.name) missing.push('姓名');
    if (!isStoreRole() && !o.phone) missing.push('電話');
    if (!o.bookingDate) missing.push('預約日');
    items.push({type:'info', icon:'⚠️', orderId:o.orderId, name:o.name||'(無名)',
      text:'資料不完整：缺 '+missing.join('/'),
      extra:'',
      time: o.submitDate || ''});
  });

  document.getElementById('todo-count').textContent = items.length+' 項';

  if(!items.length){ list.innerHTML='<div class="text-center text-emerald-600 py-6 font-semibold">🎉 太棒了！目前沒有待辦事項</div>'; return; }

  // 待辦分類成 3 個卡（空的不顯示）
  const groups = {
    urgent: { label: '🚨 緊急處理', items: [], color: 'red' },
    warn:   { label: '⚠️ 提醒注意', items: [], color: 'amber' },
    info:   { label: 'ℹ️ 系統提示', items: [], color: 'blue' }
  };
  items.forEach(it => { if (groups[it.type]) groups[it.type].items.push(it); });

  const visibleGroups = Object.values(groups).filter(g => g.items.length > 0);
  if (!visibleGroups.length) {
    list.innerHTML = '<div class="text-center text-emerald-600 py-6 font-semibold">🎉 太棒了！目前沒有待辦事項</div>';
    return;
  }

  // v2.4.33 A ── 每個分類只顯示前 3 筆，超過彈視窗看全部；緊急仍預設展開
  window.__todoGroupsCache = groups; // 給 modal 重用
  const renderItem = (it, i, color) => {
    const timeStr = it.time ? fmtJSTDateTime(it.time) : '';
    const shortTime = timeStr ? timeStr.replace(/^\d{4}\//, '').slice(0, 11) : '';
    return '<div class="text-xs py-1.5' + (i > 0 ? ' border-t border-' + color + '-200/40' : '') + '">' +
      '<div class="flex items-center gap-2">' +
        '<span class="flex-shrink-0">' + it.icon + '</span>' +
        '<span class="flex-1 text-[#1A365D] font-bold">' + it.name + ' <span class="text-[10px] text-slate-500 font-mono font-normal">' + (it.orderId||'') + '</span></span>' +
        (it.orderId ? '<button onclick="openEdit(\''+it.orderId+'\')" class="flex-shrink-0 px-2 py-1 bg-white border border-' + color + '-300 hover:bg-' + color + '-100 text-[#1A365D] text-[11px] rounded font-bold">處理 →</button>' : '') +
      '</div>' +
      '<div class="text-[11px] mt-0.5 ml-6">' +
        (shortTime ? '<span class="text-slate-400 mr-2">⏰' + shortTime + '</span>' : '') +
        '<span class="text-[#1A365D]">' + it.text + '</span>' +
        (it.extra ? ' <span class="text-slate-500">' + it.extra + '</span>' : '') +
      '</div>' +
    '</div>';
  };
  window.__renderTodoItem = renderItem;

  const TOP_N = 3;
  list.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-3 gap-3">' +
    visibleGroups.map(g => {
      const isUrgent = g.color === 'red';
      const expanded = isUrgent ? ' open' : '';
      const total = g.items.length;
      const shown = g.items.slice(0, TOP_N);
      const hiddenCount = total - shown.length;
      const moreBtn = hiddenCount > 0
        ? '<button onclick="openTodoModal(\''+g.color+'\')" class="w-full mt-2 py-1.5 bg-white border border-' + g.color + '-300 hover:bg-' + g.color + '-100 text-' + g.color + '-700 text-[11px] rounded font-bold">查看全部 ' + total + ' 筆 →</button>'
        : '';
      return '<details' + expanded + ' class="p-3 bg-' + g.color + '-50 rounded-lg border border-' + g.color + '-200">' +
        '<summary class="font-bold text-sm mb-2 text-' + g.color + '-700 cursor-pointer select-none">' + g.label + ' <span class="text-xs">(' + total + ')</span> </summary>' +
        shown.map((it, i) => renderItem(it, i, g.color)).join('') +
        moreBtn +
      '</details>';
    }).join('') + '</div>';
}

// v2.4.33: 待辦分類點「查看全部」彈出 modal
function openTodoModal(color){
  const groups = window.__todoGroupsCache || {};
  const g = Object.values(groups).find(x => x.color === color);
  if (!g) return;
  const renderItem = window.__renderTodoItem;
  const old = document.getElementById('todo-modal');
  if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = 'todo-modal';
  wrap.className = 'todo-modal-bg';
  wrap.onclick = (e) => { if (e.target === wrap) closeTodoModal(); };
  wrap.innerHTML =
    '<div class="custom-modal-frame">' +
      '<button onclick="closeTodoModal()" class="custom-modal-close" aria-label="關閉待辦清單">×</button>' +
    '<div class="todo-modal-card">' +
      '<div class="todo-modal-head">' +
        '<span class="font-bold text-base text-' + g.color + '-700">' + g.label + ' <span class="text-xs">(' + g.items.length + ')</span></span>' +
      '</div>' +
      '<div class="todo-modal-body">' +
        g.items.map((it, i) => renderItem(it, i, g.color)).join('') +
      '</div>' +
    '</div></div>';
  document.body.appendChild(wrap);
}
function closeTodoModal(){
  const old = document.getElementById('todo-modal');
  if (old) old.remove();
}

function renderHeat(){
  // v2.4.20: 緊湊版 14 日熱圖 — 2 列 x 7 格小方塊（節省空間 4 倍）
  // v2.4.29: store 角色只看自家熱度
  const visible = filterOrdersForRole(allOrders);
  const list = document.getElementById('heat-list');
  const today = new Date(); today.setHours(0,0,0,0);
  const countsByDay = new Map();
  visible.forEach(o => {
    const key = orderDayKey(o);
    if (key) countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
  });
  const days = [];
  for(let i=0;i<14;i++){
    const d = new Date(today); d.setDate(today.getDate()+i);
    const cnt = countsByDay.get(orderDayKeyFromDate(d)) || 0;
    days.push({d:d,cnt:cnt});
  }
  const wd = ['日','一','二','三','四','五','六'];
  // 顏色階梯
  const colorOf = (c) => {
    if(c===0) return '#F1F5F9';
    if(c===1) return '#BFDBFE';
    if(c===2) return '#60A5FA';
    if(c===3) return '#3B82F6';
    if(c===4) return '#1E40AF';
    return '#7C2D12'; // 5+
  };
  const cells = days.map(x=>{
    const isToday = x.d.toDateString()===new Date().toDateString();
    const bg = colorOf(x.cnt);
    const textColor = x.cnt>=2 ? '#fff' : '#1A365D';
    const title = (x.d.getMonth()+1)+'/'+x.d.getDate()+' '+wd[x.d.getDay()]+' · '+x.cnt+' 組';
    return '<div title="'+title+'" style="background:'+bg+';color:'+textColor+';padding:6px 4px;border-radius:6px;text-align:center;font-size:11px;'+(isToday?'box-shadow:0 0 0 2px #C9A961':'')+'">' +
      '<div class="font-bold">'+(x.d.getMonth()+1)+'/'+x.d.getDate()+'</div>' +
      '<div class="text-[10px] opacity-80">'+wd[x.d.getDay()]+(isToday?' 今':'')+'</div>' +
      '<div class="font-bold mt-0.5" style="font-size:13px">'+(x.cnt||'·')+'</div>' +
      '</div>';
  }).join('');
  list.innerHTML = '<div class="grid grid-cols-7 gap-1">' + cells + '</div>' +
    '<div class="flex justify-center gap-2 mt-2 text-[10px] text-slate-500">' +
    '<span><span style="display:inline-block;width:10px;height:10px;background:#F1F5F9;border-radius:2px;vertical-align:middle"></span> 0</span>' +
    '<span><span style="display:inline-block;width:10px;height:10px;background:#BFDBFE;border-radius:2px;vertical-align:middle"></span> 1</span>' +
    '<span><span style="display:inline-block;width:10px;height:10px;background:#3B82F6;border-radius:2px;vertical-align:middle"></span> 3+</span>' +
    '<span><span style="display:inline-block;width:10px;height:10px;background:#7C2D12;border-radius:2px;vertical-align:middle"></span> 5+</span>' +
    '</div>';
}

function renderPlanRatio(filtered){
  const counter = {};
  filtered.forEach(o=>{ const p = (o.plan||'未指定').split(/[;,；]/)[0].trim(); counter[p] = (counter[p]||0)+1; });
  const arr = Object.entries(counter).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const total = arr.reduce((s,x)=>s+x[1],0)||1;
  const list = document.getElementById('plan-ratio');
  if(!arr.length){ list.innerHTML='<div class="text-center text-slate-500 py-2">無資料</div>'; return; }
  const colors = ['#1A365D','#C9A961','#10B981'];
  list.innerHTML = arr.map((x,i)=>{
    const pct = Math.round(x[1]/total*100);
    return '<div class="flex justify-between items-center"><span class="text-slate-700 font-semibold truncate">'+x[0]+'</span><span class="font-bold" style="color:'+colors[i]+'">'+pct+'%</span></div>'+
      '<div class="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-0.5"><div class="h-full" style="width:'+pct+'%;background:'+colors[i]+'"></div></div>';
  }).join('');
}

function renderPlatformRatio(filtered){
  const counter = {};
  filtered.forEach(o=>{ const p = (o.platform||'未填').trim() || '未填'; counter[p] = (counter[p]||0)+1; });
  const arr = Object.entries(counter).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const total = arr.reduce((s,x)=>s+x[1],0)||1;
  const list = document.getElementById('platform-ratio');
  if(!arr.length){ list.innerHTML='<div class="text-center text-slate-500 py-2">無資料</div>'; return; }
  const colors = ['#1A365D','#10B981','#F59E0B'];
  list.innerHTML = arr.map((x,i)=>{
    const pct = Math.round(x[1]/total*100);
    return '<div class="flex justify-between items-center"><span class="text-slate-700 font-semibold truncate">'+x[0]+'</span><span class="font-bold" style="color:'+colors[i]+'">'+pct+'%</span></div>'+
      '<div class="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-0.5"><div class="h-full" style="width:'+pct+'%;background:'+colors[i]+'"></div></div>';
  }).join('');
}
function renderTodayTimeline(){
  const el = document.getElementById('timeline-today');
  if(!el) return;
  const visible = filterOrdersForRole(allOrders);
  const t0 = new Date(); t0.setHours(0,0,0,0);
  const t1 = new Date(); t1.setHours(23,59,59,999);
  const todays = visible.map(o => ({ order:o, date:orderBookingDate(o) }))
    .filter(x => x.date && !isNaN(x.date) && x.date>=t0 && x.date<=t1)
    .sort((a,b)=>a.date-b.date);
  if (!todays.length) { el.innerHTML = '<div class="text-xs text-slate-400 italic">今天無預約</div>'; return; }
  let totalHair = 0, totalPhoto = 0;
  const pending = [];
  const checked = [];
  todays.forEach(x => {
    const o = x.order;
    if (orderHasHair(o)) totalHair++;
    if (orderHasPhoto(o)) totalPhoto++;
    if (['balance_due','completed'].includes(orderStatusOf(o))) checked.push(x);
    else pending.push(x);
  });
  let html = '<div class="flex items-center gap-3 mb-2 flex-wrap"><span class="text-xs font-bold text-amber-600">⏰ 今日時間軸 ('+todays.length+' 單)</span>';
  html += '<span class="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">⏳ 待結帳 '+pending.length+'</span>';
  html += '<span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">✓ 已結帳 '+checked.length+'</span>';
  if (totalHair) html += '<span class="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded">💆 '+totalHair+'</span>';
  if (totalPhoto) html += '<span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">📷 '+totalPhoto+'</span>';
  html += '</div>';
  // 待結帳 section
  if (pending.length) {
    html += '<div class="text-[10px] font-bold text-amber-600 mt-2 mb-1">⏳ 待結帳</div>';
    html += pending.map(x=>{
    const o = x.order;
    const d = x.date;
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    const hair = orderHasHair(o)?'💆':'';
    const photo = orderHasPhoto(o)?'📷':'';
    const status = orderStatusOf(o);
    const checked = ['balance_due','completed'].includes(status);
    const dot = checked ? 'bg-emerald-500' : (status === 'confirmed' ? 'bg-amber-400' : 'bg-slate-300');
    return '<div class="flex items-center gap-2 py-1 text-xs cursor-pointer hover:bg-slate-50 rounded px-1" onclick="openEdit(\''+o.orderId+'\')">' +
      '<span class="font-mono font-bold text-[#1A365D] w-12">'+hh+':'+mm+'</span>' +
      '<span class="inline-block w-2 h-2 rounded-full '+dot+'"></span>' +
      '<span class="flex-1 truncate"><b>'+(o.name||'—')+'</b> · '+formatGuestCount(o)+' '+hair+photo+'</span>' +
      (checked?'<span class="text-[10px] text-emerald-700">已結帳</span>':'') +
      '</div>';
    }).join('');
  }
  // 已結帳 section
  if (checked.length) {
    html += '<div class="text-[10px] font-bold text-emerald-600 mt-3 mb-1">✓ 已結帳</div>';
    html += checked.map(x=>{
      const o = x.order;
      const d = x.date;
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      const hair = orderHasHair(o)?'💆':'';
      const photo = orderHasPhoto(o)?'📷':'';
      return '<div class="flex items-center gap-2 py-1 text-xs cursor-pointer hover:bg-slate-50 rounded px-1 opacity-70" onclick="openEdit(\''+o.orderId+'\')">' +
        '<span class="font-mono font-bold text-emerald-700 w-12">'+hh+':'+mm+'</span>' +
        '<span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>' +
        '<span class="flex-1 truncate"><b>'+(o.name||'—')+'</b> · '+formatGuestCount(o)+' '+hair+photo+'</span>' +
        '<span class="text-[10px] text-emerald-700">已結帳</span>' +
        '</div>';
    }).join('');
  }
  el.innerHTML = html;
}

function renderUpcoming(){
  // v2.5h: 順便 render today timeline
  if (typeof renderTodayTimeline==='function') renderTodayTimeline();
  // v2.4.29: store 角色只看自家來店預約
  const visible = filterOrdersForRole(allOrders);
  const list = document.getElementById('upcoming-list');
  const range = (document.getElementById('upcoming-range')||{}).value || '3days';
  const today0 = new Date(); today0.setHours(0,0,0,0);
  let start = new Date(today0), endDate = new Date(today0);
  if(range==='today') endDate.setDate(today0.getDate()+1);
  else if(range==='tomorrow') { start.setDate(today0.getDate()+1); endDate.setDate(today0.getDate()+2); }
  else if(range==='3days') endDate.setDate(today0.getDate()+3);
  else endDate.setDate(today0.getDate()+7);
  const upcoming = visible.map(o => ({ order:o, date:orderBookingDate(o) }))
    .filter(x => x.date && !isNaN(x.date) && x.date>=start && x.date<endDate)
    .sort((a,b)=>a.date-b.date);
  if(!upcoming.length){ list.innerHTML='<div class="text-center text-slate-500 py-4 font-semibold">此期間無預約</div>'; return; }
  list.innerHTML = upcoming.map(x=>{
    const o = x.order;
    const d = x.date;
    const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());  // v2.4.42h: zero out hours
    const days = dDay ? Math.round((dDay-today0)/(86400000)) : 0;
    const dayLabel = days<=0?'今天':days===1?'明天':'剩 '+days+' 天';
    const statusMeta = orderStatusMeta(orderStatusOf(o));
    const badge = '<span class="order-status-control '+statusMeta.css+'"><span class="order-status-icon">'+statusMeta.icon+'</span><span>'+statusMeta.label+'</span></span>';
    return '<div class="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer border border-slate-100" onclick="openEdit(\''+(o.orderId||'')+'\')">'+
      '<div class="flex-1 min-w-0"><div class="font-bold text-sm truncate">'+(o.name||'—')+' <span class="text-[10px] text-slate-500 font-mono font-normal">'+(o.orderId||'')+'</span></div>'+
      '<div class="text-[11px] text-slate-700">'+fmtDate(o.bookingDate)+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+' · '+formatGuestCount(o)+' '+(orderHasHair(o)?'💆':'')+(orderHasPhoto(o)?'📷':'')+'</div></div>'+
      '<div class="flex flex-col items-end gap-0.5 ml-2">'+badge+'<span class="text-[10px] font-bold text-[#C9A961]">'+dayLabel+'</span></div></div>';
  }).join('');
}



function populateFilters(){
  const plans = new Set(); const platforms = new Set();
  allOrders.forEach(o=>{
    if(o.plan) (o.plan+'').split(/[;,；]/).forEach(p=>{ if(p.trim()) plans.add(p.trim()); });
    if(o.platform && (o.platform+'').trim()) platforms.add((o.platform+'').trim());
  });
  const fp = document.getElementById('f-plan'); const fl = document.getElementById('f-platform');
  fp.innerHTML = '<option value="">全部款式</option>' + [...plans].map(p=>'<option>'+p+'</option>').join('');
  fl.innerHTML = '<option value="">全部來源</option>' + [...platforms].map(p=>'<option>'+p+'</option>').join('');
}

function setFilter(f, btn){
  if (currentRole === 'store' && ['pending', 'confirmed', 'refund', 'duebalance', 'anomaly'].indexOf(f) >= 0) f = 'all';
  currentFilter = f;
  document.querySelectorAll('#sec-orders .tab-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  // v2.3: clear leftover date range when switching status filter
  // (otherwise 行事曆 modal-set date keeps filtering things out)
  const dFrom = document.getElementById('f-date-from');
  const dTo   = document.getElementById('f-date-to');
  if (dFrom) dFrom.value = '';
  if (dTo)   dTo.value   = '';
  filterOrders();
}

// v2.6: 一鍵清除所有篩選條件，回到「全部」
function resetAllFilters(){
  ['f-search','f-date-from','f-date-to','f-plan','f-platform','f-hair','f-photo'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.value = '';
  });
  const fSort = document.getElementById('f-sort'); if(fSort) fSort.value = 'booking-desc';
  const allBtn = document.querySelectorAll('#sec-orders .tab-btn')[0];
  setFilter('all', allBtn);
}

function normalizedOrderPhone(o) {
  return String(o && o.phone || '').replace(/\D/g, '');
}

function orderBookingDate(o) {
  return parseBookingDate(o && o.bookingDate) || new Date(o && o.bookingDate);
}

function orderDayKeyFromDate(d) {
  if (!d || isNaN(d)) return '';
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function orderDayKey(o) {
  return orderDayKeyFromDate(orderBookingDate(o));
}

function orderHasHair(o) {
  return o && (o.hair === true || o.hair === 'true' || o.hair === '是');
}

function orderHasPhoto(o) {
  return o && (o.photo === true || o.photo === 'true' || o.photo === '是');
}

function buildVisitCountMap(orders) {
  const counts = new Map();
  (orders || []).forEach(o => {
    const phone = normalizedOrderPhone(o);
    if (!phone) return;
    counts.set(phone, (counts.get(phone) || 0) + 1);
  });
  return counts;
}

function visitCountBadge(o, counts, compact) {
  const phone = normalizedOrderPhone(o);
  if (!phone || !counts) return '';
  const cnt = counts.get(phone) || 0;
  if (cnt >= 3) {
    return compact
      ? '<span class="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">⭐'+cnt+'</span>'
      : '<span class="text-[11px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-1">⭐'+cnt+'</span>';
  }
  if (cnt >= 2) {
    return compact
      ? '<span class="text-[10px] text-slate-500">'+cnt+'訪</span>'
      : '<span class="text-[11px] text-slate-500 ml-1">'+cnt+'訪</span>';
  }
  return '';
}

function filterOrders(){
  if (currentRole === 'store' && ['pending', 'confirmed', 'refund', 'duebalance', 'anomaly'].indexOf(currentFilter) >= 0) currentFilter = 'all';
  const q = (document.getElementById('f-search').value||'').toLowerCase();
  const dFrom = document.getElementById('f-date-from').value;
  const dTo = document.getElementById('f-date-to').value;
  // v2.5: store role only sees their own orders
  const fPlan = document.getElementById('f-plan').value;
  const fStore = (document.getElementById('f-store') || {}).value || '';
  const fPlatform = document.getElementById('f-platform').value;
  const fHair = document.getElementById('f-hair').value;
  const fPhoto = document.getElementById('f-photo').value;
  const fSort = document.getElementById('f-sort').value;

  let list = filterOrdersForRole(allOrders.slice());

  document.getElementById('cnt-all').textContent = list.length;
  document.getElementById('cnt-pending').textContent = list.filter(o=>['pending_payment','pending_review'].includes(orderStatusOf(o))).length;
  document.getElementById('cnt-confirmed').textContent = list.filter(o=>orderStatusOf(o)==='confirmed').length;
  document.getElementById('cnt-refund').textContent = list.filter(o=>['refund_requested','refunding','refunded'].includes(orderStatusOf(o))).length;
  document.getElementById('cnt-anomaly').textContent = list.filter(isAnomaly).length;
  // v2.5g: 待收尾款 count
  (function(){const el=document.getElementById('cnt-duebalance');if(!el)return;el.textContent=list.filter(o=>orderStatusOf(o)==='balance_due').length;})();
  // Today count
  (function(){
    const today0=new Date(); today0.setHours(0,0,0,0);
    const today1=new Date(); today1.setHours(23,59,59,999);
    const todayCnt = list.filter(o=>{const d=new Date(o.bookingDate); return !isNaN(d) && d>=today0 && d<=today1;}).length;
    const cntEl = document.getElementById('cnt-today'); if(cntEl) cntEl.textContent = todayCnt;
  })();

  // Today filter — orders whose bookingDate is today (JST)
  if(currentFilter==='today') {
    const today0 = new Date(); today0.setHours(0,0,0,0);
    const today1 = new Date(); today1.setHours(23,59,59,999);
    list = list.filter(o=>{ const d=new Date(o.bookingDate); return !isNaN(d) && d>=today0 && d<=today1; });
  }
  if(currentFilter==='pending') list = list.filter(o=>['pending_payment','pending_review'].includes(orderStatusOf(o)));
  if(currentFilter==='confirmed') list = list.filter(o=>orderStatusOf(o)==='confirmed');
  if(currentFilter==='refund') list = list.filter(o=>['refund_requested','refunding','refunded'].includes(orderStatusOf(o)));
  if(currentFilter==='anomaly') list = list.filter(isAnomaly);
  if(currentFilter==='duebalance') list = list.filter(o=>orderStatusOf(o)==='balance_due');

  if(q) list = list.filter(o=>(o.name||'').toLowerCase().includes(q)||(o.phone||'').includes(q)||(o.orderId||'').toLowerCase().includes(q)||(o.email||'').toLowerCase().includes(q));
  if(dFrom) list = list.filter(o=>{const d=new Date(o.bookingDate); return !isNaN(d) && d>=new Date(dFrom);});
  if(dTo) list = list.filter(o=>{const d=new Date(o.bookingDate); const dt=new Date(dTo); dt.setHours(23,59,59); return !isNaN(d) && d<=dt;});
  if(fPlan) list = list.filter(o=>(o.plan||'').includes(fPlan));
  if(fStore) list = list.filter(o=>orderBelongsToStore(o, fStore));
  if(fPlatform) list = list.filter(o=>(o.platform||'')===fPlatform);
  if(fHair!=='') list = list.filter(o=>String(o.hair===true||o.hair==='true')===fHair);
  if(fPhoto!=='') list = list.filter(o=>String(o.photo===true||o.photo==='true')===fPhoto);

  // Default sort: most recently submitted first (so today's new orders surface)
  if(!fSort) list.sort((a,b)=> new Date(b.submitDate||b.createdAt||b.bookingDate||0) - new Date(a.submitDate||a.createdAt||a.bookingDate||0));
  if(fSort==='booking-asc') list.sort((a,b)=>new Date(a.bookingDate||0)-new Date(b.bookingDate||0));
  if(fSort==='booking-desc') list.sort((a,b)=>new Date(b.bookingDate||0)-new Date(a.bookingDate||0));
  if(fSort==='amount-desc') list.sort((a,b)=>totalAmount(b)-totalAmount(a));
  if(fSort==='due-desc') list.sort((a,b)=>orderDisplayBalance(b)-orderDisplayBalance(a));
  if(fSort==='recent-submit') list.sort((a,b)=>new Date(b.submitDate||b.createdAt||0)-new Date(a.submitDate||a.createdAt||0));
  if(fSort==='visits-desc') {
    const visitCounts = buildVisitCountMap(allOrders);
    list.sort((a,b)=>(visitCounts.get(normalizedOrderPhone(b))||0)-(visitCounts.get(normalizedOrderPhone(a))||0));
  }

  document.getElementById('showing-count').textContent = list.length;
  document.getElementById('total-count').textContent = allOrders.length;
  renderOrders(list);
}

// v2.5d: 訂單管理 列表/卡片 view mode
function setOrderView(mode){
  try{ localStorage.setItem('orders_view', mode); }catch(e){}
  syncOrderViewIndicator(mode);
  if(typeof filterOrders==='function') filterOrders();
}
function syncOrderViewIndicator(mode){
  document.querySelectorAll('#orders-view-card, #orders-view-list').forEach(b=>{
    b.classList.remove('bg-[#1A365D]','text-white');
    b.classList.add('bg-white','text-slate-600');
  });
  const active = document.getElementById('orders-view-' + mode);
  if(active){ active.classList.remove('bg-white','text-slate-600'); active.classList.add('bg-[#1A365D]','text-white'); }
}
function getOrderView(){ try{ return localStorage.getItem('orders_view') || 'list'; }catch(e){ return 'list'; } }

function orderDisplayTotal(o) {
  if (Number.isFinite(Number(o && o.totalJpy)) && Number(o.totalJpy) > 0) {
    return Number(o.totalJpy);
  }
  return Math.max(0,
    Number(o.price || o.kimonoPrice || 0)
    + Number(o.hairFee || 0)
    + Number(o.photoFee || 0)
    - Number(o.discountRefundAmount || 0)
  );
}

function orderDisplayBalance(o) {
  const status = orderStatusOf(o);
  const actualReceived = o && o.storeActualReceived !== undefined ? o.storeActualReceived : o && o.storeActualReceivedJpy;
  if (status === 'completed') return 0;
  return Math.max(0,
    orderDisplayTotal(o)
    - orderPaidDeposit(o)
    - Number(actualReceived || 0)
  );
}

function orderPaidDeposit(o) {
  const refundAmount = o && o.refundAmount !== undefined ? o.refundAmount : o && o.refundAmountJpy;
  return Math.max(0, Number(o && o.deposit || 0) - Number(refundAmount || 0));
}

function orderStatusOf(o) {
  return String(o && o.status || (o && o.confirmed ? 'confirmed' : 'pending_review'));
}

function isOrderConfirmedOrLater(o) {
  return ['confirmed', 'checked_in', 'balance_due', 'completed'].includes(orderStatusOf(o));
}

const ORDER_STATUS_META = {
  pending_payment: { label:'待付款', icon:'💳', css:'status-pending-payment' },
  pending_review: { label:'待確認', icon:'⏳', css:'status-pending-review' },
  confirmed: { label:'待到店', icon:'📅', css:'status-confirmed' },
  checked_in: { label:'待結帳', icon:'💰', css:'status-checked-in' },
  balance_due: { label:'待付尾款', icon:'💰', css:'status-balance-due' },
  completed: { label:'已完成', icon:'✓', css:'status-completed' },
  refund_requested: { label:'申請退款', icon:'↩', css:'status-refund-requested' },
  refunding: { label:'退款中', icon:'↩', css:'status-refunding' },
  refunded: { label:'已退款', icon:'✓', css:'status-refunded' },
  cancelled: { label:'已取消', icon:'×', css:'status-cancelled' }
};

const ORDER_STATUS_NEXT = {
  pending_payment: 'pending_review',
  pending_review: 'confirmed',
  balance_due: 'completed',
  refund_requested: 'refunding',
  refunding: 'refunded'
};

const ORDER_STATUS_EXTRA_NEXT = {
  pending_payment: ['cancelled'],
  pending_review: ['cancelled'],
  confirmed: ['cancelled'],
  cancelled: ['pending_review', 'confirmed']
};

function canManageOrderStatus(status) {
  if (!useFirebaseAdmin()) return false;
  const role = localStorage.getItem('admin_firebaseRole') || '';
  if (['head_store_manager', 'store_manager', 'store_staff'].includes(role)) return false;
  return ['owner', 'admin', 'agent'].includes(role);
}

function orderNextStatusOptions(status) {
  const role = localStorage.getItem('admin_firebaseRole') || '';
  if (status === 'cancelled' && role !== 'owner') return [];
  const options = [];
  if (ORDER_STATUS_NEXT[status]) options.push(ORDER_STATUS_NEXT[status]);
  (ORDER_STATUS_EXTRA_NEXT[status] || []).forEach(next => {
    if (!options.includes(next)) options.push(next);
  });
  return options;
}

function orderStatusMeta(status) {
  return ORDER_STATUS_META[status] || { label:status || '未知狀態', icon:'•', css:'status-unknown' };
}

function renderOrderStatusControl(o, size) {
  const status = orderStatusOf(o);
  const meta = orderStatusMeta(status);
  const nextStatuses = orderNextStatusOptions(status);
  const editable = canManageOrderStatus(status) && nextStatuses.length > 0;
  const options = [status].concat(editable ? nextStatuses : []);
  return '<span class="order-status-control '+(size === 'large' ? 'is-large ' : '')+(editable ? 'is-editable ' : '')+meta.css+'" onclick="openOrderStatusPicker(event,this)">'+
    '<span class="order-status-icon" aria-hidden="true">'+meta.icon+'</span>'+
    '<select aria-label="訂單狀態" title="'+(editable?'點擊修改訂單狀態':'目前帳號不可修改狀態')+'" '+
      'onclick="event.stopPropagation()" onchange="changeOrderStatus(\''+(o.orderId||'')+'\',this.value,this)" '+(editable?'':'disabled')+'>'+
      options.map(statusOption => {
        const optionMeta = orderStatusMeta(statusOption);
        return '<option value="'+statusOption+'" '+(statusOption===status?'selected':'')+'>'+optionMeta.label+'</option>';
      }).join('')+
    '</select>'+
  '</span>';
}

function openOrderStatusPicker(event, control) {
  if (event.target && event.target.tagName === 'SELECT') return;
  event.stopPropagation();
  const select = control.querySelector('select');
  if (!select || select.disabled) return;
  if (typeof select.showPicker === 'function') select.showPicker();
  else {
    select.focus();
    select.click();
  }
}

async function changeOrderStatus(orderId, nextStatus, selectEl) {
  const o = allOrders.find(x => x.orderId === orderId);
  if (!o) return;
  const previousStatus = orderStatusOf(o);
  if (nextStatus === previousStatus) return;
  if (!orderNextStatusOptions(previousStatus).includes(nextStatus)) {
    selectEl.value = previousStatus;
    alert('此狀態不可切換到「'+orderStatusMeta(nextStatus).label+'」。');
    return;
  }
  const nextMeta = orderStatusMeta(nextStatus);
  const confirmMessage = nextStatus === 'cancelled'
    ? '確認取消訂單「'+orderId+'」？\n\n取消後狀態會變為「已取消」，請確認客人確實取消，且此操作已完成內部確認。'
    : previousStatus === 'cancelled'
      ? '確認恢復已取消訂單「'+orderId+'」為「'+nextMeta.label+'」？\n\n此操作僅 owner 可執行，請確認訂單需要重新進入流程。'
      : '確認將訂單「'+orderId+'」改為「'+nextMeta.label+'」？';
  if (!confirm(confirmMessage)) {
    selectEl.value = previousStatus;
    return;
  }
  selectEl.disabled = true;
  try {
    const data = await callFirebaseAdminFunction('/transitionOrder', {
      orderId: o.firebaseDocId || o.orderId,
      status: nextStatus
    });
    o.status = nextStatus;
    o.confirmed = isOrderConfirmedOrLater(o);
    if (nextStatus === 'cancelled') o.confirmed = false;
    if (previousStatus === 'cancelled' && nextStatus === 'pending_review') o.confirmed = false;
    if (previousStatus === 'cancelled' && nextStatus === 'confirmed') o.confirmed = true;
    if (nextStatus === 'completed') o.balanceDue = 0;
    if (editingOrder && editingOrder.orderId === orderId) {
      editingOrder = o;
      renderEditModalStatus(o);
      applyStoreOrderReadOnlyMode(o);
    }
    filterOrders();
    renderDashboard();
    toast('狀態已更新為「'+nextMeta.label+'」');
    return data;
  } catch (e) {
    selectEl.disabled = false;
    selectEl.value = previousStatus;
    alert('狀態更新失敗：'+e.message);
  }
}

function renderOrders(orders){
  const el = document.getElementById('orders-list');
  const visitCounts = buildVisitCountMap(allOrders);
  const viewMode = getOrderView();
  syncOrderViewIndicator(viewMode);
  // v2.5d: 列表 view
  if (viewMode === 'list' && orders.length > 0) {
    const empty = document.getElementById('orders-empty');
    if (empty) empty.classList.add('hidden');
    el.className = '';
    const statusHeader = '<th class="p-2 text-center">狀態</th>';
    el.innerHTML = '<div class="overflow-x-auto bg-white rounded-lg border border-slate-200"><table class="w-full text-sm"><thead class="bg-slate-50 text-xs"><tr><th class="p-2 text-left">編號</th><th class="p-2 text-left">姓名</th><th class="p-2 text-left">門市</th><th class="p-2 text-left">體驗日</th><th class="p-2 text-center">人</th><th class="p-2 text-center">加值</th><th class="p-2 text-right">總價</th><th class="p-2 text-right">尾款</th>' + statusHeader + '<th class="p-2 text-right">動作</th></tr></thead><tbody>' + orders.map(o => {
      const bd = parseBookingDate(o.bookingDate) || new Date(o.bookingDate);
      const bdStr = bd && !isNaN(bd) ? ((bd.getMonth()+1) + '/' + bd.getDate() + ' ' + String(bd.getHours()).padStart(2,'0') + ':' + String(bd.getMinutes()).padStart(2,'0')) : '—';
      const hair = (o.hair===true||o.hair==='true'||o.hair==='是') ? '💆' : '';
      const photo = (o.photo===true||o.photo==='true'||o.photo==='是') ? '📷' : '';
      const total = orderDisplayTotal(o);
      const due = orderDisplayBalance(o);
      const statusCell = '<td class="p-2 text-center">' + renderOrderStatusControl(o, 'card') + '</td>';
      const visits = visitCountBadge(o, visitCounts, true);
      return '<tr class="border-t hover:bg-slate-50"><td class="p-2 font-mono text-xs">' + (o.orderId||'') + '</td><td class="p-2 font-bold">' + (o.name||'—') + (visits ? ' ' + visits : '') + '</td><td class="p-2">' + (o.storeKey||'—') + '</td><td class="p-2 whitespace-nowrap">' + bdStr + '</td><td class="p-2 text-center">' + formatGuestCount(o) + '</td><td class="p-2 text-center">' + (hair+photo||'—') + '</td><td class="p-2 text-right font-bold">¥' + total.toLocaleString() + '</td><td class="p-2 text-right ' + (due>0?'text-amber-700 font-bold':'text-slate-400') + '">' + (due>0?'¥'+due.toLocaleString():'—') + '</td>' + statusCell + '<td class="p-2 text-right whitespace-nowrap"><button onclick="openEdit(\'' + o.orderId + '\')" class="px-2 py-1 bg-[#1A365D] text-white text-xs rounded">✏️</button></td></tr>';
    }).join('') + '</tbody></table></div>';
    document.getElementById('showing-count').textContent = orders.length;
    return;
  }
  // Restore grid class for card view
  el.className = 'order-grid-inner';
  const empty = document.getElementById('orders-empty');
  if(!orders.length){
    el.innerHTML='';
    // v2.6: 列出目前生效中的篩選條件，並提供一鍵清除按鈕
    const reasons = [];
    if(currentFilter && currentFilter !== 'all') {
      const labelMap = {today:'📍 今天',pending:'待確認',confirmed:'待到店',refund:'退款流程',duebalance:'待付尾款',anomaly:'⚠ 異常'};
      reasons.push('狀態：' + (labelMap[currentFilter] || currentFilter));
    }
    const fs = document.getElementById('f-search'); if(fs && fs.value) reasons.push('關鍵字：「' + fs.value + '」');
    const fdf = document.getElementById('f-date-from'); if(fdf && fdf.value) reasons.push('起日：' + fdf.value);
    const fdt = document.getElementById('f-date-to'); if(fdt && fdt.value) reasons.push('迄日：' + fdt.value);
    const fp = document.getElementById('f-plan'); if(fp && fp.value) reasons.push('款式：' + fp.value);
    const fpl = document.getElementById('f-platform'); if(fpl && fpl.value) reasons.push('來源：' + fpl.value);
    const fh = document.getElementById('f-hair'); if(fh && fh.value!=='') reasons.push('妝髮：' + (fh.value==='true'?'有':'無'));
    const fph = document.getElementById('f-photo'); if(fph && fph.value!=='') reasons.push('攝影：' + (fph.value==='true'?'有':'無'));
    if(reasons.length) {
      empty.innerHTML = '<div class="text-center py-10">'+
        '<div class="text-5xl mb-3">🔍</div>'+
        '<div class="font-bold text-[#1A365D] text-lg mb-2">沒有符合條件的訂單</div>'+
        '<div class="text-sm text-slate-600 mb-4">目前篩選條件：'+
          '<div class="flex flex-wrap gap-2 justify-center mt-2">'+
          reasons.map(r=>'<span class="bg-slate-100 px-3 py-1 rounded-full text-xs font-semibold text-slate-700">'+r+'</span>').join('')+
          '</div></div>'+
        '<button onclick="resetAllFilters()" class="btn-navy px-5 py-2 rounded-xl text-sm">↻ 清除所有篩選</button>'+
        '</div>';
    } else {
      empty.innerHTML = '<div class="text-center py-10 text-slate-600 font-semibold">目前沒有訂單資料</div>';
    }
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const now = new Date();
  el.innerHTML = orders.map(o=>{
    const storeRole = isStoreRole();
    const anomaly = isAnomaly(o);
    const overdueClass = (['pending_payment','pending_review'].includes(orderStatusOf(o)) && o.createdAt && (now-new Date(o.createdAt))>24*3600*1000) ? 'urgent' : '';
    const cls = anomaly ? 'urgent' : (overdueClass || '');
    const sel = selectedIds.has(o.orderId) ? 'selected' : '';

    const hairTag = (o.hair === true || o.hair === 'true') ? '<span class="tag">💆 妝髮</span>' : '';
    const photoTag = (o.photo === true || o.photo === 'true') ? '<span class="tag">📷 攝影</span>' : '';

    const total = orderDisplayTotal(o);
    const due = orderDisplayBalance(o);
    const days = (function(){if(!o.bookingDate)return null;const d=parseBookingDate(o.bookingDate);if(!d)return null;const t=new Date();t.setHours(0,0,0,0);const dd=new Date(d.getFullYear(),d.getMonth(),d.getDate());return Math.round((dd-t)/86400000);})();
    const daysTag = days!==null && !isNaN(days) ? (days<0? '<span class="pill bg-slate-200 text-slate-700">已過 '+Math.abs(days)+' 天</span>' : days===0? '<span class="pill bg-amber-100 text-amber-800">📍 今天到店</span>' : days<=3? '<span class="pill bg-amber-100 text-amber-800">⏰ 剩 '+days+' 天</span>' : '<span class="pill bg-blue-100 text-blue-800">剩 '+days+' 天</span>') : '';

    return '<div class="order-card '+cls+' '+sel+' p-3 md:p-4" style="margin-bottom:0">'+
      '<div class="flex flex-col items-stretch gap-2 md:gap-3">'+
        '<div class="flex items-start gap-2">'+
          '<input type="checkbox" class="checkbox-lg mt-1 flex-shrink-0" '+(selectedIds.has(o.orderId)?'checked':'')+' onclick="event.stopPropagation();toggleSelect(\''+(o.orderId||'')+'\')">'+
          '<div class="flex-1 min-w-0">'+
            '<div class="flex items-start justify-between gap-2 mb-2">'+
              '<div class="flex items-center gap-2 flex-wrap min-w-0">'+
                '<span class="font-bold text-[#1A365D] text-base md:text-lg">'+(o.name||'—')+'</span>' + visitCountBadge(o, visitCounts, false)+
                '<span class="order-id-copy-wrap"><span class="text-slate-600 text-xs md:text-sm font-mono">'+(o.orderId||'')+'</span><button type="button" onclick="event.stopPropagation();copyOrderId(\''+(o.orderId||'')+'\')" class="order-id-copy-btn" title="複製訂單編號" aria-label="複製訂單編號">📋</button></span>'+
              '</div>'+
              renderOrderStatusControl(o, 'card')+
            '</div>'+
            '<div class="flex items-center gap-2 mb-2 flex-wrap">'+
              (!storeRole && o.submitDate ? '<span class="text-[11px] text-slate-500 hidden xl:inline">下單 '+fmtJST(o.submitDate)+'</span>':'')+
              (o.platform? '<span class="pill bg-blue-100 text-blue-800">📱 '+o.platform+'</span>':'')+
              (o.storeKey? '<span class="pill bg-purple-100 text-purple-800">🏪 '+o.storeKey+'</span>':'')+
              daysTag+
            '</div>'+
          '<div class="order-card-summary text-sm bg-slate-50 p-2.5 md:p-3 rounded-lg mb-2">'+
            '<div class="summary-row summary-row-main">'+
              '<div class="summary-item"><div class="summary-label">體驗日期</div><div class="summary-value">'+fmtBookingDateTime(o.bookingDate)+'</div></div>'+
              '<div class="summary-item"><div class="summary-label">人數</div><div class="summary-value">'+formatGuestCount(o)+'</div></div>'+
            '</div>'+
            '<div class="summary-row summary-row-money">'+
              '<div class="summary-item"><div class="summary-label">已付定金</div><div class="summary-value">'+fmtY(orderPaidDeposit(o))+'</div></div>'+
              '<div class="summary-item"><div class="summary-label">總價</div><div class="summary-value">'+fmtY(total)+'</div></div>'+
              '<div class="summary-item"><div class="summary-label">待收尾款</div><div class="summary-value '+(isPaidFull(o)?'text-emerald-700 line-through':(due>0?'text-amber-700':'text-emerald-700'))+'">'+(isPaidFull(o)?'¥0 ✓':fmtY(due))+'</div></div>'+
            '</div>'+
            (!storeRole ? '<div class="summary-row summary-row-contact">'+
              '<div class="summary-item"><div class="summary-label">電話</div><div class="summary-value compact phone-value">' + (o.phone? '<a href="tel:'+o.phone+'" class="text-[#1A365D] hover:underline">'+o.phone+'</a><button onclick="event.stopPropagation();navigator.clipboard.writeText(\''+o.phone+'\').then(()=>toast(\'已複製電話\'))" class="text-[10px] px-1 bg-slate-100 hover:bg-slate-200 rounded flex-shrink-0" title="複製">📋</button>' : '—') + '</div></div>'+
              '<div class="summary-item"><div class="summary-label">Email</div><div class="summary-value compact truncate" title="'+(o.email||'')+'">'+(o.email||'—')+'</div></div>'+
            '</div>' : '')+
          '</div>'+
          '<div class="flex flex-wrap gap-1">'+
            (o.coupon? '<span class="tag" style="background:#FCE7F3;color:#9F1239;border-color:#F9A8D4">🎟 '+o.coupon+'</span>':'')+
            ((Number(o.refundAmount)||0) > 0 && !o.refundTime ? '<button onclick="event.stopPropagation();markRefundPaid(\''+(o.orderId||'')+'\',\''+(o.name||'').replace(/\'/g,"\\'")+'\')" class="tag" style="background:#FEE2E2;color:#991B1B;border-color:#FECACA;cursor:pointer" title="按一下標記退款已匯出">↩ 退款 '+fmtY(o.refundAmount)+' (待匯)</button>':'')+
            ((Number(o.refundAmount)||0) > 0 && o.refundTime ? '<span class="tag" style="background:#D1FAE5;color:#065F46;border-color:#A7F3D0">✓ 退款 '+fmtY(o.refundAmount)+' 已匯</span>':'')+
            hairTag+photoTag+
            (o.hairFee && Number(o.hairFee) ? '<span class="tag">妝髮 '+fmtY(o.hairFee)+'</span>' : '')+
            (o.photoFee && Number(o.photoFee) ? '<span class="tag">攝影 '+fmtY(o.photoFee)+'</span>' : '')+
            (o.remark ? '<span class="tag" style="background:#FEF3C7;color:#78350F;border-color:#FCD34D" title="'+(o.remark||'').replace(/"/g,"&quot;")+'">📝 備註</span>' : '')+
            (o.agent? '<span class="tag" style="background:#E0E7FF;color:#3730A3;border-color:#A5B4FC">👤 '+o.agent+'</span>':'')+
          '</div>'+
          '</div>'+ /* close flex-1 */
        '</div>'+ /* close flex items-start (checkbox row) */
        '<div class="flex flex-row gap-1.5 flex-shrink-0 w-full">'+
          '<button onclick="openEdit(\''+(o.orderId||'')+'\')" class="btn-navy px-3 py-1.5 rounded-lg text-sm flex-1">'+(isStoreOrderReadOnly(o)?'👁 查看':'✏️ 編輯')+'</button>'+
          '<button onclick="openMsgTemplate(\''+(o.orderId||'')+'\')" class="px-3 py-1.5 border-2 border-purple-300 text-purple-700 rounded-lg text-sm hover:bg-purple-50 font-semibold" title="複製訊息範本">📨</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

function toggleSelect(id){
  if(selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
  updateBatchBar();
  filterOrders();
}
function clearSelection(){ selectedIds.clear(); updateBatchBar(); filterOrders(); }
function updateBatchBar(){
  const bar = document.getElementById('batch-bar');
  if(selectedIds.size>0){ bar.classList.remove('hidden'); document.getElementById('batch-count').textContent=selectedIds.size; }
  else bar.classList.add('hidden');
}
