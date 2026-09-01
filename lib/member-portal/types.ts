export const BODY_AREAS = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "arms", label: "Arms" },
  { value: "legs", label: "Legs" },
  { value: "core", label: "Core" },
  { value: "full_body", label: "Full body" },
] as const;

export const CARDIO_ACTIVITIES = [
  { value: "treadmill", label: "Treadmill" },
  { value: "cycling", label: "Cycling" },
  { value: "cross_trainer", label: "Cross trainer" },
  { value: "walking", label: "Walking" },
  { value: "running", label: "Running" },
  { value: "other", label: "Other" },
] as const;

export const INTENSITIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

export type WorkoutType = "strength" | "cardio";
export type Intensity = (typeof INTENSITIES)[number]["value"];

export type MemberWorkout = {
  id: string;
  member_id: string;
  workout_date: string;
  workout_type: WorkoutType;
  body_areas: string[] | null;
  cardio_activity: string | null;
  duration_minutes: number;
  distance_km: number | null;
  intensity: Intensity | null;
  notes: string | null;
  created_at: string;
};

export function labelFor(options: readonly { value: string; label: string }[], value: string | null): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

export function summarizeWorkout(workout: Pick<MemberWorkout, "workout_type" | "body_areas" | "cardio_activity" | "duration_minutes">): string {
  if (workout.workout_type === "strength") {
    const areas = (workout.body_areas ?? []).map((a) => labelFor(BODY_AREAS, a)).join(", ");
    return `Strength · ${areas || "General"} · ${workout.duration_minutes} min`;
  }
  return `Cardio · ${labelFor(CARDIO_ACTIVITIES, workout.cardio_activity)} · ${workout.duration_minutes} min`;
}
