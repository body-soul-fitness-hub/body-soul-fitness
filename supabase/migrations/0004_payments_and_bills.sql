-- Payments & Bills module: a configurable `gym_settings` singleton (contact details, tax rate,
-- receipt thank-you message), an `invoices` table with an auto-generated unique invoice number
-- (INV-2026-000001, ...) created alongside every subscription, and an `invoice_id` link on
-- `member_payments` so each recorded payment applies to a specific bill.
--
-- Run this against the Supabase project configured in .env.local (NEXT_PUBLIC_SUPABASE_URL),
-- after 0001, 0002, and 0003. No subscription/payment records exist in any environment this
-- runs against yet (see docs/PRODUCT_TECHNICAL_BLUEPRINT.md v1.8.1 — the only test records were
-- created and deleted during 0003 verification), so no data backfill is needed for the new
-- `invoice_id` column or the invoice-aware balance/status recompute this module introduces.
--
-- RLS is enabled on every new table below with NO policies defined, consistent with 0001/0002/
-- 0003 — the app talks to these tables only through the server-only Supabase client
-- authenticated with the service-role key.

-- 1. Gym settings (single configurable row) ----------------------------------------------------

create table if not exists gym_settings (
  id smallint primary key default 1 check (id = 1),
  gym_name text not null default 'Body & Soul Fitness Center',
  address text,
  phone text,
  email text,
  website text,
  gstin text,
  tax_label text not null default 'GST',
  tax_rate numeric(5, 2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  thank_you_message text not null default 'Thank you for choosing Body & Soul Fitness Center. See you at the gym!',
  updated_at timestamptz not null default now()
);

insert into gym_settings (id) values (1) on conflict (id) do nothing;

alter table gym_settings enable row level security;

-- 2. Invoices ------------------------------------------------------------------------------------
-- One invoice is created per subscription (including renewals, which create a new subscription
-- row and therefore a new invoice) so every bill has its own number and its own payment trail.

create sequence if not exists invoices_invoice_number_seq;

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  member_id uuid not null references members(id) on delete cascade,
  subscription_id uuid references member_subscriptions(id) on delete set null,
  issue_date date not null default current_date,
  plan_name text,
  duration_unit text,
  duration_value integer,
  start_date date,
  end_date date,
  amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  tax_label text,
  tax_rate numeric(5, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  currency text not null default 'INR',
  amount_paid numeric(12, 2) not null default 0,
  balance_due numeric(12, 2) not null default 0,
  payment_mode text check (payment_mode in ('cash', 'upi', 'card', 'bank_transfer', 'other')),
  status text not null default 'unpaid' check (status in ('paid', 'partial', 'unpaid')),
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Invoice numbers embed the creation year (INV-2026-000001) but the counter itself is a single
-- ever-increasing sequence rather than one that resets each January — simpler, still unique and
-- sortable, and "INV-2026-000001" in the brief is given only as a format example, not a
-- requirement that numbering restart at year boundaries.
create or replace function set_invoice_number() returns trigger as $$
begin
  if new.invoice_number is null then
    new.invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoices_invoice_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists invoices_set_invoice_number on invoices;
create trigger invoices_set_invoice_number
  before insert on invoices
  for each row execute function set_invoice_number();

create index if not exists invoices_member_id_idx on invoices (member_id);
create index if not exists invoices_subscription_id_idx on invoices (subscription_id);
create index if not exists invoices_status_idx on invoices (status);
create index if not exists invoices_issue_date_idx on invoices (issue_date);

alter table invoices enable row level security;

-- 3. Link payments to the invoice they were applied against -------------------------------------

alter table member_payments add column if not exists invoice_id uuid references invoices(id) on delete set null;
create index if not exists member_payments_invoice_id_idx on member_payments (invoice_id);
