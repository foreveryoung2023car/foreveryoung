# 旅乘 × 和服（Kimono）預約網站

> 京都・大阪・東京和服體驗線上預約系統
> 由 **ふぉーえばーやんぐ Forever Young** 自由行包車工作室營運

---

## 目錄

- [一、技術架構](#一技術架構)
- [二、檔案結構](#二檔案結構)
- [三、四個頁面](#三四個頁面)
- [四、訂單流程](#四訂單流程)
- [五、後端：Google Apps Script](#五後端google-apps-script)
- [六、Sheets 結構](#六sheets-結構)
- [七、客服 SOP](#七客服-sop)
- [八、門市現場 SOP](#八門市現場-sop)
- [九、部署與更新](#九部署與更新)
- [十、新人接手清單](#十新人接手清單)
- [十一、常見維護任務](#十一常見維護任務)
- [十二、安全須知](#十二安全須知)

---

## 一、技術架構

純靜態前端 + Google Apps Script（GAS）後端 + Google Sheets 資料庫。
**完全無 build 流程**，commit HTML 到 main 即上線。

```
┌─────────────────────┐    fetch JSON    ┌──────────────────────┐    讀寫    ┌──────────────┐
│  GitHub Pages       │ ───────────────► │  GAS Web App         │ ─────────► │ Google Sheets │
│  (index/inquiry/    │ ◄─────────────── │  (Code.gs +          │ ◄───────── │  (訂單/客服/   │
│   store/admin .html)│                   │   gas-additions.gs)  │            │   折扣碼/門市) │
└─────────────────────┘                   └──────────────────────┘            └──────────────┘
        │                                          │
        │ 圖片上傳                                  │ UrlFetchApp 代理
        └────────────► imgbb（key 在 GAS）◄────────┘
```

| 類別     | 使用                                           |
| -------- | ---------------------------------------------- |
| 前端     | 純靜態 HTML + Tailwind CDN + Lucide + 自寫 JS  |
| 字體     | Noto Serif TC（標題）/ Noto Sans TC（內文）    |
| 後端     | Google Apps Script Web App                     |
| 資料庫   | Google Sheets（同檔多分頁）                    |
| 圖片儲存 | imgbb（透過 GAS 代理上傳，key 不在前端）       |
| 部署     | GitHub Pages（push main 即上線）               |
| 品牌色   | 海軍藍 `#1A365D` + 櫻花粉 `#FFB7C5`            |

---

## 二、檔案結構

```
kimono/
├── README.md            ← 本文件
├── index.html           公開預約主站（marketing + 3 步驟訂單流程）
├── inquiry.html         客人訂單查詢 + 退款申請
├── store.html           門市現場後台（手機優化）
├── admin.html           客服管理後台（桌機優化）
├── config.js            全站共用設定（GAS URL / LINE / 銀行 / 訂金）
├── gas-additions.gs     ★ GAS 後端追加程式碼（adminLogin + uploadImage）
└── img/                 共 25 張圖片
    ├── header-bg.jpg                      首頁主視覺
    ├── GuestReviews-1~6.jpg               旅客好評
    ├── HairStyling.jpg                    髮型專區
    ├── Locations-1~4.jpg                  4 間門市
    ├── PremiumSelection-1~8.jpg           8 種和服方案
    ├── ShootingFlow.jpg                   攝影流程
    └── VisualStory-1~4.jpg                Reels 短影音縮圖
```

---

## 三、四個頁面

### `index.html` — 公開預約主站
- Marketing 區塊：Hero、好評、體驗六步驟、8 款方案、Reels、髮型、攝影、FAQ、4 間門市
- 3 步驟訂單流程：
  1. 需求填寫（日期/時段/人數/和服款式/妝髮/攝影/折扣碼）
  2. 對帳證明（顯示銀行帳戶 + 上傳匯款截圖）
  3. 成功（產生 `K{YYMMDD}{NNN}` 編號 + 複製按鈕）
- 首頁「管理預約」快捷查詢（預約編號、Email 或手機任填一項），自動帶入查詢頁顯示最新狀態
- 折扣碼即時驗證（GAS `validateCoupon`）
- 60 秒內防止重送（localStorage `last_booking`）

### `inquiry.html` — 客人訂單查詢／退款
- 用「訂單編號 + Email 或手機」查詢（GAS `query`）
- 顯示訂單狀態 badge：`pending` / `confirmed` / `refunding` / `refunded`
- 退款申請（GAS `refund`）：原因下拉、銀行代碼/名稱/帳號/戶名/電話、勾同意
- 退款政策：7 天前全額 / 2-6 天 50% / 前一日當日不退

### `store.html` — 門市現場後台（手機優化）
- 門市密碼登入（GAS `storeLogin`，回傳 `storeKey` & `storeName`）
- Tab：今天 / 明天 / 搜尋
- 現場 +/- 大人小孩人數、自動算訂金差額
- 填寫和服原價／妝髮費／攝影費，即時顯示實收 / 店家成本（×0.5）/ 旅乘利潤
- 確認後寫回 GAS（`storeUpdate`）

### `admin.html` — 客服管理後台（桌機優化）
- **GAS Sheets 「系統設定」分頁驗證**（透過 `adminLogin` action，回傳 token）
- Stats：總訂單 / 待確認 / 已確認 / 本月訂金 JPY
- 篩選 + 搜尋，編輯 Modal 4 個 Tab：基本資訊／款項費用／退款記錄／備註
- 自動試算「現場應收 = 總價 − 已收訂金」
- localStorage 自動登入（須同時有 agent name + token，token 過期會自動登出）

---

## 四、訂單流程

```
[1] 客人逛 index.html
         ↓
[2] 進 3 步驟流程，填單 → 上傳匯款截圖（GAS uploadImage 代理 → imgbb）
         ↓
[3] 提交訂單，GAS 寫入 Sheets「訂單表」
         ↓
[4] 訂單狀態 = pending（核對中），系統產生編號 K260428001
         ↓
[5] 客服在 admin.html 比對匯款，確認後改 confirmed
         ↓ (★ 本工作室「建立群組」階段觸發)
[6] 調度專員建立 LINE 群組、加入司機/客服、發送行前資訊
         ↓
[7] 出車當日，門市用 store.html 填現場實收金額
         ↓
[8] 客人隨時可用 inquiry.html 查狀態，或申請退款 → refunding → refunded
```

**訂單狀態 4 種**：

| 狀態         | 中文       | 何時切換                                        |
| ------------ | ---------- | ----------------------------------------------- |
| `pending`    | 核對中     | 客人剛送出，等客服核對匯款                      |
| `confirmed`  | 已確認     | 客服核對通過，可建群組                          |
| `refunding`  | 退款處理中 | 客人從 inquiry.html 送退款申請                  |
| `refunded`   | 已退款     | 客服處理完退款                                  |

**精選方案 8 款**：素雅 ¥3000 / 俏麗 ¥5000 / 精緻 ¥8000 / 浴衣 ¥3000 / 振袖 ¥38000 / 男士 ¥5000 / 武士袴 ¥20000 / 兒童 ¥5000

**門市 4 間**：京都清水寺、大阪日本橋、京都祇園、東京淺草寺

**訂金**：每人 NT$ 220 / JPY 1000

**退費政策**：7 天前全額 / 2–6 天 50% / 前一日當日不退費

---

## 五、後端：Google Apps Script

### Web App URL
寫在 `config.js` 的 `APPS_SCRIPT_URL`。重新部署後只需要改這一個變數。

### Action 一覽

| Action          | 來源頁         | 用途                                  | 需 token |
| --------------- | -------------- | ------------------------------------- | -------- |
| (無 action)     | index.html     | 提交主訂單                            | ✗        |
| `query`         | inquiry.html   | 客人查詢訂單                          | ✗        |
| `queryOrder`    | index.html     | 內部編號查詢                          | ✗        |
| `refund`        | inquiry.html   | 客人退款申請                          | ✗        |
| `validateCoupon`| index.html     | 折扣碼即時驗證                        | ✗        |
| `uploadImage`   | index.html     | ★ 圖片上傳代理（imgbb）               | ✗        |
| `storeLogin`    | store.html     | 門市密碼登入                          | ✗        |
| `storeGetOrders`| store.html     | 抓門市當日訂單                        | storeKey |
| `storeUpdate`   | store.html     | 門市現場填金額/改人數                 | storeKey |
| `adminLogin`    | admin.html     | ★ 客服姓名+密碼登入，回傳 token       | ✗        |
| `adminGetOrders`| admin.html     | 客服抓全訂單                          | ★ token  |
| `adminUpdate`   | admin.html     | 客服改訂單                            | ★ token  |

★ = 本次重構新增/強化的部分。
詳見 [`gas-additions.gs`](./gas-additions.gs) 內含安裝步驟與完整實作。

### Script Properties（⚙ 專案設定 → 指令碼屬性）

| 屬性名            | 用途                                  | 範例值                              |
| ----------------- | ------------------------------------- | ----------------------------------- |
| `IMGBB_KEY`       | imgbb 上傳 key（取代前端硬碼）       | `fc071a07584cffd920bd85321439cc6b` |
| `ADMIN_TOKEN_TTL` | 客服登入 token 存活秒數，預設 28800   | `28800`（= 8 小時）                 |

---

## 六、Sheets 結構

主 Spreadsheet 內必須有以下分頁：

### 1. `訂單表`（主資料）
所有訂單一筆一列。欄位包含 `orderId / name / phone / email / bookingDate / pax / plan / hair / photo / platform / status(confirmed) / deposit / kimonoPrice / hairFee / photoFee / coupon / rate / refundAmt / refundDate / refundReason / proofUrl / agent / note / createdAt`。

### 2. `系統設定`（★ 客服密碼，本次新增）

| A 欄 客服姓名 | B 欄 密碼 | C 欄 啟用 |
| ------------- | --------- | --------- |
| Jun           | kimono    | TRUE      |
| Ren           | ren_pass  | TRUE      |
| Amy           | amy_pass  | FALSE     |

- 第 1 列為標題，第 2 列起為資料
- C 欄 = `FALSE` 即停用該帳號
- 改密碼直接改 B 欄，下次登入即生效
- 想升級成 hash 儲存，看 `gas-additions.gs` 第 4 區塊

### 3. `折扣碼`
`code / discount(%) / minPax / startDate / endDate / used / maxUse`。

### 4. `門市`
`storeName / storeKey(密碼) / location`。

> 確切欄位請以你 GAS Code.gs 內部讀取邏輯為準。

---

## 七、客服 SOP

**入口**：`https://foreveryoung2023car.github.io/foreveryoung/kimono/admin.html`

### 每日工作流程
1. 用自己的姓名 + 密碼登入（密碼由管理員在 Sheets「系統設定」維護）。
2. 看 Stats 卡：總訂單 / 待確認 / 已確認 / 本月訂金 JPY。
3. 篩選「待確認」，逐筆點開。
4. 對照華南銀行帳目，比對訂金金額是否正確。
5. 編輯 Modal 4 個 Tab：基本資訊／款項費用／退款記錄／備註。
6. **確認無誤 → 把狀態改成 `confirmed`**，按「💾 儲存變更」。
7. 通知調度專員：此訂單可建 LINE 群組。

### 退款處理
1. 客人從 `inquiry.html` 送退款 → 訂單狀態自動變 `refunding`。
2. 客服核對銀行帳號／金額後，到銀行匯款給客人。
3. 在 admin.html 的「退款記錄」Tab 填入：實際退款金額、退款日期、原因。
4. 改狀態為 `refunded`，儲存。

### 退款政策（套用於試算）
- 7 天前 → 全額退
- 2–6 天前 → 50%
- 前一日／當日 → 不退費

---

## 八、門市現場 SOP

**入口**：`https://foreveryoung2023car.github.io/foreveryoung/kimono/store.html`（建議手機收藏）

1. 用該門市的密碼登入（每間門市一組）。
2. 切到「今天」Tab，看當日預約名單。
3. 客人到店：搜尋電話末 3 碼／姓名／訂單號 → 找到該筆 → 展開卡片。
4. 若實際人數有變動 → 用 `+ / -` 按鈕調整大人小孩數，系統會自動算訂金差額（補繳 or 折抵）。
5. 填寫三項金額：
   - **和服原價**（店家標價）
   - **妝髮費**（若有）
   - **攝影費**（若有）
6. 即時看到三組數字：實收和服費 / 店家成本（原價 × 0.5）/ 旅乘利潤。
7. 點「確認」→ Modal 確認 → 寫回 Sheets。

---

## 九、部署與更新

### 前端（HTML/CSS/JS）
1. clone repo：`git clone https://github.com/foreveryoung2023car/foreveryoung.git`
2. 修改 `kimono/` 底下的 HTML/JS。
3. `git commit -am "..." && git push origin main`。
4. GitHub Pages 約 1 分鐘內生效。

### 後端（GAS）
1. 開啟 [Apps Script Editor](https://script.google.com)，找到「旅乘和服訂單系統」專案。
2. 修改 `Code.gs`，或新增 `gas-additions.gs` 檔（首次安裝請看後者內的「安裝步驟」）。
3. 右上「部署」→「管理部署作業」→ 選原本那個 → 鉛筆編輯 → 版本「新版本」→ 「部署」。
4. **URL 不會變**（同一個 deploy ID），不需改 `config.js`。
5. 若有新增 Script Properties（如 `IMGBB_KEY`），請在「⚙ 專案設定 → 指令碼屬性」新增。

### Sheets
1. 直接在瀏覽器編輯。
2. 改密碼／加客服 → 在「系統設定」分頁直接改即可，無需重新部署。

---

## 十、新人接手清單

接手請依序：

1. ☐ 跟管理員拿：GitHub repo 的 collaborator 權限、GAS 專案的編輯權限、Spreadsheet 的編輯權限。
2. ☐ 在「系統設定」分頁加自己的姓名／密碼／TRUE。
3. ☐ 開 admin.html → 用自己的姓名密碼登入測試。
4. ☐ 讀本 README 全文。
5. ☐ 讀 [`gas-additions.gs`](./gas-additions.gs) 註解（最容易踩雷的安全點都在這）。
6. ☐ 在測試環境跑一次完整訂單流程：下單 → 上傳憑證 → admin 確認 → store 填金額 → inquiry 查詢。

---

## 十一、常見維護任務

| 任務                    | 在哪改                                                 |
| ----------------------- | ------------------------------------------------------ |
| 新增／停用客服          | Sheets「系統設定」分頁加減一行                         |
| 改客服密碼              | Sheets「系統設定」B 欄                                 |
| 新增折扣碼              | Sheets「折扣碼」分頁                                   |
| 改方案價格              | `index.html` 內 `plans` 陣列（搜「PremiumSelection」） |
| 改 FAQ                  | `index.html` 內 `faqData` 陣列                         |
| 改門市資訊              | Sheets「門市」分頁 + `index.html` 的 `Locations` 區塊  |
| 改首頁主視覺            | `img/header-bg.jpg`                                    |
| 換 imgbb key            | GAS Script Properties → `IMGBB_KEY`                    |
| 改訂金金額              | `config.js` 的 `DEPOSIT_TWD` / `DEPOSIT_JPY`           |
| 改 LINE / Messenger 連結| `config.js` 的 `LINE_URL` / `MESSENGER_URL`            |
| 改銀行帳戶              | `config.js` 的 `BANK_*`                                |

---

## 十二、安全須知

1. **`config.js` 是公開檔案**：絕對不要放任何密碼、Token、私鑰。
   現在唯一還在 config.js 的「敏感性」資訊只有 GAS Web App URL，這是 GAS 設計上必須公開的，已用 `verifyAdminToken` 等機制保護。
2. **客服密碼**現存在 Sheets「系統設定」分頁的 B 欄（明碼）。
   - Sheet 共享範圍請限制為「指定使用者」，**不要設成「任何人都能查看」**。
   - 想升級成 SHA-256 hash → 取消註解 `gas-additions.gs` 內的 `hashPassword()` 並改寫 B 欄。
3. **imgbb key** 已從前端移除，現存於 GAS Script Properties，普通使用者看不到。
4. **舊 imgbb key 建議汰換**：
   `fc071a07584cffd920bd85321439cc6b` 在公開 repo 暴露過，請至 imgbb 後台重新申請新 key 並更新 Script Properties。
5. **Token 機制**：admin.html 登入後拿到 16 byte 隨機 token，存 localStorage，每次呼叫 adminGetOrders / adminUpdate 一定帶上；GAS 端用 PropertiesService 比對 + TTL 檢查。預設 8 小時自動過期。
6. **storeKey** 機制目前仍是「門市一組密碼直接帶在 payload」，安全等級夠用但可日後比照客服 token 升級。

---

**最後更新**：2026-04-28
**主要 Maintainer**：Jun（designbyjun@gmail.com）
**LINE 官方帳號**：[@230cbycd](https://lin.ee/TgFCvYQ)
**IG / FB**：[foreveryoung2023car](https://m.me/foreveryoung2023car)
