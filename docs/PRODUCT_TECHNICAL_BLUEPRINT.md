# Body & Soul Fitness Center — Product & Technical Blueprint

**Document status:** Living source of truth  
**Version:** 1.9.11  
**Last updated:** 2026-08-30  
**Owner:** Body & Soul Fitness Center  
**Scope:** Product and technical planning only; this document does not authorize application implementation.

## How to use and maintain this document

This is the decision record and delivery map for the Body & Soul Fitness Center web software. Update its version, date, decision log, relevant sections, and the feature checklist whenever a product decision is made, a feature changes scope, or a feature is completed. Keep completed checklist items traceable to the implemented capability or pull request when those exist.

Versioning follows semantic intent:

- **Patch** (`1.0.1`) for clarifications that do not change scope or architecture.
- **Minor** (`1.1.0`) for new or materially changed features.
- **Major** (`2.0.0`) for a breaking redesign, platform change, or data-model migration.

### Decision log

| Version | Date | Decision / change | Rationale |
| --- | --- | --- | --- |
| 1.9.11 | 2026-08-30 | Pulled Vercel's Preview environment *without* branch scoping (`vercel env pull --environment=preview`, no `--git-branch`) to check whether a per-branch override could point some other preview deployment (a stray branch, a PR) at LIVE instead of DEV. It resolves to the same `kuiprqheyynaapncqffa` (DEV) as the `dev`-branch-scoped pull in v1.9.9, with the same `0004` schema present. No override exists — every preview deployment on this project uses the same DEV-targeting value regardless of branch. Credentials file deleted immediately after the check. This completes the full Vercel-facing matrix: Production → LIVE (v1.9.8, re-confirmed v1.9.10), Preview (branch-scoped and unscoped) → DEV (v1.9.9, this entry). | Rules out the one scenario the branch-scoped check in v1.9.9 couldn't: a preview deployment on some other branch accidentally serving against production data. |
| 1.9.10 | 2026-08-30 | Re-confirmed Vercel's Production environment, on request, using the same read-only method as v1.9.8/v1.9.9: pulled Production env vars fresh (`vercel env pull --environment=production`), confirmed `NEXT_PUBLIC_SUPABASE_URL` still resolves to `quznwilwemahoiuoqrpy` (LIVE), and queried `gym_settings`/`invoices`/`member_payments.invoice_id` directly with the pulled service-role key — same result as v1.9.8: default settings row present, `invoices` present (0 rows), `invoice_id` column present. No drift since v1.9.8. Credentials file deleted immediately after the check, as with every prior pull. | Answers a direct re-check request without assuming the earlier v1.9.8 result still holds; records that Production/LIVE was independently reconfirmed rather than only referenced. |
| 1.9.9 | 2026-08-30 | Confirmed Vercel's Preview environment for the `dev` branch is wired the same way as documented since v1.6.2, and holds the same schema verified on LIVE in v1.9.8. Pulled Preview env vars scoped to the `dev` branch (`vercel env pull --environment=preview --git-branch=dev`, again deleted immediately after use): `NEXT_PUBLIC_SUPABASE_URL` resolves to `kuiprqheyynaapncqffa` — DEV, matching `.env.local` — not LIVE. Queried that URL directly with its own service-role key (not `.env.local`'s) and got the same result as the LIVE check: `gym_settings` default row present, `invoices` table present (0 rows), `member_payments.invoice_id` column present. | Confirms the Production/Preview → LIVE/DEV mapping this document has relied on since v1.6.2 hasn't drifted, and that both Vercel-facing environments — not just the two Supabase projects directly — agree on the schema after `0004`. |
| 1.9.8 | 2026-08-30 | Confirmed `0004_payments_and_bills.sql` is applied on LIVE (`quznwilwemahoiuoqrpy`), matching DEV, closing the gap left open since v1.9.1 (which only verified DEV). Linked the local checkout to the `body-soul-fitness` Vercel project (`vercel link`) and pulled its Production environment variables (`vercel env pull`) to get LIVE's own Supabase URL/service-role key rather than reusing DEV's from `.env.local`, then queried the LIVE REST API directly and deleted the pulled credentials file immediately after: `gym_settings` returned its default singleton row (`id=1`, `gym_name: "Body & Soul Fitness Center"`, `tax_rate: 0.00`); `invoices` returned `200` with 0 rows (table exists, no real invoices yet, as expected); `member_payments?select=invoice_id` returned `200` (the column exists — a missing column would have been a PostgREST error, not an empty result). Linking the project added `.vercel` to `.gitignore` (needed for `vercel env pull`/`link` to work) along with a redundant `.env*` entry already covered by the existing `.env*.local` line. | Closes the last unverified claim in this module's rollout — that LIVE actually has the schema the owner said they applied — using a read-only, credential-scoped check instead of taking it on the owner's word, consistent with how this document has treated "applied" vs. "verified" as different claims since v1.6.1. |
| 1.9.7 | 2026-08-30 | Checked the `main` deployment for `24ff5c1` (v1.9.6's button-verification doc commit) directly via the Vercel CLI (`vercel ls body-soul-fitness` → `vercel inspect <url> --logs`) rather than the owner checking the dashboard by hand. The latest Production deployment (`body-soul-fitness-e48fjn1j7-*`) was `● Ready`: clean build log — TypeScript passed, all 21 routes generated including `/invoices/[id]/pdf`, `/payments`, and `/settings`, `Deployment completed`, no errors. | Confirms `main` keeps building cleanly through this run of docs-only commits, and establishes the Vercel CLI check introduced in v1.9.3 as the repeatable path for this instead of needing the owner to check the dashboard each time. |
| 1.9.6 | 2026-08-30 | Verified the invoice receipt's three action buttons individually against DEV, on a fresh temporary test member/plan/subscription. **Send via WhatsApp**: with the owner supplying a real number (`+919008544888`), opened the generated `wa.me` link and confirmed it landed on `api.whatsapp.com`'s share page showing "Chat on WhatsApp with +91 90085 44888" with the exact prefilled invoice message — stopped there deliberately without clicking "Open app"/"Continue to WhatsApp Web" or sending, since actually delivering the message is a step that stays with the owner, not something to automate. **Download PDF**: fetched `/invoices/[id]/pdf` directly and confirmed `200`, `Content-Type: application/pdf`, the correct `Content-Disposition` filename, and a body starting with the `%PDF-` header. **Print**: confirmed the button calls `window.print()` (verified with a spy in place of the real function, so no system print dialog was actually triggered) and that the button bar carries `print:hidden` while the receipt container carries the print-specific layout classes, so a real print/"Save as PDF" would show only the clean receipt. Test member, plan, and their invoice were deleted from DEV afterward. | Closes out button-level verification of the receipt page that v1.9.1's end-to-end pass didn't individually exercise (it created a PDF download and a WhatsApp link but didn't confirm each control in isolation or with a real destination number), while keeping the actual message-send action in the owner's hands rather than the agent's. |
| 1.9.5 | 2026-08-30 | The owner checked the Vercel deployment logs directly for the `main` push carrying `ceb6a87` (v1.9.4's duplicate-project cleanup) and confirmed the build succeeded with no errors. With the two broken duplicate projects removed in v1.9.4, this is now unambiguously a check of the one real `body-soul-fitness` project. | Confirms the project cleanup in v1.9.4 didn't itself introduce any deployment issue, and that `main` continues to build cleanly through a docs-only commit. |
| 1.9.4 | 2026-08-30 | Resolved the duplicate-Vercel-projects ambiguity flagged in v1.9.3. Checked all three via the Vercel API (project env vars, attached domains, and each project's last 5 deployments): `body-soul-fitness-h2h9` and `body-soul-fitness-fy4w` had no Supabase environment variables configured, no custom domain (only their default `*.vercel.app`), and **every single deployment on both, including the latest pushes, was in `ERROR` state** — they never worked and nothing depended on them. Only `body-soul-fitness` (`prj_K9fmHkFJDcjOwCPSQQpaLUhEVWGH`) had the Supabase env vars wired for Production and Preview and a working deployment history — this is the project this document has tracked since v1.6.2. With the owner's confirmation, deleted `body-soul-fitness-h2h9` and `body-soul-fitness-fy4w` via `vercel project rm`. Only `body-soul-fitness` remains under the team scope; every future push to `main`/`dev` now triggers exactly one build instead of three. | Removes two broken, unused Vercel projects that were silently rebuilding (and failing) on every push, and eliminates the risk of a future session inspecting, deploying to, or reporting status from the wrong one of three identically-repo-linked projects. |
| 1.9.3 | 2026-08-30 | Confirmed the Production build itself, not just page reachability, using the Vercel CLI (`vercel login` via device-code OAuth, since no Vercel MCP/API access existed in-session; the CLI wasn't previously authenticated or linked in this environment). The owner-supplied Production URL (`body-soul-fitness-kr2sliiub-body-soul-fitness.vercel.app`) is deployment `dpl_eQPY6pPTo678KuuSCXa9FJuVNeys`: `target: production`, `status: Ready`, created 2026-08-30, aliased to both the stable `https://body-soul-fitness.vercel.app` and the `git-main` branch alias, confirming it's the `main`-branch deployment. Its build log shows a clean build: TypeScript passed, all 21 routes generated including the new `/invoices/[id]`, `/invoices/[id]/pdf`, `/payments`, `/payments/export`, and `/settings`, no errors. This is still a build/reachability check only — the underlying Payments & Bills behavior (tax computation, invoice numbering, PDF generation, payment sync) remains functionally verified against DEV only, per v1.9.1; nothing was exercised against LIVE. Also discovered three separate Vercel projects exist under the `body-soul-fitness` team scope (`body-soul-fitness`, `body-soul-fitness-h2h9`, `body-soul-fitness-fy4w`), each with its own Production URL — this document has only ever tracked one; which of the three (if not all) actually correspond to this repository's deployments is unconfirmed and worth the owner clarifying to avoid checking or deploying against the wrong one in the future. | Distinguishes a page loading (v1.9.2, which only proves Vercel Deployment Protection let a request through) from the build that served it actually succeeding cleanly, and flags an unresolved ambiguity (multiple same-named Vercel projects) before it causes a future session to inspect or deploy the wrong one. |
| 1.9.2 | 2026-08-30 | `dev` (`99de940`) was fast-forward merged into `main` and pushed, deploying the Payments & Bills module to Production. The owner confirmed the Production URL loads the new pages (Settings, Payments, Invoices) without error. This was a load check only — no invoice/subscription/payment was created or exercised against LIVE (`quznwilwemahoiuoqrpy`); the module's functional behavior (tax computation, invoice numbering, PDF generation, payment sync) remains verified only against DEV, per v1.9.1. | Records that the module is live in Production and reachable, while keeping the distinction this document has drawn since v1.6.1 between a page loading and a feature being functionally verified — the two are not the same claim. |
| 1.9.1 | 2026-08-30 | The owner applied `0004_payments_and_bills.sql` to both DEV (`kuiprqheyynaapncqffa`) and LIVE (`quznwilwemahoiuoqrpy`). Verified end-to-end against DEV in-browser on a temporary test member/plan/subscription: set gym contact details and an 18% tax rate on `/settings` (saved correctly); created a plan and a subscription with a ₹1,000 partial payment, which generated invoice `INV-2026-000001` automatically and correctly computed the tax-inclusive total (₹3,000 amount → ₹3,540 total at 18% GST) and balance due (₹2,540) on both the subscription and the invoice; recording the ₹2,540 balance payment brought both to Paid, with the invoice's payments-received table showing both the cash and UPI payments and the correct authorized staff name. The receipt page rendered every required field (gym name/contact, invoice number/date, member name/ID/mobile, plan and dates, amount/discount/tax/paid/balance, payments table, authorized staff, thank-you message); Download PDF returned a valid `application/pdf` response with the correct filename (verified the byte stream started with the `%PDF-` header, confirming `pdfkit` + `serverExternalPackages` works correctly at runtime); Send via WhatsApp produced a correctly formed `wa.me` link with the country code prepended and the message properly URL-encoded. The member profile's new Invoices section listed the invoice with working Download/WhatsApp actions. `/payments` correctly joined payments to their invoice and member, and both the method filter and CSV export returned the correctly filtered/formatted data. Test member, plan, and their cascaded subscription/payment/invoice/event rows were then deleted from DEV via a one-off service-role script, and `gym_settings` was reset back to defaults (blank contact fields, 0% tax) since the test values were placeholders, not the gym's real contact/tax details — DEV confirmed back to 0 members, 0 plans, 0 invoices afterward. LIVE was not independently exercised (local development only points at DEV), consistent with how LIVE has been verified schema-only since v1.6.1. | Closes the loop opened by v1.9.0 by actually exercising invoice generation, tax computation, PDF/WhatsApp output, and the payments list against a live database, and confirms the subscription/invoice balance figures stay identical after tax was introduced rather than silently drifting apart. |
| 1.9.0 | 2026-08-29 | Implemented the Payments & Bills module on `dev`: every subscription creation (including renewals, which already create a new subscription row) now also creates an `invoices` row with a unique auto-generated number (`INV-2026-000001`, ...) via a Postgres sequence + insert trigger, mirroring the `members_member_id_seq` pattern from 0002. A new `gym_settings` singleton row, editable at `/settings`, holds gym contact details (address, phone, email, website, GSTIN) and an optional tax rate/label applied on top of each subscription's post-discount amount — leaving the rate at 0 (the default) keeps every invoice tax-free, matching "tax if configured." Subscription `balance_due`/`amount_paid`/`payment_status` now reflect the tax-inclusive total (previously, before tax existed, they only tracked the pre-tax plan price), and the existing "Record payment" action on a subscription now updates both the subscription and its linked invoice together so they can never drift apart; full, partial, and later balance-remaining payments all flow through that same one path. Each invoice has a printable receipt page at `/invoices/[id]` (gym name/contact, invoice number/date, member name/ID/mobile, plan and subscription dates, amount/discount/tax/amount paid/balance due, a payments-received table, authorized staff, and the configurable thank-you message) with Print (browser print, via Tailwind `print:` utilities to hide chrome), Download PDF (`/invoices/[id]/pdf`, generated server-side with `pdfkit` using only its built-in standard fonts, `pdfkit` kept out of the webpack bundle via `serverExternalPackages` so its font-metrics file reads resolve correctly at runtime), and Send via WhatsApp (a `wa.me` deep link with a prefilled draft message — staff still have to hit send themselves in their own WhatsApp, so no delivery is automated, consistent with the brief). The member profile page gained an Invoices section with the same three actions per invoice. A new `/payments` list joins `member_payments` to its invoice and member (`!inner` so bill-status/member filters actually constrain the query, not just the embed) with date-range, payment-method, member-search, and bill-status filters, pagination, and CSV export, mirroring the `/members` list's filter/export pattern. Schema changes are in `supabase/migrations/0004_payments_and_bills.sql` — `gym_settings`, `invoices`, and an `invoice_id` column on `member_payments` — RLS-enabled with no policies, same posture as every prior migration. `npx tsc --noEmit` and `pnpm build` both pass. **Not yet applied to DEV or LIVE and not functionally verified** — the Supabase MCP connection available in this session is authorized for a different, unrelated Supabase account (its only projects are `qppoydbfbtuzchtggeue` and `lqxgoqugfmjxkpcycdko`), not the `kuiprqheyynaapncqffa`/`quznwilwemahoiuoqrpy` pair `.env.local` and this document actually use, so it could not be used to apply the migration the way past migrations were; the owner chose to skip live verification for this pass rather than apply it manually. | Delivers the invoicing/receipt piece the Plans & Subscriptions module (v1.8.0) explicitly deferred ("receipt issuance is not yet implemented"), and keeps subscription and invoice money-owed figures as one source of truth instead of two independently-updated numbers that tax would otherwise have pulled apart. |
| 1.8.1 | 2026-08-29 | The owner applied `0003_plans_and_subscriptions.sql` to both DEV (`kuiprqheyynaapncqffa`) and LIVE (`quznwilwemahoiuoqrpy`), superseding v1.8.0's "not yet applied" note. Verified end-to-end against DEV in-browser: `/plans` now loads instead of failing closed. Creating a plan (name, duration, standard price, discount) computed the final price correctly and listed it. This surfaced a real bug — the subscription form's plan `<select>` had no `name` attribute, so submitting always failed field validation with "Select a plan" even with a plan visibly chosen; fixed in `app/(admin)/subscriptions/new/subscription-form.tsx` by adding a hidden `plan_id` input tied to the selected plan, matching the pattern already used for `plan_name`/`duration_unit`/etc. on the same field. With the fix, verified the full lifecycle on a temporary test member/plan/subscription: creation with a partial payment computed the correct end date (start date + duration − 1 day), balance due, and Partial status; Record payment brought it to Paid with both payments logged; Extend correctly pushed the end date out and logged an event; Freeze set status to Frozen with the reason and correctly hid the Extend/Freeze forms while showing Resume; Resume (same-day, so no end-date extension applied, correctly) returned it to Active; Cancel set it to Cancelled, hid all mutating actions, and the full six-event history (created → payment → extended → frozen → unfrozen → cancelled) remained intact throughout. The subscriptions list and member profile page both reflected the final state correctly. Test member, plan, subscription, payments, and events were then deleted from DEV via a one-off service-role script (member delete cascaded the subscription/payment/event rows; plan deleted separately) — DEV confirmed back to 0 members and 0 plans afterward. LIVE was not independently exercised in this pass (local development only points at DEV per `.env.local`); its schema-level application is taken on the owner's word, consistent with how LIVE has been verified schema-only (not functionally) since v1.6.1. | Closes the loop opened by v1.8.0 by actually exercising the module against a live database instead of only a pre-migration smoke test, and catches a real submission-blocking bug that only live testing (not `tsc`/`build`) could have found. |
| 1.8.0 | 2026-08-29 | Implemented the Plans & Subscriptions module on `dev`: a `plans` catalog (name, duration in days or months with 1/3/6-Month and 1-Year quick presets, standard price, flat-amount or percentage discount, auto-computed final price, description, included services, active/inactive toggle) at `/plans`; and a full subscription lifecycle on top of the `member_subscriptions` table from 0002 — creating a subscription (from a member's profile or standalone at `/subscriptions/new`, with a debounced member search) records start date, an automatically calculated end date (plan duration applied to the start date, both dates treated as inclusive), final amount, discount, payment status, amount paid, balance due, payment mode, and notes, and posts the initial payment to `member_payments` so that table (schema-only since 0002) now has a writer. Subscription status displays as Active, Expiring Soon, Expired, Frozen, or Cancelled — only Active/Frozen/Cancelled are stored; Expiring Soon and Expired are always derived from `end_date` at read time so they can't drift from the calendar. Renew creates a new linked subscription (preserving the old one); Extend, Freeze (with required reason), Resume (optionally re-extending the end date by the number of days frozen), Cancel (with required reason), and Record payment all mutate the current subscription in place, each logged to a new `subscription_events` audit table so the full history survives the mutation — mirroring the audit pattern `member_status_changes` established in 0002. The subscriptions list surfaces exact 7/3/1-day expiry alerts (member name, mobile, linked to the subscription). Schema changes are in `supabase/migrations/0003_plans_and_subscriptions.sql`: the new `plans` and `subscription_events` tables, and `member_subscriptions` extended with the plan snapshot, discount/payment/freeze/cancel columns and a `renewed_from_id` self-reference; the old unused `amount` column is dropped and the `status` check constraint is tightened to `active`/`frozen`/`cancelled` (safe as a same-transaction change since, per 0002's own note, nothing has ever written to this table before this module). The "Plans & billing" sidebar link, previously a disabled placeholder, now points to `/subscriptions`. TypeScript (`npx tsc --noEmit`) and `pnpm build` both pass; the module was also smoke-tested against DEV (`kuiprqheyynaapncqffa`) in-browser — `/subscriptions` and `/members` render correctly against the pre-0003 schema (empty, since neither table has real rows yet), and `/plans` fails closed with a readable "Could not find the table 'public.plans'" message instead of crashing, confirming 0003 has **not** yet been applied to DEV or LIVE. No plan/subscription/payment records have been created or verified end-to-end yet — that requires running 0003 against DEV first. | Delivers the module that 0002/v1.6.0 explicitly deferred subscription, payment, freeze, and cancel ownership to, and gives `member_payments` its first real writer instead of leaving it permanently empty. |
| 1.7.1 | 2026-08-29 | Recorded the exact Vercel Deployment Protection configuration, checked directly in Settings → Deployment Protection rather than left as the unaudited item noted in v1.7.0: Vercel Authentication **on** at "Standard Protection" scope; Password Protection **off** (Pro-plan-only feature, not subscribed). Flagged that "Standard Protection" is documented by Vercel to exclude custom domains attached to Production — a non-issue today since this project has no custom domain, but a real gap that would open once one is attached, unless revisited first. | Closes the last unverified item from v1.7.0 and records a concrete pre-condition (in-app auth, or revisited protection settings) before a custom production domain is attached. |
| 1.7.0 | 2026-08-29 | Corrected a documentation error repeated since v1.4.0: `main` was **not** "unchanged and documentation-only" — the owner confirmed it was deliberately kept in sync with `dev` (fast-forward) through the dashboard foundation and Enquiry Management module, so those have been live in Production against LIVE Supabase (`quznwilwemahoiuoqrpy`) since before this session. This was discovered by checking Vercel's Deployments list directly rather than trusting this document. Confirmed the Production URL is gated by **Vercel Deployment Protection** (Vercel Authentication) — visiting it redirects to a Vercel account login, not the app — which mitigates, but does not replace, the still-missing in-app admin authentication; it's tied to Vercel team membership, not gym staff accounts, and its exact scope (all environments/domains vs. some) should be confirmed in Settings → Deployment Protection when convenient. With the owner's confirmation, fast-forward merged `dev` into `main` (`b1f19c9` → `ff5fc0c`) and pushed, so the Member Management module (v1.6.0–1.6.2) is now deployed to Production against LIVE Supabase, which was already schema- and data-verified as of v1.6.2. | Keeps the documented deployment state truthful instead of assumed, and completes the intended release of Member Management now that both the code and the database it depends on are verified. |
| 1.6.2 | 2026-08-29 | Corrected two inaccuracies from v1.6.1, both discovered by checking the owner's actual Vercel dashboard rather than assuming: (1) Vercel's environment variables **are** already configured — `main` (Production) points to LIVE (`quznwilwemahoiuoqrpy`), `dev` (Preview) points to DEV (`kuiprqheyynaapncqffa`) — correctly isolating preview traffic from the live database, so v1.6.1's claim that neither project's credentials were wired into Vercel was wrong. `main` still has no application code deployed to it yet, so this isn't serving real traffic. (2) LIVE was not actually empty — it held one leftover test record ("Ananya Rao," referenced but not resolved in v1.5.0's validation notes) in both `members` and `enquiries`, confirming that the v1.5.0 Enquiry Management end-to-end test ran against Production/LIVE, not DEV as previously assumed. That record has now been deleted from LIVE (`converted_member_id` nulled first to break the circular foreign key with `members.source_enquiry_id`, then both rows removed) and both tables confirmed at 0 rows. DEV and LIVE are now schema-identical and both hold zero data. | Prevents operating on a false picture of deployment/data state; the Vercel mapping in particular is safety-relevant since a misconfigured Production pointing at DEV would have let preview testing corrupt real customer data. |
| 1.6.1 | 2026-08-29 | Clarified that there are **two** Supabase projects, not one, correcting the "production Supabase project" wording used through v1.5.0/v1.6.0: **DEV** (`kuiprqheyynaapncqffa`, referenced by `.env.local` and used by local development and the `dev` Vercel preview branch) and **LIVE** (`quznwilwemahoiuoqrpy`, not yet referenced by any app environment variable). Both `0001_enquiry_management.sql` and `0002_member_management.sql` are now applied and schema-verified on **both** projects — LIVE already had `0001` applied from earlier provisioning; `0002` was applied fresh to both DEV and LIVE in this pass. Fixed a bug in `0002_member_management.sql` found while applying it to DEV: the `setval()` call advancing `members_member_id_seq` past backfilled rows failed with "value 0 is out of bounds" on a `members` table with zero existing rows, since a sequence's minimum value is 1; replaced it with a count-aware `setval(..., greatest(n, 1), n > 0)` so an empty table correctly starts the next generated ID at `BSFC-000001`. Verified live end-to-end on DEV: registration (auto-generated ID, photo-less path), the duplicate-mobile block (client-side blur warning and server-side hard block, both linking to the existing record), list search/filters/CSV export, an audited status change with a logged reason, adding a note, editing a member, and the Convert-to-Member flow from an enquiry (prefill, conversion, activity timeline, sequence continuing correctly to `BSFC-000002`); all test records were then deleted from DEV. LIVE was verified at the schema level only (columns, new tables, storage bucket, sequence state) since no app environment currently points to it — it isn't wired into Vercel and has no real member data yet, so there was nothing to functionally test there. Member Management is code-complete and both databases are launch-ready for it. | Corrects a factual error carried through the last two versions' documentation and confirms both databases are in a known, consistent, verified state before either receives real member data. |
| 1.6.0 | 2026-08-29 | Implemented the Member Management module on `dev` with commit `d7b5b46`: a full member registration form (auto-generated `BSFC-000001`-style member ID, personal/contact/emergency-contact/address details, photo upload to a private Supabase Storage bucket, joining date, fitness goal, medical notes/health declaration, referred-by, assigned trainer, and the full `active`/`inactive`/`frozen`/`expired`/`suspended` status lifecycle); a member list with search (member ID, name, mobile), filters (status, trainer, joining date, derived plan status), pagination, and CSV export; and a full member profile page (personal info, subscriptions, payment/bill history, check-in/check-out history, notifications sent, notes, edit, and an audited deactivate/freeze/reactivate/suspend status-change flow requiring a reason). Duplicate member creation is blocked at the mobile-number check (both on Add and Edit) and points staff to the existing record instead of allowing a second one. Schema changes are in `supabase/migrations/0002_member_management.sql`, extending the minimal `members` table from v1.5.0 and adding `member_status_changes`, `member_subscriptions`, `member_payments`, `member_checkins`, `member_notifications`, and `member_notes`, all RLS-enabled with no policies (server-only service-role access, same posture as 0001). The migration has not yet been applied to the production Supabase project — it needs to be run manually (Supabase SQL editor or `supabase db push`) before this module works against live data; the module is code-complete but not yet live. Subscription/payment/check-in/notification creation UI is intentionally not built yet — those stay owned by the future Plans & billing, Attendance, and Announcements modules per this document's module breakdown; the profile page displays them read-only with empty states until those modules populate them. | Delivers the next-highest-priority pending checklist item (member records) on top of the Enquiry Management module, while keeping status changes auditable and new modules from duplicating each other's data ownership. |
| 1.5.0 | 2026-08-29 | Implemented the Enquiry Management module on `dev` with commit `9585554`: Add Enquiry form, searchable/filterable/paginated enquiry list with CSV export, an enquiry detail page with a follow-up activity timeline, and a Convert-to-Member flow with a minimal new `members` table and registration form. All reads/writes go through Next.js Server Actions using a server-only Supabase **service-role** key (`SUPABASE_SERVICE_ROLE_KEY`, not exposed to the browser) rather than the public/anon key, since admin authentication does not exist yet; `enquiries`, `enquiry_activities`, and `members` tables are defined in `supabase/migrations/0001_enquiry_management.sql` with RLS enabled and no policies (default-deny for `anon`/`authenticated`). The migration has not yet been applied to the production Supabase project and the service-role key has not yet been supplied, so the module is code-complete but not yet live. | Delivers the highest-priority pending checklist item (enquiry capture and lead management) while protecting newly introduced PII from the no-auth public key, consistent with treating RLS as an enforcement layer rather than UI hiding. |
| 1.4.1 | 2026-08-29 | Pinned `framework: "nextjs"` in `vercel.json` (commit `a643a89`) after a Vercel build failed with "No Output Directory named `public`" because Vercel's dashboard preset defaulted away from Next.js framework detection. | Ensures Vercel preview builds on `dev` complete without manual per-project dashboard reconfiguration. |
| 1.4.0 | 2026-08-29 | Implementation began on `dev` with commit `b59729c`: Next.js/TypeScript/Tailwind dashboard foundation, representative admin overview UI, local ignored Supabase environment configuration, and a pinned dependency lockfile. | Establishes the visual and project baseline while explicitly keeping production data, authentication, and schema work pending. |
| 1.3.2 | 2026-08-29 | Recorded the owner’s Vercel account/GitHub connection and adopted Vercel as the initial `dev` preview path, while retaining Cloudflare Pages as the intended commercial live host. | Enables hosted build testing before Cloudflare launch without changing the production-hosting or budget decision. |
| 1.3.1 | 2026-08-29 | Added a sequenced pre-build setup checklist, local developer prerequisites, and credential-handling boundaries. | Lets development start with only the required access while deferring deployment, messaging, and attendance-specific setup until the relevant module. |
| 1.3.0 | 2026-08-29 | Replaced member QR self check-in/out with one-tap attendance verified by gym Wi-Fi public-IP allowlist and browser geofence; retained administrator manual entry and QR/reception scanning only as optional high-assurance fallbacks. | Removes the camera/QR requirement while requiring two independent server-side presence signals. |
| 1.2.0 | 2026-08-29 | Approved two-portal product direction: Admin and Member portals; attendance, payment/receipt, and member self-service are initial-product requirements. | Gives members useful self-service while ensuring reported gym presence is not based on an unverifiable remote action. Superseded for self-service attendance by v1.3.0. |
| 1.1.0 | 2026-08-29 | Approved low-cost launch strategy: Supabase Free, Cloudflare Pages as the initial production host, direct Meta WhatsApp Cloud API when automation is enabled, and an annual infrastructure ceiling of ₹8,000. | Supports the expected low operational volume without using Vercel Hobby for commercial production; preserves a portable path to Vercel Pro and Supabase Pro. |
| 1.0.0 | 2026-08-29 | Initial product and technical blueprint created. | Establishes an implementation-ready baseline before software is built. |

---

## Current implementation status

**Active implementation branch:** `dev`  
**Latest recorded implementation commit:** `ff5fc0c` (also the current tip of `main` — the two branches are in sync as of v1.7.0)  
**Repository state:** `dev` has been pushed to GitHub. `main` is fast-forward-kept in sync with `dev` at release points (owner-confirmed, not the "documentation-only" state claimed in earlier versions of this document) and is currently at the same commit as `dev`.  
**Supabase projects:** **DEV** = `kuiprqheyynaapncqffa` (wired to `.env.local` and Vercel Preview, i.e. the `dev` branch). **LIVE** = `quznwilwemahoiuoqrpy` (wired to Vercel Production, i.e. `main`). Both have `0001_enquiry_management.sql`, `0002_member_management.sql`, and (as of v1.8.1) `0003_plans_and_subscriptions.sql` applied. LIVE serves the live Production deployment (dashboard, Enquiry Management, and — as of v1.7.0 — Member Management; Plans & Subscriptions has not been deployed to `main`/Production yet even though its migration is applied to the LIVE database), gated by Vercel Deployment Protection rather than in-app auth. DEV backs local development and Preview deployments.

### Delivered in the current foundation

- Next.js + TypeScript + Tailwind project/dashboard foundation, restructured into an `app/(admin)` route group with a shared sidebar/header layout shared by the dashboard, Enquiry Management, and Member Management pages.
- Premium admin overview UI shell.
- Enquiry Management module: Add Enquiry form (all fields from the checklist, including a soft mobile-number-duplicate warning); enquiry list with search, status/source/staff/date filters, pagination, and CSV export; enquiry detail page with a follow-up activity timeline, status updates, and a note/follow-up form; Convert to Member flow with a member registration form prefilled from the enquiry, which only marks the enquiry Converted after the member record is created successfully.
- Member Management module: full member registration form with an auto-generated `BSFC-000001`-style member ID (Postgres sequence + insert trigger), all checklist fields including a private-bucket photo upload, and the full `active`/`inactive`/`frozen`/`expired`/`suspended` status lifecycle; member list with search (member ID/name/mobile), filters (status, trainer, joining date, derived plan status), pagination, and CSV export; member profile page with personal info, subscriptions, payment/bill history, check-in/check-out history, notifications sent, notes (with add-note form), an edit page, and an audited status-change form (reason required, logged to `member_status_changes`). Duplicate member creation is hard-blocked on mobile number (Add and Edit both check and link to the existing record instead of creating a second one).
- Plans & Subscriptions module: plan catalog (`/plans`) with duration presets (1/3/6 Months, 1 Year, or custom), standard price, flat/percentage discount with an auto-computed final price, description, included services, and active/inactive status; subscription creation from a member's profile or standalone (`/subscriptions/new`) with a member search, automatic end-date calculation, discount/final-amount override, payment status/amount paid/balance due/payment mode, and notes; a subscription detail page (`/subscriptions/[id]`) with Renew, Extend, Freeze (reason required), Resume (with optional end-date re-extension for days frozen), Cancel (reason required), and Record payment actions, each logged to `subscription_events`; a subscriptions list with status/date/member filters, pagination, and exact 7/3/1-day expiry alerts.
- Database schema for `enquiries`, `enquiry_activities`, and `members` written as `supabase/migrations/0001_enquiry_management.sql`; extended by `0002_member_management.sql` with the member ID generator, the rest of the member profile columns, the expanded status lifecycle, `member_status_changes`, `member_subscriptions`, `member_payments`, `member_checkins`, `member_notifications`, `member_notes`, and a private `member-photos` storage bucket; further extended by `0003_plans_and_subscriptions.sql` with the `plans` and `subscription_events` tables and the full subscription-lifecycle columns on `member_subscriptions`. All new tables have RLS enabled with no policies (default-deny) since access is server-only, matching 0001.
- Server-only Supabase client (`lib/supabase/server.ts`, guarded with the `server-only` package) authenticated with a service-role key, used exclusively from Server Components and Server Actions so enquiry/member PII (including photos, served via short-lived signed URLs) is never reachable through the public browser key.
- Local ignored Supabase environment configuration.
- Pinned dependency lockfile for reproducible installs.
- `vercel.json` pinned to `framework: "nextjs"` so Vercel preview builds on `dev` use Next.js's own build/output handling instead of a defaulted static preset.

### Deliberate current limitations

- All dashboard overview values are representative **demo metrics** only. They are not production records, KPI queries, or business reporting. The Enquiry Management and Member Management modules' data is real/live, not demo data.
- Both `0001_enquiry_management.sql` and `0002_member_management.sql` have been applied to DEV (`kuiprqheyynaapncqffa`) and LIVE (`quznwilwemahoiuoqrpy`); `SUPABASE_SERVICE_ROLE_KEY` for DEV has been supplied locally in `.env.local`. Vercel is wired in: Preview (`dev` branch) → DEV, Production (`main` branch) → LIVE, and Production has been serving the dashboard and Enquiry Management module since before this session — Member Management joined it as of v1.7.0.
- LIVE held one leftover test record from the original v1.5.0 verification ("Ananya Rao," in both `members` and `enquiries`); it has been found and deleted, so LIVE currently holds zero rows in both tables.
- No Supabase authentication or admin/staff login exists yet inside the app itself. Production is currently gated by **Vercel Deployment Protection**, confirmed configured as: Vercel Authentication **on** at "Standard Protection" scope, Password Protection off (a Pro-plan-only feature, not currently subscribed). This is tied to Vercel team membership, not gym staff accounts, and is not a substitute for the planned in-app admin auth. Important caveat on "Standard Protection" specifically: per Vercel's documented behavior, it protects Preview deployments and the default `*.vercel.app` Production URL, but **excludes custom domains attached to Production** — there is no custom domain on this project yet, so everything is currently gated, but attaching one later would make Production reachable without any login unless this is revisited first. Add real admin auth (and re-verify or upgrade Deployment Protection) before attaching a custom domain to Production.
- "Assigned staff" and "Assigned trainer" are free-text fields for now — there is no staff/user or trainer table yet.
- Member subscriptions and payments now have full creation/mutation UI via the Plans & Subscriptions module (v1.8.0); check-ins and notifications still have schema and a read-only display only — that's intentionally left to the future Attendance and Announcements modules described in §4.
- `supabase/migrations/0003_plans_and_subscriptions.sql` (Plans & Subscriptions module) has been applied to both DEV and LIVE (v1.8.1) and verified end-to-end against DEV — see the v1.8.1 decision log entry. LIVE has not been independently functionally exercised, only taken on the owner's word that the migration ran, consistent with LIVE's schema-only verification posture since v1.6.1.
- The dashboard UI must not be treated as an authenticated admin portal until the pending data and authorization work is complete.

### Latest validation record

| Check | Result | Notes |
| --- | --- | --- |
| TypeScript | Passed | Completed successfully for commit `b59729c`. Re-verified for the Enquiry Management module (`pnpm build`) and again for the Member Management module (`npx tsc --noEmit`, `pnpm build`). |
| Next.js Webpack compilation | Passed | Compilation completed successfully, including the new `/members`, `/members/[id]`, `/members/[id]/edit`, `/members/new`, and `/members/export` routes. |
| `next build` final static-data phase | Unreliable locally | The final static-data phase is unreliable in the current local environment; treat the build as partially validated and re-check in a clean local/hosted environment before release. |
| Enquiry Management: `pnpm build` | Passed | Full production build succeeds and all new routes resolve to the expected dynamic/static rendering mode, verified with a temporary local placeholder value for `SUPABASE_SERVICE_ROLE_KEY` (not a real credential; reverted after the check). |
| Enquiry Management: end-to-end against production Supabase | Passed | After the owner applied `0001_enquiry_management.sql` and added the real `SUPABASE_SERVICE_ROLE_KEY`, verified live in-browser: created an enquiry, added a timeline note with a scheduled follow-up, and used Convert to Member — the enquiry correctly flipped to Converted only after the member record was created, and the list/detail pages reflected it. A test record ("Ananya Rao") was left in the production `enquiries`/`members` tables from this check; delete it via Supabase Table Editor if it shouldn't remain. |
| Member Management: `pnpm build` | Passed | Full production build succeeds against the real local `.env.local` Supabase credentials and all new routes resolve to the expected dynamic rendering mode. |
| Member Management: end-to-end against DEV Supabase (`kuiprqheyynaapncqffa`) | Passed | After applying `0002_member_management.sql`, verified live in-browser: registered a member and got `BSFC-000001`; the duplicate-mobile block fired both client-side (blur) and server-side, linking to the existing record; list search/status/trainer/plan-status filters and CSV export all reflected it; an audited status change (Active → Frozen) logged a reason, timestamp, and staff name; a note saved and displayed; editing the member persisted changes; and the Convert-to-Member flow from a fresh enquiry prefilled correctly, created `BSFC-000002`, marked the enquiry Converted, and logged it to the enquiry's activity timeline. Test records were deleted from DEV afterward via the service-role key (`members`/`enquiries` cascade-cleaned in dependency order due to the circular `source_enquiry_id` / `converted_member_id` foreign keys). |
| Member Management: schema verification on LIVE Supabase (`quznwilwemahoiuoqrpy`) | Passed | `0001_enquiry_management.sql` was already applied to LIVE from earlier provisioning (confirmed via `information_schema.tables` and a `members` column diff matching the 0001 schema exactly) before `0002_member_management.sql` was applied fresh. Confirmed via `information_schema`/`pg_catalog` queries: all new `members` columns, all six new tables, the `member-photos` storage bucket, and `members_member_id_seq` at its expected starting value. Not functionally tested end-to-end (no app environment points at LIVE yet, and it holds no real data), only schema-verified. |
| Plans & Subscriptions: `npx tsc --noEmit` and `pnpm build` | Passed | Re-verified after the `plan_id` field-name fix (v1.8.1); all new `/plans`, `/plans/new`, `/plans/[id]/edit`, `/subscriptions`, `/subscriptions/new`, and `/subscriptions/[id]` routes resolve to the expected rendering mode. |
| Plans & Subscriptions: end-to-end against DEV Supabase (`kuiprqheyynaapncqffa`) | Passed (after one fix) | After the owner applied `0003_plans_and_subscriptions.sql`, verified live in-browser on a temporary test member/plan/subscription: plan creation with live discount/final-price preview; subscription creation with automatic end-date calculation and a partial payment; Record payment to Paid; Extend; Freeze (reason logged, correct form visibility); Resume (correctly skipped end-date extension since frozen 0 days); Cancel (reason logged, all mutating actions correctly hidden afterward); the six-event `subscription_events` history stayed complete throughout; the subscriptions list and member profile page both reflected the final state. The initial attempt failed with a spurious "Select a plan" error despite a plan being selected — traced to the plan `<select>` missing a `name` attribute — fixed, then the full flow passed. Test member/plan/subscription/payments/events were deleted from DEV afterward via the service-role key (member delete cascaded the subscription/payment/event rows; plan deleted separately); DEV confirmed at 0 members and 0 plans. LIVE was schema-only, not functionally verified (see the v1.8.1 decision log entry). |

---

## 1. Product vision and scope

Body & Soul Fitness Center needs a dependable web presence and lightweight operations system for managing prospective members, members, memberships, payments, and attendance. The product has two protected experiences: an **Admin Portal** for gym operations and a **Member Portal** for secure self-service. The initial release should prioritize fast enquiry capture, clear membership information, trustworthy attendance, and simple, secure workflows over a broad gym-management suite.

### Primary outcomes

1. Convert website visitors into reachable leads.
2. Give administrators one reliable place to track enquiries and member records.
3. Make membership offerings and contact paths clear on mobile devices.
4. Enable timely follow-up through WhatsApp while retaining business records in the application.
5. Give each member a secure view of their membership, receipts, gym announcements, and visit history.
6. Record check-ins and check-outs through an on-site presence-validation flow, producing trusted attendance and operational KPIs.
7. Create a foundation that can add staff access, payments automation, and multi-location operations without a rewrite.

### Release boundaries

| In scope for the foundation / MVP | Explicitly deferred unless approved |
| --- | --- |
| Public marketing pages, enquiry form, Admin Portal, Member Portal, membership-plan and member records, payment/receipt records, Wi-Fi-IP-and-geofence-validated one-tap check-in/out, attendance, WhatsApp contact links/templates, and deployment/monitoring baseline. | Native mobile apps, biometric attendance hardware, payroll, full accounting, workout programming, nutrition coaching, automated recurring billing, and multi-branch operations. |

### Assumptions requiring owner confirmation before build

- The initial business operates one location; the data model should remain branch-ready.
- One or two trusted administrators will manage the system at launch; no staff accounts are required initially.
- The planning horizon is approximately 3,000 total historical members within two years, with 100–200 active/admin interactions per month. This is a low-volume operations application, not a high-concurrency consumer platform.
- WhatsApp is a primary customer communication channel. The initial integration may be click-to-chat; when automation is enabled, use the direct Meta WhatsApp Cloud API rather than an intermediary provider, subject to business verification and consent requirements.
- Membership pricing, plan durations, business address, contact information, operating hours, branding, and privacy-policy text are business inputs to be supplied before launch.
- Online payment collection is not assumed in the initial release.

---

## 2. Recommended technology stack

This is the default stack for implementation. Substitutions should be recorded in the decision log before they are adopted.

| Concern | Recommendation | Why |
| --- | --- | --- |
| Application | **Next.js (App Router) + TypeScript** | Full-stack React framework with strong conventions, server rendering, forms, and deployment support. |
| UI | **Tailwind CSS + shadcn/ui** | Fast, accessible, maintainable interface primitives without a heavy visual dependency layer. |
| Backend / data | **Supabase**: Postgres, Auth, Row Level Security, Storage, Edge Functions if needed | Managed relational data, authentication, authorization, and storage suited to a small operations application. |
| Hosting | **Vercel** for initial development/preview builds; **Cloudflare Pages** for initial commercial production | The owner’s Vercel account is connected to GitHub and will build `dev` previews. Keep the Next.js implementation deployment-portable; Cloudflare Pages remains the planned live host. Do not use Vercel Hobby for commercial production. |
| Source control | **GitHub** | Version history, pull requests, issue tracking, protected main branch, and deployment integration. |
| Customer messaging | **WhatsApp** | Use click-to-chat links first; when approved automation is enabled, integrate directly with Meta WhatsApp Cloud API. |
| Validation | Zod with React Hook Form or server-action validation | Shared, explicit validation at each untrusted input boundary. |
| Testing | Vitest for units; Playwright for critical browser flows | Covers business rules and the public/admin paths that matter most. |
| Error and product monitoring | Cloudflare/Supabase logs initially; add Sentry if error volume or debugging needs justify it | Keeps operating cost low while maintaining basic visibility. |

### Architectural principles

- Prefer server-side data access and Server Actions/route handlers for privileged operations; do not expose service-role credentials to browsers.
- Keep server code runtime-portable: avoid unneeded Vercel-only APIs, background-job assumptions, or platform-specific data stores. Verify each required Next.js server capability on Cloudflare Pages before it is adopted.
- Treat Supabase Row Level Security (RLS) as the authorization enforcement layer, not merely UI hiding.
- Keep public content, operational records, and business configuration logically separate.
- Use stable identifiers, timestamps, and audit fields on operational records.
- Optimize mobile-first: most public visitors and many administrators will use phones.
- Start simple, but retain extension points for staff roles, multiple locations, payments, and automation.

---

## 3. Architecture

### High-level flow

```text
Public visitor
  └─> Next.js public site on Cloudflare Pages
        ├─> Server Action / API route validates enquiry
        │     └─> Supabase Postgres (enquiries, consent, audit fields)
        └─> WhatsApp click-to-chat (visitor-initiated conversation)

Administrator
  └─> Next.js protected admin area
        ├─> Supabase Auth (authenticated session)
        ├─> Supabase Postgres through RLS (leads, members, memberships, payments, visits)
        └─> Supabase Storage (only if media/documents are approved later)

Member
  └─> Next.js protected member area
        ├─> Supabase Auth (authenticated session)
        ├─> Supabase Postgres through member-scoped RLS
        └─> One-tap check-in/out → server verifies gym Wi-Fi public IP + browser geofence → visit event

GitHub repository
  └─> Cloudflare Pages preview deployments → reviewed production deployment

Future scale/hosting path
  └─> Portable Next.js codebase → Vercel Pro and/or Supabase Pro when justified
```

### Application boundaries

| Layer | Responsibility | Must not do |
| --- | --- | --- |
| Public site | Present brand, facilities, plans, contact details, and capture enquiries. | Expose administrative data or privileged credentials. |
| Admin area | Enable authorised operations staff to manage leads, plans, and members. | Rely solely on client-side role checks. |
| Member area | Let an authenticated member see only their own membership, visits, receipts, announcements, and profile; request verified one-tap check-in/out. | Treat the public member ID as a credential, reveal other members’ information, or accept a button, SSID claim, or geolocation signal alone as proof of presence. |
| Server layer | Authenticate context, validate input, apply business rules, call privileged services where truly needed. | Trust browser-provided identifiers, roles, or status values. |
| Database / RLS | Persist data and enforce access policies by authenticated role. | Depend on the application UI to enforce data isolation. |
| WhatsApp | Provide a customer communication channel and optional approved automation. | Act as the only record of a lead or customer interaction. |

### Environment separation

- **Local development:** developer-controlled environment with local values and non-production data.
- **Preview:** one Cloudflare Pages deployment per pull request; point to an isolated Supabase project or a protected preview-safe configuration. Do not use live member records in previews.
- **Production:** approved Cloudflare Pages project and production Supabase project; access limited to named owners/admins.

Required secrets include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only Supabase/Meta service integration secrets where applicable. Store them in Cloudflare Pages and local `.env.local`; never commit secrets to GitHub.

---

## 4. Product modules

### Public website

| Module | Purpose | MVP contents |
| --- | --- | --- |
| Home | Explain the value proposition and drive an action. | Hero, primary CTA, highlights, social proof if supplied. |
| About / facilities | Build trust. | Gym story, amenities, imagery, location and hours. |
| Membership plans | Help visitors choose. | Active plans, price/display terms, benefits, CTA. |
| Enquiry | Capture prospective member information. | Name, phone/WhatsApp, optional email, interest, message, consent, validation, success state. |
| Contact | Let a visitor reach the gym immediately. | Address/map link, hours, tap-to-call, WhatsApp click-to-chat, social links. |
| Legal | Meet basic transparency expectations. | Privacy notice and terms/cancellation text as applicable. |

### Admin operations

| Module | Purpose | MVP contents |
| --- | --- | --- |
| Authentication | Restrict operational access. | Email/password or magic-link sign-in, session handling, secure sign-out. |
| Dashboard | Give the administrator a current operational and commercial picture. | See the approved KPI set below, with filters/period definitions documented in the interface. |
| Lead management | Turn enquiries into visits or memberships. | List/filter, lead detail, status, owner, notes, next follow-up date, WhatsApp action. |
| Members | Maintain basic active-member records. | Member profile, contact details, membership status/plan, start/end dates, notes. |
| Membership plans | Keep public and admin plan data consistent. | Create/edit/archive plan, display ordering, price, duration, benefits, active flag. |
| Memberships, payments, and receipts | Record membership commitments and money actually received. | Membership term, amount due, payment records, outstanding balance, receipt creation/download, and manual-payment support. |
| Attendance | Maintain practical, verified visit history and current occupancy. | Wi-Fi-IP-and-geofence-validated one-tap check-in/out, current-inside list/count, recent visits, and administrator manual fallback/correction with audit trail. |
| Announcements | Communicate relevant gym updates to members. | Create/publish/archive announcements; member-visible announcement feed. |
| Settings | Centralize operational configuration. | Business contact details, WhatsApp number, opening hours, basic organization details. |

### Initial admin dashboard KPIs

| KPI group | Initial measures | Definition / source of truth |
| --- | --- | --- |
| Revenue and balances | Monthly collected revenue; outstanding balances; revenue trend; plan mix. | Collected revenue is successful payment records with `paid_at` in the selected month. Outstanding balance is the approved amount due for active/relevant membership terms minus recorded successful payments. Revenue trend uses the same payment definition; plan mix counts current memberships by plan. |
| Membership health | Active, expiring, expired, and frozen memberships. | Use membership-term status and end dates. The expiring window must be a documented configurable value; do not silently use a different definition in each view. |
| Lead funnel | New enquiries and conversion. | New enquiries are leads created in the selected period. Conversion is leads marked `converted` in that period, with the denominator and period displayed clearly. |
| Live presence and attendance | Check-ins today, members currently inside, attendance/recent visits. | Derived from server-recorded attendance-verification and visit events. “Currently inside” means a valid open visit (checked in, no checked-out time), not a browser session. |

### Member Portal MVP

| Module | Member capability | Data/access rule |
| --- | --- | --- |
| Membership home | View membership status, expiry, plan, renewal details, and outstanding balance if applicable. | Only the signed-in member’s current and historical membership data. |
| Check-in/out | See today’s visit state and use one action to request check-in or check-out. | Server requires both a verified gym Wi-Fi public-IP match and browser geolocation within the configured gym geofence, then validates membership and state transition. |
| Attendance | View this month’s attendance count, current streak, all-time visits, and recent visit history. | Counts derive from completed/valid visit events; define a visit day in the gym’s configured timezone. |
| Receipts | View and download their payment receipts. | Authorize each receipt against the signed-in member before rendering or issuing a download URL. |
| Announcements | View currently published gym announcements. | Members can read published organization announcements only. |
| Profile | View and update permitted personal contact/profile details. | Sensitive changes are validated, audited, and constrained by RLS/server rules. |

### Later modules (planned, not committed)

- Staff accounts and task assignment.
- Visits/trials, conversion reporting, and automated follow-up reminders.
- Recurring billing/payment-gateway integration.
- Branch management.
- Consent-aware WhatsApp Business API messaging and templates.

---

## 5. Roles and permissions

### Launch roles

| Role | Initial users | Permissions |
| --- | --- | --- |
| Administrator | One or two business owners / trusted operators | Full access to all current modules, settings, staff management when added, and administrative records. |
| Member | Active, pending, frozen, expired, or cancelled member with a provisioned account as business rules allow | Sign in to the Member Portal and access only their own permitted profile, membership, payments/receipts, attendance, and published announcements. |

No general staff role is required at launch. The data model and RLS policies must nevertheless be designed to support it without changing historic records.

### Future roles

| Role | Intended permissions |
| --- | --- |
| Staff | Access assigned leads/members and permitted operational modules; cannot change organization settings, billing, role assignments, or other sensitive administrative data. |
| Manager (optional) | Broader operational access and reporting; constrained from owner-level security and billing controls as needed. |

Implementation guidance: maintain a `profiles` table linked one-to-one with `auth.users`, with an explicit role field or normalized role mapping. Member profiles must be linked one-to-one to `members`; administrators/staff must never select an arbitrary member identity from client input. Policies must be restrictive by default. Do not infer authorization from email domain, UI route, member ID, or a client-supplied value.

---

## 6. Data model outline

This is an implementation outline, not final migration SQL. Every table should include `id`, `created_at`, and `updated_at` unless there is a documented reason not to. Use UUID primary keys and timezone-aware timestamps.

| Entity | Core fields | Notes / relationships |
| --- | --- | --- |
| `organizations` | name, contact_phone, whatsapp_phone, email, address, hours, timezone | One row initially; keeps the platform organization-ready. |
| `profiles` | user_id, full_name, role, active | One-to-one with Supabase `auth.users`; authorisation source for administrators, future staff, and members. |
| `membership_plans` | name, description, price_amount, currency, duration_days, benefits, is_active, display_order | Archive rather than delete plans already used by member records. |
| `leads` | full_name, phone, email, interest, source, message, status, assigned_to, next_follow_up_at, consent_at | Created by public enquiry or admin entry; link to a member only after conversion. **Implemented as `enquiries`** in `supabase/migrations/0001_enquiry_management.sql` for the internal staff-facing Enquiry Management module (v1.5.0) — the public, unauthenticated marketing-site enquiry form with consent/anti-spam handling described in section 6 is still pending and may feed the same table or a distinct intake path when it's built. |
| `lead_notes` | lead_id, body, created_by | Immutable-by-default activity history; consider `activity_type` for status changes. **Implemented as `enquiry_activities`**, also covering status changes and conversion, not just notes. |
| `members` | public_member_id, profile_id, full_name, phone, email, status, joined_at, lead_id | `public_member_id` is a unique, human-shareable identifier, never a secret or authorization proof. `profile_id` links the member to one authenticated account. `lead_id` preserves attribution when a lead converts. Do not delete operational history. **A minimal `members` table exists as of v1.5.0** (no `public_member_id` or `profile_id` yet, since Supabase Auth/Member Portal aren't built) purely to support Convert-to-Member; expect it to be extended, not replaced, when the full Member Portal is implemented. |
| `member_memberships` | member_id, plan_id, status, starts_at, ends_at, amount_due, discount_amount, currency, frozen_at, freeze_reason | One member can have historical membership terms. Supports active/expiring/expired/frozen KPI definitions and outstanding-balance calculation. |
| `member_notes` | member_id, body, created_by | Internal notes; constrain access to authorised roles. |
| `payments` | member_id, membership_id, amount, currency, status, method, external_reference, paid_at, received_by | Records money collected, including manual payments. Use successful/settled records only in collected-revenue calculations; never store raw card data. |
| `receipts` | payment_id, receipt_number, issued_at, document_path | One payment may produce a receipt. Generate/download only after server-side member ownership authorization; use short-lived signed storage URLs if a document is stored. |
| `gym_locations` | name, address, latitude, longitude, geofence_radius_m, max_location_accuracy_m, active | One location initially. Configure a recommended 100–150 m geofence radius and a separate acceptable browser location-accuracy threshold; store access to exact coordinates restrictively. |
| `attendance_network_allowlist` | location_id, public_ip_or_cidr, active, source, last_verified_at | Gym Wi-Fi’s fixed public IP allowlist. `source` records ISP-static configuration or managed-router/local-updater origin; changes require administrative audit. |
| `visits` | member_id, location_id, checked_in_at, checked_out_at, verification_id, created_by | A valid open visit represents a member currently inside. Server creates and closes visits atomically; administrator manual entries/corrections retain actor and reason audit fields. |
| `attendance_verifications` | member_id, location_id, attempted_at, ip_match, geofence_match, location_accuracy_m, location_distance_m, device_summary, result, method | Records the attendance verification outcome. Log the required timestamp, IP-match result, coarse location accuracy/distance, device summary, and final result; avoid retaining precise coordinates or raw IP unless a documented security/retention need requires it. |
| `announcements` | title, body, published_at, expires_at, status, created_by | Only published, unexpired announcements are visible to members. |
| `staff_assignments` (future) | profile_id, organization_id, access_scope | Add only when staff roles need branch/module scope. |
| `audit_events` (recommended) | actor_id, entity_type, entity_id, action, metadata | Record sensitive writes and access-control changes; redact personal data in metadata. |

### Enumerations and integrity rules

- Lead status: `new`, `contacted`, `follow_up`, `trial_booked`, `converted`, `lost`, `archived`.
- Member status: `active`, `pending`, `expired`, `cancelled`, `paused`.
- Restrict `assigned_to` and `created_by` references to active profiles.
- Validate phone numbers in a canonical international format when possible; preserve user-entered display data only when needed.
- Enforce valid monetary values (non-negative integer minor units) and a documented currency.
- A member can have at most one open visit per location at a time; check-in/out must be transactional/idempotent so retries cannot create duplicates.
- A self-service visit may be opened or closed only after both `ip_match` and `geofence_match` succeed. `manual_admin` is a separately labelled fallback method, never a silent bypass.
- Membership and payment status changes must preserve history; corrections require an administrator and audit reason.
- Prefer soft archive/status fields over deletion for plans, members, and lead history.

---

## 7. Security, privacy, and reliability

### Minimum security controls

- Enable Supabase RLS on every application table before production data is used.
- Write and test policies for anonymous public enquiry insertion, authenticated administrator access, authenticated member access to their own rows only, and future scoped staff access.
- Verify authentication and role permissions on the server for every protected mutation.
- Treat `public_member_id` as an identifier only. It must not grant access, be accepted as an authentication factor by itself, or be used to select another member’s data.
- Enforce member-to-record ownership in RLS using the authenticated user/profile relationship for members, memberships, payments, receipts, and visits. Do not trust a member ID passed from the browser.
- Validate and normalize all input; protect forms with rate limiting and bot protection appropriate to actual traffic.
- Use HTTPS by default, secure cookies/session handling, and security headers provided/configured through Next.js and Cloudflare Pages.
- Store only the personal data needed to operate the gym relationship; avoid sensitive health data in the MVP unless an owner-approved policy and safeguards exist.
- Protect admin accounts with strong passwords; enable MFA when the identity/authentication configuration supports it.
- Limit Supabase, Cloudflare, Meta WhatsApp, and GitHub production access to named operators. Review access after staffing changes.
- Back up/export critical operational data on a documented cadence and test restoration before relying on it.

### Member sign-in and account recovery

- Initial member sign-in uses the unique public member ID plus an owner-set password or PIN. The member ID is public-facing; the password/PIN is the secret and must be stored only as a managed authentication hash through Supabase Auth or an equally secure identity layer.
- Apply strict rate limiting, progressive backoff/temporary lockout, secure session handling, and audit logging to sign-in and password/PIN reset attempts. A PIN must meet a documented minimum length and must never be logged or returned.
- Provide an owner-assisted, identity-verified password/PIN reset workflow. Do not send reset secrets over unverified channels.
- Phone OTP and WhatsApp OTP are future convenience layers, not initial requirements, because each message can incur a cost. They require an approved consent, delivery, abuse-prevention, and cost-control design before adoption.

### Secure presence validation for attendance

The MVP uses one-tap member check-in/out without a camera or QR scan. The tap requests attendance; it does not establish presence by itself. The member must already have a valid authenticated session, and the server must accept the request only when **both** independent conditions succeed:

1. **Gym-network condition:** the request’s client public IP matches the active allowlist for the gym’s Wi-Fi. On Cloudflare, obtain this only from Cloudflare’s trusted server-side client-IP header; never trust a browser-supplied address or an arbitrary forwarded header.
2. **Geofence condition:** the browser grants geolocation and reports a position within the configured gym geofence. Start with a configurable radius of **100–150 m** (125 m recommended) and a separate accuracy threshold (50 m recommended); reject absent, stale, or insufficiently accurate readings.

The server then verifies membership eligibility and state transition, writes the verification result, and atomically creates a check-in or closes the member’s existing open visit as a check-out. It returns the new today/current state only after the transaction succeeds.

### Network and location operating requirements

- Browsers cannot reliably expose a phone’s connected Wi-Fi SSID or BSSID to a normal web application. Do not build attendance around an SSID/BSSID claim; verify the public IP on the server instead.
- Obtain a fixed/static public IP for the gym Wi-Fi from the ISP and add only that address (or explicit approved CIDR) to the location allowlist.
- If the ISP cannot provide a static IP, use a managed router or authenticated local updater to update the allowlist when the public IP changes. The updater must be narrowly scoped, authenticated, logged, and reviewable; it must not give an unauthenticated client the ability to alter the allowlist.
- Request location only when the member initiates attendance, explain why it is needed, and record only the coarse accuracy/distance required for verification unless a separately approved privacy policy requires more.
- Keep administrator/staff manual check-in/out as the fallback for location permission failure, network issues, accessibility needs, or other legitimate exceptions; require an actor and reason in the audit log.

Do not automatically accept presence based only on a button, SSID/BSSID claim, public member ID, public-IP match, or geolocation alone. This two-signal design is practical deterrence, not fraud-proof (for example, it cannot eliminate all device sharing or spoofing). A QR or reception-scanner workflow remains an optional high-assurance fallback if the gym later needs stronger proof.

### Privacy and WhatsApp

- The enquiry form must link to a privacy notice and capture consent language appropriate to the business’s jurisdiction and message purpose.
- Collect a separate, explicit opt-in before proactive promotional WhatsApp messaging where required.
- Keep lead status and follow-up notes in the application; WhatsApp conversations are not a sufficient system of record.
- When automation is enabled, use the direct Meta WhatsApp Cloud API under an approved Meta business account. Define templates, consent, retention, opt-out, webhook verification, and inbound-message handling before enabling it.

### Reliability targets for the initial release

- The public site and enquiry form are the highest-priority paths.
- Fail safely: if an enquiry cannot be recorded, do not claim success; show a friendly retry/contact fallback.
- Provide a clearly visible contact fallback (phone/WhatsApp) on public pages.
- Track production errors and form failures; review them at least weekly during launch.

---

## 8. Deployment and operating model

### Pre-build setup checklist

Complete only the items needed to begin application development. Mark each item complete only after its safe-handling condition is met. Record non-secret metadata in the project’s private operations record or password manager; do not paste credentials into chat, source files, or issue trackers.

| Item | Needed when | Required action / safe handling |
| --- | --- | --- |
| [x] Private GitHub repository | Before build starts | `body-soul-fitness` is the repository to import into Vercel. Record its private repository URL in the operations record; the build will add application source and project-managed dependencies. |
| [x] Supabase Free project | Before data/auth work starts | The project has been created and its Project URL plus publishable/anon key have been supplied through a secure channel. Record project reference, region, project URL, and named owner in the operations record. Configure public values through local `.env.local` and deployment environments. Never place the Supabase service-role key or database password in chat, browser-delivered code, GitHub, or client-side environment variables. |
| [ ] First administrator | Before admin authentication is enabled | Provide the named first admin email address. The owner/admin sets their password directly through the secure sign-in or invite/reset flow; it must not be shared with the developer or entered into chat. |
| [x] Vercel account and GitHub connection | Before hosted preview testing | Owner has created the Vercel account and connected GitHub. |
| [x] Vercel project import and branch configuration | Before first `dev` push | `body-soul-fitness` is imported into Vercel with `main` as the configured Production branch (→ LIVE Supabase) and `dev` as Preview (→ DEV Supabase), confirmed as of v1.7.0. Vercel Deployment Protection (Vercel Authentication) is active, gating access behind a Vercel account login. Cloudflare Pages remains the intended eventual commercial host per §2; this Vercel setup has not been re-evaluated as a permanent replacement, it is simply confirmed live and correctly isolated in the meantime. |
| [ ] Cloudflare account and production domain | At deployment, not pre-build | Create/connect these only when a production deployment is ready. Development and local verification do not require them. |
| [ ] Meta WhatsApp credentials | When the WhatsApp Cloud API module is approved for build | Defer Business Manager/app/webhook credentials and access-token setup until that module; keep all tokens server-only. |
| [ ] Gym static public IP and gym GPS coordinates | When the member one-tap attendance module is built | Defer ISP static-IP setup, public-IP allowlist values, and exact location/geofence configuration until attendance implementation and on-site testing. |

### Local developer prerequisites and non-dependencies

- Install **Node.js LTS**, **Git**, and one supported package manager (npm, pnpm, or Yarn) on the development machine.
- **Current pending local prerequisites:** set the Git commit display name, then validate GitHub authentication on the local development machine before the first push to `dev`.
- Project libraries such as Next.js, TypeScript, Tailwind, shadcn/ui, Supabase clients, validation, and test tools are installed into the repository by the build process. They do not require separate paid portals or individual paid accounts.
- **Streamlit is intentionally excluded**: this is a Next.js web application, not a Streamlit application.
- 21st.dev-style MCPs or design/code-generation tools may be used as optional inspiration during development, but are not an application runtime dependency and must not be required for deployment or normal operation.

### Repository and delivery workflow

1. Maintain the private `body-soul-fitness` GitHub repository with `main` protected; retain `main` as Vercel’s configured production branch.
2. Use `dev` as the initial shared integration branch. Develop focused feature branches, validate them locally, and merge/rebase into `dev` under the agreed review process.
3. Pushes to `dev` create Vercel preview builds for hosted testing. Until launch, Vercel is used only for development/preview testing; its `main` production-branch setting does not make it the intended commercial live host.
4. Run required checks: typecheck, lint, unit tests, and relevant Playwright flows before accepting a preview.
5. Review migrations, RLS policy changes, secrets, and user-visible copy with special care.
6. Promote approved work to `main` according to the release process. At commercial launch, deploy the approved `main` build through Cloudflare Pages, not Vercel Hobby.
7. Record completed capabilities and consequential decisions in this document’s checklist/log.

### Production readiness checklist

- Production domain, DNS, Cloudflare Pages deployment, and HTTPS verified.
- Production Supabase project linked with RLS policies and migrations applied.
- Environment variables configured separately for preview and production.
- Admin accounts created for the one or two approved administrators; no shared accounts.
- Privacy notice, business contact data, and WhatsApp number reviewed by the owner.
- Error monitoring/log access confirmed and a data-export/backup procedure documented.
- Enquiry, admin sign-in, create/update records, and role-denial paths manually tested in production.

---

## 9. Cost assumptions

**Approved annual infrastructure ceiling: ₹8,000.** This budget covers the initial web infrastructure, not staff time, devices, photography/content production, or optional paid business software. Costs vary by traffic, usage, region, and WhatsApp messaging volume; confirm current pricing immediately before procurement and keep a simple annual cost ledger.

| Service | Initial assumption | Cost posture |
| --- | --- | --- |
| Cloudflare Pages | Preferred zero-cost initial commercial production host. | Use within free-plan limits; do not assume Vercel Hobby is suitable for commercial production. |
| Supabase | Start on Supabase Free for development and the expected initial low-volume production workload. | Track database/storage/egress use; move to Supabase Pro only when limits, reliability needs, or operational risk justify it. |
| GitHub | Private repository on an appropriate individual/team plan. | Usually low initial cost. |
| Domain | One annual domain registration plus any DNS service costs. | Recurring annual cost. |
| WhatsApp | Click-to-chat is initially free of platform integration cost. When enabled, use direct Meta WhatsApp Cloud API; Meta message/conversation charges may apply. | No intermediary provider margin. Budget only after the approved messaging workflow and expected volume are known. |
| Monitoring | Cloudflare/Supabase logs and free-tier tooling initially; optional Sentry or equivalent later. | Add only when operational value exceeds free-tier coverage and the ₹8,000 ceiling remains viable. |
| Vercel / Vercel Pro | The owner’s Vercel account is used for `dev` preview builds only initially; Vercel Pro is not part of the initial commercial-hosting plan. | Keep previews within the approved budget. Vercel Pro remains a future upgrade path only when measured requirements exceed the free-tier strategy and the owner accepts the revised cost. |
| Supabase Pro | Not part of the initial plan. | Upgrade only when measured limits, reliability needs, or operational risk justify it and the owner accepts the revised cost. |

Financial guardrails:

- Keep total annual infrastructure spend at or below ₹8,000 unless the owner explicitly approves a revised budget.
- Do not use Vercel Hobby for commercial production.
- Avoid paid automation, payment, CRM, monitoring, or messaging contracts until the owner has approved the exact workflow, expected volume, data responsibilities, and cost impact.
- Reassess Cloudflare Pages, Supabase Free, and direct Meta WhatsApp Cloud API consumption monthly once production starts. Plan a migration to Vercel Pro and/or Supabase Pro only from measured need, not speculation.

---

## 10. Feature delivery checklist

Status legend: `[ ]` not started, `[-]` in progress, `[x]` completed, `[!]` blocked/needs decision.

### Foundation

- [x] Create this product and technical blueprint.
- [ ] Confirm brand assets, public copy, contact details, operating hours, address, and pricing.
- [x] Initialize the Next.js + TypeScript + Tailwind dashboard foundation and pin dependencies (`b59729c`, `dev`).
- [-] Configure Tailwind/shadcn design tokens and the responsive baseline; the initial admin overview UI is complete, but the shared component/design-system baseline remains to be formalized.
- [-] Configure local ignored Supabase environment scaffolding; production schema migrations, RLS baseline, authentication, and data integration remain unimplemented.
- [ ] Configure GitHub `main` protection, `dev` integration workflow, required checks, and Vercel preview builds for `dev` pushes.
- [ ] Configure Cloudflare Pages production deployment from the approved `main` build when commercial launch is ready.

### Public experience

- [ ] Build Home, About/Facilities, Membership Plans, Contact, and Legal pages.
- [ ] Build accessible mobile-first navigation and primary call-to-action flow.
- [ ] Implement enquiry form with validation, consent, anti-spam control, and failure fallback.
- [ ] Persist enquiries securely and confirm owner notification/follow-up process.
- [ ] Add click-to-chat WhatsApp and phone/contact links.
- [ ] Add basic metadata, sitemap/robots policy, and analytics decision.

### Admin experience

- [ ] Implement Supabase Auth and administrator onboarding.
- [ ] Implement protected admin layout and server-side authorization checks.
- [x] Implement the visual admin overview/dashboard shell with representative demo metrics only (`b59729c`, `dev`).
- [ ] Implement dashboard KPI definitions, queries, filters, and empty/error states: revenue, balances, membership health, lead conversion, live presence, attendance, revenue trend, and plan mix.
- [ ] Implement lead list, filters, status updates, notes, follow-up dates, and WhatsApp action.
- [-] Implement member records, unique public member ID generation, member-account provisioning, and conversion from lead. Member records, ID generation, registration/edit/profile, status lifecycle with audit reasons, and conversion-from-enquiry are done; member-account provisioning (Member Portal login) is still pending Supabase Auth.
- [x] Implement membership-plan administration with archive behavior. Plan catalog with duration/pricing/discount/included-services fields and an active/inactive toggle (deactivate rather than delete, consistent with this document's archive-over-delete principle) is done, pending `0003` being applied to DEV/LIVE.
- [x] Implement membership terms, manual payment records, outstanding-balance calculation, and receipt issuance. Subscription terms, manual payment records (`member_payments`), outstanding-balance (`balance_due`) calculation, auto-numbered invoices, printable/downloadable PDF receipts, a filterable payment list with CSV export, and configurable gym contact/tax settings are done and verified end-to-end against DEV (`0004_payments_and_bills.sql`).
- [ ] Implement announcement create/publish/archive management.
- [ ] Implement attendance exception/correction workflow with audit reason.
- [ ] Implement organization settings for public contact data.

### Member experience

- [ ] Implement member authentication using public member ID plus owner-set password/PIN, rate limiting, and owner-assisted reset workflow.
- [ ] Implement Member Portal authorization, member-scoped RLS policies, and protected layout.
- [ ] Implement membership status, expiry, plan, renewal, and outstanding-balance views.
- [ ] Configure gym location geofence (recommended 125 m radius and 50 m accuracy threshold) and trusted gym Wi-Fi public-IP allowlist.
- [ ] Implement protected one-tap member check-in/out requiring both server-verified public-IP allowlist match and browser geofence match.
- [ ] Implement managed-router/local-updater process if the ISP cannot provide a static public IP.
- [ ] Implement administrator manual check-in/out fallback and auditable attendance corrections.
- [ ] Implement attendance counts, current streak, all-time visits, today’s state, and recent-visit history.
- [ ] Implement receipt authorization and download flow.
- [ ] Implement published-announcement feed and permitted profile updates.

### Assurance and launch

- [ ] Implement/test RLS policies for all data access paths.
- [ ] Add audit coverage for sensitive actions.
- [-] Validate the project build: TypeScript and Next.js Webpack compilation pass; re-run the unreliable local `next build` static-data phase in a clean local/hosted environment before accepting a release build.
- [ ] Add unit tests for validation/business rules and browser tests for critical public/admin/member flows, including trusted-IP handling, geofence/accuracy failures, dual-signal enforcement, RLS ownership, check-in/out idempotency, and receipt authorization.
- [ ] Complete accessibility review for public and admin core flows.
- [ ] Complete privacy/copy review and production readiness checklist.
- [ ] Launch production and verify monitoring, data export, and enquiry handling.

### Post-MVP / owner-approved work

- [ ] Define staff role permissions and implement scoped staff access.
- [ ] Define direct Meta WhatsApp Cloud API workflow, opt-in/opt-out policy, templates, webhook handling, and business verification before automating messages.
- [ ] Add trial/visit scheduling and reminders.
- [ ] Evaluate payment-gateway integration, advanced reporting, multi-location, and other member self-service capabilities against actual operational needs.

---

## 11. Open decisions

The following decisions are intentionally not guessed because they shape legal obligations, UX, or costs:

1. Final public pages, brand direction, languages, and content ownership.
2. Membership plan catalog, tax treatment, cancellation/refund terms, and whether pricing is public.
3. Local privacy, consent, retention, and WhatsApp messaging requirements.
4. Who receives and responds to new enquiries; target response time and escalation procedure.
5. Membership-expiry window for dashboard reporting, the official definition of a check-in day/streak, and whether frozen memberships may check in.
6. Whether the ISP can provide a static gym Wi-Fi public IP; otherwise, select the managed router/local updater and approval process for allowlist updates.
7. Receipt format, required tax fields/numbering, payment methods, and any local accounting/compliance requirements.
8. Whether staff should eventually see all records or only their assigned leads/members.
9. Production domain and the named owners for GitHub, Cloudflare, Supabase, and Meta WhatsApp Business assets.

When any item is decided, move it into the relevant section, update the decision log/version, and update impacted checklist items.
