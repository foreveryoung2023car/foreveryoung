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


/**
 * ============================================================
 *  5. v2.6 資料不丟失改造：createBooking / PATCH / 冪等
 * ------------------------------------------------------------
 *  前端現在會：
 *    - 下單送 action: createBooking + clientRequestId
 *    - 後台更新送 updateMode: patch + fields
 *    - 退款 / 報到送 clientRequestId
 *
 *  你需要在既有 Code.gs 裡做三個接線：
 *
 *    A) doPost(e) 解析 payload 後：
 *       if (payload.action === 'createBooking') return jsonOut(createBookingV2(payload));
 *
 *    B) adminUpdate(payload) 一開始：
 *       if (payload.updateMode === 'patch') return jsonOut(updateOrderPatchV2(payload));
 *
 *    C) refund / checkInOrder 這類流程動作開始時：
 *       var cached = getIdempotentResult_(payload.clientRequestId);
 *       if (cached) return cached;
 *       // 寫入成功後：
 *       return rememberIdempotentResult_(payload.clientRequestId, result);
 *
 *  注意：這段是輔助工具，不會自動取代你原本 Code.gs 的主流程。
 * ============================================================
 */

function getPatchFields_(payload) {
  if (payload && payload.updateMode === 'patch' && payload.fields && typeof payload.fields === 'object') {
    return payload.fields;
  }
  return payload || {};
}

function kimonoFieldAliases_() {
  return {
    couponCode: ['couponCode', 'coupon'],
    coupon: ['coupon', 'couponCode'],
    proofImageUrl: ['proofImageUrl', 'proofUrl'],
    proofUrl: ['proofUrl', 'proofImageUrl'],
    kimonoPrice: ['kimonoPrice', 'price'],
    price: ['price', 'kimonoPrice'],
    refundAmt: ['refundAmt', 'refundAmount'],
    refundAmount: ['refundAmount', 'refundAmt'],
    refundDate: ['refundDate', 'refundTime'],
    refundTime: ['refundTime', 'refundDate'],
    note: ['note', 'remark'],
    remark: ['remark', 'note'],
    confirmed: ['confirmed', 'status']
  };
}

function headerIndex_(sheet) {
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var index = {};
  headers.forEach(function (h, i) {
    var key = (h || '').toString().trim();
    if (key) index[key] = i + 1;
  });
  return index;
}

function resolveHeader_(index, key, aliasMap) {
  var candidates = aliasMap[key] || [key];
  if (typeof candidates === 'string') candidates = [candidates];
  for (var i = 0; i < candidates.length; i++) {
    if (index[candidates[i]]) return candidates[i];
  }
  return null;
}

function setCellsByHeader_(sheet, row, fields, aliasMap) {
  aliasMap = aliasMap || {};
  var index = headerIndex_(sheet);

  Object.keys(fields || {}).forEach(function (key) {
    if (key === 'action' || key === 'token' || key === 'agent' || key === 'orderId' || key === 'fields' || key === 'updateMode') return;
    var header = resolveHeader_(index, key, aliasMap);
    if (!header) return;
    var col = index[header];
    if (!col) return;
    sheet.getRange(row, col).setValue(fields[key]);
  });
}

function appendRowByHeader_(sheet, fields, aliasMap) {
  aliasMap = aliasMap || {};
  var index = headerIndex_(sheet);
  var lastCol = sheet.getLastColumn();
  var row = new Array(lastCol).fill('');
  Object.keys(fields || {}).forEach(function (key) {
    var header = resolveHeader_(index, key, aliasMap);
    if (!header) return;
    row[index[header] - 1] = fields[key];
  });
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function appendFlowLog_(orderId, action, actor, beforeObj, afterObj, metaObj) {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName('流程日志') || ss.getSheetByName('流程日誌');
  if (!sheet) {
    sheet = ss.insertSheet('流程日志');
    sheet.appendRow(['eventId', 'orderId', 'action', 'actor', 'before', 'after', 'meta', 'createdAt']);
  }
  var eventId = 'EVT-' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).slice(2, 8);
  sheet.appendRow([
    eventId,
    orderId || '',
    action || '',
    actor || '',
    beforeObj ? JSON.stringify(beforeObj) : '',
    afterObj ? JSON.stringify(afterObj) : '',
    metaObj ? JSON.stringify(metaObj) : '',
    new Date()
  ]);
  return eventId;
}

function rowObjectByHeader_(sheet, row) {
  var index = headerIndex_(sheet);
  var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  var obj = {};
  Object.keys(index).forEach(function (key) {
    obj[key] = values[index[key] - 1];
  });
  return obj;
}

function findOrderRow_(sheet, orderId) {
  var index = headerIndex_(sheet);
  var col = index.orderId || index['訂單編號'];
  if (!col) throw new Error('訂單表找不到 orderId 欄位');
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var values = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  var target = (orderId || '').toString().trim();
  for (var i = 0; i < values.length; i++) {
    if ((values[i][0] || '').toString().trim() === target) return i + 2;
  }
  return -1;
}

function rememberIdempotentResult_(clientRequestId, result) {
  if (!clientRequestId) return result;
  var props = PropertiesService.getScriptProperties();
  props.setProperty('REQ_' + clientRequestId, JSON.stringify({
    ts: Date.now(),
    result: result
  }));
  return result;
}

function getIdempotentResult_(clientRequestId) {
  if (!clientRequestId) return null;
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('REQ_' + clientRequestId);
  if (!raw) return null;
  try {
    var rec = JSON.parse(raw);
    // 保留 24 小時，避免使用者重新整理或重送造成重複流程資料。
    if (rec.ts && Date.now() - rec.ts < 24 * 60 * 60 * 1000) return rec.result;
  } catch (e) {}
  props.deleteProperty('REQ_' + clientRequestId);
  return null;
}

function nextKimonoOrderId_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return nextKimonoOrderIdUnlocked_();
  } finally {
    lock.releaseLock();
  }
}

function nextKimonoOrderIdUnlocked_() {
  var now = new Date();
  var yy = Utilities.formatDate(now, 'Asia/Tokyo', 'yy');
  var md = Utilities.formatDate(now, 'Asia/Tokyo', 'MMdd');
  var key = 'ORDER_SEQ_' + yy + md;
  var props = PropertiesService.getScriptProperties();
  var seq = parseInt(props.getProperty(key) || '10', 10) + 1;
  props.setProperty(key, String(seq));
  return 'K' + yy + md + ('000' + seq).slice(-3);
}

function createBookingV2(payload) {
  var cached = getIdempotentResult_(payload.clientRequestId);
  if (cached) return cached;

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (!payload.name || !payload.phone || !payload.bookingDate) {
      return { status: 'error', message: '缺少姓名、電話或預約日期' };
    }

    var sheet = SpreadsheetApp.getActive().getSheetByName('訂單表');
    if (!sheet) return { status: 'error', message: '找不到「訂單表」分頁' };

    payload.orderId = nextKimonoOrderIdUnlocked_();
    payload.createdAt = payload.createdAt || new Date();
    payload.status = payload.status || 'pending';
    payload.confirmed = payload.confirmed || 'FALSE';

    appendRowByHeader_(sheet, payload, kimonoFieldAliases_());
    appendFlowLog_(payload.orderId, 'booking_created', payload.source || 'web', null, payload, {
      clientRequestId: payload.clientRequestId || '',
      clientCreatedAt: payload.clientCreatedAt || ''
    });
    var result = {
      status: 'success',
      orderId: payload.orderId,
      message: 'booking created'
    };
    return rememberIdempotentResult_(payload.clientRequestId, result);
  } finally {
    lock.releaseLock();
  }
}

function updateOrderPatchV2(payload) {
  var auth = verifyAdminToken(payload);
  if (!auth.ok) return { status: 'unauthorized', message: '請重新登入' };
  if (!payload.orderId) return { status: 'error', message: '缺少 orderId' };

  var sheet = SpreadsheetApp.getActive().getSheetByName('訂單表');
  if (!sheet) return { status: 'error', message: '找不到「訂單表」分頁' };

  var row = findOrderRow_(sheet, payload.orderId);
  if (row < 0) return { status: 'error', message: '找不到訂單：' + payload.orderId };

  var fields = getPatchFields_(payload);
  var beforeObj = rowObjectByHeader_(sheet, row);
  fields.updatedAt = new Date();
  fields.updatedBy = auth.name;
  setCellsByHeader_(sheet, row, fields, kimonoFieldAliases_());
  appendFlowLog_(payload.orderId, 'order_patch', auth.name, beforeObj, fields, {
    updatedFields: Object.keys(fields)
  });
  return {
    status: 'success',
    orderId: payload.orderId,
    updatedFields: Object.keys(fields)
  };
}
