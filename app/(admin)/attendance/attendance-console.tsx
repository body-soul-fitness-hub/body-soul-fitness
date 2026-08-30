"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Keyboard, ScanLine, XCircle } from "lucide-react";
import { recordAttendance } from "./actions";
import type { AttendanceResult } from "@/lib/attendance/types";

const initial: AttendanceResult | null = null;

export function AttendanceConsole() {
  const [state, action, pending] = useActionState(recordAttendance, initial);
  const [camera, setCamera] = useState(false); const [value, setValue] = useState(""); const [mode, setMode] = useState<"qr" | "manual">("qr");
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null); const busy = useRef(false);
  useEffect(() => () => stream.current?.getTracks().forEach((track) => track.stop()), []);
  useEffect(() => {
    if (!camera) { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; return; }
    let alive = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } }).then((s) => { if (!alive) return s.getTracks().forEach(t => t.stop()); stream.current = s; if (video.current) video.current.srcObject = s; }).catch(() => setCamera(false));
    return () => { alive = false; };
  }, [camera]);
  useEffect(() => {
    if (!camera || !("BarcodeDetector" in window)) return;
    const Detector = (window as unknown as { BarcodeDetector: new (options: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    const detector = new Detector({ formats: ["qr_code"] });
    const timer = window.setInterval(async () => { if (!video.current || busy.current || video.current.readyState < 2) return; busy.current = true; try { const result = await detector.detect(video.current); if (result[0]?.rawValue) { setValue(result[0].rawValue); setCamera(false); } } finally { busy.current = false; } }, 650);
    return () => clearInterval(timer);
  }, [camera]);
  return <section className="rounded-3xl border border-[#dceaff] bg-white p-5 shadow-[0_12px_35px_rgba(37,99,235,.05)] sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-extrabold">Reception scanner</p><p className="mt-1 text-xs font-medium text-[#6980a5]">A new scan checks in; an open visit checks out.</p></div><div className="flex rounded-xl bg-[#f0f6ff] p-1"><button onClick={() => setMode("qr")} className={`rounded-lg px-3 py-2 text-xs font-extrabold ${mode === "qr" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#6980a5]"}`}>QR scan</button><button onClick={() => setMode("manual")} className={`rounded-lg px-3 py-2 text-xs font-extrabold ${mode === "manual" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#6980a5]"}`}>Manual</button></div></div>
    {mode === "qr" && <div className="mt-5 overflow-hidden rounded-2xl bg-[#10264a] p-3">{camera ? <video className="aspect-video w-full rounded-xl object-cover" autoPlay muted playsInline ref={video} /> : <div className="grid aspect-video place-items-center rounded-xl border border-white/10 bg-white/5 text-center text-[#b8d0ff]"><div><Camera className="mx-auto" size={28} /><p className="mt-3 text-sm font-bold">Use this device&apos;s rear camera</p></div></div>}<button onClick={() => setCamera(!camera)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-extrabold text-white"><ScanLine size={17} /> {camera ? "Stop camera" : "Start camera scanner"}</button>{camera && !("BarcodeDetector" in window) && <p className="mt-2 text-center text-xs text-[#b8d0ff]">This browser cannot read QR codes automatically. Use Manual to enter the value.</p>}</div>}
    <form action={action} className="mt-5 space-y-3"><input name="mode" type="hidden" value={mode} /><input name="staff" type="hidden" value="Front desk" /><input name="device" type="hidden" value={typeof navigator === "undefined" ? "Staff scanner" : navigator.userAgent.slice(0, 100)} /><label className="block text-xs font-extrabold text-[#526d98]">{mode === "qr" ? "Scanned QR payload" : "Member ID, mobile number, or member name"}</label><div className="flex gap-2"><input required name="scan_value" value={value} onChange={(e) => setValue(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#dceaff] px-3 py-3 text-sm outline-none focus:border-[#2563eb]" placeholder={mode === "qr" ? "Scan to fill automatically" : "e.g. BSFC-000001 or 9876543210"} /><button disabled={pending} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#10264a] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"><Keyboard size={16} /> {pending ? "Saving…" : "Record"}</button></div></form>
    {state && <div className={`mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm font-bold ${state.ok ? "bg-[#e7f7c5] text-[#4f6d1e]" : "bg-[#fff0f1] text-[#a83848]"}`}>{state.ok ? <CheckCircle2 size={19} /> : <XCircle size={19} />}<p>{state.message}</p></div>}
  </section>;
}
