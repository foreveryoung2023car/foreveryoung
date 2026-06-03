// ── EDIT MODAL ──
function openEdit(orderId) {
  const o = allOrders.find(x => x.orderId === orderId);
  if (!o) return;
  editingOrder = o;
  document.getElementById('modal-order-id').textContent = orderId + (o.submitDate ? ' · 填單: ' + o.submitDate : '');
  document.getElementById('e-name').value = o.name || '';
  document.getElementById('e-phone').value = o.phone || '';
  document.getElementById('e-email').value = o.email || '';
  document.getElementById('e-booking-date').value = (function(bd){ if(!bd) return ''; const d=parseBookingDate(bd); if(!d||isNaN(d)) return String(bd).slice(0,10); const p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes()); })(o.bookingDate);
  const guestCount = parseEditGuestCount(o);
  document.getElementById('e-adults').value = guestCount.adults;
  document.getElementById('e-children').value = guestCount.children;
  syncEditPax();
  document.getElementById('e-plan').value = o.plan || '';
  document.getElementById('e-platform').value = o.platform || '';
  document.getElementById('e-hair').value = (o.hair === true || o.hair === 'true') ? 'true' : 'false';
  document.getElementById('e-photo').value = (o.photo === true || o.photo === 'true') ? 'true' : 'false';
  document.getElementById('e-confirmed').value = o.confirmed ? 'true' : 'false';
  document.getElementById('e-deposit').value = o.deposit || '';
  document.getElementById('e-price').value = o.price || o.kimonoPrice || '';
  document.getElementById('e-hair-fee').value = o.hairFee || '';
  document.getElementById('e-photo-fee').value = o.photoFee || '';
  document.getElementById('e-coupon').value = o.coupon || '';
  document.getElementById('e-rate').value = o.rate || '0.22';
  document.getElementById('e-refund-amt').value = o.refundAmount || '';
  document.getElementById('e-refund-date').value = (o.refundTime || '').slice(0,16);
  // v2.4.20: 把 refundReason 拆成 4 個帳戶分欄 + 純原因
  const reason = o.refundReason || '';
  const parsed = parseRefundReason(reason);
  document.getElementById('e-refund-bankcode').value = o.refundBankCode || parsed.bankCode || '';
  document.getElementById('e-refund-bankname').value = o.refundBankName || parsed.bankName || '';
  document.getElementById('e-refund-account').value = o.refundBankAccount || parsed.account || '';
  document.getElementById('e-refund-accountname').value = o.refundBankAccountName || parsed.accountName || '';
  document.getElementById('e-refund-reason').value = parsed.reason || '';
  // 客人原始匯款資訊橘色框
  const infoBox = document.getElementById('refund-customer-info');
  const infoBody = document.getElementById('refund-customer-info-body');
  if (infoBox && infoBody) {
    if (parsed.hasBank) {
      infoBody.innerHTML =
        ((parsed.bankCode || parsed.bankName) ? '<div>銀行：' + (parsed.bankCode||'') + ' ' + (parsed.bankName||'') + '</div>' : '') +
        (parsed.account ? '<div>帳號：' + parsed.account + '</div>' : '') +
        (parsed.accountName ? '<div>戶名：' + parsed.accountName + '</div>' : '');
      infoBox.classList.remove('hidden');
    } else {
      infoBox.classList.add('hidden');
    }
  }
  document.getElementById('e-remark').value = o.remark || '';
  document.getElementById('save-msg').classList.add('hidden');
  switchTab('basic', document.querySelector('#edit-modal .tab-btn'));
  updateCalc();
  injectAnomalyWarning(o); // v2.6
  document.getElementById('edit-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function parseEditGuestCount(o) {
  const adults = Number(o && o.adults || 0);
  const children = Number(o && o.children || 0);
  if (adults > 0 || children > 0) return { adults, children };
  const text = String((o && o.pax) || '').trim();
  if (!text) return { adults: 0, children: 0 };
  const adultMatch = text.match(/(\d+)\s*[大成人]/);
  const childMatch = text.match(/(\d+)\s*[小孩童]/);
  if (adultMatch || childMatch) {
    return {
      adults: adultMatch ? Number(adultMatch[1]) : 0,
      children: childMatch ? Number(childMatch[1]) : 0
    };
  }
  const n = Number(text);
  return { adults: n > 0 ? n : 0, children: 0 };
}

function syncEditPax() {
  const adults = Math.max(0, Number(document.getElementById('e-adults')?.value || 0));
  const children = Math.max(0, Number(document.getElementById('e-children')?.value || 0));
  const pax = (adults > 0 ? adults + '大' : '') + (children > 0 ? children + '小' : '');
  const legacy = document.getElementById('e-pax');
  if (legacy) legacy.value = pax || '0大';
  return { adults, children, pax: pax || '0大' };
}

// v2.6: 在編輯 modal 上方注入「為什麼這筆是異常」說明橫幅
function injectAnomalyWarning(o){
  const modalBox = document.querySelector('#edit-modal .modal-box');
  if(!modalBox) return;
  // 移掉舊的
  const old = document.getElementById('anomaly-banner'); if(old) old.remove();

  const reasons = [];
  if(!o.name) reasons.push('缺姓名');
  if(!o.phone) reasons.push('缺電話');
  if(!o.bookingDate) reasons.push('缺預約日');

  const exp = (typeof expectedDeposit === 'function') ? expectedDeposit(o) : 0;
  const got = Number(o.deposit) || 0;
  // v2.4.20 只把「超收 (got > 體驗總額)」當異常
  const tc = (typeof totalCharge==='function') ? totalCharge(o) : 0;
  if(o.bookingDate && tc > 0 && got > tc) {
    reasons.push('⚠ 訂金「超收」¥' + (got-tc).toLocaleString() + '（體驗總額 ¥' + tc.toLocaleString() + '，實收 ¥' + got.toLocaleString() + '）→ 必須退款');
  }

  if(Number(o.refundAmount) > 0 && !o.refundTime) reasons.push('退款金額已填但未填退款時間');

  const c = o.createdAt || o.submitDate;
  if(!o.confirmed && c) {
    const cd = new Date(c);
    if(!isNaN(cd) && (Date.now() - cd) > 24*3600*1000) reasons.push('待確認超過 24 小時');
  }

  if(!reasons.length) return; // 沒異常就不顯示

  const banner = document.createElement('div');
  banner.id = 'anomaly-banner';
  banner.className = 'mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-xl';
  banner.innerHTML = '<div class="flex items-start gap-2">'+
    '<span class="text-xl">⚠️</span>'+
    '<div class="flex-1">'+
      '<div class="font-bold text-red-700 text-sm mb-1">這筆訂單被標為「異常」，原因：</div>'+
      '<ul class="text-sm text-red-700 list-disc list-inside space-y-0.5">'+
        reasons.map(r=>'<li>'+r+'</li>').join('')+
      '</ul>'+
      '<div class="text-xs text-red-600 mt-2">建議處理方式：依上方 tab「款項費用 / 退款記錄」修正後按「儲存變更」。</div>'+
    '</div></div>';

  // 插在 header 後、tab bar 前
  const tabBar = modalBox.querySelector('.flex.gap-2.mb-5.flex-wrap');
  if(tabBar) modalBox.insertBefore(banner, tabBar);
  else modalBox.insertBefore(banner, modalBox.children[1]);
}
function closeModal() { document.getElementById('edit-modal').classList.add('hidden'); document.body.style.overflow = ''; }
function switchTab(name, btn) {
  document.querySelectorAll('.edit-tab').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('#edit-modal .tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  if (btn) btn.classList.add('active');
}
function updateCalc() {
  const price = Number(document.getElementById('e-price').value) || 0;
  const hair = Number(document.getElementById('e-hair-fee').value) || 0;
  const photo = Number(document.getElementById('e-photo-fee').value) || 0;
  const deposit = Number(document.getElementById('e-deposit').value) || 0;
  const onsite = price + hair + photo;
  const afterDep = Math.max(0, onsite - deposit);
  document.getElementById('calc-due').textContent = onsite ? fmtY0(onsite) : '—';
  document.getElementById('calc-net').textContent = onsite ? fmtY0(afterDep) : '—';
}
