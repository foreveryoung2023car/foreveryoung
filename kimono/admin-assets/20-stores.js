const STORE_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const minutes = index * 30;
  return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
});
let storeScheduleRows = [];
let canCreateStore = false;
let creatingStore = false;
let discountCouponRows = [];
const DEFAULT_STORE_SLOT_CAPACITY = 10;
const DEFAULT_STORE_SERVICE_OPTIONS = {
  hair: [
    { value: 'No', label: '不需要髮型設計', feeJpy: 0 },
    { value: 'Yes', label: '需要髮型設計 (+1500 JPY)', feeJpy: 1500 }
  ],
  makeup: [
    { value: 'No', label: '不需要化妝', feeJpy: 0 },
    { value: 'Basic', label: '基礎化妝 (+3000 JPY)', feeJpy: 3000 },
    { value: 'Standard', label: '精緻化妝 (+5000 JPY)', feeJpy: 5000 },
    { value: 'Premium', label: '高級化妝 (+8000 JPY)', feeJpy: 8000 }
  ],
  photo: [
    { value: 'No', label: '不需要攝影', feeJpy: 0 },
    { value: 'Yes', label: '需要專業攝影', feeJpy: 0 }
  ]
};

function storeTodayJst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function loadStoreSchedules(preferredStoreId) {
  const dateEl = document.getElementById('store-manage-date');
  const loading = document.getElementById('store-schedule-loading');
  const editor = document.getElementById('store-schedule-editor');
  if (!dateEl) return;
  if (!dateEl.value) dateEl.value = storeTodayJst();
  loading.classList.remove('hidden');
  loading.textContent = '載入營業時段中...';
  editor.classList.add('hidden');
  try {
    const data = await callFirebaseAdminFunction('/listStoreSchedules?date=' + encodeURIComponent(dateEl.value), null, { method: 'GET' });
    storeScheduleRows = data.stores || [];
    canCreateStore = data.canCreateStore === true;
    const storeEl = document.getElementById('store-manage-store');
    const role = localStorage.getItem('admin_firebaseRole') || '';
    const previousStoreId = preferredStoreId || storeEl.value;
    storeEl.innerHTML = storeScheduleRows.map(row =>
      '<option value="' + adminEsc(row.id) + '">' + adminEsc(row.name) + ' (' + adminEsc(row.id) + ')</option>'
    ).join('');
    if (storeScheduleRows.some(row => row.id === previousStoreId)) storeEl.value = previousStoreId;
    else if (storeScheduleRows[0]) storeEl.value = storeScheduleRows[0].id;
    storeEl.disabled = role === 'store_manager' && !!currentStoreKey;
    document.getElementById('add-store-btn').classList.toggle('hidden', !canCreateStore);
    const employeeStoreEl = document.getElementById('new-emp-store');
    if (employeeStoreEl && canCreateStore) {
      const selectedEmployeeStore = employeeStoreEl.value;
      employeeStoreEl.innerHTML = '<option value="">不綁定（全局）</option>' + storeScheduleRows.map(row =>
        '<option value="' + adminEsc(row.id) + '">' + adminEsc(row.name) + ' (' + adminEsc(row.id) + ')</option>'
      ).join('');
      if (storeScheduleRows.some(row => row.id === selectedEmployeeStore)) employeeStoreEl.value = selectedEmployeeStore;
    }
    renderSelectedStoreSchedule();
    await loadDiscountCoupons();
    loading.classList.add('hidden');
    editor.classList.remove('hidden');
  } catch (err) {
    loading.textContent = '載入失敗：' + adminEsc(err.message);
  }
}

function canManageDiscountCoupons() {
  const role = localStorage.getItem('admin_firebaseRole') || '';
  return role === 'owner' || role === 'admin';
}

async function loadDiscountCoupons() {
  const panel = document.getElementById('discount-coupon-management');
  if (!panel) return;
  if (!canManageDiscountCoupons()) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  renderDiscountCouponStoreOptions([]);
  try {
    const data = await callFirebaseAdminFunction('/listDiscountCoupons', null, { method: 'GET' });
    discountCouponRows = data.coupons || [];
    renderDiscountCouponList();
  } catch (err) {
    document.getElementById('discount-coupon-list').innerHTML =
      '<div class="text-sm text-red-600">优惠码载入失败：' + adminEsc(err.message) + '</div>';
  }
}

function renderDiscountCouponList() {
  const list = document.getElementById('discount-coupon-list');
  if (!list) return;
  if (!discountCouponRows.length) {
    list.innerHTML = '<div class="text-sm text-slate-400">尚未设置优惠码。</div>';
    return;
  }
  list.innerHTML = discountCouponRows.map(coupon => {
    const stores = (coupon.storeIds || []).map(storeId => {
      const store = storeScheduleRows.find(row => row.id === storeId);
      return store ? store.name : storeId;
    }).join('、');
    const dateRange = coupon.startDate && coupon.endDate
      ? coupon.startDate + ' ～ ' + coupon.endDate
      : '尚未设置起讫日期';
    const statusLabel = !coupon.startDate || !coupon.endDate
      ? '待补日期'
      : (coupon.active ? '启用中' : '已停用');
    const statusClass = !coupon.startDate || !coupon.endDate
      ? 'text-amber-600'
      : (coupon.active ? 'text-emerald-600' : 'text-slate-400');
    return '<div class="rounded-xl border border-slate-200 bg-white p-3">' +
      '<button type="button" onclick="editDiscountCoupon(\'' + adminJsArg(coupon.code) + '\')" class="w-full text-left hover:opacity-80">' +
      '<div class="flex justify-between gap-2"><strong class="text-[#1A365D]">' + adminEsc(coupon.code) + '</strong>' +
      '<span class="text-xs font-bold ' + statusClass + '">' + statusLabel + '</span></div>' +
      '<div class="text-sm font-bold text-pink-700 mt-1">' + Number(coupon.discountRate).toLocaleString() + ' 折</div>' +
      '<div class="text-xs text-slate-500 mt-1">' + adminEsc(stores || '未指定店铺') + '</div>' +
      '<div class="text-xs text-slate-500 mt-1">📅 ' + adminEsc(dateRange) + '</div></button>' +
      '<div class="flex gap-2 mt-3 pt-3 border-t border-slate-100">' +
      '<button type="button" onclick="setDiscountCouponActive(\'' + adminJsArg(coupon.code) + '\',' + (!coupon.active) + ')" ' +
      'class="flex-1 px-2 py-1.5 rounded-lg text-xs font-bold ' + (coupon.active ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700') + '">' +
      (coupon.active ? '停用' : '启用') + '</button>' +
      '<button type="button" onclick="deleteDiscountCoupon(\'' + adminJsArg(coupon.code) + '\')" ' +
      'class="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold">删除</button></div></div>';
  }).join('');
}

function renderDiscountCouponStoreOptions(selectedStoreIds) {
  const wrap = document.getElementById('discount-coupon-store-options');
  if (!wrap) return;
  const selected = new Set(selectedStoreIds || []);
  wrap.innerHTML = storeScheduleRows.map(store =>
    '<label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">' +
    '<input type="checkbox" name="discount-coupon-store" value="' + adminEsc(store.id) + '"' +
    (selected.has(store.id) ? ' checked' : '') + '>' +
    '<span class="font-semibold">' + adminEsc(store.name) + '</span></label>'
  ).join('');
}

function newDiscountCoupon() {
  document.getElementById('discount-coupon-code').value = '';
  document.getElementById('discount-coupon-code').disabled = false;
  document.getElementById('discount-coupon-rate').value = '';
  document.getElementById('discount-coupon-start-date').value = storeTodayJst();
  document.getElementById('discount-coupon-end-date').value = '';
  document.getElementById('discount-coupon-active').checked = true;
  document.getElementById('discount-coupon-error').classList.add('hidden');
  renderDiscountCouponStoreOptions([]);
  document.getElementById('discount-coupon-code').focus();
}

function editDiscountCoupon(code) {
  const coupon = discountCouponRows.find(item => item.code === code);
  if (!coupon) return;
  const codeEl = document.getElementById('discount-coupon-code');
  codeEl.value = coupon.code;
  codeEl.disabled = true;
  document.getElementById('discount-coupon-rate').value = coupon.discountRate;
  document.getElementById('discount-coupon-start-date').value = coupon.startDate || '';
  document.getElementById('discount-coupon-end-date').value = coupon.endDate || '';
  document.getElementById('discount-coupon-active').checked = coupon.active !== false;
  document.getElementById('discount-coupon-error').classList.add('hidden');
  renderDiscountCouponStoreOptions(coupon.storeIds || []);
}

async function saveDiscountCoupon() {
  const code = document.getElementById('discount-coupon-code').value.trim().toUpperCase();
  const discountRate = Number(document.getElementById('discount-coupon-rate').value);
  const startDate = document.getElementById('discount-coupon-start-date').value;
  const endDate = document.getElementById('discount-coupon-end-date').value;
  const storeIds = Array.from(document.querySelectorAll('input[name="discount-coupon-store"]:checked')).map(input => input.value);
  const error = document.getElementById('discount-coupon-error');
  if (!/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(code)) {
    error.textContent = '优惠码需为 2–32 位英文字母、数字、底线或连字号。';
    error.classList.remove('hidden');
    return;
  }
  if (!(discountRate > 0 && discountRate < 10)) {
    error.textContent = '折数必须大于 0 且小于 10，例如 9 代表 9 折。';
    error.classList.remove('hidden');
    return;
  }
  if (!startDate || !endDate) {
    error.textContent = '请设置优惠码的开始日期与结束日期。';
    error.classList.remove('hidden');
    return;
  }
  if (startDate > endDate) {
    error.textContent = '结束日期不能早于开始日期。';
    error.classList.remove('hidden');
    return;
  }
  if (!storeIds.length) {
    error.textContent = '请至少选择一个适用店铺。';
    error.classList.remove('hidden');
    return;
  }
  const button = document.getElementById('save-discount-coupon-btn');
  button.disabled = true;
  error.classList.add('hidden');
  try {
    const data = await callFirebaseAdminFunction('/saveDiscountCoupon', {
      code,
      discountRate,
      storeIds,
      startDate,
      endDate,
      active: document.getElementById('discount-coupon-active').checked
    });
    const index = discountCouponRows.findIndex(item => item.code === code);
    if (index >= 0) discountCouponRows[index] = data.coupon;
    else discountCouponRows.push(data.coupon);
    discountCouponRows.sort((a, b) => a.code.localeCompare(b.code));
    renderDiscountCouponList();
    editDiscountCoupon(code);
    toast('优惠码已储存');
  } catch (err) {
    error.textContent = '储存失败：' + err.message;
    error.classList.remove('hidden');
  } finally {
    button.disabled = false;
  }
}

async function setDiscountCouponActive(code, active) {
  try {
    const data = await callFirebaseAdminFunction('/setDiscountCouponActive', { code, active });
    const index = discountCouponRows.findIndex(item => item.code === code);
    if (index >= 0) discountCouponRows[index] = data.coupon;
    renderDiscountCouponList();
    if (document.getElementById('discount-coupon-code').value === code) editDiscountCoupon(code);
    toast(active ? '优惠码已启用' : '优惠码已停用');
  } catch (err) {
    alert((active ? '启用' : '停用') + '失败：' + err.message);
  }
}

async function deleteDiscountCoupon(code) {
  if (!confirm('确定删除优惠码「' + code + '」？删除后无法恢复。')) return;
  try {
    await callFirebaseAdminFunction('/deleteDiscountCoupon', { code });
    discountCouponRows = discountCouponRows.filter(item => item.code !== code);
    renderDiscountCouponList();
    if (document.getElementById('discount-coupon-code').value === code) newDiscountCoupon();
    toast('优惠码已删除');
  } catch (err) {
    alert('删除失败：' + err.message);
  }
}

function selectedStoreRow() {
  const storeEl = document.getElementById('store-manage-store');
  return storeEl ? storeScheduleRows.find(item => item.id === storeEl.value) : null;
}

function renderSelectedStoreSchedule() {
  const row = selectedStoreRow();
  if (!row) return;
  document.getElementById('store-info-name').textContent = row.name || row.id;
  document.getElementById('store-info-id').textContent = row.id;
  document.getElementById('store-info-address').textContent = row.address || '尚未設定地址';
  document.getElementById('store-info-phone').textContent = row.phone || '尚未設定電話';
  const serviceSummary = document.getElementById('store-info-services');
  if (serviceSummary) serviceSummary.textContent = storeServiceOptionsSummary(row.serviceOptions);
  document.getElementById('store-schedule-title').textContent = row.name + ' · ' + row.date;
  document.getElementById('store-schedule-status').textContent = row.hasOverride
    ? '此日期已有個別設定'
    : '此日期目前沿用店鋪預設';
  const selected = new Set(row.slots || []);
  const capacities = row.slotCapacities || row.defaultSlotCapacities || {};
  const usageBySlot = {};
  (row.slotAvailability || []).forEach(item => {
    if (item && item.slot) usageBySlot[item.slot] = item.used || {};
  });
  document.getElementById('store-slot-grid').innerHTML = STORE_TIME_OPTIONS.map(slot =>
    renderStoreSlotEditor(slot, selected.has(slot), capacities[slot], usageBySlot[slot])
  ).join('');
}

function normalizeStoreServiceOptions(options) {
  const source = options && typeof options === 'object' ? options : {};
  return {
    hair: normalizeStoreServiceOptionList(source.hair, DEFAULT_STORE_SERVICE_OPTIONS.hair),
    makeup: normalizeStoreServiceOptionList(source.makeup, DEFAULT_STORE_SERVICE_OPTIONS.makeup),
    photo: normalizeStoreServiceOptionList(source.photo, DEFAULT_STORE_SERVICE_OPTIONS.photo)
  };
}

function normalizeStoreServiceOptionList(options, fallback) {
  const seen = new Set();
  const out = (Array.isArray(options) ? options : []).map(item => ({
    value: String(item && item.value || '').trim(),
    label: String(item && item.label || '').trim(),
    feeJpy: Math.max(0, Math.round(Number(item && item.feeJpy || 0) || 0))
  })).filter(item => {
    if (!item.value || !item.label || seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });
  return out.length ? out : fallback.map(item => ({ ...item }));
}

function storeServiceOptionsSummary(options) {
  const normalized = normalizeStoreServiceOptions(options);
  return '髮型 ' + normalized.hair.length + ' 項 · 化妝 ' + normalized.makeup.length + ' 項 · 攝影 ' + normalized.photo.length + ' 項';
}

function renderServiceOptionsEditor(kind, options) {
  const container = document.getElementById('store-edit-' + kind + '-options');
  if (!container) return;
  container.innerHTML = (options || []).map(renderServiceOptionRow).join('');
}

function renderServiceOptionRow(item) {
  return '<div class="grid grid-cols-[1fr_110px_34px] gap-2 items-center" data-store-service-option-row data-service-value="' + adminEsc(item.value || '') + '">' +
    '<input data-service-field="label" class="input-field w-full px-2 py-1.5 text-sm" maxlength="120" placeholder="顯示文字" value="' + adminEsc(item.label || '') + '">' +
    '<input data-service-field="feeJpy" class="input-field w-full px-2 py-1.5 text-sm font-mono text-right" type="number" min="0" step="1" placeholder="0" value="' + Number(item.feeJpy || 0) + '">' +
    '<button type="button" onclick="removeStoreServiceOption(this)" class="h-9 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200" aria-label="刪除選項">×</button>' +
  '</div>';
}

function addStoreServiceOption(kind) {
  const container = document.getElementById('store-edit-' + kind + '-options');
  if (!container) return;
  container.insertAdjacentHTML('beforeend', renderServiceOptionRow({ value: '', label: '', feeJpy: 0 }));
  const row = container.querySelector('[data-store-service-option-row]:last-child');
  if (row) row.querySelector('[data-service-field="label"]').focus();
}

function removeStoreServiceOption(button) {
  const row = button && button.closest('[data-store-service-option-row]');
  const container = row && row.parentElement;
  if (!row || !container) return;
  if (container.querySelectorAll('[data-store-service-option-row]').length <= 1) {
    row.querySelectorAll('input').forEach(input => { input.value = input.dataset.serviceField === 'feeJpy' ? '0' : ''; });
    row.dataset.serviceValue = '';
    row.querySelector('[data-service-field="label"]').focus();
    return;
  }
  row.remove();
}

function isNoNeedServiceLabel(label) {
  return /^(no|不需要|不要|不用|無|无|なし|不要)/i.test(String(label || '').trim());
}

function generatedServiceValue(kind, label, index, usedValues) {
  if (isNoNeedServiceLabel(label) && !usedValues.has('No')) return 'No';
  let base = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!base) base = kind + '_' + (index + 1);
  let value = base;
  let suffix = 2;
  while (usedValues.has(value) || value === 'No') {
    value = base + '_' + suffix;
    suffix += 1;
  }
  return value;
}

function parseServiceOptionsRows(kind, label) {
  const container = document.getElementById('store-edit-' + kind + '-options');
  const rows = Array.from(container ? container.querySelectorAll('[data-store-service-option-row]') : []);
  if (!rows.length) throw new Error(label + '至少需要 1 個選項。');
  const usedValues = new Set();
  const usedLabels = new Set();
  const options = rows.map((row, index) => {
    const optionLabel = row.querySelector('[data-service-field="label"]').value.trim();
    const feeJpy = Math.max(0, Math.round(Number(row.querySelector('[data-service-field="feeJpy"]').value || 0) || 0));
    if (!optionLabel) throw new Error(label + '第 ' + (index + 1) + ' 行缺少顯示文字。');
    if (usedLabels.has(optionLabel)) throw new Error(label + '的「' + optionLabel + '」重複。');
    usedLabels.add(optionLabel);
    const storedValue = String(row.dataset.serviceValue || '').trim();
    const shouldUseNo = isNoNeedServiceLabel(optionLabel) && !usedValues.has('No');
    const canReuseStored = storedValue && storedValue !== 'No' && !usedValues.has(storedValue);
    const value = shouldUseNo ? 'No' : (canReuseStored ? storedValue : generatedServiceValue(kind, optionLabel, index, usedValues));
    usedValues.add(value);
    return { value, label: optionLabel, feeJpy };
  }).filter(item => item.value && item.label);
  if (!options.length) throw new Error(label + '至少需要 1 個選項。');
  return options;
}

function storeSlotCapacityValue(capacity, key) {
  const val = Number(capacity && capacity[key]);
  return Number.isFinite(val) && val >= 0 ? val : DEFAULT_STORE_SLOT_CAPACITY;
}

function storeSlotUsageValue(usage, key) {
  const val = Number(usage && usage[key]);
  return Number.isFinite(val) && val >= 0 ? val : 0;
}

function renderCapacityField(slot, type, label, capacity, usage) {
  return '<label>' +
    '<span class="flex items-center gap-2">' +
      '<span>' + label + '</span>' +
      '<span class="text-[10px] text-slate-400">已約 ' + storeSlotUsageValue(usage, type) + '</span>' +
    '</span>' +
    '<input name="store-slot-capacity" data-slot="' + slot + '" data-type="' + type + '" type="number" min="0" step="1" value="' + storeSlotCapacityValue(capacity, type) + '" class="w-full mt-1 px-1 py-1 border border-slate-200 rounded font-mono text-xs">' +
  '</label>';
}

function renderStoreSlotEditor(slot, checked, capacity, usage) {
  return '<div class="p-3 border rounded-lg ' + (checked ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200') + '" data-store-slot-row="' + slot + '">' +
    '<label class="flex items-center gap-2 cursor-pointer mb-2">' +
      '<input type="checkbox" name="store-slot" value="' + slot + '" ' + (checked ? 'checked' : '') + ' onchange="toggleStoreSlotRow(this)">' +
      '<span class="font-mono text-sm font-bold">' + slot + '</span>' +
    '</label>' +
    '<div class="grid grid-cols-3 gap-1 text-[10px] text-slate-500 font-bold">' +
      renderCapacityField(slot, 'maleAdults', '男', capacity, usage) +
      renderCapacityField(slot, 'femaleAdults', '女', capacity, usage) +
      renderCapacityField(slot, 'children', '小', capacity, usage) +
    '</div>' +
  '</div>';
}

function toggleStoreSlotRow(input) {
  const row = input.closest('[data-store-slot-row]');
  if (!row) return;
  row.classList.toggle('bg-blue-50', input.checked);
  row.classList.toggle('border-blue-200', input.checked);
  row.classList.toggle('bg-white', !input.checked);
  row.classList.toggle('border-slate-200', !input.checked);
}

function openStoreEditor(create) {
  const row = selectedStoreRow();
  if (!create && !row) return;
  if (create && !canCreateStore) return;
  creatingStore = !!create;
  document.getElementById('store-editor-title').textContent = create ? '新增店鋪' : '編輯店鋪信息';
  const idEl = document.getElementById('store-edit-id');
  idEl.value = create ? '' : row.id;
  idEl.disabled = !create;
  document.getElementById('store-edit-name').value = create ? '' : (row.name || '');
  document.getElementById('store-edit-address').value = create ? '' : (row.address || '');
  document.getElementById('store-edit-phone').value = create ? '' : (row.phone || '');
  const options = normalizeStoreServiceOptions(create ? null : row.serviceOptions);
  renderServiceOptionsEditor('hair', options.hair);
  renderServiceOptionsEditor('makeup', options.makeup);
  renderServiceOptionsEditor('photo', options.photo);
  document.getElementById('store-editor-error').classList.add('hidden');
  document.getElementById('store-editor-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById(create ? 'store-edit-id' : 'store-edit-name').focus(), 0);
}

function closeStoreEditor() {
  document.getElementById('store-editor-modal').classList.add('hidden');
}

async function saveStoreInfo() {
  const id = document.getElementById('store-edit-id').value.trim();
  const name = document.getElementById('store-edit-name').value.trim();
  const error = document.getElementById('store-editor-error');
  if (!/^[a-z0-9][a-z0-9_-]{1,31}$/.test(id)) {
    error.textContent = '店鋪代號需為 2–32 位小寫英數字、底線或連字號。';
    error.classList.remove('hidden');
    return;
  }
  if (!name) {
    error.textContent = '請輸入店鋪名稱。';
    error.classList.remove('hidden');
    return;
  }
  let serviceOptions;
  try {
    serviceOptions = {
      hair: parseServiceOptionsRows('hair', '髮型設計'),
      makeup: parseServiceOptionsRows('makeup', '化妝造型'),
      photo: parseServiceOptionsRows('photo', '攝影方案')
    };
  } catch (err) {
    error.textContent = err.message;
    error.classList.remove('hidden');
    return;
  }
  const button = document.getElementById('save-store-info-btn');
  button.disabled = true;
  error.classList.add('hidden');
  try {
    await callFirebaseAdminFunction('/saveStore', {
      id,
      name,
      address: document.getElementById('store-edit-address').value.trim(),
      phone: document.getElementById('store-edit-phone').value.trim(),
      serviceOptions,
      create: creatingStore
    });
    const existingIndex = storeScheduleRows.findIndex(row => row.id === id);
    const nextRow = Object.assign({}, existingIndex >= 0 ? storeScheduleRows[existingIndex] : {
      id,
      date: document.getElementById('store-manage-date')?.value || storeTodayJst(),
      slots: [],
      defaultSlots: [],
      slotCapacities: {},
      defaultSlotCapacities: {}
    }, {
      id,
      name,
      address: document.getElementById('store-edit-address').value.trim(),
      phone: document.getElementById('store-edit-phone').value.trim(),
      serviceOptions
    });
    if (existingIndex >= 0) storeScheduleRows[existingIndex] = nextRow;
    else storeScheduleRows.push(nextRow);
    closeStoreEditor();
    toast(creatingStore ? '店鋪已新增' : '店鋪信息已更新');
    const storeEl = document.getElementById('store-manage-store');
    if (storeEl) {
      const selected = storeEl.value;
      storeEl.innerHTML = storeScheduleRows.map(row =>
        '<option value="' + adminEsc(row.id) + '">' + adminEsc(row.name) + ' (' + adminEsc(row.id) + ')</option>'
      ).join('');
      storeEl.value = storeScheduleRows.some(row => row.id === id) ? id : selected;
    }
    renderSelectedStoreSchedule();
    setTimeout(() => loadStoreSchedules(id), 500);
  } catch (err) {
    error.textContent = '儲存失敗：' + err.message;
    error.classList.remove('hidden');
  } finally {
    button.disabled = false;
  }
}

function selectedStoreSlots() {
  return Array.from(document.querySelectorAll('input[name="store-slot"]:checked')).map(input => input.value).sort();
}

function selectedStoreSlotCapacities() {
  const selected = new Set(selectedStoreSlots());
  const capacities = {};
  document.querySelectorAll('input[name="store-slot-capacity"]').forEach(input => {
    const slot = input.dataset.slot;
    const type = input.dataset.type;
    if (!selected.has(slot) || !type) return;
    if (!capacities[slot]) capacities[slot] = { maleAdults: 0, femaleAdults: 0, children: 0 };
    capacities[slot][type] = Math.max(0, Number(input.value || 0));
  });
  return capacities;
}

function selectStoreSlots(checked) {
  document.querySelectorAll('input[name="store-slot"]').forEach(input => {
    input.checked = checked;
    toggleStoreSlotRow(input);
  });
}

function restoreDefaultStoreSlots() {
  const row = selectedStoreRow();
  const defaults = new Set((row && row.defaultSlots) || []);
  document.querySelectorAll('input[name="store-slot"]').forEach(input => {
    input.checked = defaults.has(input.value);
    toggleStoreSlotRow(input);
  });
}

async function saveStoreSlots(mode) {
  const storeId = document.getElementById('store-manage-store').value;
  const date = document.getElementById('store-manage-date').value;
  const button = document.getElementById(mode === 'default' ? 'save-store-default-btn' : 'save-store-date-btn');
  const message = mode === 'default'
    ? '確定更新此店預設時段？未個別設定的日期都會套用。'
    : '確定儲存 ' + date + ' 的營業時段？';
  if (!confirm(message)) return;
  button.disabled = true;
  try {
    await callFirebaseAdminFunction('/saveStoreSchedule', {
      storeId,
      mode,
      date,
      slots: selectedStoreSlots(),
      slotCapacities: selectedStoreSlotCapacities()
    });
    toast(mode === 'default' ? '店鋪預設時段已更新' : '指定日期時段已更新');
    setTimeout(() => loadStoreSchedules(storeId), 500);
  } catch (err) {
    alert('儲存失敗：' + err.message);
  } finally {
    button.disabled = false;
  }
}
