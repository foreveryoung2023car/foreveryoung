// ── EDIT MODAL ──
function orderFinancialValue(order, displayKey, firestoreKey) {
  const value = order && order[displayKey] !== undefined
    ? order[displayKey]
    : order && order[firestoreKey];
  return Number(value || 0);
}

function maskStorePhone(phone) {
  const value = String(phone || '').trim();
  if (/^\*+\d{3}$/.test(value)) return value;
  const digits = value.replace(/\D/g, '');
  if (!digits) return '—';
  if (digits.length <= 3) return digits;
  return '*'.repeat(digits.length - 3) + digits.slice(-3);
}

function orderHasMakeup(o) {
  return !!(o && (
    o.makeup === true ||
    o.makeup === 'true' ||
    o.makeup === '是' ||
    orderMakeupFee(o) > 0 ||
    /化妝造型|化妝費|makeup/i.test(orderMakeupText(o))
  ));
}

function makeupFeeForPlan(plan) {
  return ({ Basic: 3000, Standard: 5000, Premium: 8000 })[plan] || 0;
}

function makeupLabelForPlan(plan) {
  return ({
    Basic: '基礎化妝 (+3000 JPY)',
    Standard: '精緻化妝 (+5000 JPY)',
    Premium: '高級化妝 (+8000 JPY)'
  })[plan] || '無';
}

function orderMakeupText(o) {
  return String(o && [
    o.makeupPlan,
    o.proofNote,
    o.proofText,
    o.paymentNote,
    o.remark,
    o.note
  ].filter(Boolean).join(' ') || '');
}

function orderMakeupFee(o) {
  const direct = Number(o && (o.makeupFee !== undefined ? o.makeupFee : o.makeupFeeJpy) || 0);
  if (direct > 0) return direct;
  const planFee = makeupFeeForPlan(String(o && o.makeupPlan || '').trim());
  if (planFee > 0) return planFee;
  const text = orderMakeupText(o);
  const explicit = text.match(/化妝費[：:\s]*([0-9,]+)\s*JPY/i);
  if (explicit) return Number(explicit[1].replace(/,/g, '')) || 0;
  if (/Premium|高級化妝/.test(text)) return 8000;
  if (/Standard|精緻化妝/.test(text)) return 5000;
  if (/Basic|基礎化妝/.test(text)) return 3000;
  return 0;
}

function normalizeMakeupPlan(o) {
  const raw = typeof o === 'string' ? o : String(o && o.makeupPlan || '').trim();
  if (/Premium|高級化妝/.test(raw)) return 'Premium';
  if (/Standard|精緻化妝/.test(raw)) return 'Standard';
  if (/Basic|基礎化妝/.test(raw)) return 'Basic';
  if (raw === 'true' || raw === '是') return 'Basic';
  if (raw === 'No' || raw === 'false' || raw === '否') return 'No';
  const text = typeof o === 'string' ? raw : orderMakeupText(o);
  const fee = Number(o && (o.makeupFee !== undefined ? o.makeupFee : o.makeupFeeJpy) || 0);
  if (/Premium|高級化妝/.test(text) || fee >= 8000) return 'Premium';
  if (/Standard|精緻化妝/.test(text) || fee >= 5000) return 'Standard';
  if (/Basic|基礎化妝/.test(text) || fee >= 3000 || (o && (o.makeup === true || o.makeup === 'true' || o.makeup === '是'))) return 'Basic';
  return 'No';
}

function syncMakeupFeeFromPlan() {
  const plan = document.getElementById('e-makeup')?.value || 'No';
  const feeInput = document.getElementById('e-makeup-fee');
  if (feeInput) feeInput.value = makeupFeeForPlan(plan) || '';
  if (typeof updateCalc === 'function') updateCalc();
}

function openEdit(orderId) {
  const o = allOrders.find(x => x.orderId === orderId);
  if (!o) return;
  editingOrder = o;
  document.getElementById('edit-modal').classList.toggle('store-modal', currentRole === 'store');
  document.getElementById('modal-order-id').textContent = currentRole === 'store'
    ? orderId
    : orderId + (o.submitDate ? ' · 填單: ' + o.submitDate : '');
  renderEditModalStatus(o);
  document.getElementById('e-name').value = o.name || '';
  document.getElementById('e-phone').value = o.phone || '';
  document.getElementById('e-email').value = o.email || '';
  const nameDisplay = document.getElementById('e-name-display');
  const phoneDisplay = document.getElementById('e-phone-display');
  const emailDisplay = document.getElementById('e-email-display');
  if (nameDisplay) nameDisplay.textContent = o.name || '—';
  if (phoneDisplay) phoneDisplay.textContent = maskStorePhone(o.phone);
  if (emailDisplay) emailDisplay.textContent = o.email || '—';
  document.getElementById('e-booking-date').value = dateTimeLocalValueJST(o.bookingDate);
  const guestCount = parseEditGuestCount(o);
  document.getElementById('e-adults').value = guestCount.adults;
  document.getElementById('e-male-adults').value = guestCount.maleAdults === null ? '' : guestCount.maleAdults;
  document.getElementById('e-female-adults').value = guestCount.femaleAdults === null ? '' : guestCount.femaleAdults;
  document.getElementById('e-children').value = guestCount.children;
  syncEditPax();
  document.getElementById('e-plan').value = o.plan || '';
  document.getElementById('e-platform').value = o.platform || '';
  document.getElementById('e-hair').value = (o.hair === true || o.hair === 'true') ? 'true' : 'false';
  document.getElementById('e-makeup').value = normalizeMakeupPlan(o);
  document.getElementById('e-photo').value = (o.photo === true || o.photo === 'true') ? 'true' : 'false';
  document.getElementById('e-confirmed').value = o.confirmed ? 'true' : 'false';
  const paidDeposit = typeof orderPaidDeposit === 'function'
    ? orderPaidDeposit(o)
    : Math.max(0, Number(o.deposit || 0) - Number(o.refundAmount || 0));
  const depositInput = document.getElementById('e-deposit');
  depositInput.value = paidDeposit || '';
  depositInput.dataset.rawDeposit = String(Number(o.deposit || 0));
  document.getElementById('e-deposit-display').textContent = '¥' + paidDeposit.toLocaleString();
  document.getElementById('e-price').value = o.price || o.kimonoPrice || '';
  document.getElementById('e-hair-fee').value = o.hairFee || '';
  document.getElementById('e-makeup-fee').value = orderMakeupFee(o) || '';
  document.getElementById('e-photo-fee').value = o.photoFee || '';
  document.getElementById('e-coupon').value = o.coupon || '';
  document.getElementById('e-discount-refund-amount').value = Number(o.discountRefundAmount || 0) || '';
  const overtimeDamageDeduction = orderFinancialValue(o, 'overtimeDamageDeduction', 'overtimeDamageDeductionJpy');
  document.getElementById('e-overtime-damage-deduction').value = overtimeDamageDeduction || '';
  const storeActualReceived = orderFinancialValue(o, 'storeActualReceived', 'storeActualReceivedJpy');
  const balanceDue = orderFinancialValue(o, 'balanceDue', 'balanceDueJpy');
  const storeActualInput = document.getElementById('e-store-actual-received');
  const isBeforeCheckout = currentRole === 'store' && ['confirmed', 'checked_in'].includes(orderStatusOf(o));
  const defaultActualReceived = Math.max(0,
    Number(o.price || o.kimonoPrice || 0)
    + Number(o.hairFee || 0)
    + orderMakeupFee(o)
    + Number(o.photoFee || 0)
    + overtimeDamageDeduction
    - Number(o.discountRefundAmount || 0)
    - paidDeposit
  );
  storeActualInput.dataset.autoMode = isBeforeCheckout ? 'true' : 'false';
  storeActualInput.value = String(isBeforeCheckout && !storeActualReceived ? defaultActualReceived : storeActualReceived);
  storeActualInput.dataset.savedValue = String(storeActualReceived);
  document.getElementById('calc-store-balance').dataset.savedValue = String(balanceDue);
  document.getElementById('calc-store-balance').dataset.savedSignature = [
    Number(o.price || o.kimonoPrice || 0),
    Number(o.hairFee || 0),
    orderMakeupFee(o),
    Number(o.photoFee || 0),
    paidDeposit,
    Number(o.refundAmount || 0),
    Number(o.discountRefundAmount || 0),
    overtimeDamageDeduction,
    storeActualReceived
  ].join('|');
  renderPaymentProof(o);
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
  document.getElementById('e-store-note').value = o.storeNote || '';
  renderStoreOrderDetailView(o);
  resetStoreOrderDetailMode();
  applyStoreOrderReadOnlyMode(o);
  document.getElementById('save-msg').classList.add('hidden');
  switchTab('basic', document.querySelector('#edit-modal .tab-btn'));
  updateCalc();
  injectAnomalyWarning(o); // v2.6
  document.getElementById('edit-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function renderEditModalStatus(o) {
  const target = document.getElementById('modal-order-status');
  if (target) target.innerHTML = renderOrderStatusControl(o, 'large');
}

function renderStoreOrderDetailView(o) {
  const hideMoney = typeof shouldHideOrderMoney === 'function' && shouldHideOrderMoney(o);
  const booking = parseBookingDate(o.bookingDate);
  document.getElementById('store-view-booking').textContent = booking ? fmtBookingDateTime(o.bookingDate) : '—';
  const guests = parseEditGuestCount(o);
  document.getElementById('store-view-male').textContent = guests.maleAdults === null ? '未區分' : guests.maleAdults;
  document.getElementById('store-view-female').textContent = guests.femaleAdults === null ? guests.adults : guests.femaleAdults;
  document.getElementById('store-view-children').textContent = guests.children;
  document.getElementById('store-view-hair').textContent = (o.hair === true || o.hair === 'true') ? '有' : '無';
  document.getElementById('store-view-makeup').textContent = makeupLabelForPlan(normalizeMakeupPlan(o));
  document.getElementById('store-view-photo').textContent = (o.photo === true || o.photo === 'true') ? '有' : '無';
  setStoreInlineEditorValue('store-inline-male', guests.maleAdults === null ? 0 : guests.maleAdults);
  setStoreInlineEditorValue('store-inline-female', guests.femaleAdults === null ? guests.adults : guests.femaleAdults);
  setStoreInlineEditorValue('store-inline-children', guests.children);
  setStoreInlineEditorValue('store-inline-hair', (o.hair === true || o.hair === 'true') ? 'true' : 'false');
  setStoreInlineEditorValue('store-inline-makeup', normalizeMakeupPlan(o));
  setStoreInlineEditorValue('store-inline-photo', (o.photo === true || o.photo === 'true') ? 'true' : 'false');
  const moneyRow = document.getElementById('store-summary-money-row');
  if (moneyRow) moneyRow.hidden = true;
  const remark = String(o && o.remark || '').trim();
  const hasRemark = !!remark && !/^[—–-]+$/.test(remark);
  const noteRow = document.getElementById('store-summary-note-row');
  if (noteRow) noteRow.hidden = !hasRemark;
  document.getElementById('store-view-remark').textContent = hasRemark ? remark : '';
  updateStoreSummaryLastVisibleRow();
  document.getElementById('store-view-actual-received').textContent = fmtY0(orderFinancialValue(o, 'storeActualReceived', 'storeActualReceivedJpy'));
  document.getElementById('store-view-balance').textContent = hideMoney ? '—' : fmtY0(orderDisplayBalance(o));
}

function updateStoreSummaryLastVisibleRow() {
  const rows = Array.from(document.querySelectorAll('#store-order-detail-view .store-summary-row'));
  rows.forEach(row => row.classList.remove('is-last-visible'));
  const visibleRows = rows.filter(row => !row.hidden);
  visibleRows[visibleRows.length - 1]?.classList.add('is-last-visible');
}

function setStoreInlineEditorValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function syncStoreInlineEditors() {
  if (currentRole !== 'store') return typeof syncEditPax === 'function' ? syncEditPax() : null;
  const male = Math.max(0, Number(document.getElementById('store-inline-male')?.value || 0));
  const female = Math.max(0, Number(document.getElementById('store-inline-female')?.value || 0));
  const children = Math.max(0, Number(document.getElementById('store-inline-children')?.value || 0));
  const hair = document.getElementById('store-inline-hair')?.value || 'false';
  const makeup = document.getElementById('store-inline-makeup')?.value || 'No';
  const photo = document.getElementById('store-inline-photo')?.value || 'false';
  setStoreInlineEditorValue('e-male-adults', male);
  setStoreInlineEditorValue('e-female-adults', female);
  setStoreInlineEditorValue('e-children', children);
  setStoreInlineEditorValue('e-hair', hair);
  setStoreInlineEditorValue('e-makeup', makeup);
  setStoreInlineEditorValue('e-makeup-fee', makeupFeeForPlan(makeup) || '');
  setStoreInlineEditorValue('e-photo', photo);
  document.getElementById('store-view-male').textContent = male;
  document.getElementById('store-view-female').textContent = female;
  document.getElementById('store-view-children').textContent = children;
  document.getElementById('store-view-hair').textContent = hair === 'true' ? '有' : '無';
  document.getElementById('store-view-makeup').textContent = makeupLabelForPlan(makeup);
  document.getElementById('store-view-photo').textContent = photo === 'true' ? '有' : '無';
  return typeof syncEditPax === 'function' ? syncEditPax() : null;
}

function resetStoreOrderDetailMode() {
  const view = document.getElementById('store-order-detail-view');
  const form = document.getElementById('store-order-detail-form');
  if (!view || !form) return;
  view.classList.remove('is-editing');
  const modal = document.getElementById('edit-modal');
  if (modal) modal.dataset.storeReservationEdit = 'false';
  if (currentRole === 'store') {
    view.style.display = 'block';
    form.style.display = 'none';
  } else {
    view.style.display = 'none';
    form.style.display = 'block';
  }
}

function cancelStoreInlineEdit() {
  const modal = document.getElementById('edit-modal');
  const view = document.getElementById('store-order-detail-view');
  if (!modal || !view || !view.classList.contains('is-editing')) return;
  if (editingOrder) renderStoreOrderDetailView(editingOrder);
  view.classList.remove('is-editing');
  modal.dataset.storeReservationEdit = 'false';
  applyStoreOrderReadOnlyMode(editingOrder);
}

function handleStoreDetailBlankClick(event) {
  const view = document.getElementById('store-order-detail-view');
  if (!view || !view.classList.contains('is-editing')) return;
  if (event.target.closest('.store-inline-editor,.store-detail-edit-btn')) return;
  cancelStoreInlineEdit();
}

function isStoreOrderReadOnly(o) {
  return currentRole === 'store' && ['completed', 'balance_due'].includes(String(o && o.status || ''));
}

function applyStoreOrderReadOnlyMode(o) {
  const readOnly = isStoreOrderReadOnly(o);
  const modal = document.getElementById('edit-modal');
  if (!modal) return;
  modal.querySelectorAll('input, select, textarea').forEach(el => {
    el.disabled = readOnly;
  });
  const storeNoteInput = document.getElementById('e-store-note');
  if (storeNoteInput && currentRole === 'store') storeNoteInput.disabled = false;
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.style.display = '';
    saveBtn.textContent = currentRole === 'store' && readOnly
      ? '💾 儲存店鋪備註'
      : currentRole === 'store' && modal.dataset.storeReservationEdit === 'true'
      ? '💾 儲存預約資訊'
      : currentRole === 'store' && ['confirmed', 'checked_in'].includes(orderStatusOf(o))
      ? '💰 儲存並完成結帳'
      : '💾 儲存變更';
  }
  const editBtn = modal.querySelector('.store-detail-edit-btn');
  if (editBtn) editBtn.style.display = readOnly ? 'none' : '';
}

function enableStoreOrderDetailEdit() {
  if (currentRole !== 'store') return;
  if (isStoreOrderReadOnly(editingOrder)) return;
  const modal = document.getElementById('edit-modal');
  const view = document.getElementById('store-order-detail-view');
  const form = document.getElementById('store-order-detail-form');
  if (view) view.classList.add('is-editing');
  if (view) view.style.display = 'block';
  if (form) form.style.display = 'none';
  if (modal) modal.dataset.storeReservationEdit = 'true';
  syncStoreInlineEditors();
  applyStoreOrderReadOnlyMode(editingOrder);
}

function parseEditGuestCount(o) {
  const adults = Number(o && o.adults || 0);
  const children = Number(o && o.children || 0);
  const hasBreakdown = o && (o.maleAdults !== null && o.maleAdults !== undefined
    || o.femaleAdults !== null && o.femaleAdults !== undefined);
  if (hasBreakdown) {
    const maleAdults = Number(o.maleAdults || 0);
    const femaleAdults = Number(o.femaleAdults || 0);
    return { adults: maleAdults + femaleAdults, maleAdults, femaleAdults, children };
  }
  if (adults > 0 || children > 0) return { adults, maleAdults: null, femaleAdults: null, children };
  const text = String((o && o.pax) || '').trim();
  if (!text) return { adults: 0, maleAdults: null, femaleAdults: null, children: 0 };
  const adultMatch = text.match(/(\d+)\s*[大成人]/);
  const childMatch = text.match(/(\d+)\s*[小孩童]/);
  if (adultMatch || childMatch) {
    return {
      adults: adultMatch ? Number(adultMatch[1]) : 0,
      maleAdults: null,
      femaleAdults: null,
      children: childMatch ? Number(childMatch[1]) : 0
    };
  }
  const n = Number(text);
  return { adults: n > 0 ? n : 0, maleAdults: null, femaleAdults: null, children: 0 };
}

function syncEditPax() {
  const maleEl = document.getElementById('e-male-adults');
  const femaleEl = document.getElementById('e-female-adults');
  const hasBreakdown = maleEl?.value !== '' || femaleEl?.value !== '';
  const maleAdults = hasBreakdown ? Math.max(0, Number(maleEl?.value || 0)) : null;
  const femaleAdults = hasBreakdown ? Math.max(0, Number(femaleEl?.value || 0)) : null;
  const adults = hasBreakdown
    ? maleAdults + femaleAdults
    : Math.max(0, Number(document.getElementById('e-adults')?.value || 0));
  const children = Math.max(0, Number(document.getElementById('e-children')?.value || 0));
  const pax = hasBreakdown
    ? (maleAdults > 0 ? maleAdults + '男' : '') + (femaleAdults > 0 ? femaleAdults + '女' : '') + (children > 0 ? children + '小' : '')
    : (adults > 0 ? adults + '大' : '') + (children > 0 ? children + '小' : '');
  const legacy = document.getElementById('e-pax');
  if (legacy) legacy.value = pax || '0大';
  return { adults, maleAdults, femaleAdults, children, pax: pax || '0大' };
}

function renderPaymentProof(o) {
  const proofUrl = (o && o.proofImageUrl) || '';
  const last5 = String(o && (o.last5 || o.accountLast5 || o.paymentLast5 || '') || '').replace(/\D/g, '').slice(-5);
  const empty = document.getElementById('e-proof-empty');
  const content = document.getElementById('e-proof-content');
  const img = document.getElementById('e-proof-image');
  const link = document.getElementById('e-proof-link');
  const imgLink = document.getElementById('e-proof-image-link');
  const last5Row = document.getElementById('e-proof-last5-row');
  const last5El = document.getElementById('e-proof-last5');
  if (!empty || !content) return;
  if (last5El) last5El.textContent = last5 || '—';
  if (last5Row) last5Row.classList.remove('hidden');
  if (!proofUrl) {
    empty.classList.remove('hidden');
    content.classList.add('hidden');
    if (link) link.classList.add('hidden');
    if (imgLink) imgLink.classList.add('hidden');
    if (img) img.removeAttribute('src');
    return;
  }
  empty.classList.add('hidden');
  content.classList.remove('hidden');
  if (img) {
    if (proofUrl) img.src = proofUrl;
    else img.removeAttribute('src');
  }
  if (link) {
    if (proofUrl) {
      link.href = proofUrl;
      link.classList.remove('hidden');
    } else {
      link.classList.add('hidden');
    }
  }
  if (imgLink) {
    imgLink.href = proofUrl;
    imgLink.classList.remove('hidden');
  }
}

// v2.6: 在編輯 modal 上方注入「為什麼這筆是異常」說明橫幅
function injectAnomalyWarning(o){
  const modalBox = document.querySelector('#edit-modal .modal-box');
  if(!modalBox) return;
  // 移掉舊的
  const old = document.getElementById('anomaly-banner'); if(old) old.remove();

  const reasons = [];
  if(!o.name) reasons.push('缺姓名');
  if(!isStoreRole() && !o.phone) reasons.push('缺電話');
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
  if(['pending_payment','pending_review'].includes(orderStatusOf(o)) && c) {
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
      '<div class="text-xs text-red-600 mt-2">建議處理方式：依上方 tab「訂單資訊 / 退款記錄」修正後按「儲存變更」。</div>'+
    '</div></div>';

  // 插在 header 後、tab bar 前
  const tabBar = modalBox.querySelector('.flex.gap-2.mb-5.flex-wrap');
  if(tabBar) modalBox.insertBefore(banner, tabBar);
  else modalBox.insertBefore(banner, modalBox.children[1]);
}
function closeModal() { document.getElementById('edit-modal').classList.add('hidden'); document.getElementById('edit-modal').classList.remove('store-modal'); document.body.style.overflow = ''; }
function switchTab(name, btn) {
  document.querySelectorAll('.edit-tab').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('#edit-modal .tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  if (btn) btn.classList.add('active');
}
function updateCalc() {
  const price = Number(document.getElementById('e-price').value) || 0;
  const hair = Number(document.getElementById('e-hair-fee').value) || 0;
  const makeup = Number(document.getElementById('e-makeup-fee').value) || 0;
  const photo = Number(document.getElementById('e-photo-fee').value) || 0;
  const paidDeposit = Number(document.getElementById('e-deposit').value) || 0;
  const refundAmount = Number(document.getElementById('e-refund-amt').value) || 0;
  const discountRefund = Number(document.getElementById('e-discount-refund-amount').value) || 0;
  const overtimeDamageDeduction = Number(document.getElementById('e-overtime-damage-deduction').value) || 0;
  const storeActualInput = document.getElementById('e-store-actual-received');
  const onsite = Math.max(0, price + hair + makeup + photo + overtimeDamageDeduction - discountRefund);
  const afterDep = Math.max(0, onsite - paidDeposit);
  if (storeActualInput && storeActualInput.dataset.autoMode === 'true') {
    storeActualInput.value = String(afterDep);
  }
  const storeActualReceived = Number(storeActualInput && storeActualInput.value) || 0;
  const storeBalance = Math.max(0, afterDep - storeActualReceived);
  const hideMoney = typeof shouldHideOrderMoney === 'function' && shouldHideOrderMoney(editingOrder);
  document.getElementById('e-deposit-display').textContent = '¥' + paidDeposit.toLocaleString();
  document.getElementById('calc-due').textContent = hideMoney ? '—' : (onsite ? fmtY0(onsite) : '—');
  document.getElementById('calc-net').textContent = onsite ? fmtY0(afterDep) : '—';
  document.getElementById('calc-store-balance').textContent = hideMoney ? '—' : fmtY0(storeBalance);
}

function markStoreActualReceivedManual() {
  const input = document.getElementById('e-store-actual-received');
  if (input) input.dataset.autoMode = 'false';
}
