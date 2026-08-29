-- Member Management module: full member registration/profile fields, an auto-generated
-- human-readable member ID (BSFC-000001, ...), an auditable status-change trail, and
-- supporting history tables (subscriptions, payments, check-ins, notifications, notes)
-- that the Plans & billing, Attendance, and Announcements modules will populate later.
--
-- Run this against the Supabase project configured in .env.local (NEXT_PUBLIC_SUPABASE_URL),
-- e.g. via the Supabase SQL editor or `supabase db push`. Safe to run on a project that
-- already has 0001_enquiry_management.sql applied (including one with existing member rows).
--
-- RLS is enabled on every table below with NO policies defined, so the `anon` and
-- `authenticated` roles are default-denied, consistent with 0001. The application talks to
-- these tables only through the server-only Supabase client authenticated with the
-- service-role key (which bypasses RLS).

-- 1. Auto-generated member ID (BSFC-000001, BSFC-000002, ...) ------------------------------

alter table members add column if not exists member_id text;

create sequence if not exists members_member_id_seq;

-- Backfill any existing rows (e.g. members created via the Convert-to-Member flow before
-- this migration) in creation order, then advance the sequence past them.
with ordered as (
  select id, row_number() over (order by created_at) as rn
  from members
  where member_id is null
)
update members m
set member_id = 'BSFC-' || lpad(ordered.rn::text, 6, '0')
from ordered
where m.id = ordered.id;

select setval('members_member_id_seq', (select count(*) from members), true);

create or replace function set_member_id() returns trigger as $$
begin
  if new.member_id is null then
    new.member_id := 'BSFC-' || lpad(nextval('members_member_id_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists members_set_member_id on members;
create trigger members_set_member_id
  before insert on members
  for each row execute function set_member_id();

alter table members alter column member_id set not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_member_id_key') then
    alter table members add constraint members_member_id_key unique (member_id);
  end if;
end $$;

-- 2. Remaining registration/profile fields --------------------------------------------------

alter table members add column if not exists email text;
alter table members add column if not exists emergency_contact_name text;
alter table members add column if not exists emergency_contact_number text;
alter table members add column if not exists photo_path text;
alter table members add column if not exists medical_notes text;
alter table members add column if not exists referred_by text;
alter table members add column if not exists assigned_trainer text;
alter table members add column if not exists updated_at timestamptz not null default now();

-- Expand member status from the minimal active/inactive pair to the full lifecycle.
alter table members alter column status set default 'active';
alter table members drop constraint if exists members_status_check;
alter table members add constraint members_status_check
  check (status in ('active', 'inactive', 'frozen', 'expired', 'suspended'));

create index if not exists members_mobile_number_idx on members (mobile_number);
create index if not exists members_status_idx on members (status);
create index if not exists members_assigned_trainer_idx on members (assigned_trainer);
create index if not exists members_join_date_idx on members (join_date);

-- 3. Status-change audit trail ---------------------------------------------------------------

create table if not exists member_status_changes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  previous_status text not null,
  new_status text not null,
  reason text not null,
  changed_by text,
  created_at timestamptz not null default now()
);

create index if not exists member_status_changes_member_id_idx on member_status_changes (member_id);

-- 4. Subscriptions, payments, check-ins, notifications, notes -------------------------------
-- Minimal, display-ready shapes for the member profile page. The Plans & billing and
-- Attendance modules (see docs/PRODUCT_TECHNICAL_BLUEPRINT.md) are expected to extend
-- these rather than replace them once they're built.

create table if not exists member_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  plan_name text not null,
  start_date date not null default current_date,
  end_date date,
  amount numeric(12, 2),
  currency text not null default 'INR',
  status text not null default 'active' check (status in ('active', 'upcoming', 'expired', 'cancelled')),
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists member_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  subscription_id uuid references member_subscriptions(id) on delete set null,
  amount numeric(12, 2) not null,
  currency text not null default 'INR',
  payment_date date not null default current_date,
  method text,
  reference text,
  notes text,
  received_by text,
  created_at timestamptz not null default now()
);

create table if not exists member_checkins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  method text not null default 'manual',
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists member_notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  channel text not null default 'whatsapp',
  message text not null,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists member_notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  note text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists member_subscriptions_member_id_idx on member_subscriptions (member_id);
create index if not exists member_payments_member_id_idx on member_payments (member_id);
create index if not exists member_checkins_member_id_idx on member_checkins (member_id);
create index if not exists member_notifications_member_id_idx on member_notifications (member_id);
create index if not exists member_notes_member_id_idx on member_notes (member_id);

alter table member_status_changes enable row level security;
alter table member_subscriptions enable row level security;
alter table member_payments enable row level security;
alter table member_checkins enable row level security;
alter table member_notifications enable row level security;
alter table member_notes enable row level security;

-- 5. Private storage bucket for member photos ------------------------------------------------
-- Kept private (not public) since member photos are personal data; the app reads them via
-- short-lived signed URLs generated server-side with the service-role key.

insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;
