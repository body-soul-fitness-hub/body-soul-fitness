"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/whatsapp/crypto";
import { checkTemplateStatus } from "@/lib/whatsapp/client";
import { DEFAULT_WHATSAPP_SETTINGS, NOTIFICATION_TYPES, WHATSAPP_SETTINGS_ID, type WhatsAppSettings } from "@/lib/whatsapp/types";

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

function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

export async function updateWhatsAppSettings(_prevState: FormState, formData: FormData): Promise<FormState> {
  const graphApiVersion = str(formData, "graph_api_version") ?? DEFAULT_WHATSAPP_SETTINGS.graph_api_version;
  const testMode = bool(formData, "test_mode");
  const testRecipientNumber = str(formData, "test_recipient_number");

  if (testMode && !testRecipientNumber) {
    return { fieldErrors: { test_recipient_number: "A test recipient number is required while test mode is on." } };
  }

  const settingsUpdate: Record<string, unknown> = {
    id: WHATSAPP_SETTINGS_ID,
    business_phone_number: str(formData, "business_phone_number"),
    phone_number_id: str(formData, "phone_number_id"),
    business_account_id: str(formData, "business_account_id"),
    graph_api_version: graphApiVersion,
    test_mode: testMode,
    test_recipient_number: testRecipientNumber,
    bill_generated_enabled: bool(formData, "bill_generated_enabled"),
    expiry_reminders_enabled: bool(formData, "expiry_reminders_enabled"),
    expired_notice_enabled: bool(formData, "expired_notice_enabled"),
    birthday_messages_enabled: bool(formData, "birthday_messages_enabled"),
    custom_notifications_enabled: bool(formData, "custom_notifications_enabled"),
    updated_at: new Date().toISOString(),
  };

  const accessToken = str(formData, "access_token");
  if (accessToken) {
    settingsUpdate.access_token_ciphertext = encryptSecret(accessToken);
    settingsUpdate.access_token_last4 = accessToken.slice(-4);
    settingsUpdate.access_token_updated_at = new Date().toISOString();
  }

  const { error: settingsError } = await supabaseAdmin.from("whatsapp_settings").upsert(settingsUpdate);
  if (settingsError) return { error: settingsError.message };

  for (const type of NOTIFICATION_TYPES) {
    const metaTemplateName = str(formData, `template_meta_name__${type.value}`);
    const metaTemplateLanguage = str(formData, `template_meta_language__${type.value}`) ?? "en_US";
    const bodyPreview = str(formData, `template_body__${type.value}`) ?? "";
    const enabled = bool(formData, `template_enabled__${type.value}`);

    const { error: templateError } = await supabaseAdmin
      .from("whatsapp_templates")
      .update({
        meta_template_name: metaTemplateName,
        meta_template_language: metaTemplateLanguage,
        body_preview: bodyPreview,
        enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("key", type.value);

    if (templateError) return { error: templateError.message };
  }

  revalidatePath("/settings/whatsapp");
  return { success: true };
}

export type CheckStatusResult = { ok: boolean; status?: string; errorMessage?: string };

export async function checkTemplateStatusAction(templateKey: string): Promise<CheckStatusResult> {
  const { data: settingsRow } = await supabaseAdmin.from("whatsapp_settings").select("*").eq("id", WHATSAPP_SETTINGS_ID).maybeSingle();
  const settings: WhatsAppSettings = { id: WHATSAPP_SETTINGS_ID, updated_at: new Date().toISOString(), ...DEFAULT_WHATSAPP_SETTINGS, ...(settingsRow ?? {}) };

  const { data: template } = await supabaseAdmin.from("whatsapp_templates").select("meta_template_name").eq("key", templateKey).maybeSingle();
  if (!template?.meta_template_name) return { ok: false, errorMessage: "Enter and save a Meta template name first." };

  const result = await checkTemplateStatus(settings, template.meta_template_name);
  if (!result.ok) return { ok: false, errorMessage: result.errorMessage };

  await supabaseAdmin
    .from("whatsapp_templates")
    .update({ meta_approval_status: result.status, meta_approval_checked_at: new Date().toISOString() })
    .eq("key", templateKey);

  revalidatePath("/settings/whatsapp");
  return { ok: true, status: result.status };
}
