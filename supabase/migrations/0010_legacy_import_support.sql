-- Legacy GymMaster migration support.
--
-- Adds the private Storage bucket the importer stashes uploaded workbooks in between the
-- dry-run and confirm steps (so confirm always re-parses the exact bytes that were validated,
-- never client-held state), plus the Postgres function that gives "one transaction per source
-- row" (member_subscriptions + invoices + member_payments) real transactional semantics —
-- something a plain PostgREST client (supabaseAdmin) cannot provide across multiple tables on
-- its own. See docs/LEGACY_IMPORT_HANDOFF.md for the full field mapping this implements.

insert into storage.buckets (id, name, public)
values ('legacy-import-uploads', 'legacy-import-uploads', false)
on conflict (id) do nothing;

create or replace function import_legacy_sale_row(
  p_batch_id uuid,
  p_member_id uuid,
  p_legacy_sale_row_key text,
  p_plan_name text,
  p_start_date date,
  p_end_date date,
  p_standard_price numeric,
  p_final_amount numeric,
  p_amount_paid numeric,
  p_payment_status text,
  p_payment_mode text,
  p_legacy_plan_status text,
  p_legacy_invoice_number text,
  p_notes text,
  p_created_by text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription_id uuid;
  v_invoice_id uuid;
  v_payment_id uuid;
  v_safe_invoice_number text := nullif(trim(p_legacy_invoice_number), '');
  v_notes text := p_notes;
begin
  insert into member_subscriptions (
    member_id, plan_name, start_date, end_date, standard_price, final_amount,
    payment_status, amount_paid, balance_due, payment_mode, status,
    legacy_import_batch_id, legacy_sale_row_key, legacy_plan_status, notes, created_by
  ) values (
    p_member_id, p_plan_name, p_start_date, p_end_date, p_standard_price, p_final_amount,
    p_payment_status, p_amount_paid, greatest(0, p_final_amount - p_amount_paid), p_payment_mode, 'active',
    p_batch_id, p_legacy_sale_row_key, p_legacy_plan_status, v_notes, p_created_by
  )
  on conflict (legacy_sale_row_key) where legacy_sale_row_key is not null do nothing
  returning id into v_subscription_id;

  if v_subscription_id is null then
    return jsonb_build_object('status', 'skipped_existing', 'legacy_sale_row_key', p_legacy_sale_row_key);
  end if;

  -- legacy_invoice_number is only kept when it's non-blank and not already used by another
  -- invoice (source data has heavy invoice-number reuse across renewal rows) — otherwise the
  -- number is preserved in notes instead of silently dropped, per the handoff doc.
  if v_safe_invoice_number is not null and exists (select 1 from invoices where legacy_invoice_number = v_safe_invoice_number) then
    v_notes := trim(both ' ' from coalesce(v_notes, '') || format(' [legacy invoice #: %s]', v_safe_invoice_number));
    v_safe_invoice_number := null;
  end if;

  insert into invoices (
    member_id, subscription_id, issue_date, plan_name, start_date, end_date,
    amount, total_amount, amount_paid, balance_due, payment_mode, status, notes,
    legacy_import_batch_id, legacy_invoice_number, created_by
  ) values (
    p_member_id, v_subscription_id, p_start_date, p_plan_name, p_start_date, p_end_date,
    p_standard_price, p_final_amount, p_amount_paid, greatest(0, p_final_amount - p_amount_paid),
    p_payment_mode, p_payment_status, v_notes, p_batch_id, v_safe_invoice_number, p_created_by
  )
  returning id into v_invoice_id;

  if p_amount_paid > 0 then
    insert into member_payments (member_id, subscription_id, invoice_id, amount, payment_date, method, notes, received_by)
    values (p_member_id, v_subscription_id, v_invoice_id, p_amount_paid, p_start_date, p_payment_mode,
            'Imported from legacy GymMaster export.', p_created_by)
    returning id into v_payment_id;
  end if;

  return jsonb_build_object(
    'status', 'imported',
    'subscription_id', v_subscription_id,
    'invoice_id', v_invoice_id,
    'payment_id', v_payment_id
  );
end;
$$;

revoke all on function import_legacy_sale_row(
  uuid, uuid, text, text, date, date, numeric, numeric, numeric, text, text, text, text, text, text
) from public, anon, authenticated;
