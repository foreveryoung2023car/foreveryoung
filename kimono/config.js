// ============================================================
// 旅乘 x 和服 — 全站設定檔 config.js
// 修改這個檔案就能同步更新所有頁面
// ⚠️  注意：這個檔案是公開的，請勿放任何密碼或 Token
// ============================================================

const KIMONO_CONFIG = {

    // ★ Google Apps Script Web App URL
    // 重新部署後只需要改這裡
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyevg6UgNaK_H2bJNxDMbQEHO6iC9SdmZCEnyjEATrcM-et341n69JoXXYxutqWju6c/exec',
    API_BASE_URL:    'https://asia-northeast1-foreveryoung-kimono-prod.cloudfunctions.net',
    USE_NEW_API:     true,
    FIREBASE_CONFIG: {
        apiKey: '',
        authDomain: 'foreveryoung-kimono-prod.firebaseapp.com',
        projectId: 'foreveryoung-kimono-prod',
        storageBucket: 'foreveryoung-kimono-prod.firebasestorage.app'
    },

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
    // IMGBB_KEY 已移除 — 圖片上傳改由 GAS 代理 (action: 'uploadImage')
    // Key 存放於 Apps Script Editor → 專案設定 → Script Properties → IMGBB_KEY

    // ★ 頁面路徑
    INDEX_URL:      './index.html',
    REFUND_URL:     './inquiry.html',
};

Object.freeze(KIMONO_CONFIG);

// 攝影方案手機版：自動捲到推薦卡（中間那張）
window.addEventListener('load', () => {
    const mobile = document.getElementById('photo-plans-mobile');
    if (mobile && window.innerWidth < 768) {
        setTimeout(() => {
            const card = mobile.children[1]; // 第二張=推薦
            if (card) card.scrollIntoView({ inline: 'center', behavior: 'auto', block: 'nearest' });
        }, 300);
    }
});



