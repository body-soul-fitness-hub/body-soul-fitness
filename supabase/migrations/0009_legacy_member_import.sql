-- Legacy GymMaster migration foundation.
--
-- Do not paste spreadsheet data directly into `members`.  Load it through a
-- reviewed import service which creates one legacy_import_batches row, uses
-- legacy_customer_code as its idempotency key, and writes subscriptions,
-- invoices, and payments in a single transaction per source row.

alter table members
  add column if not exists legacy_customer_code text,
  add column if not exists legacy_import_batch_id uuid,
  add column if not exists legacy_metadata jsonb not null default '{}'::jsonb;

create table if not exists legacy_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_customer_file text not null,
  source_sales_file text not null,
  source_customer_rows integer not null check (source_customer_rows >= 0),
  source_sales_rows integer not null check (source_sales_rows >= 0),
  status text not null default 'prepared' check (status in ('prepared', 'validated', 'imported', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table members
  add constraint members_legacy_import_batch_id_fkey
  foreign key (legacy_import_batch_id) references legacy_import_batches(id) on delete set null;

-- PostgreSQL unique indexes allow multiple NULLs, so newly-created members are
-- unaffected while each legacy record remains safe to re-run.
create unique index if not exists members_legacy_customer_code_key
  on members (legacy_customer_code)
  where legacy_customer_code is not null;

alter table member_subscriptions
  add column if not exists legacy_import_batch_id uuid references legacy_import_batches(id) on delete set null,
  add column if not exists legacy_sale_row_key text,
  add column if not exists legacy_plan_status text;

create unique index if not exists member_subscriptions_legacy_sale_row_key_key
  on member_subscriptions (legacy_sale_row_key)
  where legacy_sale_row_key is not null;

alter table invoices
  add column if not exists legacy_import_batch_id uuid references legacy_import_batches(id) on delete set null,
  add column if not exists legacy_invoice_number text;

create unique index if not exists invoices_legacy_invoice_number_key
  on invoices (legacy_invoice_number)
  where legacy_invoice_number is not null;

create index if not exists members_legacy_import_batch_id_idx on members (legacy_import_batch_id);
create index if not exists member_subscriptions_legacy_import_batch_id_idx on member_subscriptions (legacy_import_batch_id);
create index if not exists invoices_legacy_import_batch_id_idx on invoices (legacy_import_batch_id);

alter table legacy_import_batches enable row level security;
