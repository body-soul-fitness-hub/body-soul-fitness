"use client";

import { useActionState, useState, useTransition } from "react";
import { checkTemplateStatusAction, updateWhatsAppSettings, type FormState } from "./actions";
import { TEMPLATE_APPROVAL_STATUSES, type WhatsAppSettings, type WhatsAppTemplate } from "@/lib/whatsapp/types";

const initialState: FormState = {};
const inputClass = "w-full rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5 text-sm font-medium text-[#0f1816] outline-none transition focus:border-[#111c19] focus:bg-white";
const checkboxRowClass = "flex items-center gap-2.5 rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-3";

function approvalTone(status: string): string {
  switch (status) {
    case "approved":
      return "bg-[#e7f7c5] text-[#4f6d1e]";
    case "pending":
      return "bg-[#ffe9c7] text-[#8a5a12]";
    case "rejected":
      return "bg-[#ffe5dc] text-[#a94f37]";
    default:
      return "bg-[#e4efea] text-[#27463b]";
  }
}

export function WhatsAppSettingsForm({ settings, templates }: { settings: WhatsAppSettings; templates: WhatsAppTemplate[] }) {
  const [state, formAction, pending] = useActionState(updateWhatsAppSettings, initialState);
  const [testMode, setTestMode] = useState(settings.test_mode);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mt-6 max-w-3xl space-y-6">
      {state.success && <div className="rounded-xl bg-[#e7f7c5] px-4 py-3 text-sm font-bold text-[#4f6d1e]">WhatsApp settings saved.</div>}
      {state.error && <div className="rounded-xl bg-[#ffe5dc] px-4 py-3 text-sm font-bold text-[#a94f37]">{state.error}</div>}

      <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6 sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Provider</p>
        <p className="mt-1 text-xs font-medium text-[#89938f]">Meta WhatsApp Cloud API — Business Manager → WhatsApp → API Setup.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Business phone number">
            <input className={inputClass} defaultValue={settings.business_phone_number ?? ""} name="business_phone_number" placeholder="+91XXXXXXXXXX" type="text" />
          </Field>
          <Field label="Graph API version">
            <input className={inputClass} defaultValue={settings.graph_api_version} name="graph_api_version" type="text" />
          </Field>
          <Field label="Phone number ID">
            <input className={inputClass} defaultValue={settings.phone_number_id ?? ""} name="phone_number_id" type="text" />
          </Field>
          <Field label="Business account ID (WABA)">
            <input className={inputClass} defaultValue={settings.business_account_id ?? ""} name="business_account_id" type="text" />
          </Field>
          <Field
            className="sm:col-span-2"
            hint={
              settings.access_token_last4
                ? `Configured — •••• ${settings.access_token_last4}${settings.access_token_updated_at ? ` · updated ${new Date(settings.access_token_updated_at).toLocaleDateString()}` : ""}. Leave blank to keep it unchanged.`
                : "Not configured yet — nothing will send until this is set."
            }
            label="Access token"
          >
            <input autoComplete="off" className={inputClass} name="access_token" placeholder={settings.access_token_last4 ? "•••••••••• (leave blank to keep)" : "Paste permanent access token"} type="password" />
          </Field>
        </div>
      </section>

      <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6 sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Test mode</p>
        <p className="mt-1 text-xs font-medium text-[#89938f]">Real API calls still happen, but every message is redirected to this number so staff can verify templates without messaging real members.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <label className={checkboxRowClass}>
            <input checked={testMode} className="size-4" name="test_mode" onChange={(event) => setTestMode(event.target.checked)} type="checkbox" />
            <span className="text-sm font-bold">Test mode enabled</span>
          </label>
          <Field error={errors.test_recipient_number} label="Test recipient number">
            <input className={inputClass} defaultValue={settings.test_recipient_number ?? ""} name="test_recipient_number" placeholder="+91XXXXXXXXXX" type="text" />
          </Field>
        </div>
      </section>

      <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6 sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Automations</p>
        <p className="mt-1 text-xs font-medium text-[#89938f]">Turn each notification type on or off independently.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className={checkboxRowClass}>
            <input defaultChecked={settings.bill_generated_enabled} className="size-4" name="bill_generated_enabled" type="checkbox" />
            <span className="text-sm font-bold">Bill generated</span>
          </label>
          <label className={checkboxRowClass}>
            <input defaultChecked={settings.expiry_reminders_enabled} className="size-4" name="expiry_reminders_enabled" type="checkbox" />
            <span className="text-sm font-bold">Expiry reminders (7 / 3 / 1 day)</span>
          </label>
          <label className={checkboxRowClass}>
            <input defaultChecked={settings.expired_notice_enabled} className="size-4" name="expired_notice_enabled" type="checkbox" />
            <span className="text-sm font-bold">Expired subscription notice</span>
          </label>
          <label className={checkboxRowClass}>
            <input defaultChecked={settings.custom_notifications_enabled} className="size-4" name="custom_notifications_enabled" type="checkbox" />
            <span className="text-sm font-bold">Custom notifications</span>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6 sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Message templates</p>
        <p className="mt-1 text-xs font-medium text-[#89938f]">
          Register the exact name/language of the template you created and got approved in Meta Business Manager for each notification type.
        </p>
        <div className="mt-4 space-y-5">
          {templates.map((template) => (
            <TemplateRow key={template.key} template={template} />
          ))}
        </div>
      </section>

      <div>
        <button className="inline-flex items-center justify-center rounded-xl bg-[#111c19] px-6 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15 disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving…" : "Save WhatsApp settings"}
        </button>
      </div>
    </form>
  );
}

function TemplateRow({ template }: { template: WhatsAppTemplate }) {
  const [status, setStatus] = useState(template.meta_approval_status);
  const [checking, startChecking] = useTransition();
  const [checkError, setCheckError] = useState<string | null>(null);

  function handleCheckStatus() {
    setCheckError(null);
    startChecking(async () => {
      const result = await checkTemplateStatusAction(template.key);
      if (result.ok && result.status) setStatus(result.status as typeof status);
      else setCheckError(result.errorMessage ?? "Could not check status.");
    });
  }

  return (
    <div className="rounded-2xl border border-[#f0f2f0] bg-[#f9faf8] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold">{template.label}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${approvalTone(status)}`}>
          {TEMPLATE_APPROVAL_STATUSES.find((s) => s.value === status)?.label ?? status}
        </span>
      </div>
      <p className="mt-1 text-[11px] font-medium text-[#89938f]">Variables: {template.variables.map((v) => `{{${v}}}`).join(", ")}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
        <Field label="Meta template name">
          <input className={inputClass} defaultValue={template.meta_template_name ?? ""} name={`template_meta_name__${template.key}`} type="text" />
        </Field>
        <Field label="Language code">
          <input className={inputClass} defaultValue={template.meta_template_language} name={`template_meta_language__${template.key}`} type="text" />
        </Field>
      </div>
      <div className="mt-3">
        <Field hint="Reference only — must match what's actually approved in Meta Business Manager." label="Body preview">
          <textarea className={inputClass} defaultValue={template.body_preview} name={`template_body__${template.key}`} rows={2} />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <input defaultChecked={template.enabled} className="size-4" name={`template_enabled__${template.key}`} type="checkbox" />
          <span className="text-xs font-bold">Enabled</span>
        </label>
        <button className="rounded-lg border border-[#e5e9e5] bg-white px-3 py-1.5 text-xs font-extrabold text-[#0f1816] disabled:opacity-60" disabled={checking} onClick={handleCheckStatus} type="button">
          {checking ? "Checking…" : "Check status with Meta"}
        </button>
        {checkError && <span className="text-xs font-bold text-[#a94f37]">{checkError}</span>}
      </div>
    </div>
  );
}

function Field({ label, children, error, hint, className }: { label: string; children: React.ReactNode; error?: string; hint?: string; className?: string }) {
  return (
    <label className={`block text-xs font-extrabold text-[#3a4542] ${className ?? ""}`}>
      {label}
      <div className="mt-1.5 font-normal normal-case">{children}</div>
      {hint && !error && <p className="mt-1.5 text-xs font-medium text-[#89938f]">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-bold text-[#a94f37]">{error}</p>}
    </label>
  );
}
