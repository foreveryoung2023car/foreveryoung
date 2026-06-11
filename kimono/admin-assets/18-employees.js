// ============================================================
// v2.4.41: 員工管理 (Phase 1)
// ============================================================
async function renderEmployees() {
  const list = document.getElementById('employees-list');
  if (!list) return;
  list.innerHTML = '<div class="text-center py-6 text-slate-400">載入中...</div>';
  if (useFirebaseAdmin()) {
    try {
      const data = await callFirebaseAdminFunction('/listAdminUsers', null, { method: 'GET' });
      const emps = filterManageableFirebaseUsers(data.users || []);
      const active = emps.filter(e => e.active).length;
      const disabled = emps.length - active;
      document.getElementById('emp-stat-total').textContent = emps.length;
      document.getElementById('emp-stat-active').textContent = active;
      document.getElementById('emp-stat-disabled').textContent = disabled;
      if (!emps.length) {
        list.innerHTML = '<div class="text-center py-8 text-slate-400">尚無 Firebase 後台使用者</div>';
        return;
      }
      const roleLabel = {
        owner: 'Owner',
        admin: '管理者',
        agent: '客服',
        head_store_manager: '總店長',
        store_manager: '店長',
        store_staff: '店員',
        accountant: '會計',
        readonly: '唯讀'
      };
      let html = '<table class="w-full text-sm"><thead><tr class="bg-slate-100 text-slate-600">';
      html += '<th class="p-2 text-left">Email</th><th class="p-2 text-left">姓名</th><th class="p-2 text-left">角色</th><th class="p-2 text-left">門市</th><th class="p-2 text-left">狀態</th><th class="p-2 text-left">最後登入</th><th class="p-2 text-right">操作</th></tr></thead><tbody>';
      emps.forEach(e => {
        const lastLogin = e.lastSignInAt ? new Date(e.lastSignInAt).toLocaleString('zh-TW', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—';
        const statusLabel = e.active ? '<span class="text-emerald-600 font-bold">啟用</span>' : '<span class="text-slate-400">已停用</span>';
        const toggleBtn = e.active
          ? '<button onclick="disableEmployee(\'' + adminJsArg(e.uid) + '\',\'' + adminJsArg(e.displayName || e.email) + '\')" class="text-red-600 hover:underline text-xs">停用</button>'
          : '<button onclick="enableEmployee(\'' + adminJsArg(e.uid) + '\')" class="text-emerald-600 hover:underline text-xs">啟用</button>';
        html += '<tr class="border-b border-slate-100">';
        html += '<td class="p-2"><div class="font-bold">' + adminEsc(e.email || '—') + '</div><div class="font-mono text-[10px] text-slate-400">' + adminEsc(e.uid) + '</div></td>';
        html += '<td class="p-2 font-bold">' + adminEsc(e.displayName || '—') + '</td>';
        html += '<td class="p-2"><span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-bold">' + adminEsc(roleLabel[e.role] || e.role || '—') + '</span></td>';
        html += '<td class="p-2">' + adminEsc(e.storeId || '—') + '</td>';
        html += '<td class="p-2">' + statusLabel + '</td>';
        html += '<td class="p-2 text-xs text-slate-500">' + adminEsc(lastLogin) + '</td>';
        html += '<td class="p-2 text-right whitespace-nowrap">' + toggleBtn + ' <button onclick="resetEmployeePass(\'' + adminJsArg(e.uid) + '\',\'' + adminJsArg(e.displayName || e.email) + '\')" class="text-blue-600 hover:underline text-xs ml-2">重設密碼</button></td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
      list.innerHTML = html;
    } catch(err) {
      document.getElementById('emp-stat-total').textContent = '—';
      document.getElementById('emp-stat-active').textContent = '—';
      document.getElementById('emp-stat-disabled').textContent = '—';
      list.innerHTML = '<div class="text-center py-6 text-red-500">Firebase 使用者載入失敗：' + adminEsc(err.message) + '</div>';
    }
    return;
  }
  try {
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({
      action: 'listEmployees',
      agent: currentAgent,
      token: adminToken,
      storeKey: currentStoreKey
    })});
    const data = await res.json();
    if (data.status !== 'success') {
      list.innerHTML = '<div class="text-center py-6 text-red-500">' + (data.message || '載入失敗') + '</div>';
      return;
    }
    const emps = data.employees || [];
    const active = emps.filter(e => e.active).length;
    const disabled = emps.length - active;
    document.getElementById('emp-stat-total').textContent = emps.length;
    document.getElementById('emp-stat-active').textContent = active;
    document.getElementById('emp-stat-disabled').textContent = disabled;
    if (emps.length === 0) {
      list.innerHTML = '<div class="text-center py-8 text-slate-400">尚無員工，點上方「+ 新增員工」開始</div>';
      return;
    }
    let html = '<table class="w-full text-sm"><thead><tr class="bg-slate-100 text-slate-600">';
    html += '<th class="p-2 text-left">員工 ID</th><th class="p-2 text-left">門市</th><th class="p-2 text-left">姓名</th><th class="p-2 text-left">角色</th><th class="p-2 text-left">狀態</th><th class="p-2 text-left">最後登入</th><th class="p-2 text-right">操作</th></tr></thead><tbody>';
    emps.forEach(e => {
      const lastLogin = e.lastLogin ? new Date(e.lastLogin).toLocaleString('zh-TW', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—';
      const roleLabel = e.role === 'admin' ? '<span class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">管理者</span>' : '<span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">店員</span>';
      const statusLabel = e.active ? '<span class="text-emerald-600 font-bold">啟用</span>' : '<span class="text-slate-400">已停用</span>';
      const toggleBtn = e.active
        ? '<button onclick="disableEmployee(\'' + e.id + '\',\'' + e.name + '\')" class="text-red-600 hover:underline text-xs">停用</button>'
        : '<button onclick="enableEmployee(\'' + e.id + '\')" class="text-emerald-600 hover:underline text-xs">啟用</button>';
      html += '<tr class="border-b border-slate-100">';
      html += '<td class="p-2 font-mono text-xs">' + e.id + '</td>';
      html += '<td class="p-2">' + e.storeKey + '</td>';
      html += '<td class="p-2 font-bold">' + e.name + '</td>';
      html += '<td class="p-2">' + roleLabel + '</td>';
      html += '<td class="p-2">' + statusLabel + '</td>';
      html += '<td class="p-2 text-xs text-slate-500">' + lastLogin + '</td>';
      html += '<td class="p-2 text-right">' + toggleBtn + ' <button onclick="resetEmployeePass(\'' + e.id + '\',\'' + e.name + '\')" class="text-blue-600 hover:underline text-xs ml-2">重設密碼</button></td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    list.innerHTML = html;
  } catch(err) {
    list.innerHTML = '<div class="text-center py-6 text-red-500">網路錯誤</div>';
  }
}

function filterManageableFirebaseUsers(users) {
  const firebaseRole = localStorage.getItem('admin_firebaseRole') || 'readonly';
  const allowed = getAssignableFirebaseRoles(firebaseRole).map(r => r.value);
  if (!allowed.length) return [];
  return (users || []).filter(u => allowed.indexOf(u.role || 'readonly') >= 0);
}

function openAddEmployeeModal() {
  const emailRow = document.getElementById('emp-email-row');
  if (emailRow) emailRow.classList.toggle('hidden', !useFirebaseAdmin());
  const emailEl = document.getElementById('new-emp-email');
  if (emailEl) emailEl.value = '';
  document.getElementById('new-emp-name').value = '';
  document.getElementById('new-emp-pass').value = '';
  const roleEl = document.getElementById('new-emp-role');
  const storeEl = document.getElementById('new-emp-store');
  if (useFirebaseAdmin()) {
    const firebaseRole = localStorage.getItem('admin_firebaseRole') || 'readonly';
    const roleOptions = getAssignableFirebaseRoles(firebaseRole);
    if (!roleOptions.length) {
      alert('目前角色沒有新增後台使用者的權限');
      return;
    }
    roleEl.innerHTML = roleOptions.map(r => '<option value="' + r.value + '">' + r.label + '</option>').join('');
    roleEl.value = roleOptions[0].value;
    roleEl.onchange = updateEmployeeStoreSelector;
    if (storeEl) storeEl.value = ['head_store_manager', 'store_manager'].indexOf(firebaseRole) >= 0 ? (currentStoreKey || '') : '';
    updateEmployeeStoreSelector();
  } else {
    roleEl.innerHTML = '<option value="staff">店員 (staff)</option><option value="admin">店家管理者 (admin)</option>';
    roleEl.value = 'staff';
    roleEl.onchange = null;
    const storeRow = document.getElementById('emp-store-row');
    if (storeRow) storeRow.classList.add('hidden');
  }
  document.getElementById('emp-err').classList.add('hidden');
  document.getElementById('add-emp-modal').classList.remove('hidden');
}
function closeAddEmployeeModal() { document.getElementById('add-emp-modal').classList.add('hidden'); }

function updateEmployeeStoreSelector() {
  const row = document.getElementById('emp-store-row');
  const storeEl = document.getElementById('new-emp-store');
  const hint = document.getElementById('emp-store-hint');
  const roleEl = document.getElementById('new-emp-role');
  if (!row || !storeEl || !roleEl) return;
  if (!useFirebaseAdmin()) { row.classList.add('hidden'); return; }
  const role = roleEl.value;
  const firebaseRole = localStorage.getItem('admin_firebaseRole') || 'readonly';
  const scopedRoles = ['agent', 'head_store_manager', 'store_manager', 'store_staff', 'accountant', 'readonly'];
  const shouldShow = scopedRoles.indexOf(role) >= 0;
  row.classList.toggle('hidden', !shouldShow);
  if (!shouldShow) {
    storeEl.value = '';
    return;
  }
  if (['head_store_manager', 'store_manager'].indexOf(firebaseRole) >= 0) {
    storeEl.value = currentStoreKey || '';
    storeEl.disabled = true;
    if (hint) hint.textContent = '店長新增帳號會固定綁定自己的店鋪';
  } else {
    storeEl.disabled = false;
    if (hint) hint.textContent = '綁定店鋪後，該帳號只能查看/操作該店鋪資料；不綁定則按角色作全局權限';
  }
}

function getAssignableFirebaseRoles(firebaseRole) {
  const labels = {
    admin: '管理者 (admin)',
    agent: '客服 (agent)',
    head_store_manager: '總店長 (head_store_manager)',
    store_manager: '店長 (store_manager)',
    store_staff: '店員 (store_staff)',
    accountant: '會計 (accountant)',
    readonly: '唯讀 (readonly)'
  };
  const matrix = {
    owner: ['admin', 'agent', 'head_store_manager', 'store_manager', 'store_staff', 'accountant', 'readonly'],
    admin: ['agent', 'head_store_manager', 'store_manager', 'store_staff', 'accountant', 'readonly'],
    head_store_manager: ['store_staff', 'accountant', 'readonly'],
    store_manager: ['store_staff', 'accountant', 'readonly']
  };
  return (matrix[firebaseRole] || []).map(value => ({ value, label: labels[value] || value }));
}

async function submitNewEmployee() {
  const emailEl = document.getElementById('new-emp-email');
  const email = emailEl ? emailEl.value.trim() : '';
  const name = document.getElementById('new-emp-name').value.trim();
  const pass = document.getElementById('new-emp-pass').value;
  const role = document.getElementById('new-emp-role').value;
  const storeEl = document.getElementById('new-emp-store');
  const storeId = useFirebaseAdmin() && storeEl ? (storeEl.value || '').trim() : '';
  const err = document.getElementById('emp-err');
  if (useFirebaseAdmin() && !email) { err.textContent = 'Email 必填'; err.classList.remove('hidden'); return; }
  if (!name || !pass) { err.textContent = '姓名 + 密碼必填'; err.classList.remove('hidden'); return; }
  if (pass.length < 6) { err.textContent = '密碼至少 6 碼'; err.classList.remove('hidden'); return; }
  err.classList.add('hidden');
  const btn = document.getElementById('emp-submit-btn');
  btn.disabled = true; btn.textContent = '處理中...';
  try {
    if (useFirebaseAdmin()) {
      await callFirebaseAdminFunction('/createAdminUser', {
        email,
        password: pass,
        displayName: name,
        role,
        active: true,
        storeId: storeId || null
      });
      toast('已新增 Firebase 使用者 ' + name);
      closeAddEmployeeModal();
      renderEmployees();
      return;
    }
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({
      action: 'addEmployee',
      agent: currentAgent,
      token: adminToken,
      storeKey: currentStoreKey,
      name: name,
      password: pass,
      role: role
    })});
    const data = await res.json();
    if (data.status === 'success') {
      toast('已新增員工 ' + name);
      closeAddEmployeeModal();
      renderEmployees();
    } else {
      err.textContent = data.message || '新增失敗'; err.classList.remove('hidden');
    }
  } catch(e) {
    err.textContent = '網路錯誤'; err.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = '新增';
  }
}

async function disableEmployee(empId, empName) {
  if (!confirm('確定停用員工「' + empName + '」？\n停用後該員工無法登入。')) return;
  try {
    if (useFirebaseAdmin()) {
      await callFirebaseAdminFunction('/setAdminUserActive', { uid: empId, active: false });
      toast('已停用 ' + empName);
      renderEmployees();
      return;
    }
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({
      action: 'disableEmployee', agent: currentAgent, token: adminToken, employeeId: empId
    })});
    const data = await res.json();
    if (data.status === 'success') { toast('已停用 ' + empName); renderEmployees(); }
    else alert(data.message || '操作失敗');
  } catch(e) { alert('網路錯誤'); }
}

async function enableEmployee(empId) {
  try {
    if (useFirebaseAdmin()) {
      await callFirebaseAdminFunction('/setAdminUserActive', { uid: empId, active: true });
      toast('已啟用');
      renderEmployees();
      return;
    }
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({
      action: 'enableEmployee', agent: currentAgent, token: adminToken, employeeId: empId
    })});
    const data = await res.json();
    if (data.status === 'success') { toast('已啟用'); renderEmployees(); }
    else alert(data.message || '操作失敗');
  } catch(e) { alert('網路錯誤'); }
}

async function resetEmployeePass(empId, empName) {
  const newPass = prompt('重設「' + empName + '」的新密碼（至少 6 碼）：');
  if (!newPass) return;
  if (newPass.length < 6) { alert('密碼至少 6 碼'); return; }
  try {
    if (useFirebaseAdmin()) {
      await callFirebaseAdminFunction('/resetAdminUserPassword', { uid: empId, password: newPass });
      toast('密碼已重設');
      renderEmployees();
      return;
    }
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({
      action: 'updateEmployeePassword', agent: currentAgent, token: adminToken, employeeId: empId, password: newPass
    })});
    const data = await res.json();
    if (data.status === 'success') { toast('密碼已重設'); renderEmployees(); }
    else alert(data.message || '操作失敗');
  } catch(e) { alert('網路錯誤'); }
}



// v2.4.41: 員工自助改密碼
function openChangePassword() {
  if (useFirebaseAdmin()) { alert('Firebase 模式下請使用 Authentication 的重設密碼流程。'); return; }
  document.getElementById('cpw-old').value = '';
  document.getElementById('cpw-new').value = '';
  document.getElementById('cpw-new2').value = '';
  document.getElementById('cpw-err').classList.add('hidden');
  document.getElementById('change-pw-modal').classList.remove('hidden');
}
function closeChangePassword() {
  document.getElementById('change-pw-modal').classList.add('hidden');
}
async function submitChangePassword() {
  if (useFirebaseAdmin()) { alert('Firebase 模式下請使用 Authentication 的重設密碼流程。'); return; }
  const oldPw = document.getElementById('cpw-old').value;
  const newPw = document.getElementById('cpw-new').value;
  const newPw2 = document.getElementById('cpw-new2').value;
  const err = document.getElementById('cpw-err');
  if (!oldPw || !newPw) { err.textContent = '請填寫所有欄位'; err.classList.remove('hidden'); return; }
  if (newPw.length < 6) { err.textContent = '新密碼至少 6 碼'; err.classList.remove('hidden'); return; }
  if (newPw !== newPw2) { err.textContent = '兩次新密碼不一致'; err.classList.remove('hidden'); return; }
  if (newPw === oldPw) { err.textContent = '新密碼不能跟舊密碼一樣'; err.classList.remove('hidden'); return; }
  err.classList.add('hidden');
  const btn = document.getElementById('cpw-submit-btn');
  btn.disabled = true; btn.textContent = '處理中...';
  try {
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({
      action: 'changeMyPassword',
      token: adminToken,
      oldPassword: oldPw,
      newPassword: newPw
    })});
    const data = await res.json();
    if (data.status === 'success') {
      toast('密碼已修改');
      closeChangePassword();
    } else {
      err.textContent = data.message || '修改失敗'; err.classList.remove('hidden');
    }
  } catch(e) {
    err.textContent = '網路錯誤'; err.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = '確定修改';
  }
}
