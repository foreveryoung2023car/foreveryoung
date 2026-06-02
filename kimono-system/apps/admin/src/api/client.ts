const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8787";

export type ApiOrder = {
  id: string;
  order_no: string;
  status: string;
  booking_at: string;
  adults: number;
  children: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  store_code?: string;
  store_name?: string;
  total_jpy?: number;
  onsite_due_jpy?: number;
};

export type ReconciliationItem = {
  id: string;
  order_no?: string;
  customer_name?: string;
  bank_amount_jpy: number;
  bank_description?: string;
  state: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_label?: string;
  action: string;
  order_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type LoginResponse = {
  status: "success";
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    storeId?: string | null;
  };
};

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders()
  });
  return parseResponse<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return parseResponse<T>(res);
}

export async function login(email: string, password: string) {
  const result = await apiPost<LoginResponse>("/auth/login", { email, password });
  localStorage.setItem("kimono_admin_token", result.token);
  localStorage.setItem("kimono_admin_user", JSON.stringify(result.user));
  return result;
}

export function logout() {
  localStorage.removeItem("kimono_admin_token");
  localStorage.removeItem("kimono_admin_user");
}

export function hasToken() {
  return Boolean(localStorage.getItem("kimono_admin_token"));
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return parseResponse<T>(res);
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("kimono_admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === "error") {
    throw new Error(data.message || "API request failed");
  }
  return data as T;
}
