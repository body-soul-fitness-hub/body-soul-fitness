"use client";

import { Download, Printer, QrCode } from "lucide-react";

export function MemberQrCard({ memberId, name, payload }: { memberId: string; name: string; payload: string }) {
  const imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&format=svg&data=${encodeURIComponent(payload)}`;
  function printQr() { window.print(); }
  return <section className="qr-print rounded-3xl border border-[#e5e9e5] bg-white p-6">
    <div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-extrabold"><QrCode size={18} className="text-[#2563eb]" /> Member QR pass</p><p className="mt-1 text-xs font-medium text-[#89938f]">Scan at reception to check in or check out.</p></div><span className="rounded-full bg-[#e7f7c5] px-2.5 py-1 text-[11px] font-extrabold text-[#4f6d1e]">Secure</span></div>
    {/* The opaque, signed payload is verified server-side; it never exposes the database row ID. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="mx-auto mt-4 size-48 rounded-xl border border-[#edf0ed] p-2" src={imageUrl} alt={`QR code for ${name}`} />
    <p className="mt-2 text-center text-sm font-extrabold">{name}</p><p className="text-center text-xs font-bold text-[#699238]">{memberId}</p>
    <div className="mt-5 grid grid-cols-2 gap-2"><a className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#dceaff] px-3 py-2.5 text-xs font-extrabold text-[#2563eb]" href={imageUrl} download={`${memberId}-qr.svg`}><Download size={14} /> Download</a><button onClick={printQr} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#10264a] px-3 py-2.5 text-xs font-extrabold text-white"><Printer size={14} /> Print</button></div>
  </section>;
}
