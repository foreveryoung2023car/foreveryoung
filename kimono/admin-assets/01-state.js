const DEPOSIT_JPY = (typeof KIMONO_CONFIG !== 'undefined' && KIMONO_CONFIG.DEPOSIT_JPY) ? Number(KIMONO_CONFIG.DEPOSIT_JPY) : 1000;
let currentAgent = '';
let adminToken = '';
let currentRole = 'agent';      // v2.5: 'agent' (客服) | 'store' (店家)
let currentStoreKey = '';       // v2.5: when role=store, this is the store identifier
let currentPlatformAccess = ['foreveryoung', 'japan-go'];
let currentFirebaseUid = '';
let allOrders = [];
let currentFilter = 'confirmed';  // default to 待到店 for daily store prep
let editingOrder = null;
let selectedIds = new Set();
let currentSection = 'dashboard';
let calCursor = (function(){
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date()).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  } catch(e) {
    return new Date();
  }
})();
