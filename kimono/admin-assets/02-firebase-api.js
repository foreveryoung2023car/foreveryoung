function useFirebaseAdmin() {
  return !!(KIMONO_CONFIG && KIMONO_CONFIG.USE_NEW_API);
}

function getFirebaseProjectId() {
  return (KIMONO_CONFIG && KIMONO_CONFIG.FIREBASE_CONFIG && KIMONO_CONFIG.FIREBASE_CONFIG.projectId) || 'foreveryoung-kimono-prod';
}

function ensureFirebaseAdminApp() {
  if (!useFirebaseAdmin()) return null;
  const cfg = KIMONO_CONFIG.FIREBASE_CONFIG || {};
  if (!cfg.apiKey) throw new Error('Firebase Web API key 尚未設定，請先填寫 config.js 的 FIREBASE_CONFIG.apiKey');
  if (!window.firebase) throw new Error('Firebase SDK 載入失敗，請重新整理後再試');
  if (!firebase.apps.length) firebase.initializeApp(cfg);
  return firebase.app();
}

async function firebaseSignInAdmin(email, password) {
  ensureFirebaseAdminApp();
  const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
  const user = cred.user;
  if (!user) throw new Error('登入失敗');
  const token = await user.getIdToken();
  const profile = await getFirebaseUserProfile(user.uid, token);
  if (!profile || profile.active === false) throw new Error('此帳號未啟用');
  return {
    user,
    token,
    profile,
    displayName: profile.displayName || user.displayName || user.email || email,
    firebaseRole: profile.role || 'readonly',
    role: firebaseRoleToAdminRole(profile.role),
    storeKey: profile.storeId || profile.storeKey || ''
  };
}

async function getFirebaseUserProfile(uid, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${getFirebaseProjectId()}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('找不到 users/{uid} 角色文檔，請確認 Firestore users/' + uid + ' 已建立');
  const doc = await res.json();
  return firestoreFieldsToObject(doc.fields || {});
}

function firebaseRoleToAdminRole(role) {
  return ['store_manager', 'store_staff'].includes(role) ? 'store' : 'agent';
}

function firestoreFieldsToObject(fields) {
  const out = {};
  Object.keys(fields || {}).forEach(k => { out[k] = firestoreValue(fields[k]); });
  return out;
}

function firestoreValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return !!v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(firestoreValue);
  if ('mapValue' in v) return firestoreFieldsToObject(v.mapValue.fields || {});
  return null;
}

async function getFreshAdminToken() {
  if (!useFirebaseAdmin()) return adminToken;
  ensureFirebaseAdminApp();
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('尚未登入');
  adminToken = await user.getIdToken();
  localStorage.setItem('admin_token', adminToken);
  return adminToken;
}

function firebaseAdminApiBaseUrl() {
  return (KIMONO_CONFIG.API_BASE_URL || '').replace(/\/$/, '');
}

function adminEsc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function adminJsArg(value) {
  return adminEsc(String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, ' '));
}

async function callFirebaseAdminFunction(path, body, options) {
  const token = await getFreshAdminToken();
  const method = (options && options.method) || 'POST';
  const res = await fetch(firebaseAdminApiBaseUrl() + path, {
    method,
    headers: Object.assign({
      Authorization: 'Bearer ' + token
    }, method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
    body: method === 'GET' ? undefined : JSON.stringify(body || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || ('HTTP ' + res.status));
  }
  return data;
}

function formatFirebaseAuditTime(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.replace('T', ' ').slice(0, 19);
  if (typeof value._seconds === 'number') return new Date(value._seconds * 1000).toISOString().replace('T', ' ').slice(0, 19);
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString().replace('T', ' ').slice(0, 19);
  return String(value);
}

function firebaseAuditLogToAdminRow(log) {
  return {
    time: formatFirebaseAuditTime(log.createdAt),
    agent: log.actorLabel || log.actorEmail || log.actorUid || 'system',
    action: log.action || '',
    orderId: log.orderNo || log.orderId || '',
    customer: (log.afterData && (log.afterData.customerName || log.afterData.name)) || (log.beforeData && (log.beforeData.customerName || log.beforeData.name)) || '',
    changes: log.metadata ? JSON.stringify(log.metadata) : '',
    note: log.id || ''
  };
}

function firestoreOrderToAdminOrder(doc) {
  const data = firestoreFieldsToObject(doc.fields || {});
  const status = data.status || '';
  const confirmed = ['confirmed', 'checked_in', 'completed'].includes(status);
  const checkedInAt = status === 'checked_in' || status === 'completed' ? (data.updatedAt || data.bookingAt || '') : '';
  return {
    firebaseDocId: (doc.name || '').split('/').pop(),
    orderId: data.orderNo || data.id || '',
    name: data.customerName || '',
    phone: data.customerPhone || '',
    email: data.customerEmail || '',
    bookingDate: data.bookingAt || '',
    submitDate: data.createdAt || '',
    platform: data.platform || '',
    source: data.source || '',
    storeKey: data.storeId || '',
    adults: Number(data.adults || 0),
    children: Number(data.children || 0),
    pax: Number(data.adults || 0) + Number(data.children || 0),
    plan: data.plan || '',
    hair: data.hair ? 'true' : 'false',
    photo: data.photo ? 'true' : 'false',
    confirmed,
    checkedInAt,
    deposit: Number(data.depositJpy || 0),
    kimonoPrice: Number(data.kimonoPriceJpy || 0),
    price: Number(data.kimonoPriceJpy || 0),
    hairFee: Number(data.hairFeeJpy || 0),
    photoFee: Number(data.photoFeeJpy || 0),
    totalJpy: Number(data.totalJpy || 0),
    onsiteDueJpy: Number(data.onsiteDueJpy || 0),
    coupon: data.couponCode || '',
    rate: data.discountRate || '',
    refundAmount: Number(data.refundAmountJpy || 0),
    refundTime: data.refundTime || '',
    refundReason: data.refundReason || '',
    refundBankCode: data.refundBankCode || '',
    refundBankName: data.refundBankName || '',
    refundBankAccount: data.refundBankAccount || '',
    refundBankAccountName: data.refundBankAccountName || '',
    proofImageUrl: data.proofUrl || '',
    remark: data.proofNote || '',
    status
  };
}
