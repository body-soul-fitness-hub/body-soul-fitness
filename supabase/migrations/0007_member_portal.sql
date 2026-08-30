-- Member portal identity is owned by Supabase Auth. Passwords never live in members.
alter table members add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
alter table members add column if not exists portal_activation_hash text;
alter table members add column if not exists portal_activation_expires_at timestamptz;
alter table members add column if not exists portal_activated_at timestamptz;

create index if not exists members_auth_user_id_idx on members(auth_user_id);

-- Members can only read their own data through the browser's authenticated client.
create policy "members read their own portal profile" on members for select to authenticated using ((select auth.uid()) = auth_user_id);
create policy "members read their own visits" on member_checkins for select to authenticated using (member_id in (select id from members where auth_user_id = (select auth.uid())));
create policy "members read their own subscriptions" on member_subscriptions for select to authenticated using (member_id in (select id from members where auth_user_id = (select auth.uid())));
create policy "members read their own payments" on member_payments for select to authenticated using (member_id in (select id from members where auth_user_id = (select auth.uid())));
create policy "members read their own invoices" on invoices for select to authenticated using (member_id in (select id from members where auth_user_id = (select auth.uid())));

-- A controlled portal toggle: default timestamps/method come from the database, not the device.
create or replace function public.member_portal_toggle_visit()
returns table(action text, checked_at timestamptz) language plpgsql security definer set search_path = public as $$
declare portal_member members%rowtype; open_visit member_checkins%rowtype;
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
    insert into member_checkins(member_id, method, created_by, checkin_staff, checkin_device) values (portal_member.id, 'member_portal', 'Member portal', 'Member portal', 'Member portal');
    return query select 'check-in'::text, now();
  end if;
end; $$;
revoke all on function public.member_portal_toggle_visit() from public;
grant execute on function public.member_portal_toggle_visit() to authenticated;
