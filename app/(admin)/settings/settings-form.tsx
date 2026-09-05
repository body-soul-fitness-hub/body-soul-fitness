"use client";

import { useActionState } from "react";
import { updateGymSettings, type FormState } from "./actions";
import type { GymSettings } from "@/lib/settings/types";

const initialState: FormState = {};
const inputClass = "w-full rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5 text-sm font-medium text-[#0f1816] outline-none transition focus:border-[#111c19] focus:bg-white";

export function SettingsForm({ settings }: { settings: GymSettings }) {
  const [state, formAction, pending] = useActionState(updateGymSettings, initialState);

  return (
    <form action={formAction} className="mt-6 rounded-3xl border border-[#e5e9e5] bg-white p-5 shadow-[0_12px_45px_rgba(17,28,25,.045)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e5e9e5] pb-5">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Business settings</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#10274d]">Profile, contact & receipts</h2>
          <p className="mt-1 text-xs font-medium text-[#89938f]">Used on customer invoices and receipts.</p>
        </div>
        <button className="inline-flex items-center justify-center rounded-xl bg-[#111c19] px-5 py-2.5 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15 disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
      {state.success && <div className="mt-5 rounded-xl bg-[#e7f7c5] px-4 py-3 text-sm font-bold text-[#4f6d1e]">Settings saved.</div>}
      {state.error && <div className="mt-5 rounded-xl bg-[#ffe5dc] px-4 py-3 text-sm font-bold text-[#a94f37]">{state.error}</div>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
        <section className="rounded-2xl border border-[#e5e9e5] p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Business profile</p>
          <div className="mt-4 grid gap-4">
            <Field label="Gym name" required>
              <input className={inputClass} defaultValue={settings.gym_name} name="gym_name" required type="text" />
            </Field>
            <Field error={state.fieldErrors?.logo_url} label="Logo URL" hint="Shown on branded receipts.">
              <input className={inputClass} defaultValue={settings.logo_url ?? ""} name="logo_url" type="url" placeholder="https://..." />
            </Field>
            <Field label="Address">
              <textarea className={inputClass} defaultValue={settings.address ?? ""} name="address" rows={2} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e5e9e5] p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Contact & tax</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <input className={inputClass} defaultValue={settings.phone ?? ""} name="phone" type="text" />
            </Field>
            <Field label="Email">
              <input className={inputClass} defaultValue={settings.email ?? ""} name="email" type="email" />
            </Field>
            <Field label="Website">
              <input className={inputClass} defaultValue={settings.website ?? ""} name="website" type="text" />
            </Field>
            <Field label="GSTIN / Tax ID">
              <input className={inputClass} defaultValue={settings.gstin ?? ""} name="gstin" type="text" />
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Tax</p>
              <p className="mb-3 text-xs font-medium text-[#89938f]">Leave the rate at 0 to leave tax off every invoice.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tax label">
                  <input className={inputClass} defaultValue={settings.tax_label} name="tax_label" type="text" />
                </Field>
                <Field error={state.fieldErrors?.tax_rate} label="Tax rate (%)">
                  <input className={inputClass} defaultValue={settings.tax_rate} max={100} min={0} name="tax_rate" step="0.01" type="number" />
                </Field>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e5e9e5] p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Receipt</p>
          <div className="mt-4 grid gap-4">
        <Field error={state.fieldErrors?.invoice_number_format} label="Invoice number format" hint="Use {YYYY} and required {NUMBER:6}.">
          <input className={inputClass} defaultValue={settings.invoice_number_format ?? "INV-{YYYY}-{NUMBER:6}"} name="invoice_number_format" type="text" />
        </Field>
        <Field label="Expiry reminder schedule" hint="Days before expiry, comma-separated.">
          <input className={inputClass} defaultValue={(settings.expiry_reminder_days ?? [7, 3, 1]).join(", ")} name="expiry_reminder_days" inputMode="numeric" type="text" />
        </Field>
        <Field label="Thank-you message">
          <textarea className={inputClass} defaultValue={settings.thank_you_message} name="thank_you_message" rows={2} />
        </Field>
          </div>
        </section>
      </div>
    </form>
  );
}

function Field({ label, children, required, error, className, hint }: { label: string; children: React.ReactNode; required?: boolean; error?: string; className?: string; hint?: string }) {
  return (
    <label className={`block text-xs font-extrabold text-[#3a4542] ${className ?? ""}`}>
      {label} {required && <span className="text-[#ff7d5c]">*</span>}
      <div className="mt-1.5 font-normal normal-case">{children}</div>
      {hint && <p className="mt-1 text-xs font-medium normal-case text-[#89938f]">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-bold text-[#a94f37]">{error}</p>}
    </label>
  );
}
