"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { checkMobileExists, createEnquiry, type FormState } from "@/app/(admin)/enquiries/actions";
import { ENQUIRY_SOURCES, ENQUIRY_STATUSES, GENDERS, WORKOUT_TIMES, calculateAge } from "@/lib/enquiries/types";

const initialState: FormState = {};
const today = new Date().toISOString().slice(0, 10);

export default function NewEnquiryPage() {
  const [state, formAction, pending] = useActionState(createEnquiry, initialState);
  const [dob, setDob] = useState("");
  const [duplicate, setDuplicate] = useState<{ id: string; full_name: string } | null>(null);

  const age = calculateAge(dob || null);
  const errors = state.fieldErrors ?? {};

  async function onMobileBlur(event: React.FocusEvent<HTMLInputElement>) {
    const value = event.target.value.trim();
    if (!value) {
      setDuplicate(null);
      return;
    }
    const match = await checkMobileExists(value);
    setDuplicate(match);
  }

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex items-center gap-3">
        <Link className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white" href="/enquiries">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">Enquiries</p>
          <h1 className="font-display mt-1 text-2xl font-black tracking-[-0.05em] sm:text-3xl">Add enquiry</h1>
        </div>
      </div>

      <form action={formAction} className="mt-8 max-w-3xl rounded-3xl border border-[#e5e9e5] bg-white p-6 shadow-[0_12px_45px_rgba(17,28,25,.045)] sm:p-8">
        {state.error && (
          <div className="mb-6 rounded-xl bg-[#ffe5dc] px-4 py-3 text-sm font-bold text-[#a94f37]">{state.error}</div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field error={errors.full_name} label="Full name" required>
            <input className={inputClass} name="full_name" required type="text" />
          </Field>

          <Field error={errors.mobile_number} hint={duplicate ? undefined : "10-digit mobile number"} label="Mobile number" required>
            <input className={inputClass} name="mobile_number" onBlur={onMobileBlur} required type="tel" />
            {duplicate && (
              <p className="mt-1.5 text-xs font-bold text-[#a94f37]">
                Already enquired as <Link className="underline" href={`/enquiries/${duplicate.id}`}>{duplicate.full_name}</Link> — you can still save this.
              </p>
            )}
          </Field>

          <Field label="WhatsApp number">
            <input className={inputClass} name="whatsapp_number" type="tel" />
          </Field>

          <Field label="Gender">
            <select className={inputClass} defaultValue="" name="gender">
              <option value="">Select</option>
              {GENDERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>

          <Field hint={age !== null ? `Age: ${age}` : undefined} label="Date of birth">
            <input className={inputClass} name="date_of_birth" onChange={(event) => setDob(event.target.value)} type="date" value={dob} />
          </Field>

          <Field error={errors.source} label="Source of enquiry" required>
            <select className={inputClass} defaultValue="" name="source" required>
              <option disabled value="">Select</option>
              {ENQUIRY_SOURCES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>

          <Field className="sm:col-span-2" label="Address">
            <textarea className={inputClass} name="address" rows={2} />
          </Field>

          <Field label="Fitness goal">
            <input className={inputClass} name="fitness_goal" type="text" />
          </Field>

          <Field label="Interested plan">
            <input className={inputClass} list="plan-suggestions" name="interested_plan" type="text" />
            <datalist id="plan-suggestions">
              <option value="Monthly" />
              <option value="Quarterly" />
              <option value="Half-Yearly" />
              <option value="Annual" />
              <option value="Personal Training" />
              <option value="Group Classes" />
            </datalist>
          </Field>

          <Field label="Preferred workout time">
            <select className={inputClass} defaultValue="" name="preferred_workout_time">
              <option value="">Select</option>
              {WORKOUT_TIMES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Assigned staff">
            <input className={inputClass} name="assigned_staff" type="text" />
          </Field>

          <Field label="Enquiry date">
            <input className={inputClass} defaultValue={today} name="enquiry_date" type="date" />
          </Field>

          <Field label="Follow-up date">
            <input className={inputClass} name="follow_up_date" type="date" />
          </Field>

          <Field label="Status">
            <select className={inputClass} defaultValue="new" name="status">
              {ENQUIRY_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>

          <Field className="sm:col-span-2" label="Notes">
            <textarea className={inputClass} name="notes" rows={3} />
          </Field>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button className="inline-flex items-center justify-center rounded-xl bg-[#111c19] px-6 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15 disabled:opacity-60" disabled={pending} type="submit">
            {pending ? "Saving…" : "Save enquiry"}
          </button>
          <Link className="text-sm font-bold text-[#6c7773]" href="/enquiries">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5 text-sm font-medium text-[#0f1816] outline-none transition focus:border-[#111c19] focus:bg-white";

function Field({ label, children, required, error, hint, className }: { label: string; children: React.ReactNode; required?: boolean; error?: string; hint?: string; className?: string }) {
  return (
    <label className={`block text-xs font-extrabold text-[#3a4542] ${className ?? ""}`}>
      {label} {required && <span className="text-[#ff7d5c]">*</span>}
      <div className="mt-1.5 font-normal normal-case">{children}</div>
      {hint && !error && <p className="mt-1.5 text-xs font-medium text-[#89938f]">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-bold text-[#a94f37]">{error}</p>}
    </label>
  );
}
