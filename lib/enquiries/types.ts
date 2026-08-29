export const ENQUIRY_SOURCES = [
  { value: "walk_in", label: "Walk-in" },
  { value: "referral", label: "Referral" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
] as const;

export const ENQUIRY_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up_due", label: "Follow-up Due" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
  { value: "converted", label: "Converted" },
] as const;

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

export const WORKOUT_TIMES = [
  { value: "early_morning", label: "Early morning (5-8am)" },
  { value: "morning", label: "Morning (8-11am)" },
  { value: "afternoon", label: "Afternoon (11am-4pm)" },
  { value: "evening", label: "Evening (4-8pm)" },
  { value: "night", label: "Night (8-11pm)" },
  { value: "flexible", label: "Flexible" },
] as const;

export type EnquirySource = (typeof ENQUIRY_SOURCES)[number]["value"];
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number]["value"];

export type Enquiry = {
  id: string;
  full_name: string;
  mobile_number: string;
  whatsapp_number: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  source: EnquirySource;
  fitness_goal: string | null;
  interested_plan: string | null;
  preferred_workout_time: string | null;
  enquiry_date: string;
  follow_up_date: string | null;
  notes: string | null;
  assigned_staff: string | null;
  status: EnquiryStatus;
  converted_member_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EnquiryActivityType = "note" | "status_change" | "follow_up_scheduled" | "converted";

export type EnquiryActivity = {
  id: string;
  enquiry_id: string;
  activity_type: EnquiryActivityType;
  note: string | null;
  previous_status: string | null;
  new_status: string | null;
  next_follow_up_date: string | null;
  staff_member: string | null;
  created_at: string;
};

export type Member = {
  id: string;
  full_name: string;
  mobile_number: string;
  whatsapp_number: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  fitness_goal: string | null;
  plan: string | null;
  preferred_workout_time: string | null;
  join_date: string;
  status: "active" | "inactive";
  source_enquiry_id: string | null;
  assigned_staff: string | null;
  notes: string | null;
  created_at: string;
};

export function labelFor(options: ReadonlyArray<{ value: string; label: string }>, value: string | null): string {
  return options.find((option) => option.value === value)?.label ?? value ?? "—";
}

export function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}
