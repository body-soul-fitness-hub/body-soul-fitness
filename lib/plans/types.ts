export const DURATION_UNITS = [
  { value: "months", label: "Months" },
  { value: "days", label: "Days" },
] as const;

export type DurationUnit = (typeof DURATION_UNITS)[number]["value"];

// The four durations the module ships with as quick picks. Staff can still choose "Custom" and
// enter any duration_unit/duration_value pair — plans aren't limited to these four.
export const PLAN_DURATION_PRESETS: ReadonlyArray<{ key: string; label: string; unit: DurationUnit; value: number }> = [
  { key: "1m", label: "1 Month", unit: "months", value: 1 },
  { key: "3m", label: "3 Months", unit: "months", value: 3 },
  { key: "6m", label: "6 Months", unit: "months", value: 6 },
  { key: "12m", label: "1 Year", unit: "months", value: 12 },
];

export const DISCOUNT_TYPES = [
  { value: "amount", label: "Flat amount" },
  { value: "percentage", label: "Percentage" },
] as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[number]["value"];

export type Plan = {
  id: string;
  name: string;
  duration_unit: DurationUnit;
  duration_value: number;
  standard_price: number;
  discount_type: DiscountType | null;
  discount_value: number;
  final_price: number;
  description: string | null;
  included_services: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeFinalPrice(standardPrice: number, discountType: DiscountType | null, discountValue: number): number {
  if (!discountType || !discountValue) return round2(Math.max(0, standardPrice));
  const discounted = discountType === "percentage" ? standardPrice - (standardPrice * discountValue) / 100 : standardPrice - discountValue;
  return round2(Math.max(0, discounted));
}

export function durationLabel(unit: DurationUnit, value: number): string {
  if (unit === "months") return value === 1 ? "1 Month" : `${value} Months`;
  return value === 1 ? "1 Day" : `${value} Days`;
}
