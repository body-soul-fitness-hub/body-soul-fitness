import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Plan } from "@/lib/plans/types";
import { PlanForm } from "../../plan-form";

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: plan, error } = await supabaseAdmin.from("plans").select("*").eq("id", id).maybeSingle();

  if (error || !plan) {
    notFound();
  }

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex items-center gap-3">
        <Link className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white" href="/plans">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">Edit plan</p>
          <h1 className="font-display mt-1 text-2xl font-black tracking-[-0.05em] sm:text-3xl">{(plan as Plan).name}</h1>
        </div>
      </div>

      <PlanForm plan={plan as Plan} />
    </div>
  );
}
