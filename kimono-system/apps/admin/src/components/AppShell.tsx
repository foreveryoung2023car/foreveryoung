import { CalendarDays, ClipboardList, FileClock, Gauge, ShieldCheck, Wallet } from "lucide-react";

const nav = [
  { id: "dashboard", label: "儀表板", icon: Gauge },
  { id: "orders", label: "訂單", icon: ClipboardList },
  { id: "checkins", label: "報到", icon: CalendarDays },
  { id: "finance", label: "財務", icon: Wallet },
  { id: "reconcile", label: "對帳", icon: Wallet },
  { id: "audit", label: "審計", icon: FileClock },
  { id: "permissions", label: "權限", icon: ShieldCheck }
];

type Props = {
  active: string;
  onNavigate: (id: string) => void;
  children: React.ReactNode;
};

export function AppShell({ active, onNavigate, children }: Props) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">旅</div>
          <div>
            <strong>和服後台</strong>
            <span>Kimono Ops</span>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={active === item.id ? "active" : ""}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
