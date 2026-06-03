
const GAS_URL = typeof KIMONO_CONFIG !== 'undefined' ? KIMONO_CONFIG.APPS_SCRIPT_URL : '';
function legacyGasReadonlyEnabled() {
  return !!(typeof KIMONO_CONFIG !== 'undefined' && KIMONO_CONFIG.USE_NEW_API && KIMONO_CONFIG.LEGACY_GAS_READONLY);
}
function getLegacyGasAction(init) {
  try {
    if (!init || !init.body || typeof init.body !== 'string') return '';
    return (JSON.parse(init.body).action || '').toString();
  } catch (_) {
    return '';
  }
}
function isLegacyGasReadAction(action) {
  return [
    'adminGetOrders',
    'getArchiveCheck',
    'getArchivedList',
    'getArchiveOrders',
    'getAuditLog',
    'query',
    'queryOrder',
    'queryByNamePhone',
    'validateCoupon'
  ].includes(action);
}

// ============================================================
// v2.4.23: GAS fetch 防呆 — timeout + cache-bust + 失敗 UI
// 解決：Chrome 對 googleusercontent.com 的 stale cookie 造成
//       fetch 永遠 pending 卡死「載入資料」轉圈圈問題
// ============================================================
(function patchFetchForGAS() {
  const _origFetch = window.fetch.bind(window);
  let __stuckShown = false;
  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url && url.indexOf('script.google.com') !== -1) {
      const action = getLegacyGasAction(init);
      if (legacyGasReadonlyEnabled() && action && !isLegacyGasReadAction(action)) {
        return Promise.reject(new Error('舊 GAS 已切為只讀備份，禁止寫入 action: ' + action));
      }
      // 1) 加 cache-bust 強制每次拿新資料
      const cbUrl = url + (url.indexOf('?') !== -1 ? '&' : '?') + '_cb=' + Date.now();
      // 2) 加 8 秒 timeout，超時自動 abort
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      const newInit = Object.assign({}, init || {}, {
        signal: ctrl.signal,
        cache: 'no-store',
        credentials: 'omit'  // 不送 Google session cookie，避免 redirect loop
      });
      return _origFetch(cbUrl, newInit).then(r => {
        clearTimeout(timer);
        return r;
      }).catch(e => {
        clearTimeout(timer);
        if (e.name === 'AbortError' && !__stuckShown) {
          __stuckShown = true;
          if (typeof showFetchStuckUI === 'function') showFetchStuckUI();
        }
        throw e;
      });
    }
    return _origFetch(input, init);
  };
})();

function showFetchStuckUI() {
  const ov = document.getElementById('loading-overlay');
  if (!ov) return;
  ov.classList.remove('hidden');
  ov.innerHTML = '<div class="text-center bg-white p-8 rounded-2xl shadow-2xl max-w-md mx-4">' +
    '<div class="text-5xl mb-3">⚠️</div>' +
    '<div class="text-lg font-bold text-red-600 mb-2">連線到後台超時</div>' +
    '<div class="text-sm text-slate-600 mb-4 leading-relaxed">通常是 Google cookie 卡住<br>清掉就會立刻好</div>' +
    '<button onclick="clearGoogleCookieAndReload()" class="btn-navy px-6 py-3 rounded-lg w-full mb-2">🔄 清 cookie 並重新整理</button>' +
    '<button onclick="location.reload()" class="px-6 py-2 rounded-lg w-full text-sm border border-slate-300 hover:bg-slate-50">只重新整理（不清 cookie）</button>' +
    '<div class="text-xs text-slate-400 mt-3">無痕模式 (Ctrl+Shift+N) 也可以避開</div>' +
    '</div>';
}

function clearGoogleCookieAndReload() {
  // 清掉所有同源 cookie
  document.cookie.split(';').forEach(function(c) {
    const eq = c.indexOf('=');
    const name = (eq > -1 ? c.substring(0, eq) : c).trim();
    if (!name) return;
    const expire = ';expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    document.cookie = name + '=' + expire;
    document.cookie = name + '=' + expire + ';domain=' + location.hostname;
  });
  alert('Cookie 已清除，按確定後會重整\n如果還是卡住，請改用無痕視窗 (Ctrl+Shift+N)');
  setTimeout(() => location.reload(true), 100);
}
