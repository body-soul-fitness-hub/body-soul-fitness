"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

export function WhatsAppButton({ href, label, compact = false }: { href: string | null; label: string; compact?: boolean }) {
  const [showWarning, setShowWarning] = useState(false);

  if (href) {
    return (
      <a className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#25d366] font-extrabold text-white ${compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"}`} href={href} rel="noreferrer" target="_blank">
        <MessageCircle size={compact ? 14 : 16} /> {label}
      </a>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e9e5] bg-white font-extrabold text-[#6c7773] ${compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"}`} onClick={() => setShowWarning(true)} type="button">
        <MessageCircle size={compact ? 14 : 16} /> {label}
      </button>
      {showWarning && <span className="max-w-64 text-right text-xs font-bold text-[#a94f37]">Valid WhatsApp/mobile number is not available for this member.</span>}
    </span>
  );
}
