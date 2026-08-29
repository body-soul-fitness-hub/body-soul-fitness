import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlanForm } from "../plan-form";

export default function NewPlanPage() {
  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex items-center gap-3">
        <Link className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white" href="/plans">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">New plan</p>
          <h1 className="font-display mt-1 text-2xl font-black tracking-[-0.05em] sm:text-3xl">Create a membership plan</h1>
        </div>
      </div>

      <PlanForm />
    </div>
  );
}
