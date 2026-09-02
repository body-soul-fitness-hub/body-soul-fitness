-- Allow authenticated administrators to receive only the dashboard change events they need.
-- The application still calculates and returns all dashboard values through server-only routes.

create or replace function public.is_active_administrator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_users
    where auth_user_id = (select auth.uid())
      and role = 'administrator'
      and is_active = true
  );
$$;

revoke all on function public.is_active_administrator() from public;
grant execute on function public.is_active_administrator() to authenticated;

drop policy if exists "administrators receive dashboard checkins" on member_checkins;
create policy "administrators receive dashboard checkins" on member_checkins
  for select to authenticated using ((select public.is_active_administrator()));

drop policy if exists "administrators receive dashboard subscriptions" on member_subscriptions;
create policy "administrators receive dashboard subscriptions" on member_subscriptions
  for select to authenticated using ((select public.is_active_administrator()));

drop policy if exists "administrators receive dashboard invoices" on invoices;
create policy "administrators receive dashboard invoices" on invoices
  for select to authenticated using ((select public.is_active_administrator()));

do $$
begin
  alter publication supabase_realtime add table member_checkins;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table member_subscriptions;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table invoices;
exception when duplicate_object then null;
end $$;
