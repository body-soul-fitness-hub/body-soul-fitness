import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Meta's one-time webhook verification handshake, done when the webhook URL is registered in
// Meta Business Manager.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type StatusUpdate = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  errors?: Array<{ title?: string; message?: string }>;
};

// Delivery-status callbacks. Always acknowledges with 200 (even on a parse/lookup failure) so
// Meta doesn't retry-storm or eventually disable the webhook subscription — this is a best-effort
// enrichment of the log, not a critical path.
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      entry?: Array<{ changes?: Array<{ value?: { statuses?: StatusUpdate[] } }> }>;
    };

    const statuses = (payload.entry ?? []).flatMap((entry) => (entry.changes ?? []).flatMap((change) => change.value?.statuses ?? []));

    for (const status of statuses) {
      if (status.status === "delivered" || status.status === "read") {
        await supabaseAdmin
          .from("member_notifications")
          .update({ status: "delivered", updated_at: new Date().toISOString() })
          .eq("provider_message_id", status.id)
          .eq("status", "sent");
      } else if (status.status === "failed") {
        const errorMessage = status.errors?.[0]?.message ?? status.errors?.[0]?.title ?? "Delivery failed.";
        await supabaseAdmin
          .from("member_notifications")
          .update({ status: "failed", error_message: errorMessage, updated_at: new Date().toISOString() })
          .eq("provider_message_id", status.id);
      }
    }
  } catch (err) {
    console.error("WhatsApp webhook processing error:", err);
  }

  return new Response("OK", { status: 200 });
}
