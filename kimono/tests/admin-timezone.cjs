const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
if (!process.env.TIMEZONE_TEST_CHILD) {
  for (const tz of ['Asia/Tokyo', 'Asia/Taipei', 'UTC', 'America/Los_Angeles', 'Europe/London']) {
    const result = spawnSync(process.execPath, [__filename], { env: { ...process.env, TZ: tz, TIMEZONE_TEST_CHILD: '1' }, encoding: 'utf8' });
    process.stdout.write(result.stdout); process.stderr.write(result.stderr);
    assert.equal(result.status, 0, tz);
  }
} else {
  for (const root of [path.resolve(__dirname, '..'), path.resolve(__dirname, '../../../japan-go')]) {
    const source = fs.readFileSync(root + '/admin-assets/03-ui-utils.js', 'utf8');
    const ctx = vm.createContext({});
    vm.runInContext(source.slice(source.indexOf('const KIMONO_TIME_ZONE')), ctx);
    for (const input of ['2026-09-18T15:30:00Z', '2026-09-19T00:30:00+09:00', '2026-09-19T00:30', '2026/09/19 上午 12:30']) {
      assert.equal(vm.runInContext(`fmtJST(${JSON.stringify(input)})`, ctx), '2026/09/19 00:30 (JST)');
      assert.equal(vm.runInContext(`dateTimeLocalValueJST(${JSON.stringify(input)})`, ctx), '2026-09-19T00:30');
    }
    assert.equal(vm.runInContext('fmtJST({seconds: Date.parse("2026-09-18T15:30:00Z") / 1000})', ctx), '2026/09/19 00:30 (JST)');
    assert.equal(vm.runInContext('fmtDate("2026-09-18T15:30:00Z")', ctx), '2026/09/19');
    vm.runInContext(fs.readFileSync(root + '/admin-assets/04-refunds.js', 'utf8'), ctx);
    assert.equal(vm.runInContext('fmtJSTDateTime("2026-09-18T15:30:00Z")', ctx), '2026/09/19 00:30');
    assert.equal(vm.runInContext('bookingMonth({bookingDate:"2026-09-30T15:30:00Z"})', ctx), '2026-10');
    vm.runInContext(`const NativeDate = Date; Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : ['2026-09-30T15:30:00Z'])); }
    };`, ctx);
    assert.equal(vm.runInContext('jstDateKey(nowAsJstLocalDate())', ctx), '2026-10-01');
    vm.runInContext(fs.readFileSync(root + '/admin-assets/01-state.js', 'utf8'), ctx);
    assert.equal(vm.runInContext('calCursor.getMonth()', ctx), 9);
    const elements = { 'weather-container': {}, 'weather-fetched-at': {} };
    ctx.document = { addEventListener() {}, getElementById: id => elements[id] };
    ctx.localStorage = { getItem: () => JSON.stringify({ ts: Date.parse('2026-09-18T15:30:00Z') }) };
    vm.runInContext(fs.readFileSync(root + '/admin-assets/13-weather.js', 'utf8'), ctx);
    vm.runInContext('renderWeather([])', ctx);
    elements['e-refund-date'] = {}; ctx.toast = () => {};
    vm.runInContext(fs.readFileSync(root + '/admin-assets/11-refunds-edit.js', 'utf8'), ctx);
    vm.runInContext('markRefundDone()', ctx);
    assert.equal(elements['e-refund-date'].value, '2026-10-01T00:30');
    assert.equal(elements['weather-fetched-at'].textContent, '09/19 00:30 (JST)');
  }
  console.log(process.env.TZ + ': booking, editing, midnight rollover, Firestore and weather PASS');
}
