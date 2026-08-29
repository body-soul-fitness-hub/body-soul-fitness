"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addMemberNote, changeMemberStatus, type FormState } from "@/app/(admin)/members/actions";
import { MEMBER_STATUSES, type MemberStatus } from "@/lib/members/types";

const initialState: FormState = {};
const inputClass = "w-full rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5 text-sm font-medium text-[#0f1816] outline-none transition focus:border-[#111c19] focus:bg-white";

export function StatusChangeForm({ memberRowId, currentStatus }: { memberRowId: string; currentStatus: MemberStatus }) {
  const [state, formAction, pending] = useActionState(changeMemberStatus, initialState);
  const [newStatus, setNewStatus] = useState<MemberStatus>(currentStatus);
  const isSameStatus = newStatus === currentStatus;

  return (
    <form action={formAction} className="space-y-3">
      <input name="member_row_id" type="hidden" value={memberRowId} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-extrabold text-[#3a4542]">
          New status
          <select
            className={`${inputClass} mt-1.5`}
            name="new_status"
            onChange={(event) => setNewStatus(event.target.value as MemberStatus)}
            value={newStatus}
          >
            {MEMBER_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-extrabold text-[#3a4542]">
          Changed by
          <input className={`${inputClass} mt-1.5`} name="changed_by" placeholder="Staff name" type="text" />
        </label>
      </div>
      <label className="block text-xs font-extrabold text-[#3a4542]">
        Reason <span className="text-[#ff7d5c]">*</span>
        <textarea className={`${inputClass} mt-1.5`} disabled={isSameStatus} name="reason" placeholder="Why is this member's status changing?" required={!isSameStatus} rows={2} />
      </label>
      <button
        className="rounded-xl bg-[#111c19] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-60"
        disabled={pending || isSameStatus}
        type="submit"
      >
        {pending ? "Saving…" : "Update status"}
      </button>
      {state.error && <p className="text-xs font-bold text-[#a94f37]">{state.error}</p>}
    </form>
  );
}

export function NoteForm({ memberRowId }: { memberRowId: string }) {
  const [state, formAction, pending] = useActionState(addMemberNote, initialState);
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
      <input name="member_row_id" type="hidden" value={memberRowId} />
      <label className="block text-xs font-extrabold text-[#3a4542]">
        Note
        <textarea className={`${inputClass} mt-1.5`} name="note" placeholder="Add an internal note…" rows={3} />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-extrabold text-[#3a4542]">
          Added by
          <input className={`${inputClass} mt-1.5`} name="created_by" placeholder="Staff name" type="text" />
        </label>
        <button className="rounded-xl bg-[#111c19] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving…" : "Add note"}
        </button>
      </div>
      {state.error && <p className="text-xs font-bold text-[#a94f37]">{state.error}</p>}
    </form>
  );
}
