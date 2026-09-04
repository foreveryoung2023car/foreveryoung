let paymentSettingsRequest = 0;
let paymentSettingsLoadedPlatform = '';
let paymentSettingsSaving = false;

function setPaymentSettingsBusy(busy) {
  document.querySelectorAll('#sec-platform-management input, #sec-platform-management textarea, #sec-platform-management button').forEach(el => { el.disabled = busy; });
  const select = document.getElementById('payset-platform');
  if (select) select.disabled = paymentSettingsSaving;
}

function paysetNumber(id) {
  return Math.max(0, Math.round(Number(document.getElementById(id)?.value || 0)));
}

function canManagePaymentSettings() {
  return (localStorage.getItem('admin_firebaseRole') || '') === 'owner';
}

function paymentSettingsPayload() {
  return {
    brandPlatform: document.getElementById('payset-platform')?.value || currentBrandPlatform(),
    bankCode: document.getElementById('payset-bank-code')?.value.trim() || '',
    bankName: document.getElementById('payset-bank-name')?.value.trim() || '',
    bankBranch: document.getElementById('payset-bank-branch')?.value.trim() || '',
    bankAccount: document.getElementById('payset-bank-account')?.value.trim() || '',
    bankHolder: document.getElementById('payset-bank-holder')?.value.trim() || '',
    depositMaleTwd: paysetNumber('payset-male-twd'),
    depositFemaleTwd: paysetNumber('payset-female-twd'),
    depositChildTwd: paysetNumber('payset-child-twd'),
    depositMaleJpy: paysetNumber('payset-male-jpy'),
    depositFemaleJpy: paysetNumber('payset-female-jpy'),
    depositChildJpy: paysetNumber('payset-child-jpy'),
    paymentNote: document.getElementById('payset-note')?.value.trim() || '',
    enabled: !!document.getElementById('payset-enabled')?.checked
  };
}

function fillPaymentSettingsForm(profile) {
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value == null ? '' : value; };
  set('payset-bank-code', profile.bankCode || '');
  set('payset-bank-name', profile.bankName || '');
  set('payset-bank-branch', profile.bankBranch || '');
  set('payset-bank-account', profile.bankAccount || '');
  set('payset-bank-holder', profile.bankHolder || '');
  set('payset-note', profile.paymentNote || '');
  set('payset-male-twd', Number(profile.depositMaleTwd || 0));
  set('payset-female-twd', Number(profile.depositFemaleTwd || 0));
  set('payset-child-twd', Number(profile.depositChildTwd || 0));
  set('payset-male-jpy', Number(profile.depositMaleJpy || 0));
  set('payset-female-jpy', Number(profile.depositFemaleJpy || 0));
  set('payset-child-jpy', Number(profile.depositChildJpy || 0));
  const enabled = document.getElementById('payset-enabled');
  if (enabled) enabled.checked = profile.enabled !== false;
  renderPaymentSettingsPreview();
}

function renderPaymentSettingsPreview() {
  const p = paymentSettingsPayload();
  const preview = document.getElementById('payset-preview');
  if (!preview) return;
  preview.textContent = '男性 NT$' + p.depositMaleTwd.toLocaleString() + ' / 女性 NT$' + p.depositFemaleTwd.toLocaleString() + ' / 小孩 NT$' + p.depositChildTwd.toLocaleString() +
    '；日幣折抵：男 ¥' + p.depositMaleJpy.toLocaleString() + '、女 ¥' + p.depositFemaleJpy.toLocaleString() + '、小孩 ¥' + p.depositChildJpy.toLocaleString();
}

async function loadPaymentSettings() {
  const err = document.getElementById('payset-error');
  if (err) err.classList.add('hidden');
  if (paymentSettingsSaving) return;
  if (!useFirebaseAdmin()) return;
  if (!canManagePaymentSettings()) {
    if (typeof switchSection === 'function') switchSection('dashboard', document.querySelector('[data-sec="dashboard"]'));
    return;
  }
  const platform = document.getElementById('payset-platform')?.value || currentBrandPlatform();
  const request = ++paymentSettingsRequest;
  paymentSettingsLoadedPlatform = '';
  setPaymentSettingsBusy(true);
  try {
    const res = await callFirebaseAdminFunction('/getPaymentSettings?platform=' + encodeURIComponent(platform), null, { method: 'GET' });
    if (request !== paymentSettingsRequest) return;
    if (!res.profile || res.profile.brandPlatform !== platform) throw new Error('平台匯款設定不符，請重新載入');
    fillPaymentSettingsForm(res.profile);
    paymentSettingsLoadedPlatform = platform;
  } catch (e) {
    if (request !== paymentSettingsRequest) return;
    if (err) {
      err.textContent = e.message || '載入匯款設定失敗';
      err.classList.remove('hidden');
    }
  } finally {
    if (request === paymentSettingsRequest) {
      setPaymentSettingsBusy(false);
      document.getElementById('payset-save-btn').disabled = paymentSettingsLoadedPlatform !== platform;
    }
  }
}

async function savePaymentSettings() {
  const err = document.getElementById('payset-error');
  const btn = document.getElementById('payset-save-btn');
  if (err) err.classList.add('hidden');
  if (!canManagePaymentSettings()) {
    if (err) {
      err.textContent = '只有 owner 可修改匯款設定';
      err.classList.remove('hidden');
    }
    return;
  }
  if (paymentSettingsSaving) return;
  const payload = paymentSettingsPayload();
  if (paymentSettingsLoadedPlatform !== payload.brandPlatform) {
    if (err) { err.textContent = '請先成功載入此平台的匯款設定'; err.classList.remove('hidden'); }
    return;
  }
  if (!payload.bankCode || !payload.bankName || !payload.bankAccount || !payload.bankHolder) {
    if (err) {
      err.textContent = '請填完整銀行代碼、銀行名稱、匯款帳號與戶名';
      err.classList.remove('hidden');
    }
    return;
  }
  try {
    paymentSettingsSaving = true;
    setPaymentSettingsBusy(true);
    if (btn) { btn.disabled = true; btn.textContent = '儲存中…'; }
    const res = await callFirebaseAdminFunction('/savePaymentSettings', payload);
    fillPaymentSettingsForm(res.profile || payload);
    toast('匯款設定已儲存');
  } catch (e) {
    if (err) {
      err.textContent = e.message || '儲存匯款設定失敗';
      err.classList.remove('hidden');
    }
  } finally {
    paymentSettingsSaving = false;
    setPaymentSettingsBusy(false);
    if (btn) { btn.disabled = false; btn.textContent = '儲存設定'; }
  }
}

window.addEventListener('input', (event) => {
  if (event.target && String(event.target.id || '').indexOf('payset-') === 0) renderPaymentSettingsPreview();
});
