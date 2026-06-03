// ============================================================
// v2.5: 教學導覽 (Admin Tour)
// ============================================================

// v2.5: 合併重整按鈕 = 清快取 + 重整
function fullReload() {
  if ('caches' in window) {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(() => location.reload());
  } else {
    location.reload();
  }
}

const ADMIN_TOUR_VERSION = 'v440';

// ============================================================
// v2.5j: 訓練教室情境式教學 (Scenario-based Training)
// 4 個場景 × 5-8 步，依登入身份過濾
// ============================================================

const TRAINING_SCENARIOS = [
  // ========== 1. 📬 新預約進來 ==========
  {
    id: 'new_booking', category: 'daily', icon: '📬', title: '新預約進來',
    desc: '客人 inquiry 填表 → admin 待確認 → 檢查 → 確認 → 自動寄信',
    roles: ['agent', 'jun'],
    steps: [
      { center: true, title: '📬 情境：客人下了新預約',
        body: '客人「<b>王小明</b>」剛在前台 <code>inquiry.html</code> 填了預約：' +
              '<ul><li>體驗日：<b>2026/07/05 14:00</b></li><li>人數：<b>1 大人</b></li><li>方案：<b>1 人和服</b></li><li>Email：<code>guest5@example.com</code></li><li>電話：<b>0931-234-999</b></li><li>平台：<b>LINE</b></li></ul>' +
              '送出後系統會做什麼？接下來帶您看完整流程。' },
      { center: true, title: '前台：客人送出後系統自動動作',
        body: '<h4>1. 自動寄信</h4>客人收到「我們收到您的預約 #K260514001」<br>' +
              '<h4>2. Sheet 新增訂單</h4>狀態 = 待確認，訂金暫為 0<br>' +
              '<h4>3. 客人 inquiry 看到「核對中」黃色 badge</h4>' +
              '<div class="info-box">⚠ 這時候<b>還沒收訂金</b>。客人要另外按確認信連結匯款。</div>' },
      { tab: 'orders', selector: '[data-sec="orders"]', position: 'bottom',
        title: '後台：訂單管理',
        body: '訂單都在這個 tab，按建單時間排序，最新的在最上面。tab 旁邊的數字顯示總訂單數。' },
      { tab: 'orders', selector: '#sec-orders .flex.flex-wrap.gap-2.items-center',
        title: '篩選「待確認」',
        body: '<h4>常用 filter</h4>' +
              '<ul><li><b>今天</b>：今天體驗的（前一晚先看）</li>' +
              '<li><b>待確認</b>：每天打開後台第一件事</li>' +
              '<li><b>退款</b>：要處理退款的</li><li><b>異常</b>：金額對不上、訂金超收</li></ul>' },
      { center: true, title: '訂單卡長這樣',
        body: '範例訂單卡（後台真正資料會像這樣）：' + '<div class="mock-card">  <div class="mc-header">    <div><span class="mc-name">王小明</span> <span class="mc-id">K260514001</span></div>    <span class="mc-badge" style="background:#FEF3C7;color:#92400E">⏳ 待確認</span>  </div>  <div class="mc-row"><span class="mc-label">📅 體驗日</span><span class="mc-val">2026/07/05 14:00</span></div>  <div class="mc-row"><span class="mc-label">📞 電話</span><span class="mc-val">0931-234-999</span></div>  <div class="mc-row"><span class="mc-label">👤 人數</span><span class="mc-val">1 大人</span></div>  <div class="mc-row"><span class="mc-label">👘 和服款式</span><span class="mc-val">1 人經典款</span></div>  <div class="mc-row"><span class="mc-label">💴 訂金</span><span class="mc-val">NT$1,000</span></div>  <div class="mc-row"><span class="mc-label">📧 Email</span><span class="mc-val">guest5@example.com</span></div>  <div class="mc-row"><span class="mc-label">🏷 平台</span><span class="mc-val"><span class="label" style="background:#06C755;color:#FFF">LINE</span></span></div></div>' +
              '<h4>欄位說明</h4>' +
              '<ul><li><b>編號</b>：K + 日期序號</li>' +
              '<li><b>體驗日</b>：客人想體驗的日期+時間（≠ 下單日）</li>' +
              '<li><b>電話</b>：去除 +886、空格、－ 比對</li>' +
              '<li><b>訂金</b>：客人實際匯入 NT$</li>' +
              '<li><b>平台</b>：LINE/FB/IG/官網（月底分潤要用）</li></ul>' },
      { center: true, title: '✅ 確認前的檢查清單',
        body: '<h4>必檢查 5 件事</h4>' +
              '<ol><li><b>體驗日期合理</b>（不在過去、不超 6 個月後）</li>' +
              '<li><b>Email 格式對</b>（有 @ 跟 .com/.tw）</li>' +
              '<li><b>平台來源有填</b></li>' +
              '<li><b>電話有填且合理</b></li>' +
              '<li><b>訂金已收到</b>（看訂金欄 ≥ 預期）</li></ol>' +
              '<div class="danger-box">❌ 任一項不對 <b>不要確認</b>。可點「📝 編輯」補上或寄信問客人。</div>' },
      { center: true, title: '訂金金額怎麼算',
        body: '<h4>訂金公式</h4><div class="formula">訂金 (NT$) = 人數 × 1000</div>' +
              '<h4>範例</h4>' +
              '<ul><li>1 大人 = NT$1,000</li><li>2 大 + 1 小 = NT$3,000</li><li>5 人團 = NT$5,000</li></ul>' +
              '<div class="info-box">💡 訂金 = 確認預約意願。剩下尾款（妝髮、攝影、和服費差額）<b>客人到店現場結算</b>。</div>' },
      { center: true, title: '折扣碼怎麼套用',
        body: '客人在 inquiry 表單填了「折扣碼」如 <code>EARLY8</code>：' +
              '<h4>系統自動：</h4>' +
              '<ol><li>到 Sheet「折扣碼分頁」找該碼</li>' +
              '<li>套用對應折數（5-10 折）</li>' +
              '<li>實收方案 = 原價 × (折/10)</li></ol>' +
              '<div class="formula">原價 ¥10,000 + EARLY8 (8 折) = 實收 <b>¥8,000</b></div>' +
              '<div class="info-box">⚠ 折扣只折和服費，<b>妝髮 / 攝影不折，店家全收</b>。</div>' },
      { tab: 'orders', selector: '#sec-orders',
        title: '點「✅ 快速確認」',
        body: '訂單卡底下藍色按鈕。按下去 → prompt「確定要確認 王小明 的預約？」→ 點確定。' +
              '<div class="info-box">💡 也可以點「📝 編輯」進去填補欄位後再確認。</div>' },
      { center: true, title: '🎉 確認後系統自動做',
        body: '<ol><li>Sheet <code>confirmed</code> 欄變 TRUE</li>' +
              '<li>自動寄「預約已確認」信（含體驗時間、門市地址、現場應付）</li>' +
              '<li>客人 inquiry 看到「✓ 已確認」綠色 badge</li>' +
              '<li>對帳 tab 開始追蹤這筆</li>' +
              '<li>報到中心 tab 在體驗日 ±1 天顯示</li>' +
              '<li>客戶名單該客人累計次數 +1</li></ol>' },
      { center: true, title: '⚠️ 常見錯誤',
        body: '<div class="danger-box"><b>1. 訂金沒到就確認</b><br>客人沒匯款 → 不會出現。<b>務必先看訂金欄</b>。</div>' +
              '<div class="danger-box"><b>2. 體驗日填錯</b><br>體驗日 ≠ 下單日。報到中心 / 行事曆都看體驗日。</div>' +
              '<div class="danger-box"><b>3. 平台來源沒填</b><br>月底分潤不知道分給誰 → 店家少給錢。</div>' }
    ]
  },

  // ========== 2. 💰 退款處理 ==========
  {
    id: 'refund', category: 'daily', icon: '💰', title: '客人要退款',
    desc: '客人 inquiry 申請退款 → admin 出現申請 → 按政策算 → 轉帳 → 標完成',
    roles: ['agent', 'jun'],
    steps: [
      { center: true, title: '💰 情境：客人申請退款',
        body: '客人王小明訂了 7/5、訂金已付 NT$1000。臨時行程變更要取消。' +
              '<h4>客人怎麼操作</h4>' +
              '<ol><li>inquiry.html 用姓名+末3碼 找到訂單</li>' +
              '<li>點「申請退款 / 取消預約」</li>' +
              '<li>填銀行帳號、退款原因</li>' +
              '<li>勾「同意退改政策」→ 送出</li></ol>' },
      { center: true, title: '前台：客人填了什麼',
        body: '<h4>退款表單欄位</h4>' +
              '<ul><li><b>退款原因</b>：行程變更/簽證/身體不適/天災/其他</li>' +
              '<li><b>銀行代碼</b>：3 位數（008 華南、004 台銀）</li>' +
              '<li><b>銀行名稱</b>：如「華南銀行」</li>' +
              '<li><b>帳號</b>：8-14 位</li>' +
              '<li><b>戶名</b>：跟訂單姓名最好一致</li>' +
              '<li><b>聯繫電話</b></li></ul>' +
              '<div class="info-box">客人會收到「退款申請已收到」自動回信。</div>' },
      { tab: 'orders', selector: '[data-sec="orders"]', position: 'bottom',
        title: '訂單管理 → 退款 filter',
        body: '點 tab 列「退款」filter → 只看狀態為「申請退款」的訂單，橘色 badge。' },
      { center: true, title: '⚠️ 退多少要按政策算',
        body: '<div class="danger-box"><b>不是客人付多少就退多少！</b></div>' +
              '<h4>退改政策</h4>' +
              '<ul><li>🟢 7 天前+ → 退 100%</li>' +
              '<li>🟡 2-6 天前 → 退 50%</li>' +
              '<li>🔴 前一日 / 當日 → 不退費</li></ul>' +
              '<h4>計算範例</h4>' +
              '<div class="formula">今天 5/14、體驗日 7/5 = 距 52 天 → 退 100%<br>已付 NT$1000 → 退 <b>NT$1000</b></div>' +
              '<div class="formula">今天 7/3、體驗日 7/5 = 距 2 天 → 退 50%<br>已付 NT$1000 → 退 <b>NT$500</b></div>' },
      { center: true, title: '檢查退款資料 + 戶名',
        body: '訂單卡會展開顯示客人填的：' +
              '<ul><li>退款原因</li>' +
              '<li>銀行代碼 + 名稱（核對存在？008 華南、004 台銀）</li>' +
              '<li>帳號（位數合理嗎）</li>' +
              '<li><b>戶名</b>（跟訂單姓名是否一致）</li></ul>' +
              '<div class="danger-box">戶名跟訂單姓名不同時，<b>務必用 LINE / 電話問客人</b>，避免錢轉到別人手上。</div>' },
      { center: true, title: '⚠️ 操作順序：先轉帳，再標記',
        body: '<div class="danger-box">' +
              '<ol><li>開銀行 App / 網銀</li>' +
              '<li>用客人填的銀行+帳號+戶名，轉退款金額</li>' +
              '<li>⚠️ <b>確認轉帳成功</b>（截圖留底）</li>' +
              '<li>再回後台標記</li></ol></div>' +
              '<div class="info-box">先標記再轉帳 → 容易忘記轉 → 客人追問才發現 → 信任度暴跌。</div>' },
      { tab: 'orders', selector: '#sec-orders',
        title: '回後台填退款金額 + 時間',
        body: '點訂單卡「📝 編輯」找：' +
              '<ul><li><b>退款金額</b> (refundAmount)：實際轉的 NT$</li>' +
              '<li><b>退款時間</b> (refundTime)：今天日期（如 2026-05-14）</li>' +
              '<li><b>退款原因</b>：之前客人填的可微調</li></ul>儲存。' +
              '<div class="example-box">退款金額填 <code>1000</code>，退款時間 <code>2026-05-14</code>，儲存。</div>' },
      { center: true, title: '🎉 標記後系統自動',
        body: '<ol><li>訂單 badge 變紅色「已退款」</li>' +
              '<li>客人 inquiry 也看到「已退款」+ 金額</li>' +
              '<li>對帳 tab 該筆排除（不再算 unmatched）</li>' +
              '<li>客戶名單「退款次數」+1</li>' +
              '<li>歷史檔案永久保留紀錄</li></ol>' },
      { center: true, title: '⚠️ 常見錯誤',
        body: '<div class="danger-box"><b>1. 退太多 / 太少</b><br>對著政策表算。不要憑感覺。</div>' +
              '<div class="danger-box"><b>2. 戶名不符照轉</b><br>可能親友代訂 / 詐騙，先問清楚。</div>' +
              '<div class="danger-box"><b>3. 已退款但忘記標記</b><br>對帳 tab 還顯示這筆未處理 → 信任崩盤。</div>' +
              '<div class="danger-box"><b>4. 銀行手續費</b><br>跨行轉帳會扣 NT$15-30。慣例：退完整金額、手續費我們吸收。</div>' }
    ]
  },

  // ========== 3. 🎌 客人到店報到 ==========
  {
    id: 'checkin', category: 'daily', icon: '🎌', title: '客人到店報到',
    desc: '客人到店 → 自助 or 代客報到 → Sheet 寫 AL/AM/AN',
    roles: ['agent', 'jun', 'store'],
    steps: [
      { center: true, title: '🎌 情境：客人到店',
        body: '客人王小明約今天下午 2 點，1:50 進門。' +
              '<h4>兩種報到方式</h4>' +
              '<ol><li><b>A. 客人自助</b>：手機開 inquiry.html → 點「我已到店報到」→ 出示成功畫面給店員</li>' +
              '<li><b>B. 店員代客</b>：客人忘了怎麼操作 / 沒手機 → 在 admin 報到</li></ol>下面看 B 流程。' },
      { tab: 'checkin', selector: '[data-sec="checkin"]', position: 'bottom',
        title: '進「🎌 報到中心」',
        body: '今日 ±1 天所有確認過的訂單都在這。按體驗時間排。<br><br>tab 標題顯示今日訂單數，下方三格統計：⏳ 待報到 / 🎌 客人自助 / ✅ 已代客' },
      { tab: 'checkin', selector: '#checkin-search',
        title: '末碼搜尋',
        body: '客人說「我手機末3碼是 999」→ 搜尋框輸入 <code>999</code> → 卡片即時 filter。' +
              '<div class="example-box">為什麼末3碼不用全電話？客人手機 0912-345-<b>999</b>，3 碼足夠定位、又快又準。</div>' +
              '<div class="info-box">3-5 碼，輸入 3 碼以上才開始 filter。</div>' },
      { center: true, title: '訂單卡長這樣',
        body: '範例（後台真正資料會像這樣）：' + '<div class="mock-card">  <div class="mc-header">    <div><span class="mc-name">王小明</span> <span class="mc-id">K260514001</span></div>    <span class="mc-badge" style="background:#F1F5F9;color:#475569">⏳ 待報到</span>  </div>  <div class="mc-row"><span class="mc-label">體驗時間</span><span class="mc-val">7/5 14:00</span></div>  <div class="mc-row"><span class="mc-label">末3碼</span><span class="mc-val" style="font-family:monospace">999</span></div>  <div class="mc-row"><span class="mc-label">和服款式</span><span class="mc-val">1 人經典款</span></div>  <div class="mc-row"><span class="mc-label">人數</span><span class="mc-val">1 大</span></div>  <div style="margin-top:8px"><button style="width:100%;padding:6px;background:#FEF3C7;color:#92400E;border:none;border-radius:4px;font-weight:bold;font-size:11px">🎌 為客人報到</button></div></div>' +
              '<h4>欄位說明</h4>' +
              '<ul><li>姓名 + 訂單號</li>' +
              '<li>右上 badge：⏳ 待報到 / 🎌 客人自助 / ✅ 已代客</li>' +
              '<li>體驗時間、末3碼、和服款式、人數</li>' +
              '<li>底下「🎌 為客人報到」按鈕</li></ul>' +
              '跟客人本人對話確認資料一致再操作。' },
      { tab: 'checkin', selector: '#checkin-list',
        title: '點「為客人報到」',
        body: '<h4>卡片長這樣</h4>' +
              '<div class="mock-card">' +
              '<div class="mc-header">' +
              '<div><span class="mc-name">王小明</span> <span class="mc-id">K260514001</span></div>' +
              '<span class="mc-badge" style="background:#F1F5F9;color:#475569">待報到</span>' +
              '</div>' +
              '<div class="mc-row"><span class="mc-label">體驗時間</span><span class="mc-val">7/5 14:00</span></div>' +
              '<div class="mc-row"><span class="mc-label">末3碼</span><span class="mc-val" style="font-family:monospace">999</span></div>' +
              '<div style="margin-top:8px"><button style="width:100%;padding:6px;background:#FEF3C7;color:#92400E;border:none;border-radius:4px;font-weight:bold;font-size:11px">🎌 為客人報到</button></div>' +
              '</div>' +
              '<h4>按下底下按鈕後</h4>' +
              '<ol><li>系統 prompt「確定為 王小明 辦理報到？」</li>' +
              '<li>點確定 → 完成</li>' +
              '<li>badge 變綠色「已代客報到」</li>' +
              '<li>按鈕變灰「已報到」（防您重複點）</li></ol>' },
      { center: true, title: '📋 Sheet 寫入',
        body: '報到完成後 Sheet 自動寫：' +
              '<ul><li><b>AL 欄 = 報到時間</b>：2026-07-05T14:05:23+09:00</li>' +
              '<li><b>AM 欄 = 報到門市</b>：osaka1 / kyoto1 / tokyo1（從您登入身份判斷）</li>' +
              '<li><b>AN 欄 = 報到來源</b>：<code>self</code>（客人自助）或 storeKey（代客）</li></ul>' +
              '<div class="info-box">⚡ admin 重整還是看到綠色（不會跑掉），下次來看仍是已報到狀態。</div>' },
      { center: true, title: '🟡 客人自助報到的情況',
        body: '客人自己在 inquiry.html 點過了：' +
              '<ul><li>報到中心卡片 badge 是<b>琥珀色「客人自助」</b></li>' +
              '<li>Sheet AN 欄寫 <code>self</code></li>' +
              '<li>您不用再代客報到</li></ul>' +
              '<h4>好處</h4>' +
              '<ol><li>客人在門外排隊時就先報到</li>' +
              '<li>店員不用一個個問</li>' +
              '<li>減少櫃台壓力</li></ol>' +
              '<div class="info-box">⚠ 客人自助後仍要店員確認本人 + 對訂單號。畫面上有訂單號 + 姓名 + 體驗時間。</div>' }
    ]
  },

  // ========== 4. 🧾 對帳作業 ==========
  {
    id: 'reconcile', category: 'daily', icon: '🧾', title: '對帳作業',
    desc: '銀行入帳 → 找對應訂單 → 註記訂金 → 狀態變 matched',
    roles: ['agent', 'jun'],
    steps: [
      { center: true, title: '🧾 情境：對帳是什麼',
        body: '客人王小明付 NT$1000 訂金。銀行只看到「2026/05/13 王小明 +NT$1000」— 不知道是哪筆訂單。' +
              '<h4>客服要做</h4>' +
              '<ol><li>看銀行對帳單</li>' +
              '<li>到 admin 找王小明的訂單</li>' +
              '<li>訂單卡填「訂金 = 1000、付款時間 = 5/13」</li>' +
              '<li>系統自動算狀態變 matched 🟢</li></ol>' +
              '<div class="info-box">月底所有訂單訂金都要對好，不然關不了帳。</div>' },
      { tab: 'reconcile', selector: '[data-sec="reconcile"]', position: 'bottom',
        title: '進「🧾 對帳」',
        body: '預設顯示本月。頂部統計：對帳完成率、應收、實收、差額。' },
      { center: true, title: '🚦 四種對帳狀態',
        body: '<table class="mock-table">' +
              '<tr><th>狀態</th><th>意義</th></tr>' +
              '<tr><td>🟢 matched</td><td>訂金 ≥ 預期，正常</td></tr>' +
              '<tr><td>🟡 partial</td><td>訂金 &lt; 預期，待補尾款</td></tr>' +
              '<tr><td>🔴 overpaid</td><td>訂金 &gt; 體驗總額，要退超收</td></tr>' +
              '<tr><td>⚪ unmatched</td><td>還沒收訂金</td></tr></table>' +
              '<div class="info-box">Walk-in 訂單特別：訂金 = 0 但 confirmed 也算 matched（現場結清）。</div>' },
      { tab: 'reconcile', selector: '#recon-status',
        title: '看 unmatched 找待處理',
        body: '上方狀態下拉切「未對帳」→ 列出沒收訂金的訂單。' +
              '<h4>對帳表會長這樣</h4>' + '<table class="mock-table"><tr><th>姓名</th><th>體驗</th><th>應收</th><th>已收</th><th>狀態</th></tr><tr><td>王小明</td><td>7/5</td><td>1000</td><td>1000</td><td>🟢 matched</td></tr><tr><td>李美玲</td><td>7/8</td><td>2000</td><td>1000</td><td>🟡 partial</td></tr><tr><td>陳大華</td><td>7/12</td><td>3000</td><td>0</td><td>⚪ unmatched</td></tr></table>' +
              '<br>每天早上看銀行對帳單，把昨晚進款配進對應訂單。' },
      { center: true, title: '比對銀行入帳',
        body: '<h4>銀行對帳單範例</h4>' +
              '<div class="example-box"><b>2026/05/13 09:23 王小明 +NT$1,000</b><br>2026/05/13 14:11 Lee Min Soo +NT$2,000<br>2026/05/13 17:45 陳大華 +NT$3,000</div>' +
              '<h4>判斷對應訂單</h4>' +
              '<ul><li><b>姓名</b>：精確比對</li>' +
              '<li><b>金額</b>：人數 × 1000 對得上？</li>' +
              '<li><b>時間</b>：客人下單後幾天內？</li></ul>' +
              '<div class="danger-box">匯款人姓名跟訂單姓名不同（如老公幫老婆訂）→ 發 LINE 問。</div>' },
      { tab: 'reconcile', selector: '#sec-reconcile',
        title: '找到後點訂單編輯',
        body: '點訂單卡「📝 編輯」→ 填：' +
              '<ul><li><b>訂金 (M 欄)</b>：<code>1000</code>（NT$）</li>' +
              '<li><b>付款時間 (Z 欄)</b>：<code>2026-05-13</code></li></ul>儲存。' +
              '<div class="info-box">訂金欄是「NT$」不是「日圓」。系統會自動算 JPY 跟對帳狀態。</div>' },
      { center: true, title: '🎯 系統自動算狀態',
        body: '存檔後比對：' +
              '<div class="formula">已收訂金 (got) vs 預期訂金 (expect)</div>' +
              '<ul><li>got ≥ expect → <b>🟢 matched</b></li>' +
              '<li>got &lt; expect → <b>🟡 partial</b></li>' +
              '<li>got &gt; 體驗總額 → <b>🔴 overpaid</b>（退款處理）</li></ul>' },
      { center: true, title: 'Jun 限定：自動配對',
        body: 'Jun 看得到右上「<b>🤖 自動配對銀行入帳</b>」按鈕。' +
              '<h4>怎麼用</h4>' +
              '<ol><li>銀行匯出 CSV</li>' +
              '<li>貼到 Sheet「収款辨識」分頁</li>' +
              '<li>按「🤖 自動配對」</li>' +
              '<li>系統自動掃描未對帳訂單，配對姓名+金額</li>' +
              '<li>對得上的自動 fill</li></ol>' +
              '<div class="info-box">store/agent 看不到這個按鈕。</div>' },
      { center: true, title: '⚠️ 常見錯誤',
        body: '<div class="danger-box"><b>1. 訂金欄填日圓</b><br>是「NT$」不是「¥」。1000 NT ≠ 1000 ¥。</div>' +
              '<div class="danger-box"><b>2. 月底還有 unmatched</b><br>關帳時 unmatched 會算進「異常」。月底前清掉。</div>' }
    ]
  },

  // ========== 5. 🏪 Walk-in 現場開單 ==========
  {
    id: 'walkin', category: 'daily', icon: '🏪', title: 'Walk-in 現場開單',
    desc: '客人沒預約直接走進店 → ＋現場新增 → 結算 → 現場付清',
    roles: ['agent', 'jun', 'store'],
    steps: [
      { center: true, title: '🏪 情境：客人沒預約走進來',
        body: '一個遊客逛到您門口，看到櫥窗的和服很美，臨時要體驗。她沒在 inquiry 預約、沒匯訂金。' +
              '<h4>店家要做</h4>' +
              '<ol><li>「<b>＋ 現場新增</b>」開 Walk-in 訂單</li>' +
              '<li>選方案（是否加妝髮 / 攝影）</li>' +
              '<li>算總價</li>' +
              '<li>客人現場付清</li>' +
              '<li>儲存 → 月底跟旅乘對帳</li></ol>' +
              '<div class="info-box">Walk-in 跟一般預約最大差別：<b>訂金 = 0，現場結清全部</b>。</div>' },
      { tab: 'orders', selector: '#walkInFab', position: 'left',
        title: '右下藍色 FAB',
        body: '只有店家身份才看得到的<b>浮動按鈕</b>，右下角。<br>客服/Jun 看不到（他們不在現場）。' +
              '<div class="info-box">客人現場跟你要體驗 → 點這顆 → 彈出開單表單。</div>' },
      { center: true, title: 'Walk-in 表單欄位',
        body: '<h4>必填</h4>' +
              '<ul><li><b>客人姓名</b>：用證件上的</li>' +
              '<li><b>聯繫電話</b></li>' +
              '<li><b>大人數 / 小孩數</b>：+/- 按鈕</li>' +
              '<li><b>和服方案費 (PP)</b>：手動輸入 ¥</li>' +
              '<li><b>妝髮費 (HF)</b>：選填</li>' +
              '<li><b>攝影費 (PF)</b>：選填</li>' +
              '<li><b>備註</b></li></ul>' +
              '<h4>系統自動帶</h4>' +
              '<ul><li>體驗日期：今天</li>' +
              '<li>平台：<code>walk-in@osaka1</code></li>' +
              '<li>店家代號：從登入身份</li></ul>' },
      { center: true, title: '和服方案費 (PP)',
        body: '<h4>常見價（範例）</h4>' +
              '<ul><li>1 人經典款 → ¥3,500</li>' +
              '<li>2 人經典款 → ¥6,000</li>' +
              '<li>1 人振袖 → ¥5,000</li>' +
              '<li>親子套裝（1 大 1 小）→ ¥4,500</li></ul>' +
              '<div class="info-box">各分店價可能不同 → <b>看門市價目表</b>，不要憑感覺。</div>' +
              '<div class="example-box">2 大選經典款 → 填 ¥6,000<br>1 大+1 小親子套裝 → 填 ¥4,500</div>' },
      { center: true, title: '妝髮費 (HF)',
        body: '客人加妝髮才填。<br>' +
              '<h4>各分店妝髮價（範例）</h4>' +
              '<table class="mock-table"><tr><th>門市</th><th>每人</th></tr>' +
              '<tr><td>大阪日本橋店</td><td>¥2,000</td></tr>' +
              '<tr><td>京都清水寺店</td><td>¥1,800</td></tr>' +
              '<tr><td>京都祇園店</td><td>¥2,500</td></tr>' +
              '<tr><td>東京淺草寺店</td><td>¥2,200</td></tr></table>' +
              '<div class="example-box">2 大都要妝髮、大阪 → ¥4,000</div>' +
              '<div class="info-box">妝髮費 <b>100% 店家收，旅乘不抽</b>。</div>' },
      { center: true, title: '攝影費 (PF)',
        body: '<h4>常見方案（範例）</h4>' +
              '<ul><li>1 人 30 分鐘 → ¥5,000</li>' +
              '<li>1 人 1 小時 → ¥8,000</li>' +
              '<li>多人 1 小時 → ¥12,000</li></ul>' +
              '<div class="info-box">攝影費跟妝髮一樣，<b>100% 店家收</b>。</div>' +
              '<div class="example-box">2 大 1 小時旅拍 → ¥12,000</div>' },
      { center: true, title: '客人現場應付怎麼算',
        body: '<div class="formula">客人現場付 = PP + HF + PF</div>' +
              '<h4>範例</h4>' +
              '<div class="example-box">2 大經典款 + 妝髮 + 旅拍<br>= ¥6,000 + ¥4,000 + ¥12,000 = <b>¥22,000</b></div>' +
              '<h4>付款方式</h4>' +
              '<ul><li>現金日幣</li><li>信用卡</li><li>QR Code（Line Pay / 街口 付台幣）</li></ul>' },
      { center: true, title: '🎯 旅乘 vs 店家分潤',
        body: '<table class="mock-table"><tr><th>項目</th><th>店家</th><th>旅乘</th></tr>' +
              '<tr><td>PP 無折</td><td>50%</td><td>50%</td></tr>' +
              '<tr><td>PP 有折</td><td>50% 原價</td><td>50% - 折扣</td></tr>' +
              '<tr><td>HF 妝髮</td><td>100%</td><td>0</td></tr>' +
              '<tr><td>PF 攝影</td><td>100%</td><td>0</td></tr></table>' +
              '<div class="example-box">2 大經典款 ¥6,000 + 妝髮 ¥4,000 + 攝影 ¥12,000<br>店家收 ¥3,000 + ¥4,000 + ¥12,000 = <b>¥19,000</b><br>應付旅乘 = <b>¥3,000</b></div>' +
              '<div class="info-box">客人付 ¥22,000，月底匯 ¥3,000 給旅乘。</div>' },
      { center: true, title: '儲存後系統自動',
        body: '<ol><li>Sheet 新增訂單 <code>WALK_IN</code> 平台</li>' +
              '<li>confirmed 立刻 TRUE（不用客服確認）</li>' +
              '<li>出現在「店家月結」tab</li>' +
              '<li>客戶名單累計 +1</li>' +
              '<li>不自動寄信（沒留 Email）</li></ol>' +
              '<div class="info-box">客人要訊息證明可拍訂單畫面給客人。</div>' },
      { tab: 'walkin', selector: '#walkin-stores-grid',
        title: '月底跟旅乘對帳',
        body: '每月最後一天 / 隔月初進「<b>💴 店家月結</b>」tab。' +
              '<br>看您門市本月的：' +
              '<ul><li>walk-in 訂單明細</li>' +
              '<li>總收入 = ΣPP + ΣHF + ΣPF</li>' +
              '<li>店家保留 = 50% PP + ΣHF + ΣPF</li>' +
              '<li>應收旅乘 = 50% PP</li></ul>' +
              '<div class="info-box">右上「📄 請款單」可下載 PDF 給會計核帳。</div>' },
      { center: true, title: '⚠️ 常見錯誤',
        body: '<div class="danger-box"><b>1. 妝髮/攝影漏填</b><br>客人有加忘記輸入 → 月底對不上。</div>' +
              '<div class="danger-box"><b>2. PP 填錯方案</b><br>¥6,000 打成 ¥3,500 → 少收一半。<b>核對價目表</b>。</div>' +
              '<div class="danger-box"><b>3. 不收訂金硬給體驗</b><br>客人說「等下再付」→ 千萬不要！100% 機率收不到。</div>' +
              '<div class="danger-box"><b>4. 收完錢忘了開單</b><br>月底對不到 → 旅乘以為您詐欺。<b>收一筆開一筆</b>。</div>' }
    ]
  },

  // ========== 6. 📊 儀表板 ==========
  {
    id: 'dashboard', category: 'tabs', icon: '📊', title: '儀表板總覽',
    desc: '每天打開後台的第一站，看今日營運、快速跳轉',
    roles: ['agent', 'jun', 'store'],
    steps: [
      { center: true, title: '📊 情境：你每天打開後台',
        body: '進來首先看到的就是儀表板。一眼看出：今天有幾筆、本月賺多少、有沒有要處理的。' },
      { tab: 'dashboard', selector: '[data-sec="dashboard"]', position: 'bottom',
        title: '進「📊 儀表板」',
        body: '預設這就是首頁。每次登入都先看一眼，再決定接下來去哪個 tab。' },
      { center: true, title: '主要統計卡片',
        body: '儀表板會顯示：' + '<div class="mock-card">  <div style="font-weight:bold;color:#1A365D;margin-bottom:6px">📊 今日營運</div>  <table class="mock-table">    <tr><th>今日訂單</th><td>3 筆</td></tr>    <tr><th>本月營收</th><td>¥ 245,000</td></tr>    <tr><th>本月退款</th><td>¥ 12,000</td></tr>    <tr><th>待確認</th><td><span style="color:#F59E0B">5 筆</span></td></tr>  </table></div>' +
              '<ul><li><b>今日訂單</b>：今天體驗的客人數</li>' +
              '<li><b>本月營收</b>：本月所有訂單金額</li>' +
              '<li><b>本月退款</b>：本月退掉的</li>' +
              '<li><b>待確認</b>：要處理的訂單</li></ul>' },
      { tab: 'dashboard', selector: '#sec-dashboard',
        title: '快速操作按鈕',
        body: '頂部有快速跳轉按鈕：' +
              '<ul><li>📍 <b>今天訂單</b> → 直接跳訂單管理 + 今天 filter</li>' +
              '<li>💸 <b>退款處理</b> → 跳退款 filter</li>' +
              '<li>📦 <b>預檢上月關帳</b>（Jun only）</li></ul>' +
              '<div class="info-box">不用自己手動切 tab，一鍵就到目標頁。</div>' },
      { center: true, title: '日期範圍切換',
        body: '右上有「範圍」下拉：' +
              '<ul><li><b>本月</b>（預設）</li>' +
              '<li><b>本週</b></li>' +
              '<li><b>今日</b></li>' +
              '<li><b>上月</b></li></ul>' +
              '統計數字會跟著變，看不同期間的營運。' },
      { tab: 'dashboard', selector: '#sec-dashboard',
        title: '月度趨勢圖 + 天氣',
        body: '往下滑會看到：' +
              '<ul><li><b>月度趨勢</b>：每月訂單數 / 營收 折線圖</li>' +
              '<li><b>🌤 拍攝景點天氣</b>：京都、大阪、東京 7 天天氣，幫客人準備外拍</li></ul>' +
              '<div class="info-box">店家登入時，天氣只會顯示自家城市。</div>' }
    ]
  },

  // ========== 7. 📅 行事曆 ==========
  {
    id: 'calendar', category: 'tabs', icon: '📅', title: '行事曆視圖',
    desc: '月曆視角看所有體驗預約，點日期看當天訂單',
    roles: ['agent', 'jun', 'store'],
    steps: [
      { center: true, title: '📅 情境：想看下個月哪天比較滿',
        body: '想知道下週六有幾個客人？某個日期是否已經滿了？用行事曆 view 最快。' },
      { tab: 'calendar', selector: '[data-sec="calendar"]', position: 'bottom',
        title: '進「📅 行事曆」',
        body: '月曆視角顯示所有預約。每天上面有當日訂單數字（如「3」）。' },
      { center: true, title: '顏色標示',
        body: '<ul><li>🟢 <b>綠色</b>：訂單數 1-3（普通）</li>' +
              '<li>🟡 <b>橙色</b>：訂單數 4-7（接近滿）</li>' +
              '<li>🔴 <b>紅色</b>：訂單數 8+（很忙，要小心安排）</li></ul>' +
              '<div class="info-box">紅色那天再接新預約要謹慎，看人手夠不夠。</div>' },
      { tab: 'calendar', selector: '#sec-calendar',
        title: '點日期看當天詳情',
        body: '<b>點任何一天</b>會彈出當天的訂單列表：客人姓名、時間、人數、和服款式。' +
              '<div class="info-box">這比訂單管理 tab 看單筆更有「整天概況」的感覺。</div>' },
      { center: true, title: '月份切換',
        body: '左右箭頭切月份。可以看歷史（上月）也可以看未來（下月 / 兩個月後）。' +
              '<h4>實用場景</h4>' +
              '<ul><li>看下週六會不會爆 → 提前調班</li>' +
              '<li>看下個月有沒有大日子（國定假日、櫻花季）→ 預先布置</li>' +
              '<li>看上個月哪一天最賺 → 分析熱門時段</li></ul>' }
    ]
  },

  // ========== 8. 👥 客戶名單 ==========
  {
    id: 'customers', category: 'tabs', icon: '👥', title: '客戶名單',
    desc: '看客人累計來店次數、判斷 VIP、看退款紀錄',
    roles: ['agent', 'jun'],
    steps: [
      { center: true, title: '👥 情境：判斷誰是 VIP',
        body: '客人回購率高、來過多次的就是 VIP，可以給特殊優惠。客戶名單幫您一眼分辨。' },
      { tab: 'customers', selector: '[data-sec="customers"]', position: 'bottom',
        title: '進「👥 客戶名單」',
        body: '所有來過的客人都列在這。tab 旁的數字顯示總人數（同一人不重複算）。' },
      { center: true, title: '名單欄位',
        body: '名單會顯示：' + '<table class="mock-table"><tr><th>姓名</th><th>累計</th><th>退款</th><th>標籤</th></tr><tr><td><b>王小明</b></td><td>3 次</td><td>0</td><td><span class="label" style="background:#FBBF24;color:#78350F">VIP</span></td></tr><tr><td>李美玲</td><td>1 次</td><td>0</td><td>新客</td></tr><tr><td>陳大華</td><td>5 次</td><td>1</td><td><span class="label" style="background:#FBBF24;color:#78350F">VIP</span></td></tr></table>' +
              '<ul><li><b>姓名</b>：點進去看完整訂單歷史</li>' +
              '<li><b>累計次數</b>：來過幾次</li>' +
              '<li><b>退款次數</b>：退過幾次（高的要小心）</li>' +
              '<li><b>標籤</b>：VIP / 新客 / 異常</li></ul>' },
      { center: true, title: 'VIP 判定規則',
        body: '<ul><li>🌟 <b>VIP</b>：累計 3+ 次</li>' +
              '<li>📍 <b>新客</b>：第 1 次</li>' +
              '<li>⚠️ <b>異常</b>：退款次數 ≥ 2，或退款比 ≥ 50%</li></ul>' +
              '<div class="info-box">看到 VIP 可以給折扣碼鼓勵繼續來。看到「異常」要小心，可能是奧客。</div>' },
      { tab: 'customers', selector: '#sec-customers',
        title: '搜尋功能',
        body: '上方有搜尋框：可以用<b>姓名</b>或<b>電話</b>找特定客人。' +
              '<div class="example-box">想找「王小明」過去訂過什麼 → 搜尋 王小明 → 看到他所有訂單歷史。</div>' },
      { center: true, title: '點客人看詳情',
        body: '點客人姓名彈出詳情：' +
              '<ul><li>每次訂單的：日期、和服款式、人數、金額、平台</li>' +
              '<li>累計消費金額</li>' +
              '<li>退款歷史（如有）</li>' +
              '<li>備註欄（客服可以加註，例如「對絲質過敏」「喜歡振袖」）</li></ul>' +
              '<div class="info-box">客人下次來，看他的歷史，可以給個性化推薦。</div>' }
    ]
  },

  // ========== 9. 💰 財務報表 ==========
  {
    id: 'finance', category: 'tabs', icon: '💰', title: '財務報表',
    desc: '看每月收入、毛利、退款率、各分店分潤',
    roles: ['agent', 'jun'],
    steps: [
      { center: true, title: '💰 情境：月底想看本月賺了多少',
        body: '財務報表幫您看到完整的數字：營收、毛利、退款率、分店表現。' },
      { tab: 'finance', selector: '[data-sec="finance"]', position: 'bottom',
        title: '進「💰 財務報表」',
        body: 'agent 跟 Jun 看得到。店家看不到（店家用「店家月結」看自家）。' },
      { center: true, title: '本月主要指標',
        body: '頂部會顯示：' +
              '<ul><li><b>本月營收</b>（¥）：所有確認訂單的客人付款</li>' +
              '<li><b>毛利</b>：扣掉店家分潤後旅乘留下的</li>' +
              '<li><b>退款金額</b>：本月退掉的</li>' +
              '<li><b>退款率</b>：退款金額 / 營收</li></ul>' +
              '<div class="info-box">退款率 &gt; 10% 要注意 — 流程是不是有問題、品質有沒有掉？</div>' },
      { center: true, title: '月度趨勢圖',
        body: '可以看連續 6 個月 / 12 個月的趨勢線：' +
              '<ul><li>訂單數</li>' +
              '<li>營收</li>' +
              '<li>平均客單價</li>' +
              '<li>新客 vs 回購比例</li></ul>' +
              '<div class="info-box">看趨勢可以發現淡旺季、行銷活動效果。</div>' },
      { center: true, title: '分店分潤',
        body: '本月各分店的：' +
              '<ul><li>訂單數</li>' +
              '<li>營收</li>' +
              '<li>應收店家 (50% PP)</li>' +
              '<li>應收旅乘 (50% PP)</li></ul>' +
              '<div class="info-box">月底跟店家對帳就用這份數字。</div>' },
      { center: true, title: '退款明細',
        body: '下方會列出所有本月退款的訂單：客人姓名、體驗日、退款金額、退款原因。' +
              '<h4>退款原因分析</h4>' +
              '<ul><li>「行程變更」太多 → 客人提前太久訂、變數大</li>' +
              '<li>「身體不適」異常多 → 季節因素 / 流感</li>' +
              '<li>「服務不佳」 → 紅燈，要找店家檢討</li></ul>' }
    ]
  },

  // ========== 10. 📁 歷史檔案 ==========
  {
    id: 'archive', category: 'tabs', icon: '📁', title: '歷史檔案',
    desc: '已關帳月份的訂單存檔（唯讀），需要查歷史時用',
    roles: ['agent', 'jun'],
    steps: [
      { center: true, title: '📁 情境：客人說 6 月來過，要查當時訂單',
        body: '已經關帳的月份訂單會移到「歷史檔案」。本月活動 tab 不會有，要去這裡查。' },
      { tab: 'archive', selector: '[data-sec="archive"]', position: 'bottom',
        title: '進「📁 歷史檔案」',
        body: '頂部下拉選月份，看該月所有訂單存檔。' +
              '<div class="info-box">歷史檔案是<b>唯讀</b>，不能改。要改要先「解凍」（限 Jun）。</div>' },
      { center: true, title: '怎麼搜尋歷史訂單',
        body: '<ol><li>選月份下拉 → 該月所有訂單列出</li>' +
              '<li>用瀏覽器 Ctrl+F 找客人姓名 / 訂單號</li>' +
              '<li>或匯出 CSV 用 Excel 篩</li></ol>' +
              '<div class="info-box">每月平均 100+ 筆，scroll 找會找瘋。Ctrl+F 比較快。</div>' },
      { center: true, title: 'Jun 限定：🔓 解凍此月份',
        body: '頂部右上有「🔓 解凍此月份」按鈕，<b>只有 Jun 看得到</b>。' +
              '<h4>用途</h4>' +
              '<ul><li>歷史月份發現有筆訂單填錯</li>' +
              '<li>客人事後申訴退款</li>' +
              '<li>稅務調整</li></ul>' +
              '<div class="danger-box">⚠ 解凍會把該月訂單從歷史檔案搬回對帳 tab，可以編輯。改完要再「關帳」。<b>非必要不要解凍</b>。</div>' },
      { center: true, title: '客戶申訴 / 退費追溯',
        body: '客人說「我半年前的訂單想申訴退款」：' +
              '<ol><li>歷史檔案找到該月</li>' +
              '<li>找到那筆訂單</li>' +
              '<li>判斷申訴是否合理（看退改政策、原訂單狀態）</li>' +
              '<li>合理 → Jun 解凍該月 → 處理退款 → 再關帳</li>' +
              '<li>不合理 → 客氣回絕</li></ol>' }
    ]
  },

  // ========== 11. 🔐 權限總表 ==========
  {
    id: 'permissions', category: 'tabs', icon: '🔐', title: '權限總表',
    desc: '看每個角色（Jun / agent / store）能做什麼、不能做什麼',
    roles: ['agent', 'jun', 'store'],
    steps: [
      { center: true, title: '🔐 情境：搞不清楚我能做什麼',
        body: '不知道自己這個角色能不能做某件事？查權限總表最快。' },
      { tab: 'permissions', selector: '[data-sec="permissions"]', position: 'bottom',
        title: '進「🔐 權限總表」',
        body: '表格列出所有功能，每一行對應一個動作。每一列對應一個角色。打勾代表「能做」。' +
              '<div class="info-box">如果功能沒打勾，按按鈕也會被擋下、Sheet 不會寫入。</div>' },
      { center: true, title: '三種角色',
        body: '<ul><li>🌟 <b>Jun</b>：最高權限。所有功能都能做（包含關帳、自動配對、解凍）</li>' +
              '<li>👤 <b>agent</b>（客服）：日常運作。看不到財務細節、不能關帳</li>' +
              '<li>🏪 <b>store</b>（店家）：只看自家門市。看不到其他店家的對帳、不能改別人訂單</li></ul>' +
              '<div class="info-box">您現在登入時左上角會顯示是哪個角色。</div>' },
      { center: true, title: '常見權限差異',
        body: '<table class="mock-table">' +
              '<tr><th>功能</th><th>store</th><th>agent</th><th>Jun</th></tr>' +
              '<tr><td>確認訂單</td><td>❌</td><td>✓</td><td>✓</td></tr>' +
              '<tr><td>處理退款</td><td>❌</td><td>✓</td><td>✓</td></tr>' +
              '<tr><td>Walk-in 開單</td><td>✓</td><td>✓</td><td>✓</td></tr>' +
              '<tr><td>客人代客報到</td><td>✓</td><td>✓</td><td>✓</td></tr>' +
              '<tr><td>對帳作業</td><td>❌</td><td>✓</td><td>✓</td></tr>' +
              '<tr><td>看所有店家月結</td><td>❌</td><td>✓</td><td>✓</td></tr>' +
              '<tr><td>自動配對</td><td>❌</td><td>❌</td><td>✓</td></tr>' +
              '<tr><td>關帳</td><td>❌</td><td>❌</td><td>✓</td></tr>' +
              '<tr><td>解凍歷史月份</td><td>❌</td><td>❌</td><td>✓</td></tr>' +
              '<tr><td>操作紀錄</td><td>❌</td><td>❌</td><td>✓</td></tr>' +
              '</table>' },
      { center: true, title: '我做不到某事？',
        body: '<h4>排查順序</h4>' +
              '<ol><li>查權限總表，看您角色是否有那個權限</li>' +
              '<li>沒權限 → 找 Jun 或對應角色處理</li>' +
              '<li>有權限但按鈕灰色 → 可能訂單狀態不對（如已關帳的不能改）</li>' +
              '<li>還是不行 → 找 Jun 看 console error</li></ol>' }
    ]
  }
,

  // ========== 🌱 入門關 ==========
  {
    id: 'intro_login', category: 'intro', icon: '🔑', title: '登入與帳號管理',
    desc: '怎麼登入後台、密碼忘記怎麼辦、團隊帳號共用規則',
    roles: ['agent', 'jun', 'store'],
    steps: [
      { center: true, title: '🔑 第一次登入後台',
        body: '<h4>三種帳號類型</h4>' +
              '<ul><li>👤 <b>客服 (agent)</b>：如 Jun / Amy / Ren — 用「姓名 + 密碼」登入</li>' +
              '<li>🏪 <b>店家 (store)</b>：osaka1 / kyoto1 / kyoto2 / tokyo1 — 用「門市代號 + 密碼」登入</li>' +
              '<li>🌟 <b>Jun</b>：超級管理者，所有權限</li></ul>' +
              '<div class="info-box">店家帳號是<b>整個門市共用</b>（osaka1 大家用同一組）。客服帳號是<b>個人專屬</b>。</div>' },
      { center: true, title: '登入畫面長這樣',
        body: '<div class="mock-card">' +
              '<div style="font-weight:bold;margin-bottom:8px">🔐 客服後台登入</div>' +
              '<div style="margin-bottom:8px;background:#F8FAFC;padding:6px;border-radius:4px"><span class="mc-label">姓名/門市</span>：<code>Jun</code> or <code>osaka1</code></div>' +
              '<div style="margin-bottom:8px;background:#F8FAFC;padding:6px;border-radius:4px"><span class="mc-label">密碼</span>：****</div>' +
              '<button style="width:100%;padding:8px;background:#1A365D;color:#FFF;border:none;border-radius:4px">登入後台</button>' +
              '</div>' +
              '<div class="info-box">記得密碼 → 瀏覽器幫您存。<b>記住身份 30 天</b>（localStorage）。</div>' },
      { center: true, title: '⚠️ 忘記密碼怎麼辦',
        body: '<ol><li>找 <b>Jun</b>（他是唯一能改/重設密碼的人）</li>' +
              '<li>說明您的角色（客服 Jun / 店家 osaka1 等）</li>' +
              '<li>Jun 會給您新密碼（一次性）</li>' +
              '<li>登入後第一次<b>立刻改成自己記得的</b></li></ol>' +
              '<div class="danger-box">⚠ 不要把密碼貼在便條紙上！店家帳號共用、被偷看到全部完蛋。</div>' },
      { center: true, title: '客服多人 vs 店家共用',
        body: '<h4>客服</h4>每個客服一個帳號（Jun / Amy / Ren）。所有操作會記到 audit log，誰改了什麼都有紀錄。' +
              '<h4>店家</h4>整個門市共用一組（osaka1 全員工都用同個密碼）。雖然方便但<b>無法追究是誰操作的</b>。' +
              '<div class="info-box">店家如果想分開記錄是誰操作，可以在備註欄寫名字（如 「osaka1-小林 開單」）。</div>' },
      { center: true, title: '登出 / 切換帳號',
        body: '右上角「<b>登出</b>」按鈕 → 清掉 localStorage → 跳回登入頁。<br>' +
              '<h4>什麼時候要登出</h4>' +
              '<ul><li>不是您本人的電腦 / 手機（公用機）</li>' +
              '<li>要切換到另一個帳號</li>' +
              '<li>下班</li></ul>' +
              '<div class="info-box">您自己的電腦不必每次登出 → 30 天內自動保持登入狀態。</div>' }
    ]
  },

  {
    id: 'intro_tour', category: 'intro', icon: '🧭', title: '介面全覽 - 9 個 tab',
    desc: '5 分鐘快速看一遍所有 tab 是什麼、我什麼時候會進',
    roles: ['agent', 'jun', 'store'],
    steps: [
      { center: true, title: '🧭 為什麼要先看這個',
        body: '後台有 <b>9 個 tab</b>，每個 tab 對應一種工作。先了解整體輪廓，知道「我這件事該去哪 tab」，後續不會卡關。' },
      { tab: 'dashboard', selector: '.nav-tab[data-sec="dashboard"]', position: 'bottom',
        title: '📊 儀表板 (Dashboard)',
        body: '每天打開後台第一站。看今日營運、本月營收、快速跳轉。<br><b>進來時機：</b>每次登入。' },
      { tab: 'orders', selector: '.nav-tab[data-sec="orders"]', position: 'bottom',
        title: '📋 訂單管理 (Orders)',
        body: '所有訂單列表。最常用的 tab。<br><b>進來時機：</b>處理新預約、退款、查單筆。' },
      { tab: 'checkin', selector: '.nav-tab[data-sec="checkin"]', position: 'bottom',
        title: '🎌 報到中心 (Check-in)',
        body: '今日 ±1 天訂單看板，幫客人報到用。<br><b>進來時機：</b>客人到店時。' },
      { tab: 'calendar', selector: '.nav-tab[data-sec="calendar"]', position: 'bottom',
        title: '📅 行事曆 (Calendar)',
        body: '月曆視角看訂單分佈。<br><b>進來時機：</b>看下週/下月哪天比較忙、規劃班表。' },
      { tab: 'customers', selector: '.nav-tab[data-sec="customers"]', position: 'bottom',
        title: '👥 客戶名單 (Customers)',
        body: '所有客人累計來店次數、VIP 標籤、退款歷史。<br><b>進來時機：</b>客人來電問訂單、判斷是不是 VIP。' },
      { tab: 'finance', selector: '.nav-tab[data-sec="finance"]', position: 'bottom',
        title: '💰 財務報表 (Finance)',
        body: '本月營收、毛利、退款率、分店表現。<br><b>進來時機：</b>月底/月初看績效。<b>店家看不到</b>。' },
      { tab: 'reconcile', selector: '.nav-tab[data-sec="reconcile"]', position: 'bottom',
        title: '🧾 對帳 (Reconcile)',
        body: '把銀行入帳配對到訂單。<br><b>進來時機：</b>每天看銀行 → 配 1-2 小時。<b>店家看不到</b>。' },
      { tab: 'walkin', selector: '.nav-tab[data-sec="walkin"]', position: 'bottom',
        title: '💴 店家月結 (Walk-in 結算)',
        body: '各分店本月 walk-in 訂單 + 應收旅乘。<br><b>進來時機：</b>月底跟店家對帳、生請款單。' },
      { tab: 'archive', selector: '.nav-tab[data-sec="archive"]', position: 'bottom',
        title: '📁 歷史檔案 (Archive)',
        body: '已關帳月份的訂單存檔（唯讀）。<br><b>進來時機：</b>客人事後申訴、追溯歷史紀錄。' },
      { center: true, title: '其他 tab',
        body: '<ul><li>🔐 <b>權限總表</b>：各角色能做什麼</li>' +
              '<li>📜 <b>操作紀錄</b>（Jun only）：audit log，誰改了什麼</li></ul>' +
              '<div class="info-box">這兩個 tab 比較少用，但有需要時很關鍵。</div>' }
    ]
  },

  {
    id: 'intro_lifecycle', category: 'intro', icon: '🔄', title: '訂單生命週期 + 狀態變化',
    desc: '一筆訂單從建立到結案的完整 7 個狀態與轉換規則',
    roles: ['agent', 'jun', 'store'],
    steps: [
      { center: true, title: '🔄 為什麼要懂狀態',
        body: '不懂狀態 → 不知道每筆能做什麼操作 → 走結森林。<br>例：「已退款」的訂單不能再改、「核對中」的訂單還沒收訂金、「已確認」的訂單體驗日 ±1 天才會出現在報到中心。' },
      { center: true, title: '7 個狀態 vs 顏色',
        body: '<table class="mock-table"><tr><th>狀態</th><th>badge 顏色</th><th>意義</th></tr>' +
              '<tr><td>🟡 核對中</td><td>黃色</td><td>客人剛下單，還沒確認</td></tr>' +
              '<tr><td>🟢 已確認</td><td>綠色</td><td>訂金已收，等體驗日</td></tr>' +
              '<tr><td>🎌 已報到</td><td>琥珀</td><td>客人到店了</td></tr>' +
              '<tr><td>✅ 已體驗</td><td>深綠</td><td>體驗完成（過了體驗日）</td></tr>' +
              '<tr><td>🟠 申請退款</td><td>橘色</td><td>客人申請退款，待處理</td></tr>' +
              '<tr><td>🔴 已退款</td><td>紅色</td><td>退款處理完</td></tr>' +
              '<tr><td>⚪ 已關帳</td><td>灰色</td><td>進歷史檔案，唯讀</td></tr></table>' },
      { center: true, title: '🌳 正常流程（happy path）',
        body: '<div class="formula">核對中 → 已確認 → 已報到 → 已體驗 → 已關帳</div>' +
              '<ol><li><b>核對中</b>：客人剛下單。客服看訂金欄、確認資料。</li>' +
              '<li><b>已確認</b>：客服按確認 → 自動寄信、Sheet confirmed=TRUE。</li>' +
              '<li><b>已報到</b>：體驗當天客人到店 → 報到中心點按鈕。</li>' +
              '<li><b>已體驗</b>：過了體驗日，自動轉狀態。</li>' +
              '<li><b>已關帳</b>：月底 Jun 關帳，搬到歷史檔案。</li></ol>' },
      { center: true, title: '🌿 異常分支',
        body: '<h4>退款分支</h4><div class="formula">核對中 / 已確認 → 申請退款 → 已退款</div>' +
              '<ul><li>客人 inquiry 點「申請退款」→ 狀態變申請退款</li>' +
              '<li>客服按政策退錢、標記 → 變已退款</li></ul>' +
              '<h4>異常分支</h4><div class="formula">已確認 → 申請改期 → 已確認（新日期）</div>' +
              '<ul><li>客人想換日期不退款 → 改期</li>' +
              '<li>免費還是收手續費，看政策</li></ul>' },
      { center: true, title: '🚪 不可逆操作',
        body: '<div class="danger-box"><b>1. 已關帳的訂單</b><br>進歷史檔案後唯讀。要改需 Jun「解凍」整個月份。' +
              '</div>' +
              '<div class="danger-box"><b>2. 已退款的訂單</b><br>不能再改成「已確認」。錢已經退了沒辦法回頭。如果客人後悔想再來，請他重新預約一張新單。' +
              '</div>' +
              '<div class="danger-box"><b>3. 已體驗的訂單</b><br>不能改回未體驗。事實已發生。</div>' },
      { center: true, title: '💡 看狀態判斷下一步動作',
        body: '<table class="mock-table"><tr><th>看到狀態</th><th>下一步</th></tr>' +
              '<tr><td>核對中</td><td>看訂金 → 確認或寄信問客人</td></tr>' +
              '<tr><td>已確認</td><td>等體驗日 / 體驗日當天進報到中心</td></tr>' +
              '<tr><td>已報到</td><td>體驗中 / 體驗完不用動</td></tr>' +
              '<tr><td>申請退款</td><td>看政策 → 算金額 → 轉帳 → 標記</td></tr>' +
              '<tr><td>已退款</td><td>結案，不用再動</td></tr></table>' }
    ]
  },

  // ========== ⏰ 每日 SOP ==========
  {
    id: 'sop_morning', category: 'workflow', icon: '🌅', title: '上班第一件事',
    desc: '早上補班第一個小時 SOP - 25 分鐘把昨晚 + 今天事處理好',
    roles: ['agent', 'jun'],
    steps: [
      { center: true, title: '🌅 25 分鐘 morning routine',
        body: '客服每天上班的最佳節奏：<b>25 分鐘完成 5 件事</b>，然後可以好好處理客人來訊。<br><br>下面 5 步是建議順序，您可依自己習慣調。' },
      { tab: 'dashboard', selector: '#sec-dashboard',
        title: 'Step 1 (3 分鐘)：看儀表板',
        body: '進儀表板看：' +
              '<ul><li>今天有幾筆體驗？</li>' +
              '<li>本月營收進度如何？</li>' +
              '<li>有沒有異常數字（如退款率突然飆高）？</li></ul>' +
              '<div class="info-box">大概有底就好，不深究細節。</div>' },
      { tab: 'orders', selector: '#sec-orders',
        title: 'Step 2 (5 分鐘)：處理待確認',
        body: '訂單管理 → 待確認 filter。<br>逐筆檢查 → 訂金有到的快速確認 → 訂金沒到的標記 / 寄信問客人。' +
              '<div class="info-box">⏰ 旅乘服務承諾是 24 小時內確認，所以昨晚進來的單上午要清掉。</div>' },
      { tab: 'reconcile', selector: '#sec-reconcile',
        title: 'Step 3 (10 分鐘)：銀行入帳對帳',
        body: '<ol><li>登入網銀，看昨晚進來的款項</li>' +
              '<li>對帳 tab → unmatched filter</li>' +
              '<li>把每筆銀行入帳配進對應訂單</li>' +
              '<li>填訂金欄、付款時間 → 變 matched</li></ol>' +
              '<div class="info-box">10 分鐘配完，後續客人問訂單狀態時答得出。</div>' },
      { tab: 'orders', selector: '#sec-orders',
        title: 'Step 4 (5 分鐘)：處理退款申請',
        body: '訂單管理 → 退款 filter。<br>逐筆按退改政策算金額 → 轉帳 → 標記。' +
              '<div class="danger-box">沒處理的退款超過 24 小時 → 客人會在 LINE 抱怨。儘早處理。</div>' },
      { center: true, title: 'Step 5 (2 分鐘)：看異常',
        body: '訂單管理 → 異常 filter（金額對不上、訂金超收等）。<br>有的話拉出來個別檢查。' +
              '<div class="info-box">異常通常需要 Jun 確認，截圖丟群組。</div>' },
      { center: true, title: '🎯 完成後',
        body: '25 分鐘做完五件事，接下來就是處理 LINE 來訊、新預約、客人問題。<br><br>下午 4-5 點再做一次同樣流程「清下班」，下班前桌面乾乾淨淨。' }
    ]
  },

  {
    id: 'sop_month_end', category: 'workflow', icon: '📅', title: '月底關帳完整流程',
    desc: '28-30 號要做什麼 → 31 號關帳 → 連結到店家月結',
    roles: ['agent', 'jun'],
    steps: [
      { center: true, title: '📅 月底為什麼要關帳',
        body: '一個月結束 → 把該月所有訂單金額對齊銀行入帳 → 算出店家分潤 → 收/付錢 → 進歷史檔案。<br>關帳不做：店家拿不到錢、Jun 不知道賺多少、月度報表錯亂。' },
      { center: true, title: '⏰ 時間軸',
        body: '<table class="mock-table"><tr><th>日期</th><th>動作</th></tr>' +
              '<tr><td>每天</td><td>對帳 + 退款處理</td></tr>' +
              '<tr><td>25-27 號</td><td>把當月 unmatched 清光，催客人補款</td></tr>' +
              '<tr><td>28-30 號</td><td>檢查 walk-in 月結、生請款單</td></tr>' +
              '<tr><td>30 號晚 / 月初</td><td><b>Jun 關帳</b></td></tr>' +
              '<tr><td>月初 5 號前</td><td>店家匯款給旅乘</td></tr></table>' },
      { tab: 'reconcile', selector: '#sec-reconcile',
        title: '步驟 1：對帳 tab 清光 unmatched',
        body: '<ol><li>看本月 unmatched 訂單</li>' +
              '<li>催客人補款（LINE / Email）</li>' +
              '<li>客人不打算來 → 處理退款</li>' +
              '<li>對帳完成率達 100% 或可接受</li></ol>' +
              '<div class="info-box">目標：本月所有訂單都是 matched / partial / refunded，沒有 unmatched。</div>' },
      { tab: 'walkin', selector: '#sec-walkin',
        title: '步驟 2：店家月結 tab 看 walk-in',
        body: '<ol><li>選本月份</li>' +
              '<li>看各分店本月 walk-in 訂單</li>' +
              '<li>確認總收入、應收旅乘分潤</li>' +
              '<li>點右上「📄 請款單」生成請款單</li>' +
              '<li>請款單 PDF 寄給店家</li></ol>' },
      { center: true, title: '步驟 3：跟店家確認金額',
        body: '<ol><li>LINE 群組丟請款單 PDF</li>' +
              '<li>店家對自家的 walk-in 訂單明細</li>' +
              '<li>店家確認沒問題 → 安排匯款時間</li>' +
              '<li>店家有異議 → 對單檢查、可能要補開單或退款</li></ol>' +
              '<div class="info-box">店家通常 5 號前匯款。沒匯款的提醒。</div>' },
      { center: true, title: '步驟 4 (Jun)：關帳',
        body: '<ol><li>對帳 tab 確認本月所有訂單狀態 OK</li>' +
              '<li>點「<b>📦 關帳並歸檔</b>」按鈕（Jun only）</li>' +
              '<li>系統把該月訂單搬到歷史檔案</li>' +
              '<li>本月份不能再編輯（要改要解凍）</li>' +
              '<li>新月份從 1 號開始累計</li></ol>' +
              '<div class="danger-box">關帳是<b>不可逆操作</b>。確認都對才能按。</div>' },
      { center: true, title: '步驟 5：等店家匯款',
        body: '<ol><li>店家應該月初 5 號前匯款給旅乘</li>' +
              '<li>網銀看到入帳 → 截圖留底</li>' +
              '<li>沒收到的店家 → LINE 提醒、寄催繳信</li>' +
              '<li>金額有誤 → 找對方對單</li></ol>' +
              '<div class="info-box">這部分目前是手動追，沒有系統自動催。</div>' },
      { center: true, title: '⚠️ 常見錯誤',
        body: '<div class="danger-box">關帳後發現有筆訂單忘記改 → 找 Jun 解凍 → 改 → 再關帳。不要直接到 Sheet 改（會繞過系統紀錄）。</div>' +
              '<div class="danger-box">店家匯款金額跟請款單不符 → 可能店家算錯、可能 walk-in 漏報。打電話對單，不要默默接受差額。</div>' }
    ]
  },

  {
    id: 'sop_peak', category: 'workflow', icon: '🌊', title: '連假浪潮應對',
    desc: '連假/櫻花季客人暴增怎麼處理？預防客訴、確保品質',
    roles: ['agent', 'jun', 'store'],
    steps: [
      { center: true, title: '🌊 為什麼連假是地獄模式',
        body: '一般日：每天 5-10 筆新預約。<br><b>連假 / 櫻花季 / 楓葉季</b>：可能單日 30-50 筆，是平時的 5-10 倍。' +
              '<ul><li>客服處理不及</li>' +
              '<li>店家人手不夠</li>' +
              '<li>客人沒收到回信開始嫌</li>' +
              '<li>店家忙到 walk-in 漏開單 → 對帳出包</li></ul>' },
      { center: true, title: '🔭 預先看到浪潮',
        body: '<h4>每月 1 號看下個月連假</h4>' +
              '<ul><li>5 月：黃金週（5/3-5/5 連假）</li>' +
              '<li>7 月：海之日</li>' +
              '<li>9 月：敬老日 / 秋分</li>' +
              '<li>11 月：紅葉季</li>' +
              '<li>3-4 月：櫻花季（最瘋）</li></ul>' +
              '<h4>檢查方法</h4>' +
              '<ol><li>進<b>📅 行事曆</b>看下月</li>' +
              '<li>看哪些日子訂單數 &gt; 8（紅色）</li>' +
              '<li>提前 2 週開始預備</li></ol>' },
      { center: true, title: '⚙️ 預備措施',
        body: '<h4>客服側</h4>' +
              '<ul><li>連假前 1 週開始加班（早 1 小時上班）</li>' +
              '<li>準備好罐頭回信模板（確認信、退款信）</li>' +
              '<li>分工：A 處理新預約、B 處理退款 + 對帳</li></ul>' +
              '<h4>店家側</h4>' +
              '<ul><li>加派工讀生（妝髮 / 攝影 / 接待）</li>' +
              '<li>備好和服庫存（大小尺碼夠不夠）</li>' +
              '<li>每筆 walk-in <b>當下立刻開單</b>，不要等下班統一輸入</li></ul>' },
      { center: true, title: '🚨 即時應對',
        body: '<h4>客人爆量訊息</h4>' +
              '<ul><li>LINE / FB 設自動回覆「連假期間訊息回覆較慢，48 小時內處理」</li>' +
              '<li>急件用「<b>緊急</b>」標籤，優先處理</li></ul>' +
              '<h4>店家忙到爆</h4>' +
              '<ul><li>店家用 LINE 群組同步狀況：「現場排隊 20 人、預計等 40 分鐘」</li>' +
              '<li>客服據此通知還在路上的客人，給延遲到店的彈性</li></ul>' +
              '<div class="info-box">事前準備好就不會亂。最怕的是<b>事到臨頭沒備案</b>。</div>' },
      { center: true, title: '💡 浪潮過後',
        body: '<ol><li>把當期所有訂單對帳清完（再忙也要 3 天內）</li>' +
              '<li>店家補開漏掉的 walk-in 訂單</li>' +
              '<li>檢查退款率 / 客訴量</li>' +
              '<li>跟團隊 retro：哪邊出狀況？怎麼改善？</li></ol>' }
    ]
  },

  {
    id: 'sop_handoff', category: 'workflow', icon: '🔄', title: '門市交接班 + 下班關機',
    desc: '下班前最後一小時 SOP + 交接給下一班 / 隔天的注意事項',
    roles: ['store'],
    steps: [
      { center: true, title: '🔄 為什麼要正式交接',
        body: '店家通常一天兩班（上午班/下午班）。沒交接 → 下一班不知道現場狀況、漏處理客訴、隔天打開後台一團亂。' +
              '<div class="info-box"><b>5 分鐘交接</b> 省下後續 30 分鐘扯皮。</div>' },
      { center: true, title: '下班前 30 分鐘',
        body: '<ol><li><b>把今日 walk-in 都開單</b> — 不要說「等下班再輸入」</li>' +
              '<li><b>報到中心檢查</b> — 今日有客人沒報到嗎？（可能沒來、可能您忘記點）</li>' +
              '<li><b>清桌</b> — 還沒結算的訂單寫便條，給下一班</li>' +
              '<li><b>備品檢查</b> — 和服有沒有歸位、有沒有要洗的</li></ol>' },
      { center: true, title: '下班前 10 分鐘 - 交接訊息',
        body: '<h4>給下一班的訊息（LINE 群組丟）</h4>' +
              '<div class="example-box"><b>下午班交接</b><br>• 今日完成 8 筆訂單<br>• 客人 王小明 (K260514005) 中午找不到位置，後來請他改下午 4 點，請晚班幫忙留意<br>• 振袖庫存只剩 2 件，要洗 3 件<br>• 客人投訴的事我跟 Jun 講過了，回頭看 LINE</div>' +
              '<div class="info-box">不用很正式，但<b>重點寫清楚</b>。</div>' },
      { center: true, title: '關店流程（最後一班）',
        body: '<ol><li>確認所有客人都報到完了 / 體驗結束了</li>' +
              '<li>對今日收款（現金 + 信用卡 + QR Code）</li>' +
              '<li>當日 walk-in 訂單清單對一次（沒漏）</li>' +
              '<li>歸位、清掃</li>' +
              '<li>LINE 群組丟「<b>X 月 X 日打烊</b>」</li>' +
              '<li>關電燈、鎖門</li></ol>' },
      { center: true, title: '⚠️ 常見交接 fail',
        body: '<div class="danger-box"><b>1. 忘記跟下一班說有客訴</b><br>下一班完全不知道，客人來追時答非所問 → 客訴升級。</div>' +
              '<div class="danger-box"><b>2. walk-in 沒輸入</b><br>下一班看後台沒紀錄，以為客人沒結，硬要重收一次 → 客人爆怒。</div>' +
              '<div class="danger-box"><b>3. 收款數字沒對</b><br>下班沒對現金 → 隔天少了 ¥3000 不知道是誰收到。</div>' }
    ]
  },

  // ========== 🔧 特殊 / 異常場景 ==========
  {
    id: 'special_reschedule', category: 'special', icon: '🔁', title: '客人要改期',
    desc: '不是退款，是換體驗日期 - 怎麼操作、是否收手續費',
    roles: ['agent', 'jun'],
    steps: [
      { center: true, title: '🔁 情境：客人想換日期',
        body: '客人「王小明」訂 7/5，臨時行程變更，想改成 7/12。<b>不是退款</b>，只是換日期。' +
              '<h4>改期 vs 退款的差別</h4>' +
              '<ul><li><b>改期</b>：訂金保留 → 換一個日期 → 不用重新匯款</li>' +
              '<li><b>退款</b>：錢退回客人 → 訂單作廢 → 想再來要重新預約</li></ul>' +
              '<div class="info-box">改期對雙方都好：客人不用重匯款、我們不損失訂單。</div>' },
      { center: true, title: '改期政策',
        body: '<table class="mock-table"><tr><th>距體驗日</th><th>能改嗎</th><th>手續費</th></tr>' +
              '<tr><td>7 天前+</td><td>✓ 自由改</td><td>免費</td></tr>' +
              '<tr><td>2-6 天前</td><td>✓ 改 1 次</td><td>免費（首次）/ NT$200（第二次）</td></tr>' +
              '<tr><td>前一日 / 當日</td><td>❌ 不能改</td><td>只能退費或損失</td></tr></table>' +
              '<div class="danger-box">每筆訂單<b>最多改 2 次</b>。第 3 次要請示 Jun。</div>' },
      { tab: 'orders', selector: '#sec-orders',
        title: '操作步驟',
        body: '<ol><li>訂單管理找到該訂單</li>' +
              '<li>點「📝 編輯」</li>' +
              '<li>找到「<b>體驗預約日 (C 欄)</b>」修改為新日期</li>' +
              '<li>備註欄加註「改期 1 次，原 7/5 → 7/12」</li>' +
              '<li>儲存</li></ol>' +
              '<div class="info-box">系統不自動寄改期確認信，要手動 LINE / Email 通知客人新日期確認。</div>' },
      { center: true, title: '通知客人',
        body: '<h4>建議訊息</h4>' +
              '<div class="example-box">「王先生您好，您的預約已經改成 7/12 14:00。原訂金 NT$1000 已保留，當天直接到店即可。如有問題請告知。」</div>' +
              '<h4>提醒事項</h4>' +
              '<ul><li>新日期該門市有沒有人手能接</li>' +
              '<li>客人是否原本選的店家還在營業</li>' +
              '<li>季節性方案是否還適用（例：櫻花季方案在 5 月後就沒了）</li></ul>' },
      { center: true, title: '收手續費的情況',
        body: '<h4>什麼時候收</h4>' +
              '<ul><li>客人第 2 次改期</li>' +
              '<li>客人改到櫻花季 / 連假等漲價時段（補價差）</li></ul>' +
              '<h4>怎麼收</h4>' +
              '<ol><li>跟客人說明，取得同意</li>' +
              '<li>讓客人匯手續費 NT$200 到旅乘戶頭</li>' +
              '<li>確認到帳後再改日期</li>' +
              '<li>備註欄記「補手續費 NT$200，5/15 已收到」</li></ol>' },
      { center: true, title: '⚠️ 常見錯誤',
        body: '<div class="danger-box"><b>1. 改太多次沒提示</b><br>客人改第 5 次了還在免費改 → 之後變慣性。第 2 次就要提手續費。</div>' +
              '<div class="danger-box"><b>2. 改到價差不同的時段</b><br>客人本來訂淡季 ¥3500，改成櫻花季 ¥4500，沒補差 → 自己吃虧。</div>' +
              '<div class="danger-box"><b>3. 忘記 LINE 通知</b><br>系統不會自動寄改期確認信，客人不知道改成功了，當天還去原日期。</div>' }
    ]
  },

  {
    id: 'special_not_found', category: 'special', icon: '🔍', title: '客人到門口但找不到訂單',
    desc: '排查步驟：訂單號錯 / Email 拼錯 / 跑錯店 / 已關帳？',
    roles: ['agent', 'jun', 'store'],
    steps: [
      { center: true, title: '🔍 情境：客人說「我有訂啊」但找不到',
        body: '客人「王小明」站在櫃台說：「我有預約啊！」<br>您搜尋客戶名單、訂單管理…完全找不到。' +
              '<h4>可能原因（排查順序）</h4>' +
              '<ol><li>訂單號客人記錯（換一個搜法）</li>' +
              '<li>Email / 電話拼錯</li>' +
              '<li>他訂的是別家店</li>' +
              '<li>訂單已關帳（搬到歷史檔案）</li>' +
              '<li>他根本沒訂過</li></ol>' },
      { center: true, title: 'Step 1：用不同關鍵字找',
        body: '<ol><li><b>姓名</b>：訂單管理 → 進階搜尋 → 輸入姓名</li>' +
              '<li><b>電話末3碼</b>：客人手機末 3 碼通常記得</li>' +
              '<li><b>Email</b>：完整 Email 找</li>' +
              '<li><b>體驗日期</b>：請客人說大概哪天 → 行事曆 view 找</li></ol>' +
              '<div class="info-box">客人通常記得「我下訂前後幾天」、「金額是多少」這類資訊，多問。</div>' },
      { center: true, title: 'Step 2：問客人「您訂的是哪家店？」',
        body: '客人可能：' +
              '<ul><li>大阪訂的跑到京都來體驗</li>' +
              '<li>清水寺店訂的跑到祇園店</li>' +
              '<li>東京淺草訂的當地以為日本只有一家</li></ul>' +
              '<h4>處理</h4>' +
              '<ol><li>問清楚是「哪一家旅乘 x 和服」</li>' +
              '<li>跟客人說：「您預約的是 XX 店，但這裡是 YY 店」</li>' +
              '<li>看 YY 店今天還有沒有空位</li>' +
              '<li>有 → 幫他在 YY 店現場 walk-in 開單</li>' +
              '<li>沒 → 道歉、請他去 XX 店或退費</li></ol>' },
      { center: true, title: 'Step 3：歷史檔案找',
        body: '如果客人說「我幾個月前訂的」：' +
              '<ol><li>進「📁 歷史檔案」tab</li>' +
              '<li>下拉選那個月份</li>' +
              '<li>Ctrl+F 搜尋姓名</li></ol>' +
              '<div class="info-box">如果客人說的月份還沒關帳 → 在訂單管理 tab。已關帳的才在歷史檔案。</div>' },
      { center: true, title: 'Step 4：客人根本沒訂',
        body: '<h4>客人是不是搞混跟別家店</h4>' +
              '<ul><li>跟客人說：「我們系統真的沒有您的訂單，請問訂單確認信還在嗎？」</li>' +
              '<li>客人翻 Email → 可能是「ABC 和服體驗」不是旅乘</li></ul>' +
              '<h4>客人堅持是這家</h4>' +
              '<ol><li>客人講話可疑或激動 → 通知 Jun</li>' +
              '<li>客人就是想白嫖 → 客氣回絕</li>' +
              '<li>客人真心想體驗 → 看現場能不能接 walk-in</li></ol>' },
      { center: true, title: 'Step 5：補救方案',
        body: '客人氣到要走人，怎麼留？' +
              '<ul><li><b>能接</b>：walk-in 開單，給個小折扣 (如 5%) 安撫</li>' +
              '<li><b>不能接</b>：道歉 → 給折扣碼下次來用（如 EARLY8）→ 客人通常會原諒</li></ul>' +
              '<div class="info-box">客人到門口都是想體驗的。最好不要把他空手送走。</div>' }
    ]
  },

  {
    id: 'special_complaint', category: 'special', icon: '😤', title: '客訴處理 SOP',
    desc: '客人不滿意服務 / 品質怎麼處理 - 語氣、權限邊界、何時抓 Jun',
    roles: ['agent', 'jun', 'store'],
    steps: [
      { center: true, title: '😤 客訴是必然的',
        body: '一個月處理 200+ 客人，<b>1-2 個客訴是常態</b>。處理得好 → 客人變死忠粉絲。處理得爛 → Google Map / IG 留負評，影響後續 100+ 客人。' +
              '<div class="info-box">關鍵：<b>第一句話定基調</b>。客人氣的不是事情本身，是覺得沒被聽見。</div>' },
      { center: true, title: '🎯 第一原則：先聽、後處理',
        body: '<h4>客人剛開始發火時</h4>' +
              '<ul><li>❌ 不要：「我們公司規定是...」「您應該要...」「這是您自己沒看清楚...」</li>' +
              '<li>✅ 要：「謝謝您告訴我」「您的感受很重要」「我幫您看一下」</li></ul>' +
              '<div class="info-box">先讓客人說完整件事，不要打斷、不要解釋。<b>客人講完心氣消一半</b>。</div>' },
      { center: true, title: '💬 推薦話術',
        body: '<h4>客訴開頭</h4>' +
              '<div class="example-box">「<b>非常抱歉造成您的困擾</b>，我可以了解您現在的感受。可以再請您告訴我詳細經過嗎？我幫您看怎麼解決。」</div>' +
              '<h4>客人質問退費</h4>' +
              '<div class="example-box">「我了解，我們的退改政策是 [說明]。以您的情況我會 [具體方案]，這樣可以嗎？」</div>' +
              '<h4>客人不接受</h4>' +
              '<div class="example-box">「我們真的希望幫您處理，這部分超出我的權限，我幫您聯繫主管 Jun，最晚 24 小時內回覆您可以嗎？」</div>' },
      { center: true, title: '⚖️ 權限邊界',
        body: '<h4>客服可決定（在預算內）</h4>' +
              '<ul><li>退 50% 訂金（即使政策不該退）</li>' +
              '<li>給折扣碼下次來</li>' +
              '<li>升級和服款式</li>' +
              '<li>加贈攝影（價值 ¥3000 以內）</li></ul>' +
              '<h4>必須轉 Jun</h4>' +
              '<ul><li>客人要全額退費（高於政策的）</li>' +
              '<li>客人威脅要法律行動</li>' +
              '<li>客人提到具體賠償金額（&gt; ¥10,000）</li>' +
              '<li>媒體 / KOL（影響力）</li></ul>' },
      { center: true, title: '📝 紀錄客訴',
        body: '<h4>哪裡記</h4>' +
              '<ol><li>該客人的訂單卡備註欄寫「[客訴] 客人投訴 XX，我方處理 YY，5/14」</li>' +
              '<li>客戶名單那位客人的標籤加「客訴」</li>' +
              '<li>嚴重的 → LINE 群組 + 通知 Jun</li></ol>' +
              '<div class="info-box">下次客人來，下一個客服能看到備註，<b>不會踩同個地雷</b>。</div>' },
      { center: true, title: '🚨 哪些客訴一定要抓 Jun',
        body: '<div class="danger-box">' +
              '<ul><li>客人說要去消基會 / 公平交易委員會</li>' +
              '<li>客人說要在 Google / IG / 旅遊論壇寫負評</li>' +
              '<li>客人錄影 / 錄音威脅</li>' +
              '<li>客人受傷（妝髮過敏、和服繩太緊等）</li>' +
              '<li>客人未滿 18 歲或有家長代訴</li>' +
              '<li>單筆損失預估 &gt; NT$1萬</li></ul>' +
              '</div>不要嘗試自己處理這些，<b>馬上抓 Jun</b>。' }
    ]
  },

  {
    id: 'special_refund_error', category: 'special', icon: '⚠️', title: '退款轉錯帳戶 / 金額',
    desc: '人為失誤怎麼補救、怎麼避免下次再犯',
    roles: ['agent', 'jun'],
    steps: [
      { center: true, title: '⚠️ 情境：剛剛轉錯了',
        body: '兩種失誤：' +
              '<ol><li><b>轉錯帳戶</b>：A 客人的退款轉到 B 客人帳號</li>' +
              '<li><b>轉錯金額</b>：應該退 NT$1000 結果轉了 NT$10000</li></ol>' +
              '<div class="danger-box">⚠ 兩種都是可怕的失誤，但有補救方法。<b>越早處理越好</b>。</div>' },
      { center: true, title: 'Case 1：轉錯帳戶',
        body: '<h4>立即動作（10 分鐘內）</h4>' +
              '<ol><li>⚠ 通知 Jun（必須）</li>' +
              '<li>截圖轉帳紀錄</li>' +
              '<li>確認對方帳戶是不是自己人 / 公司另一個帳戶</li></ol>' +
              '<h4>是自己人 → 內部調回</h4>' +
              '<h4>是真陌生人</h4>' +
              '<ol><li>用「<b>誤匯撤回</b>」找銀行（盡早，最好 30 分鐘內）</li>' +
              '<li>留下對方帳號資料 → Jun 報案</li>' +
              '<li>同時通知原本該收錢的客人「退款延遲，會在 X 天內處理」</li>' +
              '<li>用<b>自己錢</b>先補退給該客人，避免延誤</li></ol>' +
              '<div class="info-box">銀行誤匯撤回成功率約 50%，超過 24 小時就很難了。</div>' },
      { center: true, title: 'Case 2：轉錯金額（少轉）',
        body: '<h4>例：應退 NT$1000，轉了 NT$100</h4>' +
              '<ol><li>立刻補轉差額 NT$900</li>' +
              '<li>後台「<b>退款金額</b>」欄重新填正確總額 NT$1000</li>' +
              '<li>備註欄寫「補轉 NT$900，5/14」</li>' +
              '<li>LINE 跟客人解釋並道歉</li></ol>' +
              '<div class="info-box">客人通常會諒解這種「漏一個零」的小失誤。</div>' },
      { center: true, title: 'Case 3：轉錯金額（多轉）',
        body: '<h4>例：應退 NT$1000，轉了 NT$10000</h4>' +
              '<ol><li>⚠ 立刻通知 Jun</li>' +
              '<li>LINE 客戶「不好意思，剛剛系統失誤多匯 NT$9000，可否請您幫忙退回」</li>' +
              '<li>客人配合退回 → 後台金額改正</li>' +
              '<li>客人不配合 → Jun 評估法律途徑</li></ol>' +
              '<div class="danger-box">客人不一定願意退多收的錢。<b>客戶通常會看到帳戶多錢直接花掉</b>。要趕快聯繫。</div>' },
      { center: true, title: '🛡️ 預防再犯',
        body: '<h4>SOP 改進</h4>' +
              '<ol><li>轉帳前<b>大聲念出來</b>：「轉給 王小明 NT$ 一千元」</li>' +
              '<li>金額欄填完<b>暫停 3 秒</b>，再點確認</li>' +
              '<li>單筆超過 NT$5000 → 截圖給 Jun 看過再轉</li>' +
              '<li>用銀行 App「<b>常用帳戶</b>」功能，把高頻退款客人加最愛</li></ol>' +
              '<h4>系統面</h4>' +
              '<ul><li>後台「退款金額」欄加 confirmation：「您確定退款 NT$10,000？」</li>' +
              '<li>單筆超過 NT$5000 自動 highlight 紅色</li></ul>' }
    ]
  },

  // ========== 🎓 Jun 管理者進階 ==========
  {
    id: 'jun_coupon', category: 'jun_advanced', icon: '🎟️', title: '折扣碼新增 / 修改',
    desc: '怎麼建新折扣碼、設定有效期 / 限定門市',
    roles: ['jun'],
    steps: [
      { center: true, title: '🎟️ Jun 限定：折扣碼管理',
        body: '只有 Jun 能新增 / 修改折扣碼。客服 / 店家看不到這個能力。' +
              '<h4>什麼時候建</h4>' +
              '<ul><li>行銷活動（雙 11、櫻花季）</li>' +
              '<li>特定 KOL 合作（KOL 自帶折扣碼）</li>' +
              '<li>單一客戶補償（客訴後給）</li></ul>' },
      { center: true, title: '直接到 Sheet 編輯',
        body: '<ol><li>打開 Sheet 「<b>折扣碼分頁</b>」</li>' +
              '<li>新增一行</li>' +
              '<li>填欄位：折扣碼、折數 (5-10)、有效期、限定門市、備註</li>' +
              '<li>儲存</li></ol>' +
              '<h4>欄位範例</h4>' +
              '<table class="mock-table"><tr><th>折扣碼</th><th>折數</th><th>有效期</th><th>限定</th></tr>' +
              '<tr><td>EARLY8</td><td>8</td><td>2026-05-31</td><td>全店</td></tr>' +
              '<tr><td>OSAKA10</td><td>9</td><td>2026-12-31</td><td>osaka1</td></tr>' +
              '<tr><td>VIPSPECIAL</td><td>7</td><td>2026-06-30</td><td>VIP only</td></tr></table>' },
      { center: true, title: '折扣碼怎麼運作',
        body: '客人在 inquiry.html 表單填「折扣碼」欄 → 系統：' +
              '<ol><li>到 Sheet 折扣碼分頁找該碼</li>' +
              '<li>檢查有效期（過期不算）</li>' +
              '<li>檢查限定門市（如限 osaka1 但客人選 kyoto1 → 不算）</li>' +
              '<li>取得折數</li>' +
              '<li>實收方案 = 原價 × (折數/10)</li></ol>' },
      { center: true, title: '常用折扣碼設計',
        body: '<h4>命名規則</h4>' +
              '<ul><li><code>EARLY8</code>：早鳥 8 折</li>' +
              '<li><code>LATE7</code>：當週 7 折（降價清庫存）</li>' +
              '<li><code>VIP5</code>：VIP 半價（特殊情況）</li>' +
              '<li><code>KOL_AYANO</code>：跟 KOL 綾乃合作（KOL 自帶）</li></ul>' +
              '<div class="info-box">命名要直覺，客人輸入順手。<b>不要</b> <code>asd9f8</code> 這種看不懂的。</div>' },
      { center: true, title: '⚠️ 注意事項',
        body: '<div class="danger-box"><b>1. 折扣只折 PP（和服費）</b><br>不折妝髮、攝影。寫明，客人預期才不會錯。</div>' +
              '<div class="danger-box"><b>2. 折扣由旅乘吸收</b><br>店家照原價收 50%，差額是旅乘虧。所以不能亂發大折扣（會虧錢）。</div>' +
              '<div class="danger-box"><b>3. 過期不寫期限</b><br>「永久有效」很危險，1 年後忘記它存在會亂套用。<b>都要有有效期</b>。</div>' }
    ]
  },

  {
    id: 'jun_staff', category: 'jun_advanced', icon: '👨‍💼', title: '新增 / 刪除員工帳號',
    desc: 'agent 新人進來怎麼建帳號 / 離職怎麼撤帳號',
    roles: ['jun'],
    steps: [
      { center: true, title: '👨‍💼 員工帳號管理',
        body: '所有員工帳號（含 token、密碼、權限）都在 GAS Script Properties。<br>只有 Jun 能改。' +
              '<h4>什麼時候要動</h4>' +
              '<ul><li>新人入職</li>' +
              '<li>員工離職</li>' +
              '<li>員工請假代理（暫時授權）</li>' +
              '<li>密碼洩漏要重發</li></ul>' },
      { center: true, title: '新增 agent 帳號',
        body: '<h4>Sheet 端</h4>' +
              '<ol><li>打開 Sheet「<b>系統設定</b>」分頁</li>' +
              '<li>找「員工密碼」區</li>' +
              '<li>新增一行：姓名、密碼 (8 位以上)、角色 (agent)、Email</li></ol>' +
              '<h4>GAS 端（可選）</h4>' +
              '<ol><li>如果是用 token 認證，到 Script Properties 加 <code>ADM_xxxxxxx</code> 屬性</li>' +
              '<li>值是 JSON：<code>{"name":"Amy","role":"agent","exp":1735689600000}</code></li>' +
              '<li>exp = 過期時間（毫秒 Unix timestamp）</li></ol>' +
              '<div class="info-box">新人進系統後第一次登入會自動生 token，token 存在 Sheet 系統設定。</div>' },
      { center: true, title: '新增 store 帳號',
        body: '<h4>步驟</h4>' +
              '<ol><li>選店家代號（不能跟現有重複）：osaka1 / osaka2 / kyoto1 / kyoto2 / tokyo1 / tokyo2</li>' +
              '<li>到 Sheet「<b>系統設定</b>」加新行：代號、密碼、role=store、所在城市</li>' +
              '<li>把密碼<b>面交</b>店家負責人，不要丟群組</li></ol>' +
              '<div class="info-box">store 帳號是整店共用，密碼是門市秘密。</div>' },
      { center: true, title: '員工離職',
        body: '<ol><li>該員工的密碼<b>立刻改</b>（先把人鎖在外面）</li>' +
              '<li>Sheet 系統設定加備註「已離職 2026-05-14」</li>' +
              '<li>檢查最近 30 天他的 audit log，有沒有可疑操作</li>' +
              '<li>Script Properties 對應的 ADM_token 屬性<b>刪掉</b></li>' +
              '<li>該員工的客人交接給其他客服（看備註欄客人有沒有特殊需求）</li></ol>' },
      { center: true, title: '臨時授權代理',
        body: '<h4>例：Amy 請假 1 週，Ren 代理</h4>' +
              '<ol><li>不用建新帳號，Ren 用自己的就好</li>' +
              '<li>Sheet 系統設定加備註「Ren 代理 Amy 客人，5/14-5/21」</li>' +
              '<li>客戶 LINE 來訊 Ren 都先接</li>' +
              '<li>大狀況決定先擱置等 Amy 回來，或請示 Jun</li></ol>' +
              '<div class="info-box">代理期間 Ren 的 audit log 會混進 Amy 的客人，要備註清楚。</div>' }
    ]
  },

  {
    id: 'jun_invoice', category: 'jun_advanced', icon: '💸', title: '店家請款單 + 匯款流程',
    desc: '月底生請款單給店家、追店家匯款、處理差異',
    roles: ['jun'],
    steps: [
      { center: true, title: '💸 月底跟店家對帳',
        body: '旅乘的營利模式：店家收客人錢 → 月底匯給旅乘分潤。<br><b>每個月跑一次</b>。' +
              '<div class="formula">店家收 ¥100,000 walk-in → 店家保留 ¥80,000 + 應匯旅乘 ¥20,000</div>' },
      { tab: 'walkin', selector: '#walkin-stores-grid',
        title: '生請款單',
        body: '<ol><li>進「<b>💴 店家月結</b>」tab</li>' +
              '<li>選上個月份</li>' +
              '<li>每家店一張卡片，顯示本月 walk-in 訂單數、總金額、應收旅乘</li>' +
              '<li>點卡片右上「📄 請款單」</li>' +
              '<li>系統開新分頁生成 PDF 格式請款單</li>' +
              '<li>Ctrl+P 列印 / Save PDF</li></ol>' },
      { center: true, title: '請款單格式',
        body: '請款單包含：' +
              '<ul><li>店家名稱、月份</li>' +
              '<li>本月 walk-in 訂單明細（日期、姓名、金額、分潤）</li>' +
              '<li>應收旅乘總金額</li>' +
              '<li>旅乘銀行戶頭（給店家匯款用）</li>' +
              '<li>付款期限（每月 5 號前）</li></ul>' +
              '<div class="info-box">PDF 寄給店家負責人 + LINE 群組通知。</div>' },
      { center: true, title: '追蹤店家匯款',
        body: '<ol><li>每月 1-5 號每天看公司戶頭</li>' +
              '<li>店家匯款進帳 → Sheet「<b>月結追蹤</b>」表打勾</li>' +
              '<li>5 號還沒收到的店家 → 個別 LINE 提醒</li>' +
              '<li>10 號還沒收 → 電話催收</li>' +
              '<li>15 號還沒收 → 列為「異常」店家</li></ol>' +
              '<div class="info-box">99% 的店家會準時匯款。不準時的通常是新合作或有狀況。</div>' },
      { center: true, title: '處理差異',
        body: '<h4>店家匯款金額跟請款單對不上</h4>' +
              '<ol><li>看請款單明細，店家可能算錯</li>' +
              '<li>對方有沒有用其他方式付（如抵扣下月或對方代墊）</li>' +
              '<li>聯繫店家對單，找出差異原因</li>' +
              '<li>差異 &lt; ¥500 接受、&gt;¥500 找出帳</li></ol>' +
              '<h4>店家漏報 walk-in</h4>' +
              '<ol><li>店家忘了輸入幾筆 walk-in → 應收旅乘少算</li>' +
              '<li>請店家補開單（要解凍）</li>' +
              '<li>下個月補請款</li></ol>' },
      { center: true, title: '⚠️ 常見糾紛',
        body: '<div class="danger-box"><b>1. 店家認為「妝髮也要分潤」</b><br>合約寫明妝髮 100% 店家收。如果忘記跟店家解釋，會有反彈。</div>' +
              '<div class="danger-box"><b>2. 店家私下接訂單沒輸入</b><br>客人爆料才知道。需要明察暗訪、看 Google 評論的客人是不是在 admin 找得到。</div>' +
              '<div class="danger-box"><b>3. 店家拖欠匯款</b><br>合約寫每月 5 號前。連續 3 個月晚匯款 → 評估是否中止合作。</div>' }
    ]
  },

  {
    id: 'jun_audit', category: 'jun_advanced', icon: '📜', title: '操作紀錄 audit log',
    desc: 'Jun 限定 tab，查誰在何時改了什麼（責任 / 補救 / 審計）',
    roles: ['jun'],
    steps: [
      { center: true, title: '📜 audit log 是什麼',
        body: '系統會把每個重要動作記下來：' +
              '<ul><li>誰</li>' +
              '<li>什麼時候</li>' +
              '<li>對哪筆訂單做了什麼</li>' +
              '<li>原值 → 新值（如把金額從 1000 改成 5000）</li></ul>' +
              '<div class="info-box">Jun 限定 tab，其他人看不到。</div>' },
      { center: true, title: '📌 用途',
        body: '<h4>1. 查責任</h4>有筆訂單金額被改了 → 看是誰改的、什麼時候改的<br>' +
              '<h4>2. 補救</h4>客人投訴「我訂的不是這樣」→ 看當初下訂時的原始值<br>' +
              '<h4>3. 審計 / 法規</h4>稅務查 / 公司年度審計時要提供操作紀錄' },
      { tab: 'audit', selector: '[data-sec="audit"]', position: 'bottom',
        title: '進「📜 操作紀錄」 tab',
        body: '只有 Jun 看得到。其他角色 nav 上根本不顯示這個 tab。' },
      { center: true, title: '怎麼搜尋',
        body: '<h4>頂部 filter</h4>' +
              '<ul><li><b>日期範圍</b>：限定查詢時段</li>' +
              '<li><b>操作者</b>：誰做的（Jun / Amy / Ren / osaka1...）</li>' +
              '<li><b>動作類型</b>：booking / confirm / refund / checkin / edit</li>' +
              '<li><b>訂單號</b>：找特定訂單的所有操作</li></ul>' +
              '<h4>搜尋範例</h4>' +
              '<div class="example-box">想查：王小明訂單 K260514001 過去做過什麼<br>→ 訂單號搜尋 K260514001 → 看所有操作紀錄</div>' },
      { center: true, title: '紀錄格式',
        body: '每行紀錄包含：' +
              '<table class="mock-table"><tr><th>時間</th><th>操作者</th><th>動作</th><th>訂單</th><th>細節</th></tr>' +
              '<tr><td>5/14 09:23</td><td>Jun</td><td>confirm</td><td>K260514001</td><td>狀態變 confirmed</td></tr>' +
              '<tr><td>5/14 10:11</td><td>Amy</td><td>edit</td><td>K260514001</td><td>訂金 0 → 1000</td></tr>' +
              '<tr><td>5/14 14:30</td><td>osaka1</td><td>checkin</td><td>K260514001</td><td>AL/AM/AN 寫入</td></tr></table>' },
      { center: true, title: '⚠️ 注意',
        body: '<h4>1. 紀錄不能刪除</h4>就算 Jun 也不能刪。這是設計來防止「事後修改紀錄」。' +
              '<h4>2. 大量紀錄</h4>系統運作久了會有幾千筆紀錄。<b>用 filter 才不會卡</b>。' +
              '<h4>3. 隱私</h4>紀錄會留個人操作軌跡，<b>不要外流</b>給非授權的人看。' }
    ]
  }];





function openScenarioPicker(isAuto) {
  const isJun = currentAgent === 'Jun';
  const role = isJun ? 'jun' : currentRole;
  const available = TRAINING_SCENARIOS.filter(s => s.roles.indexOf(role) >= 0);
  // v2.5r: 進度條
  const seenForProgress = (function(){ try { return JSON.parse(localStorage.getItem('admin_seen_scenarios') || '[]'); } catch(e){ return []; } })();
  const seenCount = available.filter(s => seenForProgress.indexOf(s.id) >= 0).length;
  const pct = available.length > 0 ? Math.round(seenCount / available.length * 100) : 0;
  const progressEl = document.getElementById('picker-progress');
  if (progressEl) {
    progressEl.innerHTML = '<div class="flex items-center gap-3">' +
      '<div class="text-xs font-bold text-[#1A365D]">學習進度：' + seenCount + ' / ' + available.length + '</div>' +
      '<div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">' +
        '<div class="h-full bg-emerald-500 transition-all" style="width:' + pct + '%"></div>' +
      '</div>' +
      '<div class="text-xs font-bold text-emerald-600">' + pct + '%</div>' +
      '</div>' + (seenCount === available.length && available.length > 0 ? '<div class="text-xs text-emerald-600 mt-1">🎉 全部看完了！</div>' : '');
  }
  const list = document.getElementById('scenario-list');
  if (available.length === 0) {
    list.innerHTML = '<div class="col-span-2 text-center py-8 text-slate-400">您的角色目前沒有可用的訓練場景</div>';
  } else {
    // Group by category
    const CAT_ORDER = ['intro', 'daily', 'workflow', 'special', 'jun_advanced', 'tabs'];
    const CAT_LABELS = {
      intro: { name: '🌱 入門必看', desc: '第一週新人先看這個' },
      daily: { name: '📋 日常操作', desc: '每天會用到的核心場景' },
      workflow: { name: '⏰ 每日 SOP / 流程', desc: '時間軸式工作流程' },
      special: { name: '🔧 特殊 / 異常處理', desc: '碰到狀況時怎麼辦' },
      jun_advanced: { name: '🎓 Jun 管理者進階', desc: '只有 Jun 看得到' },
      tabs: { name: '📚 各 tab 詳細導覽', desc: '單獨想複習某個 tab' }
    };
    const grouped = {};
    CAT_ORDER.forEach(c => grouped[c] = []);
    available.forEach(s => {
      const c = s.category || 'tabs';
      if (!grouped[c]) grouped[c] = [];
      grouped[c].push(s);
    });
    let html = '';
    CAT_ORDER.forEach(cat => {
      if (grouped[cat].length === 0) return;
      const lbl = CAT_LABELS[cat];
      html += '<div class="col-span-1 md:col-span-2 mt-2 mb-1">' +
              '<div class="font-bold text-[#1A365D] text-sm">' + lbl.name + '</div>' +
              '<div class="text-xs text-slate-400">' + lbl.desc + '</div>' +
              '</div>';
      const seen = (function(){ try { return JSON.parse(localStorage.getItem('admin_seen_scenarios') || '[]'); } catch(e){ return []; } })();
      html += grouped[cat].map(s => {
        const isSeen = seen.indexOf(s.id) >= 0;
        const cardClass = isSeen ? 'p-3 bg-emerald-50 border border-emerald-300 rounded' : 'p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#1A365D] rounded transition-colors';
        const seenBadge = isSeen ? '<span style="background:#10B981;color:#FFF;font-size:9px;padding:1px 6px;border-radius:8px;font-weight:bold;margin-left:6px">已看完</span>' : '';
        const titleColor = isSeen ? '#059669' : '#1A365D';
        return '<button onclick="startScenario(\'' + s.id + '\')" class="text-left ' + cardClass + '">' +
        '<div class="flex items-start gap-2">' +
          '<div class="text-xl shrink-0">' + s.icon + '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="font-bold text-sm mb-0.5" style="color:' + titleColor + '">' + s.title + seenBadge + '</div>' +
            '<div class="text-[11px] text-slate-500 leading-tight mb-1">' + s.desc + '</div>' +
            '<div class="text-[10px] text-slate-400">' + s.steps.length + ' 步 · 約 ' + Math.max(2, Math.ceil(s.steps.length / 1.5)) + ' 分</div>' +
          '</div>' +
        '</div>' +
        '</button>';
      }).join('');
    });
    list.innerHTML = html;
  }
  document.getElementById('scenario-picker').classList.remove('hidden');
}

function closeScenarioPicker() {
  document.getElementById('scenario-picker').classList.add('hidden');
  // 標記已看過（首次自動跳就不會再出現）
  try { localStorage.setItem('admin_tour_seen_' + ADMIN_TOUR_VERSION, '1'); } catch(e){}
}

function startScenario(id) {
  const scenario = TRAINING_SCENARIOS.find(s => s.id === id);
  if (!scenario) return;
  document.getElementById('scenario-picker').classList.add('hidden');
  _activeTourSteps = scenario.steps;
  _tourStep = 0;
  _tourActive = true;
  _currentScenarioId = id;  // v2.5q: 紀錄目前場景
  document.getElementById('tour-overlay').classList.remove('hidden');
  renderTourStep();
  try { localStorage.setItem('admin_tour_seen_' + ADMIN_TOUR_VERSION, '1'); } catch(e){}
}

function startOverviewTour() {
  document.getElementById('scenario-picker').classList.add('hidden');
  startAdminTour(true);
}

const TOUR_STEPS = [
  { center: true, title: '👋 歡迎使用旅乘和服後台',
    body: '快速導覽帶您認識 4 個主要功能。約 2-3 分鐘。隨時可按右上角「?」重看。' },

  // === 訂單管理 ===
  { tab: 'orders', selector: '[data-sec="orders"]', position: 'bottom',
    title: '📋 訂單管理',
    body: '所有訂單在這裡列出。最常用的功能，每天都會看。' },
  { tab: 'orders', selector: '#sec-orders .flex.flex-wrap.gap-2.items-center',
    title: '快速狀態 tab',
    body: '上面的 tab 可以快速切換：今天 / 待確認 / 已確認 / 退款 / 異常。點一下就只看那個狀態的訂單。' },
  { tab: 'orders', selector: '#sec-orders [onclick*="quickPreCheckClose"], #sec-orders details, #sec-orders summary',
    title: '進階搜尋與篩選',
    body: '展開「進階搜尋」可以用姓名、電話、訂單號、Email 找特定客人，也能用日期區間篩選。' },
  { tab: 'orders', selector: '.order-card, #orders-grid, [id*="orders"]', optional: true,
    title: '訂單卡',
    body: '每張卡片顯示客人姓名、訂單號、體驗日期、人數、和服款式。已確認 + 體驗日 ±1 天會看到 🎌 報到按鈕。' },

  // === 報到中心 (NEW) ===
  { tab: 'checkin', selector: '[data-sec="checkin"]', position: 'bottom',
    title: '🎌 報到中心 (NEW)',
    body: '新功能！今日 ±1 天的訂單看板，客人到店時用這裡最快。' },
  { tab: 'checkin', selector: '#sec-checkin .grid.grid-cols-1.md\\:grid-cols-3',
    title: '當日報到統計',
    body: '三個格子：⏳ 待報到、🎌 客人自助、✅ 已代客報到。一眼看出今天進度。' },
  { tab: 'checkin', selector: '#checkin-search',
    title: '末碼搜尋',
    body: '客人說「我手機末3碼是 999」→ 直接打 999，看板會即時 filter 到那筆訂單。比翻訂單列表快很多。' },
  { tab: 'checkin', selector: '#checkin-list, #checkin-empty',
    title: '訂單卡片 + 報到按鈕',
    body: '每張卡片有客人姓名、訂單號、體驗時間、末3碼。確認客人身份後點「🎌 為客人報到」就完成。已報到的卡片按鈕會變灰。' },

  // === 對帳 ===
  { tab: 'reconcile', selector: '[data-sec="reconcile"]', position: 'bottom',
    title: '🧾 對帳作業',
    body: '對帳是檢查每筆訂單收款狀況。月底結帳前要清完所有狀態。' },
  { tab: 'reconcile', selector: '#recon-month',
    title: '月份切換',
    body: '預設顯示本月，可以下拉切到上個月看歷史對帳記錄。' },
  { tab: 'reconcile', selector: '#recon-status',
    title: '對帳狀態',
    body: '🟢 已對帳 (收款金額正確)、🟡 部分收款 (待補尾款)、🔴 超收 (要退費)、⚪ 待對帳。可以下拉只看其中一種狀態。' },

  // === 店家月結 ===
  { tab: 'walkin', selector: '[data-sec="walkin"]', position: 'bottom',
    title: '💴 店家月結',
    body: 'Walk-in 客人專用月結頁。每月底用這裡跟我們對帳。' },
  { tab: 'walkin', selector: '#walkin-month, #sec-walkin select',
    title: '選月份',
    body: '選要結算的月份，下面會列出該月所有 walk-in 訂單，自動算總收入、店家收的、我們應收的。' },
  { tab: 'walkin', selector: '#walkin-stores-grid', optional: true,
    title: '各店家請款卡片',
    body: '依門市分類顯示當月 walk-in 收入。每張卡片右上「📄 請款單」可下載該店家的明細請款單給會計。' },

  // 結尾
  { center: true, title: '🎉 教學完成！',
    body: '隨時可以點右上角的「?」重看。如果有任何使用問題或建議，請聯絡 Jun。' }
];

const STORE_TOUR_STEPS = [
  { center: true, title: '👋 您好！店家後台快速導覽',
    body: '5 個步驟帶您看店家每天會用到的功能。約 1 分鐘。隨時可按右上「?」重看。' },

  { tab: 'checkin', selector: '[data-sec="checkin"]', position: 'bottom',
    title: '🎌 報到中心（最常用）',
    body: '客人到店 → 直接點這個 tab。看今天 ±1 天所有預約，按時間排好。' },

  { tab: 'checkin', selector: '#checkin-search',
    title: '末碼搜尋（超好用）',
    body: '客人說「我手機末3碼是 999」→ 打 999 → 那筆訂單即時跳出來。比翻訂單列表快太多。' },

  { tab: 'checkin', selector: '#checkin-list, #checkin-empty',
    title: '幫客人報到',
    body: '找到客人那張卡 → 點下方「🎌 為客人報到」按鈕 → 完成。已報到的卡片變綠色，按鈕變灰防重複點。' },

  { tab: 'orders', selector: '#walkInFab', position: 'left',
    title: '＋ 現場新增（Walk-in）',
    body: '右下角藍色「＋ 現場新增」按鈕：客人沒預約直接走進店裡 → 點這個現場開單收錢。' },

  { tab: 'walkin', selector: '#walkin-stores-grid, #sec-walkin',
    title: '💴 店家月結',
    body: '月底跟旅乘對帳用。看本月所有 walk-in 訂單、總收入。點卡片右上「📄 請款單」可下載明細給會計。' },

  { center: true, title: '🎉 教學完成！',
    body: '隨時可以點右上角的「?」重看。有任何問題請聯絡客服 Jun。' }
];

let _tourStep = 0;
let _tourActive = false;
let _currentScenarioId = null;
let _activeTourSteps = TOUR_STEPS;  // v2.5i: 動態指向 STORE_TOUR_STEPS 或 TOUR_STEPS

function startAdminTour(forceManual) {
  _tourStep = 0;
  _tourActive = true;
  // v2.5i: 依角色選擇導覽內容 — 店家用簡化版 (約 5-6 步)，agent 用完整版 (16 步)
  _activeTourSteps = (currentRole === 'store') ? STORE_TOUR_STEPS : TOUR_STEPS;
  document.getElementById('tour-overlay').classList.remove('hidden');
  renderTourStep();
}

function endAdminTour() {
  _tourActive = false;
  document.getElementById('tour-overlay').classList.add('hidden');
  try { localStorage.setItem('admin_tour_seen_' + ADMIN_TOUR_VERSION, '1'); } catch(e){}
}

// v2.5q: 完成單元時不直接關，而是顯示「下一單元 →」
function completeAndNext() {
  // 紀錄此場景已完成
  try {
    const seen = JSON.parse(localStorage.getItem('admin_seen_scenarios') || '[]');
    if (_currentScenarioId && seen.indexOf(_currentScenarioId) < 0) {
      seen.push(_currentScenarioId);
      localStorage.setItem('admin_seen_scenarios', JSON.stringify(seen));
    }
  } catch(e){}
  // 關掉現有 tour overlay，跳回 picker
  document.getElementById('tour-overlay').classList.add('hidden');
  _tourActive = false;
  openScenarioPicker();
}

function tourNext() {
  if (_tourStep >= _activeTourSteps.length - 1) { completeAndNext(); return; }
  _tourStep++;
  renderTourStep();
}

function tourPrev() {
  if (_tourStep === 0) return;
  _tourStep--;
  renderTourStep();
}

function renderTourStep() {
  const step = _activeTourSteps[_tourStep];
  if (!step) { endAdminTour(); return; }

  // 切到對應 tab
  if (step.tab) {
    const tab = document.querySelector('.nav-tab[data-sec="' + step.tab + '"]');
    if (tab && typeof switchSection === 'function') {
      switchSection(step.tab, tab);
    }
  }

  // 更新內容
  document.getElementById('tour-step-num').textContent = '第 ' + (_tourStep + 1) + ' / ' + _activeTourSteps.length + ' 步';
  document.getElementById('tour-title').textContent = step.title;
  document.getElementById('tour-body').innerHTML = step.body;
  document.getElementById('tour-prev').style.visibility = _tourStep === 0 ? 'hidden' : 'visible';
  document.getElementById('tour-next').textContent = (_tourStep === _activeTourSteps.length - 1) ? '完成，下一單元 →' : '下一步 →';

  // Center mode：tooltip 置中、無 highlight、整個 overlay 變暗
  const tip = document.getElementById('tour-tooltip');
  const hi = document.getElementById('tour-highlight');
  const overlay = document.getElementById('tour-overlay');
  if (step.center) {
    hi.style.display = 'none';
    overlay.classList.add('tour-center-mode');
    tip.setAttribute('data-position', 'center');
    tip.style.top = '50%';
    tip.style.left = '50%';
    tip.style.transform = 'translate(-50%, -50%)';
    return;
  }
  // Target mode：移除 center-mode（讓 box-shadow 做暗化）
  overlay.classList.remove('tour-center-mode');

  // 找目標元素
  setTimeout(() => {
    let target = null;
    if (step.selector) {
      try { target = document.querySelector(step.selector); } catch(e) { target = null; }
    }
    if (!target && step.optional) {
      // optional step 找不到就跳下一步
      tourNext();
      return;
    }
    // v2.5p: 元素存在但被 display:none 隱藏（如店家看不到的 tab）→ 跳過
    if (target && target.offsetParent === null && !target.classList.contains('section')) {
      // section 元素本身被隱藏是正常（active section 才顯示），不能拿來判斷
      if (step.optional !== false) { tourNext(); return; }
    }
    if (!target) {
      // 找不到 → fallback 置中
      hi.style.display = 'none';
      tip.setAttribute('data-position', 'center');
      tip.style.top = '50%';
      tip.style.left = '50%';
      tip.style.transform = 'translate(-50%, -50%)';
      return;
    }
    // 顯示 highlight
    hi.style.display = 'block';
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const rect = target.getBoundingClientRect();
    const pad = 8;
    hi.style.top = (rect.top + window.scrollY - pad) + 'px';
    hi.style.left = (rect.left + window.scrollX - pad) + 'px';
    hi.style.width = (rect.width + pad * 2) + 'px';
    hi.style.height = (rect.height + pad * 2) + 'px';

    // 定位 tooltip
    tip.style.transform = '';
    const position = step.position || 'bottom';
    tip.setAttribute('data-position', position);
    const tipRect = tip.getBoundingClientRect();
    const tipW = tipRect.width || 340;
    const tipH = tipRect.height || 180;
    let top, left;
    if (position === 'bottom') {
      top = rect.bottom + window.scrollY + 16;
      left = rect.left + window.scrollX;
    } else if (position === 'top') {
      top = rect.top + window.scrollY - tipH - 16;
      left = rect.left + window.scrollX;
    } else if (position === 'right') {
      top = rect.top + window.scrollY;
      left = rect.right + window.scrollX + 16;
    } else if (position === 'left') {
      top = rect.top + window.scrollY;
      left = rect.left + window.scrollX - tipW - 16;
    }
    // 邊界保護
    if (left + tipW > window.innerWidth - 16) left = window.innerWidth - tipW - 16;
    if (left < 16) left = 16;
    if (top < window.scrollY + 16) top = window.scrollY + 16;
    tip.style.top = top + 'px';
    tip.style.left = left + 'px';
  }, 350);  // wait for tab switch animation
}

// 首次登入自動跳 scenario picker
function maybeAutoStartTour() {
  try {
    const seen = localStorage.getItem('admin_tour_seen_' + ADMIN_TOUR_VERSION);
    if (!seen) {
      setTimeout(() => openScenarioPicker(true), 1500);
    }
  } catch(e){}
}
