/**
 * ============================================================
 *  旅乘 x 和服 — GAS 後端追加程式碼 (gas-additions.gs)
 * ------------------------------------------------------------
 *  本檔需貼進 Apps Script Editor 既有的 Code.gs 內。
 *  新增兩個 action：
 *    1. adminLogin   — 對「系統設定」key/value 分頁驗證客服密碼
 *    2. uploadImage  — 後端代理上傳到 imgbb，前端不再帶 key
 *
 *  並提供 verifyAdminToken 給 adminGetOrders / adminUpdate 使用。
 * ============================================================
 *
 *  ── 安裝步驟 ───────────────────────────────────────────────
 *  1) Sheets 內已存在的「系統設定」分頁是 key/value 結構：
 *
 *       A 欄: 設定項目              B 欄: 設定值
 *       匯率                       0.22
 *       店家密碼_kyoto1            京都清水寺店
 *       客服_1                     Jun
 *       客服密碼_Jun               <隨機密碼>      ← 客服密碼用這個 key 命名
 *       客服密碼_Ren               <隨機密碼>
 *       客服密碼_Amy               <隨機密碼>
 *
 *  2) Apps Script Editor → 左下「⚙ 專案設定」→ 指令碼屬性
 *       新增屬性：
 *         IMGBB_KEY       = fc071a07584cffd920bd85321439cc6b  (或新申請)
 *         ADMIN_TOKEN_TTL = 28800   (秒；預設 8 小時)
 *
 *  3) 把本檔內容整段貼進你的 Code.gs 結尾。
 *     在 doPost(e) 的 switch / if 裡加入兩個新分支：
 *
 *        if (action === 'adminLogin')  return jsonOut(adminLogin(payload));
 *        if (action === 'uploadImage') return jsonOut(uploadImage(payload));
 *
 *     並在 adminGetOrders / adminUpdate 開頭加：
 *
 *        var auth = verifyAdminToken(payload);
 *        if (!auth.ok) return jsonOut({ status:'unauthorized', message:'請重新登入' });
 *
 *  4) 重新部署 Web App（部署 → 管理部署作業 → 編輯 → 版本：新版本 → 部署）。
 *     URL 不會變（同一個 deploy ID），不需改 config.js。
 *
 *  ── 維護 ───────────────────────────────────────────────────
 *  • 改密碼  ：到 系統設定 sheet，找 客服密碼_<name>，改 B 欄即可
 *  • 加客服  ：在 系統設定 sheet 加一行 客服密碼_<新姓名> | <密碼>
 *  • 停用客服：把該行的密碼欄清空，或刪掉整行
 *  • 換 imgbb key：改 Script Properties 的 IMGBB_KEY，立即生效
 * ============================================================
 */


// ── 0. 讀取 系統設定 為 key/value Map（含 cache 5 秒）──────
var __SETTINGS_CACHE = { ts: 0, map: null };
function getSettings_() {
  if (__SETTINGS_CACHE.map && (Date.now() - __SETTINGS_CACHE.ts) < 5000) {
    return __SETTINGS_CACHE.map;
  }
  var sheet = SpreadsheetApp.getActive().getSheetByName('系統設定');
  if (!sheet) return {};
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  var map = {};
  for (var i = 0; i < values.length; i++) {
    var k = (values[i][0] || '').toString().trim();
    var v = values[i][1];
    if (k) map[k] = v;
  }
  __SETTINGS_CACHE = { ts: Date.now(), map: map };
  return map;
}


// ── 1. 客服登入 ──────────────────────────────────────────────
function adminLogin(payload) {
  var name = (payload.name || '').toString().trim();
  var pass = (payload.password || '').toString();
  if (!name || !pass) return { status: 'error', message: '請填入姓名與密碼' };

  var settings = getSettings_();
  var stored = settings['客服密碼_' + name];

  if (stored === undefined || stored === null || stored === '') {
    return { status: 'error', message: '查無此客服姓名' };
  }
  if (stored.toString() !== pass) {
    return { status: 'error', message: '密碼錯誤，請再試一次' };
  }

  var token = issueAdminToken(name);
  return { status: 'success', agent: name, token: token };
}


// ── 2. Token 發行 / 驗證 ─────────────────────────────────────
function issueAdminToken(name) {
  var props = PropertiesService.getScriptProperties();
  var ttl   = parseInt(props.getProperty('ADMIN_TOKEN_TTL') || '28800', 10);

  var bytes = [];
  for (var i = 0; i < 16; i++) bytes.push(Math.floor(Math.random() * 256));
  var token = bytes.map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');

  var rec = JSON.stringify({ name: name, exp: Date.now() + ttl * 1000 });
  props.setProperty('ADM_' + token, rec);
  return token;
}

function verifyAdminToken(payload) {
  var token = (payload.token || '').toString();
  if (!token) return { ok: false };

  var props = PropertiesService.getScriptProperties();
  var raw   = props.getProperty('ADM_' + token);
  if (!raw) return { ok: false };

  var rec;
  try { rec = JSON.parse(raw); } catch (e) { return { ok: false }; }

  if (!rec.exp || Date.now() > rec.exp) {
    props.deleteProperty('ADM_' + token);
    return { ok: false };
  }
  return { ok: true, name: rec.name };
}


// ── 3. 圖片上傳代理（imgbb）──────────────────────────────────
function uploadImage(payload) {
  var base64 = (payload.image || '').toString();
  if (!base64) return { status: 'error', message: '沒有收到圖片' };

  // base64 約 1.37 倍原始大小，限制 ~7MB base64 ≈ 5MB 原檔
  if (base64.length > 7 * 1024 * 1024) {
    return { status: 'error', message: '檔案過大（超過 5MB）' };
  }

  var key = PropertiesService.getScriptProperties().getProperty('IMGBB_KEY');
  if (!key) return { status: 'error', message: '伺服器尚未設定 IMGBB_KEY' };

  try {
    var res = UrlFetchApp.fetch('https://api.imgbb.com/1/upload?key=' + encodeURIComponent(key), {
      method: 'post',
      payload: { image: base64 },
      muteHttpExceptions: true
    });
    var data = JSON.parse(res.getContentText());
    if (data && data.success && data.data && data.data.url) {
      return { status: 'success', url: data.data.url, deleteUrl: data.data.delete_url || '' };
    }
    return { status: 'error', message: (data && data.error && data.error.message) || '上傳失敗' };
  } catch (e) {
    return { status: 'error', message: 'imgbb 連線失敗：' + e.message };
  }
}


// ── 4. 在 adminGetOrders / adminUpdate 開頭該怎麼接 ──────────
// 範例（請依你現有寫法套用）：
//
//   function adminGetOrders(payload) {
//     var auth = verifyAdminToken(payload);
//     if (!auth.ok) return { status: 'unauthorized', message: '請重新登入' };
//     // ...原本邏輯
//   }
//
//   function adminUpdate(payload) {
//     var auth = verifyAdminToken(payload);
//     if (!auth.ok) return { status: 'unauthorized', message: '請重新登入' };
//     payload.agent = payload.agent || auth.name;  // 防止改別人名字
//     // ...原本邏輯
//   }
