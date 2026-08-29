"use client";

import { useActionState, useEffect, useRef } from "react";
import { addFollowUpActivity, updateEnquiryStatus, type FormState } from "@/app/(admin)/enquiries/actions";
import { ENQUIRY_STATUSES, type EnquiryStatus } from "@/lib/enquiries/types";

const initialState: FormState = {};
const inputClass = "w-full rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5 text-sm font-medium text-[#0f1816] outline-none transition focus:border-[#111c19] focus:bg-white";

export function StatusForm({ enquiryId, currentStatus }: { enquiryId: string; currentStatus: EnquiryStatus }) {
  const [state, formAction, pending] = useActionState(updateEnquiryStatus, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input name="enquiry_id" type="hidden" value={enquiryId} />
      <label className="block text-xs font-extrabold text-[#3a4542]">
        Status
        <select className={`${inputClass} mt-1.5`} defaultValue={currentStatus} name="status">
          {ENQUIRY_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-extrabold text-[#3a4542]">
        Updated by
        <input className={`${inputClass} mt-1.5`} name="staff_member" placeholder="Staff name" type="text" />
      </label>
      <button className="rounded-xl bg-[#111c19] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Saving…" : "Update status"}
      </button>
      {state.error && <p className="w-full text-xs font-bold text-[#a94f37]">{state.error}</p>}
    </form>
  );
}

export function FollowUpForm({ enquiryId }: { enquiryId: string }) {
  const [state, formAction, pending] = useActionState(addFollowUpActivity, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form action={formAction} className="space-y-3" ref={formRef}>
      <input name="enquiry_id" type="hidden" value={enquiryId} />
      <label className="block text-xs font-extrabold text-[#3a4542]">
        Note
        <textarea className={`${inputClass} mt-1.5`} name="note" placeholder="Call summary, what was discussed, next steps…" rows={3} />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-extrabold text-[#3a4542]">
          Next follow-up date
          <input className={`${inputClass} mt-1.5`} name="next_follow_up_date" type="date" />
        </label>
        <label className="block text-xs font-extrabold text-[#3a4542]">
          Staff member
          <input className={`${inputClass} mt-1.5`} name="staff_member" placeholder="Staff name" type="text" />
        </label>
        <button className="rounded-xl bg-[#111c19] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving…" : "Add to timeline"}
        </button>
      </div>
      {state.error && <p className="text-xs font-bold text-[#a94f37]">{state.error}</p>}
    </form>
  );
}
