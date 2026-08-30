-- QR attendance: signed QR payloads are verified in the app using ATTENDANCE_QR_SECRET;
-- no reusable QR secret is stored in the database.

alter table member_checkins add column if not exists checkin_staff text;
alter table member_checkins add column if not exists checkout_staff text;
alter table member_checkins add column if not exists checkin_device text;
alter table member_checkins add column if not exists checkout_device text;
alter table member_checkins add column if not exists duration_minutes integer;

create table if not exists attendance_settings (
  id boolean primary key default true check (id),
  block_expired boolean not null default true,
  block_suspended boolean not null default true,
  block_inactive boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into attendance_settings (id) values (true) on conflict (id) do nothing;
alter table attendance_settings enable row level security;

create index if not exists member_checkins_open_idx on member_checkins (member_id, checked_in_at desc) where checked_out_at is null;
create index if not exists member_checkins_checked_in_at_idx on member_checkins (checked_in_at desc);
