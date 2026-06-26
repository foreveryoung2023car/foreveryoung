const STORE_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const minutes = index * 30;
  return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
});
let storeScheduleRows = [];
let canCreateStore = false;
let creatingStore = false;
const DEFAULT_STORE_SLOT_CAPACITY = 10;

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
    loading.classList.add('hidden');
    editor.classList.remove('hidden');
  } catch (err) {
    loading.textContent = '載入失敗：' + adminEsc(err.message);
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
    '<span class="flex items-center justify-between gap-1">' +
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
  const button = document.getElementById('save-store-info-btn');
  button.disabled = true;
  error.classList.add('hidden');
  try {
    await callFirebaseAdminFunction('/saveStore', {
      id,
      name,
      address: document.getElementById('store-edit-address').value.trim(),
      phone: document.getElementById('store-edit-phone').value.trim(),
      create: creatingStore
    });
    closeStoreEditor();
    toast(creatingStore ? '店鋪已新增' : '店鋪信息已更新');
    await loadStoreSchedules(id);
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
    await loadStoreSchedules(storeId);
  } catch (err) {
    alert('儲存失敗：' + err.message);
  } finally {
    button.disabled = false;
  }
}
