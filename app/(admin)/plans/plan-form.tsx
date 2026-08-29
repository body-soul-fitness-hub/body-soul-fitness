"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { createPlan, updatePlan, type FormState } from "@/app/(admin)/plans/actions";
import { computeFinalPrice, DISCOUNT_TYPES, PLAN_DURATION_PRESETS, type DiscountType, type DurationUnit, type Plan } from "@/lib/plans/types";

const initialState: FormState = {};
const inputClass = "w-full rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5 text-sm font-medium text-[#0f1816] outline-none transition focus:border-[#111c19] focus:bg-white";

type PresetKey = (typeof PLAN_DURATION_PRESETS)[number]["key"] | "custom";

export function PlanForm({ plan }: { plan?: Plan }) {
  const action = plan ? updatePlan : createPlan;
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  const matchedPreset = plan
    ? PLAN_DURATION_PRESETS.find((preset) => preset.unit === plan.duration_unit && preset.value === plan.duration_value)
    : undefined;

  const [presetKey, setPresetKey] = useState<PresetKey>(matchedPreset?.key ?? (plan ? "custom" : "1m"));
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(plan?.duration_unit ?? "months");
  const [durationValue, setDurationValue] = useState<number>(plan?.duration_value ?? 1);
  const [standardPrice, setStandardPrice] = useState<string>(plan ? String(plan.standard_price) : "");
  const [discountType, setDiscountType] = useState<DiscountType | "">(plan?.discount_type ?? "");
  const [discountValue, setDiscountValue] = useState<string>(plan ? String(plan.discount_value) : "0");

  const finalPrice = useMemo(() => {
    const price = Number(standardPrice) || 0;
    const discount = Number(discountValue) || 0;
    return computeFinalPrice(price, discountType || null, discount);
  }, [standardPrice, discountType, discountValue]);

  function onPresetChange(key: PresetKey) {
    setPresetKey(key);
    if (key === "custom") return;
    const preset = PLAN_DURATION_PRESETS.find((p) => p.key === key);
    if (preset) {
      setDurationUnit(preset.unit);
      setDurationValue(preset.value);
    }
  }

  return (
    <form action={formAction} className="mt-8 max-w-2xl rounded-3xl border border-[#e5e9e5] bg-white p-6 shadow-[0_12px_45px_rgba(17,28,25,.045)] sm:p-8">
      {plan && <input name="plan_id" type="hidden" value={plan.id} />}

      {state.error && <div className="mb-6 rounded-xl bg-[#ffe5dc] px-4 py-3 text-sm font-bold text-[#a94f37]">{state.error}</div>}

      <SectionTitle>Plan details</SectionTitle>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Field className="sm:col-span-2" error={errors.name} label="Plan name" required>
          <input className={inputClass} defaultValue={plan?.name ?? ""} name="name" placeholder="e.g. Gold — 3 Months" required type="text" />
        </Field>

        <Field className="sm:col-span-2" error={errors.duration_value} label="Duration" required>
          <select className={inputClass} onChange={(event) => onPresetChange(event.target.value as PresetKey)} value={presetKey}>
            {PLAN_DURATION_PRESETS.map((preset) => (
              <option key={preset.key} value={preset.key}>{preset.label}</option>
            ))}
            <option value="custom">Custom</option>
          </select>
          {presetKey === "custom" && (
            <div className="mt-2 flex items-center gap-2">
              <input
                className={inputClass}
                min={1}
                name="duration_value"
                onChange={(event) => setDurationValue(Number(event.target.value))}
                type="number"
                value={durationValue}
              />
              <select className={inputClass} name="duration_unit" onChange={(event) => setDurationUnit(event.target.value as DurationUnit)} value={durationUnit}>
                <option value="days">Days</option>
                <option value="months">Months</option>
              </select>
            </div>
          )}
          {presetKey !== "custom" && (
            <>
              <input name="duration_value" type="hidden" value={durationValue} />
              <input name="duration_unit" type="hidden" value={durationUnit} />
            </>
          )}
        </Field>

        <Field error={errors.standard_price} label="Standard price (₹)" required>
          <input className={inputClass} min={0} name="standard_price" onChange={(event) => setStandardPrice(event.target.value)} required step="0.01" type="number" value={standardPrice} />
        </Field>

        <Field label="Discount type">
          <select className={inputClass} name="discount_type" onChange={(event) => setDiscountType(event.target.value as DiscountType | "")} value={discountType}>
            <option value="">No discount</option>
            {DISCOUNT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>

        <Field error={errors.discount_value} label={discountType === "percentage" ? "Discount (%)" : "Discount (₹)"}>
          <input
            className={inputClass}
            disabled={!discountType}
            min={0}
            name="discount_value"
            onChange={(event) => setDiscountValue(event.target.value)}
            step="0.01"
            type="number"
            value={discountType ? discountValue : "0"}
          />
        </Field>

        <Field label="Final price">
          <div className="flex h-[46px] items-center rounded-xl border border-[#e5e9e5] bg-[#eef3ea] px-3.5 text-sm font-extrabold text-[#27463b]">₹{finalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        </Field>

        <Field className="sm:col-span-2" label="Description">
          <textarea className={inputClass} defaultValue={plan?.description ?? ""} name="description" rows={2} />
        </Field>

        <Field className="sm:col-span-2" hint="One service per line — shown to staff when selecting this plan." label="Included services">
          <textarea className={inputClass} defaultValue={plan?.included_services?.join("\n") ?? ""} name="included_services" placeholder={"Gym floor access\nGroup classes\n1 PT session / month"} rows={4} />
        </Field>

        {plan && (
          <Field label="Status">
            <label className="flex items-center gap-2 text-sm font-bold text-[#3a4542]">
              <input defaultChecked={plan.is_active} name="is_active" type="checkbox" />
              Active — selectable for new subscriptions
            </label>
          </Field>
        )}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button className="inline-flex items-center justify-center rounded-xl bg-[#111c19] px-6 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15 disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving…" : plan ? "Save changes" : "Create plan"}
        </button>
        <Link className="text-sm font-bold text-[#6c7773]" href="/plans">Cancel</Link>
      </div>
    </form>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">{children}</p>;
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
