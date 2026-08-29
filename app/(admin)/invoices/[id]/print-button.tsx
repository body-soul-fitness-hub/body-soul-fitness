"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e9e5] bg-white px-4 py-3 text-sm font-extrabold text-[#0f1816]"
      onClick={() => window.print()}
      type="button"
    >
      <Printer size={16} /> Print
    </button>
  );
}
