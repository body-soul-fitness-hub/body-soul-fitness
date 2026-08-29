"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { computeFinalPrice, type DiscountType, type DurationUnit } from "@/lib/plans/types";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function num(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function servicesArray(formData: FormData): string[] {
  const raw = formData.get("included_services");
  if (typeof raw !== "string") return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

type PlanInput = {
  name: string;
  duration_unit: DurationUnit;
  duration_value: number;
  standard_price: number;
  discount_type: DiscountType | null;
  discount_value: number;
  final_price: number;
  description: string | null;
  included_services: string[];
};

function parsePlanInput(formData: FormData): { input?: PlanInput; fieldErrors?: Record<string, string> } {
  const name = str(formData, "name");
  const durationUnit = str(formData, "duration_unit") as DurationUnit | null;
  const durationValue = num(formData, "duration_value");
  const standardPrice = num(formData, "standard_price");
  const discountType = (str(formData, "discount_type") as DiscountType | null) ?? null;
  const discountValue = num(formData, "discount_value") ?? 0;

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Plan name is required.";
  if (durationUnit !== "days" && durationUnit !== "months") fieldErrors.duration_unit = "Select a duration unit.";
  if (!durationValue || durationValue <= 0) fieldErrors.duration_value = "Enter a duration greater than zero.";
  if (standardPrice === null || standardPrice < 0) fieldErrors.standard_price = "Enter a valid standard price.";
  if (discountValue < 0) fieldErrors.discount_value = "Discount cannot be negative.";
  if (discountType === "percentage" && discountValue > 100) fieldErrors.discount_value = "A percentage discount cannot exceed 100%.";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const finalPrice = computeFinalPrice(standardPrice!, discountType, discountValue);

  return {
    input: {
      name: name!,
      duration_unit: durationUnit!,
      duration_value: durationValue!,
      standard_price: standardPrice!,
      discount_type: discountType,
      discount_value: discountValue,
      final_price: finalPrice,
      description: str(formData, "description"),
      included_services: servicesArray(formData),
    },
  };
}

export async function createPlan(_prevState: FormState, formData: FormData): Promise<FormState> {
  const { input, fieldErrors } = parsePlanInput(formData);
  if (fieldErrors) return { fieldErrors };

  const { error } = await supabaseAdmin.from("plans").insert({ ...input, is_active: true });
  if (error) return { error: error.message };

  revalidatePath("/plans");
  redirect("/plans");
}

export async function updatePlan(_prevState: FormState, formData: FormData): Promise<FormState> {
  const planId = str(formData, "plan_id");
  if (!planId) return { error: "Plan not found." };

  const { input, fieldErrors } = parsePlanInput(formData);
  if (fieldErrors) return { fieldErrors };

  const isActive = formData.get("is_active") === "on";

  const { error } = await supabaseAdmin
    .from("plans")
    .update({ ...input, is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", planId);

  if (error) return { error: error.message };

  revalidatePath("/plans");
  revalidatePath(`/plans/${planId}/edit`);
  redirect("/plans");
}

export async function setPlanActive(formData: FormData): Promise<void> {
  const planId = formData.get("plan_id");
  const currentlyActive = formData.get("is_active") === "true";
  if (typeof planId !== "string") return;

  await supabaseAdmin
    .from("plans")
    .update({ is_active: !currentlyActive, updated_at: new Date().toISOString() })
    .eq("id", planId);

  revalidatePath("/plans");
}
