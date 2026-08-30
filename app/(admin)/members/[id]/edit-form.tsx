"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { checkMobileExists, updateMember, type FormState } from "@/app/(admin)/members/actions";
import { GENDERS, WORKOUT_TIMES, calculateAge } from "@/lib/enquiries/types";
import type { Member } from "@/lib/members/types";

const initialState: FormState = {};
const inputClass = "w-full rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5 text-sm font-medium text-[#0f1816] outline-none transition focus:border-[#111c19] focus:bg-white";
const readOnlyClass = "w-full rounded-xl border border-[#e5e9e5] bg-[#f0f2f0] px-3.5 py-2.5 text-sm font-bold text-[#6c7773]";

export function MemberEditForm({ member, photoUrl }: { member: Member; photoUrl: string | null }) {
  const [state, formAction, pending] = useActionState(updateMember, initialState);
  const [dob, setDob] = useState(member.date_of_birth ?? "");
  const [duplicate, setDuplicate] = useState<{ id: string; member_id: string; full_name: string } | null>(state.duplicate ?? null);
  const errors = state.fieldErrors ?? {};
  const age = calculateAge(dob || null);

  async function onMobileBlur(event: React.FocusEvent<HTMLInputElement>) {
    const value = event.target.value.trim();
    if (!value || value === member.mobile_number) {
      setDuplicate(null);
      return;
    }
    const match = await checkMobileExists(value, member.id);
    setDuplicate(match);
  }

  return (
    <form action={formAction} className="mt-8 max-w-3xl rounded-3xl border border-[#e5e9e5] bg-white p-6 shadow-[0_12px_45px_rgba(17,28,25,.045)] sm:p-8" encType="multipart/form-data">
      <input name="member_row_id" type="hidden" value={member.id} />

      {state.error && (
        <div className="mb-6 rounded-xl bg-[#ffe5dc] px-4 py-3 text-sm font-bold text-[#a94f37]">{state.error}</div>
      )}

      <SectionTitle>Personal information</SectionTitle>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Field label="Member ID">
          <input className={readOnlyClass} disabled value={member.member_id} />
        </Field>

        <Field error={errors.full_name} label="Full name" required>
          <input className={inputClass} defaultValue={member.full_name} name="full_name" required type="text" />
        </Field>

        <Field error={errors.mobile_number} label="Mobile number" required>
          <input className={inputClass} defaultValue={member.mobile_number} name="mobile_number" onBlur={onMobileBlur} required type="tel" />
          {duplicate && (
            <p className="mt-1.5 text-xs font-bold text-[#a94f37]">
              Already used by <Link className="underline" href={`/members/${duplicate.id}`}>{duplicate.member_id} · {duplicate.full_name}</Link>.
            </p>
          )}
        </Field>

        <Field label="WhatsApp number">
          <input className={inputClass} defaultValue={member.whatsapp_number ?? ""} name="whatsapp_number" type="tel" />
        </Field>

        <Field className="sm:col-span-2" label="WhatsApp messaging">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <label className="flex items-center gap-2 text-sm font-medium normal-case text-[#0f1816]">
              <input className="size-4" defaultChecked={member.whatsapp_consent} name="whatsapp_consent" type="checkbox" />
              Member has consented to WhatsApp messages
            </label>
            <label className="flex items-center gap-2 text-sm font-medium normal-case text-[#0f1816]">
              <input className="size-4" defaultChecked={member.whatsapp_promotional_opt_out} name="whatsapp_promotional_opt_out" type="checkbox" />
              Opted out of promotional messages
            </label>
          </div>
        </Field>

        <Field label="Email">
          <input className={inputClass} defaultValue={member.email ?? ""} name="email" type="email" />
        </Field>

        <Field label="Gender">
          <select className={inputClass} defaultValue={member.gender ?? ""} name="gender">
            <option value="">Select</option>
            {GENDERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>

        <Field hint={age !== null ? `Age: ${age}` : undefined} label="Date of birth">
          <input className={inputClass} onChange={(event) => setDob(event.target.value)} name="date_of_birth" type="date" value={dob} />
        </Field>

        <Field className="sm:col-span-2" label="Address">
          <textarea className={inputClass} defaultValue={member.address ?? ""} name="address" rows={2} />
        </Field>

        <Field label={photoUrl ? "Replace photo" : "Photo"}>
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={member.full_name} className="mb-2 size-16 rounded-xl border border-[#e5e9e5] object-cover" src={photoUrl} />
          )}
          <input accept="image/*" className={`${inputClass} py-2`} name="photo" type="file" />
        </Field>
      </div>

      <SectionTitle className="mt-8">Emergency contact</SectionTitle>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Field label="Emergency contact name">
          <input className={inputClass} defaultValue={member.emergency_contact_name ?? ""} name="emergency_contact_name" type="text" />
        </Field>
        <Field label="Emergency contact number">
          <input className={inputClass} defaultValue={member.emergency_contact_number ?? ""} name="emergency_contact_number" type="tel" />
        </Field>
      </div>

      <SectionTitle className="mt-8">Membership details</SectionTitle>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Field label="Joining date">
          <input className={inputClass} defaultValue={member.join_date} name="join_date" type="date" />
        </Field>

        <Field label="Plan">
          <input className={inputClass} defaultValue={member.plan ?? ""} name="plan" type="text" />
        </Field>

        <Field label="Fitness goal">
          <input className={inputClass} defaultValue={member.fitness_goal ?? ""} name="fitness_goal" type="text" />
        </Field>

        <Field label="Preferred workout time">
          <select className={inputClass} defaultValue={member.preferred_workout_time ?? ""} name="preferred_workout_time">
            <option value="">Select</option>
            {WORKOUT_TIMES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Referred by">
          <input className={inputClass} defaultValue={member.referred_by ?? ""} name="referred_by" type="text" />
        </Field>

        <Field label="Assigned trainer">
          <input className={inputClass} defaultValue={member.assigned_trainer ?? ""} name="assigned_trainer" type="text" />
        </Field>

        <Field label="Assigned staff">
          <input className={inputClass} defaultValue={member.assigned_staff ?? ""} name="assigned_staff" type="text" />
        </Field>
      </div>

      <SectionTitle className="mt-8">Medical notes / health declaration</SectionTitle>
      <div className="mt-4">
        <Field label="Any medical conditions, injuries, or health notes the trainer should know about">
          <textarea className={inputClass} defaultValue={member.medical_notes ?? ""} name="medical_notes" rows={3} />
        </Field>
      </div>

      <SectionTitle className="mt-8">Notes</SectionTitle>
      <div className="mt-4">
        <Field label="Internal notes">
          <textarea className={inputClass} defaultValue={member.notes ?? ""} name="notes" rows={3} />
        </Field>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button className="inline-flex items-center justify-center rounded-xl bg-[#111c19] px-6 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15 disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving…" : "Save changes"}
        </button>
        <Link className="text-sm font-bold text-[#6c7773]" href={`/members/${member.id}`}>Cancel</Link>
      </div>
    </form>
  );
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f] ${className ?? ""}`}>{children}</p>;
}

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
