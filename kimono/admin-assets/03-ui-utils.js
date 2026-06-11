// v2.5: dark mode removed; clear any leftover state
try { document.body.classList.remove('dark'); localStorage.removeItem('admin_dark'); } catch(_){}

function toast(msg, type){
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + (type||'');
  t.innerHTML = (type==='error'?'❌':type==='warning'?'⚠️':'✅') + ' <span>' + msg + '</span>';
  c.appendChild(t);
  setTimeout(()=>{t.style.animation='slideIn .3s ease reverse';setTimeout(()=>t.remove(),300)}, 2800);
}

function showLogin() {
  const ov = document.getElementById('loading-overlay');
  if (ov) ov.classList.add('hidden');
  // v2.5p: 登出時隱藏「?」按鈕
  const tbtn = document.getElementById('tour-btn'); if (tbtn) tbtn.classList.add('hidden');
  const cpwBtn = document.getElementById('change-pw-btn'); if (cpwBtn) cpwBtn.classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('logout-btn').classList.add('hidden');
  document.getElementById('section-tabs').classList.add('hidden');
  document.getElementById('global-search-wrap').style.display = 'none';
  document.getElementById('nav-agent').textContent = '';
  if (useFirebaseAdmin() && window.firebase && firebase.apps.length && firebase.auth().currentUser) {
    firebase.auth().signOut().catch(()=>{});
  }
  currentAgent = ''; adminToken = ''; currentRole = 'agent'; currentStoreKey = ''; currentFirebaseUid = '';
  localStorage.removeItem('admin_agent');
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_role');
  localStorage.removeItem('admin_firebaseRole');
  localStorage.removeItem('admin_storeKey');
  localStorage.removeItem('admin_uid');
}

async function doLogin() {
  const name = document.getElementById('login-name').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err = document.getElementById('login-err');
  if (!name || !pass) { err.textContent=useFirebaseAdmin() ? '請填入 Email 與密碼' : '請填入姓名與密碼'; err.classList.remove('hidden'); return; }
  err.classList.add('hidden');
  try {
    if (useFirebaseAdmin()) {
      const data = await firebaseSignInAdmin(name, pass);
      localStorage.removeItem('admin_employeeId');
      localStorage.removeItem('admin_isStoreAdmin');
      currentFirebaseUid = data.user.uid;
      localStorage.setItem('admin_uid', currentFirebaseUid);
      localStorage.setItem('admin_firebaseRole', data.firebaseRole || 'readonly');
      enterDashboard(data.displayName, data.token, data.role, data.storeKey);
      return;
    }
    // v2.4.41: 自動偵測員工子帳號登入。格式：storeKey/姓名 或 storeKey.姓名
    let payload;
    const sep = name.match(/[./]/);
    if (sep) {
      const [storeKey, empName] = name.split(/[./]/, 2);
      payload = { action:'employeeLogin', storeKey: storeKey.trim().toLowerCase(), name: empName.trim(), password: pass };
    } else {
      payload = { action:'adminLogin', name:name, password:pass };
    }
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    if (data && data.status === 'success' && data.token) {
      // v2.4.41: 員工登入回傳 employeeId 跟 isAdmin 旗標
      if (data.employeeId) {
        localStorage.setItem('admin_employeeId', data.employeeId);
        localStorage.setItem('admin_isStoreAdmin', data.isAdmin ? '1' : '');
      } else {
        localStorage.removeItem('admin_employeeId');
        localStorage.removeItem('admin_isStoreAdmin');
      }
      enterDashboard(data.agent || data.storeName || name, data.token, data.role || 'agent', data.storeKey || '');
    } else {
      err.textContent = (data && data.message) || '密碼錯誤，請再試一次';
      err.classList.remove('hidden');
    }
  } catch (e) {
    err.textContent = e && e.message ? e.message : '無法連線到伺服器，請稍後再試';
    err.classList.remove('hidden');
  }
}

function enterDashboard(name, token, role, storeKey) {
  currentAgent = name;
  adminToken = token || '';
  currentRole = role || 'agent';
  currentStoreKey = storeKey || '';
  localStorage.setItem('admin_agent', name);
  if (adminToken) localStorage.setItem('admin_token', adminToken);
  localStorage.setItem('admin_role', currentRole);
  if (currentStoreKey) localStorage.setItem('admin_storeKey', currentStoreKey); else localStorage.removeItem('admin_storeKey');
  document.getElementById('login-err').classList.add('hidden');
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('logout-btn').classList.remove('hidden');
  // v2.5p: 登入後才顯示「?」訓練教室按鈕
  const tbtn = document.getElementById('tour-btn'); if (tbtn) tbtn.classList.remove('hidden');
  // v2.4.41: 員工帳號才顯示改密碼按鈕
  const cpwBtn = document.getElementById('change-pw-btn');
  if (cpwBtn) {
    if (localStorage.getItem('admin_employeeId')) cpwBtn.classList.remove('hidden');
    else cpwBtn.classList.add('hidden');
  }
  document.getElementById('section-tabs').classList.remove('hidden');
  document.getElementById('global-search-wrap').style.display = '';
  // Visible role badge in nav
  const roleEmoji = currentRole === 'store' ? '🏪' : '👤';
  const roleSuffix = currentRole === 'store' ? ' (店家)' : '';
  document.getElementById('nav-agent').textContent = roleEmoji + ' ' + name + roleSuffix;
  applyRolePermissions();   // v2.5: hide/show UI based on role
  loadOrders();
  // v2.5: 登入後重新載入天氣，依角色 (agent 全部 / store 自家城市) 抓對的城市
  // v2.5n: setTimeout 包起來避免 IIFE 自動登入時 TDZ error (KIMONO_WX_ALL_CITIES 尚未初始化)
  setTimeout(() => { if (typeof loadWeather === 'function') loadWeather(true); }, 100);
  // v2.5: 首次登入自動跳教學
  if (typeof maybeAutoStartTour === 'function') maybeAutoStartTour();
}


// v2.5: 判斷一筆訂單是否屬於某店家
function orderBelongsToStore(o, storeKey) {
  if (!storeKey) return false;
  const sk = String(storeKey).toLowerCase();
  // v2.4.42e: 直接比對 o.storeKey (客人自助下單時走這欄)
  if (String(o.storeKey || '').toLowerCase() === sk) return true;
  const plat = String(o.platform || '').toLowerCase();
  const src = String(o.source || '').toLowerCase();
  const intro = String(o.introducer || '').toLowerCase();
  // v2.4.29: 嚴格只比對自家店家代號
  // 1) Walk-in 訂單：platform = 'walk-in@<storeKey>'，必須完全對上自家
  if (plat === 'walk-in@' + sk) return true;
  if (src === 'walk-in@' + sk) return true;
  if (intro === 'walk-in@' + sk) return true;
  // 2) Pre-order：source 或 introducer 含自家 storeKey 關鍵字
  if (src.indexOf(sk) >= 0) return true;
  if (intro.indexOf(sk) >= 0) return true;
  return false;
}

function filterOrdersForRole(list) {
  if (currentRole !== 'store') return list;
  const firebaseRole = localStorage.getItem('admin_firebaseRole') || '';
  if (firebaseRole === 'head_store_manager') return list.filter(isConfirmedOrderForStore);
  if (!currentStoreKey) return [];
  return list.filter(o => orderBelongsToStore(o, currentStoreKey) && isConfirmedOrderForStore(o));
}

function isConfirmedOrderForStore(order) {
  const status = String(order.status || '').toLowerCase();
  if (['confirmed', 'checked_in', 'completed', 'balance_due', 'refund_requested', 'refunding', 'refunded'].indexOf(status) >= 0) {
    return true;
  }
  return order.confirmed === true || order.confirmed === 'true' || order.confirmed === 'TRUE';
}

// v2.5: 依角色控制 UI 顯示
function applyRolePermissions() {
  // v2.4.20: 只有 Jun 看得到關帳按鈕（用 classList 切，不是 style.display）
  const closeBtn = document.getElementById('close-month-btn');
  if (closeBtn) {
    if (currentAgent === 'Jun') closeBtn.classList.remove('hidden');
    else closeBtn.classList.add('hidden');
  }
  // 解凍按鈕只在歷史明細展開時才顯示，這裡先確保預設隱藏
  const unlockBtn = document.getElementById('unlock-month-btn');
  if (unlockBtn) unlockBtn.classList.add('hidden');

  const isStore = currentRole === 'store';
  const firebaseRole = localStorage.getItem('admin_firebaseRole') || '';
  const isStoreManager = useFirebaseAdmin() && ['head_store_manager', 'store_manager'].indexOf(firebaseRole) >= 0;
  const checkinTab = document.querySelector('[data-sec="checkin"]');
  const checkinSection = document.getElementById('sec-checkin');
  if (checkinTab) checkinTab.style.display = 'none';
  if (checkinSection) checkinSection.style.display = 'none';
  document.querySelectorAll('[data-confirmation-ui="1"]').forEach(el => {
    el.style.display = isStore ? 'none' : '';
  });
  document.querySelectorAll('[data-store-hidden="1"]').forEach(el => {
    el.style.display = isStore ? 'none' : '';
  });
  document.querySelectorAll('[data-store-edit-field="1"]').forEach(el => {
    el.style.display = isStore ? 'none' : '';
  });
  document.querySelectorAll('[data-store-display-field="1"]').forEach(el => {
    el.style.display = isStore ? 'flex' : 'none';
  });
  document.querySelectorAll('[data-store-only="1"]').forEach(el => {
    el.style.display = isStore ? 'block' : 'none';
  });
  if (isStore && ['pending', 'confirmed', 'refund', 'duebalance', 'anomaly'].indexOf(currentFilter) >= 0) {
    currentFilter = 'all';
    document.querySelectorAll('#sec-orders .tab-btn').forEach(btn => btn.classList.remove('active'));
    const allOrdersTab = document.querySelector('#sec-orders .tab-btn[data-order-filter="all"]');
    if (allOrdersTab) allOrdersTab.classList.add('active');
  }
  // Finance, archive, and permission management are platform-only.
  // Store staff also keep the lighter daily-operation surface.
  const storeHiddenSections = isStore
    ? ['finance', 'archive', 'permissions'].concat(isStoreManager ? [] : ['customers', 'reconcile'])
    : [];
  ['customers', 'finance', 'reconcile', 'archive', 'permissions'].forEach(sec => {
    const tab = document.querySelector('[data-sec="' + sec + '"]');
    if (tab) tab.style.display = storeHiddenSections.indexOf(sec) >= 0 ? 'none' : '';
  });
  // v2.4.21: Jun-only tabs (e.g. 操作紀錄)
  document.querySelectorAll('[data-jun-only="1"]').forEach(tab => {
    tab.style.display = (currentAgent === 'Jun') ? '' : 'none';
  });
  // 全站搜尋只給客服
  const gs = document.getElementById('global-search-wrap');
  if (gs) gs.style.display = isStore ? 'none' : '';
  // If store currently sits on a hidden section, kick to dashboard
  if (storeHiddenSections.indexOf(currentSection) >= 0) {
    const dashTab = document.querySelector('[data-sec="dashboard"]');
    if (dashTab && typeof switchSection === 'function') switchSection('dashboard', dashTab);
  }
  // v2.5g: 整合 Walk-in FAB 切換進原函數 (修 lexical scope 找不到 wrapper 的 bug)
  if (isStore) {
    if (typeof showWalkInFab === 'function') showWalkInFab();
  } else {
    if (typeof hideWalkInFab === 'function') hideWalkInFab();
  }
  // v2.4.41: 員工管理 tab 限店家管理者 + Jun 看
  const empTab = document.querySelector('.nav-tab[data-sec="employees"]');
  if (empTab) {
    const canManageFirebaseUsers = useFirebaseAdmin() && (
      ['owner', 'admin'].indexOf(firebaseRole) >= 0 ||
      (['head_store_manager', 'store_manager'].indexOf(firebaseRole) >= 0 && !!currentStoreKey)
    );
    const isStoreAdmin = isStore && (localStorage.getItem('admin_isStoreAdmin') === '1' || !localStorage.getItem('admin_employeeId'));
    empTab.style.display = (canManageFirebaseUsers || (!useFirebaseAdmin() && isStoreAdmin)) ? '' : 'none';
  }
  const storesTab = document.querySelector('.nav-tab[data-sec="stores"]');
  if (storesTab) {
    const canManageStores = ['owner', 'admin'].indexOf(firebaseRole) >= 0 ||
      firebaseRole === 'head_store_manager' ||
      (firebaseRole === 'store_manager' && !!currentStoreKey);
    storesTab.style.display = useFirebaseAdmin() && canManageStores ? '' : 'none';
  }
}

(function() {
  if (useFirebaseAdmin()) {
    try {
      const loginScreen = document.getElementById('login-screen');
      const ov = document.getElementById('loading-overlay');
      const msg = document.getElementById('loading-msg');
      const detail = document.getElementById('loading-detail');
      if (loginScreen) loginScreen.classList.add('hidden');
      if (msg) msg.textContent = '正在確認登入狀態…';
      if (detail) detail.textContent = '請稍等，系統會直接載入目前帳號';
      if (ov) ov.classList.remove('hidden');
      ensureFirebaseAdminApp();
      firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) { showLogin(); return; }
        try {
          const token = await user.getIdToken();
          const profile = await getFirebaseUserProfile(user.uid, token);
          currentFirebaseUid = user.uid;
          localStorage.setItem('admin_uid', currentFirebaseUid);
          localStorage.setItem('admin_firebaseRole', profile.role || 'readonly');
          enterDashboard(profile.displayName || user.displayName || user.email || 'Admin', token, firebaseRoleToAdminRole(profile.role), profile.storeId || profile.storeKey || '');
        } catch (e) {
          console.warn('[Firebase Auth] auto login failed', e);
          showLogin();
        }
      });
    } catch (e) {
      const err = document.getElementById('login-err');
      if (err) {
        err.textContent = e && e.message ? e.message : 'Firebase Auth 初始化失敗';
        err.classList.remove('hidden');
      }
    }
    return;
  }
  const savedName = localStorage.getItem('admin_agent');
  const savedToken = localStorage.getItem('admin_token');
  const savedRole = localStorage.getItem('admin_role') || 'agent';
  const savedStoreKey = localStorage.getItem('admin_storeKey') || '';
  if (savedName && savedToken) enterDashboard(savedName, savedToken, savedRole, savedStoreKey);
})();

// v2.4.20: 防 Chrome autofill 終極招 — readonly + onfocus 解除 + 多次清空
window.addEventListener('load', () => {
  ['global-search','f-search','cust-search'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    // 1) readonly trick — Chrome 不會 autofill readonly 欄位
    el.setAttribute('readonly', 'readonly');
    el.addEventListener('focus', () => el.removeAttribute('readonly'));
    el.addEventListener('blur', () => {
      if (!el.value) el.setAttribute('readonly', 'readonly');
    });
    // 2) 多次 setTimeout 清空 (攻防 Chrome 的非同步 autofill)
    [50, 200, 500, 1000, 2000].forEach(ms => {
      setTimeout(() => {
        if (el.value && (el.value.length < 8 || el.value === currentAgent)) {
          el.value = '';
        }
      }, ms);
    });
  });
});

function switchSection(sec, el){
  currentSection = sec;
  // v2.4.20: 記住當前分頁，重整後恢復
  try { localStorage.setItem('admin_lastSection', sec); } catch(e){}
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.getElementById('sec-'+sec).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  if(el) el.classList.add('active');
  // 沒提供 el 時，自動 active 對應 nav-tab
  if(!el) {
    const tab = document.querySelector('.nav-tab[data-sec="'+sec+'"]');
    if(tab) tab.classList.add('active');
  }
  if(sec==='dashboard') renderDashboard();
  else if(sec==='calendar') renderCalendar();
  else if(sec==='customers') renderCustomers();
  else if(sec==='finance') renderFinance();
  else if(sec==='reconcile') {
    // v2.4.20: 每次進對帳都重建月份下拉
    const sel = document.getElementById('recon-month');
    if (sel) sel.innerHTML = '';
    initReconMonths();
    renderReconcile();
  }
  else if(sec==='walkin' && typeof renderWalkinMonth==='function') { if(typeof buildWalkinMonthSelect==='function') buildWalkinMonthSelect(); renderWalkinMonth(); }
  else if(sec==='orders' && typeof filterOrders==='function') filterOrders();
  else if(sec==='checkin' && typeof renderCheckIn==='function') renderCheckIn();
  else if(sec==='employees' && typeof renderEmployees==='function') renderEmployees();
  else if(sec==='stores' && typeof loadStoreSchedules==='function') loadStoreSchedules();
  else if(sec==='archive' && typeof loadArchivedList==='function') loadArchivedList();
  else if(sec==='permissions' && typeof renderPermissions==='function') renderPermissions();
}

function renderLoadedOrders(options) {
  options = options || {};
  populateFilters();
  const skipDashboard = options.skipDashboard && currentSection !== 'dashboard';
  if (skipDashboard) {
    const tabCount = document.getElementById('tab-count-orders');
    if (tabCount) tabCount.textContent = allOrders.length;
  } else if (typeof renderDashboard === 'function') {
    renderDashboard();
  }
  if (!(options.skipOrdersRender && currentSection !== 'orders') && typeof filterOrders === 'function') {
    filterOrders();
  }
  // 首次 load 後恢復上次 section（不是 dashboard 才切）
  if (!window.__sectionRestored) {
    window.__sectionRestored = true;
    const last = localStorage.getItem('admin_lastSection');
    const tab = last ? document.querySelector('.nav-tab[data-sec="'+last+'"]') : null;
    if (last && last !== 'dashboard' && last !== 'checkin' && document.getElementById('sec-'+last) && tab && tab.style.display !== 'none') {
      switchSection(last, tab);
    }
  } else {
    // 後續 reload 後重 render 當前 section（保證資料最新）
    if(currentSection==='reconcile' && typeof renderReconcile==='function') renderReconcile();
    else if(currentSection==='customers' && typeof renderCustomers==='function') renderCustomers();
    else if(currentSection==='finance' && typeof renderFinance==='function') renderFinance();
    else if(currentSection==='walkin' && typeof renderWalkinMonth==='function') renderWalkinMonth();
    else if(currentSection==='calendar' && typeof renderCalendar==='function') renderCalendar();
    else if(currentSection==='checkin' && typeof renderCheckIn==='function') renderCheckIn();
    else if(currentSection==='employees' && typeof renderEmployees==='function') renderEmployees();
    else if(currentSection==='stores' && typeof loadStoreSchedules==='function') loadStoreSchedules();
    else if(currentSection==='archive' && typeof loadArchivedList==='function') loadArchivedList();
    else if(currentSection==='permissions' && typeof renderPermissions==='function') renderPermissions();
  }
}

function loadOrders(options) {
  options = options || {};
  window.__loadStart = Date.now();
  // v2.4.20: 首次載入時顯示全頁 loading overlay
  if (!window.__firstLoadDone && !options.manual) {
    const ov = document.getElementById('loading-overlay');
    if (ov) ov.classList.remove('hidden');
  }
  document.getElementById('orders-loading').classList.remove('hidden');
  if (!options.keepCurrentList) document.getElementById('orders-list').innerHTML = '';
  document.getElementById('orders-empty').classList.add('hidden');
  // v2.4.23: 保險絲 — 不論結果如何 12 秒後一定關閉 overlay
  setTimeout(() => {
    const ov = document.getElementById('loading-overlay');
    if (ov && !ov.classList.contains('hidden')) {
      ov.classList.add('hidden');
      window.__firstLoadDone = true;
    }
  }, 12000);
  if (useFirebaseAdmin()) {
    return loadOrdersFromFirestore(options);
  }
  return fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action:'adminGetOrders', filter:'all', search:'', token:adminToken, agent:currentAgent }) })
    .then(r => r.json())
    .then(data => {
      document.getElementById('orders-loading').classList.add('hidden');
      if (data.status === 'unauthorized') { showLogin(); return { status:'unauthorized' }; }
      if (data.status === 'success' || data.status === 'ok') {
        const elapsed = Date.now() - (window.__loadStart || Date.now());
        console.log('[載入] ✅ 完成，耗時 ' + elapsed + 'ms (' + (data.orders||[]).length + ' 筆)');
        if (elapsed > 5000) toast('⚠ 載入很慢: ' + Math.round(elapsed/1000) + ' 秒', 'warning');
        allOrders = filterOrdersForRole(data.orders || []);
        // v2.4.20: 順便撈一次歷史月份清單（讓對帳下拉能合併顯示）
        if (typeof loadArchivedList === 'function' && !window.__archivedMonthsListLoaded) {
          window.__archivedMonthsListLoaded = true;
          fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action:'getArchivedList', token:adminToken }) })
            .then(r=>r.json()).then(d=>{ if(d.status==='ok') window.__archivedMonthsList = (d.months||[]).map(m => normMonth(m.month)); })
            .catch(()=>{});
        }
        renderLoadedOrders(options);
        // v2.4.20: 關閉首次載入 overlay
        const ov = document.getElementById('loading-overlay');
        if (ov && !window.__firstLoadDone) {
          ov.classList.add('hidden');
          window.__firstLoadDone = true;
        }
        // v2.4.20: 若是儲存後重撈，捲到該訂單 + 閃綠
        if (window.__highlightAfterLoad) {
          const targetId = window.__highlightAfterLoad;
          window.__highlightAfterLoad = null;
          setTimeout(() => {
            const all = document.querySelectorAll('[onclick*="openEdit"], [data-order-id]');
            let target = null;
            for (const el of all) {
              const oc = el.getAttribute('onclick') || '';
              const did = el.getAttribute('data-order-id') || '';
              if ((oc && oc.indexOf(targetId) >= 0) || did === targetId) { target = el; break; }
            }
            // v2.4.20: 從重撈的 allOrders 找出該筆，比對訂金真的有變才報「成功」
            const updated = allOrders.find(o => (o.orderId||'').trim() === targetId);
            const newDeposit = updated ? Number(updated.deposit||0) : null;
            if (target) {
              target.scrollIntoView({behavior:'smooth', block:'center'});
              target.style.transition = 'background 0.4s ease';
              target.style.background = '#D1FAE5';
              setTimeout(() => { target.style.background = ''; }, 2500);
              if (updated) toast('已更新 ' + targetId + '（訂金 ¥' + newDeposit.toLocaleString() + '）', 'success');
              else toast('已重新載入（找不到該筆）', 'warning');
            } else {
              if (updated) toast('已更新 ' + targetId + '（訂金 ¥' + newDeposit.toLocaleString() + '）— 該筆不在目前篩選範圍', 'info');
              else toast('已重新載入但找不到該筆 — 可能 GAS 寫入失敗', 'warning');
            }
          }, 400);
        }
        return data;
      } else {
        if (options.keepCurrentList && typeof toast === 'function') toast(data.message || '載入失敗', 'error');
        else showErr(data.message || '載入失敗');
        return { status:'error', message:data.message || '載入失敗' };
      }
    })
    .catch(e => {
      document.getElementById('orders-loading').classList.add('hidden');
      // v2.4.23: catch 也要關 overlay
      const ov = document.getElementById('loading-overlay');
      if (ov) ov.classList.add('hidden');
      window.__firstLoadDone = true;
      if (options.keepCurrentList && typeof toast === 'function') toast('連線失敗: ' + e.message, 'error');
      else showErr('連線失敗: ' + e.message);
      return { status:'error', message:e.message };
	    });
}

async function loadOrdersFromFirestore(options) {
  options = options || {};
  try {
    const data = await callFirebaseAdminFunction('/listOrders?limit=500', null, { method: 'GET' });
    document.getElementById('orders-loading').classList.add('hidden');
    allOrders = filterOrdersForRole(data.orders || []);
    renderLoadedOrders(options);
    const ov = document.getElementById('loading-overlay');
    if (ov && !window.__firstLoadDone) {
      ov.classList.add('hidden');
      window.__firstLoadDone = true;
    }
    return data;
  } catch (e) {
    document.getElementById('orders-loading').classList.add('hidden');
    const ov = document.getElementById('loading-overlay');
    if (ov) ov.classList.add('hidden');
    toast((e && e.message) || 'Firestore 載入失敗', 'error');
    return { status:'error', message:(e && e.message) || 'Firestore 載入失敗' };
  }
}

function showErr(msg) {
  document.getElementById('orders-list').innerHTML = '<div class="text-center py-10 text-red-600 font-semibold"><div class="text-2xl mb-2">⚠️</div>' + msg + '</div>';
}

// v2.4.42g: robust bookingDate parser - handles 上午/下午 + ISO + slash formats
function parseBookingDate(s){
  if(!s) return null;
  const str = String(s);
  // Chinese 12h: 2026/06/30 上午 10:00 or 2026-05-15 下午1:30
  const m = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s*(上午|下午|中午)?\s*(\d{1,2}):(\d{2})/);
  if(m){
    let h = parseInt(m[5]);
    if(m[4]==='下午' && h<12) h+=12;
    if(m[4]==='上午' && h===12) h=0;
    return new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]), h, parseInt(m[6]));
  }
  // Date-only: 2026/6/27 or 2026-05-15
  const md = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if(md) return new Date(parseInt(md[1]), parseInt(md[2])-1, parseInt(md[3]));
  // Fallback to native parser
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

function fmtBookingDateTime(s){
  // Customer chose date+time at submit; bookingDate may be 'YYYY/M/D 上午H:MM' or ISO
  if(!s) return '—';
  const str = String(s);
  // Try the chinese 12h format first: 2026/05/10 上午10:00
  let m = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s*(上午|下午|中午)?\s*(\d{1,2}):(\d{2})/);
  if(m){
    let h = parseInt(m[5]);
    if(m[4]==='下午' && h<12) h+=12;
    if(m[4]==='上午' && h===12) h=0;
    const dt = new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]), h, parseInt(m[6]));
    if(!isNaN(dt)){
      const wk = ['日','一','二','三','四','五','六'][dt.getDay()];
      return (dt.getMonth()+1)+'/'+dt.getDate()+' ('+wk+') '+String(h).padStart(2,'0')+':'+m[6];
    }
  }
  // Fallback to date-only
  const d = new Date(str);
  if(!isNaN(d)){
    const wk = ['日','一','二','三','四','五','六'][d.getDay()];
    const time = (d.getHours()||d.getMinutes()) ? ' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') : '';
    return (d.getMonth()+1)+'/'+d.getDate()+' ('+wk+')'+time;
  }
  return str.slice(0,16);
}

// v2.5: 格式化日期成 JST 顯示（Asia/Tokyo, GMT+9）
function fmtJST(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return String(s).slice(0, 16);
  // Convert to JST: UTC + 9 hours
  const jstMs = d.getTime() + (9 * 60 + d.getTimezoneOffset()) * 60 * 1000;
  const jst = new Date(jstMs);
  const m = String(jst.getMonth() + 1).padStart(2, '0');
  const dd = String(jst.getDate()).padStart(2, '0');
  const hh = String(jst.getHours()).padStart(2, '0');
  const mm = String(jst.getMinutes()).padStart(2, '0');
  return jst.getFullYear() + '/' + m + '/' + dd + ' ' + hh + ':' + mm + ' (JST)';
}

function fmtDateTime(s){
  if(!s) return '';
  if(typeof s === 'string') {
    const m = s.match(/^(\d{4})[/\-](\d{2})[/\-](\d{2})[\sT](\d{2}):(\d{2})/);
    if(m) return m[2]+'/'+m[3]+' '+m[4]+':'+m[5];
  }
  const d=new Date(s);
  if(isNaN(d)) return String(s).slice(0,16);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const jst = new Date(utc + 9 * 3600000);
  return String(jst.getMonth()+1).padStart(2,'0')+'/'+String(jst.getDate()).padStart(2,'0')+' '+String(jst.getHours()).padStart(2,'0')+':'+String(jst.getMinutes()).padStart(2,'0');
}
function fmtY(n){ n = Number(n)||0; return n ? '¥'+n.toLocaleString() : '—'; }
function fmtY0(n){ n = Number(n)||0; return '¥'+n.toLocaleString(); }
function formatGuestCount(o) {
  if (!o) return '—';
  const hasBreakdown = o.maleAdults !== null && o.maleAdults !== undefined
    || o.femaleAdults !== null && o.femaleAdults !== undefined;
  if (hasBreakdown) {
    const maleAdults = Number(o.maleAdults || 0);
    const femaleAdults = Number(o.femaleAdults || 0);
    const children = Number(o.children || 0);
    return (maleAdults > 0 ? maleAdults + '男' : '')
      + (femaleAdults > 0 ? femaleAdults + '女' : '')
      + (children > 0 ? children + '小' : '')
      || '0人';
  }
  const adultsRaw = o.adults;
  const childrenRaw = o.children;
  const adults = Number(adultsRaw || 0);
  const children = Number(childrenRaw || 0);
  if (adults > 0 || children > 0) {
    return (adults > 0 ? adults + '大' : '') + (children > 0 ? children + '小' : '');
  }
  const pax = String(o.pax || '').trim();
  if (!pax) return '—';
  if (/[大小]/.test(pax)) return pax;
  const n = Number(pax);
  return n > 0 ? n + '大' : pax;
}
function fmtDate(s){
  if(!s) return '—';
  // v2.4.20: 字串原樣判斷優先（避免 timezone bug）
  if(typeof s === 'string') {
    const m = s.match(/^(\d{4})[/\-](\d{2})[/\-](\d{2})/);
    if(m) return m[1]+'/'+m[2]+'/'+m[3];
  }
  const d = new Date(s);
  if(isNaN(d)) return String(s);
  // 強制 JST
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const jst = new Date(utc + 9 * 3600000);
  return jst.getFullYear()+'/'+String(jst.getMonth()+1).padStart(2,'0')+'/'+String(jst.getDate()).padStart(2,'0');
}
