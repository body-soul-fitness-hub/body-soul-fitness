# Body & Soul Fitness Center — Product & Technical Blueprint

**Document status:** Living source of truth  
**Version:** 1.4.0  
**Last updated:** 2026-08-29  
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
**Latest recorded implementation commit:** `b59729c`  
**Repository state:** `dev` has been pushed to GitHub. `main` remains unchanged and documentation-only.

### Delivered in the current foundation

- Next.js + TypeScript + Tailwind project/dashboard foundation.
- Premium admin overview UI shell.
- Local ignored Supabase environment configuration.
- Pinned dependency lockfile for reproducible installs.

### Deliberate current limitations

- All dashboard values are representative **demo metrics** only. They are not production records, KPI queries, or business reporting.
- No production database schema, migrations, Row Level Security, Supabase authentication, or application data integration has been implemented yet.
- The dashboard UI must not be treated as an authenticated admin portal until the pending data and authorization work is complete.

### Latest validation record

| Check | Result | Notes |
| --- | --- | --- |
| TypeScript | Passed | Completed successfully for commit `b59729c`. |
| Next.js Webpack compilation | Passed | Compilation completed successfully. |
| `next build` final static-data phase | Unreliable locally | The final static-data phase is unreliable in the current local environment; treat the build as partially validated and re-check in a clean local/hosted environment before release. |

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
| `leads` | full_name, phone, email, interest, source, message, status, assigned_to, next_follow_up_at, consent_at | Created by public enquiry or admin entry; link to a member only after conversion. |
| `lead_notes` | lead_id, body, created_by | Immutable-by-default activity history; consider `activity_type` for status changes. |
| `members` | public_member_id, profile_id, full_name, phone, email, status, joined_at, lead_id | `public_member_id` is a unique, human-shareable identifier, never a secret or authorization proof. `profile_id` links the member to one authenticated account. `lead_id` preserves attribution when a lead converts. Do not delete operational history. |
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
| [ ] Vercel project import and branch configuration | Before first `dev` push | Import `body-soul-fitness` into Vercel. Retain `main` as Vercel’s configured production branch, then verify that pushes to `dev` create preview builds for testing. Vercel is not the commercial live host at this stage. |
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
- [ ] Implement member records, unique public member ID generation, member-account provisioning, and conversion from lead.
- [ ] Implement membership-plan administration with archive behavior.
- [ ] Implement membership terms, manual payment records, outstanding-balance calculation, and receipt issuance.
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
