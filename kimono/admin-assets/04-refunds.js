// v2.5n: 退款工作流 — 標記已匯款
async function markRefundPaid(orderId, name){
  const o = allOrders.find(x=>x.orderId===orderId);
  if(!o) return alert('找不到訂單');
  // v2.5o: 強制要先填退款原因
  if(!o.refundReason || !String(o.refundReason).trim()){
    if(!confirm('「'+name+'」的退款原因尚未填寫，請先到編輯訂單填好原因再來標記匯款。\n\n要立即跳到編輯嗎？')) return;
    return openEdit(orderId);
  }
  if(!confirm('確認已完成退款給「'+name+'」的匯款？\n退款原因：'+o.refundReason)) return;
  const today = new Date();
  const refundDate = today.getFullYear()+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+String(today.getDate()).padStart(2,'0');
  try {
    await saveOrderQuick(o, {refundDate: refundDate});
    toast('退款已標記為已匯出 ✓');
  } catch(e){ alert('儲存失敗：'+e.message); }
}

// v2.5l: LINE 訊息範本
const STORE_ADDRESSES = {
  // v2.5n: 真實店址 (從 index.html 表單抓出來的)
  kyoto1: '京都清水寺店 — 京都府東山區五條橋東 4-432-13',
  kyoto2: '京都祇園店 — 京都府東山區常盤町 169',
  osaka1: '大阪日本橋店 — 大阪府中央區日本橋 1-18-14',
  tokyo1: '東京淺草寺店 — 東京都台東區淺草 1-33-8'
};
const MSG_TEMPLATES = {
  confirm: function(o){
    const addr = STORE_ADDRESSES[o.storeKey] || '請洽詢店家';
    const total = (Number(o.deposit)||0)+(Number(o.price||o.kimonoPrice)||0)+(Number(o.hairFee)||0)+(Number(o.photoFee)||0);
    return '您好 '+(o.name||'')+'，您的和服體驗預約已確認 ✅\n\n📋 訂單編號：'+(o.orderId||'')+'\n📅 體驗日期：'+(o.bookingDate||'')+'\n👥 人數：'+formatGuestCount(o)+'\n💰 應付總額：¥'+total.toLocaleString()+'（訂金 ¥'+(Number(o.deposit)||0).toLocaleString()+' 已收）\n📍 體驗地點：'+addr+'\n\n如需任何協助請隨時聯繫我們，期待您的蒞臨！\n— 旅乘 × 和服';
  },
  reminder: function(o){
    return '您好 '+(o.name||'')+' ✨ 提醒您明天有預約和服體驗\n\n📅 '+(o.bookingDate||'')+'\n📋 訂單號：'+(o.orderId||'')+'\n\n注意事項：\n• 建議提前 10 分鐘到店\n• 請穿著輕便衣物方便更衣\n• 攜帶證件 + 身分證明\n\n如需改期請於今日下午前告知，謝謝您！';
  },
  arrived: function(o){
    const addr = STORE_ADDRESSES[o.storeKey] || '';
    return '您好 '+(o.name||'')+'，您今天的和服已準備好了，請問現在方便到店嗎？\n📍 '+addr+'\n\n如有預計到店時間請告知，我們會先準備您的和服 👘';
  },
  paid: function(o){
    const total = (Number(o.deposit)||0)+(Number(o.price||o.kimonoPrice)||0)+(Number(o.hairFee)||0)+(Number(o.photoFee)||0);
    return '您好 '+(o.name||'')+'，感謝您今日的光臨 🙏\n\n本次消費已完成結帳 ✓\n📋 訂單號：'+(o.orderId||'')+'\n💰 消費總額：¥'+total.toLocaleString()+'\n\n歡迎您下次再來體驗！如有任何問題請隨時聯繫。';
  },
  winback: function(o){
    return '您好 '+(o.name||'')+' ✨\n好久不見了！我們最近推出了新的和服款式，許多老客戶回來都很喜歡呢 👘\n\n如果您最近有來日本的計畫，誠摯邀請您再次蒞臨體驗：\n• VIP 老客戶專屬 9 折優惠\n• 預約優先服務\n• 新款和服優先試穿\n\n回覆此訊息即可預約，期待再次為您服務！\n— 旅乘 × 和服';
  },
  refund: function(o){
    return '您好 '+(o.name||'')+'，您的退款申請已處理 ✓\n\n📋 訂單號：'+(o.orderId||'')+'\n💸 退款金額：¥'+(Number(o.refundAmount)||0).toLocaleString()+'\n💳 退款方式：原路退回\n⏱ 到帳時間：3-7 個工作天\n\n如未收到請聯繫我們，感謝您的耐心 🙏';
  }
};

function openMsgTemplate(orderId){
  const o = allOrders.find(x=>x.orderId===orderId);
  if(!o) return alert('找不到訂單');
  let html = '<div class="todo-modal-bg" onclick="if(event.target===this)closeMsgTemplate()"><div class="custom-modal-frame"><button onclick="closeMsgTemplate()" class="custom-modal-close" aria-label="關閉訊息範本">×</button><div class="todo-modal-card"><div class="todo-modal-head"><span class="font-bold text-base text-[#1A365D]">📨 訊息範本：'+(o.name||'')+' / '+orderId+'</span></div><div class="todo-modal-body" style="padding:14px 18px">';
  const titles = {confirm:'✅ 訂單確認', reminder:'⏰ 體驗前一日提醒', arrived:'🎌 已準備好和服', paid:'💰 收尾款 / 結帳完成', winback:'✨ 喚醒老客戶 (久未回訪)', refund:'↩ 退款已處理'};
  Object.keys(MSG_TEMPLATES).forEach(k=>{
    const txt = MSG_TEMPLATES[k](o);
    const safeId = 'tpl-'+k;
    html += '<div class="mb-3 pb-3 border-b border-slate-100"><div class="flex items-center justify-between mb-2"><span class="font-bold text-sm text-[#1A365D]">'+titles[k]+'</span><button onclick="copyTemplate(\''+safeId+'\')" class="px-2 py-1 bg-[#1A365D] text-white text-xs rounded hover:bg-blue-900">📋 複製</button></div><textarea id="'+safeId+'" class="w-full text-xs p-2 border rounded bg-slate-50 font-mono" rows="6" readonly>'+txt+'</textarea></div>';
  });
  html += '</div></div></div></div>';
  const wrap = document.createElement('div'); wrap.id='msgTemplateModal'; wrap.innerHTML = html;
  document.body.appendChild(wrap);
}
function closeMsgTemplate(){ const x=document.getElementById('msgTemplateModal'); if(x)x.remove(); }
function copyTemplate(id){ const t=document.getElementById(id); if(!t) return; navigator.clipboard.writeText(t.value).then(()=>toast('已複製訊息範本到剪貼簿 ✓')); }

// v2.5k: 已收尾款 (用 note 欄位塞 [PAID-YYYYMMDD] tag, 免改 GAS schema)
function isPaidFull(o){ return /\[PAID-\d{8}\]/.test(String(o.note||'')); }
async function markPaidFull(orderId, name){
  if(!confirm('確認「'+name+'」已收齊尾款？')) return;
  const o = allOrders.find(x=>x.orderId===orderId);
  if(!o) return alert('找不到訂單');
  const today = new Date();
  const tag = '[PAID-'+today.getFullYear()+String(today.getMonth()+1).padStart(2,'0')+String(today.getDate()).padStart(2,'0')+']';
  const newNote = (o.note||'') + (o.note?' ':'') + tag;
  try {
    await saveOrderQuick(o, {note: newNote});
    toast('已標記收齊尾款 ✓');
  } catch(e){ alert('儲存失敗：'+e.message); }
}
async function unmarkPaidFull(orderId, name){
  if(!confirm('「'+name+'」標記為「未收齊」？')) return;
  const o = allOrders.find(x=>x.orderId===orderId);
  if(!o) return;
  const newNote = String(o.note||'').replace(/\s*\[PAID-\d{8}\]/g, '').trim();
  try { await saveOrderQuick(o, {note: newNote}); toast('已取消標記'); }
  catch(e){ alert('失敗：'+e.message); }
}

function isAnomaly(o){ return !o.name || !o.phone || !o.bookingDate; }
function totalAmount(o){ return (Number(o.deposit)||0)+(Number(o.price||o.kimonoPrice)||0)+(Number(o.hairFee)||0)+(Number(o.photoFee)||0); }
// v2.4.20: 客人本次體驗應付總額（不含訂金重複計入）
// v2.4.20: 顯示 boolean 為「是/否」
function fmtYesNo(v) {
  if (v === true || v === 'true' || v === 1 || v === '1' || v === 'TRUE' || v === '是') return '是';
  if (v === false || v === 'false' || v === 0 || v === '0' || v === 'FALSE' || v === '否' || v === '' || v == null) return '否';
  return String(v);
}

function totalCharge(o){ return (Number(o.price||o.kimonoPrice)||0)+(Number(o.hairFee)||0)+(Number(o.photoFee)||0); }
// v2.4.20: bookingDate → JST 月份字串 (跟 GAS 後端 archMonthOf_ 一致)
// v2.4.20: 月份字串顯示成「YYYY年M月」(處理 Sheets 自動轉成 Date 的 ISO 字串)
// v2.4.20: 把任何月份輸入正規化成 YYYY-MM
function normMonth(m) {
  if (!m) return '';
  if (m instanceof Date) return m.getFullYear()+'-'+String(m.getMonth()+1).padStart(2,'0');
  const s = String(m);
  const match = s.match(/^(\d{4})-(\d{2})/);
  return match ? match[1] + '-' + match[2] : s;
}

function fmtMonth(m) {
  if (!m) return '—';
  if (m instanceof Date) m = m.getFullYear()+'-'+String(m.getMonth()+1).padStart(2,'0');
  const s = String(m);
  // 如果是 ISO 格式（含 T），取年月
  let d = s.match(/^(\d{4})-(\d{2})/);
  if (d) return d[1] + '年' + Number(d[2]) + '月';
  return s;
}
// JST 日期時間格式化 (處理 ISO 字串 / Date 物件 / 純字串)
// v2.4.20: 如果輸入已是 'YYYY/MM/DD HH:MM' 字串就直接回，避免 timezone 轉換錯誤
function fmtJSTDateTime(t) {
  if (!t) return '—';
  // 優先：直接 match 已經是 YYYY/MM/DD HH:MM 格式的字串
  if (typeof t === 'string') {
    const m = t.match(/^(\d{4})[/\-](\d{2})[/\-](\d{2})[\sT](\d{2}):(\d{2})/);
    if (m) return m[1]+'/'+m[2]+'/'+m[3]+' '+m[4]+':'+m[5];
  }
  // 否則用 Date 物件轉（Asia/Tokyo timezone）
  const d = (t instanceof Date) ? t : new Date(t);
  if (isNaN(d)) return String(t);
  // 強制用 JST timezone (Asia/Tokyo, UTC+9)
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const jst = new Date(utc + 9 * 3600000);
  const Y = jst.getFullYear();
  const M = String(jst.getMonth()+1).padStart(2,'0');
  const D = String(jst.getDate()).padStart(2,'0');
  const h = String(jst.getHours()).padStart(2,'0');
  const mn = String(jst.getMinutes()).padStart(2,'0');
  return Y+'/'+M+'/'+D+' '+h+':'+mn;
}

function bookingMonth(o){
  if(!o || !o.bookingDate) return '';
  const d = (o.bookingDate instanceof Date) ? o.bookingDate : new Date(o.bookingDate);
  if(isNaN(d)) return '';
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}
// 解析人數字串，例如「2大1小」「3」「2 adults 1 kid」
function parsePax(s){
  if(!s) return 0;
  s = String(s);
  const m = s.match(/(\d+)\s*[大成人]/);
  const k = s.match(/(\d+)\s*[小孩童]/);
  const just = s.match(/^\s*(\d+)\s*$/);
  let total = 0;
  if(m) total += Number(m[1]);
  if(k) total += Number(k[1]);
  if(!total && just) total = Number(just[1]);
  if(!total){ const all = s.match(/\d+/g); if(all) total = all.reduce((a,b)=>a+Number(b),0); }
  return total;
}
function expectedDeposit(o){
  if (o && (o.adults !== undefined || o.children !== undefined)) {
    return (Number(o.adults || 0) + Number(o.children || 0)) * DEPOSIT_JPY;
  }
  return parsePax(o && o.pax) * DEPOSIT_JPY;
}

function isInRange(o, range){
  if(range==='all') return true;
  const d = o.bookingDate ? new Date(o.bookingDate) : null;
  if(!d || isNaN(d)) return false;
  const now = new Date();
  if(range==='today'){ return d.toDateString()===now.toDateString(); }
  if(range==='week'){ const start=new Date(now); start.setDate(now.getDate()-now.getDay()); start.setHours(0,0,0,0); const end=new Date(start); end.setDate(start.getDate()+7); return d>=start&&d<end; }
  if(range==='month'){ return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth(); }
  if(range==='quarter'){ const q=Math.floor(now.getMonth()/3); const dq=Math.floor(d.getMonth()/3); return d.getFullYear()===now.getFullYear() && dq===q; }
  if(range==='year'){ return d.getFullYear()===now.getFullYear(); }
  return true;
}
