import { useEffect, useState } from "react";
import { apiGet, apiPost, type ApiOrder } from "../api/client";

type OrdersResponse = {
  status: "success";
  orders: ApiOrder[];
};

export function OrdersPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<OrdersResponse>("/orders");
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  async function confirmOrder(order: ApiOrder) {
    await apiPost(`/orders/${order.id}/transition`, { status: "confirmed" });
    await loadOrders();
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>訂單管理</h1>
          <p className="muted">所有狀態流轉由 API 控制，前端只提交意圖。</p>
        </div>
        <button onClick={loadOrders}>重新整理</button>
      </div>

      {loading ? <p className="muted">載入中...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>訂單</th>
              <th>客人</th>
              <th>門市</th>
              <th>體驗時間</th>
              <th>狀態</th>
              <th>金額</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="mono">{order.order_no}</td>
                <td>
                  <strong>{order.customer_name ?? "-"}</strong>
                  <span>{order.customer_phone ?? ""}</span>
                </td>
                <td>{order.store_name ?? order.store_code ?? "-"}</td>
                <td>{formatDate(order.booking_at)}</td>
                <td><span className="badge">{order.status}</span></td>
                <td>¥{Number(order.total_jpy ?? 0).toLocaleString("ja-JP")}</td>
                <td>
                  {order.status === "pending_review" ? (
                    <button onClick={() => confirmOrder(order)}>確認</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-TW", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
