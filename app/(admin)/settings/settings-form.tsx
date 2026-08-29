"use client";

import { useActionState } from "react";
import { updateGymSettings, type FormState } from "./actions";
import type { GymSettings } from "@/lib/settings/types";

const initialState: FormState = {};
const inputClass = "w-full rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5 text-sm font-medium text-[#0f1816] outline-none transition focus:border-[#111c19] focus:bg-white";

export function SettingsForm({ settings }: { settings: GymSettings }) {
  const [state, formAction, pending] = useActionState(updateGymSettings, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-2xl rounded-3xl border border-[#e5e9e5] bg-white p-6 shadow-[0_12px_45px_rgba(17,28,25,.045)] sm:p-8">
      {state.success && <div className="mb-6 rounded-xl bg-[#e7f7c5] px-4 py-3 text-sm font-bold text-[#4f6d1e]">Settings saved.</div>}
      {state.error && <div className="mb-6 rounded-xl bg-[#ffe5dc] px-4 py-3 text-sm font-bold text-[#a94f37]">{state.error}</div>}

      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Gym identity</p>
      <div className="mt-4 grid gap-5">
        <Field label="Gym name" required>
          <input className={inputClass} defaultValue={settings.gym_name} name="gym_name" required type="text" />
        </Field>
      </div>

      <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Contact details</p>
      <p className="mt-1 text-xs font-medium text-[#89938f]">Printed on every invoice / receipt.</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Address">
          <textarea className={inputClass} defaultValue={settings.address ?? ""} name="address" rows={2} />
        </Field>
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
      </div>

      <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Tax</p>
      <p className="mt-1 text-xs font-medium text-[#89938f]">Leave the rate at 0 to leave tax off every invoice.</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Field label="Tax label">
          <input className={inputClass} defaultValue={settings.tax_label} name="tax_label" type="text" />
        </Field>
        <Field error={state.fieldErrors?.tax_rate} label="Tax rate (%)">
          <input className={inputClass} defaultValue={settings.tax_rate} max={100} min={0} name="tax_rate" step="0.01" type="number" />
        </Field>
      </div>

      <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Receipt</p>
      <div className="mt-4">
        <Field label="Thank-you message">
          <textarea className={inputClass} defaultValue={settings.thank_you_message} name="thank_you_message" rows={2} />
        </Field>
      </div>

      <div className="mt-8">
        <button className="inline-flex items-center justify-center rounded-xl bg-[#111c19] px-6 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15 disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, required, error, className }: { label: string; children: React.ReactNode; required?: boolean; error?: string; className?: string }) {
  return (
    <label className={`block text-xs font-extrabold text-[#3a4542] ${className ?? ""}`}>
      {label} {required && <span className="text-[#ff7d5c]">*</span>}
      <div className="mt-1.5 font-normal normal-case">{children}</div>
      {error && <p className="mt-1.5 text-xs font-bold text-[#a94f37]">{error}</p>}
    </label>
  );
}
