const DATES = ['0326', '0327', '0328', '0329'];
const VEHICLES = 'date plate vid vtype depPt depTime retPt retTime outDepart outArrive retDepart retArrive'.split(' ');
const BOOKINGS = 'date orderNo name phone pax depPlate retPlate outStatus retStatus'.split(' ');
const STATUS = {confirm: '✅', absent: '❌', reset: ''};
const VEHICLE_ACTIONS = {
  out_depart: 'outDepart', out_arrive: 'outArrive',
  ret_depart: 'retDepart', ret_arrive: 'retArrive'
};

function setupSheets() {
  Object.entries({Vehicles: VEHICLES, Bookings: BOOKINGS}).forEach(([name, fields]) => {
    const db = database();
    if (db.getSheetByName(name)) return;
    const sheet = db.insertSheet(name);
    sheet.getRange(1, 1, sheet.getMaxRows(), fields.length).setNumberFormat('@');
    sheet.getRange(1, 1, 1, fields.length).setValues([fields]);
    sheet.setFrozenRows(1);
  });
}

function database() {
  return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
}

function table(name, fields) {
  const sheet = database().getSheetByName(name);
  const values = sheet.getDataRange().getDisplayValues();
  if (!fields.every((field, i) => values[0][i] === field)) {
    throw new Error('Invalid headers: ' + name);
  }
  const rows = values.slice(1).map((values, i) => Object.assign(
    {_row: i + 2}, Object.fromEntries(fields.map((field, j) => [field, values[j] || '']))
  )).filter(row => row.date);
  return {sheet, rows, fields};
}

function send(run) {
  let result;
  try {
    result = run();
  } catch (error) {
    console.error(error);
    result = {error: '伺服器暫時無法處理'};
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(event) {
  return send(() => event.parameter.action === 'findPassenger'
    ? readApi(event.parameter) : {error: '請使用 POST 請求'});
}

function doPost(event) {
  return send(() => {
    let input;
    try {
      input = JSON.parse(event.postData.contents);
    } catch (_) {
      return {error: '無效請求'};
    }
    if (!input || typeof input !== 'object') return {error: '無效請求'};
    if (['findCar', 'findPassenger', 'getPassengers', 'getDashboard'].includes(input.action)) {
      return readApi(input);
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const result = writeApi(input);
      SpreadsheetApp.flush();
      return result;
    } finally {
      lock.releaseLock();
    }
  });
}

function key(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/[\s\-‐－]/g, '');
}

function phoneKey(value) {
  return String(value || '').normalize('NFKC').replace(/\D/g, '');
}

function staffAllowed(input) {
  const secret = PropertiesService.getScriptProperties().getProperty('STAFF_KEY');
  return Boolean(secret && input.staffKey === secret);
}

function checkinToken(row) {
  const secret = PropertiesService.getScriptProperties().getProperty('CHECKIN_SECRET');
  if (!secret) throw new Error('Missing CHECKIN_SECRET');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(
    JSON.stringify([row.date, row.orderNo, phoneKey(row.phone), key(row.name)]), secret
  ));
}

function displayDate(date) {
  return date.slice(0, 2) + '/' + date.slice(2);
}

// The legacy pages render these fields into HTML. Encode display text at the API boundary.
function display(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function orderId(value) {
  return /^[\w.-]{1,80}$/.test(value);
}

function passenger(row) {
  return {
    orderNo: row.orderNo, name: display(row.name), pax: Number(row.pax) || 0,
    outStatus: statusValue(row.outStatus), retStatus: statusValue(row.retStatus)
  };
}

function statusValue(value) {
  return value === STATUS.confirm || value === STATUS.absent ? value : '';
}

function vehicle(row) {
  const result = Object.fromEntries(VEHICLES.map(field => [field, display(row[field])]));
  result.plate = row.plate; // Plate values are restricted before serializing.
  result.date = displayDate(row.date);
  return result;
}

function plateValid(plate) {
  return /^[\p{L}\p{N}・･· .－‐-]{1,40}$/u.test(plate);
}

function readApi(input) {
  const action = input.action;
  if (!['findCar', 'findPassenger', 'getPassengers', 'getDashboard'].includes(action)) {
    return {error: '不支援的操作'};
  }
  if (action !== 'findPassenger' && !staffAllowed(input)) return {error: '請輸入工作人員通行碼'};
  if (['getPassengers', 'getDashboard'].includes(action) && !DATES.includes(input.date)) {
    return {error: '無效日期'};
  }

  const cars = table('Vehicles', VEHICLES).rows.filter(row =>
    DATES.includes(row.date) && plateValid(row.plate));
  if (action === 'findCar') {
    const num = key(input.num);
    const results = cars.filter(row => num && (
      key(row.plate) === num || key(row.plate).match(/\d+$/)?.[0] === num
    )).map(vehicle);
    return results.length ? {results} : {error: '查無車輛'};
  }

  const bookings = table('Bookings', BOOKINGS).rows.filter(row =>
    DATES.includes(row.date) && orderId(row.orderNo));
  if (action === 'findPassenger') {
    const phone = phoneKey(input.phone);
    const name = key(input.name);
    const matched = bookings.filter(row => phone && name &&
      phoneKey(row.phone) === phone && key(row.name) === name);
    const passengers = new Map();
    for (const row of matched) {
      if (!passengers.has(row.orderNo)) passengers.set(row.orderNo, {...passenger(row), bookings: []});
      const dep = cars.find(car => car.date === row.date && key(car.plate) === key(row.depPlate));
      const ret = cars.find(car => car.date === row.date && key(car.plate) === key(row.retPlate));
      passengers.get(row.orderNo).bookings.push({
        date: displayDate(row.date), depPlate: dep?.plate || '', retPlate: ret?.plate || '',
        depVid: display(dep?.vid), retVid: display(ret?.vid), depPt: display(dep?.depPt),
        depTime: display(dep?.depTime), retTime: display(ret?.retTime),
        outStatus: statusValue(row.outStatus), retStatus: statusValue(row.retStatus),
        checkinToken: checkinToken(row)
      });
    }
    return {passengers: [...passengers.values()]};
  }

  const dayCars = cars.filter(row => row.date === input.date);
  const dayBookings = bookings.filter(row => row.date === input.date);
  const manifest = (car, field) => dayBookings
    .filter(row => key(row[field]) === key(car.plate)).map(passenger);
  const total = rows => rows.reduce((sum, row) => sum + row.pax, 0);
  const confirmed = (rows, field) => total(rows.filter(row => row[field] === STATUS.confirm));

  if (action === 'getPassengers') {
    const car = dayCars.find(row => key(row.plate) === key(input.car));
    const depPassengers = car ? manifest(car, 'depPlate') : [];
    const retPassengers = car ? manifest(car, 'retPlate') : [];
    return {
      depInfo: car?.depPt ? vehicle(car) : null, retInfo: car?.retPt ? {...vehicle(car), depPt: ''} : null,
      depPassengers, retPassengers,
      summary: {
        depTotal: total(depPassengers), retTotal: total(retPassengers),
        outConfirmed: confirmed(depPassengers, 'outStatus'),
        retConfirmed: confirmed(retPassengers, 'retStatus')
      }
    };
  }

  const depCars = dayCars.filter(car => car.depPt).map(car => {
    const passengers = manifest(car, 'depPlate');
    return {...vehicle(car), passengers, totalPax: total(passengers),
      outConfirmed: confirmed(passengers, 'outStatus')};
  });
  const retCars = dayCars.filter(car => car.retPt).map(car => {
    const passengers = manifest(car, 'retPlate');
    return {...vehicle(car), depPt: display(car.retPt), passengers, totalPax: total(passengers),
      retConfirmed: confirmed(passengers, 'retStatus')};
  });
  const sum = (cars, field) => cars.reduce((n, car) => n + car[field], 0);
  const depTotal = sum(depCars, 'totalPax');
  const retTotal = sum(retCars, 'totalPax');
  const depConfirmed = sum(depCars, 'outConfirmed');
  const retConfirmed = sum(retCars, 'retConfirmed');
  return {depCars, retCars, summary: {
    depTotal, retTotal, depConfirmed, retConfirmed,
    depPending: depTotal - depConfirmed, retPending: retTotal - retConfirmed
  }};
}

function writeApi(input) {
  if (!DATES.includes(input.date)) return {error: '無效日期'};
  const action = typeof input.action === 'string' ? input.action : '';
  const staff = staffAllowed(input);
  if (Object.prototype.hasOwnProperty.call(STATUS, action)) {
    if (!staff && (action !== 'confirm' || !input.checkinToken)) return {error: '沒有操作權限'};
    if (!['outbound', 'return'].includes(input.trip)) return {error: '無效行程'};
    const bookings = table('Bookings', BOOKINGS);
    const row = bookings.rows.find(row => row.date === input.date && row.orderNo === input.orderNo);
    if (!row || (!staff && checkinToken(row) !== input.checkinToken)) return {error: '無法確認訂單'};
    const outbound = input.trip === 'outbound';
    if (!row[outbound ? 'depPlate' : 'retPlate']) return {error: '訂單未分配此行程'};
    if (!staff && Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd') !== '2026' + row.date) {
      return {error: '僅可在乘車當日報到'};
    }
    updateCell(bookings, row, outbound ? 'outStatus' : 'retStatus', STATUS[action]);
    return {success: true};
  }

  const clear = action.endsWith('_clr');
  const base = clear ? action.slice(0, -4) : action;
  if (!Object.prototype.hasOwnProperty.call(VEHICLE_ACTIONS, base)) return {error: '不支援的操作'};
  if (!staff) return {error: '沒有操作權限'};
  const vehicles = table('Vehicles', VEHICLES);
  const row = vehicles.rows.find(row => row.date === input.date && key(row.plate) === key(input.car));
  if (!row || !row[base.startsWith('out_') ? 'depPt' : 'retPt']) return {error: '查無車輛行程'};
  if (!clear && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return {error: '無效時間'};
  updateCell(vehicles, row, VEHICLE_ACTIONS[base], clear ? '' : input.time);
  return {success: true};
}

function updateCell(table, row, field, value) {
  table.sheet.getRange(row._row, table.fields.indexOf(field) + 1).setValue(value);
}
