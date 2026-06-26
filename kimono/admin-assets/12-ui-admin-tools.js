// v2.4.20: 對帳說明燈箱
function renderPermissions(){
  renderRoleAssignmentMatrix();
  // v2.4.20: 改良版 X — toggle 開關 + 套用模板 + 一行 hover 高亮 + 篩選
  // v2.4.30: 依角色過濾顯示欄位 — store 只看自家、agent 看 Jun+自己、Jun 看全部
  const _allRoles = [
    { id:'jun', name:'Jun', sub:'(主管)', emoji:'👑' },
    { id:'agent', name:'Ren / Amy', sub:'(客服)', emoji:'👤' },
    { id:'kyoto1', name:'京都清水寺', sub:'店家', emoji:'🏪' },
    { id:'osaka1', name:'大阪日本橋', sub:'店家', emoji:'🏪' },
    { id:'kyoto2', name:'京都祇園', sub:'店家', emoji:'🏪' },
    { id:'tokyo1', name:'東京淺草寺', sub:'店家', emoji:'🏪' },
  ];
  let roles;
  if (currentAgent === 'Jun') {
    roles = _allRoles;  // Jun 看全部
  } else if (currentRole === 'store') {
    roles = _allRoles.filter(r => r.id === currentStoreKey);  // 店家只看自家
  } else {
    // 客服 (Ren/Amy)：看 Jun + 自己 (給客服一個對照知道自己跟主管權限差在哪)
    roles = _allRoles.filter(r => r.id === 'jun' || r.id === 'agent');
  }
  const defaultPerms = [
    { id:'p01', name:'登入後台', jun:1, agent:1, store:1 },
    { id:'p02', name:'看儀表板', jun:1, agent:1, store:0 },
    { id:'p03', name:'看所有訂單', jun:1, agent:1, store:0 },
    { id:'p04', name:'看自家門市訂單', jun:1, agent:1, store:1 },
    { id:'p05', name:'編輯訂單', jun:1, agent:1, store:1 },
    { id:'p06', name:'看行事曆', jun:1, agent:1, store:0 },
    { id:'p07', name:'看客戶名單', jun:1, agent:1, store:0 },
    { id:'p08', name:'看財務報表', jun:1, agent:1, store:0 },
    { id:'p09', name:'看對帳作業', jun:1, agent:1, store:0 },
    { id:'p10', name:'看店家月結', jun:1, agent:1, store:1 },
    { id:'p11', name:'看歷史檔案', jun:1, agent:1, store:0 },
    { id:'p12', name:'➕ 現場新增訂單 (walk-in)', jun:1, agent:0, store:1 },
    { id:'p13', name:'📦 月度關帳並歸檔', jun:1, agent:0, store:0 },
    { id:'p14', name:'🔓 解凍已關帳月份', jun:1, agent:0, store:0 },
    { id:'p15', name:'匯出 CSV', jun:1, agent:1, store:0 },
  ];
  const overridesKey = 'admin_permissions_overrides';
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem(overridesKey) || '{}'); } catch(e){}
  // 暫存修改 (尚未存)
  if (!window.__permPendingChanges) window.__permPendingChanges = {};
  let pending = window.__permPendingChanges;

  const isStoreId = (id) => ['kyoto1','osaka1','kyoto2','tokyo1'].includes(id);
  const roleKey = (rid) => rid === 'jun' ? 'jun' : (rid === 'agent' ? 'agent' : 'store');
  const getDefault = (perm, role) => {
    if (role.id === 'jun') return perm.jun;
    if (role.id === 'agent') return perm.agent;
    if (isStoreId(role.id)) return perm.store;
    return 0;
  };
  const getEffective = (perm, role) => {
    const k = perm.id + '__' + roleKey(role.id);
    if (k in pending) return pending[k];
    if (k in overrides) return overrides[k];
    return getDefault(perm, role);
  };
  const isCustomized = (perm, role) => {
    const k = perm.id + '__' + roleKey(role.id);
    if (k in pending) return pending[k] !== getDefault(perm, role);
    return (k in overrides) && overrides[k] !== getDefault(perm, role);
  };

  const canEdit = (currentAgent === 'Jun');
  const filterMode = window.__permFilterMode || 'all';

  // 上方控制列（每次重繪重建）
  const oldControls = document.getElementById('perm-controls');
  if (oldControls) oldControls.remove();
  const tableEl = document.getElementById('permissions-table');
  if (tableEl) {
    const controls = document.createElement('div');
    controls.id = 'perm-controls';
    controls.className = 'mb-3 flex flex-wrap items-center justify-between gap-2';
    const pendingCount = Object.keys(pending).length;
    controls.innerHTML =
      '<div class="flex items-center gap-3 flex-wrap">' +
        '<div class="flex gap-1 text-xs">' +
          '<button onclick="setPermFilter(\'all\',this)" class="tab-btn ' + (filterMode==='all'?'active':'') + ' !text-xs">全部</button>' +
          '<button onclick="setPermFilter(\'custom\',this)" class="tab-btn ' + (filterMode==='custom'?'active':'') + ' !text-xs">✏️ 已自訂</button>' +
        '</div>' +
        (canEdit ? '<select onchange="applyPermTemplate(this.value);this.value=\'\'" class="text-xs border border-slate-200 rounded px-2 py-1">' +
          '<option value="">📋 套用模板…</option>' +
          '<option value="default">↺ 全部回到預設</option>' +
          '<option value="agent_admin">給客服月度關帳權限</option>' +
          '<option value="agent_full">給客服全部後台權限</option>' +
          '<option value="store_view">給店家看訂單管理</option>' +
        '</select>' : '') +
      '</div>' +
      '<div class="flex items-center gap-2">' +
        '<span class="text-xs ' + (pendingCount > 0 ? 'text-amber-700 font-bold' : 'text-slate-400') + '">' +
          (pendingCount > 0 ? '● ' + pendingCount + ' 項待儲存' : '已同步') +
        '</span>' +
        (canEdit ? '<button onclick="savePermissionChanges()" ' + (pendingCount === 0 ? 'disabled' : '') +
          ' class="px-3 py-1.5 ' + (pendingCount > 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-400') + ' rounded-lg text-xs font-bold">💾 儲存所有變更</button>' +
          '<button onclick="discardPermissionChanges()" class="btn-outline px-2 py-1.5 rounded-lg text-xs">↺ 取消未存</button>' : '') +
      '</div>';
    tableEl.parentElement.insertBefore(controls, tableEl);
  }

  // header
  const thead = document.getElementById('permissions-thead');
  thead.innerHTML = '<th class="text-left py-2" style="min-width:200px">能做什麼</th>' +
    roles.map(r => '<th class="text-center py-2" style="min-width:100px">' + r.emoji + '<br><span class="text-[11px] font-bold">' + r.name + '</span><br><span class="text-[9px] text-slate-400 font-normal">' + r.sub + '</span></th>').join('');

  // body
  const tbody = document.getElementById('permissions-tbody');
  const visiblePerms = filterMode === 'custom'
    ? defaultPerms.filter(p => roles.some(r => isCustomized(p, r)))
    : defaultPerms;
  if (visiblePerms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="' + (roles.length+1) + '" class="text-center py-6 text-slate-500">尚無自訂權限</td></tr>';
    return;
  }
  tbody.innerHTML = visiblePerms.map((p, ri) => {
    const rowBg = ri % 2 === 1 ? 'bg-slate-50' : '';
    return '<tr class="' + rowBg + ' hover:bg-blue-50/40 transition-colors"><td class="py-2 px-3 font-semibold">' + p.name + '</td>' +
      roles.map(r => {
        const eff = getEffective(p, r);
        const customized = isCustomized(p, r);
        const isMe = (currentAgent === 'Jun' && r.id === 'jun') ||
                     (currentRole === 'agent' && currentAgent !== 'Jun' && r.id === 'agent') ||
                     (currentRole === 'store' && r.id === currentStoreKey);
        const k = p.id + '__' + roleKey(r.id);
        const inputAttrs = canEdit ? 'onchange="togglePermission(\''+p.id+'\',\''+r.id+'\',this.checked)"' : 'disabled';
        const cellBg = isMe ? 'bg-blue-100/40' : '';
        const dot = customized ? '<span class="custom-dot"></span>' : '';
        // v2.4.33: 改用 .perm-switch 自寫 CSS 確保 thumb 滑動效果在所有瀏覽器都正確
        return '<td class="py-1.5 px-3 text-center ' + cellBg + '">' +
          '<label class="perm-switch" title="' + (eff ? '已開啟' : '已關閉') + '">' +
            '<input type="checkbox" ' + (eff ? 'checked' : '') + ' ' + inputAttrs + '>' +
            '<span class="track"><span class="thumb"></span>' + dot + '</span>' +
          '</label>' +
        '</td>';
      }).join('') + '</tr>';
  }).join('');
}

function renderRoleAssignmentMatrix() {
  const box = document.getElementById('role-assignment-matrix');
  if (!box) return;
  const firebaseRole = localStorage.getItem('admin_firebaseRole') || (currentAgent === 'Jun' ? 'owner' : 'readonly');
  const rows = [
    { role: 'owner', label: 'Owner', desc: '最高管理者', canAssign: ['admin', 'agent', 'head_store_manager', 'store_manager', 'store_staff', 'accountant', 'readonly'] },
    { role: 'admin', label: 'Admin', desc: '全局管理者', canAssign: ['agent', 'head_store_manager', 'store_manager', 'store_staff', 'accountant', 'readonly'] },
    { role: 'head_store_manager', label: 'Head Store Manager', desc: '總店長', canAssign: ['store_manager', 'store_staff'], scope: '店家後台，可看四店訂單' },
    { role: 'store_manager', label: 'Store Manager', desc: '店鋪管理者', canAssign: ['store_staff', 'accountant', 'readonly'], scope: '限自己店鋪' },
    { role: 'agent', label: 'Agent', desc: '客服', canAssign: [] },
    { role: 'store_staff', label: 'Store Staff', desc: '店員', canAssign: [] },
    { role: 'accountant', label: 'Accountant', desc: '會計', canAssign: [] },
    { role: 'readonly', label: 'Readonly', desc: '唯讀', canAssign: [] }
  ];
  const roleLabel = {
    admin: '管理者',
    agent: '客服',
    head_store_manager: '總店長',
    store_manager: '店長',
    store_staff: '店員',
    accountant: '會計',
    readonly: '唯讀'
  };
  const current = rows.find(r => r.role === firebaseRole);
  const canAssign = current && current.canAssign.length;
  const chip = (role) => '<span class="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold">' + (roleLabel[role] || role) + '<span class="ml-1 font-mono text-[10px] text-blue-400">' + role + '</span></span>';
  const rowHtml = rows.map(r => {
    const active = r.role === firebaseRole;
    return '<tr class="' + (active ? 'bg-emerald-50' : '') + '">' +
      '<td class="py-3 px-3">' +
        '<div class="font-bold text-[#1A365D]">' + r.label + (active ? ' <span class="text-emerald-600 text-xs">目前角色</span>' : '') + '</div>' +
        '<div class="text-xs text-slate-500">' + r.desc + (r.scope ? ' · ' + r.scope : '') + '</div>' +
      '</td>' +
      '<td class="py-3 px-3">' +
        (r.canAssign.length ? '<div class="flex flex-wrap gap-1.5">' + r.canAssign.map(chip).join('') + '</div>' : '<span class="text-xs text-slate-400">不可新增/授權其他角色</span>') +
      '</td>' +
    '</tr>';
  }).join('');
  box.innerHTML =
    '<div class="rounded-2xl border border-slate-200 bg-white overflow-hidden">' +
      '<div class="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">' +
        '<div>' +
          '<div class="text-lg font-bold text-[#1A365D]">角色添加權限</div>' +
          '<div class="text-xs text-slate-500 mt-1">誰可以新增哪些 Firebase 後台角色，由後端強制校驗</div>' +
        '</div>' +
        (canAssign ? '<button onclick="switchSection(\'employees\',document.querySelector(\'[data-sec=employees]\'))" class="btn-navy px-4 py-2 rounded-xl text-sm">去員工管理新增</button>' : '') +
      '</div>' +
      '<div class="p-4 border-b border-slate-100">' +
        '<div class="text-xs font-bold text-slate-500 mb-2">你目前可以添加</div>' +
        (canAssign ? '<div class="flex flex-wrap gap-2">' + current.canAssign.map(chip).join('') + '</div>' : '<div class="text-sm text-slate-500">目前角色沒有新增/授權其他角色的權限。</div>') +
        (['head_store_manager','store_manager'].indexOf(firebaseRole) >= 0 ? '<div class="mt-2 text-xs text-amber-700">店長新增的帳號會自動綁定自己的店鋪，不能跨店建立或管理。</div>' : '') +
      '</div>' +
      '<div class="overflow-x-auto">' +
        '<table class="data-table"><thead><tr><th class="text-left">授權者角色</th><th class="text-left">可以添加的角色</th></tr></thead><tbody>' + rowHtml + '</tbody></table>' +
      '</div>' +
    '</div>';
}

// v2.4.20 #4 改良版 — 改 pending 暫存，等用戶按「儲存所有變更」
function togglePermission(permId, roleId, isChecked){
  if (currentAgent !== 'Jun') return;
  if (!window.__permPendingChanges) window.__permPendingChanges = {};
  const rk = roleId === 'jun' ? 'jun' : (roleId === 'agent' ? 'agent' : 'store');
  window.__permPendingChanges[permId + '__' + rk] = isChecked ? 1 : 0;
  renderPermissions();
}

function setPermFilter(mode, btn){
  window.__permFilterMode = mode;
  renderPermissions();
}

function applyPermTemplate(tmpl){
  if (!tmpl || currentAgent !== 'Jun') return;
  if (!window.__permPendingChanges) window.__permPendingChanges = {};
  const p = window.__permPendingChanges;
  if (tmpl === 'default') {
    if (!confirm('確認重置所有自訂權限為系統預設？(這會清掉所有客製，但要按「儲存」才會生效)')) return;
    // 把所有 overrides 也清掉
    Object.keys(JSON.parse(localStorage.getItem('admin_permissions_overrides')||'{}')).forEach(k => p[k] = '_DELETE_');
  } else if (tmpl === 'agent_admin') {
    p['p13__agent'] = 1; p['p14__agent'] = 1;
    toast('套用：給客服月度關帳 + 解凍權限 (記得儲存)', 'info');
  } else if (tmpl === 'agent_full') {
    ['p02','p03','p06','p07','p08','p09','p10','p11','p12','p13','p14','p15'].forEach(pid => p[pid+'__agent'] = 1);
    toast('套用：給客服全部後台權限 (記得儲存)', 'info');
  } else if (tmpl === 'store_view') {
    ['p02','p03','p06','p07','p08','p09'].forEach(pid => p[pid+'__store'] = 1);
    toast('套用：給店家看訂單管理 + 客戶 + 對帳 (記得儲存)', 'info');
  }
  renderPermissions();
}

function savePermissionChanges(){
  if (currentAgent !== 'Jun') return;
  const pending = window.__permPendingChanges || {};
  if (Object.keys(pending).length === 0) return;
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem('admin_permissions_overrides') || '{}'); } catch(e){}
  Object.entries(pending).forEach(([k, v]) => {
    if (v === '_DELETE_') delete overrides[k];
    else overrides[k] = v;
  });
  localStorage.setItem('admin_permissions_overrides', JSON.stringify(overrides));
  window.__permPendingChanges = {};
  toast('✅ 已儲存 ' + Object.keys(pending).length + ' 項權限調整 (本機暫存，需通知 Jun 更新程式碼才會生效)', 'success');
  renderPermissions();
}

function discardPermissionChanges(){
  window.__permPendingChanges = {};
  toast('已捨棄未儲存的變更', 'info');
  renderPermissions();
}

function resetPermissionOverrides(){
  if (!confirm('確認重置所有權限自訂為系統預設？此動作不可復原')) return;
  localStorage.removeItem('admin_permissions_overrides');
  toast('已重置為預設權限', 'success');
  // 移掉 controls 讓它重生
  const c = document.getElementById('perm-controls');
  if (c) c.remove();
  renderPermissions();
}

// v2.4.20 F ── 一鍵預檢上月關帳（Jun 限）
// v2.4.20 E ── 待辦過濾 (全部 / 我的)
let currentTodoFilter = 'all';
function setTodoFilter(f, btn){
  currentTodoFilter = f;
  document.querySelectorAll('#todo-filter-all,#todo-filter-mine').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTodos();
}

// v2.4.20 G ── 月度營收趨勢圖
let __trendChart = null;
function renderTrendChart(){
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('monthly-trend-chart');
  if (!canvas) return;
  // 過去 6 個月
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'), label: (d.getMonth()+1)+'月' });
  }
  const monthKeys = new Set(months.map(m => m.key));
  const monthTotals = {};
  months.forEach(m => { monthTotals[m.key] = { deposit:0, refund:0 }; });
  allOrders.forEach(o => {
    const key = bookingMonth(o);
    if (!monthKeys.has(key)) return;
    monthTotals[key].deposit += Number(o.deposit) || 0;
    monthTotals[key].refund += Number(o.refundAmount) || 0;
  });
  const depositData = months.map(m => monthTotals[m.key].deposit);
  const refundData = months.map(m => monthTotals[m.key].refund);
  if (__trendChart) __trendChart.destroy();
  __trendChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        { label: '訂金 (¥)', data: depositData, borderColor: '#1A365D', backgroundColor: 'rgba(26,54,93,0.1)', fill: true, tension: 0.3 },
        { label: '退款 (¥)', data: refundData, borderColor: '#DC2626', backgroundColor: 'rgba(220,38,38,0.1)', fill: true, tension: 0.3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => '¥' + v.toLocaleString() } } }
    }
  });
}

async function quickPreCheckClose(){
  if (useFirebaseAdmin()) { toast('Firebase 模式下月度關帳尚未遷移；舊 GAS 僅保留只讀備份', 'warning'); return; }
  if (currentAgent !== 'Jun') { toast('只有 Jun 可以執行', 'error'); return; }
  // 找上月份
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = prev.getFullYear() + '-' + String(prev.getMonth()+1).padStart(2,'0');
  toast('正在預檢 ' + month + '…', 'info');
  try {
    const r = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action:'getArchiveCheck', month, token:adminToken }) });
    const d = await r.json();
    if (d.status !== 'ok') { toast(d.message || '預檢失敗', 'error'); return; }
    if (d.count === 0) {
      alert('📦 ' + month + '\n\n本月無訂單可關帳');
      return;
    }
    const summary = '📦 ' + month + ' 預檢結果\n\n' +
      '訂單筆數：' + d.count + ' 筆\n' +
      '訂金總額：¥' + (d.depositSum||0).toLocaleString() + '\n' +
      '體驗總額：¥' + (d.chargeSum||0).toLocaleString() + '\n\n' +
      (d.canClose ? '✅ 可以關帳！\n要立刻關帳嗎？' :
        '❌ 尚有 ' + (d.blockers||[]).length + ' 筆未對帳:\n' +
        (d.blockers||[]).slice(0,5).map(b => '• ' + b.orderId + '：' + b.reason).join('\n') +
        (d.blockers && d.blockers.length > 5 ? '\n... 還有 ' + (d.blockers.length - 5) + ' 筆' : ''));
    if (d.canClose) {
      if (confirm(summary)) {
        switchSection('reconcile', document.querySelector('[data-sec=reconcile]'));
        setTimeout(() => { if (typeof setReconcileMonthFilter === 'function') setReconcileMonthFilter(month); else document.getElementById('recon-month').value = month; openCloseMonthDialog(); }, 500);
      }
    } else {
      alert(summary);
    }
  } catch (e) {
    toast('連線失敗：' + e.message, 'error');
  }
}

function showMyPermissions(){
  // v2.4.20: 顯示當前用戶的角色與權限
  const isJun = currentAgent === 'Jun';
  const isAgent = currentRole === 'agent';
  const isStore = currentRole === 'store';
  const accessLabel = normalizePlatformAccess(currentPlatformAccess).map(platformLabel).join(' / ');
  const perms = [
    { label: '👀 看訂單', who: '客服全部 / 店家僅自己門市 walk-in', can: true },
    { label: '✏️ 編輯訂單', who: '客服 / 店家', can: true },
    { label: '🔍 全站搜尋', who: '所有人', can: true },
    { label: '📊 看儀表板 / 對帳 / 客戶 / 財務', who: '只有客服', can: isAgent },
    { label: '➕ 現場新增訂單 (walk-in)', who: '只有店家', can: isStore },
    { label: '📦 月度關帳並歸檔', who: '只有 Jun', can: isJun },
    { label: '🔓 解凍已關帳月份', who: '只有 Jun', can: isJun },
  ];
  const html = '<div class="modal-overlay" onclick="if(event.target===this)this.remove()" style="display:flex">' +
    '<div class="modal-frame" style="max-width:560px;height:auto;max-height:80vh">' +
    '<button onclick="this.closest(\'.modal-overlay\').remove()" class="modal-floating-close" aria-label="關閉權限說明">×</button>' +
    '<div class="modal-box" style="max-width:560px;height:auto;max-height:80vh;padding-top:72px">' +
    '<div class="mb-4 modal-title-block">' +
    '<h3 class="text-xl font-bold text-[#1A365D]">' + (isStore?'🏪':'👤') + ' ' + currentAgent + (isStore?' (店家)':'') + '</h3>' +
    '<p class="text-sm text-slate-600 mt-1">角色：<b>' + (isStore?'店家':'客服') + '</b>' + (currentStoreKey?'｜門市：'+currentStoreKey:'') + '｜平台：' + accessLabel + '</p></div>' +
    '<h4 class="text-sm font-bold text-slate-700 mb-2 mt-2">我能做什麼</h4>' +
    '<div class="space-y-1 text-sm">' +
    perms.map(p => '<div class="flex items-center gap-2 p-2 rounded ' + (p.can?'bg-emerald-50':'bg-slate-100 opacity-60') + '">' +
      '<span class="text-lg">' + (p.can?'✅':'❌') + '</span>' +
      '<div class="flex-1"><div class="font-semibold">' + p.label + '</div>' +
      '<div class="text-xs text-slate-500">' + p.who + '</div></div></div>').join('') +
    '</div>' +
    '<div class="mt-4 p-3 bg-slate-50 rounded text-xs text-slate-600">' +
    '🔒 想改密碼或新增帳號？請聯繫 Jun（管理員會去 資料庫「客服 / 店家 帳號」設定修改）' +
    '</div></div></div></div>';
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstChild);
}

function openReconHelp(){
  const html = '<div class="modal-overlay" onclick="if(event.target===this)this.remove()" style="display:flex">' +
    '<div class="modal-frame" style="max-width:600px;height:auto;max-height:80vh">' +
    '<button onclick="this.closest(\'.modal-overlay\').remove()" class="modal-floating-close" aria-label="關閉對帳說明">×</button>' +
    '<div class="modal-box" style="max-width:600px;height:auto;max-height:80vh;padding-top:72px">' +
    '<h3 class="text-lg font-bold text-[#1A365D] mb-4 modal-title-block">📌 對帳說明</h3>' +
    '<div class="text-sm text-slate-700 space-y-2 font-medium">' +
    '<div>• <b>應收訂金</b> = 每人 ¥1,000 × 預約人數</div>' +
    '<div>• <b>已收訂金</b> = 客人實際匯款金額</div>' +
    '<div>• <span style="background:#ECFDF5;padding:2px 8px;border-radius:4px;color:#047857;font-weight:600">✓ 已對帳</span> = 已確認，金額正確</div>' +
    '<div>• <span style="background:#EFF6FF;padding:2px 8px;border-radius:4px;color:#1E40AF;font-weight:600">△ 待收尾款</span> = 已收 < 應收訂金（店家現場補齊即可，非異常）</div>' +
    '<div>• <span style="background:#FEF2F2;padding:2px 8px;border-radius:4px;color:#B91C1C;font-weight:600">⚠ 超收異常</span> = 已收 > 體驗總額（必須退款給客人）</div>' +
    '<div>• <span style="background:#FFFBEB;padding:2px 8px;border-radius:4px;color:#92400E;font-weight:600">○ 未對帳</span> = 訂單尚未確認</div>' +
    '<div class="mt-3 p-2 bg-slate-50 rounded text-xs">📌 walk-in 訂單因現場全額收款，deposit=0 但已確認也算「已對帳」。</div>' +
    '</div></div></div></div>';
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstChild);
}

async function openCloseMonthDialog() {
  if (useFirebaseAdmin()) { toast('Firebase 模式下月度關帳尚未遷移；請先用 Firestore 備份策略保留資料', 'warning'); return; }
  if (currentAgent !== 'Jun') { toast('只有 Jun 可以執行關帳', 'error'); return; }
  const month = typeof getReconcileMonthFilter === 'function' ? getReconcileMonthFilter() : document.getElementById('recon-month').value;
  if (!month || month === 'all') { toast('請先選擇一個月份', 'warning'); return; }
  // v2.4.20: 防呆（理論上下拉已 disable，這裡僅 safety net）
  const now = new Date();
  const currentMonth = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  if (month >= currentMonth) { toast('未到月份不能關帳', 'error'); return; }
  toast('正在預檢 ' + month + '…', 'info');
  try {
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action:'getArchiveCheck', month, token:adminToken }) });
    const d = await res.json();
    if (d.status !== 'ok') { toast(d.message || '預檢失敗', 'error'); return; }
    if (!d.canClose) {
      const reasons = (d.blockers || []).slice(0, 5).map(b => '• ' + b.orderId + '：' + b.reason).join('\n');
      alert('❌ 無法關帳 ' + month + '\n\n以下訂單尚未對帳完成（共 ' + (d.blockers || []).length + ' 筆）：\n\n' + reasons + (d.blockers && d.blockers.length > 5 ? '\n... 還有 ' + (d.blockers.length - 5) + ' 筆' : ''));
      return;
    }
    const ok = confirm('📦 確認關帳 ' + month + ' 嗎？\n\n' +
      '• 將歸檔 ' + d.count + ' 筆訂單到「歷史檔案」\n' +
      '• 主表會少 ' + d.count + ' 列\n' +
      '• 訂金總額：¥' + (d.depositSum || 0).toLocaleString() + '\n' +
      '• 體驗總額：¥' + (d.chargeSum || 0).toLocaleString() + '\n\n' +
      '⚠️ 關帳後該月變成唯讀，要改要先「解凍」。確定？');
    if (!ok) return;
    toast('關帳中…', 'info');
    const res2 = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action:'closeMonth', month, token:adminToken }) });
    const d2 = await res2.json();
    if (d2.status === 'ok') {
      toast('已關帳 ' + month + '：' + d2.archivedCount + ' 筆訂單已歸檔', 'success');
      setTimeout(() => loadOrders(), 800);
    } else {
      toast(d2.message || '關帳失敗', 'error');
    }
  } catch (e) {
    toast('連線失敗：' + e.message, 'error');
  }
}

async function loadArchivedList() {
  const list = document.getElementById('archived-months-list');
  list.innerHTML = '<div class="text-center text-slate-500 py-6">載入中…</div>';
  if (useFirebaseAdmin()) {
    list.innerHTML =
      '<div class="p-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 leading-relaxed">' +
      '<div class="font-bold text-base mb-2">舊 GAS 歸檔資料目前保留為只讀備份</div>' +
      '<div>Firebase 後台不再使用舊 GAS token，因此不直接讀取舊歸檔表。</div>' +
      '<div class="mt-2">如需查歷史歸檔，請到舊 Google Sheet / GAS 備份資料查看。</div>' +
      '<div class="mt-2">新 Firestore 資料請使用每日 Firestore export 備份策略。</div>' +
      '</div>';
    return;
  }
  try {
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action:'getArchivedList', token:adminToken }) });
    const d = await res.json();
    if (d.status !== 'ok') { list.innerHTML = '<div class="text-center text-red-500 py-6">' + (d.message || '載入失敗') + '</div>'; return; }
    const months = d.months || [];
    // v2.4.20: 把已關帳月份清單存到全域，供 initReconMonths 合併
    window.__archivedMonthsList = months.map(m => normMonth(m.month));
    if (!months.length) { list.innerHTML = '<div class="text-center text-slate-500 py-6 font-semibold">尚未關帳任何月份</div>'; return; }
    list.innerHTML = months.map(m =>
      '<div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer border border-slate-200" onclick="showArchivedMonth(\''+normMonth(m.month)+'\')">' +
      '<div class="flex-1">' +
        '<div class="font-bold text-base text-[#1A365D]">📦 ' + fmtMonth(m.month) + '</div>' +
        '<div class="text-xs text-slate-600 mt-0.5">關帳於 ' + fmtJSTDateTime(m.lastTime) + ' · ' + m.count + ' 筆訂單 · 訂金 ¥' + (m.depositSum||0).toLocaleString() + '</div>' +
      '</div>' +
      '<button class="btn-navy px-3 py-1.5 rounded-lg text-sm">查看 →</button>' +
      '</div>'
    ).join('');
  } catch (e) {
    list.innerHTML = '<div class="text-center text-red-500 py-6">連線失敗：' + e.message + '</div>';
  }
}

let currentArchiveMonth = null;
async function showArchivedMonth(month) {
  // v2.4.20: month 從 Sheets 撈出可能是 ISO 字串，正規化成 YYYY-MM
  month = normMonth(month);
  currentArchiveMonth = month;
  const detail = document.getElementById('archive-detail');
  detail.classList.remove('hidden');
  document.getElementById('archive-detail-title').textContent = '📦 ' + fmtMonth(month) + ' 明細';
  if (currentAgent === 'Jun') document.getElementById('unlock-month-btn').classList.remove('hidden');
  document.getElementById('archive-orders-list').innerHTML = '<div class="text-center text-slate-500 py-6">載入中…</div>';
  try {
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action:'getArchiveOrders', month, token:adminToken }) });
    const d = await res.json();
    if (d.status !== 'ok') { document.getElementById('archive-orders-list').innerHTML = '<div class="text-center text-red-500 py-6">' + (d.message || '載入失敗') + '</div>'; return; }
    const orders = d.orders || [];
    let depositSum = 0, chargeSum = 0, lastArchivedAt = '';
    orders.forEach(o => {
      depositSum += Number(o.deposit) || 0;
      chargeSum += (Number(o.price)||0) + (Number(o.hairFee)||0) + (Number(o.makeupFee)||0) + (Number(o.photoFee)||0);
      if (o.archivedAt && o.archivedAt > lastArchivedAt) lastArchivedAt = o.archivedAt;
    });
    document.getElementById('arch-stat-count').textContent = orders.length;
    document.getElementById('arch-stat-deposit').textContent = '¥' + depositSum.toLocaleString();
    document.getElementById('arch-stat-charge').textContent = '¥' + chargeSum.toLocaleString();
    document.getElementById('arch-stat-time').textContent = fmtJSTDateTime(lastArchivedAt);
    document.getElementById('archive-orders-list').innerHTML = orders.map(o =>
      '<div class="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 hover:bg-slate-50">' +
      '<div class="flex-1"><div class="font-bold text-base">' + (o.name||'—') + ' <span class="text-xs text-slate-500 font-mono">' + (o.orderId||'') + '</span></div>' +
      '<div class="text-sm text-slate-700 mt-0.5">' + fmtDate(o.bookingDate) + ' · ' + (o.plan||'—') + ' · ' + formatGuestCount(o) + ' · 訂金 ¥' + (Number(o.deposit)||0).toLocaleString() + '</div></div>' +
      '<span class="badge badge-confirmed">📦 已歸檔</span></div>'
    ).join('');
  } catch (e) {
    document.getElementById('archive-orders-list').innerHTML = '<div class="text-center text-red-500 py-6">連線失敗：' + e.message + '</div>';
  }
}

async function unlockArchivedMonth() {
  if (useFirebaseAdmin()) { toast('Firebase 模式下解凍舊歸檔尚未遷移；舊 GAS 僅保留只讀備份', 'warning'); return; }
  if (currentAgent !== 'Jun') { toast('只有 Jun 可以解凍', 'error'); return; }
  if (!currentArchiveMonth) return;
  const ok = confirm('🔓 確認解凍 ' + currentArchiveMonth + ' 嗎？\n\n所有該月訂單會搬回主表，可以重新編輯。\n編輯完記得再次關帳。確定？');
  if (!ok) return;
  toast('解凍中…', 'info');
  try {
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action:'unlockMonth', month: currentArchiveMonth, token:adminToken }) });
    const d = await res.json();
    if (d.status === 'ok') {
      toast('已解凍 ' + currentArchiveMonth + '：' + d.restoredCount + ' 筆訂單回到主表', 'success');
      document.getElementById('archive-detail').classList.add('hidden');
      loadArchivedList();
      setTimeout(() => loadOrders(), 600);
    } else {
      toast(d.message || '解凍失敗', 'error');
    }
  } catch (e) {
    toast('連線失敗：' + e.message, 'error');
  }
}


async function saveOrder() {
  const btn = document.getElementById('save-btn');
  const msg = document.getElementById('save-msg');
  if (!editingOrder) return;
  const isStoreReadOnlyOrder = currentRole === 'store'
    && typeof isStoreOrderReadOnly === 'function'
    && isStoreOrderReadOnly(editingOrder);
  const isStoreReservationEdit = currentRole === 'store'
    && document.getElementById('edit-modal')?.dataset.storeReservationEdit === 'true';
  if (!isStoreReadOnlyOrder && isStoreReservationEdit && typeof syncStoreInlineEditors === 'function') {
    syncStoreInlineEditors();
  }
  const isStoreCheckout = currentRole === 'store'
    && !isStoreReadOnlyOrder
    && !isStoreReservationEdit
    && ['confirmed', 'checked_in'].includes(orderStatusOf(editingOrder));
  if (isStoreCheckout) {
    const consumption = Math.max(0,
      Number(document.getElementById('e-price').value || 0)
      + Number(document.getElementById('e-hair-fee').value || 0)
      + Number(document.getElementById('e-makeup-fee').value || 0)
      + Number(document.getElementById('e-photo-fee').value || 0)
      + Number(document.getElementById('e-overtime-damage-deduction').value || 0)
      - Number(document.getElementById('e-discount-refund-amount').value || 0)
    );
    const paidDeposit = Number(document.getElementById('e-deposit').value || 0);
    const paid = paidDeposit
      + Number(document.getElementById('e-store-actual-received').value || 0);
    const balance = Math.max(0, consumption - paid);
    const nextLabel = balance === 0 ? '已完成' : '待付尾款（¥' + balance.toLocaleString() + '）';
    if (!confirm('確認提交本次消費與付款金額？\n儲存後狀態將變為「' + nextLabel + '」，店鋪端不可再修改。')) return;
  }
  btn.textContent = '儲存中…'; btn.disabled = true;
  const guests = typeof syncEditPax === 'function'
    ? syncEditPax()
    : { adults: Number(document.getElementById('e-adults')?.value || 0), maleAdults: null, femaleAdults: null, children: Number(document.getElementById('e-children')?.value || 0), pax: document.getElementById('e-pax')?.value || '' };
  const netDepositValue = Number(document.getElementById('e-deposit').value || 0);
  const refundAmountValue = Number(document.getElementById('e-refund-amt').value || 0);
  const rawDepositValue = Math.max(0, netDepositValue + refundAmountValue);
  const payload = {
    action: 'adminUpdate', agent: currentAgent, token: adminToken, orderId: editingOrder.orderId,
    name: document.getElementById('e-name').value, phone: document.getElementById('e-phone').value, email: document.getElementById('e-email').value,
    bookingDate: (function(){ const v=document.getElementById('e-booking-date').value; if(!v) return ''; const m=v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/); if(!m) return v; return m[1]+'/'+m[2]+'/'+m[3]+(m[4]?(' '+m[4]+':'+m[5]):''); })(), pax: guests.pax,
    plan: document.getElementById('e-plan').value, platform: document.getElementById('e-platform').value,
    hair: document.getElementById('e-hair').value, makeup: document.getElementById('e-makeup').value, photo: document.getElementById('e-photo').value, confirmed: (document.getElementById('e-confirmed').value === 'true' ? 'TRUE' : 'FALSE'),
    deposit: rawDepositValue, kimonoPrice: document.getElementById('e-price').value,
    hairFee: document.getElementById('e-hair-fee').value, makeupFee: document.getElementById('e-makeup-fee').value, photoFee: document.getElementById('e-photo-fee').value,
    coupon: document.getElementById('e-coupon').value, rate: document.getElementById('e-rate')?.value || '',
    discountRefundAmount: document.getElementById('e-discount-refund-amount').value,
    overtimeDamageDeduction: document.getElementById('e-overtime-damage-deduction').value,
    storeActualReceived: document.getElementById('e-store-actual-received').value,
    refundAmt: document.getElementById('e-refund-amt').value, refundDate: document.getElementById('e-refund-date').value,
    refundReason: composeRefundReason(), note: document.getElementById('e-remark').value,
    storeNote: document.getElementById('e-store-note').value,
  };
  if (currentRole === 'store') {
    delete payload.name;
    delete payload.phone;
    delete payload.email;
    delete payload.confirmed;
    delete payload.deposit;
    delete payload.refundAmt;
    delete payload.refundDate;
    delete payload.refundReason;
  }
  if (useFirebaseAdmin()) {
    try {
      const token = await getFreshAdminToken();
      const apiBaseUrl = (KIMONO_CONFIG.API_BASE_URL || '').replace(/\/$/, '');
      const bookingValue = document.getElementById('e-booking-date').value;
      const refundDateValue = document.getElementById('e-refund-date').value;
      const firebasePayload = isStoreReadOnlyOrder ? {
        orderId: editingOrder.firebaseDocId || editingOrder.orderId,
        storeNote: payload.storeNote
      } : {
        orderId: editingOrder.firebaseDocId || editingOrder.orderId,
        storeNote: payload.storeNote,
        ...(currentRole === 'store' ? {} : {
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          bookingAt: bookingValue ? bookingValue + ':00+09:00' : undefined,
          plan: payload.plan,
          platform: payload.platform,
          depositJpy: Number(payload.deposit || 0),
          kimonoPriceJpy: Number(payload.kimonoPrice || 0),
          hairFeeJpy: Number(payload.hairFee || 0),
          makeupFeeJpy: Number(payload.makeupFee || 0),
          photoFeeJpy: Number(payload.photoFee || 0),
          couponCode: payload.coupon,
          discountRate: Number(payload.rate || 0),
          discountRefundAmountJpy: Number(payload.discountRefundAmount || 0),
          overtimeDamageDeductionJpy: Number(payload.overtimeDamageDeduction || 0),
          storeActualReceivedJpy: Number(payload.storeActualReceived || 0),
          note: payload.note,
          storeNote: payload.storeNote
        }),
        adults: guests.adults,
        ...(guests.maleAdults !== null ? { maleAdults: guests.maleAdults, femaleAdults: guests.femaleAdults } : {}),
        children: guests.children,
        hair: payload.hair === 'true',
        makeup: payload.makeup === 'true',
        photo: payload.photo === 'true',
        ...(isStoreCheckout ? {
          checkout: true,
          kimonoPriceJpy: Number(payload.kimonoPrice || 0),
          hairFeeJpy: Number(payload.hairFee || 0),
          makeupFeeJpy: Number(payload.makeupFee || 0),
          photoFeeJpy: Number(payload.photoFee || 0),
          discountRefundAmountJpy: Number(payload.discountRefundAmount || 0),
          overtimeDamageDeductionJpy: Number(payload.overtimeDamageDeduction || 0),
          storeActualReceivedJpy: Number(payload.storeActualReceived || 0)
        } : {}),
        ...(currentRole === 'store' ? {} : {
          refundAmountJpy: Number(payload.refundAmt || 0),
          refundTime: refundDateValue || '',
          refundReason: payload.refundReason,
          refundBankCode: document.getElementById('e-refund-bankcode').value.trim(),
          refundBankName: document.getElementById('e-refund-bankname').value.trim(),
          refundBankAccount: document.getElementById('e-refund-account').value.trim(),
          refundBankAccountName: document.getElementById('e-refund-accountname').value.trim()
        })
      };
      const res = await fetch(apiBaseUrl + '/updateOrderByStaff', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + token },
        body: JSON.stringify(firebasePayload)
      });
      const data = await res.json().catch(()=>({}));
      btn.textContent = '💾 儲存變更'; btn.disabled = false;
      if (!res.ok || data.status !== 'success') throw new Error(data.message || '儲存失敗');
      if (data.order) {
        const savedActual = Number(data.order.storeActualReceivedJpy ?? data.order.storeActualReceived ?? firebasePayload.storeActualReceivedJpy ?? 0);
        const savedBalance = Number(data.order.balanceDueJpy ?? data.order.balanceDue ?? 0);
        editingOrder.storeActualReceived = savedActual;
        editingOrder.storeActualReceivedJpy = savedActual;
        editingOrder.balanceDue = savedBalance;
        editingOrder.balanceDueJpy = savedBalance;
        editingOrder.storeNote = data.order.storeNote ?? firebasePayload.storeNote ?? editingOrder.storeNote;
        editingOrder.status = data.order.status || editingOrder.status;
      }
      let proofNotice = '';
      if (isStoreCheckout) {
        try {
          await callFirebaseAdminFunction('/sendProofReceivedEmail', {
            orderId: editingOrder.firebaseDocId || editingOrder.orderId
          });
          proofNotice = '，付款憑證信已寄出';
        } catch (emailErr) {
          proofNotice = '，但付款憑證信寄送失敗：' + (emailErr.message || emailErr);
        }
      }
      if (isStoreReservationEdit) {
        document.getElementById('edit-modal')?.removeAttribute('data-store-reservation-edit');
      }
      const savedId = editingOrder.orderId;
      msg.textContent = '正在重新載入…';
      msg.className = 'text-center text-sm mt-3 text-slate-600';
      msg.classList.remove('hidden');
      setTimeout(() => {
        closeModal();
        toast('已儲存 ' + savedId + proofNotice + '，重新載入中…', proofNotice.indexOf('失敗') >= 0 ? 'warning' : 'success');
        window.__highlightAfterLoad = savedId;
        loadOrders();
      }, 200);
    } catch (e) {
      btn.textContent = isStoreReadOnlyOrder ? '💾 儲存店鋪備註' : '💾 儲存變更'; btn.disabled = false;
      msg.textContent = '❌ ' + (e.message || '儲存失敗');
      msg.className = 'text-center text-sm mt-3 text-red-600 font-bold';
      msg.classList.remove('hidden');
    }
    return;
  }
  fetch(GAS_URL, { method:'POST', body: JSON.stringify(payload) }).then(r => r.json()).then(data => {
      btn.textContent = '💾 儲存變更'; btn.disabled = false;
      if (data.status === 'unauthorized') { showLogin(); return; }
      if (data.status === 'ok' || data.status === 'success') {
        // v2.4.20: 統一只用 toast、不在 modal 顯示 ✅（避免雙重提示）
        const savedId = editingOrder.orderId;
        msg.textContent = '正在重新載入…';
        msg.className = 'text-center text-sm mt-3 text-slate-600';
        msg.classList.remove('hidden');
        setTimeout(() => {
          closeModal();
          toast('已儲存 ' + savedId + '，重新載入中…', 'success');
          if (typeof loadOrders === 'function') {
            window.__highlightAfterLoad = savedId;
            loadOrders();
          }
        }, 200);
      } else {
        msg.textContent = '❌ ' + (data.message || '儲存失敗'); msg.className = 'text-center text-sm mt-3 text-red-600 font-bold';
        msg.classList.remove('hidden');
      }
    }).catch(e => {
      btn.textContent = '💾 儲存變更'; btn.disabled = false;
      msg.textContent = '❌ 連線失敗: ' + e.message; msg.className = 'text-center text-sm mt-3 text-red-600 font-bold';
      msg.classList.remove('hidden');
    });
}

document.addEventListener('keydown', (e)=>{
  if((e.ctrlKey||e.metaKey) && e.key==='k'){ e.preventDefault(); document.getElementById('global-search')?.focus(); }
  if(e.key==='Escape'){ closeModal(); closeCustomerModal(); }
});
document.getElementById('global-search')?.addEventListener('input', (e)=>{
  const q = e.target.value;
  if(!q) return;
  switchSection('orders', document.querySelector('[data-sec=orders]'));
  document.getElementById('f-search').value = q;
  filterOrders();
});


/* === v2.2.1 全站搜尋 + 快速操作擴充 === */
(function(){
  var input = document.getElementById('global-search');
  if (!input) return;
  var dropdown;
  function ensureDropdown(){
    if (dropdown) return dropdown;
    dropdown = document.createElement('div');
    dropdown.id = 'gs-dropdown';
    dropdown.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);width:680px;max-width:90vw;max-height:60vh;overflow-y:auto;background:white;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.25);z-index:9999;display:none;';
    document.body.appendChild(dropdown);
    return dropdown;
  }
  function getOrders(){
    try { return (typeof allOrders !== 'undefined' && Array.isArray(allOrders)) ? allOrders : []; }
    catch(e){ return []; }
  }
  function renderResults(q){
    var dd = ensureDropdown();
    q = (q||'').trim().toLowerCase();
    if (!q){ dd.style.display='none'; return; }
    var orders = getOrders();
    var match = orders.filter(function(o){
      var s = ((o.orderId||'')+' '+(o.name||'')+' '+(o.phone||'')+' '+(o.email||'')+' '+(o.plan||'')).toLowerCase();
      return s.indexOf(q) !== -1;
    }).slice(0, 30);
    if (!match.length){
      dd.innerHTML = '<div style="padding:24px;text-align:center;color:#64748b;font-size:14px;">沒有符合的結果</div>';
      dd.style.display='block';
      return;
    }
    var html = '<div style="padding:8px 12px;background:#F1F5F9;font-size:11px;color:#475569;border-bottom:1px solid #E2E8F0;">找到 '+match.length+' 筆</div>';
    html += match.map(function(o, i){
      var meta = orderStatusMeta(orderStatusOf(o));
      var status = '<span class="order-status-control '+meta.css+'"><span class="order-status-icon">'+meta.icon+'</span><span>'+meta.label+'</span></span>';
      var date = (o.bookingDate||'').slice(0,10) || '—';
      return '<div class="gs-row" data-id="'+(o.orderId||'')+'" data-idx="'+i+'" style="padding:12px 16px;border-bottom:1px solid #F1F5F9;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:600;color:#1A365D;font-size:14px;">'+(o.name||'(未命名)')+' <span style="color:#94A3B8;font-size:11px;font-weight:400;">'+(o.orderId||'')+'</span></div>' +
          '<div style="color:#475569;font-size:12px;margin-top:2px;">📅 '+date+' · 📞 '+(o.phone||'—')+' · 👥 '+formatGuestCount(o)+' · 👘 '+(o.plan||'—')+'</div>' +
        '</div>' +
        '<div>'+status+'</div>' +
      '</div>';
    }).join('');
    dd.innerHTML = html;
    dd.style.display = 'block';
    [].forEach.call(dd.querySelectorAll('.gs-row'), function(row){
      row.addEventListener('mouseenter', function(){ row.style.background='#F8FAFC'; });
      row.addEventListener('mouseleave', function(){ row.style.background='white'; });
      row.addEventListener('click', function(){
        var id = row.getAttribute('data-id');
        if (id && typeof openEdit === 'function'){
          dd.style.display='none'; input.value=''; openEdit(id);
        }
      });
    });
  }
  input.addEventListener('input', function(){ renderResults(input.value); });
  input.addEventListener('focus', function(){ if (input.value) renderResults(input.value); });
  document.addEventListener('click', function(e){
    if (!dropdown) return;
    if (e.target===input || dropdown.contains(e.target)) return;
    dropdown.style.display='none';
  });
  /* Ctrl+K / Cmd+K */
  document.addEventListener('keydown', function(e){
    if ((e.ctrlKey||e.metaKey) && (e.key==='k'||e.key==='K')){
      e.preventDefault(); input.focus(); input.select();
    }
    if (e.key==='Escape' && dropdown && dropdown.style.display==='block'){
      dropdown.style.display='none'; input.blur();
    }
  });
})();
console.log('%c[v2.4.20] global search ready','color:#1A365D;font-weight:bold');

/* === v2.2.1 假訂單過濾（月份標題列等不完整資料） === */
window.__isFakeOrder = function(o){
  if (!o) return true;
  // 真訂單必要條件：「姓名」「電話」「Email」三者至少有一個有值
  // 月份標題列特徵：A 欄打「2026年4月」這種字串 → GAS 可能解讀成 ISO 日期塞進 orderId
  // 所以不管 orderId 是什麼，只要姓名/電話/Email 三者都空，就視為假訂單
  var hasName = !!String(o.name||'').trim();
  var hasPhone = !!String(o.phone||'').trim();
  var hasEmail = !!String(o.email||'').trim();
  return !(hasName || hasPhone || hasEmail);
};
/* 攔截每次 allOrders 變更後的 render，清掉假訂單 */
(function(){
  var sweepRunning = false;
  function sweep(){
    if (sweepRunning) return;
    if (typeof allOrders === 'undefined' || !Array.isArray(allOrders)) return;
    var before = allOrders.length;
    var clean = allOrders.filter(function(o){ return !window.__isFakeOrder(o); });
    if (clean.length !== before){
      sweepRunning = true;
      allOrders.length = 0;
      clean.forEach(function(o){ allOrders.push(o); });
      sweepRunning = false;
      console.log('%c[v2.2.1] 排除假訂單（月份標題列）：','color:#1A365D', before - clean.length, '筆');
    }
  }
  /* 每隔 500ms 掃一次（資料載入完才會生效） */
  var attempts = 0;
  var interval = setInterval(function(){
    attempts++;
    if (attempts > 60) { clearInterval(interval); return; } /* 30 秒後停止 */
    sweep();
    /* 載入完後讓 render 重畫 */
    if (typeof allOrders !== 'undefined' && Array.isArray(allOrders) && allOrders.length){
      try {
        if (typeof filterOrders === 'function') filterOrders();
        else if (typeof renderOrders === 'function') renderOrders();
      } catch(e){ console.warn('[v2.2.1] render after sweep failed:', e); }
      try {
        if (typeof renderDashboard === 'function') renderDashboard();
      } catch(e){}
      try {
        if (typeof renderCustomers === 'function' && document.getElementById('cust-stat-total')) renderCustomers();
      } catch(e){}
      clearInterval(interval);
    }
  }, 500);
})();
console.log('%c[v2.2.1] fake order filter ready','color:#1A365D;font-weight:bold');
