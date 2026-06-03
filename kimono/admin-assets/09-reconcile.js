// ── RECONCILE 對帳 ──
function initReconMonths(){
  const sel = document.getElementById('recon-month');
  if (!sel) return;
  // v2.4.20: 每次都重建（不再用 cache 阻擋），並合併歷史檔案月份
  const months = new Set();
  allOrders.forEach(o=>{ const m=bookingMonth(o); if(m) months.add(m); });
  // 加歷史檔案已關帳月份（從 window.__archivedMonthsList 取，由 loadArchivedList 設定）
  const archivedSet = new Set(window.__archivedMonthsList || []);
  archivedSet.forEach(m => months.add(m));
  const sorted = [...months].sort().reverse();
  const now = new Date();
  const cur = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  if(!sorted.includes(cur)) sorted.unshift(cur);
  const prevSelected = sel.value || sorted.find(m => m < cur) || cur;
  sel.innerHTML = sorted.map(m=>{
    const isFuture = m >= cur;
    const isArchived = archivedSet.has(m);
    const label = fmtMonth(m) + (isFuture ? '（未到）' : isArchived ? '（已歸檔）' : '');
    const disabled = isFuture ? ' disabled style="color:#94A3B8"' : '';
    const selected = (m === prevSelected) ? ' selected' : '';
    return '<option value="'+m+'"'+selected+disabled+'>'+label+'</option>';
  }).join('');
}

function renderReconcile(){
  const month = document.getElementById('recon-month').value;
  const status = document.getElementById('recon-status').value;
  let list = allOrders.slice();
  // v2.5: 店家身份只看自己門市的對帳，agent 看全部
  if (currentRole === 'store' && currentStoreKey) {
    list = list.filter(o => orderBelongsToStore(o, currentStoreKey));
  }
  if(month && month!=='all') list = list.filter(o=>bookingMonth(o)===month);

  // 計算對帳狀態
  list = list.map(o=>{
    const expect = expectedDeposit(o);
    const got = Number(o.deposit)||0;
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

  if(status!=='all') list = list.filter(o=>o._recState===status);

  // 統計
  const total = list.length;
  const expectSum = list.reduce((s,o)=>s+o._expect,0);
  const gotSum = list.reduce((s,o)=>s+o._got,0);
  const diff = gotSum - expectSum;
  const matched = list.filter(o=>o._recState==='matched').length;
  const rate = total? Math.round(matched/total*100) : 0;
  document.getElementById('recon-stat-total').textContent = total;
  document.getElementById('recon-stat-expect').textContent = fmtY0(expectSum);
  document.getElementById('recon-stat-received').textContent = fmtY0(gotSum);
  document.getElementById('recon-stat-diff').textContent = (diff>=0?'+':'') + fmtY0(diff);
  document.getElementById('recon-stat-rate').textContent = rate+'%';

  const tbl = document.getElementById('recon-table');
  if(!list.length){ tbl.innerHTML='<div class="text-center text-slate-600 py-8 font-semibold">本期無資料</div>'; return; }

  list.sort((a,b)=>{
    // v2.4.20: 依使用者選擇排序
    const sortMode = (document.getElementById('recon-sort')||{}).value || 'status-asc';
    const order = {overpaid:0, partial:1, unmatched:2, matched:3};
    const dateA = new Date(a.bookingDate||0).getTime() || 0;
    const dateB = new Date(b.bookingDate||0).getTime() || 0;
    if (sortMode === 'date-asc') return dateA - dateB;
    if (sortMode === 'date-desc') return dateB - dateA;
    // status-asc / status-desc：先狀態，再日期
    if(order[a._recState]!==order[b._recState]) return order[a._recState]-order[b._recState];
    return sortMode === 'status-desc' ? dateB - dateA : dateA - dateB;
    return new Date(b.bookingDate||0)-new Date(a.bookingDate||0);
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
  tbl.innerHTML = '<table class="data-table"><thead><tr>'+
    '<th>狀態</th><th>訂單號</th><th>客戶</th><th>體驗日期</th>'+
    '<th class="num">人數</th><th class="num">應收訂金</th>'+
    '<th class="num">已收訂金</th><th class="num">差異</th>'+
    '<th>對帳結果</th><th>動作</th></tr></thead><tbody>'+
    list.map(o=>{
      let stBadge, rowCls;
      if(o._recState==='matched'){ stBadge='<span class="badge badge-confirmed">✓ 已對帳</span>'; rowCls='match'; }
      else if(o._recState==='overpaid'){ stBadge='<span class="badge badge-anomaly">⚠ 超收異常</span>'; rowCls='mismatch'; }
      else if(o._recState==='partial'){ stBadge='<span class="badge" style="background:#DBEAFE;color:#1E40AF">△ 待收尾款</span>'; rowCls=''; }
      else { stBadge='<span class="badge badge-pending">○ 未對帳</span>'; rowCls='pending'; }

      const diffStr = o._diff===0? '—' : (o._diff>0? '<span class="text-amber-700 font-bold">+'+fmtY0(o._diff)+' 多收</span>' : '<span class="text-red-600 font-bold">'+fmtY0(o._diff)+' 少收</span>');
      const walkInTag = o._isWalkIn ? '<span class="text-blue-600 text-xs ml-1">(walk-in)</span>' : '';
      const result = o._recState==='matched'? '<span class="text-emerald-700 font-bold">✓ 金額正確</span>' + walkInTag :
                     o._recState==='overpaid'? '<span class="text-red-600 font-bold">需退款</span>' :
                     o._recState==='partial'? '<span class="text-blue-700 font-bold">尾款 ¥' + Math.abs(o._diff).toLocaleString() + '</span>' :
                     '<span class="text-amber-700 font-bold">待確認入帳</span>';

      return '<tr class="recon-row '+rowCls+'" onclick="openEdit(\''+(o.orderId||'')+'\')">'+
        '<td>'+stBadge+'</td>'+
        '<td class="font-mono text-sm whitespace-nowrap">'+(o.orderId||'')+'</td>'+
        '<td class="font-bold whitespace-nowrap">'+(o.name||'—')+'</td>'+
        '<td>'+fmtDate(o.bookingDate)+'</td>'+
        '<td class="num">'+(o.adults||o.pax||'—')+'</td>'+
        '<td class="num">'+fmtY0(o._expect)+'</td>'+
        '<td class="num">'+fmtY0(o._got)+'</td>'+
        '<td class="num">'+diffStr+'</td>'+
        '<td>'+result+'</td>'+
        '<td><button onclick="event.stopPropagation();openEdit(\''+(o.orderId||'')+'\')" class="btn-navy px-3 py-1 rounded text-xs">編輯</button></td>'+
      '</tr>';
    }).join('')+'</tbody></table>';
}

function exportReconCSV(){
  const month = document.getElementById('recon-month').value;
  let list = allOrders.slice();
  if(month && month!=='all') list = list.filter(o=>bookingMonth(o)===month);
  const headers = ['訂單號','客戶','體驗日期','人數','應收訂金','已收訂金','差異','對帳狀態'];
  const rows = list.map(o=>{
    const expect = expectedDeposit(o); const got = Number(o.deposit)||0;
    const tc = totalCharge(o);
    let st = '未對帳';
    if(tc>0 && got>tc) st='超收異常';
    else if(o.confirmed && expect>0 && got>=expect) st='已對帳';
    else if(o.confirmed && got>0) st='已對帳';
    else if(got>0 && got<expect) st='待收尾款';
    return [o.orderId, o.name, fmtDate(o.bookingDate), o.adults||o.pax, expect, got, got-expect, st];
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
  const monthEl = document.getElementById('recon-month');
  const month = monthEl ? monthEl.value : 'all';
  let list = filterOrdersForRole(allOrders.slice());
  if(month && month!=='all') list = list.filter(o=>bookingMonth(o)===month);
  const rows = list.map(o=>{
    const expect = expectedDeposit(o);
    const got = Number(o.deposit)||0;
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
    '<div class="modal-box" style="max-width:780px;height:auto;max-height:80vh">' +
    '<div class="flex justify-between items-center mb-3"><h3 class="font-bold text-lg text-[#1A365D]">🤖 Firebase 自動對帳掃描</h3>' +
    '<button onclick="this.closest(\'.modal-overlay\').remove()" class="text-2xl text-slate-400 hover:text-slate-700">×</button></div>' +
    body +
    '<div class="flex gap-2 mt-4 pt-3 border-t"><button onclick="this.closest(\'.modal-overlay\').remove();showSection(\'reconcile\')" class="flex-1 bg-[#1A365D] hover:bg-blue-900 text-white py-2 rounded-lg font-bold">前往對帳分頁</button><button onclick="this.closest(\'.modal-overlay\').remove()" class="flex-1 bg-slate-200 hover:bg-slate-300 py-2 rounded-lg">關閉</button></div>' +
    '</div></div>';
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
    '<div class="modal-box" style="max-width:640px;height:auto;max-height:80vh">' +
    '<div class="flex justify-between items-center mb-3"><h3 class="font-bold text-lg text-[#1A365D]">🤖 自動配對預覽</h3>' +
    '<button onclick="this.closest(\'.modal-overlay\').remove()" class="text-2xl text-slate-400 hover:text-slate-700">×</button></div>' +
    body +
    '<div class="flex gap-2 mt-4 pt-3 border-t">' +
      (m > 0 ? '<button onclick="confirmAutoReconcile(this)" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-bold">✓ 套用 '+m+' 筆配對</button>' : '') +
      '<button onclick="this.closest(\'.modal-overlay\').remove()" class="flex-1 bg-slate-200 hover:bg-slate-300 py-2 rounded-lg">取消</button>' +
    '</div></div></div>';
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
  const headers = ['訂單號','姓名','電話','Email','體驗日期','人數','款式','來源','訂金','和服','妝髮費','攝影費','總計','確認','退款金額','備註'];
  const rows = list.map(o=>[o.orderId, o.name, o.phone, o.email, o.bookingDate? fmtDate(o.bookingDate):'', o.adults||o.pax||'', o.plan||'', o.platform||'', o.deposit||0, o.price||o.kimonoPrice||0, o.hairFee||0, o.photoFee||0, totalAmount(o), o.confirmed?'已確認':'待確認', o.refundAmount||0, (o.remark||'').replace(/[\r\n]+/g,' ')]);
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
  const visible = document.querySelectorAll('#orders-list .order-card');
  if(!visible.length){ toast('無資料可匯出','warning'); return; }
  const ids = Array.from(visible).map(c=>c.querySelector('.font-mono')?.textContent.trim()).filter(Boolean);
  const list = allowed.filter(o=>ids.includes(o.orderId));
  ordersToCSV(list.length? list : allowed);
  toast('已匯出 CSV');
}
function batchExportCSV(){
  if(!selectedIds.size){ toast('請先選取訂單','warning'); return; }
  // v2.4.29: 雙重保險，store 角色僅匯出自家訂單
  const allowed = filterOrdersForRole(allOrders);
  ordersToCSV(allowed.filter(o=>selectedIds.has(o.orderId)));
  toast('已匯出 '+selectedIds.size+' 筆');
}
