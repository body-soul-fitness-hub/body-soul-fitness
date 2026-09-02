-- Adds the first scheduled marketing-style campaign to the shared WhatsApp notification
-- pipeline. It retains the same consent, opt-out, template approval, test-mode and log rules.

alter table whatsapp_settings add column if not exists birthday_messages_enabled boolean not null default true;

alter table whatsapp_templates drop constraint if exists whatsapp_templates_key_check;
alter table whatsapp_templates add constraint whatsapp_templates_key_check check (key in ('bill_generated', 'expiry_reminder_7', 'expiry_reminder_3', 'expiry_reminder_1', 'expired', 'birthday', 'custom'));

insert into whatsapp_templates (key, label, variables, body_preview) values
  ('birthday', 'Birthday greeting', '["member_name","gym_name"]'::jsonb,
   'Happy Birthday, {{member_name}}! Everyone at {{gym_name}} wishes you a wonderful year ahead. Stay healthy and strong!')
on conflict (key) do nothing;
