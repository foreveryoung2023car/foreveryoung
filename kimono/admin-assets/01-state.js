const DEPOSIT_JPY = (typeof KIMONO_CONFIG !== 'undefined' && KIMONO_CONFIG.DEPOSIT_JPY) ? Number(KIMONO_CONFIG.DEPOSIT_JPY) : 1000;
let currentAgent = '';
let adminToken = '';
let currentRole = 'agent';      // v2.5: 'agent' (客服) | 'store' (店家)
let currentStoreKey = '';       // v2.5: when role=store, this is the store identifier
let currentFirebaseUid = '';
let allOrders = [];
let currentFilter = 'pending';  // v2.4.33: default to 待確認 for faster execution
let editingOrder = null;
let selectedIds = new Set();
let currentSection = 'dashboard';
let calCursor = new Date();
