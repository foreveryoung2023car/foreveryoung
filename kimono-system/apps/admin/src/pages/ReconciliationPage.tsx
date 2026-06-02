import { useEffect, useState } from "react";
import { apiGet, type ReconciliationItem } from "../api/client";

export function ReconciliationPage() {
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ status: "success"; items: ReconciliationItem[] }>("/reconciliation")
      .then((data) => setItems(data.items))
      .catch((err) => setError(err instanceof Error ? err.message : "載入失敗"));
  }, []);

  return (
    <section className="panel">
      <h1>對帳</h1>
      <p className="muted">銀行入帳匹配、異常、超收、部分入帳都由後端計算。</p>
      {error ? <p className="error">{error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>狀態</th>
              <th>訂單</th>
              <th>客人</th>
              <th>金額</th>
              <th>說明</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><span className="badge">{item.state}</span></td>
                <td className="mono">{item.order_no ?? "-"}</td>
                <td>{item.customer_name ?? "-"}</td>
                <td>¥{Number(item.bank_amount_jpy).toLocaleString("ja-JP")}</td>
                <td>{item.bank_description ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
