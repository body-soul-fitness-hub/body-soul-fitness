-- Member self-service attendance must originate within 30 metres of the gym.
-- Gym position: 26.796621, 82.465317. Staff/manual/QR attendance is unaffected.
alter table attendance_settings
  add column if not exists member_geofence_enabled boolean not null default true,
  add column if not exists member_geofence_latitude double precision,
  add column if not exists member_geofence_longitude double precision,
  add column if not exists member_geofence_radius_meters integer not null default 30 check (member_geofence_radius_meters between 10 and 500),
  add column if not exists member_geofence_max_accuracy_meters integer not null default 30 check (member_geofence_max_accuracy_meters between 5 and 200);

update attendance_settings
set member_geofence_enabled = true,
    member_geofence_latitude = 26.796621,
    member_geofence_longitude = 82.465317,
    member_geofence_radius_meters = 30,
    member_geofence_max_accuracy_meters = 30,
    updated_at = now()
where id = true;

alter table member_checkins
  add column if not exists checkin_latitude double precision,
  add column if not exists checkin_longitude double precision,
  add column if not exists checkin_accuracy_meters double precision,
  add column if not exists checkin_distance_meters double precision,
  add column if not exists checkout_latitude double precision,
  add column if not exists checkout_longitude double precision,
  add column if not exists checkout_accuracy_meters double precision,
  add column if not exists checkout_distance_meters double precision;

drop function if exists public.member_portal_toggle_visit();
create function public.member_portal_toggle_visit(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision
)
returns table(action text, checked_at timestamptz, distance_meters double precision)
language plpgsql security definer set search_path = public as $$
declare
  portal_member members%rowtype;
  open_visit member_checkins%rowtype;
  geofence attendance_settings%rowtype;
  v_distance_meters double precision;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  if p_latitude is null or p_longitude is null or p_accuracy_meters is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
    or p_accuracy_meters < 0 then
    raise exception 'Current location is required to check in or check out';
  end if;

  select * into geofence from attendance_settings where id = true;
  if not found then raise exception 'Attendance policy is unavailable'; end if;
  if geofence.member_geofence_enabled then
    if p_accuracy_meters > geofence.member_geofence_max_accuracy_meters then
      raise exception 'Location accuracy is too low. Move near an outside area and try again';
    end if;
    v_distance_meters := 2 * 6371000 * asin(sqrt(
      power(sin(radians(p_latitude - geofence.member_geofence_latitude) / 2), 2) +
      cos(radians(p_latitude)) * cos(radians(geofence.member_geofence_latitude)) *
      power(sin(radians(p_longitude - geofence.member_geofence_longitude) / 2), 2)
    ));
    if v_distance_meters > geofence.member_geofence_radius_meters then
      raise exception 'You are % metres from the gym. Check-in and check-out are allowed within % metres', round(v_distance_meters)::integer, geofence.member_geofence_radius_meters;
    end if;
  else
    v_distance_meters := null;
  end if;

  select * into portal_member from members where auth_user_id = auth.uid();
  if not found then raise exception 'Member profile not found'; end if;
  if portal_member.status <> 'active' then raise exception 'Your membership is not active'; end if;
  if not exists (select 1 from member_subscriptions where member_id = portal_member.id and status = 'active' and (end_date is null or end_date >= current_date)) then raise exception 'No active subscription found'; end if;

  select * into open_visit from member_checkins where member_id = portal_member.id and checked_out_at is null order by checked_in_at desc limit 1;
  if found then
    update member_checkins set
      checked_out_at = now(), checkout_staff = 'Member portal', checkout_device = 'Member portal',
      duration_minutes = greatest(0, round(extract(epoch from (now() - open_visit.checked_in_at)) / 60)::integer),
      checkout_latitude = p_latitude, checkout_longitude = p_longitude,
      checkout_accuracy_meters = p_accuracy_meters, checkout_distance_meters = v_distance_meters
    where id = open_visit.id;
    return query select 'check-out'::text, now(), v_distance_meters;
  else
    insert into member_checkins(
      member_id, method, created_by, checkin_staff, checkin_device,
      checkin_latitude, checkin_longitude, checkin_accuracy_meters, checkin_distance_meters
    ) values (
      portal_member.id, 'member_portal', 'Member portal', 'Member portal', 'Member portal',
      p_latitude, p_longitude, p_accuracy_meters, v_distance_meters
    );
    return query select 'check-in'::text, now(), v_distance_meters;
  end if;
end; $$;

revoke all on function public.member_portal_toggle_visit(double precision, double precision, double precision) from public;
grant execute on function public.member_portal_toggle_visit(double precision, double precision, double precision) to authenticated;
