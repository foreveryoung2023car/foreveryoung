// ============================================================
// v2.4 Walk-in 月結對帳
// ============================================================
function buildWalkinMonthSelect() {
  // v2.4.20: 只列「實際有 walk-in 訂單」的月份
  const sel = document.getElementById('walkin-month');
  if (!sel) return;
  const months = new Set();
  (allOrders || []).forEach(o => {
    const isWalkIn = (o.platform === 'WALK_IN') ||
                     (String(o.platform||'').toLowerCase().indexOf('walk-in') === 0) ||
                     (String(o.source||'').toLowerCase().indexOf('walk-in@') === 0) ||
                     (String(o.introducer||'').toLowerCase().indexOf('walk-in@') === 0);
    if (!isWalkIn) return;
    const m = bookingMonth(o);
    if (m) months.add(m);
  });
  const sorted = [...months].sort().reverse();
  if (sorted.length === 0) {
    sel.innerHTML = '<option value="">尚無 walk-in 訂單</option>';
    return;
  }
  sel.innerHTML = sorted.map(m => '<option value="'+m+'">'+fmtMonth(m)+'</option>').join('');
  sel.value = sorted[0]; // 預設最近月份
}

function renderWalkinMonth() {
  const sel = document.getElementById('walkin-month');
  if (!sel || !sel.value) return;
  const [y, m] = sel.value.split('-').map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0);
  const end = new Date(y, m, 1, 0, 0, 0);
  let monthOrders = (allOrders || []).filter(o => {
    // v2.5: detect walk-in by platform OR source field (handles legacy column variants)
    const isWalkIn = (o.platform === 'WALK_IN') ||
                     (String(o.platform || '').toLowerCase().indexOf('walk-in') === 0) ||
                     (String(o.source || '').toLowerCase().indexOf('walk-in@') === 0) ||
                     (String(o.introducer || '').toLowerCase().indexOf('walk-in@') === 0);
    if (!isWalkIn) return false;
    const d = new Date(o.bookingDate || o.submitDate);
    return !isNaN(d) && d >= start && d < end;
  });
  // v2.5: store role only sees own walk-in
  if (currentRole === 'store') {
    monthOrders = monthOrders.filter(o => orderBelongsToStore(o, currentStoreKey));
  }

  // Aggregate (uses per-order discount: o.rate = 折數，10=無折)
  const orderCalc = (o) => {
    const pp = Number(o.price) || Number(o.kimonoPrice) || 0;
    const d = (function(){ const r = Number(o.rate); return (r >= 5 && r <= 10) ? r : 10; })();
    const hf = Number(o.hairFee) || 0;
    const pf = Number(o.photoFee) || 0;
    const discounted = Math.round(pp * d / 10);
    return {
      pp, d, hf, pf,
      due: discounted + hf + pf,
      shopKeep: Math.round(pp * 0.5) + hf + pf,
      ours: Math.max(0, discounted - Math.round(pp * 0.5))
    };
  };
  const totalRevenue = monthOrders.reduce((s, o) => s + orderCalc(o).due, 0);
  const shopKeep    = monthOrders.reduce((s, o) => s + orderCalc(o).shopKeep, 0);
  const oursOwed    = monthOrders.reduce((s, o) => s + orderCalc(o).ours, 0);

  document.getElementById('walkin-stat-count').textContent = monthOrders.length;
  document.getElementById('walkin-stat-revenue').textContent = '¥' + Math.round(totalRevenue).toLocaleString();
  document.getElementById('walkin-stat-shop').textContent = '¥' + shopKeep.toLocaleString();
  document.getElementById('walkin-stat-ours').textContent = '¥' + oursOwed.toLocaleString();

  // v2.4.28: extract store from platform suffix first, then fallback to source/introducer keyword
  const STORE_MAP = {
    'kyoto1': '京都清水寺店',
    'osaka':  '大阪日本橋店',
    'kyoto2': '京都祇園店',
    'tokyo1': '東京淺草寺店',
    'tokyo':  '東京淺草寺店'
  };
  const byStore = {};
  monthOrders.forEach(o => {
    const plat = String(o.platform || '').toLowerCase();
    const src = String(o.source || o.introducer || '').toLowerCase();
    let store = '';
    const at = plat.indexOf('@');
    if (at >= 0) store = STORE_MAP[plat.slice(at + 1)] || '';
    if (!store) {
      if (src.indexOf('kyoto1') >= 0 || src.indexOf('清水寺') >= 0) store = '京都清水寺店';
      else if (src.indexOf('osaka') >= 0 || src.indexOf('日本橋') >= 0) store = '大阪日本橋店';
      else if (src.indexOf('kyoto2') >= 0 || src.indexOf('祇園') >= 0) store = '京都祇園店';
      else if (src.indexOf('tokyo') >= 0 || src.indexOf('淺草') >= 0) store = '東京淺草寺店';
      else store = '未分類';
    }
    if (!byStore[store]) byStore[store] = { orders: [], pp: 0, due: 0, ours: 0 };
    const calc = orderCalc(o);
    byStore[store].orders.push(o);
    byStore[store].pp += calc.pp;
    byStore[store].due += calc.due;
    byStore[store].ours += calc.ours;
  });

  // v2.6: 即使該店家本月無資料，也要顯示空白卡片
  // v2.5: 店家身份只看自家店家卡片，agent / Jun 看 4 家
  const STORE_KEY_TO_NAME = { kyoto1: '京都清水寺店', osaka1: '大阪日本橋店', kyoto2: '京都祇園店', tokyo1: '東京淺草寺店' };
  if (currentRole === 'store' && currentStoreKey) {
    const ownName = STORE_KEY_TO_NAME[currentStoreKey];
    if (ownName) {
      // 清掉非自家 (包含「未分類」)
      Object.keys(byStore).forEach(s => { if (s !== ownName) delete byStore[s]; });
      if (!byStore[ownName]) byStore[ownName] = { orders: [], pp: 0, due: 0, ours: 0 };
    }
  } else {
    const ALL_STORES = ['京都清水寺店', '大阪日本橋店', '京都祇園店', '東京淺草寺店'];
    ALL_STORES.forEach(s => { if (!byStore[s]) byStore[s] = { orders: [], pp: 0, due: 0, ours: 0 }; });
  }

  const storeGrid = document.getElementById('walkin-stores-grid');
  {
    storeGrid.innerHTML = Object.entries(byStore).map(([store, info]) => 
      '<div class="panel">' +
      '<div class="flex justify-between items-center mb-3 gap-2">' +
        '<h3 class="font-bold text-[#1A365D] text-base flex-1">📍 ' + store + ' <span class="text-sm font-normal" style="color:'+(info.orders.length===0?'#94A3B8':'#64748B')+'">(' + info.orders.length + ' 筆' + (info.orders.length===0?'｜本月無':'') + ')</span></h3>' +
        (info.orders.length > 0 ? '<button onclick="generateInvoice(\'' + store + '\',\'' + sel.value + '\')" class="btn-outline px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap">📄 請款單</button>' : '') +
      '</div>' +
      '<div class="grid grid-cols-3 gap-2 text-center">' +
        '<div class="bg-slate-50 rounded p-2"><div class="text-[11px] text-slate-500">和服總額</div><div class="font-bold text-[#1A365D]">¥' + info.pp.toLocaleString() + '</div></div>' +
        '<div class="bg-emerald-50 rounded p-2"><div class="text-[11px] text-emerald-700">客付總額</div><div class="font-bold text-emerald-700">¥' + info.due.toLocaleString() + '</div></div>' +
        (currentAgent === 'Jun' ? '<div class="bg-pink-50 rounded p-2"><div class="text-[11px] text-pink-700">應收店家</div><div class="font-bold text-pink-700">¥' + info.ours.toLocaleString() + '</div></div>' : '<div class="bg-slate-50 rounded p-2 opacity-50"><div class="text-[11px] text-slate-400">—</div><div class="text-xs text-slate-300">私人</div></div>') +
      '</div>' +
      '</div>'
    ).join('');
  }

  // Detail table
  document.getElementById('walkin-table').innerHTML = monthOrders.length === 0 ? '<div class="text-center text-slate-500 py-6">本月無 walk-in 訂單</div>' :
    '<table class="w-full text-sm"><thead><tr class="bg-slate-100 text-slate-600"><th class="p-2 text-left">日期</th><th class="p-2 text-left">編號</th><th class="p-2 text-left">姓名</th><th class="p-2 text-left">門市</th><th class="p-2 text-center">折扣</th><th class="p-2 text-right">和服</th><th class="p-2 text-right">妝髮</th><th class="p-2 text-right">攝影</th><th class="p-2 text-right">客付</th><th class="p-2 text-right text-pink-600">旅乘</th></tr></thead><tbody>' +
    monthOrders.sort((a,b)=>new Date(b.bookingDate||0)-new Date(a.bookingDate||0)).map(o => {
      const c = orderCalc(o);
      const dt = new Date(o.bookingDate);
      const discTag = c.d === 10 ? '<span class="text-slate-400">無折</span>' : '<span class="text-pink-600 font-bold">' + c.d + '折</span>';
      return '<tr class="border-b border-slate-100 hover:bg-slate-50"><td class="p-2">' + (dt.getMonth()+1) + '/' + dt.getDate() + '</td>' +
             '<td class="p-2 font-mono text-xs">' + (o.orderId||'') + '</td>' +
             '<td class="p-2 font-bold">' + (o.name||'') + '</td>' +
             '<td class="p-2 text-xs">' + (String(o.platform||'').replace('walk-in@','') || String(o.source||'').replace('walk-in@','')) + '</td>' +
             '<td class="p-2 text-center">' + discTag + '</td>' +
             '<td class="p-2 text-right">¥' + c.pp.toLocaleString() + '</td>' +
             '<td class="p-2 text-right">¥' + c.hf.toLocaleString() + '</td>' +
             '<td class="p-2 text-right">¥' + c.pf.toLocaleString() + '</td>' +
             '<td class="p-2 text-right font-bold">¥' + c.due.toLocaleString() + '</td>' +
             '<td class="p-2 text-right font-bold text-pink-600">¥' + c.ours.toLocaleString() + '</td></tr>';
    }).join('') + '</tbody></table>';
}

function generateInvoice(storeName, monthYM) {
  const [y, m] = monthYM.split('-').map(Number);
  // v2.4.28: detect walk-in by platform prefix (was: o.platform === 'WALK_IN');
  // map store from platform suffix (was: source keyword scan — never matched seed data)
  const STORE_MAP = {
    'kyoto1': '京都清水寺店',
    'osaka':  '大阪日本橋店',
    'kyoto2': '京都祇園店',
    'tokyo1': '東京淺草寺店',
    'tokyo':  '東京淺草寺店'
  };
  const monthOrders = (allOrders || []).filter(o => {
    const plat = String(o.platform || '').toLowerCase();
    const isWalkIn = (o.platform === 'WALK_IN') || (plat.indexOf('walk-in') === 0);
    if (!isWalkIn) return false;
    // Parse store key from platform suffix: "walk-in@kyoto1" → "kyoto1"
    let key = '';
    const at = plat.indexOf('@');
    if (at >= 0) key = plat.slice(at + 1);
    // Fallback: keyword scan in source (legacy)
    const src = String(o.source || '').toLowerCase();
    let s = STORE_MAP[key] || '';
    if (!s) {
      if (src.indexOf('kyoto1') >= 0 || src.indexOf('清水寺') >= 0) s = '京都清水寺店';
      else if (src.indexOf('osaka') >= 0 || src.indexOf('日本橋') >= 0) s = '大阪日本橋店';
      else if (src.indexOf('kyoto2') >= 0 || src.indexOf('祇園') >= 0) s = '京都祇園店';
      else if (src.indexOf('tokyo') >= 0 || src.indexOf('淺草') >= 0) s = '東京淺草寺店';
      else s = '未分類';
    }
    if (s !== storeName) return false;
    const d = new Date(o.bookingDate || o.submitDate);
    return !isNaN(d) && d.getFullYear() === y && d.getMonth() === m - 1;
  });

  // Use same per-order calc as monthly aggregator
  const orderCalcInv = (o) => {
    const pp = Number(o.price) || Number(o.kimonoPrice) || 0;
    const d = (function(){ const r = Number(o.rate); return (r >= 5 && r <= 10) ? r : 10; })();
    return { pp, d, ours: Math.max(0, Math.round(pp * d / 10) - Math.round(pp * 0.5)) };
  };
  const totalPP = monthOrders.reduce((s, o) => s + orderCalcInv(o).pp, 0);
  const totalOurs = monthOrders.reduce((s, o) => s + orderCalcInv(o).ours, 0);

  const today = new Date();
  const invHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>請款單 ${storeName} ${y}年${m}月</title>
    <style>
      body{font-family:'Noto Serif TC',serif;padding:40px;color:#1A365D;max-width:800px;margin:0 auto;background:white}
      .header{border-bottom:3px double #1A365D;padding-bottom:16px;margin-bottom:24px}
      .title{font-size:28px;font-weight:bold;letter-spacing:0.2em}
      .subtitle{color:#94a3b8;letter-spacing:0.3em;text-transform:uppercase;font-size:11px;margin-top:6px}
      .meta{display:grid;grid-template-columns:auto 1fr;gap:8px 20px;margin-bottom:24px;font-size:14px}
      .meta b{color:#475569}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
      th{background:#1A365D;color:white;padding:10px;text-align:left;letter-spacing:0.1em}
      td{padding:8px 10px;border-bottom:1px solid #e2e8f0}
      .num{text-align:right;font-family:monospace}
      .total{font-size:20px;font-weight:bold;background:#FFF8DC;padding:16px;border-left:4px solid #C9A961;margin:20px 0;display:flex;justify-content:space-between;align-items:center}
      .footer{font-size:12px;color:#64748b;line-height:1.7;margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px}
      .stamp{margin-top:60px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
      .stamp .box{border:1px dashed #94a3b8;height:80px;text-align:center;padding-top:30px;color:#94a3b8;font-size:11px}
      @media print { body{padding:20px} button{display:none} }
    </style></head><body>
    <div class="header">
      <div class="title">請款單 INVOICE</div>
      <div class="subtitle">FOREVERYOUNG × Kimono Walk-in Settlement</div>
    </div>
    <div class="meta">
      <b>請款對象</b><span>${storeName}</span>
      <b>請款月份</b><span>${y}年${m}月</span>
      <b>開立日期</b><span>${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()}</span>
      <b>本期筆數</b><span>${monthOrders.length} 筆</span>
    </div>
    <table>
      <thead><tr><th>日期</th><th>訂單編號</th><th>姓名</th><th>折扣</th><th class="num">和服原價</th><th class="num">應付旅乘<br><span style="font-size:10px;font-weight:normal;color:#94a3b8">(僅和服抽成)</span></th></tr></thead>
      <tbody>
      ${monthOrders.map(o => {
        const dt = new Date(o.bookingDate);
        const c = orderCalcInv(o);
        const discTag = c.d === 10 ? '無折' : c.d + '折';
        return '<tr><td>' + (dt.getMonth()+1) + '/' + dt.getDate() + '</td><td>' + (o.orderId||'') + '</td><td>' + (o.name||'') + '</td><td>' + discTag + '</td><td class="num">¥' + c.pp.toLocaleString() + '</td><td class="num">¥' + c.ours.toLocaleString() + '</td></tr>';
      }).join('')}
      </tbody>
    </table>
    <div class="total">
      <span>合計應付旅乘</span>
      <span style="font-size:28px;color:#C9A961">¥${totalOurs.toLocaleString()} JPY</span>
    </div>
    <div class="footer">
      <p>※ <b>拆帳項目僅限「和服費」</b>，妝髮費與攝影費 100% 由店家保留，旅乘不抽取。</p>
      <p>※ 和服費拆帳：無折活動店家 50%／旅乘 50%；有折扣活動店家固定 50%、折扣由旅乘吸收（旅乘實拿 = 和服原價 × 折數/10 − 和服原價 × 50%）。</p>
      <p>※ 請於每月 5 日前匯款至下方旅乘指定帳戶</p>
    </div>
    <div class="stamp">
      <div><b>店家負責人簽章</b><div class="box">店家用印</div></div>
      <div><b>旅乘確認</b><div class="box">旅乘用印</div></div>
    </div>
    <div style="text-align:center;margin-top:30px"><button onclick="window.print()" style="padding:10px 30px;background:#1A365D;color:white;border:none;font-size:14px;cursor:pointer;border-radius:6px;letter-spacing:0.2em">列印 / Save PDF</button></div>
    </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(invHtml);
  w.document.close();
}

// Hook into switchSection to render when entering walkin tab
const __origSwitchSection = typeof switchSection === 'function' ? switchSection : null;
if (__origSwitchSection) {
  window.switchSection = function(sec, el) {
    __origSwitchSection(sec, el);
    if (sec === 'walkin') {
      buildWalkinMonthSelect();
      renderWalkinMonth();
    }
    if (sec === 'audit') {
      loadAuditLog();
    }
  };
}
