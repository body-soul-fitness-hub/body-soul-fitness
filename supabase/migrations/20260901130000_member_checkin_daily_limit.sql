-- Caps self-service gym visits at 2 per calendar day (i.e. at most 2 check-ins and
-- 2 check-outs), to stop the member portal's check-in button from being spammed.
-- Checking OUT of an already-open visit is never blocked by the cap — only starting
-- a NEW visit is. Replaces member_portal_toggle_visit() from 0007_member_portal.sql
-- with the same signature/behavior plus this one guard.

create or replace function public.member_portal_toggle_visit()
returns table(action text, checked_at timestamptz) language plpgsql security definer set search_path = public as $$
declare portal_member members%rowtype; open_visit member_checkins%rowtype; visits_today integer;
begin
  select * into portal_member from members where auth_user_id = auth.uid();
  if not found then raise exception 'Member profile not found'; end if;
  if portal_member.status <> 'active' then raise exception 'Your membership is not active'; end if;
  if not exists (select 1 from member_subscriptions where member_id = portal_member.id and status = 'active' and (end_date is null or end_date >= current_date)) then raise exception 'No active subscription found'; end if;
  select * into open_visit from member_checkins where member_id = portal_member.id and checked_out_at is null order by checked_in_at desc limit 1;
  if found then
    update member_checkins set checked_out_at = now(), checkout_staff = 'Member portal', checkout_device = 'Member portal', duration_minutes = greatest(0, round(extract(epoch from (now() - open_visit.checked_in_at)) / 60)::integer) where id = open_visit.id;
    return query select 'check-out'::text, now();
  else
    select count(*) into visits_today from member_checkins where member_id = portal_member.id and checked_in_at::date = current_date;
    if visits_today >= 2 then
      raise exception 'You have already checked in twice today. Please contact reception if you need another visit logged.';
    end if;
    insert into member_checkins(member_id, method, created_by, checkin_staff, checkin_device) values (portal_member.id, 'member_portal', 'Member portal', 'Member portal', 'Member portal');
    return query select 'check-in'::text, now();
  end if;
end; $$;
revoke all on function public.member_portal_toggle_visit() from public;
grant execute on function public.member_portal_toggle_visit() to authenticated;
