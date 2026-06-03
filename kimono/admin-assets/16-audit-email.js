// ============================================================
//  v2.4.21 #6 操作紀錄 (audit log) — Jun only
// ============================================================
async function loadAuditLog() {
  if (!useFirebaseAdmin() && currentAgent !== 'Jun') {
    alert('只有 Jun 可以查看操作紀錄');
    return;
  }
  const tbody = document.getElementById('audit-tbody');
  const empty = document.getElementById('audit-empty');
  const limitSel = document.getElementById('audit-limit');
  const limit = limitSel ? parseInt(limitSel.value || '100', 10) : 100;
  if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-400">載入中…</td></tr>';
  try {
    if (useFirebaseAdmin()) {
      const token = await getFreshAdminToken();
      const r = await fetch(firebaseAdminApiBaseUrl() + '/getAuditLogs?limit=' + encodeURIComponent(limit), {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await r.json().catch(()=>({}));
      if (!r.ok || data.status !== 'success') {
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-500">錯誤：' + (data.message || '無法取得 Firebase 操作紀錄') + '</td></tr>';
        return;
      }
      renderAuditLog((data.logs || []).map(firebaseAuditLogToAdminRow));
      return;
    }
    const r = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action:'getAuditLog', token:adminToken, agent:currentAgent, limit:limit })
    });
    const data = await r.json();
    if (data.status !== 'ok') {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-500">錯誤：' + (data.message || '無法取得紀錄') + '</td></tr>';
      return;
    }
    renderAuditLog(data.logs || []);
  } catch (e) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-500">網路錯誤：' + e.message + '</td></tr>';
  }
}

function renderAuditLog(logs) {
  const tbody = document.getElementById('audit-tbody');
  const empty = document.getElementById('audit-empty');
  if (!tbody) return;
  if (!logs || logs.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  const actionBadge = (a) => {
    const map = {
      '編輯訂單': 'bg-blue-100 text-blue-700',
      '寄確認信': 'bg-emerald-100 text-emerald-700',
      '關帳': 'bg-amber-100 text-amber-700',
      '解凍': 'bg-purple-100 text-purple-700',
      '現場訂單': 'bg-rose-100 text-rose-700',
      '退款': 'bg-red-100 text-red-700'
    };
    const cls = map[a] || 'bg-slate-100 text-slate-700';
    return '<span class="px-2 py-0.5 rounded text-xs font-bold ' + cls + '">' + (a || '—') + '</span>';
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'})[c]);
  tbody.innerHTML = logs.map(l => {
    return '<tr>'
      + '<td class="text-xs whitespace-nowrap">' + esc(l.time) + '</td>'
      + '<td class="font-bold">' + esc(l.agent) + '</td>'
      + '<td>' + actionBadge(l.action) + '</td>'
      + '<td class="font-mono text-xs">' + esc(l.orderId) + '</td>'
      + '<td>' + esc(l.customer) + '</td>'
      + '<td class="text-xs text-slate-600">' + esc(l.changes) + '</td>'
      + '<td class="text-xs text-slate-500">' + esc(l.note) + '</td>'
      + '</tr>';
  }).join('');
}

// ============================================================
//  v2.4.21 #8 寄確認信 — 在訂單編輯 modal 觸發
// ============================================================
async function sendConfirmEmailFromModal() {
  if (!(editingOrder && editingOrder.orderId)) {
    alert('請先選一筆訂單');
    return;
  }
  const emailEl = document.getElementById('e-email');
  const email = emailEl ? (emailEl.value || '').trim() : '';
  if (!email) {
    alert('該訂單沒有 email，無法寄送確認信。請先填入 email 並儲存。');
    return;
  }
  if (useFirebaseAdmin()) {
    const subject = '【旅乘 x 和服體驗】訂單確認 ' + (editingOrder.orderId || '');
    const body = [
      (document.getElementById('e-name').value || '您好') + ' 您好：',
      '',
      '您的和服體驗預約資訊如下：',
      '訂單編號：' + (editingOrder.orderId || '—'),
      '體驗日期：' + (document.getElementById('e-booking-date').value || '—').replace('T', ' '),
      '人數：' + (document.getElementById('e-pax').value || '—'),
      '方案：' + (document.getElementById('e-plan').value || '和服體驗'),
      '妝髮：' + (document.getElementById('e-hair').value === 'true' ? '需要' : '不需要'),
      '攝影：' + (document.getElementById('e-photo').value === 'true' ? '需要' : '不需要'),
      '',
      '如需更改或取消，請直接聯繫客服。',
      '',
      'Foreveryoung 旅乘'
    ].join('\n');
    const mailto = 'mailto:' + encodeURIComponent(email) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    window.location.href = mailto;
    alert('目前 Firebase 後台尚未接自動寄信服務，已為你打開 Email 草稿。請確認內容後手動寄出。');
    return;
  }
  if (!confirm('確定寄出確認信到 ' + email + ' 嗎？')) return;
  const btn = document.getElementById('send-confirm-email-btn');
  if (btn) { btn.disabled = true; btn.textContent = '寄送中…'; }
  try {
    const r = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action:'sendConfirmEmail', token:adminToken, agent:currentAgent, orderId:(editingOrder && editingOrder.orderId) })
    });
    const data = await r.json();
    if (data.status === 'ok') {
      alert('✅ ' + (data.message || '已寄出確認信'));
    } else {
      alert('❌ ' + (data.message || '寄送失敗'));
    }
  } catch (e) {
    alert('❌ 網路錯誤：' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✉️ 寄確認信'; }
  }
}
