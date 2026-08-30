-- WhatsApp Notifications module: consent/opt-out fields on `members`, a `share_token` on
-- `invoices` for the public receipt link, a `whatsapp_settings` singleton (provider config,
-- encrypted access token, test mode, per-automation toggles), a `whatsapp_templates` registry
-- (one row per notification type, referencing a Meta-approved template name/language), and
-- extending the existing-but-unused `member_notifications` scaffold from 0002 into the full
-- delivery log the module needs (type, recipient number, provider message id, error message,
-- trigger source, and links back to the subscription/invoice that triggered the send).
--
-- Run this against the Supabase project configured in .env.local, after 0001-0004.
-- RLS is enabled on every new table below with NO policies, consistent with every prior
-- migration — the app talks to these tables only through the server-only Supabase client
-- authenticated with the service-role key.

-- 1. Member consent / opt-out ---------------------------------------------------------------

alter table members add column if not exists whatsapp_consent boolean not null default false;
alter table members add column if not exists whatsapp_consent_at timestamptz;
alter table members add column if not exists whatsapp_promotional_opt_out boolean not null default false;

-- 2. Public, unguessable receipt link ---------------------------------------------------------
-- Deliberately a separate random token rather than reusing the invoice's own id as the secret,
-- so the public link can be shared over WhatsApp without depending on the internal id never
-- being exposed elsewhere, and so it stays revocable independently of the row itself later.

alter table invoices add column if not exists share_token text unique;

create or replace function set_invoice_share_token() returns trigger as $$
begin
  if new.share_token is null then
    new.share_token := encode(gen_random_bytes(24), 'hex');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists invoices_set_share_token on invoices;
create trigger invoices_set_share_token
  before insert on invoices
  for each row execute function set_invoice_share_token();

-- Backfill share_token for any invoices inserted before this migration.
update invoices set share_token = encode(gen_random_bytes(24), 'hex') where share_token is null;

-- 3. WhatsApp provider settings (single configurable row) -------------------------------------
-- The access token is the one genuinely sensitive value here and is stored encrypted
-- (AES-256-GCM, encrypted/decrypted in the Node app with a server-only key — see
-- lib/whatsapp/crypto.ts) — never in plaintext, never round-tripped to the browser.
-- phone_number_id / business_account_id are identifiers, not secrets, and are stored plain.

create table if not exists whatsapp_settings (
  id smallint primary key default 1 check (id = 1),
  business_phone_number text,
  phone_number_id text,
  business_account_id text,
  graph_api_version text not null default 'v21.0',
  access_token_ciphertext text,
  access_token_last4 text,
  access_token_updated_at timestamptz,
  test_mode boolean not null default true,
  test_recipient_number text,
  bill_generated_enabled boolean not null default true,
  expiry_reminders_enabled boolean not null default true,
  expired_notice_enabled boolean not null default true,
  custom_notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into whatsapp_settings (id) values (1) on conflict (id) do nothing;

alter table whatsapp_settings enable row level security;

-- 4. Message template registry -----------------------------------------------------------------
-- Meta requires a pre-approved template for every business-initiated WhatsApp message, so these
-- rows don't hold sendable free text — they register the Meta template name/language an admin
-- created and got approved in Meta Business Manager, plus the variable order and a reference
-- body_preview shown in our UI. meta_approval_status is refreshed on demand via the Graph API.

create table if not exists whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique not null check (key in ('bill_generated', 'expiry_reminder_7', 'expiry_reminder_3', 'expiry_reminder_1', 'expired', 'custom')),
  label text not null,
  meta_template_name text,
  meta_template_language text not null default 'en_US',
  variables jsonb not null default '[]'::jsonb,
  body_preview text not null default '',
  meta_approval_status text not null default 'unknown' check (meta_approval_status in ('unknown', 'pending', 'approved', 'rejected')),
  meta_approval_checked_at timestamptz,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into whatsapp_templates (key, label, variables, body_preview) values
  ('bill_generated', 'Bill generated', '["member_name","invoice_number","amount","balance_due","receipt_link","gym_name"]'::jsonb,
   'Hi {{member_name}}, your invoice {{invoice_number}} from {{gym_name}} is ready. Amount: {{amount}}, Balance due: {{balance_due}}. View/download your receipt: {{receipt_link}}'),
  ('expiry_reminder_7', 'Expiry reminder — 7 days', '["member_name","plan_name","end_date","gym_name"]'::jsonb,
   'Hi {{member_name}}, your {{plan_name}} membership at {{gym_name}} expires on {{end_date}} (7 days from now). Renew soon to avoid interruption.'),
  ('expiry_reminder_3', 'Expiry reminder — 3 days', '["member_name","plan_name","end_date","gym_name"]'::jsonb,
   'Hi {{member_name}}, your {{plan_name}} membership at {{gym_name}} expires on {{end_date}} (3 days from now). Renew soon to avoid interruption.'),
  ('expiry_reminder_1', 'Expiry reminder — 1 day', '["member_name","plan_name","end_date","gym_name"]'::jsonb,
   'Hi {{member_name}}, your {{plan_name}} membership at {{gym_name}} expires tomorrow ({{end_date}}). Renew today to avoid interruption.'),
  ('expired', 'Subscription expired', '["member_name","plan_name","end_date","gym_name"]'::jsonb,
   'Hi {{member_name}}, your {{plan_name}} membership at {{gym_name}} expired on {{end_date}}. Renew now to continue enjoying our services.'),
  ('custom', 'Custom notification', '["message"]'::jsonb, '{{message}}')
on conflict (key) do nothing;

alter table whatsapp_templates enable row level security;

-- 5. Extend member_notifications into the full delivery log ------------------------------------
-- member_id (recipient), message, status, sent_at, created_by already exist from 0002 and were
-- never populated by anything — this module is the first real writer.

alter table member_notifications add column if not exists notification_type text;
alter table member_notifications add column if not exists template_key text;
alter table member_notifications add column if not exists recipient_number text;
alter table member_notifications add column if not exists provider_message_id text;
alter table member_notifications add column if not exists error_message text;
alter table member_notifications add column if not exists trigger_source text check (trigger_source in ('staff', 'automation'));
alter table member_notifications add column if not exists subscription_id uuid references member_subscriptions(id) on delete set null;
alter table member_notifications add column if not exists invoice_id uuid references invoices(id) on delete set null;
alter table member_notifications add column if not exists updated_at timestamptz not null default now();

create index if not exists member_notifications_subscription_type_idx on member_notifications (subscription_id, notification_type);
create index if not exists member_notifications_status_idx on member_notifications (status);
create index if not exists member_notifications_provider_message_id_idx on member_notifications (provider_message_id);
