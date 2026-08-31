-- One-off data seed: adds the standard membership + personal-training + trial plans.
-- Run in the Supabase SQL Editor for the LIVE project (quznwilwemahoiuoqrpy).
-- Idempotent: skips any plan whose name + duration already exists, so it's safe to re-run.
-- Already applied to DEV (kuiprqheyynaapncqffa) on 2026-08-31.

insert into plans (name, duration_unit, duration_value, standard_price, discount_type, discount_value, final_price, description, included_services, is_active)
select v.name, v.duration_unit, v.duration_value, v.standard_price, null, 0, v.standard_price, null, '{}', true
from (
  values
    ('1 Month Plan', 'months', 1, 1499::numeric),
    ('3 Month Plan', 'months', 3, 3999::numeric),
    ('6 Month Plan', 'months', 6, 6999::numeric),
    ('12 Month Plan', 'months', 12, 12999::numeric),
    ('Personal Training - 1 Month', 'months', 1, 4499::numeric),
    ('Personal Training - 3 Month', 'months', 3, 11999::numeric),
    ('Trial - 2 Days', 'days', 2, 149::numeric)
) as v(name, duration_unit, duration_value, standard_price)
where not exists (
  select 1 from plans p
  where p.duration_unit = v.duration_unit
    and p.duration_value = v.duration_value
    and lower(p.name) = lower(v.name)
);
