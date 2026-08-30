-- Reporting, administrator settings, staff directory and a unified audit trail.

alter table gym_settings add column if not exists logo_url text;
alter table gym_settings add column if not exists invoice_number_format text not null default 'INV-{YYYY}-{NUMBER:6}';
alter table gym_settings add column if not exists expiry_reminder_days integer[] not null default '{7,3,1}';

create table if not exists staff_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  email text not null unique,
  role text not null default 'staff' check (role in ('administrator', 'manager', 'front_desk', 'trainer', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists staff_users_active_idx on staff_users (is_active);
alter table staff_users enable row level security;

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_entity_idx on audit_log (entity_type, entity_id, created_at desc);
create index if not exists audit_log_created_at_idx on audit_log (created_at desc);
alter table audit_log enable row level security;

create or replace function public.capture_gym_audit() returns trigger as $$
declare
  who text;
begin
  who := coalesce(current_setting('request.jwt.claim.sub', true), null);
  if tg_op = 'INSERT' then
    insert into audit_log(entity_type, entity_id, action, actor, after_data)
    values (tg_table_name, new.id::text, 'created', who, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into audit_log(entity_type, entity_id, action, actor, before_data, after_data)
    values (tg_table_name, new.id::text, 'updated', who, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into audit_log(entity_type, entity_id, action, actor, before_data)
    values (tg_table_name, old.id::text, 'deleted', who, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

do $$
declare t text;
begin
  foreach t in array array['members', 'member_subscriptions', 'member_payments', 'staff_users'] loop
    execute format('drop trigger if exists %I on %I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on %I for each row execute function public.capture_gym_audit()', t || '_audit', t);
  end loop;
end $$;

-- Make invoice numbers configurable while retaining the globally unique sequence.
create or replace function set_invoice_number() returns trigger as $$
declare fmt text;
begin
  if new.invoice_number is null then
    select invoice_number_format into fmt from gym_settings where id = 1;
    fmt := coalesce(fmt, 'INV-{YYYY}-{NUMBER:6}');
    new.invoice_number := replace(replace(fmt, '{YYYY}', to_char(now(), 'YYYY')), '{NUMBER:6}', lpad(nextval('invoices_invoice_number_seq')::text, 6, '0'));
  end if;
  return new;
end;
$$ language plpgsql;
