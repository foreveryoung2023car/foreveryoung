import { useState } from "react";
import { hasToken, logout } from "../api/client";
import { AppShell } from "../components/AppShell";
import { AuditPage } from "./AuditPage";
import { LoginPage } from "./LoginPage";
import { OrdersPage } from "./OrdersPage";
import { ReconciliationPage } from "./ReconciliationPage";

export function App() {
  const [active, setActive] = useState("orders");
  const [authed, setAuthed] = useState(hasToken());

  if (!authed) return <LoginPage onLogin={() => setAuthed(true)} />;

  return (
    <AppShell active={active} onNavigate={setActive}>
      <div className="top-actions">
        <button onClick={() => { logout(); setAuthed(false); }}>登出</button>
      </div>
      {active === "orders" ? (
        <OrdersPage />
      ) : active === "reconcile" ? (
        <ReconciliationPage />
      ) : active === "audit" ? (
        <AuditPage />
      ) : (
        <section className="panel">
          <h1>{labelFor(active)}</h1>
          <p className="muted">此模組已拆出入口，下一步接 API 與權限。</p>
        </section>
      )}
    </AppShell>
  );
}

function labelFor(id: string) {
  const labels: Record<string, string> = {
    dashboard: "儀表板",
    checkins: "報到中心",
    finance: "財務報表",
    audit: "審計日志",
    permissions: "權限管理"
  };
  return labels[id] ?? id;
}
