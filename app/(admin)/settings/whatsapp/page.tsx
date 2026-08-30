import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_WHATSAPP_SETTINGS, NOTIFICATION_TYPES, WHATSAPP_SETTINGS_ID, type WhatsAppSettings, type WhatsAppTemplate } from "@/lib/whatsapp/types";
import { WhatsAppSettingsForm } from "./whatsapp-settings-form";

export default async function WhatsAppSettingsPage() {
  const [{ data: settingsRow }, { data: templateRows }] = await Promise.all([
    supabaseAdmin.from("whatsapp_settings").select("*").eq("id", WHATSAPP_SETTINGS_ID).maybeSingle(),
    supabaseAdmin.from("whatsapp_templates").select("*"),
  ]);

  const settings: WhatsAppSettings = { id: WHATSAPP_SETTINGS_ID, updated_at: new Date().toISOString(), ...DEFAULT_WHATSAPP_SETTINGS, ...(settingsRow ?? {}) };
  const templatesByKey = new Map(((templateRows ?? []) as WhatsAppTemplate[]).map((t) => [t.key, t]));
  const templates = NOTIFICATION_TYPES.map((type) => templatesByKey.get(type.value) ?? {
    id: type.value,
    key: type.value,
    label: type.label,
    meta_template_name: null,
    meta_template_language: "en_US",
    variables: [...type.variables],
    body_preview: "",
    meta_approval_status: "unknown" as const,
    meta_approval_checked_at: null,
    enabled: true,
    updated_at: new Date().toISOString(),
  });

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex items-center gap-3">
        <Link className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white" href="/settings">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">Configuration</p>
          <h1 className="font-display mt-1 text-3xl font-black tracking-[-0.055em] sm:text-4xl">WhatsApp Notifications</h1>
        </div>
      </div>
      <p className="mt-2 max-w-2xl text-sm font-medium text-[#6c7773]">
        Direct Meta WhatsApp Cloud API integration. Templates below must already be created and approved in Meta Business Manager — this page only registers the approved
        name/language against each notification type and lets you check current approval status.
      </p>

      <WhatsAppSettingsForm settings={settings} templates={templates} />
    </div>
  );
}
