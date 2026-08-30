"use client";

import { useActionState, useState } from "react";
import { KeyRound } from "lucide-react";
import { resetSuperAdminPassword, type AdminFormState } from "@/app/admin/actions";

type Administrator = { id: string; full_name: string; email: string; is_active: boolean; created_at: string };

const initial: AdminFormState = {};

function ResetPasswordRow({ admin }: { admin: Administrator }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(resetSuperAdminPassword, initial);
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">{admin.full_name}</p>
          <p className="mt-0.5 text-xs text-[#6980a5]">{admin.email} · {admin.is_active ? "Active" : "Disabled"} · Added {new Date(admin.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#dceaff] px-3 py-2 text-xs font-extrabold text-[#2563eb]"><KeyRound size={14} /> {open ? "Cancel" : "Set / reset password"}</button>
      </div>
      {open && (
        <form action={action} className="mt-3 rounded-2xl bg-[#f7fbff] p-4">
          <input type="hidden" name="staff_id" value={admin.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-extrabold">New password<input required minLength={12} autoComplete="new-password" className="mt-1.5 w-full rounded-xl border border-[#dceaff] px-3 py-2.5 text-sm outline-none focus:border-[#2563eb]" name="password" type="password" /></label>
            <label className="block text-xs font-extrabold">Confirm new password<input required minLength={12} autoComplete="new-password" className="mt-1.5 w-full rounded-xl border border-[#dceaff] px-3 py-2.5 text-sm outline-none focus:border-[#2563eb]" name="confirm_password" type="password" /></label>
          </div>
          {state.error && <p className="mt-3 rounded-xl bg-[#fff0f1] p-3 text-xs font-bold text-[#a83848]">{state.error}</p>}
          {state.success && <p className="mt-3 rounded-xl bg-[#e7f7c5] p-3 text-xs font-bold text-[#4f6d1e]">{state.success}</p>}
          <button disabled={pending} className="mt-3 rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-60">{pending ? "Saving…" : "Save new password"}</button>
        </form>
      )}
    </div>
  );
}

export default function AdminAccessTable({ administrators, loadError }: { administrators: Administrator[]; loadError: boolean }) {
  return (
    <section className="rounded-3xl border border-[#dceaff] bg-white p-5">
      <h2 className="font-display text-xl font-black">All super-admin accounts</h2>
      <p className="mt-1 text-xs font-medium text-[#6980a5]">{administrators.length} {administrators.length === 1 ? "person has" : "people have"} super-admin access to this dashboard. Set or reset a password for any of them below.</p>
      {loadError ? (
        <p className="mt-4 text-sm font-bold text-[#a83848]">Could not load administrators.</p>
      ) : administrators.length === 0 ? (
        <p className="mt-4 text-sm font-medium text-[#6980a5]">No super-admin accounts yet.</p>
      ) : (
        <div className="mt-2 divide-y divide-[#e7effb]">{administrators.map((admin) => <ResetPasswordRow admin={admin} key={admin.id} />)}</div>
      )}
    </section>
  );
}
