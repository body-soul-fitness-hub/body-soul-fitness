import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendMetaTemplateMessage } from "@/lib/whatsapp/client";
import { buildTemplateParams, renderTemplate } from "@/lib/whatsapp/render";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";
import {
  DEFAULT_WHATSAPP_SETTINGS,
  ESSENTIAL_NOTIFICATION_TYPES,
  WHATSAPP_SETTINGS_ID,
  isAutomationEnabled,
  type DeliveryStatus,
  type NotificationType,
  type TriggerSource,
  type WhatsAppSettings,
  type WhatsAppTemplate,
} from "@/lib/whatsapp/types";

export type SendNotificationArgs = {
  memberId: string;
  notificationType: NotificationType;
  variables: Record<string, string>;
  triggerSource: TriggerSource;
  performedBy: string | null;
  subscriptionId?: string | null;
  invoiceId?: string | null;
};

export type SendNotificationResult = { ok: boolean; status: DeliveryStatus; errorMessage?: string };

async function loadSettings(): Promise<WhatsAppSettings> {
  const { data } = await supabaseAdmin.from("whatsapp_settings").select("*").eq("id", WHATSAPP_SETTINGS_ID).maybeSingle();
  return { id: WHATSAPP_SETTINGS_ID, updated_at: new Date().toISOString(), ...DEFAULT_WHATSAPP_SETTINGS, ...(data ?? {}) };
}

async function writeLog(args: {
  memberId: string;
  notificationType: NotificationType;
  templateKey: string | null;
  message: string;
  status: DeliveryStatus;
  errorMessage: string | null;
  recipientNumber: string | null;
  providerMessageId: string | null;
  triggerSource: TriggerSource;
  performedBy: string | null;
  subscriptionId: string | null;
  invoiceId: string | null;
}): Promise<void> {
  await supabaseAdmin.from("member_notifications").insert({
    member_id: args.memberId,
    channel: "whatsapp",
    message: args.message,
    status: args.status,
    notification_type: args.notificationType,
    template_key: args.templateKey,
    recipient_number: args.recipientNumber,
    provider_message_id: args.providerMessageId,
    error_message: args.errorMessage,
    trigger_source: args.triggerSource,
    subscription_id: args.subscriptionId,
    invoice_id: args.invoiceId,
    created_by: args.performedBy,
  });
}

// The single path every caller (the bill-generated hook, the reminder cron, and the custom-send
// action) goes through, so every send — and every reason a send didn't happen — lands in the
// notification log exactly once.
export async function sendNotification(args: SendNotificationArgs): Promise<SendNotificationResult> {
  const subscriptionId = args.subscriptionId ?? null;
  const invoiceId = args.invoiceId ?? null;

  const { data: member } = await supabaseAdmin
    .from("members")
    .select("id, full_name, mobile_number, whatsapp_number, whatsapp_consent, whatsapp_promotional_opt_out")
    .eq("id", args.memberId)
    .maybeSingle();

  const fail = async (reason: string, templateKey: string | null = null): Promise<SendNotificationResult> => {
    await writeLog({
      memberId: args.memberId,
      notificationType: args.notificationType,
      templateKey,
      message: args.variables.message ?? `[Not sent] ${reason}`,
      status: "failed",
      errorMessage: reason,
      recipientNumber: null,
      providerMessageId: null,
      triggerSource: args.triggerSource,
      performedBy: args.performedBy,
      subscriptionId,
      invoiceId,
    });
    return { ok: false, status: "failed", errorMessage: reason };
  };

  if (!member) return fail("Member not found.");
  if (!member.whatsapp_consent) return fail("Member has not given WhatsApp consent.");
  if (!ESSENTIAL_NOTIFICATION_TYPES.includes(args.notificationType) && member.whatsapp_promotional_opt_out) {
    return fail("Member has opted out of promotional WhatsApp messages.");
  }

  const settings = await loadSettings();
  if (!isAutomationEnabled(settings, args.notificationType)) {
    return fail("This notification type is disabled in WhatsApp settings.");
  }

  const { data: templateRow } = await supabaseAdmin.from("whatsapp_templates").select("*").eq("key", args.notificationType).maybeSingle();
  const template = templateRow as WhatsAppTemplate | null;
  if (!template) return fail("No WhatsApp template is registered for this notification type.");
  if (!template.enabled) return fail("This notification type's template is disabled.", template.key);
  if (!template.meta_template_name) return fail("No Meta-approved WhatsApp template is linked for this notification type yet.", template.key);
  if (template.meta_approval_status !== "approved") {
    return fail("The linked Meta WhatsApp template has not been confirmed as approved. Check its status in WhatsApp settings before sending.", template.key);
  }

  const messageText = renderTemplate(template.body_preview, args.variables);

  const realPhone = normalizeWhatsAppPhone(member.whatsapp_number || member.mobile_number);
  if (!realPhone) return fail("Member has no WhatsApp or mobile number on file.", template.key);

  let recipientNumber = realPhone;
  if (settings.test_mode) {
    const testNumber = normalizeWhatsAppPhone(settings.test_recipient_number);
    if (!testNumber) return fail("Test mode is enabled but no test recipient number is configured.", template.key);
    recipientNumber = testNumber;
  }

  const bodyParams = buildTemplateParams(template.variables, args.variables);
  const result = await sendMetaTemplateMessage(settings, {
    to: recipientNumber,
    templateName: template.meta_template_name,
    languageCode: template.meta_template_language,
    bodyParams,
  });

  if (!result.ok) {
    await writeLog({
      memberId: args.memberId,
      notificationType: args.notificationType,
      templateKey: template.key,
      message: messageText,
      status: "failed",
      errorMessage: result.errorMessage,
      recipientNumber,
      providerMessageId: null,
      triggerSource: args.triggerSource,
      performedBy: args.performedBy,
      subscriptionId,
      invoiceId,
    });
    return { ok: false, status: "failed", errorMessage: result.errorMessage };
  }

  await writeLog({
    memberId: args.memberId,
    notificationType: args.notificationType,
    templateKey: template.key,
    message: messageText,
    status: "sent",
    errorMessage: null,
    recipientNumber,
    providerMessageId: result.providerMessageId,
    triggerSource: args.triggerSource,
    performedBy: args.performedBy,
    subscriptionId,
    invoiceId,
  });
  return { ok: true, status: "sent" };
}
