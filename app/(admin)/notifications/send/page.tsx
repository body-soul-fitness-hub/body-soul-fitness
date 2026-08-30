import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SendCustomNotificationForm } from "./send-form";

export default function SendNotificationPage() {
  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex items-center gap-3">
        <Link className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white" href="/notifications">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">WhatsApp</p>
          <h1 className="font-display mt-1 text-3xl font-black tracking-[-0.055em] sm:text-4xl">Send custom message</h1>
        </div>
      </div>
      <p className="mt-2 max-w-2xl text-sm font-medium text-[#6c7773]">
        Send to one member, several selected members, or a filtered group. Only members who have given WhatsApp consent and haven&apos;t opted out of promotional messages will actually receive it —
        everyone else is logged as skipped with the reason.
      </p>

      <SendCustomNotificationForm />
    </div>
  );
}
