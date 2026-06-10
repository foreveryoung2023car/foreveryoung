const STORE_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const minutes = index * 30;
  return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
});
let storeScheduleRows = [];

function storeTodayJst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function loadStoreSchedules() {
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
    const storeEl = document.getElementById('store-manage-store');
    const role = localStorage.getItem('admin_firebaseRole') || '';
    const previousStoreId = storeEl.value;
    storeEl.innerHTML = storeScheduleRows.map(row =>
      '<option value="' + adminEsc(row.id) + '">' + adminEsc(row.name) + '</option>'
    ).join('');
    if (storeScheduleRows.some(row => row.id === previousStoreId)) storeEl.value = previousStoreId;
    else if (storeScheduleRows[0]) storeEl.value = storeScheduleRows[0].id;
    storeEl.disabled = role === 'store_manager';
    renderSelectedStoreSchedule();
    loading.classList.add('hidden');
    editor.classList.remove('hidden');
  } catch (err) {
    loading.textContent = '載入失敗：' + adminEsc(err.message);
  }
}

function renderSelectedStoreSchedule() {
  const storeId = document.getElementById('store-manage-store').value;
  const row = storeScheduleRows.find(item => item.id === storeId);
  if (!row) return;
  document.getElementById('store-schedule-title').textContent = row.name + ' · ' + row.date;
  document.getElementById('store-schedule-status').textContent = row.hasOverride
    ? '此日期已有個別設定'
    : '此日期目前沿用店鋪預設';
  const selected = new Set(row.slots || []);
  document.getElementById('store-slot-grid').innerHTML = STORE_TIME_OPTIONS.map(slot =>
    '<label class="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ' + (selected.has(slot) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200') + '">' +
      '<input type="checkbox" name="store-slot" value="' + slot + '" ' + (selected.has(slot) ? 'checked' : '') + ' onchange="this.parentNode.classList.toggle(\'bg-blue-50\',this.checked);this.parentNode.classList.toggle(\'border-blue-200\',this.checked)">' +
      '<span class="font-mono text-sm font-bold">' + slot + '</span>' +
    '</label>'
  ).join('');
}

function selectedStoreSlots() {
  return Array.from(document.querySelectorAll('input[name="store-slot"]:checked')).map(input => input.value).sort();
}

function selectStoreSlots(checked) {
  document.querySelectorAll('input[name="store-slot"]').forEach(input => {
    input.checked = checked;
    input.dispatchEvent(new Event('change'));
  });
}

function restoreDefaultStoreSlots() {
  const storeId = document.getElementById('store-manage-store').value;
  const row = storeScheduleRows.find(item => item.id === storeId);
  const defaults = new Set((row && row.defaultSlots) || []);
  document.querySelectorAll('input[name="store-slot"]').forEach(input => {
    input.checked = defaults.has(input.value);
    input.dispatchEvent(new Event('change'));
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
      slots: selectedStoreSlots()
    });
    toast(mode === 'default' ? '店鋪預設時段已更新' : '指定日期時段已更新');
    await loadStoreSchedules();
  } catch (err) {
    alert('儲存失敗：' + err.message);
  } finally {
    button.disabled = false;
  }
}
