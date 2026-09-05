"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Member = { id: string; member_id: string; full_name: string; mobile_number: string; status: string };

export default function MemberSearchInput({ name = "q", defaultValue = "", placeholder, className, navigateOnSelect = false }: { name?: string; defaultValue?: string; placeholder: string; className?: string; navigateOnSelect?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.trim().length < 2) { setMembers([]); setOpen(false); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/member-search?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        const data = await response.json();
        setMembers(data.members ?? []);
        setOpen(true);
      } catch { /* A new keystroke cancels the prior request. */ }
      finally { setLoading(false); }
    }, 180);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [value]);

  function choose(member: Member) {
    setValue(member.full_name);
    setOpen(false);
    if (navigateOnSelect) router.push(`/members/${member.id}`);
    else {
      if (inputRef.current) inputRef.current.value = member.full_name;
      inputRef.current?.form?.requestSubmit();
    }
  }

  return <div className="relative min-w-0 flex-1"><input autoComplete="off" className={className} name={name} onBlur={() => { dismissTimer.current = setTimeout(() => setOpen(false), 140); }} onChange={(event) => setValue(event.target.value)} onFocus={() => members.length > 0 && setOpen(true)} placeholder={placeholder} ref={inputRef} type="search" value={value} />{open && <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-[#dce7f8] bg-white py-1 shadow-xl shadow-[#10264a]/15">{loading ? <p className="px-3 py-2 text-xs font-medium text-[#71809a]">Searching members…</p> : members.length ? members.map((member) => <button className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[#f4f8ff]" key={member.id} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(member)} type="button"><span><span className="block text-sm font-extrabold text-[#10264a]">{member.full_name}</span><span className="mt-0.5 block text-[11px] font-medium text-[#71809a]">{member.member_id} · {member.mobile_number}</span></span><span className="rounded-full bg-[#eef4ff] px-2 py-1 text-[10px] font-extrabold uppercase text-[#1d5de8]">{member.status}</span></button>) : <p className="px-3 py-2 text-xs font-medium text-[#71809a]">No member matches “{value}”.</p>}</div>}</div>;
}
