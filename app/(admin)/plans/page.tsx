import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { durationLabel, type Plan } from "@/lib/plans/types";
import { setPlanActive } from "./actions";

export default async function PlansPage() {
  const { data, error } = await supabaseAdmin.from("plans").select("*").order("duration_value", { ascending: true }).order("name", { ascending: true });
  const plans = (data ?? []) as Plan[];

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="flex items-center gap-3">
          <Link className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white" href="/subscriptions">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">Plans & billing</p>
            <h1 className="font-display mt-2 text-3xl font-black tracking-[-0.055em] sm:text-4xl">Plans</h1>
          </div>
        </div>
        <Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111c19] px-5 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15" href="/plans/new">
          <Plus size={17} /> New plan
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-3xl border border-[#e5e9e5] bg-white">
        {error ? (
          <p className="p-6 text-sm font-bold text-[#a94f37]">Could not load plans: {error.message}</p>
        ) : plans.length === 0 ? (
          <p className="p-8 text-center text-sm font-medium text-[#6c7773]">No plans yet. Create one for a 1 Month, 3 Months, 6 Months, or 1 Year membership.</p>
        ) : (
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e9e5] text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
                <th className="px-5 py-3.5">Plan</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Standard price</th>
                <th className="px-5 py-3.5">Discount</th>
                <th className="px-5 py-3.5">Final price</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr className="border-b border-[#f0f2f0] last:border-0 hover:bg-[#f9faf8]" key={plan.id}>
                  <td className="px-5 py-3.5">
                    <p className="font-extrabold">{plan.name}</p>
                    {plan.description && <p className="mt-0.5 max-w-[240px] truncate text-xs font-medium text-[#89938f]">{plan.description}</p>}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-[#3a4542]">{durationLabel(plan.duration_unit, plan.duration_value)}</td>
                  <td className="px-5 py-3.5 font-medium text-[#3a4542]">₹{plan.standard_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="px-5 py-3.5 font-medium text-[#3a4542]">
                    {plan.discount_type ? `${plan.discount_value}${plan.discount_type === "percentage" ? "%" : " ₹"}` : "—"}
                  </td>
                  <td className="px-5 py-3.5 font-extrabold text-[#27463b]">₹{plan.final_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${plan.is_active ? "bg-[#e7f7c5] text-[#4f6d1e]" : "bg-[#e4efea] text-[#27463b]"}`}>
                      {plan.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-3">
                      <Link className="inline-flex items-center gap-1 text-xs font-extrabold text-[#577c25]" href={`/plans/${plan.id}/edit`}>
                        <Pencil size={13} /> Edit
                      </Link>
                      <form action={setPlanActive}>
                        <input name="plan_id" type="hidden" value={plan.id} />
                        <input name="is_active" type="hidden" value={String(plan.is_active)} />
                        <button className="text-xs font-extrabold text-[#6c7773] underline" type="submit">
                          {plan.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
