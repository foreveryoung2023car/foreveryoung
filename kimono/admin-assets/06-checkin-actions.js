// v2.4.38 報到功能：店家在客人到店時點，記錄報到時間與報到店家
async function checkInOrder(id){
  const o = allOrders.find(x=>x.orderId===id);
  if(!o) return;
  // 預設 storeKey：店家身份用 currentStoreKey；Jun/Ren 客服可手動輸入
  let storeKey = currentStoreKey;
  if (!storeKey) {
    storeKey = prompt('請輸入報到門市代號 (kyoto1 / kyoto2 / osaka1 / tokyo1)：', o.storeKey || '');
    if (!storeKey) return;
    storeKey = String(storeKey).trim().toLowerCase();
    if (!['kyoto1','kyoto2','osaka1','tokyo1'].includes(storeKey)) { alert('門市代號錯誤'); return; }
  }
  const phoneLast3 = prompt('請輸入客人手機末 3 碼（驗證身份）：');
  if (phoneLast3 === null) return;
  const phone = String(o.phone||'').replace(/[^0-9]/g,'');
  const phoneLast3Clean = String(phoneLast3||'').replace(/\D/g,'').slice(-3);
  if (!/^\d{3}$/.test(phoneLast3Clean)) {
    alert('請輸入客人手機末 3 碼，必須是 3 位數字。');
    return;
  }
  if (!phone.endsWith(phoneLast3Clean)) {
    if (!confirm('手機末 3 碼不符（客人輸入：'+phoneLast3Clean+'，記錄：'+phone.slice(-3)+'）。仍要報到？')) return;
  }
  if (!confirm('確定為「'+(o.name||id)+'」辦理報到？\n門市：'+storeKey+'\n體驗日：'+(o.bookingDate||'—'))) return;
  try {
    if (useFirebaseAdmin()) {
      const token = await getFreshAdminToken();
      const apiBaseUrl = (KIMONO_CONFIG.API_BASE_URL || '').replace(/\/$/, '');
      const res = await fetch(apiBaseUrl + '/checkInOrderByStaff', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + token },
        body: JSON.stringify({ orderId:o.firebaseDocId || id, phoneLast3:phoneLast3Clean })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || data.status !== 'success') throw new Error(data.message || '報到失敗');
      o.checkedInAt = new Date().toISOString();
      o.checkedInBy = storeKey;
      o.status = 'checked_in';
      filterOrders();
      toast('已報到：'+(o.name||id)+' @ '+storeKey);
      return;
    }
    const res = await fetch(GAS_URL, {method:'POST', body:JSON.stringify({
      action:'checkInOrder', agent:currentAgent, token:adminToken,
      orderId:id, storeKey:storeKey, last5:phoneLast3Clean
    })});
    const data = await res.json();
    if(data.status==='unauthorized'){ showLogin(); return; }
    if(data.status==='ok'||data.status==='success'){
      o.checkedInAt = data.checkedInAt || new Date().toISOString();
      o.checkedInBy = storeKey;
      filterOrders();
      toast('已報到：'+(o.name||id)+' @ '+storeKey);
    } else {
      alert('報到失敗：'+(data.message||'未知錯誤'));
    }
  } catch(e){
    alert('網路異常：'+e.message);
  }
}

async function batchConfirm(){
  if (currentRole === 'store') return;
  if(!selectedIds.size) return;
  if(!confirm('確定批次確認 '+selectedIds.size+' 筆訂單嗎？')) return;
  let ok=0, fail=0;
  for(const id of selectedIds){
    const o = allOrders.find(x=>x.orderId===id);
    if(!o) continue;
    try{ await saveOrderQuick(o, {confirmed:'TRUE'}); ok++; }catch(e){ fail++; }
  }
  toast('完成：成功 '+ok+' 筆，失敗 '+fail+' 筆', fail?'warning':'');
  clearSelection();
}

async function saveOrderQuick(o, patch){
  if (useFirebaseAdmin()) {
    const apiBaseUrl = (KIMONO_CONFIG.API_BASE_URL || '').replace(/\/$/, '');
    const token = await getFreshAdminToken();
    let nextStatus = null;
    if (patch.confirmed === 'TRUE' || patch.confirmed === 'true') nextStatus = 'confirmed';
    let data = null;
    if (nextStatus) {
      const res = await fetch(apiBaseUrl + '/transitionOrder', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + token },
        body: JSON.stringify({ orderId:o.firebaseDocId || o.orderId, status:nextStatus })
      });
      data = await res.json().catch(()=>({}));
      if (!res.ok || data.status !== 'success') throw new Error(data.message || '儲存失敗');
      o.confirmed = true;
      o.status = nextStatus;
    } else {
      const payload = { orderId:o.firebaseDocId || o.orderId };
      if (patch.refundDate !== undefined) payload.refundTime = patch.refundDate || '';
      if (patch.note !== undefined) payload.note = patch.note || '';
      if (Object.keys(payload).length <= 1) throw new Error('沒有可儲存的變更');
      const res = await fetch(apiBaseUrl + '/updateOrderByStaff', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + token },
        body: JSON.stringify(payload)
      });
      data = await res.json().catch(()=>({}));
      if (!res.ok || data.status !== 'success') throw new Error(data.message || '儲存失敗');
      if (patch.refundDate !== undefined) o.refundTime = patch.refundDate || '';
      if (patch.note !== undefined) {
        o.note = patch.note || '';
        o.remark = patch.note || '';
      }
      if (Number(o.refundAmount) > 0 && o.refundTime) o.status = 'refunded';
    }
    filterOrders();
    renderDashboard();
    if (document.getElementById('todo-modal')) closeTodoModal();
    toast('已更新：'+(o.name||o.orderId));
    return data;
  }
  const payload = Object.assign({
    action:'adminUpdate', agent:currentAgent, token:adminToken, orderId:o.orderId,
    name:o.name||'', phone:o.phone||'', email:o.email||'',
    bookingDate:(o.bookingDate||'').slice(0,10), pax:o.adults||o.pax||'',
    plan:o.plan||'', platform:o.platform||'',
    hair: (o.hair===true||o.hair==='true')?'true':'false',
    photo: (o.photo===true||o.photo==='true')?'true':'false',
    confirmed: o.confirmed?'true':'false',
    deposit:o.deposit||'', kimonoPrice:o.price||o.kimonoPrice||'',
    hairFee:o.hairFee||'', photoFee:o.photoFee||'',
    coupon:o.coupon||'', rate:o.rate||'',
    refundAmt:o.refundAmount||'', refundDate:(o.refundTime||'').slice(0,16),
    refundReason:o.refundReason||'', note:o.remark||''
  }, patch);
  const res = await fetch(GAS_URL, {method:'POST', body:JSON.stringify(payload)});
  const data = await res.json();
  if(data.status==='unauthorized'){ showLogin(); throw new Error('unauthorized'); }
  if(data.status==='ok'||data.status==='success'){
    Object.assign(o, payload);
    o.confirmed = patch.confirmed==='true';
    filterOrders(); renderDashboard();
    toast('已更新：'+(o.name||o.orderId));
    return data;
  }
  throw new Error(data.message||'儲存失敗');
}

function copyOrderId(id){
  navigator.clipboard.writeText(id).then(()=>toast('已複製：'+id));
}
