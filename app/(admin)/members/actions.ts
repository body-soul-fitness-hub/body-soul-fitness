"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { FormState } from "@/app/(admin)/enquiries/actions";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function createMember(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fullName = str(formData, "full_name");
  const mobileNumber = str(formData, "mobile_number");
  const enquiryId = str(formData, "enquiry_id");

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.full_name = "Full name is required.";
  if (!mobileNumber) fieldErrors.mobile_number = "Mobile number is required.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from("members")
    .insert({
      full_name: fullName,
      mobile_number: mobileNumber,
      whatsapp_number: str(formData, "whatsapp_number"),
      gender: str(formData, "gender"),
      date_of_birth: str(formData, "date_of_birth"),
      address: str(formData, "address"),
      fitness_goal: str(formData, "fitness_goal"),
      plan: str(formData, "plan"),
      preferred_workout_time: str(formData, "preferred_workout_time"),
      join_date: str(formData, "join_date") ?? new Date().toISOString().slice(0, 10),
      assigned_staff: str(formData, "assigned_staff"),
      notes: str(formData, "notes"),
      source_enquiry_id: enquiryId,
    })
    .select("id")
    .single();

  // Only after the member row exists do we touch the enquiry — a failure above
  // leaves the enquiry completely untouched, so it never shows Converted for a
  // member that doesn't actually exist.
  if (memberError || !member) {
    return { error: memberError?.message ?? "Could not create the member. Please try again." };
  }

  if (enquiryId) {
    const { error: enquiryError } = await supabaseAdmin
      .from("enquiries")
      .update({
        status: "converted",
        converted_member_id: member.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", enquiryId);

    if (enquiryError) {
      console.error(`Member ${member.id} created but failed to mark enquiry ${enquiryId} as converted:`, enquiryError.message);
    } else {
      await supabaseAdmin.from("enquiry_activities").insert({
        enquiry_id: enquiryId,
        activity_type: "converted",
        note: `Converted to member (${fullName}).`,
        staff_member: str(formData, "assigned_staff"),
      });
      revalidatePath(`/enquiries/${enquiryId}`);
      revalidatePath("/enquiries");
    }

    redirect(`/enquiries/${enquiryId}`);
  }

  redirect("/enquiries");
}
