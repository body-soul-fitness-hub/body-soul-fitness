-- Plans & Subscriptions module: a `plans` catalog (name, duration, standard price, discount,
-- final price, description, included services, active flag) and a full subscription lifecycle
-- on top of the `member_subscriptions` table introduced (minimal, read-only) in 0002 — plan
-- snapshot, discount, payment status/amount paid/balance due/mode, freeze/cancel metadata, and
-- a renewal chain — plus a `subscription_events` audit trail so renew/extend/freeze/cancel
-- actions are never silently overwritten.
--
-- Run this against the Supabase project configured in .env.local (NEXT_PUBLIC_SUPABASE_URL),
-- after 0001 and 0002. member_subscriptions has had no creation UI before this module (see
-- docs/PRODUCT_TECHNICAL_BLUEPRINT.md v1.6.0's note that subscription creation was deferred to
-- this module), so it is safe to assume the table has no real rows in any environment this runs
-- against — the column changes below (dropping the old `amount` column, tightening the status
-- check) do not need a data migration as a result.
--
-- RLS is enabled on every new table below with NO policies defined, consistent with 0001/0002 —
-- the app talks to these tables only through the server-only Supabase client authenticated with
-- the service-role key.

-- 1. Plans catalog ----------------------------------------------------------------------------

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_unit text not null default 'months' check (duration_unit in ('days', 'months')),
  duration_value integer not null check (duration_value > 0),
  standard_price numeric(12, 2) not null default 0 check (standard_price >= 0),
  discount_type text check (discount_type in ('amount', 'percentage')),
  discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  final_price numeric(12, 2) not null default 0 check (final_price >= 0),
  description text,
  included_services text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_is_active_idx on plans (is_active);

alter table plans enable row level security;

-- 2. Extend member_subscriptions for the full subscription lifecycle ---------------------------

alter table member_subscriptions add column if not exists plan_id uuid references plans(id) on delete set null;
alter table member_subscriptions add column if not exists duration_unit text;
alter table member_subscriptions add column if not exists duration_value integer;
alter table member_subscriptions add column if not exists standard_price numeric(12, 2);
alter table member_subscriptions add column if not exists discount_type text check (discount_type in ('amount', 'percentage'));
alter table member_subscriptions add column if not exists discount_value numeric(12, 2) not null default 0;
alter table member_subscriptions add column if not exists final_amount numeric(12, 2) not null default 0;
alter table member_subscriptions add column if not exists payment_status text not null default 'unpaid' check (payment_status in ('paid', 'partial', 'unpaid'));
alter table member_subscriptions add column if not exists amount_paid numeric(12, 2) not null default 0;
alter table member_subscriptions add column if not exists balance_due numeric(12, 2) not null default 0;
alter table member_subscriptions add column if not exists payment_mode text check (payment_mode in ('cash', 'upi', 'card', 'bank_transfer', 'other'));
alter table member_subscriptions add column if not exists frozen_at timestamptz;
alter table member_subscriptions add column if not exists freeze_reason text;
alter table member_subscriptions add column if not exists cancelled_at timestamptz;
alter table member_subscriptions add column if not exists cancel_reason text;
alter table member_subscriptions add column if not exists renewed_from_id uuid references member_subscriptions(id) on delete set null;
alter table member_subscriptions add column if not exists updated_at timestamptz not null default now();

-- `amount` is superseded by `final_amount` (the post-discount price staff actually bill); safe
-- to drop outright since nothing has ever written to this table (see note above).
alter table member_subscriptions drop column if exists amount;

-- Stored status is staff-controlled only — "expired" and "expiring soon" are always derived from
-- end_date at read time (lib/subscriptions/types.ts: deriveSubscriptionStatus).
alter table member_subscriptions drop constraint if exists member_subscriptions_status_check;
alter table member_subscriptions alter column status set default 'active';
alter table member_subscriptions add constraint member_subscriptions_status_check
  check (status in ('active', 'frozen', 'cancelled'));

create index if not exists member_subscriptions_plan_id_idx on member_subscriptions (plan_id);
create index if not exists member_subscriptions_status_idx on member_subscriptions (status);
create index if not exists member_subscriptions_end_date_idx on member_subscriptions (end_date);

-- 3. Subscription event history -----------------------------------------------------------------
-- Renew creates a brand-new member_subscriptions row (linked via renewed_from_id), but extend/
-- freeze/unfreeze/cancel/payment mutate the existing row in place — this table is what keeps
-- that mutation history complete instead of only ever showing the current state.

create table if not exists subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references member_subscriptions(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'renewed', 'extended', 'frozen', 'unfrozen', 'cancelled', 'payment_recorded')),
  details text not null,
  performed_by text,
  created_at timestamptz not null default now()
);

create index if not exists subscription_events_subscription_id_idx on subscription_events (subscription_id);
create index if not exists subscription_events_member_id_idx on subscription_events (member_id);

alter table subscription_events enable row level security;
