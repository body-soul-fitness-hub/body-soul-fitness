"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ENQUIRY_SOURCES, ENQUIRY_STATUSES } from "@/lib/enquiries/types";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const SOURCE_VALUES = new Set(ENQUIRY_SOURCES.map((source) => source.value));
const STATUS_VALUES = new Set(ENQUIRY_STATUSES.map((status) => status.value));

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function checkMobileExists(mobileNumber: string): Promise<{ id: string; full_name: string } | null> {
  const trimmed = mobileNumber.trim();
  if (!trimmed) return null;

  const { data } = await supabaseAdmin
    .from("enquiries")
    .select("id, full_name")
    .eq("mobile_number", trimmed)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export async function createEnquiry(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fullName = str(formData, "full_name");
  const mobileNumber = str(formData, "mobile_number");
  const source = str(formData, "source");

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.full_name = "Full name is required.";
  if (!mobileNumber) fieldErrors.mobile_number = "Mobile number is required.";
  else if (!/^[0-9+][0-9\s-]{6,19}$/.test(mobileNumber)) fieldErrors.mobile_number = "Enter a valid mobile number.";
  if (!source || !SOURCE_VALUES.has(source as never)) fieldErrors.source = "Select a source of enquiry.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const { data, error } = await supabaseAdmin
    .from("enquiries")
    .insert({
      full_name: fullName,
      mobile_number: mobileNumber,
      whatsapp_number: str(formData, "whatsapp_number"),
      gender: str(formData, "gender"),
      date_of_birth: str(formData, "date_of_birth"),
      address: str(formData, "address"),
      source,
      fitness_goal: str(formData, "fitness_goal"),
      interested_plan: str(formData, "interested_plan"),
      preferred_workout_time: str(formData, "preferred_workout_time"),
      enquiry_date: str(formData, "enquiry_date") ?? new Date().toISOString().slice(0, 10),
      follow_up_date: str(formData, "follow_up_date"),
      notes: str(formData, "notes"),
      assigned_staff: str(formData, "assigned_staff"),
      status: str(formData, "status") ?? "new",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the enquiry. Please try again." };
  }

  revalidatePath("/enquiries");
  redirect(`/enquiries/${data.id}`);
}

export async function updateEnquiryStatus(_prevState: FormState, formData: FormData): Promise<FormState> {
  const enquiryId = str(formData, "enquiry_id");
  const newStatus = str(formData, "status");
  const staffMember = str(formData, "staff_member");

  if (!enquiryId || !newStatus || !STATUS_VALUES.has(newStatus as never)) {
    return { error: "Select a valid status." };
  }

  const { data: current, error: fetchError } = await supabaseAdmin
    .from("enquiries")
    .select("status")
    .eq("id", enquiryId)
    .single();

  if (fetchError || !current) {
    return { error: "Enquiry not found." };
  }

  if (current.status === newStatus) {
    return {};
  }

  const { error: updateError } = await supabaseAdmin
    .from("enquiries")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", enquiryId);

  if (updateError) {
    return { error: updateError.message };
  }

  await supabaseAdmin.from("enquiry_activities").insert({
    enquiry_id: enquiryId,
    activity_type: "status_change",
    previous_status: current.status,
    new_status: newStatus,
    staff_member: staffMember,
  });

  revalidatePath(`/enquiries/${enquiryId}`);
  revalidatePath("/enquiries");
  return {};
}

export async function addFollowUpActivity(_prevState: FormState, formData: FormData): Promise<FormState> {
  const enquiryId = str(formData, "enquiry_id");
  const note = str(formData, "note");
  const nextFollowUpDate = str(formData, "next_follow_up_date");
  const staffMember = str(formData, "staff_member");

  if (!enquiryId) {
    return { error: "Enquiry not found." };
  }
  if (!note && !nextFollowUpDate) {
    return { error: "Add a note or a follow-up date." };
  }

  const { error: activityError } = await supabaseAdmin.from("enquiry_activities").insert({
    enquiry_id: enquiryId,
    activity_type: nextFollowUpDate ? "follow_up_scheduled" : "note",
    note,
    next_follow_up_date: nextFollowUpDate,
    staff_member: staffMember,
  });

  if (activityError) {
    return { error: activityError.message };
  }

  if (nextFollowUpDate) {
    const { error: updateError } = await supabaseAdmin
      .from("enquiries")
      .update({ follow_up_date: nextFollowUpDate, updated_at: new Date().toISOString() })
      .eq("id", enquiryId);

    if (updateError) {
      return { error: updateError.message };
    }
  }

  revalidatePath(`/enquiries/${enquiryId}`);
  return {};
}
