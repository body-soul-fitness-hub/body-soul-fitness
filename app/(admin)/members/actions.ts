"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { deleteMemberPhoto, uploadMemberPhoto } from "@/lib/members/photo";
import { MEMBER_STATUSES } from "@/lib/members/types";
import type { Enquiry } from "@/lib/enquiries/types";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  duplicate?: { id: string; member_id: string; full_name: string };
};

const STATUS_VALUES = new Set(MEMBER_STATUSES.map((status) => status.value));

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function fileOrNull(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export async function checkMobileExists(mobileNumber: string, excludeId?: string): Promise<{ id: string; member_id: string; full_name: string } | null> {
  const trimmed = mobileNumber.trim();
  if (!trimmed) return null;

  let query = supabaseAdmin
    .from("members")
    .select("id, member_id, full_name")
    .eq("mobile_number", trimmed)
    .order("created_at", { ascending: false })
    .limit(1);

  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query.maybeSingle();
  return data ?? null;
}

export async function createMember(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fullName = str(formData, "full_name");
  const mobileNumber = str(formData, "mobile_number");
  const enquiryId = str(formData, "enquiry_id");

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.full_name = "Full name is required.";
  if (!mobileNumber) fieldErrors.mobile_number = "Mobile number is required.";
  else if (!/^[0-9+][0-9\s-]{6,19}$/.test(mobileNumber)) fieldErrors.mobile_number = "Enter a valid mobile number.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const duplicate = await checkMobileExists(mobileNumber!);
  if (duplicate) {
    return {
      fieldErrors: { mobile_number: `A member with this mobile number already exists (${duplicate.member_id} · ${duplicate.full_name}).` },
      duplicate,
    };
  }

  let photoPath: string | null = null;
  const photo = fileOrNull(formData, "photo");
  if (photo) {
    try {
      photoPath = await uploadMemberPhoto(photo);
    } catch (uploadError) {
      return { error: uploadError instanceof Error ? uploadError.message : "Could not upload the photo." };
    }
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from("members")
    .insert({
      full_name: fullName,
      mobile_number: mobileNumber,
      whatsapp_number: str(formData, "whatsapp_number"),
      email: str(formData, "email"),
      gender: str(formData, "gender"),
      date_of_birth: str(formData, "date_of_birth"),
      emergency_contact_name: str(formData, "emergency_contact_name"),
      emergency_contact_number: str(formData, "emergency_contact_number"),
      address: str(formData, "address"),
      photo_path: photoPath,
      fitness_goal: str(formData, "fitness_goal"),
      medical_notes: str(formData, "medical_notes"),
      referred_by: str(formData, "referred_by"),
      assigned_trainer: str(formData, "assigned_trainer"),
      plan: str(formData, "plan"),
      preferred_workout_time: str(formData, "preferred_workout_time"),
      join_date: str(formData, "join_date") ?? new Date().toISOString().slice(0, 10),
      assigned_staff: str(formData, "assigned_staff"),
      notes: str(formData, "notes"),
      status: "active",
      source_enquiry_id: enquiryId,
    })
    .select("id")
    .single();

  // Only after the member row exists do we touch the enquiry — a failure above leaves the
  // enquiry completely untouched, so it never shows Converted for a member that doesn't exist.
  if (memberError || !member) {
    if (photoPath) await deleteMemberPhoto(photoPath);
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
  }

  revalidatePath("/members");
  redirect(`/members/${member.id}`);
}

export async function updateMember(_prevState: FormState, formData: FormData): Promise<FormState> {
  const memberRowId = str(formData, "member_row_id");
  const fullName = str(formData, "full_name");
  const mobileNumber = str(formData, "mobile_number");

  if (!memberRowId) {
    return { error: "Member not found." };
  }

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.full_name = "Full name is required.";
  if (!mobileNumber) fieldErrors.mobile_number = "Mobile number is required.";
  else if (!/^[0-9+][0-9\s-]{6,19}$/.test(mobileNumber)) fieldErrors.mobile_number = "Enter a valid mobile number.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const duplicate = await checkMobileExists(mobileNumber!, memberRowId);
  if (duplicate) {
    return {
      fieldErrors: { mobile_number: `Another member already uses this mobile number (${duplicate.member_id} · ${duplicate.full_name}).` },
      duplicate,
    };
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("members")
    .select("photo_path")
    .eq("id", memberRowId)
    .single();

  if (fetchError || !existing) {
    return { error: "Member not found." };
  }

  let photoPath = existing.photo_path as string | null;
  const photo = fileOrNull(formData, "photo");
  if (photo) {
    try {
      const newPath = await uploadMemberPhoto(photo);
      if (photoPath) await deleteMemberPhoto(photoPath);
      photoPath = newPath;
    } catch (uploadError) {
      return { error: uploadError instanceof Error ? uploadError.message : "Could not upload the photo." };
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("members")
    .update({
      full_name: fullName,
      mobile_number: mobileNumber,
      whatsapp_number: str(formData, "whatsapp_number"),
      email: str(formData, "email"),
      gender: str(formData, "gender"),
      date_of_birth: str(formData, "date_of_birth"),
      emergency_contact_name: str(formData, "emergency_contact_name"),
      emergency_contact_number: str(formData, "emergency_contact_number"),
      address: str(formData, "address"),
      photo_path: photoPath,
      fitness_goal: str(formData, "fitness_goal"),
      medical_notes: str(formData, "medical_notes"),
      referred_by: str(formData, "referred_by"),
      assigned_trainer: str(formData, "assigned_trainer"),
      plan: str(formData, "plan"),
      preferred_workout_time: str(formData, "preferred_workout_time"),
      join_date: str(formData, "join_date") ?? new Date().toISOString().slice(0, 10),
      assigned_staff: str(formData, "assigned_staff"),
      notes: str(formData, "notes"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberRowId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/members/${memberRowId}`);
  revalidatePath("/members");
  redirect(`/members/${memberRowId}`);
}

export async function changeMemberStatus(_prevState: FormState, formData: FormData): Promise<FormState> {
  const memberRowId = str(formData, "member_row_id");
  const newStatus = str(formData, "new_status");
  const reason = str(formData, "reason");
  const changedBy = str(formData, "changed_by");

  if (!memberRowId || !newStatus || !STATUS_VALUES.has(newStatus as never)) {
    return { error: "Select a valid status." };
  }
  if (!reason) {
    return { error: "A reason is required to change a member's status." };
  }

  const { data: current, error: fetchError } = await supabaseAdmin
    .from("members")
    .select("status")
    .eq("id", memberRowId)
    .single();

  if (fetchError || !current) {
    return { error: "Member not found." };
  }

  if (current.status === newStatus) {
    return {};
  }

  const { error: updateError } = await supabaseAdmin
    .from("members")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", memberRowId);

  if (updateError) {
    return { error: updateError.message };
  }

  await supabaseAdmin.from("member_status_changes").insert({
    member_id: memberRowId,
    previous_status: current.status,
    new_status: newStatus,
    reason,
    changed_by: changedBy,
  });

  revalidatePath(`/members/${memberRowId}`);
  revalidatePath("/members");
  return {};
}

export async function addMemberNote(_prevState: FormState, formData: FormData): Promise<FormState> {
  const memberRowId = str(formData, "member_row_id");
  const note = str(formData, "note");
  const createdBy = str(formData, "created_by");

  if (!memberRowId) {
    return { error: "Member not found." };
  }
  if (!note) {
    return { error: "Write a note before saving." };
  }

  const { error } = await supabaseAdmin.from("member_notes").insert({
    member_id: memberRowId,
    note,
    created_by: createdBy,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/members/${memberRowId}`);
  return {};
}

export async function getEnquiryForPrefill(enquiryId: string): Promise<Enquiry | null> {
  const { data } = await supabaseAdmin.from("enquiries").select("*").eq("id", enquiryId).maybeSingle();
  return (data as Enquiry | null) ?? null;
}
