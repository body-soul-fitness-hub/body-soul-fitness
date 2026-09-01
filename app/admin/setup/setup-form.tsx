"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createFirstSuperAdmin, type AdminFormState } from "../actions";

const initial: AdminFormState = {};

export default function SetupForm() {
  const [state, action, pending] = useActionState(createFirstSuperAdmin, initial);
  return (
    <main className="min-h-screen bg-[#f7fbff] px-5 py-10 text-[#10264a]">
      <div className="mx-auto max-w-sm">
        <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[#2563eb]"><span className="grid size-8 place-items-center rounded-xl bg-[#2563eb] text-white">✦</span> BODY &amp; SOUL</p>
        <h1 className="mt-10 font-display text-3xl font-black tracking-[-.05em]">Create super-admin access</h1>
        <p className="mt-2 text-sm font-medium text-[#6980a5]">This one-time screen creates the owner account for the dashboard.</p>
        <form action={action} className="mt-7 space-y-3 rounded-3xl border border-[#dceaff] bg-white p-5">
          <Field label="Your full name" name="full_name" autoComplete="name" />
          <Field label="Your email address" name="email" type="email" autoComplete="email" />
          <Field label="Create password" name="password" type="password" autoComplete="new-password" hint="At least 12 characters" />
          <Field label="Private setup key" name="setup_key" type="password" hint="From the server environment; never share it" />
          {state.error && <p className="rounded-xl bg-[#fff0f1] p-3 text-xs font-bold text-[#a83848]">{state.error}</p>}
          {state.success && <p className="rounded-xl bg-[#e7f7c5] p-3 text-xs font-bold text-[#4f6d1e]">{state.success} <Link className="underline" href="/admin/login">Sign in</Link></p>}
          <button disabled={pending} className="w-full rounded-xl bg-[#2563eb] py-3 text-sm font-extrabold text-white disabled:opacity-60">{pending ? "Creating…" : "Create owner account"}</button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, name, type = "text", autoComplete, hint }: { label: string; name: string; type?: string; autoComplete?: string; hint?: string }) {
  return <label className="block text-xs font-extrabold">{label}<input required autoComplete={autoComplete} className="mt-1.5 w-full rounded-xl border border-[#dceaff] px-3 py-3 text-sm font-medium outline-none focus:border-[#2563eb]" name={name} type={type} />{hint && <span className="mt-1 block text-[11px] font-medium text-[#6980a5]">{hint}</span>}</label>;
}
