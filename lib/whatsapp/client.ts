import "server-only";
import { decryptSecret } from "@/lib/whatsapp/crypto";
import type { WhatsAppSettings } from "@/lib/whatsapp/types";

export type SendResult = { ok: true; providerMessageId: string } | { ok: false; errorMessage: string };

function resolveAccessToken(settings: WhatsAppSettings): string | null {
  if (!settings.access_token_ciphertext) return null;
  try {
    return decryptSecret(settings.access_token_ciphertext);
  } catch {
    return null;
  }
}

// Sends one Meta-approved template message via the direct WhatsApp Cloud API
// (POST /{phone_number_id}/messages). Every param is a body-text param, in template order —
// this app doesn't use header/button template components.
export async function sendMetaTemplateMessage(
  settings: WhatsAppSettings,
  { to, templateName, languageCode, bodyParams }: { to: string; templateName: string; languageCode: string; bodyParams: string[] }
): Promise<SendResult> {
  const accessToken = resolveAccessToken(settings);
  if (!accessToken) return { ok: false, errorMessage: "WhatsApp access token is not configured." };
  if (!settings.phone_number_id) return { ok: false, errorMessage: "WhatsApp phone number ID is not configured." };

  const url = `https://graph.facebook.com/${settings.graph_api_version}/${settings.phone_number_id}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components:
        bodyParams.length > 0
          ? [{ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) }]
          : undefined,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => null)) as
      | { messages?: Array<{ id: string }>; error?: { message?: string } }
      | null;

    if (!response.ok || !json?.messages?.[0]?.id) {
      return { ok: false, errorMessage: json?.error?.message ?? `WhatsApp API returned ${response.status}.` };
    }
    return { ok: true, providerMessageId: json.messages[0].id };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : "Could not reach the WhatsApp API." };
  }
}

export type TemplateStatusResult = { ok: true; status: "approved" | "pending" | "rejected" | "unknown" } | { ok: false; errorMessage: string };

// GET /{business_account_id}/message_templates?name=... — used by the "Check status with Meta"
// button in Settings so an admin can see whether a template they created in Business Manager has
// cleared approval yet, without leaving the app.
export async function checkTemplateStatus(settings: WhatsAppSettings, templateName: string): Promise<TemplateStatusResult> {
  const accessToken = resolveAccessToken(settings);
  if (!accessToken) return { ok: false, errorMessage: "WhatsApp access token is not configured." };
  if (!settings.business_account_id) return { ok: false, errorMessage: "WhatsApp business account ID is not configured." };

  const url = `https://graph.facebook.com/${settings.graph_api_version}/${settings.business_account_id}/message_templates?name=${encodeURIComponent(templateName)}`;

  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const json = (await response.json().catch(() => null)) as
      | { data?: Array<{ status?: string }>; error?: { message?: string } }
      | null;

    if (!response.ok) return { ok: false, errorMessage: json?.error?.message ?? `WhatsApp API returned ${response.status}.` };

    const status = json?.data?.[0]?.status?.toLowerCase();
    if (status === "approved") return { ok: true, status: "approved" };
    if (status === "pending" || status === "pending_deletion" || status === "in_appeal") return { ok: true, status: "pending" };
    if (status === "rejected" || status === "disabled") return { ok: true, status: "rejected" };
    return { ok: true, status: "unknown" };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : "Could not reach the WhatsApp API." };
  }
}
