import { useEffect, useState } from "react";
import { apiGet, type AuditLog } from "../api/client";

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ status: "success"; logs: AuditLog[] }>("/audit")
      .then((data) => setLogs(data.logs))
      .catch((err) => setError(err instanceof Error ? err.message : "載入失敗"));
  }, []);

  return (
    <section className="panel">
      <h1>審計日志</h1>
      <p className="muted">所有關鍵狀態變更、退款、對帳、登入都會留痕。</p>
      {error ? <p className="error">{error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>時間</th>
              <th>操作人</th>
              <th>動作</th>
              <th>訂單</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString("zh-TW")}</td>
                <td>{log.actor_label ?? "-"}</td>
                <td><span className="badge">{log.action}</span></td>
                <td className="mono">{log.order_id ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
