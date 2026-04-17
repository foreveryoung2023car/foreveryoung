// ============================================================
// 旅乘 x 和服 — 全站設定檔 config.js
// 修改這個檔案就能同步更新所有頁面
// ============================================================

const KIMONO_CONFIG = {

    // ★ Google Apps Script Web App URL
    // 重新部署後只需要改這裡
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxYTXDMpvItw2syvqltzRtseYqfckDEJ9GQxLWrIsKP5GGiiM-kJ9FVz45YKlEeRXGC/exec',

    // ★ 安全 Token（與 GAS 裡的 SECURITY_TOKEN 保持一致）
    SECURITY_TOKEN: 'FY_KIMONO_2026_SECRET',

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
    DEPOSIT_TWD:    220,   // 訂金台幣金額（顯示用）
    DEPOSIT_JPY:    1000,  // 訂金日圓金額

    // ★ 頁面路徑（相對路徑）
    INDEX_URL:      './index.html',
    REFUND_URL:     './refund.html',
};

// 凍結設定物件，防止意外修改
Object.freeze(KIMONO_CONFIG);
