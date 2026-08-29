"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_GYM_SETTINGS, GYM_SETTINGS_ID } from "@/lib/settings/types";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function updateGymSettings(_prevState: FormState, formData: FormData): Promise<FormState> {
  const gymName = str(formData, "gym_name") ?? DEFAULT_GYM_SETTINGS.gym_name;
  const address = str(formData, "address");
  const phone = str(formData, "phone");
  const email = str(formData, "email");
  const website = str(formData, "website");
  const gstin = str(formData, "gstin");
  const taxLabel = str(formData, "tax_label") ?? DEFAULT_GYM_SETTINGS.tax_label;
  const taxRateRaw = str(formData, "tax_rate");
  const taxRate = taxRateRaw ? Number(taxRateRaw) : 0;
  const thankYouMessage = str(formData, "thank_you_message") ?? DEFAULT_GYM_SETTINGS.thank_you_message;

  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    return { fieldErrors: { tax_rate: "Tax rate must be a number between 0 and 100." } };
  }

  const { error } = await supabaseAdmin
    .from("gym_settings")
    .upsert({
      id: GYM_SETTINGS_ID,
      gym_name: gymName,
      address,
      phone,
      email,
      website,
      gstin,
      tax_label: taxLabel,
      tax_rate: taxRate,
      thank_you_message: thankYouMessage,
      updated_at: new Date().toISOString(),
    });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
