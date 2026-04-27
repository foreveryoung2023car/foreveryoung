/**
 * ============================================================
 *  旅乘 x 和服 — GAS 後端追加程式碼 (gas-additions.gs)
 * ------------------------------------------------------------
 *  本檔需貼進 Apps Script Editor 既有的 Code.gs 內。
 *  新增兩個 action：
 *    1. adminLogin   — 對「系統設定」分頁驗證客服姓名與密碼
 *    2. uploadImage  — 後端代理上傳到 imgbb，前端不再帶 key
 *
 *  並提供 verifyAdminToken 給 adminGetOrders / adminUpdate 使用。
 * ============================================================
 *
 *  ── 安裝步驟 ───────────────────────────────────────────────
 *  1) Sheets 開一個分頁「系統設定」，A 欄起放：
 *
 *       A 欄: 客服姓名   B 欄: 密碼(明碼)   C 欄: 啟用(TRUE/FALSE)
 *       Jun           kimono           TRUE
 *       Ren           ren_pass         TRUE
 *       Amy           amy_pass         FALSE   ← 停用
 *
 *  2) Apps Script Editor → 左下「⚙ 專案設定」→ 指令碼屬性
 *       新增屬性：
 *         IMGBB_KEY       = fc071a07584cffd920bd85321439cc6b   (或新申請)
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
 *  4) 重新部署 Web App（部署 → 新增部署 → 類型「網頁應用程式」）。
 *     URL 不會變（因為是同一個指令碼），不需改 config.js。
 *
 *  ── 安全等級 ───────────────────────────────────────────────
 *  • 密碼以明碼存 Sheets，僅工作室內部成員可見此 Sheet → 中等。
 *  • 想升級成 hash：把 hashPassword() 取消註解，並改寫 Sheet 的 B 欄為 hash 結果。
 *  • Token 是隨機 16 byte hex，存入 Script Properties，TTL 過期自動失效。
 *
 *  ── 維護 ───────────────────────────────────────────────────
 *  • 新增客服：在「系統設定」加一行，填姓名/密碼/TRUE → 完成。
 *  • 停用客服：把 C 欄改成 FALSE。
 *  • 改密碼  ：直接改 B 欄，下次登入即生效。
 *  • 換 imgbb key：改 Script Properties 的 IMGBB_KEY，立即生效。
 * ============================================================
 */


// ── 1. 客服登入 ──────────────────────────────────────────────
function adminLogin(payload) {
  var name = (payload.name || '').toString().trim();
  var pass = (payload.password || '').toString();
  if (!name || !pass) return { status: 'error', message: '請填入姓名與密碼' };

  var sheet = SpreadsheetApp.getActive().getSheetByName('系統設定');
  if (!sheet) return { status: 'error', message: '伺服器尚未設定客服名單' };

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var rowName    = (row[0] || '').toString().trim();
    var rowPass    = (row[1] || '').toString();
    var rowEnabled = row[2] === true || row[2] === 'TRUE' || row[2] === 'true';

    if (rowName === name) {
      if (!rowEnabled) return { status: 'error', message: '此帳號已停用，請聯絡管理員' };
      // 想用 hash 改成： if (hashPassword(pass) === rowPass) { ... }
      if (rowPass === pass) {
        var token = issueAdminToken(name);
        return { status: 'success', agent: name, token: token };
      } else {
        return { status: 'error', message: '密碼錯誤，請再試一次' };
      }
    }
  }
  return { status: 'error', message: '查無此客服姓名' };
}


// ── 2. Token 發行 / 驗證 ─────────────────────────────────────
// Token 存進 Script Properties：key = 'ADM_' + token，value = JSON({name, exp})
function issueAdminToken(name) {
  var props = PropertiesService.getScriptProperties();
  var ttl   = parseInt(props.getProperty('ADMIN_TOKEN_TTL') || '28800', 10); // 預設 8 小時

  // 16 byte 隨機 hex
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

  // 簡單防呆：base64 約 1.37 倍原始大小，限制 ~7MB base64 ≈ 5MB 原檔
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


// ── 4. (選用) 密碼 Hash ──────────────────────────────────────
// 想升級成 hash 儲存：把 adminLogin 內比對改成 hashPassword(pass) === rowPass，
// 然後手動把 Sheets B 欄的明碼換成下面這個函式跑出來的字串。
// function hashPassword(pass) {
//   var raw = Utilities.computeDigest(
//     Utilities.DigestAlgorithm.SHA_256,
//     pass + '||旅乘x和服salt2026',  // 改成你自己的 salt
//     Utilities.Charset.UTF_8
//   );
//   return raw.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
// }


// ── 5. 在 adminGetOrders / adminUpdate 開頭該怎麼接 ──────────
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
