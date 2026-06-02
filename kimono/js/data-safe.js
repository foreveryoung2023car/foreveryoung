// Shared data-safety helpers for the kimono static pages.
// Keep this file framework-free so GitHub Pages can serve it directly.
(function () {
  var C = window.KimonoConstants || {};
  var responseStatus = C.responseStatus || { success: 'success', ok: 'ok', unauthorized: 'unauthorized' };

  function requestId(prefix) {
    if (window.crypto && window.crypto.randomUUID) return prefix + '-' + window.crypto.randomUUID();
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function savePending(key, payload) {
    try {
      window.localStorage.setItem(key, JSON.stringify({
        savedAt: new Date().toISOString(),
        payload: payload
      }));
    } catch (err) {}
  }

  function getPending(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function clearPending(key, clientRequestId) {
    try {
      if (!clientRequestId) {
        window.localStorage.removeItem(key);
        return;
      }
      var rec = getPending(key);
      if (rec && rec.payload && rec.payload.clientRequestId === clientRequestId) {
        window.localStorage.removeItem(key);
      }
    } catch (err) {}
  }

  function countPending(prefix) {
    try {
      var count = 0;
      for (var i = 0; i < window.localStorage.length; i++) {
        var key = window.localStorage.key(i) || '';
        if (key.indexOf(prefix) === 0) count++;
      }
      return count;
    } catch (err) {
      return 0;
    }
  }

  async function postGAS(url, payload, options) {
    options = options || {};
    var res = await window.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    var text = await res.text();
    var data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      throw new Error(options.parseError || '伺服器回應格式錯誤');
    }
    var status = String(data.status || data.result || '').toLowerCase();
    if (!status) throw new Error(options.missingStatusError || '伺服器未回傳處理狀態');
    if (status === responseStatus.unauthorized) return data;
    if (status && [responseStatus.success, responseStatus.ok].indexOf(status) === -1) {
      throw new Error(data.message || data.error || options.defaultError || '送出失敗');
    }
    return data;
  }

  window.KimonoDataSafe = {
    requestId: requestId,
    savePending: savePending,
    getPending: getPending,
    clearPending: clearPending,
    countPending: countPending,
    postGAS: postGAS
  };
})();
