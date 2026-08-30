"use client";

import { useActionState, useState } from "react";
import { X } from "lucide-react";
import { sendCustomNotification, type FormState } from "@/app/(admin)/notifications/actions";
import { searchMembers } from "@/app/(admin)/subscriptions/actions";
import { MEMBER_STATUSES, PLAN_STATUSES } from "@/lib/members/types";

const initialState: FormState = {};
const inputClass = "w-full rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5 text-sm font-medium text-[#0f1816] outline-none transition focus:border-[#111c19] focus:bg-white";

type MemberOption = { id: string; member_id: string; full_name: string; mobile_number: string };
type Mode = "single" | "multiple" | "group";

export function SendCustomNotificationForm() {
  const [state, formAction, pending] = useActionState(sendCustomNotification, initialState);
  const [mode, setMode] = useState<Mode>("single");
  const [selected, setSelected] = useState<MemberOption[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberOption[]>([]);
  const [searching, setSearching] = useState(false);

  async function onSearch(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const matches = await searchMembers(value);
    setResults(matches);
    setSearching(false);
  }

  function addMember(member: MemberOption) {
    setSelected((prev) => (prev.some((m) => m.id === member.id) ? prev : mode === "single" ? [member] : [...prev, member]));
    setQuery("");
    setResults([]);
  }

  function removeMember(id: string) {
    setSelected((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <form action={formAction} className="mt-6 max-w-2xl space-y-6">
      {state.error && <div className="rounded-xl bg-[#ffe5dc] px-4 py-3 text-sm font-bold text-[#a94f37]">{state.error}</div>}

      <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6 sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Recipients</p>
        <div className="mt-4 flex gap-2">
          {(["single", "multiple", "group"] as Mode[]).map((option) => (
            <button
              className={`rounded-xl px-4 py-2 text-xs font-extrabold ${mode === option ? "bg-[#111c19] text-white" : "border border-[#e5e9e5] bg-white text-[#0f1816]"}`}
              key={option}
              onClick={() => {
                setMode(option);
                setSelected([]);
              }}
              type="button"
            >
              {option === "single" ? "Single member" : option === "multiple" ? "Multiple members" : "Filtered group"}
            </button>
          ))}
        </div>
        <input name="recipient_mode" type="hidden" value={mode} />

        {(mode === "single" || mode === "multiple") && (
          <div className="mt-4">
            <input className={inputClass} onChange={(event) => onSearch(event.target.value)} placeholder="Search by name, mobile, or member ID" type="text" value={query} />
            {searching && <p className="mt-1.5 text-xs font-medium text-[#89938f]">Searching…</p>}
            {results.length > 0 && (
              <ul className="mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-[#e5e9e5] bg-white">
                {results.map((member) => (
                  <li key={member.id}>
                    <button className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-[#f9faf8]" onClick={() => addMember(member)} type="button">
                      <span className="font-bold">{member.full_name}</span>
                      <span className="text-xs font-medium text-[#89938f]">{member.member_id} · {member.mobile_number}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selected.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {selected.map((member) => (
                  <li className="flex items-center gap-2 rounded-xl bg-[#e4efea] px-3 py-1.5 text-xs font-extrabold text-[#27463b]" key={member.id}>
                    {member.full_name}
                    <button onClick={() => removeMember(member.id)} type="button"><X size={13} /></button>
                    <input name="member_ids" type="hidden" value={member.id} />
                  </li>
                ))}
              </ul>
            )}
            {selected.length === 0 && <p className="mt-2 text-xs font-medium text-[#89938f]">No recipients selected yet.</p>}
          </div>
        )}

        {mode === "group" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-extrabold text-[#3a4542]">
              Member status
              <select className={`${inputClass} mt-1.5`} name="status">
                <option value="">Any</option>
                {MEMBER_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-extrabold text-[#3a4542]">
              Plan status
              <select className={`${inputClass} mt-1.5`} name="planStatus">
                <option value="">Any</option>
                {PLAN_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-extrabold text-[#3a4542]">
              Assigned trainer
              <input className={`${inputClass} mt-1.5`} name="trainer" type="text" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-extrabold text-[#3a4542]">
                Joined from
                <input className={`${inputClass} mt-1.5`} name="from" type="date" />
              </label>
              <label className="block text-xs font-extrabold text-[#3a4542]">
                Joined to
                <input className={`${inputClass} mt-1.5`} name="to" type="date" />
              </label>
            </div>
            <p className="text-xs font-medium text-[#89938f] sm:col-span-2">Leave every field blank to target all members — use with care.</p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6 sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#89938f]">Message</p>
        <p className="mt-1 text-xs font-medium text-[#89938f]">Available variables: {"{{member_name}}"}, {"{{member_id}}"}, {"{{plan_name}}"}, {"{{end_date}}"}, {"{{gym_name}}"}</p>
        <textarea className={`${inputClass} mt-3`} name="message" placeholder="Hi {{member_name}}, ..." required rows={4} />

        <label className="mt-4 block text-xs font-extrabold text-[#3a4542]">
          Your name
          <input className={`${inputClass} mt-1.5`} name="performed_by" placeholder="Staff member sending this" type="text" />
        </label>
      </section>

      <button className="inline-flex items-center justify-center rounded-xl bg-[#111c19] px-6 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15 disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
