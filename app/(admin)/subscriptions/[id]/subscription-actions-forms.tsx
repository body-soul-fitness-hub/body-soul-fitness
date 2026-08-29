"use client";

import { useActionState } from "react";
import {
  cancelSubscription,
  extendSubscription,
  freezeSubscription,
  recordSubscriptionPayment,
  unfreezeSubscription,
  type FormState,
} from "@/app/(admin)/subscriptions/actions";
import { PAYMENT_MODES } from "@/lib/subscriptions/types";

const initialState: FormState = {};
const inputClass = "w-full rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5 text-sm font-medium text-[#0f1816] outline-none transition focus:border-[#111c19] focus:bg-white";
const buttonClass = "rounded-xl bg-[#111c19] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-60";

export function ExtendForm({ subscriptionId }: { subscriptionId: string }) {
  const [state, formAction, pending] = useActionState(extendSubscription, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <input name="subscription_id" type="hidden" value={subscriptionId} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-extrabold text-[#3a4542]">
          Extend by (days)
          <input className={`${inputClass} mt-1.5 w-28`} min={1} name="extend_days" required type="number" />
        </label>
        <label className="block text-xs font-extrabold text-[#3a4542]">
          Staff name
          <input className={`${inputClass} mt-1.5`} name="performed_by" placeholder="Recorded by" type="text" />
        </label>
        <button className={buttonClass} disabled={pending} type="submit">{pending ? "Saving…" : "Extend"}</button>
      </div>
      {state.fieldErrors?.extend_days && <p className="text-xs font-bold text-[#a94f37]">{state.fieldErrors.extend_days}</p>}
      {state.error && <p className="text-xs font-bold text-[#a94f37]">{state.error}</p>}
    </form>
  );
}

export function FreezeForm({ subscriptionId }: { subscriptionId: string }) {
  const [state, formAction, pending] = useActionState(freezeSubscription, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <input name="subscription_id" type="hidden" value={subscriptionId} />
      <label className="block text-xs font-extrabold text-[#3a4542]">
        Freeze reason <span className="text-[#ff7d5c]">*</span>
        <textarea className={`${inputClass} mt-1.5`} name="freeze_reason" placeholder="e.g. travelling, injury" required rows={2} />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-extrabold text-[#3a4542]">
          Staff name
          <input className={`${inputClass} mt-1.5`} name="performed_by" placeholder="Recorded by" type="text" />
        </label>
        <button className={buttonClass} disabled={pending} type="submit">{pending ? "Saving…" : "Freeze"}</button>
      </div>
      {state.fieldErrors?.freeze_reason && <p className="text-xs font-bold text-[#a94f37]">{state.fieldErrors.freeze_reason}</p>}
      {state.error && <p className="text-xs font-bold text-[#a94f37]">{state.error}</p>}
    </form>
  );
}

export function UnfreezeForm({ subscriptionId }: { subscriptionId: string }) {
  const [state, formAction, pending] = useActionState(unfreezeSubscription, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <input name="subscription_id" type="hidden" value={subscriptionId} />
      <label className="flex items-center gap-2 text-xs font-bold text-[#3a4542]">
        <input defaultChecked name="extend_for_frozen_days" type="checkbox" />
        Extend end date by the number of days frozen
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-extrabold text-[#3a4542]">
          Staff name
          <input className={`${inputClass} mt-1.5`} name="performed_by" placeholder="Recorded by" type="text" />
        </label>
        <button className={buttonClass} disabled={pending} type="submit">{pending ? "Saving…" : "Resume"}</button>
      </div>
      {state.error && <p className="text-xs font-bold text-[#a94f37]">{state.error}</p>}
    </form>
  );
}

export function CancelForm({ subscriptionId }: { subscriptionId: string }) {
  const [state, formAction, pending] = useActionState(cancelSubscription, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <input name="subscription_id" type="hidden" value={subscriptionId} />
      <label className="block text-xs font-extrabold text-[#3a4542]">
        Cancel reason <span className="text-[#ff7d5c]">*</span>
        <textarea className={`${inputClass} mt-1.5`} name="cancel_reason" placeholder="Why is this subscription being cancelled?" required rows={2} />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-extrabold text-[#3a4542]">
          Staff name
          <input className={`${inputClass} mt-1.5`} name="performed_by" placeholder="Recorded by" type="text" />
        </label>
        <button className="rounded-xl bg-[#a94f37] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving…" : "Cancel subscription"}
        </button>
      </div>
      {state.fieldErrors?.cancel_reason && <p className="text-xs font-bold text-[#a94f37]">{state.fieldErrors.cancel_reason}</p>}
      {state.error && <p className="text-xs font-bold text-[#a94f37]">{state.error}</p>}
    </form>
  );
}

export function RecordPaymentForm({ subscriptionId }: { subscriptionId: string }) {
  const [state, formAction, pending] = useActionState(recordSubscriptionPayment, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <input name="subscription_id" type="hidden" value={subscriptionId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-extrabold text-[#3a4542]">
          Amount (₹)
          <input className={`${inputClass} mt-1.5`} min={0} name="amount" required step="0.01" type="number" />
        </label>
        <label className="block text-xs font-extrabold text-[#3a4542]">
          Payment mode
          <select className={`${inputClass} mt-1.5`} name="payment_mode" required>
            <option value="">Select</option>
            {PAYMENT_MODES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-extrabold text-[#3a4542]">
          Reference
          <input className={`${inputClass} mt-1.5`} name="reference" placeholder="UPI ref / cheque no." type="text" />
        </label>
        <label className="block text-xs font-extrabold text-[#3a4542]">
          Staff name
          <input className={`${inputClass} mt-1.5`} name="performed_by" placeholder="Received by" type="text" />
        </label>
      </div>
      <label className="block text-xs font-extrabold text-[#3a4542]">
        Notes
        <textarea className={`${inputClass} mt-1.5`} name="notes" rows={2} />
      </label>
      <button className={buttonClass} disabled={pending} type="submit">{pending ? "Saving…" : "Record payment"}</button>
      {state.fieldErrors?.amount && <p className="text-xs font-bold text-[#a94f37]">{state.fieldErrors.amount}</p>}
      {state.fieldErrors?.payment_mode && <p className="text-xs font-bold text-[#a94f37]">{state.fieldErrors.payment_mode}</p>}
      {state.error && <p className="text-xs font-bold text-[#a94f37]">{state.error}</p>}
    </form>
  );
}
