import Link from "next/link";
import { Archive, ClipboardList, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_GYM_SETTINGS, GYM_SETTINGS_ID, type GymSettings } from "@/lib/settings/types";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { data } = await supabaseAdmin.from("gym_settings").select("*").eq("id", GYM_SETTINGS_ID).maybeSingle();
  const settings: GymSettings = { id: GYM_SETTINGS_ID, updated_at: new Date().toISOString(), ...DEFAULT_GYM_SETTINGS, ...(data ?? {}) };

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">Configuration</p>
          <h1 className="font-display mt-2 text-3xl font-black tracking-[-0.055em] sm:text-4xl">Settings</h1>
          <p className="mt-2 max-w-xl text-sm font-medium text-[#6c7773]">Gym contact details and tax configuration used on every generated invoice and receipt.</p>
        </div>
        <Link className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e9e5] bg-white px-4 py-3 text-sm font-extrabold text-[#0f1816]" href="/settings/whatsapp">
          <MessageCircle size={16} /> WhatsApp settings
        </Link>
      </div>

      <SettingsForm settings={settings} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SettingsLink href="/settings/admin-access" icon={<ShieldCheck size={18}/>} title="Super-admin access" text="Create another owner account" />
        <SettingsLink href="/settings/whatsapp" icon={<MessageCircle size={18}/>} title="WhatsApp" text="Configuration & templates" />
        <SettingsLink href="/settings/staff" icon={<Users size={18}/>} title="Staff & roles" text="Directory and access roles" />
        <SettingsLink href="/settings/audit" icon={<ClipboardList size={18}/>} title="Audit log" text="Important system changes" />
        <SettingsLink href="/settings/data-export" icon={<Archive size={18}/>} title="Data backup" text="Download operational records" />
      </div>
    </div>
  );
}

function SettingsLink({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) { return <Link href={href} className="rounded-2xl border border-[#e5e9e5] bg-white p-4 transition hover:border-[#a9c88b]"><div className="text-[#699238]">{icon}</div><p className="mt-3 text-sm font-extrabold">{title}</p><p className="mt-1 text-xs font-medium text-[#89938f]">{text}</p></Link>; }
