# Claude review prompt: legacy member and membership import

You are reviewing a Next.js 16 + Supabase gym-management app located at the repository root. Review the implementation for a safe migration from a previous gym system and then complete the missing importer work. Do not remove or weaken existing functionality.

Read these first:

- `docs/LEGACY_IMPORT_HANDOFF.md`
- `supabase/migrations/0009_legacy_member_import.sql`
- `app/member/actions.ts`
- previous migrations `0001` through `0008`

The reviewed source exports are:

- `Customers_CSV_EXPORT_20260829-142027.xlsx`: 609 customer records.
- `CSV_EXPORT_20260830-162847.xlsx`: 638 membership-sale records.

Important validated facts:

- 559 sales customers match customer records exactly by `Customer ID = Code`; 50 customers have no sale history.
- Every latest sale `End Date` is earlier than 2026-08-30 (the latest is 2026-08-22).
- The earlier customer export labels 42 people `Active`, but that conflicts with sale expiry data. Expiry data governs entitlement.
- No old `App Installed` flag, email, or legacy customer status is proof of portal authorization.

Your tasks:

1. Review migration `0009` for PostgreSQL correctness, idempotence, RLS consistency, indexes, constraints, and compatibility with migrations `0001`–`0008`. Suggest/implement only safe corrections.
2. Build an admin-only server-side import workflow accepting both XLSX files together. Do not parse private data in a client component. Include dry-run validation, confirmation before write, a persistent import-batch record, progress/summary, and downloadable validation errors.
3. Normalize Indian phone numbers to E.164 (`+91XXXXXXXXXX`) consistently in import, member create/edit, duplicate search, portal activation, and member login. Never silently merge a record where legacy code, normalized phone, and name disagree with an existing member.
4. Import all 609 customer records into `members`, preserving `legacy_customer_code`, import-batch provenance, and otherwise unsupported legacy fields in `legacy_metadata`. Preserve data; do not fabricate emergency-contact names, WhatsApp consent, attendance, or medical data.
5. For all 638 sale rows, create idempotent subscriptions using an immutable source-row key. Preserve exact start/end dates and amounts; do not derive expiry from the plan label. Create historical invoices and payments when supported by the existing schema. Preserve a usable unique old invoice number as `legacy_invoice_number`; store blank/repeated source invoice values in notes/metadata instead.
6. Map money and payment safely: `PD` means paid; `PI` means partial only when paid amount < total, otherwise paid. Map Cash/UPI/Google Pay/Paytm/Credit Card/Online to the app’s supported payment modes with an explicit documented mapping.
7. Do not create Supabase Auth users, issue portal activation codes, send WhatsApp messages, create QR passes, or send invoices during import.
8. Portal entitlement must require both `members.status = 'active'` and an active subscription whose end date has not passed. Retain the guards added in `app/member/actions.ts`; also check any other portal entrypoint.
9. Provide migration/application tests or a concrete test checklist that verifies: 609 customers, 638 sale rows, 559 joins, 50 without sales, no negative amounts, no invalid date ranges, no duplicate source identifiers, idempotent rerun, and no active portal eligibility from the imported historical data.

Use the existing project conventions: server actions, server-only Supabase client for admin operations, current TypeScript style, RLS, and `apply_patch` edits. Before changing data, report the dry-run result. Do not run the real import until a human explicitly approves the dry run.
