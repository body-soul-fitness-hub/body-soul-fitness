import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Plan } from "@/lib/plans/types";
import { SubscriptionForm } from "./subscription-form";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewSubscriptionPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolved = await searchParams;
  const memberId = first(resolved.memberId);
  const renewedFromId = first(resolved.renewedFromId);

  const [{ data: plans }, { data: member }, { data: renewedFrom }] = await Promise.all([
    supabaseAdmin.from("plans").select("*").eq("is_active", true).order("duration_value", { ascending: true }),
    memberId ? supabaseAdmin.from("members").select("id, member_id, full_name, mobile_number").eq("id", memberId).maybeSingle() : Promise.resolve({ data: null }),
    renewedFromId ? supabaseAdmin.from("member_subscriptions").select("plan_id").eq("id", renewedFromId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex items-center gap-3">
        <Link className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white" href={member ? `/members/${member.id}` : "/subscriptions"}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">{renewedFromId ? "Renew subscription" : "New subscription"}</p>
          <h1 className="font-display mt-1 text-2xl font-black tracking-[-0.05em] sm:text-3xl">
            {member ? `Subscribe ${member.full_name}` : "Create a subscription"}
          </h1>
        </div>
      </div>

      <SubscriptionForm
        plans={(plans ?? []) as Plan[]}
        preselectedMember={member ?? null}
        preselectedPlanId={renewedFrom?.plan_id ?? undefined}
        renewedFromId={renewedFromId}
      />
    </div>
  );
}
