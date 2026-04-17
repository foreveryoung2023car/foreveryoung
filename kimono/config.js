// ============================================================
// 旅乘 x 和服 — 全站設定檔 config.js
// 修改這個檔案就能同步更新所有頁面
// ⚠️  注意：這個檔案是公開的，請勿放任何密碼或 Token
// ============================================================

const KIMONO_CONFIG = {

    // ★ Google Apps Script Web App URL
    // 重新部署後只需要改這裡
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzQrd2thmcXuhbH3BZrcFG-20aW9KHHYu3I0trBBGAd_BTV8Zg3okrnyIOuG8fOOdLP/exec',

    // ★ 聯繫連結
    LINE_URL:       'https://lin.ee/TgFCvYQ',
    MESSENGER_URL:  'https://m.me/foreveryoung2023car',
    PHONE:          '+81 80-3705-5176',

    // ★ 匯款帳戶資訊
    BANK_CODE:      '008',
    BANK_NAME:      '華南銀行',
    BANK_BRANCH:    '營業部',
    BANK_ACCOUNT:   '100100344320',
    BANK_HOLDER:    '佳遊國際旅行社有限公司',
    DEPOSIT_TWD:    220,
    DEPOSIT_JPY:    1000,

    // ★ 頁面路徑
    INDEX_URL:      './index.html',
    REFUND_URL:     './refund.html',
};

Object.freeze(KIMONO_CONFIG);
