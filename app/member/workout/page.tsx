"use client";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, HeartPulse } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { MemberNav } from "../components/member-nav";
import { useMemberSession } from "@/lib/member-portal/use-member-session";
import { localDateStr } from "@/lib/member-portal/format";
import { BODY_AREAS, CARDIO_ACTIVITIES, INTENSITIES, type Intensity, type WorkoutType } from "@/lib/member-portal/types";

export default function LogWorkoutPage() {
  const ready = useMemberSession();
  const router = useRouter();
  const [type, setType] = useState<WorkoutType>("strength");
  const [bodyAreas, setBodyAreas] = useState<string[]>([]);
  const [cardioActivity, setCardioActivity] = useState("");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [intensity, setIntensity] = useState<Intensity>("medium");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  function toggleBodyArea(value: string) {
    setBodyAreas((prev) => (prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]));
  }

  async function save() {
    setError("");
    const durationMinutes = Math.round(Number(duration));
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 600) {
      setError("Enter a valid duration in minutes.");
      return;
    }
    if (type === "strength" && bodyAreas.length === 0) {
      setError("Select at least one body area you trained.");
      return;
    }
    if (type === "cardio" && !cardioActivity) {
      setError("Choose a cardio activity.");
      return;
    }
    let distanceKm: number | null = null;
    if (type === "cardio" && distance.trim()) {
      distanceKm = Number(distance);
      if (!Number.isFinite(distanceKm) || distanceKm < 0) {
        setError("Enter a valid distance.");
        return;
      }
    }

    setPending(true);
    const { error: rpcError } = await supabase.rpc("member_portal_log_workout", {
      p_workout_type: type,
      p_workout_date: localDateStr(),
      p_duration_minutes: durationMinutes,
      p_body_areas: type === "strength" ? bodyAreas : null,
      p_cardio_activity: type === "cardio" ? cardioActivity : null,
      p_distance_km: type === "cardio" ? distanceKm : null,
      p_intensity: type === "cardio" ? intensity : null,
      p_notes: notes.trim() || null,
    });
    setPending(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setSuccess(true);
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#f5f7f4]">
        <MemberNav />
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#f5f7f4] pb-12">
        <MemberNav />
        <div className="mx-auto max-w-md px-5 py-14 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#c9f36a]">
            <Dumbbell size={28} className="text-[#0f1816]" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-black text-[#0f1816]">Workout saved</h1>
          <p className="mt-2 text-sm font-medium text-[#6c7773]">Nice work. It&apos;s now on your Home page and calendar.</p>
          <div className="mt-6 flex flex-col gap-3">
            <button onClick={() => router.push("/member/dashboard")} className="rounded-xl bg-[#111c19] py-3.5 text-sm font-extrabold text-white">
              Back to home
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setNotes("");
                setDuration("");
                setDistance("");
              }}
              className="rounded-xl border-2 border-[#e5e9e5] bg-white py-3.5 text-sm font-extrabold text-[#0f1816]"
            >
              Log another workout
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] pb-16">
      <MemberNav />
      <div className="mx-auto max-w-md px-5 py-6">
        <h1 className="font-display text-2xl font-black tracking-[-0.03em] text-[#0f1816]">Today&apos;s workout</h1>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <ToggleButton active={type === "strength"} onClick={() => setType("strength")} icon={Dumbbell} label="Strength" />
          <ToggleButton active={type === "cardio"} onClick={() => setType("cardio")} icon={HeartPulse} label="Cardio" />
        </div>

        {type === "strength" ? (
          <>
            <h2 className="mt-6 text-base font-extrabold text-[#0f1816]">What did you train?</h2>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {BODY_AREAS.filter((a) => a.value !== "full_body").map((area) => (
                <ChipButton key={area.value} active={bodyAreas.includes(area.value)} onClick={() => toggleBodyArea(area.value)} label={area.label} />
              ))}
            </div>
            <div className="mt-2.5">
              <ChipButton wide active={bodyAreas.includes("full_body")} onClick={() => toggleBodyArea("full_body")} label="Full body" />
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-6 text-base font-extrabold text-[#0f1816]">Choose cardio</h2>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {CARDIO_ACTIVITIES.map((activity) => (
                <ChipButton
                  key={activity.value}
                  active={cardioActivity === activity.value}
                  onClick={() => setCardioActivity(activity.value)}
                  label={activity.label}
                />
              ))}
            </div>
          </>
        )}

        <Field label="Duration">
          <input
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 30"
            aria-label="Duration in minutes"
            className="w-full rounded-xl border border-[#e5e9e5] bg-white px-4 py-3.5 text-base font-bold text-[#0f1816] outline-none focus:border-[#111c19]"
          />
        </Field>

        {type === "cardio" && (
          <>
            <Field label="Distance (optional)">
              <input
                inputMode="decimal"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="e.g. 3.5 km"
                aria-label="Distance in kilometers"
                className="w-full rounded-xl border border-[#e5e9e5] bg-white px-4 py-3.5 text-base font-bold text-[#0f1816] outline-none focus:border-[#111c19]"
              />
            </Field>
            <div className="mt-5">
              <p className="text-sm font-extrabold text-[#0f1816]">Intensity</p>
              <div className="mt-2 grid grid-cols-3 gap-2.5">
                {INTENSITIES.map((level) => (
                  <ToggleButton key={level.value} compact active={intensity === level.value} onClick={() => setIntensity(level.value)} label={level.label} />
                ))}
              </div>
            </div>
          </>
        )}

        <Field label="Workout notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={type === "strength" ? "Shoulder press + biceps" : "Easy run after strength"}
            rows={3}
            className="w-full resize-none rounded-xl border border-[#e5e9e5] bg-white px-4 py-3.5 text-base font-medium text-[#0f1816] outline-none focus:border-[#111c19]"
          />
        </Field>

        {error && (
          <p className="mt-4 rounded-xl bg-[#ffe5dc] px-4 py-3 text-sm font-bold text-[#a94f37]" role="alert">
            {error}
          </p>
        )}

        <button onClick={save} disabled={pending} className="mt-6 w-full rounded-xl bg-[#c9f36a] py-4 text-base font-extrabold text-[#0f1816] disabled:opacity-60">
          {pending ? "Saving…" : "Save workout"}
        </button>
      </div>
    </main>
  );
}

function ToggleButton({
  active,
  onClick,
  icon: Icon,
  label,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  icon?: typeof Dumbbell;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-2 rounded-2xl border-2 font-extrabold ${compact ? "py-3 text-sm" : "py-4 text-sm"} ${
        active ? "border-[#c9f36a] bg-[#c9f36a] text-[#0f1816]" : "border-[#e5e9e5] bg-white text-[#0f1816]"
      }`}
    >
      {Icon && <Icon size={18} />}
      {label}
    </button>
  );
}

function ChipButton({ active, onClick, label, wide }: { active: boolean; onClick: () => void; label: string; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${wide ? "w-full" : ""} rounded-2xl border-2 px-2 py-4 text-center text-sm font-extrabold ${
        active ? "border-[#c9f36a] bg-[#c9f36a] text-[#0f1816]" : "border-[#e5e9e5] bg-white text-[#0f1816]"
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-5 block">
      <span className="text-sm font-extrabold text-[#0f1816]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
