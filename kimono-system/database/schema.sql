create extension if not exists "pgcrypto";

create type user_role as enum (
  'owner',
  'admin',
  'agent',
  'store_manager',
  'store_staff',
  'accountant',
  'readonly'
);

create type order_status as enum (
  'draft',
  'pending_payment',
  'pending_review',
  'confirmed',
  'checked_in',
  'completed',
  'refund_requested',
  'refunding',
  'refunded',
  'cancelled'
);

create type audit_action as enum (
  'booking_created',
  'proof_uploaded',
  'payment_reviewed',
  'order_confirmed',
  'order_checked_in',
  'order_completed',
  'refund_requested',
  'refund_approved',
  'refund_paid',
  'order_cancelled',
  'order_patched',
  'reconcile_matched',
  'month_closed',
  'month_unlocked',
  'login',
  'logout'
);

create table stores (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  city text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  role user_role not null default 'agent',
  store_id uuid references stores(id),
  password_hash text,
  active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  nationality text,
  line_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(phone, email)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_id uuid references customers(id),
  store_id uuid references stores(id),
  status order_status not null default 'pending_review',
  booking_at timestamptz not null,
  adults integer not null default 1 check (adults >= 0),
  children integer not null default 0 check (children >= 0),
  plan text,
  hair boolean not null default false,
  photo boolean not null default false,
  source text not null default 'web',
  platform text,
  coupon_code text,
  discount_rate numeric(4,2) not null default 10,
  deposit_jpy integer not null default 0,
  kimono_price_jpy integer not null default 0,
  hair_fee_jpy integer not null default 0,
  photo_fee_jpy integer not null default 0,
  total_jpy integer not null default 0,
  onsite_due_jpy integer not null default 0,
  proof_url text,
  proof_note text,
  last5 text,
  note text,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  kind text not null check (kind in ('deposit', 'onsite', 'refund')),
  amount_jpy integer not null,
  method text,
  proof_url text,
  received_at timestamptz,
  reconciled_at timestamptz,
  reconciled_by uuid references app_users(id),
  note text,
  created_at timestamptz not null default now()
);

create table refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  reason text not null,
  requested_amount_jpy integer,
  approved_amount_jpy integer,
  bank_code text,
  bank_name text,
  bank_account text,
  bank_account_name text,
  contact_phone text,
  status text not null default 'requested' check (status in ('requested', 'approved', 'paid', 'rejected')),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  handled_by uuid references app_users(id)
);

create table checkins (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  store_id uuid references stores(id),
  checked_in_by uuid references app_users(id),
  source text not null check (source in ('self', 'staff')),
  last5 text,
  checked_in_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  actor_id uuid references app_users(id) on delete set null,
  actor_label text,
  action audit_action not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  payment_id uuid references payments(id) on delete set null,
  bank_row_no text,
  bank_posted_at timestamptz,
  bank_amount_jpy integer not null,
  bank_description text,
  state text not null default 'unmatched' check (state in ('unmatched', 'matched', 'partial', 'overpaid', 'refunded', 'ignored')),
  matched_by uuid references app_users(id),
  matched_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table idempotency_keys (
  key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_orders_status on orders(status);
create index idx_orders_booking_at on orders(booking_at);
create index idx_orders_store_id on orders(store_id);
create index idx_audit_logs_order_id on audit_logs(order_id);
create index idx_audit_logs_created_at on audit_logs(created_at desc);
create index idx_reconciliation_items_state on reconciliation_items(state);
create index idx_reconciliation_items_order_id on reconciliation_items(order_id);
