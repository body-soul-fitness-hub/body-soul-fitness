-- Enquiry Management module: enquiries, their follow-up timeline, and a minimal members table
-- to support the "Convert to Member" flow.
--
-- Run this against the Supabase project configured in .env.local (NEXT_PUBLIC_SUPABASE_URL),
-- e.g. via the Supabase SQL editor or `supabase db push`.
--
-- RLS is enabled on every table below with NO policies defined, so the `anon` and
-- `authenticated` roles are default-denied. The application talks to these tables only
-- through a server-only Supabase client authenticated with the service-role key (which
-- bypasses RLS), since there is no admin authentication system yet. When Supabase Auth
-- for admins/staff is added (see docs/PRODUCT_TECHNICAL_BLUEPRINT.md), add policies here
-- scoped to the authenticated admin/staff role and reduce reliance on the service-role key.

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  mobile_number text not null,
  whatsapp_number text,
  gender text check (gender in ('male', 'female', 'other')),
  date_of_birth date,
  address text,
  fitness_goal text,
  plan text,
  preferred_workout_time text,
  join_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  source_enquiry_id uuid,
  assigned_staff text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  mobile_number text not null,
  whatsapp_number text,
  gender text check (gender in ('male', 'female', 'other')),
  date_of_birth date,
  address text,
  source text not null check (source in ('walk_in', 'referral', 'instagram', 'facebook', 'google', 'website', 'other')),
  fitness_goal text,
  interested_plan text,
  preferred_workout_time text,
  enquiry_date date not null default current_date,
  follow_up_date date,
  notes text,
  assigned_staff text,
  status text not null default 'new' check (status in ('new', 'contacted', 'follow_up_due', 'interested', 'not_interested', 'converted')),
  converted_member_id uuid references members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table members
  add constraint members_source_enquiry_id_fkey foreign key (source_enquiry_id) references enquiries(id);

create table if not exists enquiry_activities (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references enquiries(id) on delete cascade,
  activity_type text not null check (activity_type in ('note', 'status_change', 'follow_up_scheduled', 'converted')) default 'note',
  note text,
  previous_status text,
  new_status text,
  next_follow_up_date date,
  staff_member text,
  created_at timestamptz not null default now()
);

create index if not exists enquiries_mobile_number_idx on enquiries (mobile_number);
create index if not exists enquiries_status_idx on enquiries (status);
create index if not exists enquiries_source_idx on enquiries (source);
create index if not exists enquiries_enquiry_date_idx on enquiries (enquiry_date);
create index if not exists enquiries_assigned_staff_idx on enquiries (assigned_staff);
create index if not exists enquiry_activities_enquiry_id_idx on enquiry_activities (enquiry_id);

alter table enquiries enable row level security;
alter table enquiry_activities enable row level security;
alter table members enable row level security;
