// ── CALENDAR ──
function changeMonth(d){ calCursor.setMonth(calCursor.getMonth()+d); renderCalendar(); }
function goToday(){ calCursor = new Date(); renderCalendar(); }
function renderCalendar(){
  // v2.4.29: store 角色行事曆只看自家
  const visible = filterOrdersForRole(allOrders);
  const y = calCursor.getFullYear(); const m = calCursor.getMonth();
  document.getElementById('cal-title').textContent = y+' 年 '+(m+1)+' 月';
  const first = new Date(y,m,1); const startDay = first.getDay();
  const daysInMonth = new Date(y,m+1,0).getDate();
  const prevDays = new Date(y,m,0).getDate();
  const grid = document.getElementById('calendar-grid');
  const today = new Date(); today.setHours(0,0,0,0);
  let html = '';
  for(let i=startDay-1;i>=0;i--){ html += '<div class="calendar-day other-month"><div>'+(prevDays-i)+'</div></div>'; }
  for(let d=1; d<=daysInMonth; d++){
    const dt = new Date(y,m,d);
    const dayOrders = visible.filter(o=>{const od=new Date(o.bookingDate); return !isNaN(od) && od.toDateString()===dt.toDateString();});
    const cnt = dayOrders.length;
    let cls = '';
    if(dt.toDateString()===today.toDateString()) cls += ' today';
    if(cnt>=5) cls += ' full';
    else if(cnt>=3) cls += ' busy';
    else if(cnt>0) cls += ' has-orders';
    // v2.5p: 日格升級 — 加值/報到/收齊統計
    const hairCnt = dayOrders.filter(o=>o.hair===true||o.hair==='true'||o.hair==='是').length;
    const photoCnt = dayOrders.filter(o=>o.photo===true||o.photo==='true'||o.photo==='是').length;
    const checkedCnt = dayOrders.filter(o=>o.checkedInAt).length;
    const isToday = (dt.toDateString()===today.toDateString());
    const isPast = dt < today;
    const peek = dayOrders.slice(0,2).map(o=>{
      const isVip = (function(){var ph=String(o.phone||'').replace(/\D/g,'');if(!ph)return false;return allOrders.filter(x=>String(x.phone||'').replace(/\D/g,'')===ph).length>=3;})();
      return '<div class="text-[11px] truncate font-semibold" title="'+(o.name||'')+'">'+(isVip?'⭐':'')+(o.name||'').slice(0,5)+'</div>';
    }).join('');
    const stats = cnt ? ('<div class="flex items-center gap-1 text-[10px] mt-0.5">' +
      '<span class="font-bold" style="color:'+(cnt>=5?'#7F1D1D':cnt>=3?'#B91C1C':'#1E40AF')+'">'+cnt+'組</span>' +
      (hairCnt?'<span class="text-pink-600">💆'+hairCnt+'</span>':'') +
      (photoCnt?'<span class="text-blue-600">📷'+photoCnt+'</span>':'') +
      ((isToday||isPast)&&cnt>0 ? '<span class="ml-auto '+(checkedCnt===cnt?'text-emerald-600 font-bold':'text-amber-600')+'">'+(checkedCnt===cnt?'✓':checkedCnt+'/'+cnt)+'</span>':'') +
    '</div>') : '';
    html += '<div class="calendar-day'+cls+'" onclick="showDayOrders(\''+y+'-'+(m+1)+'-'+d+'\')"><div class="flex items-baseline justify-between"><div class="font-bold text-sm">'+d+'</div>'+(isToday?'<div class="text-[9px] text-amber-600 font-bold">今日</div>':'')+'</div>'+stats+peek+'</div>';
  }
  const remaining = (7 - (startDay+daysInMonth)%7) % 7;
  for(let i=1;i<=remaining;i++) html += '<div class="calendar-day other-month"><div>'+i+'</div></div>';
  grid.innerHTML = html;
}
function showDayOrders(dateStr){
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  const dayStr = y+'/'+String(m).padStart(2,'0')+'/'+String(d).padStart(2,'0');
  const visible = filterOrdersForRole(allOrders);
  const orders = visible.filter(o=>{
    const od = parseBookingDate(o.bookingDate);
    return od && od.getFullYear()===y && od.getMonth()===m-1 && od.getDate()===d;
  }).sort((a,b)=>parseBookingDate(a.bookingDate)-parseBookingDate(b.bookingDate));

  const old = document.getElementById('cal-day-modal');
  if (old) old.remove();
  const wk = ['週日','週一','週二','週三','週四','週五','週六'][dt.getDay()];
  let html = '<div class="todo-modal-bg" id="cal-day-modal" onclick="if(event.target.id===\'cal-day-modal\')closeCalDayModal()"><div class="custom-modal-frame" style="max-width:720px"><button onclick="closeCalDayModal()" class="custom-modal-close" aria-label="關閉日曆訂單">×</button><div class="todo-modal-card" style="max-width:720px"><div class="todo-modal-head"><span class="font-bold text-lg text-[#1A365D]">📅 '+dayStr+' '+wk+' ('+orders.length+' 單)</span></div><div class="todo-modal-body" style="padding:14px 18px">';

  if (!orders.length) {
    html += '<div class="text-center text-slate-400 py-8">此日無預約</div>';
  } else {
    // Stats bar
    const hairCnt = orders.filter(o=>o.hair===true||o.hair==='true'||o.hair==='是').length;
    const photoCnt = orders.filter(o=>o.photo===true||o.photo==='true'||o.photo==='是').length;
    const checkedCnt = orders.filter(o=>o.checkedInAt).length;
    const totalPax = orders.reduce((s,o)=>s+(Number(o.adults)||0)+(Number(o.children)||0), 0);
    html += '<div class="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100 text-xs flex-wrap">';
    html += '<span class="font-bold text-[#1A365D]">總計 '+orders.length+' 單 / '+totalPax+' 人</span>';
    if (hairCnt) html += '<span class="bg-pink-100 text-pink-700 px-2 py-0.5 rounded">💆 '+hairCnt+'</span>';
    if (photoCnt) html += '<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">📷 '+photoCnt+'</span>';
    html += '<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">✓ '+checkedCnt+'/'+orders.length+'</span>';
    html += '</div>';
    html += orders.map(o=>{
      const bd = parseBookingDate(o.bookingDate);
      const hh = String(bd.getHours()).padStart(2,'0');
      const mm = String(bd.getMinutes()).padStart(2,'0');
      const phoneTail = String(o.phone||'').replace(/\D/g, '').slice(-3);
      const hair = (o.hair===true||o.hair==='true'||o.hair==='是')?'💆':'';
      const photo = (o.photo===true||o.photo==='true'||o.photo==='是')?'📷':'';
      const status = orderStatusOf(o);
      const checked = ['checked_in','balance_due','completed'].includes(status);
      const isVip = (function(){var ph=String(o.phone||'').replace(/\D/g,'');if(!ph)return false;return allOrders.filter(x=>String(x.phone||'').replace(/\D/g,'')===ph).length>=3;})();
      const statusMeta = orderStatusMeta(status);
      const st = statusMeta.icon + statusMeta.label;
      const dotColor = checked?'bg-emerald-500':(status==='confirmed'?'bg-amber-400':'bg-slate-300');
      return '<div class="flex items-center gap-3 py-2 border-b border-slate-50 hover:bg-slate-50 cursor-pointer rounded px-2" onclick="closeCalDayModal();openEdit(\''+o.orderId+'\')">' +
        '<span class="font-mono font-bold text-xl text-[#1A365D] w-16">'+hh+':'+mm+'</span>' +
        '<span class="inline-block w-2 h-2 rounded-full '+dotColor+'"></span>' +
        '<div class="flex-1 min-w-0">' +
          '<div class="font-bold">'+(isVip?'⭐':'')+(o.name||'—')+' <span class="text-xs text-slate-500 font-mono ml-1">'+(o.orderId||'')+'</span></div>' +
          '<div class="text-xs text-slate-600">末'+phoneTail+' · '+formatGuestCount(o)+' '+hair+photo+(o.storeKey?' · 🏪'+o.storeKey:'')+'</div>' +
        '</div>' +
        '<span class="text-xs text-slate-600">'+st+'</span>' +
        '</div>';
    }).join('');
  }
  html += '</div></div></div></div>';
  const wrap = document.createElement('div'); wrap.innerHTML = html;
  document.body.appendChild(wrap.firstChild);
}
function closeCalDayModal(){ const x = document.getElementById('cal-day-modal'); if (x) x.remove(); }

function customerOrderAmounts(o) {
  const kimonoPrice = Number(o.price || o.kimonoPrice || 0);
  const hairFee = Number(o.hairFee || 0);
  const photoFee = Number(o.photoFee || 0);
  const discountRefund = Number(o.discountRefundAmount || 0);
  const total = typeof orderDisplayTotal === 'function'
    ? orderDisplayTotal(o)
    : Math.max(0, kimonoPrice + hairFee + photoFee - discountRefund);
  const balance = typeof orderDisplayBalance === 'function'
    ? orderDisplayBalance(o)
    : Math.max(0, total - Number(o.deposit || 0) - Number(o.storeActualReceived || o.storeActualReceivedJpy || 0));
  const platformFee = Math.max(0, (kimonoPrice - discountRefund) * 0.5);
  return {
    kimonoPrice,
    hairFee,
    photoFee,
    balance,
    platformFee,
    storeProfit: Math.max(0, total - platformFee)
  };
}

function buildCustomers(){
  const map = {};
  allOrders.forEach(o=>{
    const key = String(o.phone || o.email || o.name || '').trim();
    if(!key) return;
    if(!map[key]){
      map[key] = {
        key, name:String(o.name||'未知'), phone:String(o.phone||''), email:String(o.email||''),
        platform:o.platform||'', orders:[]
      };
    }
    if(o.name && map[key].name==='未知') map[key].name = String(o.name);
    if(o.phone && !map[key].phone) map[key].phone = String(o.phone);
    if(o.email && !map[key].email) map[key].email = String(o.email);
    map[key].orders.push(o);
  });
  return Object.values(map).map(c=>{
    const orders = c.orders;
    const totalSpent = orders.reduce((s,o)=>s+orderDisplayTotal(o),0);
    const totalDeposit = orders.reduce((s,o)=>s+(Number(o.deposit)||0),0);
    const money = orders.reduce((sum,o)=>{
      const amount = customerOrderAmounts(o);
      sum.kimonoPrice += amount.kimonoPrice;
      sum.hairFee += amount.hairFee;
      sum.photoFee += amount.photoFee;
      sum.balance += amount.balance;
      sum.platformFee += amount.platformFee;
      sum.storeProfit += amount.storeProfit;
      return sum;
    }, {kimonoPrice:0, hairFee:0, photoFee:0, balance:0, platformFee:0, storeProfit:0});
    const dates = orders.map(o=>new Date(o.bookingDate)).filter(d=>!isNaN(d)).sort((a,b)=>b-a);
    const lastDate = dates[0] || null;
    const firstDate = dates[dates.length-1] || null;
    const refundCount = orders.filter(o=>Number(o.refundAmount)>0).length;
    const isVip = orders.length>=3 || totalSpent>=30000;
    return {...c, count:orders.length, totalSpent, totalDeposit, ...money, lastDate, firstDate, refundCount, isVip};
  });
}

let currentCustFilter = 'all';
function setCustFilter(f, btn){
  currentCustFilter = f;
  document.querySelectorAll('[data-cust-filter]').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderCustomers();
}

function renderCustomers(){
  const storeRole = isStoreRole();
  const searchEl = document.getElementById('cust-search');
  const subtitleEl = document.getElementById('cust-subtitle');
  if(searchEl) searchEl.placeholder = storeRole ? '🔍 搜尋姓名' : '🔍 搜尋姓名 / 電話 / Email';
  if(subtitleEl) subtitleEl.textContent = storeRole ? '自動從訂單聚合，依預約姓名識別客戶' : '自動從訂單聚合，依電話 / Email 識別客戶';

  const q = ((searchEl && searchEl.value) || '').toLowerCase();
  const sort = document.getElementById('cust-sort').value;
  let arr = buildCustomers();

  // 統計卡
  const totalCust = arr.length;
  const vipCust = arr.filter(c=>c.isVip).length;
  const repeatCust = arr.filter(c=>c.count>=2).length;
  // v2.6: 寫進 tab-btn 的計數
  const cAll = document.getElementById('cust-cnt-all'); if(cAll) cAll.textContent = totalCust;
  const cVip = document.getElementById('cust-cnt-vip'); if(cVip) cVip.textContent = vipCust;
  const cRep = document.getElementById('cust-cnt-repeat'); if(cRep) cRep.textContent = repeatCust;
  // v2.5o: lapsed count
  const ninetyAgo = Date.now() - 90*24*3600*1000;
  const lapsedCust = arr.filter(c => c.lastDate && new Date(c.lastDate).getTime() < ninetyAgo).length;
  const cLapsed = document.getElementById('cust-cnt-lapsed'); if(cLapsed) cLapsed.textContent = lapsedCust;
  // v2.6: 套用分類過濾
  if(currentCustFilter === 'lapsed'){
    const ninety = Date.now() - 90*24*3600*1000;
    arr = arr.filter(c => c.lastDate && new Date(c.lastDate).getTime() < ninety);
  }
  if(currentCustFilter === 'vip') arr = arr.filter(c=>c.isVip);
  else if(currentCustFilter === 'repeat') arr = arr.filter(c=>c.count>=2);
  const allSpent = arr.reduce((s,c)=>s+c.totalSpent,0);
  const allCount = arr.reduce((s,c)=>s+c.count,0);
  const avgPrice = allCount? Math.round(allSpent/allCount) : 0;
  document.getElementById('cust-stat-total').textContent = totalCust;
  document.getElementById('cust-stat-vip').textContent = vipCust;
  document.getElementById('cust-stat-repeat').textContent = repeatCust;
  document.getElementById('cust-stat-avg').textContent = fmtY0(avgPrice);
  document.getElementById('tab-count-customers').textContent = totalCust;

  if(q) arr = arr.filter(c=>
    (c.name||'').toLowerCase().includes(q) ||
    (!storeRole && ((c.phone||'').includes(q) || (c.email||'').toLowerCase().includes(q)))
  );

  if(sort==='orders-desc') arr.sort((a,b)=>b.count-a.count);
  else if(sort==='spent-desc') arr.sort((a,b)=>b.totalSpent-a.totalSpent);
  else if(sort==='recent-desc') arr.sort((a,b)=>(b.lastDate||0)-(a.lastDate||0));
  else if(sort==='name-asc') arr.sort((a,b)=>(a.name||'').localeCompare(b.name||''));

  const el = document.getElementById('customers-list');
  if(!arr.length){ el.innerHTML='<div class="text-center text-slate-600 py-8 font-semibold">無客戶資料</div>'; return; }
  const contactHeaders = storeRole ? '' : '<th>電話</th><th>Email</th>';
  const moneyHeaders = storeRole
    ? '<th class="num">和服原價</th><th class="num">妝髮費</th><th class="num">攝影費</th><th class="num">店鋪利潤</th>'
    : '<th class="num">已收訂金</th><th class="num">平台費</th><th class="num">尾款</th>';
  el.innerHTML = '<table class="data-table customer-data-table"><thead><tr>'+
    '<th>客戶</th>'+contactHeaders+
    '<th class="num">訂單數</th><th class="num">累積消費</th>'+
    moneyHeaders+
    '<th>首次預約</th><th>最後預約</th><th>動作</th></tr></thead>'+
    '<tbody>'+arr.map(c=>{
      const safeKey = (c.key||'').replace(/'/g,"\\\\'");
      const contactCells = storeRole ? '' :
        '<td class="font-semibold">'+(c.phone?'<a href="tel:'+c.phone+'" onclick="event.stopPropagation()" class="text-[#1A365D] hover:underline">'+c.phone+'</a>':'—')+'</td>'+
        '<td class="text-sm">'+(c.email||'—')+'</td>';
      const moneyCells = storeRole
        ? '<td class="num">'+fmtY0(c.kimonoPrice)+'</td>'+
          '<td class="num">'+fmtY0(c.hairFee)+'</td>'+
          '<td class="num">'+fmtY0(c.photoFee)+'</td>'+
          '<td class="num font-bold text-emerald-700">'+fmtY0(c.storeProfit)+'</td>'
        : '<td class="num">'+fmtY0(c.totalDeposit)+'</td>'+
          '<td class="num text-[#C9A961] font-bold">'+fmtY0(c.platformFee)+'</td>'+
          '<td class="num font-bold" style="color:#991B1B">'+fmtY0(c.balance)+'</td>';
      return '<tr onclick="openCustomerDetail(\''+safeKey+'\')">'+
      '<td><div class="font-bold text-base whitespace-nowrap">'+(c.isVip?'<span title="VIP 客戶" class="text-amber-500 mr-1">⭐</span>':'')+c.name+'</div></td>'+
      contactCells+
      '<td class="num">'+c.count+'</td>'+
      '<td class="num">'+fmtY0(c.totalSpent)+'</td>'+
      moneyCells+
      '<td>'+(c.firstDate? fmtDate(c.firstDate):'—')+'</td>'+
      '<td>'+(c.lastDate? (fmtDate(c.lastDate)+(function(){const d=new Date(c.lastDate);const n=new Date();const diff=Math.floor((n-d)/(86400000));return diff>=0?'<span class="text-[10px] text-slate-500 ml-1">('+diff+' 天前)</span>':'<span class="text-[10px] text-emerald-600 ml-1">('+Math.abs(diff)+' 天後)</span>';})()):'—')+'</td>'+
      '<td><button onclick="event.stopPropagation();const latestOrder=c.orders.sort((a,b)=>new Date(b.bookingDate||0)-new Date(a.bookingDate||0))[0]; if(latestOrder) openMsgTemplate(latestOrder.orderId)" class="px-2 py-0.5 mr-1 text-purple-700 border border-purple-300 hover:bg-purple-50 rounded text-xs font-bold">📨</button><button onclick="event.stopPropagation();openCustomerDetail(\''+safeKey+'\')" class="btn-navy px-3 py-1 rounded text-xs">詳情</button></td>'+
    '</tr>';}).join('')+'</tbody></table>';
}

function openCustomerDetail(key){
  const list = buildCustomers();
  const c = list.find(x=>x.key===key);
  if(!c) return;
  const storeRole = isStoreRole();
  document.getElementById('cust-modal-name').innerHTML = (c.isVip?'<span title="VIP 客戶" class="text-amber-500 mr-1">⭐</span>':'') + c.name;
  document.getElementById('cust-modal-sub').textContent = storeRole ? ('共 '+c.count+' 筆訂單') : (c.phone + (c.email? ' · '+c.email:'') + ' · 共 '+c.count+' 筆訂單');
  const body = document.getElementById('cust-modal-body');
  const summaryCards = storeRole
    ? '<div class="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">'+
        '<div class="stat-card blue"><div class="section-label">訂單數</div><div class="stat-num">'+c.count+'</div></div>'+
        '<div class="stat-card green"><div class="section-label">累積消費</div><div class="stat-num green" style="font-size:20px">'+fmtY0(c.totalSpent)+'</div></div>'+
        '<div class="stat-card"><div class="section-label">和服原價</div><div class="stat-num" style="font-size:20px">'+fmtY0(c.kimonoPrice)+'</div></div>'+
        '<div class="stat-card"><div class="section-label">妝髮費</div><div class="stat-num" style="font-size:20px">'+fmtY0(c.hairFee)+'</div></div>'+
        '<div class="stat-card"><div class="section-label">攝影費</div><div class="stat-num" style="font-size:20px">'+fmtY0(c.photoFee)+'</div></div>'+
        '<div class="stat-card green"><div class="section-label">店鋪利潤</div><div class="stat-num green" style="font-size:20px">'+fmtY0(c.storeProfit)+'</div></div>'+
      '</div>'
    : '<div class="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">'+
        '<div class="stat-card blue"><div class="section-label">訂單數</div><div class="stat-num">'+c.count+'</div></div>'+
        '<div class="stat-card green"><div class="section-label">累積消費</div><div class="stat-num green" style="font-size:20px">'+fmtY0(c.totalSpent)+'</div></div>'+
        '<div class="stat-card gold"><div class="section-label">已收訂金</div><div class="stat-num" style="font-size:20px;color:#C9A961">'+fmtY0(c.totalDeposit)+'</div></div>'+
        '<div class="stat-card gold"><div class="section-label">平台費</div><div class="stat-num" style="font-size:20px;color:#C9A961">'+fmtY0(c.platformFee)+'</div></div>'+
        '<div class="stat-card red"><div class="section-label">尾款</div><div class="stat-num red" style="font-size:20px">'+fmtY0(c.balance)+'</div></div>'+
        '<div class="stat-card red"><div class="section-label">退款次數</div><div class="stat-num red">'+c.refundCount+'</div></div>'+
      '</div>';
  const detailMoneyHeaders = storeRole
    ? '<th class="num">和服原價</th><th class="num">妝髮費</th><th class="num">攝影費</th><th class="num">店鋪利潤</th>'
    : '<th class="num">訂金</th><th class="num">總價</th><th class="num">平台費</th><th class="num">尾款</th>';
  body.innerHTML =
    summaryCards+
    '<h3 class="text-[#1A365D] mb-2 title-serif font-bold">📋 訂單記錄</h3>'+
    '<div class="overflow-x-auto"><table class="data-table customer-data-table">'+
      '<thead><tr><th>訂單號</th><th>體驗日期</th><th>款式</th><th>人數</th>'+detailMoneyHeaders+'<th>狀態</th></tr></thead>'+
      '<tbody>'+c.orders.sort((a,b)=>new Date(b.bookingDate||0)-new Date(a.bookingDate||0)).map(o=>{
        const statusMeta = orderStatusMeta(orderStatusOf(o));
        const status = '<span class="order-status-control '+statusMeta.css+'"><span class="order-status-icon">'+statusMeta.icon+'</span><span>'+statusMeta.label+'</span></span>';
        const amount = customerOrderAmounts(o);
        const detailMoneyCells = storeRole
          ? '<td class="num">'+fmtY0(amount.kimonoPrice)+'</td>'+
            '<td class="num">'+fmtY0(amount.hairFee)+'</td>'+
            '<td class="num">'+fmtY0(amount.photoFee)+'</td>'+
            '<td class="num font-bold text-emerald-700">'+fmtY0(amount.storeProfit)+'</td>'
          : '<td class="num">'+fmtY(o.deposit)+'</td>'+
            '<td class="num">'+fmtY(orderDisplayTotal(o))+'</td>'+
            '<td class="num text-[#C9A961] font-bold">'+fmtY0(amount.platformFee)+'</td>'+
            '<td class="num font-bold" style="color:#991B1B">'+fmtY0(amount.balance)+'</td>';
        return '<tr onclick="closeCustomerModal();openEdit(\''+(o.orderId||'')+'\')">'+
          '<td class="font-mono text-sm">'+(o.orderId||'')+'</td>'+
          '<td>'+fmtDate(o.bookingDate)+'</td>'+
          '<td>'+(o.plan||'—')+'</td>'+
          '<td>'+formatGuestCount(o)+'</td>'+
          detailMoneyCells+
          '<td>'+status+'</td>'+
        '</tr>';
      }).join('')+'</tbody></table></div>';
  document.getElementById('customer-modal').classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeCustomerModal(){ document.getElementById('customer-modal').classList.add('hidden'); document.body.style.overflow=''; }
