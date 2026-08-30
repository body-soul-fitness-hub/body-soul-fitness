"use client";
import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { issuePortalCode, type PortalState } from "@/app/member/actions";
const initial: PortalState = {};
export function PortalAccessForm({ memberRowId, activated }: { memberRowId: string; activated: boolean }) {
  const [state, action, pending] = useActionState(issuePortalCode, initial);
  return <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6"><p className="flex items-center gap-2 text-sm font-extrabold"><KeyRound size={17} className="text-[#2563eb]" /> Member portal access</p><p className="mt-1 text-xs font-medium text-[#89938f]">{activated ? "Reset access by issuing a new in-person setup code." : "Issue an in-person code so the member can create their password."}</p><form action={action} className="mt-4"><input type="hidden" name="member_row_id" value={memberRowId} /><button className="rounded-xl bg-[#10264a] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-60" disabled={pending}>{pending ? "Generating…" : activated ? "Reset password & issue code" : "Enable portal & issue code"}</button></form>{state.success && <p className="mt-3 rounded-xl bg-[#e7f7c5] p-3 text-xs font-bold text-[#4f6d1e]">{state.success}</p>}{state.error && <p className="mt-3 text-xs font-bold text-[#a94f37]">{state.error}</p>}</section>;
}
