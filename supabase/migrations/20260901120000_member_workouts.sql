-- Personal workout logs for the member portal (self-service Home/Calendar features).
-- Reads are exposed to the member via RLS, scoped through members.auth_user_id exactly like
-- the other member-portal SELECT policies in 0007_member_portal.sql. Writes are NOT exposed
-- through a table-level RLS policy: they go only through the validated, security-definer RPC
-- below (member_portal_log_workout), matching the write pattern already established by
-- member_portal_toggle_visit() — the member's identity is resolved server-side from auth.uid(),
-- never trusted from client input.

create table if not exists member_workouts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  workout_date date not null default current_date,
  workout_type text not null check (workout_type in ('strength', 'cardio')),
  body_areas text[],
  cardio_activity text,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 600),
  distance_km numeric(6,2),
  intensity text check (intensity in ('easy', 'medium', 'hard')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists member_workouts_member_id_idx on member_workouts(member_id);
create index if not exists member_workouts_member_id_workout_date_idx on member_workouts(member_id, workout_date);

alter table member_workouts enable row level security;

create policy "members read their own workouts" on member_workouts for select to authenticated using (member_id in (select id from members where auth_user_id = (select auth.uid())));

create or replace function public.member_portal_log_workout(
  p_workout_type text,
  p_workout_date date,
  p_duration_minutes integer,
  p_body_areas text[] default null,
  p_cardio_activity text default null,
  p_distance_km numeric default null,
  p_intensity text default null,
  p_notes text default null
)
returns member_workouts
language plpgsql
security definer
set search_path = public
as $$
declare
  portal_member members%rowtype;
  new_row member_workouts%rowtype;
  clean_body_areas text[];
  clean_cardio_activity text;
  clean_notes text;
begin
  select * into portal_member from members where auth_user_id = auth.uid();
  if not found then
    raise exception 'Member profile not found';
  end if;

  if p_workout_type not in ('strength', 'cardio') then
    raise exception 'Choose Strength or Cardio.';
  end if;

  if p_duration_minutes is null or p_duration_minutes <= 0 or p_duration_minutes > 600 then
    raise exception 'Enter a valid duration in minutes.';
  end if;

  if p_intensity is not null and p_intensity not in ('easy', 'medium', 'hard') then
    raise exception 'Invalid intensity.';
  end if;

  clean_body_areas := nullif(array_remove(coalesce(p_body_areas, '{}'), ''), '{}');
  clean_cardio_activity := nullif(trim(coalesce(p_cardio_activity, '')), '');
  clean_notes := nullif(trim(coalesce(p_notes, '')), '');

  if p_workout_type = 'strength' and clean_body_areas is null then
    raise exception 'Select at least one body area.';
  end if;

  if p_workout_type = 'cardio' and clean_cardio_activity is null then
    raise exception 'Select a cardio activity.';
  end if;

  insert into member_workouts (
    member_id, workout_date, workout_type, body_areas, cardio_activity,
    duration_minutes, distance_km, intensity, notes
  ) values (
    portal_member.id,
    coalesce(p_workout_date, current_date),
    p_workout_type,
    case when p_workout_type = 'strength' then clean_body_areas else null end,
    case when p_workout_type = 'cardio' then clean_cardio_activity else null end,
    p_duration_minutes,
    case when p_workout_type = 'cardio' then p_distance_km else null end,
    case when p_workout_type = 'cardio' then p_intensity else null end,
    clean_notes
  )
  returning * into new_row;

  return new_row;
end;
$$;

revoke all on function public.member_portal_log_workout(text, date, integer, text[], text, numeric, text, text) from public;
grant execute on function public.member_portal_log_workout(text, date, integer, text[], text, numeric, text, text) to authenticated;
