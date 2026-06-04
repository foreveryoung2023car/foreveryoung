# Gmail API 自動發信設定

本專案的 Firebase Functions 已新增 `sendConfirmEmail`，用 Gmail API 取代舊 GAS 的 `GmailApp.sendEmail`。

## 1. Google Cloud 啟用 Gmail API

在 `foreveryoung-kimono-prod` 專案中啟用：

```bash
gcloud services enable gmail.googleapis.com --project foreveryoung-kimono-prod
```

也可以在 Google Cloud Console 搜尋 `Gmail API` 後點 Enable。

## 2. 建立 OAuth Client

Google Cloud Console：

1. APIs & Services
2. OAuth consent screen
3. Credentials
4. Create Credentials
5. OAuth client ID
6. Application type 選 `Web application`

取得：

- `client_id`
- `client_secret`

## 3. 取得 Refresh Token

授權 scope 使用：

```txt
https://www.googleapis.com/auth/gmail.send
```

用 OAuth Playground 或內部工具取得 refresh token。發信帳號就是授權登入的 Gmail 帳號。

## 4. 設定 Firebase Functions Secrets

在 `kimono-system/firebase` 目錄執行：

```bash
firebase functions:secrets:set GMAIL_CLIENT_ID --project foreveryoung-kimono-prod
firebase functions:secrets:set GMAIL_CLIENT_SECRET --project foreveryoung-kimono-prod
firebase functions:secrets:set GMAIL_REFRESH_TOKEN --project foreveryoung-kimono-prod
firebase functions:secrets:set GMAIL_FROM_EMAIL --project foreveryoung-kimono-prod
firebase functions:secrets:set GMAIL_FROM_NAME --project foreveryoung-kimono-prod
```

建議：

- `GMAIL_FROM_EMAIL`: 授權 Gmail 帳號，例如 `foreveryoung.booking@gmail.com`
- `GMAIL_FROM_NAME`: `Foreveryoung 旅乘`

## 5. 部署 Function

```bash
CI=true firebase deploy --config firebase.json --project foreveryoung-kimono-prod --only functions:sendConfirmEmail
```

部署成功後，後台「編輯訂單」裡的「寄確認信」會直接呼叫 Gmail API 自動寄出。

## 注意

- 不要把 `client_secret` 或 `refresh_token` 寫進前端 `config.js`。
- Gmail 免費帳號有每日發信上限，正式長期營運建議改用 Google Workspace 或專業郵件服務。
- 如果 refresh token 失效，需要重新授權並更新 `GMAIL_REFRESH_TOKEN`。
