import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { normalizeToE164, toSupabaseAuthPhone } from "@/lib/whatsapp/phone";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

type Outcome = "success" | "invalid_credentials" | "captcha_failed" | "member_inactive" | "membership_inactive" | "account_not_ready" | "unknown_member" | "invalid_request" | "service_error";

function maskMobile(value: string) {
  return value.length < 5 ? "Unknown" : `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

function deviceSummary(value: string | null) {
  return value ? value.slice(0, 300) : null;
}

async function recordEvent(args: { memberId?: string | null; mobile: string; outcome: Outcome; errorCode?: string | null; device: string | null }) {
  try {
    await supabaseAdmin.from("member_auth_events").insert({
      member_id: args.memberId ?? null,
      mobile_masked: maskMobile(args.mobile),
      outcome: args.outcome,
      auth_error_code: args.errorCode?.slice(0, 100) ?? null,
      device_summary: deviceSummary(args.device),
    });
  } catch {
    // Authentication must remain available if the operational log is temporarily unavailable.
  }
}

function publicMessage(outcome: Outcome) {
  if (outcome === "captcha_failed") return "Security verification could not be completed. Refresh the page, complete the hCaptcha check, and try again.";
  if (outcome === "member_inactive" || outcome === "membership_inactive") return "Portal access is available only to members with a current active membership. Please contact reception.";
  if (outcome === "account_not_ready") return "Your portal account is not ready. Please ask reception to issue a new setup code.";
  if (outcome === "invalid_request" || outcome === "service_error") return "We could not sign you in right now. Please try again or contact reception.";
  return "The mobile number or password is incorrect.";
}

export async function POST(request: Request) {
  const device = request.headers.get("user-agent");
  let body: { phone?: unknown; password?: unknown; captchaToken?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: publicMessage("invalid_request") }, { status: 400 }); }

  const mobile = normalizeToE164(typeof body.phone === "string" ? body.phone : "");
  const password = typeof body.password === "string" ? body.password : "";
  const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
  if (!mobile || !password) {
    await recordEvent({ mobile: mobile ?? "Unknown", outcome: "invalid_request", device });
    return NextResponse.json({ error: publicMessage("invalid_request") }, { status: 400 });
  }

  try {
    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id,status,auth_user_id")
      .eq("mobile_number", mobile)
      .maybeSingle();

    if (!member) {
      await recordEvent({ mobile, outcome: "unknown_member", device });
      return NextResponse.json({ error: publicMessage("unknown_member") }, { status: 401 });
    }
    if (member.status !== "active") {
      await recordEvent({ memberId: member.id, mobile, outcome: "member_inactive", device });
      return NextResponse.json({ error: publicMessage("member_inactive") }, { status: 403 });
    }
    if (!member.auth_user_id) {
      await recordEvent({ memberId: member.id, mobile, outcome: "account_not_ready", device });
      return NextResponse.json({ error: publicMessage("account_not_ready") }, { status: 403 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: subscription } = await supabaseAdmin
      .from("member_subscriptions")
      .select("id")
      .eq("member_id", member.id)
      .eq("status", "active")
      .or(`end_date.is.null,end_date.gte.${today}`)
      .limit(1)
      .maybeSingle();
    if (!subscription) {
      await recordEvent({ memberId: member.id, mobile, outcome: "membership_inactive", device });
      return NextResponse.json({ error: publicMessage("membership_inactive") }, { status: 403 });
    }

    const authPhone = toSupabaseAuthPhone(mobile)!;
    const authClient = createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await authClient.auth.signInWithPassword({ phone: authPhone, password, options: { captchaToken } });
    if (error || !data.session || data.user?.id !== member.auth_user_id) {
      const detail = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
      const outcome: Outcome = detail.includes("captcha") || detail.includes("bot") ? "captcha_failed" : "invalid_credentials";
      await recordEvent({ memberId: member.id, mobile, outcome, errorCode: error?.code ?? null, device });
      return NextResponse.json({ error: publicMessage(outcome) }, { status: 401 });
    }

    await recordEvent({ memberId: member.id, mobile, outcome: "success", device });
    return NextResponse.json({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
  } catch {
    await recordEvent({ mobile, outcome: "service_error", device });
    return NextResponse.json({ error: publicMessage("service_error") }, { status: 500 });
  }
}
