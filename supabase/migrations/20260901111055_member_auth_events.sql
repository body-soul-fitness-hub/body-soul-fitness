-- Safe operational trail for member-portal authentication.
-- Never store passwords, hCaptcha tokens, or raw IP addresses here.
create table if not exists member_auth_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete set null,
  mobile_masked text not null,
  outcome text not null check (outcome in (
    'success',
    'invalid_credentials',
    'captcha_failed',
    'member_inactive',
    'membership_inactive',
    'account_not_ready',
    'unknown_member',
    'invalid_request',
    'service_error'
  )),
  auth_error_code text,
  device_summary text,
  created_at timestamptz not null default now()
);

create index if not exists member_auth_events_created_at_idx on member_auth_events (created_at desc);
create index if not exists member_auth_events_member_id_idx on member_auth_events (member_id, created_at desc);
alter table member_auth_events enable row level security;

-- This table is written and read only by trusted server code using the service role.
revoke all on table member_auth_events from anon, authenticated;
