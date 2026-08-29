"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSubscription, searchMembers, type FormState } from "@/app/(admin)/subscriptions/actions";
import { computeFinalPrice, durationLabel, type Plan } from "@/lib/plans/types";
import { addDuration, PAYMENT_MODES, round2 } from "@/lib/subscriptions/types";

const initialState: FormState = {};
const today = new Date().toISOString().slice(0, 10);
const inputClass = "w-full rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5 text-sm font-medium text-[#0f1816] outline-none transition focus:border-[#111c19] focus:bg-white";

type MemberOption = { id: string; member_id: string; full_name: string; mobile_number: string };

export function SubscriptionForm({
  plans,
  preselectedMember,
  renewedFromId,
  preselectedPlanId,
}: {
  plans: Plan[];
  preselectedMember: MemberOption | null;
  renewedFromId?: string;
  preselectedPlanId?: string;
}) {
  const [state, formAction, pending] = useActionState(createSubscription, initialState);
  const errors = state.fieldErrors ?? {};

  const [member, setMember] = useState<MemberOption | null>(preselectedMember);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberOption[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (member || !query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const matches = await searchMembers(query);
      if (!cancelled) {
        setResults(matches);
        setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, member]);

  const [planId, setPlanId] = useState(preselectedPlanId ?? plans[0]?.id ?? "");
  const plan = plans.find((p) => p.id === planId) ?? null;

  const [startDate, setStartDate] = useState(today);
  const [discountType, setDiscountType] = useState<Plan["discount_type"]>(plan?.discount_type ?? null);
  const [discountValue, setDiscountValue] = useState<string>(plan ? String(plan.discount_value) : "0");
  const [finalAmount, setFinalAmount] = useState<string>(plan ? String(plan.final_price) : "0");
  const [amountPaid, setAmountPaid] = useState("0");
  const [paymentMode, setPaymentMode] = useState("");

  function onPlanChange(id: string) {
    setPlanId(id);
    const next = plans.find((p) => p.id === id);
    if (next) {
      setDiscountType(next.discount_type);
      setDiscountValue(String(next.discount_value));
      setFinalAmount(String(next.final_price));
    }
  }

  const endDate = useMemo(() => (plan ? addDuration(startDate, plan.duration_unit, plan.duration_value) : null), [plan, startDate]);

  function onDiscountChange(type: Plan["discount_type"], value: string) {
    setDiscountType(type);
    setDiscountValue(value);
    if (plan) setFinalAmount(String(computeFinalPrice(plan.standard_price, type, Number(value) || 0)));
  }

  const balanceDue = Math.max(0, round2((Number(finalAmount) || 0) - (Number(amountPaid) || 0)));

  return (
    <form action={formAction} className="mt-8 max-w-2xl rounded-3xl border border-[#e5e9e5] bg-white p-6 shadow-[0_12px_45px_rgba(17,28,25,.045)] sm:p-8">
      {renewedFromId && <input name="renewed_from_id" type="hidden" value={renewedFromId} />}

      {state.error && <div className="mb-6 rounded-xl bg-[#ffe5dc] px-4 py-3 text-sm font-bold text-[#a94f37]">{state.error}</div>}

      <SectionTitle>Member</SectionTitle>
      <div className="mt-4">
        {member ? (
          <div className="flex items-center justify-between rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5">
            <div>
              <p className="text-sm font-extrabold">{member.full_name}</p>
              <p className="text-xs font-medium text-[#6c7773]">{member.member_id} · {member.mobile_number}</p>
            </div>
            {!preselectedMember && (
              <button className="text-xs font-extrabold text-[#a94f37]" onClick={() => setMember(null)} type="button">Change</button>
            )}
          </div>
        ) : (
          <div>
            <input className={inputClass} onChange={(event) => setQuery(event.target.value)} placeholder="Search member by name, mobile, or member ID" type="text" value={query} />
            {searching && <p className="mt-1.5 text-xs font-medium text-[#89938f]">Searching…</p>}
            {results.length > 0 && (
              <div className="mt-2 divide-y divide-[#f0f2f0] rounded-xl border border-[#e5e9e5]">
                {results.map((result) => (
                  <button
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left hover:bg-[#f9faf8]"
                    key={result.id}
                    onClick={() => {
                      setMember(result);
                      setResults([]);
                    }}
                    type="button"
                  >
                    <span className="text-sm font-bold">{result.full_name}</span>
                    <span className="text-xs font-medium text-[#89938f]">{result.member_id} · {result.mobile_number}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {member && <input name="member_id" type="hidden" value={member.id} />}
        {errors.member_id && <p className="mt-1.5 text-xs font-bold text-[#a94f37]">{errors.member_id}</p>}
      </div>

      <SectionTitle className="mt-8">Plan</SectionTitle>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Field className="sm:col-span-2" error={errors.plan_id} label="Choose a plan" required>
          <select className={inputClass} onChange={(event) => onPlanChange(event.target.value)} value={planId}>
            <option value="">Select a plan</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {durationLabel(p.duration_unit, p.duration_value)} — ₹{p.final_price.toLocaleString("en-IN")}</option>
            ))}
          </select>
          {plan && <input name="plan_id" type="hidden" value={plan.id} />}
          {plan && <input name="plan_name" type="hidden" value={plan.name} />}
          {plan && <input name="duration_unit" type="hidden" value={plan.duration_unit} />}
          {plan && <input name="duration_value" type="hidden" value={plan.duration_value} />}
          {plan && <input name="standard_price" type="hidden" value={plan.standard_price} />}
        </Field>

        <Field label="Start date" required>
          <input className={inputClass} name="start_date" onChange={(event) => setStartDate(event.target.value)} required type="date" value={startDate} />
        </Field>

        <Field hint="Calculated automatically from the plan duration." label="End date">
          <div className="flex h-[46px] items-center rounded-xl border border-[#e5e9e5] bg-[#f0f2f0] px-3.5 text-sm font-bold text-[#6c7773]">{endDate ?? "—"}</div>
        </Field>

        <Field label="Discount type">
          <select className={inputClass} onChange={(event) => onDiscountChange((event.target.value || null) as Plan["discount_type"], discountValue)} value={discountType ?? ""}>
            <option value="">No discount</option>
            <option value="amount">Flat amount</option>
            <option value="percentage">Percentage</option>
          </select>
          <input name="discount_type" type="hidden" value={discountType ?? ""} />
        </Field>

        <Field label={discountType === "percentage" ? "Discount (%)" : "Discount (₹)"}>
          <input
            className={inputClass}
            disabled={!discountType}
            min={0}
            name="discount_value"
            onChange={(event) => onDiscountChange(discountType, event.target.value)}
            step="0.01"
            type="number"
            value={discountType ? discountValue : "0"}
          />
        </Field>

        <Field className="sm:col-span-2" error={errors.standard_price} hint="Pre-filled from the plan's discount; adjust for a one-off negotiated price." label="Final amount (₹)" required>
          <input className={inputClass} min={0} name="final_amount" onChange={(event) => setFinalAmount(event.target.value)} step="0.01" type="number" value={finalAmount} />
        </Field>
      </div>

      <SectionTitle className="mt-8">Payment</SectionTitle>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Field error={errors.amount_paid} label="Amount paid now (₹)">
          <input className={inputClass} min={0} name="amount_paid" onChange={(event) => setAmountPaid(event.target.value)} step="0.01" type="number" value={amountPaid} />
        </Field>

        <Field error={errors.payment_mode} label="Payment mode">
          <select className={inputClass} name="payment_mode" onChange={(event) => setPaymentMode(event.target.value)} value={paymentMode}>
            <option value="">Select</option>
            {PAYMENT_MODES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Payment status">
          <div className="flex h-[46px] items-center rounded-xl border border-[#e5e9e5] bg-[#f0f2f0] px-3.5 text-sm font-bold text-[#6c7773]">
            {(Number(amountPaid) || 0) <= 0 ? "Unpaid" : (Number(amountPaid) || 0) >= (Number(finalAmount) || 0) ? "Paid" : "Partial"}
          </div>
        </Field>

        <Field label="Balance due">
          <div className="flex h-[46px] items-center rounded-xl border border-[#e5e9e5] bg-[#f0f2f0] px-3.5 text-sm font-bold text-[#6c7773]">₹{balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        </Field>

        <Field className="sm:col-span-2" label="Notes">
          <textarea className={inputClass} name="notes" rows={2} />
        </Field>

        <Field label="Staff name">
          <input className={inputClass} name="created_by" placeholder="Recorded by" type="text" />
        </Field>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button className="inline-flex items-center justify-center rounded-xl bg-[#111c19] px-6 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15 disabled:opacity-60" disabled={pending || !member} type="submit">
          {pending ? "Saving…" : "Create subscription"}
        </button>
        <Link className="text-sm font-bold text-[#6c7773]" href={member ? `/members/${member.id}` : "/subscriptions"}>Cancel</Link>
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
