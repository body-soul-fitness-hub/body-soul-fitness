import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, CalendarClock, StickyNote, UserCheck } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  ENQUIRY_SOURCES,
  ENQUIRY_STATUSES,
  GENDERS,
  WORKOUT_TIMES,
  calculateAge,
  labelFor,
  type Enquiry,
  type EnquiryActivity,
} from "@/lib/enquiries/types";
import { FollowUpForm, StatusForm } from "./detail-forms";

function statusTone(status: string): string {
  switch (status) {
    case "converted":
      return "bg-[#c9f36a] text-[#172a24]";
    case "not_interested":
      return "bg-[#ffe5dc] text-[#a94f37]";
    case "follow_up_due":
      return "bg-[#ffe9c7] text-[#8a5a12]";
    default:
      return "bg-[#e4efea] text-[#27463b]";
  }
}

function activityDescription(activity: EnquiryActivity): string {
  if (activity.activity_type === "status_change") {
    return `Status changed from ${labelFor(ENQUIRY_STATUSES, activity.previous_status)} to ${labelFor(ENQUIRY_STATUSES, activity.new_status)}`;
  }
  if (activity.activity_type === "converted") {
    return activity.note ?? "Converted to member";
  }
  if (activity.activity_type === "follow_up_scheduled") {
    return `Follow-up scheduled for ${activity.next_follow_up_date}${activity.note ? ` — ${activity.note}` : ""}`;
  }
  return activity.note ?? "Note added";
}

function activityIcon(type: EnquiryActivity["activity_type"]) {
  switch (type) {
    case "status_change":
      return ArrowRightLeft;
    case "converted":
      return UserCheck;
    case "follow_up_scheduled":
      return CalendarClock;
    default:
      return StickyNote;
  }
}

export default async function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: enquiry, error }, { data: activities }] = await Promise.all([
    supabaseAdmin.from("enquiries").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin.from("enquiry_activities").select("*").eq("enquiry_id", id).order("created_at", { ascending: false }),
  ]);

  if (error || !enquiry) {
    notFound();
  }

  const record = enquiry as Enquiry;
  const age = calculateAge(record.date_of_birth);

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white" href="/enquiries">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">Enquiry</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="font-display text-2xl font-black tracking-[-0.05em] sm:text-3xl">{record.full_name}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusTone(record.status)}`}>{labelFor(ENQUIRY_STATUSES, record.status)}</span>
            </div>
          </div>
        </div>

        {record.status !== "converted" ? (
          <Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111c19] px-5 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15" href={`/members/new?enquiryId=${record.id}`}>
            <UserCheck size={17} /> Convert to member
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl bg-[#e7f7c5] px-5 py-3 text-sm font-extrabold text-[#4f6d1e]">
            <UserCheck size={17} /> Already converted
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
            <p className="text-sm font-extrabold">Enquiry details</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="Mobile number" value={record.mobile_number} />
              <Detail label="WhatsApp number" value={record.whatsapp_number} />
              <Detail label="Gender" value={labelFor(GENDERS, record.gender)} />
              <Detail label="Date of birth" value={record.date_of_birth ? `${record.date_of_birth}${age !== null ? ` (${age} yrs)` : ""}` : null} />
              <Detail className="sm:col-span-2" label="Address" value={record.address} />
              <Detail label="Source of enquiry" value={labelFor(ENQUIRY_SOURCES, record.source)} />
              <Detail label="Fitness goal" value={record.fitness_goal} />
              <Detail label="Interested plan" value={record.interested_plan} />
              <Detail label="Preferred workout time" value={labelFor(WORKOUT_TIMES, record.preferred_workout_time)} />
              <Detail label="Enquiry date" value={record.enquiry_date} />
              <Detail label="Follow-up date" value={record.follow_up_date} />
              <Detail label="Assigned staff" value={record.assigned_staff} />
              <Detail className="sm:col-span-2" label="Notes" value={record.notes} />
            </dl>
          </section>

          <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
            <p className="text-sm font-extrabold">Status</p>
            <div className="mt-4">
              <StatusForm currentStatus={record.status} enquiryId={record.id} />
            </div>
          </section>

          <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
            <p className="text-sm font-extrabold">Add note / schedule follow-up</p>
            <div className="mt-4">
              <FollowUpForm enquiryId={record.id} />
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
          <p className="text-sm font-extrabold">Activity timeline</p>
          <ol className="mt-5 space-y-5">
            {(activities ?? []).length === 0 && <p className="text-sm font-medium text-[#6c7773]">No activity yet.</p>}
            {(activities as EnquiryActivity[] | null ?? []).map((activity) => {
              const Icon = activityIcon(activity.activity_type);
              return (
                <li className="flex gap-3" key={activity.id}>
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e4efea] text-[#27463b]">
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-snug">{activityDescription(activity)}</p>
                    <p className="mt-0.5 text-xs font-medium text-[#89938f]">
                      {new Date(activity.created_at).toLocaleString()}{activity.staff_member ? ` · ${activity.staff_member}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Detail({ label, value, className }: { label: string; value: string | null | undefined; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-extrabold uppercase tracking-wide text-[#89938f]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[#0f1816]">{value || "—"}</dd>
    </div>
  );
}
