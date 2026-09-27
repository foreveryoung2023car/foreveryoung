const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');const path=require('node:path');
const tick=()=>new Promise(r=>setTimeout(r,0));
(async()=>{for(const project of [path.resolve(__dirname,'..'), path.resolve(__dirname,'../../../japan-go')].filter(project=>fs.existsSync(project+'/admin.html'))){
const dom=new JSDOM(fs.readFileSync(project+'/admin.html','utf8'),{url:'https://test.local/admin.html',runScripts:'outside-only'});const w=dom.window;w.allOrders=[{name:'退款',storeNote:'請保持原文：京都退款',refundReason:'銀行: 王小明',phone:'090-1234-5678'}];const d=w.document;
for(const f of ['i18n-catalog.js','i18n-extra.js','i18n-training.js','i18n.js'])w.eval(fs.readFileSync(project+'/admin-assets/'+f,'utf8'));
await tick();
const originalOptions=[...d.querySelectorAll('option')].map(e=>e.value);const input=d.getElementById('e-name');input.value='京都退款';const textarea=d.querySelector('textarea');textarea.value='保持原文：退款和髮型';
const test=d.createElement('div');test.innerHTML='<span id="dynamic">儲存中…</span><input id="dynamic-input" placeholder="請輸入密碼"><span data-i18n-ignore>京都退款</span><span id="private-name">退款</span><select><option>素雅和服</option></select>';d.body.append(test);await tick();
for(const lang of ['en','ja','zh-Hans','zh-Hant','en','zh-Hant']){
 w.AdminI18n.setLanguage(lang);await tick();assert.equal(d.documentElement.lang,lang);const languageSelect=d.querySelector('[data-admin-language]');if(languageSelect)assert.equal(languageSelect.value,lang);else assert(d.querySelector('[data-admin-language-cycle]').getAttribute('aria-label').includes(({en:'English',ja:'日本語','zh-Hans':'简体中文','zh-Hant':'繁體中文'})[lang]));assert.equal(w.localStorage.getItem('kimono_admin_lang'),lang);assert.equal(input.value,'京都退款');assert.equal(textarea.value,'保持原文：退款和髮型');assert.equal(d.querySelector('[data-i18n-ignore]').textContent,'京都退款');assert.equal(d.getElementById('private-name').textContent,'退款');assert.deepEqual([...d.querySelectorAll('option')].slice(0,originalOptions.length).map(e=>e.value),originalOptions);assert.equal(test.querySelector('option').value,'素雅和服');
}
const languageButton=d.querySelector('[data-admin-language-cycle]');if(languageButton){w.AdminI18n.setLanguage('zh-Hant');languageButton.click();assert.equal(w.AdminI18n.language,'zh-Hans');languageButton.click();assert.equal(w.AdminI18n.language,'ja');}
w.AdminI18n.setLanguage('en');assert.equal(d.getElementById('dynamic').textContent,'Saving…');d.getElementById('dynamic').firstChild.nodeValue='已儲存';await tick();assert.equal(d.getElementById('dynamic').textContent,'Saved');w.AdminI18n.setLanguage('ja');assert.equal(d.getElementById('dynamic').textContent,'保存しました');d.getElementById('dynamic-input').setAttribute('placeholder','請填入 Email 與密碼');await tick();assert.equal(d.getElementById('dynamic-input').placeholder,'メールとパスワードを入力してください');assert.equal(d.getElementById('e-remark').placeholder,'例：お客様のご要望、注意事項、フォロー内容…');assert.equal(d.getElementById('e-coupon').placeholder,'なし');assert.equal(d.getElementById('e-store-note').placeholder,'店舗内部用メモ（お客様には非表示）');w.AdminI18n.setLanguage('zh-Hant');assert.equal(d.getElementById('dynamic').textContent,'已儲存');assert.equal(d.getElementById('dynamic-input').placeholder,'請填入 Email 與密碼');assert.equal(d.getElementById('e-remark').placeholder,'例如：客人特殊需求、要提醒客人的事項、後續追蹤內容…');assert.equal(d.getElementById('e-coupon').placeholder,'無');assert.equal(d.getElementById('e-store-note').placeholder,'店鋪內部備註，不會顯示給客人');
w.AdminI18n.setLanguage('en');assert.equal(w.adminT('2026 年 9 月'),'September 2026');assert.equal(w.adminT('2男1女1小'),'2 men 1 women 1 children');assert.equal(w.adminT('8.5 折'),'15% off');assert.equal(w.adminT('3 項'),'3 items');let dialog;w.confirm=s=>{dialog=s;return true};assert.equal(w.adminConfirm('儲存變更'),true);assert.equal(dialog,'Save changes');assert.equal(w.adminT('custom123'),'custom123');assert.equal(w.adminT('最近 50 筆'),'Latest 50 records');assert.equal(w.adminT('1 步 · 約 2 分'),'1 step · about 2 min');w.AdminI18n.setLanguage('invalid');assert.equal(w.AdminI18n.language,'en');
const editSource=fs.readFileSync(project+'/admin-assets/10-orders-edit.js','utf8');const couponHelper=editSource.match(/function orderCouponInputValue\(value\) \{[\s\S]*?\n\}/)[0];w.eval(couponHelper+'\nwindow.__couponValue=orderCouponInputValue;');assert.equal(w.__couponValue('無'),'');assert.equal(w.__couponValue('なし'),'');assert.equal(w.__couponValue('SPRING9'),'SPRING9');
// Export labels follow the locale; guest-entered content remains unchanged.
w.fmtDate=String;w.formatGuestCount=()=> '1男';w.totalAmount=o=>o.price;w.orderBookingDate=o=>new Date(o.bookingDate);w.jstDateKey=()=> '2026-09-16';w.nowAsJstLocalDate=()=>new Date('2026-09-16T00:00:00+09:00');
w.eval(fs.readFileSync(project+'/admin-assets/09-reconcile.js','utf8'));
const exportedOrder={orderId:'TEST-001',name:'退款',phone:'090-1234-5678',bookingDate:'2026-09-16T10:00:00+09:00',price:5000,deposit:1000,confirmed:true,remark:'京都退款備註'};
if(typeof w.orderExportHtml==='function'){
 const html=w.orderExportHtml([exportedOrder],'訂單列印表');assert(html.includes('Order printout'));assert(html.includes('Booking time'));assert(html.includes('京都退款備註'));assert(html.includes('>退款</td>'));
}else{
 let blob;w.Blob=Blob;w.URL.createObjectURL=value=>{blob=value;return 'blob:test'};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
 w.ordersToCSV([exportedOrder]);const csv=await blob.text();assert(csv.includes('Order ID'));assert(csv.includes('Confirmed'));assert(csv.includes('京都退款備註'));assert(csv.includes('"退款"'));
}
for(const [key,values] of Object.entries(w.ADMIN_I18N_CATALOG)){assert.equal(values.length,3,key);assert(values.every(v=>typeof v==='string'&&v.trim()),key)}
w.currentAgent='Jun';w.currentRole='agent';
w.eval(fs.readFileSync(project+'/admin-assets/19-tour.js','utf8')+'\nwindow.__testScenarios = TRAINING_SCENARIOS;');
const scenarios=w.__testScenarios;
for(const scenario of scenarios){const localized=w.adminTrainingScenario(scenario);assert.equal(localized.steps.length,1,scenario.id);assert(!/[\u4e00-\u9fff]/.test(w.adminT(localized.desc)),scenario.id);const section=d.createElement('div');section.innerHTML=localized.steps[0].body;assert(section.querySelector('[data-i18n-ignore]'));assert.equal(section.querySelector('details').open,false);}
w.openScenarioPicker();await tick();assert(d.getElementById('scenario-list').textContent.includes('New bookings'));
w.startScenario('new_booking');await tick();assert(d.getElementById('tour-body').textContent.startsWith('In Orders'));w.endAdminTour();
console.log(project+': language roundtrip, dynamic text/attributes, private data, form values, option values, dialogs, dates, exports, training and catalog PASS');w.close();
}})().catch(e=>{console.error(e);process.exit(1)});
