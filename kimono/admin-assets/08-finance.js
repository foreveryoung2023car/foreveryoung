// ── FINANCE ──
function renderFinance(){
  const range = document.getElementById('fin-range').value;
  const filtered = allOrders.filter(o=>isInRange(o,range));
  const deposit = filtered.reduce((s,o)=>s+(Number(o.deposit)||0),0);
  const total = filtered.reduce((s,o)=>s+totalAmount(o),0);
  const due = total - deposit;
  const refund = filtered.reduce((s,o)=>s+(Number(o.refundAmount)||0),0);
  document.getElementById('fin-deposit').textContent = fmtY0(deposit);
  document.getElementById('fin-due').textContent = fmtY0(due);
  document.getElementById('fin-total').textContent = fmtY0(total);
  document.getElementById('fin-refund').textContent = fmtY0(refund);

  const months = {};
  allOrders.forEach(o=>{
    if(!o.bookingDate) return;
    const k = (o.bookingDate+'').slice(0,7);
    if(!months[k]) months[k] = {count:0, deposit:0, total:0, refund:0, confirmed:0};
    months[k].count++;
    months[k].deposit += Number(o.deposit)||0;
    months[k].total += totalAmount(o);
    months[k].refund += Number(o.refundAmount)||0;
    if(o.confirmed) months[k].confirmed++;
  });
  const keys = Object.keys(months).sort().reverse();
  const trend = document.getElementById('month-trend');
  if(!keys.length){ trend.innerHTML='<div class="text-center text-slate-600 py-4 font-semibold">無資料</div>'; }
  else {
    trend.innerHTML = '<table class="data-table"><thead><tr>'+
      '<th>月份</th><th class="num">訂單數</th><th class="num">已確認</th>'+
      '<th class="num">訂金</th><th class="num">總營收</th>'+
      '<th class="num">退款</th><th class="num">淨營收</th></tr></thead><tbody>'+
      keys.map(k=>{
        const m = months[k]; const net = m.total - m.refund;
        return '<tr><td class="font-bold">'+k+'</td>'+
        '<td class="num">'+m.count+'</td>'+
        '<td class="num text-emerald-700">'+m.confirmed+'</td>'+
        '<td class="num">'+fmtY0(m.deposit)+'</td>'+
        '<td class="num font-bold">'+fmtY0(m.total)+'</td>'+
        '<td class="num text-red-600">'+(m.refund? fmtY0(m.refund) : '—')+'</td>'+
        '<td class="num font-bold text-[#C9A961]">'+fmtY0(net)+'</td>'+
        '</tr>';
      }).join('')+'</tbody></table>';
  }

  const refunds = allOrders.filter(o=>Number(o.refundAmount)>0);
  const rd = document.getElementById('refund-detail');
  if(!refunds.length){ rd.innerHTML='<div class="text-center text-slate-600 py-4 font-semibold">本期無退款記錄</div>'; }
  else {
    rd.innerHTML = '<table class="data-table"><thead><tr>'+
      '<th>訂單號</th><th>客戶</th><th>體驗日期</th>'+
      '<th class="num">退款金額</th><th>退款時間</th>'+
      '<th>原因</th></tr></thead><tbody>'+
      refunds.map(o=>'<tr onclick="openEdit(\''+o.orderId+'\')">'+
      '<td class="font-mono text-sm">'+o.orderId+'</td>'+
      '<td class="font-bold">'+(o.name||'—')+'</td>'+
      '<td>'+fmtDate(o.bookingDate)+'</td>'+
      '<td class="num text-red-600 font-bold">'+fmtY0(o.refundAmount)+'</td>'+
      '<td>'+(o.refundTime? fmtDate(o.refundTime):'<span class="badge badge-pending">處理中</span>')+'</td>'+
      '<td class="text-sm wrap" style="min-width:200px;max-width:380px">'+(o.refundReason||'—')+'</td>'+
      '</tr>').join('')+'</tbody></table>';
  }
}
