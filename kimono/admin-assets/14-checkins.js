// ============================================================
// v2.5: 報到中心 (今日 ±1 天訂單看板)
// ============================================================
// v2.5c: 報到中心 列表/卡片 view mode
function setCheckinView(mode){
  try{ localStorage.setItem('checkin_view', mode); }catch(e){}
  document.querySelectorAll('#ci-view-card, #ci-view-list').forEach(b=>{
    b.classList.remove('bg-[#1A365D]','text-white');
    b.classList.add('bg-white','text-slate-600');
  });
  const active = document.getElementById('ci-view-' + mode);
  if(active){ active.classList.remove('bg-white','text-slate-600'); active.classList.add('bg-[#1A365D]','text-white'); }
  if(typeof renderCheckIn==='function') renderCheckIn();
}
function getCheckinView(){ try{ return localStorage.getItem('checkin_view') || 'card'; }catch(e){ return 'card'; } }

function renderCheckIn() {
  const list = document.getElementById('checkin-list');
  const empty = document.getElementById('checkin-empty');
  if (!list) return;
  // 算今天 JST
  const now = new Date();
  const jstNow = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000);
  const toJstYMD = (d) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  const todayYMD = toJstYMD(jstNow);
  const ms = 24*3600*1000;
  // 收集 ±1 天訂單
  let orders = (typeof allOrders !== 'undefined' ? allOrders : []).filter(o => {
    // v2.5: 不再用 o.confirmed 過濾, 讓未確認的也顯示（會用顏色標記）
    if (!o.bookingDate) return false;
    const bd = parseBookingDate(o.bookingDate);  // v2.4.42g
    if (!bd) return false;
    // v2.4.42j: timezone-safe local get*()
    const diff = Math.round((new Date(bd.getFullYear(), bd.getMonth(), bd.getDate()) - new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate())) / ms);
    return diff >= -1 && diff <= 1;
  });
  // 店家身份只看自家
  if (currentRole === 'store' && currentStoreKey) {
    orders = orders.filter(o => orderBelongsToStore(o, currentStoreKey));
  }
  // 末碼搜尋
  const qInput = document.getElementById('checkin-search');
  const q = (qInput ? qInput.value : '').replace(/\D/g, '').slice(0, 5);
  if (q.length >= 3) {
    orders = orders.filter(o => {
      const phoneTail = String(o.phone || '').replace(/\D/g, '').slice(-5);
      return phoneTail.endsWith(q);
    });
  }
  // 排序：先按體驗日 + 時間 (asc)
  orders.sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate));

  // 統計
  let cntPending = 0, cntSelf = 0, cntAgent = 0;
  orders.forEach(o => {
    if (!o.checkedInAt) cntPending++;
    else if ((o.checkedInBy || '').toString() === 'self' || (o.checkedInSource || '').toString() === 'self') cntSelf++;
    else cntAgent++;
  });
  document.getElementById('ci-stat-pending').textContent = cntPending;
  document.getElementById('ci-stat-self').textContent = cntSelf;
  document.getElementById('ci-stat-agent').textContent = cntAgent;
  const tabCount = document.getElementById('tab-count-checkin');
  if (tabCount) tabCount.textContent = orders.length;

  // 卡片
  if (orders.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  if (getCheckinView() === 'list') {
    list.className = '';
    list.innerHTML = '<div class="overflow-x-auto bg-white rounded-lg border border-slate-200"><table class="w-full text-sm"><thead class="bg-slate-50"><tr><th class="p-2 text-left">時間</th><th class="p-2 text-left">姓名</th><th class="p-2 text-left">末3碼</th><th class="p-2 text-center">人</th><th class="p-2 text-center">加值</th><th class="p-2 text-center">狀態</th><th class="p-2 text-right">動作</th></tr></thead><tbody>' + orders.map(o => {
      const bd = parseBookingDate(o.bookingDate) || new Date(o.bookingDate);
      const md = (bd.getMonth()+1) + '/' + bd.getDate();
      const hm = String(bd.getHours()).padStart(2,'0') + ':' + String(bd.getMinutes()).padStart(2,'0');
      const tail = String(o.phone || '').replace(/\D/g, '').slice(-3);
      const hair = (o.hair===true||o.hair==='true'||o.hair==='是') ? '💆' : '';
      const photo = (o.photo===true||o.photo==='true'||o.photo==='是') ? '📷' : '';
      const cs = (o.checkedInBy || '').toString();
      let sb;
      if (!o.checkedInAt) sb = '<span class="px-2 py-0.5 bg-slate-100 rounded text-xs">⏳待</span>';
      else if (cs==='self') sb = '<span class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">🎌自助</span>';
      else sb = '<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">✅代客</span>';
      const dis = o.checkedInAt ? 'disabled style="opacity:0.5;cursor:not-allowed"' : '';
      const txt = o.checkedInAt ? '已報到' : '🎌 報到';
      return '<tr class="border-t hover:bg-slate-50"><td class="p-2 font-bold whitespace-nowrap">' + md + ' ' + hm + '</td><td class="p-2 font-bold">' + (o.name||'—') + (function(){var ph=String(o.phone||'').replace(/\D/g,'');if(!ph)return '';var arr=(typeof allOrders!=='undefined'?allOrders:[]);var cnt=arr.filter(function(x){return String(x.phone||'').replace(/\D/g,'')===ph;}).length;return cnt>=3?' <span class="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">⭐'+cnt+'</span>':(cnt>=2?' <span class="text-[10px] text-slate-500">'+cnt+'訪</span>':'');})() + '</td><td class="p-2 font-mono">' + tail + '</td><td class="p-2 text-center">' + formatGuestCount(o) + '</td><td class="p-2 text-center text-base">' + (hair+photo||'—') + '</td><td class="p-2 text-center">' + sb + '</td><td class="p-2 text-right"><button onclick="checkInOrder(\'' + o.orderId + '\')" ' + dis + ' class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold whitespace-nowrap">' + txt + '</button></td></tr>';
    }).join('') + '</tbody></table></div>';
    const tabCount = document.getElementById('tab-count-checkin');
    if (tabCount) tabCount.textContent = orders.length;
    return;
  }
  list.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3';
  list.innerHTML = orders.map(o => {
    const bd = parseBookingDate(o.bookingDate) || new Date(o.bookingDate);  // v2.5
    const hh = String(bd.getHours()).padStart(2,'0');
    const mm = String(bd.getMinutes()).padStart(2,'0');
    const md = (bd.getMonth()+1) + '/' + bd.getDate();
    const phoneTail = String(o.phone || '').replace(/\D/g, '').slice(-3);
    let stateBadge, stateColor;
    const checkedSource = (o.checkedInBy || '').toString();
    if (!o.checkedInAt) { stateBadge = '⏳ 待報到'; stateColor = 'bg-slate-100 text-slate-600'; }
    else if (checkedSource === 'self') { stateBadge = '🎌 客人自助'; stateColor = 'bg-amber-100 text-amber-700'; }
    else { stateBadge = '✅ 已代客報到'; stateColor = 'bg-emerald-100 text-emerald-700'; }
    const btnDisabled = o.checkedInAt ? 'disabled style="opacity:0.5;cursor:not-allowed"' : '';
    const btnText = o.checkedInAt ? '已報到' : '🎌 為客人報到';
    return '<div class="bg-white border-2 border-slate-100 hover:border-[#1A365D] rounded-lg p-4 transition-all">' +
      '<div class="flex justify-between items-start mb-2">' +
        '<div><div class="text-3xl font-bold text-[#1A365D] mb-1">' + hh + ':' + mm + '</div>' + '<div class="text-base font-bold text-[#1A365D]">' + (o.name || '—') + (function(){var ph=String(o.phone||'').replace(/\D/g,'');if(!ph)return '';var arr=(typeof allOrders!=='undefined'?allOrders:[]);var cnt=arr.filter(function(x){return String(x.phone||'').replace(/\D/g,'')===ph;}).length;return cnt>=3?'<span class="text-[10px] bg-amber-100 text-amber-700 px-1 rounded ml-1">⭐'+cnt+'</span>':(cnt>=2?'<span class="text-[10px] text-slate-500 ml-1">'+cnt+'訪</span>':'');})() + '</div>' +
        '<div class="text-xs text-slate-400 font-mono">' + (o.orderId || '') + '</div></div>' +
        '<span class="text-xs px-2 py-1 rounded ' + stateColor + ' font-bold">' + stateBadge + '</span>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-2 text-sm mb-3">' +
        '<div><span class="text-slate-400 text-xs">體驗時間</span><div class="font-bold">' + md + ' ' + hh + ':' + mm + '</div></div>' +
        '<div><span class="text-slate-400 text-xs">末3碼</span><div class="font-bold font-mono">' + phoneTail + '</div></div>' +
        '<div><span class="text-slate-400 text-xs">加值</span><div class="font-bold text-xs">' + (((o.hair===true||o.hair==='true'||o.hair==='是')?'💆':'')+((o.photo===true||o.photo==='true'||o.photo==='是')?'📷':'')||'—') + '</div></div>' +
        '<div><span class="text-slate-400 text-xs">人數</span><div class="font-bold">' + formatGuestCount(o) + '</div></div>' +
      '</div>' +
      '<button onclick="checkInOrder(\'' + o.orderId + '\')" ' + btnDisabled + ' class="w-full py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded text-sm transition-colors">' + btnText + '</button>' +
    '</div>';
  }).join('');
}
