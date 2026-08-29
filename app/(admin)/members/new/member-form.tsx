"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createMember } from "@/app/(admin)/members/actions";
import type { FormState } from "@/app/(admin)/enquiries/actions";
import { GENDERS, WORKOUT_TIMES, type Enquiry } from "@/lib/enquiries/types";

const initialState: FormState = {};
const today = new Date().toISOString().slice(0, 10);
const inputClass = "w-full rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5 text-sm font-medium text-[#0f1816] outline-none transition focus:border-[#111c19] focus:bg-white";

export function MemberForm({ enquiry }: { enquiry: Enquiry | null }) {
  const [state, formAction, pending] = useActionState(createMember, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mt-8 max-w-3xl rounded-3xl border border-[#e5e9e5] bg-white p-6 shadow-[0_12px_45px_rgba(17,28,25,.045)] sm:p-8">
      {enquiry && <input name="enquiry_id" type="hidden" value={enquiry.id} />}

      {state.error && (
        <div className="mb-6 rounded-xl bg-[#ffe5dc] px-4 py-3 text-sm font-bold text-[#a94f37]">{state.error}</div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={errors.full_name} label="Full name" required>
          <input className={inputClass} defaultValue={enquiry?.full_name ?? ""} name="full_name" required type="text" />
        </Field>

        <Field error={errors.mobile_number} label="Mobile number" required>
          <input className={inputClass} defaultValue={enquiry?.mobile_number ?? ""} name="mobile_number" required type="tel" />
        </Field>

        <Field label="WhatsApp number">
          <input className={inputClass} defaultValue={enquiry?.whatsapp_number ?? ""} name="whatsapp_number" type="tel" />
        </Field>

        <Field label="Gender">
          <select className={inputClass} defaultValue={enquiry?.gender ?? ""} name="gender">
            <option value="">Select</option>
            {GENDERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Date of birth">
          <input className={inputClass} defaultValue={enquiry?.date_of_birth ?? ""} name="date_of_birth" type="date" />
        </Field>

        <Field label="Join date">
          <input className={inputClass} defaultValue={today} name="join_date" type="date" />
        </Field>

        <Field className="sm:col-span-2" label="Address">
          <textarea className={inputClass} defaultValue={enquiry?.address ?? ""} name="address" rows={2} />
        </Field>

        <Field label="Fitness goal">
          <input className={inputClass} defaultValue={enquiry?.fitness_goal ?? ""} name="fitness_goal" type="text" />
        </Field>

        <Field label="Plan">
          <input className={inputClass} defaultValue={enquiry?.interested_plan ?? ""} name="plan" type="text" />
        </Field>

        <Field label="Preferred workout time">
          <select className={inputClass} defaultValue={enquiry?.preferred_workout_time ?? ""} name="preferred_workout_time">
            <option value="">Select</option>
            {WORKOUT_TIMES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Assigned staff">
          <input className={inputClass} defaultValue={enquiry?.assigned_staff ?? ""} name="assigned_staff" type="text" />
        </Field>

        <Field className="sm:col-span-2" label="Notes">
          <textarea className={inputClass} defaultValue={enquiry?.notes ?? ""} name="notes" rows={3} />
        </Field>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button className="inline-flex items-center justify-center rounded-xl bg-[#111c19] px-6 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15 disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving…" : "Save member"}
        </button>
        <Link className="text-sm font-bold text-[#6c7773]" href={enquiry ? `/enquiries/${enquiry.id}` : "/enquiries"}>Cancel</Link>
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
