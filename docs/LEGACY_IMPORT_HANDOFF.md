# Legacy member and sales import handoff

## Source files reviewed

- `Customers_CSV_EXPORT_20260829-142027.xlsx`: 609 unique customer codes and mobile numbers.
- `CSV_EXPORT_20260830-162847.xlsx`: 638 historical sale rows covering 559 of those customers.

The two files join exactly by `Customers.Code = Sales.Customer ID` for 559 customers. The remaining 50 customer records have no sales row.

As of 2026-08-30, the latest sales `End Date` for every one of the 559 customers is before today (latest end date: 2026-08-22). The old customer file says 42 members are `Active`, but this conflicts with the sales register. Treat the sales end date as authoritative for plan entitlement: import all historical data, but grant portal access to nobody until a staff member creates or verifies a current subscription.

## Required importer behaviour

Implement an admin-only, server-side importer. It must accept the two workbooks together, parse them without exposing them to the browser, run a dry-run first, and commit only after approval. It must use a single `legacy_import_batches` row per run and show a summary/error report.

Normalize all Indian phones to E.164 (`+91` + ten digits) before matching or writing. Update the normal member create/edit, duplicate check, portal activation, and login flows to normalize the same way. Do not make a mobile number unique at database level until existing production data has been audited and normalized.

### Customer mapping

| Legacy field | Destination |
| --- | --- |
| `Code` | `members.legacy_customer_code` |
| `Name` | `members.full_name` (trim/collapse whitespace) |
| `ISD Code` + `Number` | `members.mobile_number` (E.164) |
| `WhatsApp Numbers` | `members.whatsapp_number` (E.164) |
| `Email`, `Gender`, `DOB`, `Address` | matching member fields |
| `Emergency Contact No` | `emergency_contact_number` |
| `Assigned Trainer`, `Handled By` | `assigned_trainer`, `assigned_staff` |
| `Conversion Date` | `join_date` |
| source, employment type, lead type, app-installed, legacy status | `legacy_metadata` JSONB |

Never use `App Installed` as a portal-access signal and never infer WhatsApp marketing consent from the old export.

### Sales mapping

Create one `member_subscriptions` row per sales row, ordered by `Start Date`; use `legacy_sale_row_key` as an idempotency key. Preserve the legacy plan name, exact start/end dates, listed amount, amount paid, payment status, payment method, staff/trainer, source, and plan-status code. Do not derive the end date from the plan label.

Create a matching invoice and, where `Paid Amount > 0`, one matching payment. Map payment status `PD` to `paid`; map `PI` to `partial` only when amount paid is less than total, otherwise `paid`. Map Cash/UPI/Google Pay/Paytm/Credit Card/Online to the app's supported payment modes. Keep the source invoice number in `invoices.legacy_invoice_number` only when it is non-blank and unique; otherwise keep it in notes/metadata.

Set every imported historical subscription to `status = 'active'` only if its end date is today or later; otherwise keep it active for history but rely on date-derived expiry, or use a dedicated historical import status if the product is extended. Imported member status should be `expired` if no current subscription exists; do not trust the old `Membership Status` flag over the expiry date.

## Safety checks before commit

1. Reject duplicate legacy customer code or duplicate legacy sale-row key within the uploaded files.
2. Report, do not silently merge, a legacy-code/phone/name mismatch with an existing app member.
3. Verify 609 customer rows, 638 sales rows, 559 code joins, and 50 customers without sales.
4. Verify no subscription whose `end_date` is before `start_date`, no negative money values, and every date is ISO after parsing.
5. Do not send WhatsApp, create portal Auth users, generate QR tokens, or issue new invoice numbers during import.
6. Make re-runs idempotent with `legacy_customer_code`, `legacy_sale_row_key`, and `legacy_invoice_number`.

## Existing code already changed

Migration `0009_legacy_member_import.sql` adds import-batch provenance plus legacy identifiers to members, subscriptions, and invoices. Member portal activation and code issuance now require both a member status of `active` and a subscription whose end date has not passed.
