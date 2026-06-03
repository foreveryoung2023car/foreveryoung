// ============================================================
// v2.4 月度關帳歸檔
// ============================================================
// v2.4.20: 一鍵填入退款時間
// v2.4.20: 解析退款原因字串成 {bankCode, bankName, account, accountName, reason, hasBank}
function parseRefundReason(text){
  const result = { bankCode:'', bankName:'', account:'', accountName:'', reason:'', hasBank:false };
  if (!text) return result;
  const s = String(text);
  // 抓「銀行: XXX YYY」(代號 + 名稱)
  let m = s.match(/銀行[:：]\s*([^\s]+)\s+([^\n帳戶原]+)/);
  if (m) { result.bankCode = m[1].trim(); result.bankName = m[2].trim(); result.hasBank = true; }
  else {
    m = s.match(/銀行[:：]\s*([^\n帳戶原]+)/);
    if (m) { result.bankName = m[1].trim(); result.hasBank = true; }
  }
  m = s.match(/帳號[:：]\s*([^\n戶原]+)/);
  if (m) { result.account = m[1].trim(); result.hasBank = true; }
  m = s.match(/戶名[:：]\s*([^\n原]+)/);
  if (m) { result.accountName = m[1].trim(); result.hasBank = true; }
  m = s.match(/原因[:：]\s*(.+)/s);
  if (m) result.reason = m[1].trim();
  // 如果沒解析出原因，但也沒銀行資訊，視為純文字原因
  if (!result.reason && !result.hasBank) result.reason = s;
  return result;
}

// 把 4 個欄位 + 原因合併成「銀行: X Y 帳號: Z 戶名: W 原因: ...」
function composeRefundReason(){
  const bankCode = document.getElementById('e-refund-bankcode')?.value.trim() || '';
  const bankName = document.getElementById('e-refund-bankname')?.value.trim() || '';
  const account = document.getElementById('e-refund-account')?.value.trim() || '';
  const accountName = document.getElementById('e-refund-accountname')?.value.trim() || '';
  const reason = document.getElementById('e-refund-reason')?.value.trim() || '';
  // 如果都沒填銀行資訊 → 純文字原因
  if (!bankCode && !bankName && !account && !accountName) return reason;
  const parts = [];
  if (bankCode || bankName) parts.push('銀行: ' + bankCode + (bankCode && bankName ? ' ' : '') + bankName);
  if (account) parts.push('帳號: ' + account);
  if (accountName) parts.push('戶名: ' + accountName);
  if (reason) parts.push('原因: ' + reason);
  return parts.join('  ');
}

function markRefundDone(){
  const el = document.getElementById('e-refund-date');
  if (!el) return;
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offset).toISOString().slice(0, 16);
  el.value = local;
  toast('已填入退款時間：' + local.replace('T', ' '), 'success');
}
