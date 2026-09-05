"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_GYM_SETTINGS, GYM_SETTINGS_ID } from "@/lib/settings/types";
import { buildMembersQuery, getMemberIdsForPlanStatus, parseMemberFilters } from "@/lib/members/filters";
import { sendNotification } from "@/lib/whatsapp/send";
import type { PlanStatus } from "@/lib/members/types";

export type FormState = {
  error?: string;
};

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function resolveTargetMemberIds(formData: FormData): Promise<string[]> {
  const mode = str(formData, "recipient_mode");

  if (mode === "single" || mode === "multiple") {
    return formData.getAll("member_ids").filter((v): v is string => typeof v === "string" && v.length > 0);
  }

  // Filtered group — same filter set as the /members list.
  const filters = parseMemberFilters({
    status: str(formData, "status") ?? undefined,
    planStatus: str(formData, "planStatus") ?? undefined,
    trainer: str(formData, "trainer") ?? undefined,
    from: str(formData, "from") ?? undefined,
    to: str(formData, "to") ?? undefined,
  });

  let restrictToIds: string[] | undefined;
  if (filters.planStatus) restrictToIds = await getMemberIdsForPlanStatus(filters.planStatus as PlanStatus);

  const { data } = await buildMembersQuery(filters, restrictToIds);
  return (data ?? []).map((row) => row.id as string);
}

export async function sendCustomNotification(_prevState: FormState, formData: FormData): Promise<FormState> {
  const message = str(formData, "message");
  const performedBy = str(formData, "performed_by");
  const recipientMode = str(formData, "recipient_mode");

  if (!message) return { error: "Write a message before sending." };

  const memberIds = await resolveTargetMemberIds(formData);
  if (memberIds.length === 0) return { error: "Select at least one recipient." };
  if (recipientMode === "group" && !str(formData, "status") && !str(formData, "planStatus") && !str(formData, "trainer") && !str(formData, "from") && !str(formData, "to") && formData.get("confirm_all_members") !== "on") {
    return { error: "Confirm that you intend to send this campaign to all eligible members." };
  }

  const { data: settingsRow } = await supabaseAdmin.from("gym_settings").select("gym_name").eq("id", GYM_SETTINGS_ID).maybeSingle();
  const gymName = settingsRow?.gym_name ?? DEFAULT_GYM_SETTINGS.gym_name;

  const { data: members } = await supabaseAdmin.from("members").select("id, full_name, member_id").in("id", memberIds);
  const { data: subscriptions } = await supabaseAdmin
    .from("member_subscriptions")
    .select("member_id, plan_name, end_date")
    .in("member_id", memberIds)
    .eq("status", "active")
    .order("end_date", { ascending: false });

  const planByMember = new Map<string, { plan_name: string; end_date: string | null }>();
  for (const sub of subscriptions ?? []) {
    if (!planByMember.has(sub.member_id as string)) {
      planByMember.set(sub.member_id as string, { plan_name: sub.plan_name as string, end_date: sub.end_date as string | null });
    }
  }

  let sent = 0;
  let failed = 0;

  for (const member of members ?? []) {
    const plan = planByMember.get(member.id as string);
    const rendered = message
      .replaceAll("{{member_name}}", member.full_name as string)
      .replaceAll("{{member_id}}", member.member_id as string)
      .replaceAll("{{plan_name}}", plan?.plan_name ?? "")
      .replaceAll("{{end_date}}", plan?.end_date ?? "")
      .replaceAll("{{gym_name}}", gymName);

    const result = await sendNotification({
      memberId: member.id as string,
      notificationType: "custom",
      triggerSource: "staff",
      performedBy,
      variables: { message: rendered },
    });

    if (result.ok) sent += 1;
    else failed += 1;
  }

  redirect(`/notifications?sent=${sent}&failed=${failed}`);
}
