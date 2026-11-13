# AGENTS.md

Working notes for anyone (human or AI agent) changing this codebase: how it is laid out, how it is deployed, how the database and background jobs behave, and the reasoning behind decisions that are not obvious from the code. For a short overview of the project, see [README.md](README.md).

## This is a fork

This repository is a fork of the Synaptech Hardware Management System (HMS), being turned into the hardware checkout and room reservation site for the UW **VR/AR committee**, a separate organisation from Synaptech. Most of the infrastructure carries over unchanged, including check-out and return. What changes is everything tied to Synaptech (its name and branding, URLs, email addresses and Supabase project), plus the features listed in the [migration checklist](#migration-checklist) below.

- **Supabase:** the site runs on a brand-new Supabase project, built from the migrations in this repo. The schema of the existing migrations stays as it is. Every new table or column comes as a **new** migration file, and none of the existing migrations are edited.
- **Merging to `main` changes the live database.** Unlike the original project, the fork's Supabase project is connected to this repository and deploys `supabase/` automatically: on every push to `main`, it runs each migration file it has no record of and redeploys the Edge Functions declared in [`supabase/config.toml`](supabase/config.toml). The integration needs that file to exist; without it, a merge deploys nothing. All the migrations up to the switch were recorded under their own versions when the project was built, so only new files run. Review a migration before its PR is merged, not after; a migration that fails stops the deploy, and one that succeeds can't be taken back except by another migration.
- **Text still to be updated:** a lot of this file, the README and `documentation/` still describes Synaptech: its domain, policies and logo. Read those mentions as how the original project worked, not as settings for the fork. Update each one as the matching code changes.
- **Nothing ties back to Synaptech:** no URL, email address, Storage object or project ref belonging to Synaptech should remain in the fork. When you see one, replace it or move it into configuration. Don't keep it as a fallback.
- **Organisation details live in [`src/lib/org.ts`](src/lib/org.ts):** the app name, the organisation's name, the help & support and documentation links, the policy documents and the archive inbox. A link that's still `null` hasn't been provided yet; the screens leave it out (or show the document's title as plain text) until it is. The Edge Functions can't import that file, so their counterparts are secrets with **no default**: `EMAIL_FROM_ADDRESS` (required; a send without it fails and is logged as failed), `EMAIL_ARCHIVE_CC` (unset is logged as an error on every send, and admin-facing emails go nowhere) and `EMAIL_FOOTER_IMAGE_URL` (unset sends no footer). `EMAIL_ARCHIVE_ADDRESS` in `org.ts` must match `EMAIL_ARCHIVE_CC`, since the template editor shows it. `index.html`'s `<title>` repeats `APP_NAME` for the moment before React loads.
- **The committee is UW-affiliated,** so the `@uw.edu` sign-in check, the `uw_email`/`student_id` fields and the `America/Los_Angeles` send time zone all stay. A member's NetID is the part of `uw_email` before the @; there is no separate UW single sign-on (SSO).
- **The contract stays.** The signing system carries over, with new wording, and a second contract is added for room reservations. The home address collected at profile setup is still printed on it, so it stays too.

## Migration checklist

Work through the phases in order. Tick an item when it's merged, and note the PR. An item marked *needs input* is waiting on something only the committee can provide (text, assets, accounts or a decision); see [Open decisions](#open-decisions).

### Update (2026-11-12)

Since the snapshot below: both Vault secrets exist; `.env.local` is set up on the user's machine; the user signed in with Google (`dhodack@uw.edu`) and is an admin. That also confirms the Google provider, the profile-setup flow and the role promotion work, for `localhost` only. Still open for OAuth, all waiting on a deployed origin: the real origin in the Google client's authorized origins, the Auth Site URL and Redirect URLs, and **Publish app** (until then only listed test users can sign in). Draft PRs from this session: #9 (remove label making), #10 (remove Discord), #11 (lookups stop assuming `SYN-`), and the scan-first tag entry PR stacked on #11 (merge #11 first).

Security advisor, 2026-11-12: `record_inventory_audit` is executable by signed-out users through `/rest/v1/rpc`. Not yet checked whether its body rejects non-admins; look at it and, if it doesn't, revoke `anon` in a new migration. `rls_auto_enable` is a Supabase-created helper and is flagged the same way. Leaked-password protection is off, which only matters if password sign-in is ever turned on.

#### Handoff to the next agent (2026-11-12)

**Merged on 2026-11-12:** #9 (remove label making), #10 (remove Discord) and #11 (lookups stop assuming `SYN-`), each as a merge commit. #12 (scan-first UW tag entry, retargeted to `main`) merges after this; its conflicts with #9 were resolved on its branch. None of them touches `supabase/`, so no deploy ran.

**Test flake to know about.** Two `ReturnAvailability` tests (and sometimes `EditAvailabilityModal`) exceed Vitest's 5s default in a full run and pass when run alone. They are not related to these PRs; consider raising their timeout or lightening the availability grid in tests.

**Decisions the user has made.** Scan-first tag entry is approved *as a preliminary choice from web research only* (see [UW tag research](#uw-tag-research-unverified)). Placeholder logic for the UW barcode is fine until a real tag is available. The user asked to be paused on any key design point they haven't approved.

**Still open, and the user has no answers yet:** (1) does every unit carry a UW tag; (2) what a real tag looks like (symbology, digit count). Also still waiting: the `org.ts` links and policies, logo and welcome copy, contract wording, category list, and whether room bookings include equipment.

**Work that needs no outside input**, none started:
- OAuth finish-up (a fresh agent was about to take this): the real origin in the Google client, the Auth Site URL and Redirect URLs, **Publish app**. All wait on a deployed Worker. The connector can't read Auth settings or the Google console, so the user does those by hand.
- Check `record_inventory_audit` for a missing admin check (see the advisor note above) and, if needed, revoke `anon` in a new migration.
- Schedule `send-scheduled-reminders` daily (needs `verify_jwt = false` and the secret-key check; no email will arrive until delivery is sorted).
- Phase 2 items that don't need input: the training tick-box and `training_confirmed_at`, AirTag at hand-off, suggested projects. Each is a new migration, so each needs a user-approved design first.
- Phase 3 (room reservations): design before building.

**Gotchas learned this session.**
- Background sessions must `EnterWorktree` before editing; the shell then refuses `cd` into the main checkout and compound commands it can't verify. Use plain separate commands, and write scripts with the Write tool instead of heredocs when a command is refused.
- Files in this repo are mostly CRLF. Scripted edits must preserve line endings (read with `newline=''`, normalise for matching, write back with the original ending).
- Tests need `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set to any value. The full suite occasionally times out two unrelated tests under load; rerun them alone before suspecting a regression.
- `CLAUDE.md` is not tracked by git (only `AGENTS.md` is); its "Handoff" section is stale, so treat this file as canonical.
- `.env.local` exists in the main checkout (publishable key only, gitignored). A `npm run dev` was started in the background against it and may still be running on port 5173.
- The Supabase connector cannot set Edge Function secrets, and `apply_migration` stamps the current time as the version, so don't use it for repo migrations.

### Current status (2026-11-05)

A snapshot for whoever picks this up next; the checklist below is the detailed record. Recheck the live facts with the Supabase connector (project ref `ctrwrzbckugapdvhaaez`) before acting on them.

**Live state, checked 2026-11-05.**
- *Database:* 43 migrations recorded, the latest `20261104000000`; the `prune-audit-log` cron job exists.
- *Not done yet:* 0 rows in `auth.users`, 0 in `profiles` and 0 in `email_log`. Neither Vault secret exists. There's no `.env.local`.
- *Repo:* `main` is at the merge of #7, with no open PRs.

To recheck in one query:

```sql
select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.profiles where role = 'admin') as admins,
  (select string_agg(name, ',') from vault.decrypted_secrets
     where name in ('edge_functions_url', 'service_role_key')) as vault_secrets,
  (select count(*) from public.email_log) as emails_logged,
  (select max(version) from supabase_migrations.schema_migrations) as latest_migration;
```

**Done by the user since #7:** Auth URL Configuration for `http://localhost:5173`; a Resend account and API key; the `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` secrets.

**Skipped on purpose:** a verified sending domain. The committee has none and won't get one, so for now no email reaches anyone (see [Email delivery without a domain](#email-delivery-without-a-domain)). Don't make this block the steps below.

**The user's next steps, in order:**
1. **Vault secrets.** Run this in the SQL editor. The secret value is the *first* argument:
   ```sql
   select vault.create_secret('https://ctrwrzbckugapdvhaaez.functions.supabase.co', 'edge_functions_url');
   select vault.create_secret('<secret key from Settings → API Keys → Secret keys>', 'service_role_key');
   ```
   Use a new-style secret key (`sb_secret_…`), not the legacy `service_role` JWT.
2. **`.env.local`** in the repo root:
   ```
   VITE_SUPABASE_URL=https://ctrwrzbckugapdvhaaez.supabase.co
   VITE_SUPABASE_ANON_KEY=<publishable key from Settings → API Keys>
   ```
3. Run `npm run dev`, sign in with Google using a `@uw.edu` account and finish profile setup. While the OAuth app is in testing mode, that Google account must be on its test-user list (Google Auth Platform → Audience).

**The agent's next steps:**
1. Once `auth.users`/`profiles` has the user's row, promote them via the connector: `update public.profiles set role = 'admin' where uw_email = '<their uw email>';`. The role guard allows this because the connector runs with no signed-in user. Confirm the email with the user first, and recheck afterwards.
2. After the Vault secrets exist, check that the profile-created email was *attempted*: there should be a row in `email_log`. It will be `failed` with a Resend test-mode error. That's expected, and it proves the trigger → `pg_net` → `send-email` path works.
3. Work that needs no input from the committee, as separate PRs, each run through `npm run test:run` and `npm run build`. Offer them, and start whichever the user picks:
   - ~~Remove label making~~ (Phase 1): done, see the checklist.
   - ~~Remove Discord~~ (Phase 2): done, see the checklist.
   - **Schedule `send-scheduled-reminders` daily:** a `pg_cron` + `pg_net` migration using the same Vault secrets, plus `verify_jwt = false` and the secret-key check in the function, as `send-email` has. It can merge now, but no reminder will be delivered until email delivery is sorted.
   - **Training confirmation** and **AirTag at hand-off**: new columns via new migrations, plus UI.
4. Raise [email delivery](#email-delivery-without-a-domain) with the user as a decision, and don't build a Gmail SMTP sender until they agree to it.

**Still waiting on the committee:** the `org.ts` links and policies; the logo, footer image and welcome copy; the wording of both contracts; the category list; the UW tag barcode format; whether room bookings include equipment; how email reaches members.

**Connector quirks:**
- Edge Function secrets can't be set through the connector ("Storing keys is paused") or listed by it. The user sets them in the dashboard.
- `apply_migration` records the current timestamp as the version, so never use it for repo migrations; they deploy on merge to `main`.

### Phase 1: separate from Synaptech

**Code (done in #1)**
- [x] Organisation details moved into `src/lib/org.ts`. The 4 hardcoded Discord links and both policy Google Docs now come from it.
- [x] The Edge Functions no longer fall back to Synaptech's sender name, archive inbox (`synaptechuw@gmail.com`) or footer image (stored in Synaptech's own Supabase Storage).
- [x] The package and Cloudflare Worker are renamed `vrar-portal`, so a deploy can't overwrite Synaptech's Worker.
- [x] The browser tab title comes from `APP_NAME`.

**Values for `src/lib/org.ts`** (*needs input*)
- [ ] `HELP_AND_SUPPORT_URL`: a chat invite, a form, or wherever members ask for help.
- [ ] `DOCUMENTATION_URL`: general site documentation, shown as "View documentation" on the member home page.
- [ ] `PRIVACY_POLICY` and `USAGE_POLICY`: the committee's bylaws and terms, with their titles. Agreeing to them stays **not stored**, deliberately.
  - A public privacy policy page now exists at `/privacy` (`PrivacyPolicyPage.tsx`) and `PRIVACY_POLICY.url` points to it. Its text is adapted from Synaptech's published HMS policy. The retention periods, the 30-day response and breach times, and the email commitments are Synaptech's, carried over unchanged and not yet confirmed by the committee; only the 12-month audit-log pruning is enforced. Google requires a homepage and a privacy policy URL before an External app can be published; the Branding page uses `https://vrar-portal.arvrcommittee.workers.dev` and `https://vrar-portal.arvrcommittee.workers.dev/privacy`, and the app is now published.
- [x] `EMAIL_ARCHIVE_ADDRESS`: the committee's own inbox, `arvrcommittee@gmail.com` (it replaces Synaptech's `synaptechuw@gmail.com`). The same value is in the `EMAIL_ARCHIVE_CC` secret; change both together.
- [ ] Confirm `APP_NAME` ("VR/AR Hardware Portal") and `ORG_NAME` ("VR/AR Committee"). If either changes, change `index.html`'s `<title>` too.

**New Supabase project and accounts.** The existing sections below describe each step in detail; this is the fork's order of work.
- [x] Create the Supabase project.
- [x] The missing starting migration (#2). `profiles` and a legacy `loans` table predate this repo's migration history, so no migration created them, and the migrations failed on an empty project. [`20260816000000_profiles_baseline.sql`](supabase/migrations/20260816000000_profiles_baseline.sql) recreates `profiles` from Synaptech's live definition, with `discord` nullable, plus a placeholder `loans` table that [`20261006010000_drop_legacy_loans.sql`](supabase/migrations/20261006010000_drop_legacy_loans.sql) removes once the old migrations that alter it have run. The rest of the live schema was checked against the migrations and matches.
- [x] Members can no longer make themselves admin (#2). The live definition let a member update their own `role`; [`20261006000000_profile_role_guard.sql`](supabase/migrations/20261006000000_profile_role_guard.sql) refuses a role change unless an admin makes it, or no user is signed in (the SQL editor, a service-role script).
- [x] Run every migration in `supabase/migrations/` in filename order. They were run once in the SQL editor and then recorded under their own versions, so the GitHub integration treats them as applied. Later migrations deploy on merge to `main` (see the note at the top of this file). The migrations also create the `equipment-images`, `loan-agreements` and `email-assets` Storage buckets.
- [x] Take the internal functions out of the public API (#3, [`20261102000000_internal_function_lockdown.sql`](supabase/migrations/20261102000000_internal_function_lockdown.sql)). Anyone could call `notify_email_event` through `/rest/v1/rpc`, and with it make the app send real emails. Deploys on merge; check Supabase's security advisor afterwards.
- [x] Turn on `pg_cron` and schedule the audit-log pruning (#5, [`20261104000000_audit_log_pruning_schedule.sql`](supabase/migrations/20261104000000_audit_log_pruning_schedule.sql); see [Retention](#retention)).
- [x] Create a Google OAuth client in Google Cloud. Its callback is the new project's `/auth/v1/callback`. Enable the Google provider in Supabase Auth with that client. Done under the committee's Google account as an **External** app with only the `openid`, `userinfo.email` and `userinfo.profile` scopes, so no Google verification is needed. Its authorized JavaScript origin is `http://localhost:5173` for now.
- [x] Add the site's real origin(s) to the OAuth client's authorized JavaScript origins once the Worker is deployed, then **Publish app** under Audience in the Google Auth Platform. Until then the app is in testing mode and only its listed test users can sign in. *Done 2026-11-13:* the origin `https://vrar-portal.arvrcommittee.workers.dev` is in the client, the Branding page has the site as its homepage and `/privacy` as its privacy policy link (Google refuses to publish without both), and the app is **published** (In production). Sign-in was checked afterwards.
- [x] In Supabase Auth → URL Configuration, set the Site URL and Redirect URLs to the site's origins, including the `workers.dev` one while testing. *Done for local development:* the Site URL is `http://localhost:5173`, which is also in Redirect URLs. Add the `workers.dev` origin once the Worker is deployed. *Done 2026-11-13:* Site URL is the `workers.dev` address; Redirect URLs hold `https://vrar-portal.arvrcommittee.workers.dev/**` and the `localhost:5173` ones.
- [ ] Set up Resend. *The account and API key exist.* There is **no sending domain, and the committee won't get one**, so Resend stays in test mode and real members can't receive email. See [Email delivery without a domain](#email-delivery-without-a-domain) under Open decisions.
- [ ] Set the Edge Function secrets in the dashboard (Edge Functions → Secrets). Set so far: `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` (`VR/AR Hardware <onboarding@resend.dev>`, Resend's shared test sender) and `EMAIL_ARCHIVE_CC` (`arvrcommittee@gmail.com`). `EMAIL_FOOTER_IMAGE_URL` waits for the footer image below. The connector can neither set nor list secrets, so ask the user to confirm.
- [x] Deploy all 3 Edge Functions (first deployed by the merge of #5). They're declared in [`supabase/config.toml`](supabase/config.toml), so the GitHub integration deploys them on every push to `main`, with `send-email`'s JWT check off:
  - `send-email`;
  - `send-scheduled-reminders`;
  - `delete-user` (used by the admin "delete member" action, `src/lib/members.ts`).

  A new function needs its own `[functions.<name>]` entry there, or it isn't deployed.
- [x] Create the Vault secrets `edge_functions_url` and `service_role_key` (see [One-time setup](#one-time-setup), step 5). *Done; both exist (checked through the connector on 2026-11-12).*
- [x] Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`, and in the Cloudflare build variables. They're read at build time, so redeploy after setting them. *Done: `.env.local` locally and the Cloudflare build variables.*
- [x] Deploy the Worker (`npx wrangler deploy`). The committee has no domain, so the site lives at its `workers.dev` address; there's no custom domain to add. The Deployment section's `hardware.synaptechuw.org` is Synaptech's and doesn't apply. *Done 2026-11-13:* the Worker is `vrar-portal` at `https://vrar-portal.arvrcommittee.workers.dev`, connected to GitHub in Cloudflare (Workers Builds), so a merge to `main` redeploys it. Pull-request branches build with `wrangler preview`, which needs the empty `previews` block in `wrangler.jsonc`; without it the PR check fails with "missing a `previews` block".
- [x] Sign in once and finish profile setup, then promote that account to admin from the SQL editor: `update public.profiles set role = 'admin' where uw_email = '<your uw email>';`. Later admins can be promoted from the app. *Done 2026-11-13:* the committee's admin account is signed in and promoted.
- [ ] Fill in each email template's subject and body in the admin email editor. They're seeded blank, except `return-reminder-one-week`, whose seeded body names the "Synaptech Hardware Checkout Policy". Correct it there rather than in the migration.

**Rebrand** (*needs input: logo and copy*)
- [ ] The logo, replacing `src/assets/synaptech-brain.svg` and its PNG. The PNG is used by the agreement PDF, since jsPDF can't draw an SVG. Also replace `public/favicon.svg`, `public/synaptech-logo.png` and `public/synaptech-hms-banner.png`.
- [ ] The wordmark text "Synaptech" in `BrandWordmark.tsx`, and its comments in `BrandWordmark.module.css`.
- [ ] The welcome page: the copy at `WelcomePage.tsx:45-51` ("Synaptech @ UW", "neurotechnology student organization"), and `HardwareCarousel.tsx`, which shows Muse, Jetson and OpenBCI devices.
- [ ] "neurotech hardware" in `CheckoutCallToAction.tsx`.
- [ ] A new email footer image, at the same 661×121 proportions `signature.ts` assumes. Upload it to the `email-assets` bucket and point `EMAIL_FOOTER_IMAGE_URL` at it.
- [ ] Optional: rename the `hms_welcomed` and `hms_chunk_reload_at` storage keys (`WelcomePage.tsx`, `main.tsx`). On a new domain they're harmless.
- [ ] Optional: new fonts and colours (Bungee, Rubik, the brand blue and navy). If changed, change them in `src/styles.css` and `loanAgreementPdf.ts` together, since the PDF matches the screen.
- [ ] The README (description, screenshot, logo), `documentation/` and the screenshots in `public/docs/`. Update each one as the screen it describes changes.

**Remove label making.** Units carry UW-issued barcodes, so the app no longer prints its own labels.
- [x] Remove the add-item labels step, the replacement-label page and the get-labels browse/product pages, with their routes and `ROUTE_TITLES` entries.
- [x] Remove `components/admin-dashboard/labels/`, `src/lib/labelPdf.ts`, `src/lib/code128.ts`, and the QR images `qr-checkout-policy.png` and `qr-item-docs.png`. The QR images encode Synaptech URLs.
- [x] Remove the label entry points on the admin home and in `EquipmentUnitsTable`, and the "HMS inventory system" wording in `AddInventoryItemLabelsPage.tsx`.
- [x] Drop `html2canvas` and any other dependency once nothing imports it.
- [x] Delete or update the label tests (`GetLabelsBrowse.test.tsx`, `code128.test.tsx`).

### Phase 2: equipment

**UW barcodes instead of `SYN-` serials**
- [x] `normalizeSerialNumber` stops adding the `SYN-` prefix and only trims and uppercases. The `SERIAL_PREFIX` checks and the printed `SYN -` prefix are gone from `CheckoutScan`, `ReturnScan`, `InventoryAuditScan` and `SerialEntryModal`.
- [x] **Preliminary choice, unverified (decided 2026-11-12 from web research only; see [UW tag research](#uw-tag-research-unverified)).** Admins scan the UW tag when adding a unit, with typing as the fallback, instead of `generateSerialNumbers` making one up. [`TagEntryModal`](src/components/admin-dashboard/TagEntryModal.tsx) collects the tags *before* anything is saved: the add-item page opens it with one slot per unit, and the units table's "Add unit" opens it for one. Each tag is checked against inventory first (duplicates and tags already on another unit are refused). `generateSerialNumbers` and the `SYN-` prefix are gone. Revisit once a real tag has been scanned.
- [ ] `useBarcodeScanner` reads only `code_128`. Add the UW tags' format to `SERIAL_FORMATS` (*needs input*: scan a tag to find out which it is). Until then the camera may not read a real tag at all; the typed fallback in `TagEntryModal` is the way through.
- [x] `serialNumber.test.ts` and the scan tests no longer expect a prefix to be added. Fixtures still use `SYN-` strings, which are just opaque serials now.

*Placeholder in place:* `useBarcodeScanner` still reads only Code 128 until the tag format is known. Existing tests and fixtures still use `SYN-` strings, which are just opaque serials now.

#### UW tag research (unverified)

Found on the web on 2026-11-12, **not checked against a physical tag**. Treat every line as a guess to confirm, and correct this section once a tag has been scanned.

- *What it is:* the UW tag number is the "Asset Identifier" in Workday, a unique identifier UW requires to be physically attached to each piece of equipment. It is separate from Workday's own `AST…` number. Only the Equipment Inventory Office (EIO) makes tags, at no charge, and departments may not change a tag number (they email eio@uw.edu). Sources: [Tagging Procedure](https://finance.uw.edu/eio/equipment-lifecycle/receiving/tagging-procedure), [Equipment Tags](https://finance.uw.edu/eio/node/1554), [Non-Taggable Equipment](https://finance.uw.edu/eio/equipment-lifecycle/receiving/non-taggable-equipment).
- *Consequence for this app:* the numbers are pre-printed by the university, so the app cannot generate them; someone has to link each tag to a unit once.
- *Tag kinds:* a dark purple bar code tag is required at $5,000 or more; for cheaper items a department may choose a beige bar code tag "for departmental internal tracking only". Most VR/AR hardware is under $5,000, so whether the committee's units carry any tag, and which kind, was **unknown**. *Update 2026-11-13:* the user says the units carry the **beige** tags. Symbology and digit count are still unchecked; nobody has scanned one.
- *Format (guess):* UW's own pages state neither the barcode symbology nor the digit count. One EIO page uses `1199887` as an example tag, which hints at a numeric tag of about 7 digits. Code 128 or Code 39 would be typical for asset tags, but that is a guess. Don't add `code_39` to the scanner blindly: manufacturers' own Code 39 barcodes on hardware would then be read as serials.
- *Items that can't be tagged* (lenses, software) go in a paper "No Tag" log at UW. Whether any committee item falls in that group is unknown.

**New equipment contract** (*needs input: the wording*). The signing system stays as it is.
- [ ] Replace the text in `src/lib/loanAgreementContent.ts` (title, intro, sections 3–8, the signing disclaimer). Both `AgreementPreview` and `loanAgreementPdf.ts` read it.
- [ ] Sections 1, 2, 9 and 10 (the parties, the item and serial, the borrower's signature, the receiving manager's sign-off) are laid out in code in both `AgreementPreview.tsx` and `loanAgreementPdf.ts`. Change them in step, including the "SYNAPTECH" header and "For Synaptech RSO Hardware Managers".
- [ ] If section 2 changes shape, update `locateSerialNumberCell`. `restampAgreementSerial` uses it to rewrite the serial when an admin switches the unit on a request.
- [ ] Section 6's sliding liability scale uses each item's replacement value. Keep or replace it according to the new terms.
- [ ] Reword the Certificate of Approval page in `loanAgreementApproval.ts`.

**Training**
- [ ] The training link reuses `documentation_url`. Relabel it as training in the add/edit item pages, the catalog item page, the checkout confirm step and the member's loan detail. Add a separate `training_url` only if documentation and training material are kept apart.
- [ ] A tick-box in checkout confirming the member has read the training material. It must be ticked to continue, like the contract.
- [ ] Store the confirmation the same way as the contract signature: a new column on `loan_request_items` (e.g. `training_confirmed_at`), written in the same insert in `submitLoanRequest` that stores `signature_name` and `signature_date`. The database records it and doesn't enforce it, as with the contract.
- [ ] Show it on the loan detail screen next to the signed agreement, with "Not recorded" for items submitted before the column existed.

**AirTag at hand-off**
- [ ] During the hand-off, the admin records which AirTag went with the hardware. It's a new column on `loan_request_items`, shown on the loan detail screen.
- [ ] Optional: the return flow prompts the admin to check the AirTag came back.
- [ ] There is no AirTag API. Tracking happens in Find My; the app only records which tag went where.

**Other equipment items**
- [ ] Suggested projects: a new field on `equipment`, edited on the add/edit item pages and shown in the catalog.
- [ ] Schedule `send-scheduled-reminders` daily (see [One-time setup](#one-time-setup), step 6). The function already sends 7 days before the due date, on the due date, and when overdue.
- [ ] Keep: optional and required add-ons, as they are.

**New equipment categories** (*needs input: the list*). The current `category` values (recording, modulation, tools, peripherals, computing, virtual_reality) come from Synaptech's neurotech catalog. Expect far fewer categories, mostly VR/AR.
- [ ] A new migration that drops `equipment_category_check` (from `20260817010000_equipment_category.sql`) and adds it back with the new values. If it runs after items have been added, it also has to move existing rows onto the new values first.
- [ ] Update `EquipmentCategory` in `src/types.ts` and `CATEGORY_OPTIONS` in `src/lib/equipmentCategories.ts`. That covers the add/edit item pages, the catalog's filter chips (`InventoryFilterChips`) and grouping (`useInventoryCatalog`). Consumables stay a separate `product_type` with their own filter chip.
- [ ] Update the tests that use the old category values.

**Remove Discord.** The committee doesn't use it.
- [x] Remove the required "Discord username" field from profile setup (`ProfileSetupPage.tsx`, its form state and validation) and from `ProfileSetupPage.test.tsx`.
- [x] Remove the Discord rows from the admin screens: `MemberDetail.tsx` (with its copy button), `LoanDetail.tsx` (`memberDiscord`, selected in `loanRequests.ts`), and `ViewMembers.tsx` (shown in the list and searched).
- [x] About 30 screens pass `profile.discord` to the header as `handle`, and `ProfileModal` shows it under the member's name. The modal already shows the email, so the line was dropped rather than replaced (`UserProfile.handle` is gone).
- [x] Drop `discord` from the `Profile` type (`src/types/index.ts`) and from `AuditLog.tsx`'s field labels. The column itself can stay unused, as long as it allows null (see the `profiles` item in Phase 1). The audit trigger's field list in `20260921000000_audit_log.sql` can keep naming it, since it simply never changes.

### Phase 3: room reservations

Members reserve the committee's room as a whole. A room reservation does **not** include equipment for now; see [Open decisions](#open-decisions).

- [ ] Database: a reservations table, linked to the member (their NetID comes from `uw_email`). It needs:
  - RLS policies and table grants;
  - a database-side guard against overlapping bookings, in the spirit of [One unit, one borrower](#one-unit-one-borrower);
  - audit triggers.
- [ ] Member flow: choose a time (adapt `AvailabilityGrid`), sign the room contract, submit. Also: see and cancel their reservations.
- [ ] Admin: approve, deny or cancel, with a list and a detail screen.
- [ ] Emails through the existing template system: new templates and `send-email` cases. Redeploy `send-email` afterwards.
- [ ] The room contract (*needs input: the wording*). Make the agreement content and the code-laid-out sections depend on the kind of contract, rather than copying the components. The room version has a date-and-time block instead of the item/serial section.
- [ ] Store the signed room contract like the equipment one: one PDF per reservation in the `loan-agreements` bucket, with its path and the signer's name and date on the reservation row.
- [ ] Routes, `ROUTE_TITLES` entries, the member home and admin home entry points, tests, and a guide in `documentation/`.

### Open decisions

Not yet known, but expected soon. Each one blocks only the items marked *needs input* that depend on it.

- **Can a room reservation include equipment?** Assumed no for now. If yes, a reservation would need to hold units the way a loan request does.
- **Which barcode format do UW property tags use, and does every unit carry one?** It blocks the `SERIAL_FORMATS` change. Needs a photo or scan of one real tag. The scan-first tag entry flow is a preliminary choice made on web research alone (see [UW tag research](#uw-tag-research-unverified)); if some units will have no tag, it needs a way to add one without.
- **How emails reach members without a domain.** See [Email delivery without a domain](#email-delivery-without-a-domain) below. It blocks real-member email, and the reminder schedule can't be checked end to end until it's settled.

#### Email delivery without a domain

The committee has no domain and won't get one (decided 2026-11-05). That rules out Resend for real use, since Resend in test mode, sending as `onboarding@resend.dev`, only delivers to the email the Resend account was created with. The rule covers every recipient, **CC included**. `send-email` CCs every message to `EMAIL_ARCHIVE_CC` (`arvrcommittee@gmail.com`), and a member-facing email therefore has two different addresses on it, so Resend rejects **every** send as things stand. Admin-facing templates go only to the archive inbox, so they'd get through only if the Resend account was created with `arvrcommittee@gmail.com`.

Why this doesn't block anything else yet:
- Emails are fire-and-forget (`notify_email_event` → `pg_net` → `send-email`). A failed send loses that email only; the sign-up, checkout or return that caused it still succeeds.
- Until the Vault secrets exist, `notify_email_event` doesn't call the function at all. Once they do, rejected sends land in `email_log` as **failed** with Resend's error, visible on the admin "Sent email log" screen.

To see an email arrive while testing: create the Resend account with the address you'll test with, and set `EMAIL_ARCHIVE_CC` to an empty value. Admin-facing emails then go nowhere. Put `arvrcommittee@gmail.com` back afterwards.

For real members, the committee still has to pick a sender that doesn't need a domain. Not decided, and nothing is built yet. The likely candidate is **sending through the committee's Gmail** (`arvrcommittee@gmail.com`) over SMTP with an app password. That means 2-step verification on the account, a Gmail daily sending cap (fine at this volume), and swapping the Resend call in `send-email` for an SMTP client. Mail sent through Gmail's own servers as a `@gmail.com` address passes Gmail's checks; sending as `@gmail.com` through any *other* provider would fail DMARC and land in spam, so the "verify a single sender" options other providers offer are no substitute. Before building it, check the current Gmail limits and Supabase's Edge Function network limits: as far as we know, outbound ports 25 and 587 are blocked there, so plan on implicit TLS on port 465 (`smtp.gmail.com:465`).

*What Synaptech's repo shows (checked 2026-11-13, `galaxygoldfish/synaptech-hms`).* Nothing that avoids a domain. Its `send-email` also uses Resend, with `onboarding@resend.dev` as the fallback sender, and its own AGENTS.md says the same thing as above: without a verified domain Resend delivers only to the account's own address, "fine for testing, not for real members", and the CC is rejected too. Which sender its live site uses is a secret and isn't in the repo. Its docs also describe deploying to `hardware.synaptechuw.org` on a zone already in Cloudflare, which suggests it does have a domain; that is an inference, not something we confirmed. No SMTP or Gmail path exists in it to copy.

*Not confirmed:* the blocked ports 25 and 587 and the 465 plan. A search of Supabase's docs on 2026-11-13 didn't turn up a statement either way, so test a real connection from an Edge Function before committing to the approach.
- **The new equipment categories.** Expect far fewer, mostly VR/AR. It blocks the categories item in Phase 2.
- **Wording and assets:** the equipment contract, the room contract, the bylaws and terms, the logo and the welcome copy.

## Conventions

- **No server of our own.** The app is a Vite + React SPA that talks straight to Supabase (PostgREST, Auth, Storage) from the browser. Anything needing a secret runs in a Supabase Edge Function or a Postgres trigger, never in the client.
- **Data access lives in `src/lib/`** (`inventory.ts`, `loanRequests.ts`, `memberLoans.ts`, `inventoryAudit.ts`, …). Components call these rather than querying Supabase directly. Queries are plain selects zipped client-side rather than PostgREST embedded selects, to sidestep schema-cache fragility — run independent ones with `Promise.all` rather than awaiting each in turn, since every sequential query is a full network round trip.
- **Reads are always fresh; screens never show a skeleton for data they've already seen.** [`src/lib/queryCache.ts`](src/lib/queryCache.ts) does three jobs, and components never touch it directly:
  - *Last value.* List fetches (`fetchAllLoanRequestItems`, `listEquipment`, `fetchAllProfiles`, `fetchEmailTemplates`, `fetchEmailLog`, `fetchAuditLog`, `fetchInventoryAudits`, `fetchEquipmentAvailability`, `fetchAvailability`, `fetchMemberLoans`, …) always hit the network, but remember what they returned. Each has a `peek…` partner that returns that copy synchronously, which the screen uses as its initial state — so coming back to a list paints it on the first render, and the fresh fetch replaces it a moment later. Display only: anything that *decides* on the data (Home's overdue block on checkout — see `useMemberLoans`'s `isFresh`; the checkout confirm step's "out of stock") waits for the fresh copy. A request already in flight is shared rather than repeated (React runs effects twice in development), and display screens reuse a copy fetched in the last few seconds (`DISPLAY_REUSE_MS`) so bouncing between screens doesn't re-read whole tables; screens that decide from the data pass `{ fresh: true }` (`fetchAllLoanRequestItems` on the check-out/return screens, `fetchEquipmentAvailability` when starting a checkout) and never reuse one.
  - *Stash.* Starting a checkout from the catalog (`useStartCheckout`) fetches the item's add-ons and fresh stock before leaving the list, then either skips the add-on step or opens it already drawn — the confirm step reads that data with `readStash` (readable for 10 seconds). It goes through `usePrefetchNavigate` ([`src/lib/usePrefetchNavigate.ts`](src/lib/usePrefetchNavigate.ts)), which also ignores a second tap and won't navigate if the member has left meanwhile. Other detail screens simply load on open.
  - *Invalidation.* The lib function that *writes* rows calls `invalidate(CACHE_KEYS.…)` for the area it changed, which drops the last value and any stash under that prefix — a write means the old copy is wrong, so it must not be painted even briefly. `AuthContext` clears everything on sign-out or a change of user. If you add a write, invalidate its area; if you add a list screen, follow the same peek pattern rather than showing a skeleton on every visit.
- **The database write is the last word on conflicts.** `handOffLoanRequestItem` and `markLoanRequestItemReturned` make their updates conditional (compare-and-set on the item's agreement path; `returned_at is null`) and throw `LoanConflictError` with an admin-readable message when another admin got there first. Don't rely on a screen's copy of the data to prevent a double hand-off or return.
- **Security is enforced in the database.** Row-level security decides who can read or write what; the UI only hides things. When adding a table, add its RLS policies *and* its table-level grants (see the equipment grants migration for why a policy alone is not enough). Admin policies should use `public.is_admin()`, not an inline subquery on `profiles`.
- **Migrations deploy on merge to `main`** through Supabase's GitHub integration, in filename order (see [This is a fork](#this-is-a-fork)). Don't also paste them into the SQL editor, and don't run `supabase db push` by hand. Keep them idempotent, give each a version later than every existing one, and keep every version prefix unique.
- **Types:** `src/types.ts` and `src/types/` both exist — Supabase row types alongside dashboard/API-shaped ones.
- **Styling:** CSS Modules next to each component; a few shared global classes and design tokens (`--blue-bg`, `--green-fg`, …) live in `src/styles.css`. Layouts are responsive, with phone breakpoints at 640px and 480px (and 800px on the member home page).
- **Dialogs** use [`ModalDialog`](src/components/ModalDialog.tsx) for the box inside each modal's overlay: it supplies `role="dialog"`, moves focus in and back out, keeps Tab inside, and calls `onClose` on Escape (pass `undefined` while the dialog is busy, and do the same for the overlay's click). Don't hand-roll `role="dialog"` on a div.
- **Page titles** come from `ROUTE_TITLES` in [`src/router.tsx`](src/router.tsx). A new route needs an entry there; `router.test.tsx` fails if one is missing.
- **Tests:** Vitest + React Testing Library in `src/test/`. Run `npm run test:run` and `npm run build` (which type-checks) before pushing: CI (`.github/workflows/node.js.yml`) only runs the build, not the tests. `src/lib/supabase.ts` throws at import without `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, so with no `.env.local`, run the tests with placeholder values for both.

## Project structure

- `src/pages/` — top-level routed pages (welcome, profile setup, admin home, member home, and one thin page per flow)
- `src/components/` — page-specific components, grouped as `admin-dashboard/` and `user-dashboard/`; shared pieces (`BrandWordmark`, `ProfileModal`, `InfoTooltip`) sit at the top level
- `src/context/` — `AuthContext`, the single source of auth/session/profile state
- `src/router.tsx` — routes and guards (`PublicRoute`, `SetupRoute`, `PrivateRoute`, `AdminRoute`)
- `src/lib/` — Supabase client, data access and pure helpers (loan bucketing, serial normalisation)
- `src/hooks/` — shared hooks such as `useBarcodeScanner`
- `src/test/` — Vitest suite
- `supabase/migrations/` — SQL migrations; `supabase/functions/` — Edge Functions (`send-email`, `send-scheduled-reminders`)

## Deployment

The web app deploys to Cloudflare as a **Worker serving static assets** — not a Pages
project, which is what the dashboard creates for a repository import now. The deploy
command is `npx wrangler deploy` and the settings live in
[`wrangler.jsonc`](wrangler.jsonc), committed so that every deploy is identical and the
non-interactive build never hits Wrangler's setup prompt.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Deploy command | `npx wrangler deploy` |
| Environment variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

Client-side routing is handled by `assets.not_found_handling:
"single-page-application"` in that config: a request for `/adminHome/loans/123` has no
file behind it, so the asset layer serves `index.html` with a 200 and React Router
resolves it. **Do not add a `public/_redirects`** with the usual `/* /index.html 200`
rule — Workers Assets rejects it as an infinite loop, because it already rewrites
`/index.html` to `/` and the rule would match its own output. That failure happens at
deploy time, after a successful build.

[`public/_headers`](public/_headers) marks everything under `/assets/` as
`immutable` for a year — Vite content-hashes those filenames, so a URL never changes
meaning. Workers Assets honours `_headers` (it's only `_redirects` that's a problem,
above). `index.html` is left out so a deploy is picked up on the next load.

Bundle size: `jspdf` and `pdf-lib` are `import()`ed inside the functions
that use them (`loanAgreementPdf.ts`, `loanAgreementApproval.ts`),
and the agreement, audit-log, inventory-audit and email-template pages are
`React.lazy` routes in `src/router.tsx`. Keep new heavy dependencies behind a dynamic
import the same way rather than importing them at module top level, and have the
screen that needs one preload it on mount (see the agreement screens' preload helpers) so
the download isn't waiting behind a button press.

Split chunks have a deploy-time consequence: a deploy removes the previous build's
chunks, so a tab opened before it can ask for a file that no longer exists (the SPA
fallback answers with `index.html`, which fails to import). `src/main.tsx` handles
Vite's `vite:preloadError` by reloading once, which keeps the URL and route state; a
second failure within 10s falls through to `ErrorBoundary` rather than looping.

[`.nvmrc`](.nvmrc) pins the build image's Node. The toolchain (Vite 8, TypeScript 6)
needs a recent version, and the error from an old one doesn't obviously point at Node.

Because the env vars are `VITE_`-prefixed they are read at **build** time, not run time:
changing one in the Cloudflare dashboard does nothing until the next deploy.

Two things live outside this repo and are easy to miss:

- **DNS** — the Worker answers on `<name>.<subdomain>.workers.dev` immediately, which is
  enough to test. For `hardware.synaptechuw.org`, add it as a custom domain on the
  Worker; with the zone already on Cloudflare the DNS record is created for you.
- **Supabase Auth → URL Configuration** — Site URL and Redirect URLs must list whichever
  origin is actually being used, including the `workers.dev` one while testing. Google
  sign-in otherwise completes and bounces the user somewhere else. The Google Cloud
  console callback is unaffected: it points at Supabase's `/auth/v1/callback`, not at
  this app.

Run any unapplied [migrations](supabase/migrations) before the first deploy — the app
reads columns that only exist once they have.

## Database

Auth and profile data live in `profiles`, keyed by `auth.uid()`, with `role` (`'member'` | `'admin'`) enforced server-side: a trigger forces new rows to `'member'`, and another refuses a role change unless an admin makes it or no user is signed in (the SQL editor or a service-role script, which is how the first admin is promoted). The table itself is created by [`20260816000000_profiles_baseline.sql`](supabase/migrations/20260816000000_profiles_baseline.sql); the role guard is [`20261006000000_profile_role_guard.sql`](supabase/migrations/20261006000000_profile_role_guard.sql). Hardware tracking lives in three related tables:

- `equipment` — a catalog entry: `name`, `description`, `image_url`, `product_type` (`'hardware'` | `'consumable'`), `category` (`'recording'` | `'modulation'` | `'tools'` | `'peripherals'` | `'computing'` | `'virtual_reality'`, required for hardware, `null` for consumables since "consumable" is already their category), `replacement_value`, `quantity_total`, `documentation_url`
- `equipment_units` — a physical, serialized unit of a `'hardware'` `equipment` entry (`equipment_id`, unique `serial_number`); consumables aren't individually serialized, so `quantity_total` on `equipment` is their stock count
- `equipment_addons` — links an `equipment` row to another *existing* `equipment` row that acts as its optional or required add-on at checkout (`equipment_id`, `addon_equipment_id`, `addon_type`). No new equipment is created by a link — the admin "add a new item" flow's Optional/Required add-on toggles open a searchable picker over the existing catalog to create these links.

Checkout submissions live in three more tables:

- `loan_requests` — one row per checkout submission: `user_id`, `status` (`'pending'` | `'approved'` | `'denied'` | `'cancelled'`, defaults to `'pending'` until an admin reviews it or the member calls it off), `requested_at`, and `reviewed_at`/`reviewed_by`/`review_note` once reviewed
- `loan_request_items` — one row per `equipment` item bundled into a request (the primary item plus any optional/required add-ons — `item_role`), each with its own `equipment_unit_id` (the serial offered at submission), `return_date` (hardware only), and `signed_agreement_path`
- `loan_request_availability` — one row per hour the member marked free in the 14-day pickup availability grid (`available_date`, `available_hour`)

Inventory audits live in two more:

- `inventory_audits` — one row per completed audit: who ran it, when, an optional note, and the counts it found
- `inventory_audit_entries` — one row per unit the audit accounted for, plus one per unrecognised barcode, each with its `status` and a copy of the serial number, product name and borrower's name as they read at the time

Both are append-only and admin-readable, written only by the `record_inventory_audit` function — see [Inventory audits](#inventory-audits).

These model the request phase the checkout flow captures (submit → admin approves/denies, or the member cancels while it's still pending) plus the hand-back at the end of it: `loan_request_items.returned_at`/`returned_by` record that a physical item came back, per item rather than per request, since a request can bundle several items with their own return dates. A member can also flag that they want to give an item back before an admin has checked it in — `return_requested_at`/`return_requested_by` on the same table, set by the member-facing return flow (see [Member-initiated cancel and return request](#member-initiated-cancel-and-return-request) below). A request's status stays `'approved'` throughout — "is it back?" is answered by `returned_at`, not by the parent's status — and `bucketForLoanItem` in [`src/lib/loanRequests.ts`](src/lib/loanRequests.ts) is the single place that turns those fields into the Active / Overdue / Requests / Returns / Returned states the list, the detail screen and the dashboard stat cards all read. The return columns and their triggers are in [`supabase/migrations/20260922000000_loan_item_return.sql`](supabase/migrations/20260922000000_loan_item_return.sql); cancellation and the return-request columns are in [`supabase/migrations/20260925000000_member_loan_actions.sql`](supabase/migrations/20260925000000_member_loan_actions.sql).

Product photos are uploaded to a public `equipment-images` Storage bucket; signed loan agreement PDFs go to a private `loan-agreements` bucket, one object per item at `${user_id}/${loan_request_id}/${equipment_id}.pdf`, readable by its owner and by admins. Hand-off adds a second object rather than overwriting the first: `stampApprovedAgreement` in [`src/lib/loanAgreementApproval.ts`](src/lib/loanAgreementApproval.ts) appends a Certificate of Approval page and uploads it alongside the original at the same path with `-approved.pdf` in place of `.pdf`, then `loan_request_items.signed_agreement_path` is repointed at that new object — so what the member actually signed stays retrievable even after an admin has stamped it.

The `email_log` columns recording the message body and archive CC are added by [`supabase/migrations/20260916010000_email_log_detail.sql`](supabase/migrations/20260916010000_email_log_detail.sql) — run it before deploying the functions, or sends will fail to log.

Every change to those tables is recorded in `audit_log` — see [App audit log](#app-audit-log) below.

Profile setup (`/setup`) won't submit until the member ticks agreement to the Synaptech HMS Privacy Policy; it and the Hardware Checkout & Usage Policy are Google Docs linked from that page (URLs at the top of [`ProfileSetupPage.tsx`](src/pages/ProfileSetupPage.tsx)), so officers can edit them without a deploy. The agreement itself is **not stored** — `profiles` has no consent column — and members who set up a profile before the checkbox existed were never shown it.

A member's home address is masked behind a **Reveal** control on the admin "Member details" screen. It isn't removed, because it's printed on the loan agreement each member signs and is what the club has to go on when hardware doesn't come back — the point is that opening someone's profile to check their Discord handle shouldn't also put their home address on screen. The signed agreement PDF still carries it in full.

Row-level security restricts each table to the rows a user is allowed to see/edit (e.g. members can only read/create their own `loan_requests` and can't edit them after submitting; only admins can review a request or edit `equipment`, `equipment_units`, and `equipment_addons`; only the profile owner can read/write their own `profiles` row).

The `equipment`/`equipment_units` columns and the `equipment_addons` table, RLS policies, and storage bucket/policies are defined in [`supabase/migrations/20260817000000_equipment_inventory.sql`](supabase/migrations/20260817000000_equipment_inventory.sql) — written defensively (`if not exists` throughout) since `profiles` and these tables predate this repo's migration history; `profiles` itself now comes from the baseline migration that sorts before it. The `category` column was added afterward in [`supabase/migrations/20260817010000_equipment_category.sql`](supabase/migrations/20260817010000_equipment_category.sql), and the table-level grants (RLS policies alone aren't sufficient — see that migration's comment) in [`supabase/migrations/20260817020000_equipment_grants.sql`](supabase/migrations/20260817020000_equipment_grants.sql). The `loan_requests`/`loan_request_items`/`loan_request_availability` tables, their RLS policies and grants, and the `loan-agreements` bucket are defined in [`supabase/migrations/20260817030000_loan_requests.sql`](supabase/migrations/20260817030000_loan_requests.sql). Run all four via the Supabase SQL editor or CLI against your project, in order. Admin visibility over `profiles` (the "View registered members" and "Member details" screens) comes from [`supabase/migrations/20260916000000_profiles_admin_visibility_fix.sql`](supabase/migrations/20260916000000_profiles_admin_visibility_fix.sql), which supersedes the read/update policies in `20260817040000`/`20260817050000` — those were written as a policy on `profiles` that selects from `profiles`, which Postgres rejects as infinite recursion. Run it too; without it an admin sees only their own row.

## Automated emails

Every automated email is CC'd to an archive address so the club keeps a copy outside the app. It is the `EMAIL_ARCHIVE_CC` secret, with no default: unset is logged as an error on every send. Set that secret to an empty string to switch the archive copy off on purpose. The same address is the direct recipient of the admin-facing templates, and the template editor displays it from `EMAIL_ARCHIVE_ADDRESS` in `src/lib/org.ts`, so keep the two matching. The CC is skipped when the archive address is already the recipient, so it never double-delivers.

The admin "Sent email log" screen (`/adminHome/emails/log`) lists every send — status, template, recipient, CC and timestamp — and opens each row to show the subject, the rendered body exactly as sent, and the provider's error for failures. Failures are logged as well as successes, which is usually what you need to debug one.

The admin "Manage user-facing emails" / "Manage admin-facing emails" screens edit rows in `email_templates` (`key`, `category`, `subject`, `body` — the same text/chip segment array the editor UI builds, `dynamic_fields`, `enabled`). Every send is logged to `email_log`. Both tables, the reminder-tracking columns added to `loan_request_items`, and the Postgres triggers described below are defined in [`supabase/migrations/20260906000000_email_templates.sql`](supabase/migrations/20260906000000_email_templates.sql).

This app has no server of its own — it's Vite + React talking directly to Supabase from the browser — so actually sending an email (which needs a provider API key that can never reach the browser) happens in two Supabase Edge Functions under `supabase/functions/`:

- **`send-email`** — takes `{ event, recordId }`, resolves it to the right template(s)/recipient(s)/dynamic fields, renders, sends via [Resend](https://resend.com), and logs the result. Invoked by Postgres triggers (via `pg_net`) on `profiles` (created, role changed to admin), `loan_request_items` (primary item requested), `loan_requests` (status → `approved`, which this app treats as the handoff event — see that migration's comments), and `equipment` (created/updated). Deployed with JWT verification off and its own `auth: 'secret'` check (via [`@supabase/server`](https://supabase.com/docs/guides/functions/auth)) instead, since its caller — Postgres's `pg_net` — presents a project secret key on `apikey`, not a user JWT.
- **`send-scheduled-reminders`** — runs once a day, computed rather than triggered: finds approved loans due in exactly 7 days, due today, or overdue, and sends `return-reminder-*`/`hardware-item-overdue`. Idempotent via the `reminder_*_sent_at` columns on `loan_request_items`. Still deployed with the platform's default JWT verification — nothing has been wired up yet to call it, so its auth story is revisited once it's actually scheduled.

`successful-return-confirmation` and `hardware-returned` fire on `loan_item.returned`, which the trigger in [`supabase/migrations/20260922000000_loan_item_return.sql`](supabase/migrations/20260922000000_loan_item_return.sql) raises when an admin records a hand-back — redeploy `send-email` after applying that migration, or the event arrives at a function that doesn't know the case and is ignored.

`hardware-return-requested` is still dormant, but not for lack of a flow: members can raise a return request from "My hardware loans" (see [Member-initiated cancel and return request](#member-initiated-cancel-and-return-request)) and it's fully wired into the admin list, the loan detail screen and the audit log. Nothing in `send-email`/`notify_email_event` listens for it, though — the `loan_item.return_requested` event only reaches `audit_log`, so raising a return request never sends an email. Wire it up if that's wanted. (`checkout-request-approval` was in a similar spot — no separate approval step for it to fire on — until it was removed entirely.)

### One-time setup

1. Install the Supabase CLI and link this repo to your project (`supabase login`, `supabase link`).
2. Get a [Resend](https://resend.com) API key, then set the Edge Functions' secret:
   ```bash
   supabase secrets set RESEND_API_KEY=re_...
   ```
   Also set the sender, which has no default (a send without it fails and lands in the email log as failed). Before a domain is verified, Resend's shared `onboarding@resend.dev` sender only delivers to the Resend account's own email — fine for testing, not for real members:
   ```bash
   supabase secrets set EMAIL_FROM_ADDRESS="VR/AR Hardware <onboarding@resend.dev>"   # a verified domain's address once you have one
   ```

   Set the archive inbox, matching `EMAIL_ARCHIVE_ADDRESS` in `src/lib/org.ts`, and optionally the footer image (a public URL, e.g. in a public Storage bucket of this project; without it emails have no footer):
   ```bash
   supabase secrets set EMAIL_ARCHIVE_CC=committee-inbox@example.org   # or "" to disable
   supabase secrets set EMAIL_FOOTER_IMAGE_URL=https://<project-ref>.supabase.co/storage/v1/object/public/email-assets/email-footer.png
   ```
   Note the sandbox restriction applies to the CC too: until a domain is verified, Resend will reject a send whose CC isn't the Resend account's own address.
3. Deploy `send-email` with JWT verification off (see above for why):
   ```bash
   supabase functions deploy send-email --no-verify-jwt
   ```
   `send-scheduled-reminders` isn't triggered by anything yet (step 5 below), so it stays on the default `supabase functions deploy send-scheduled-reminders` for now.
4. Run [`supabase/migrations/20260906000000_email_templates.sql`](supabase/migrations/20260906000000_email_templates.sql), [`supabase/migrations/20260916010000_email_log_detail.sql`](supabase/migrations/20260916010000_email_log_detail.sql), and [`supabase/migrations/20260917000000_email_trigger_vault_secrets.sql`](supabase/migrations/20260917000000_email_trigger_vault_secrets.sql) (see that last one for why — in short, `alter database postgres set app.settings.*` needs a privilege the SQL editor's role doesn't have, so the trigger's config lives in [Supabase Vault](https://supabase.com/docs/guides/database/vault) instead) in the SQL editor, in order.
5. Point the trigger at your deployed function and give it a way to authenticate:
   ```sql
   select vault.create_secret(
     'https://<project-ref>.functions.supabase.co',
     'edge_functions_url'
   );
   select vault.create_secret(
     '<a secret key from Settings -> API Keys -> Publishable and secret API keys>',
     'service_role_key'
   );
   ```
   `vault.create_secret(secret, name, description)` — the secret value is the **first** argument, the name second; swapping them stores the name in plaintext and the function can never find its secret by name again. Until both secrets exist, `notify_email_event` silently no-ops — the migrations are harmless to have applied before finishing this step.

   Use a secret key here, not the legacy `service_role` key: it's revocable on its own, without regenerating the project's JWT secret (which would also invalidate the `anon` key the frontend uses). See [Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys) if your project only has legacy keys so far.
6. Schedule `send-scheduled-reminders` to run daily — via Supabase's Dashboard (Edge Functions → Cron) or `pg_cron` calling it through `pg_net`. Whichever you use, its auth needs the same treatment as `send-email` above (a secret key + `--no-verify-jwt`) unless the scheduling mechanism you pick already authenticates its own calls.

## Hardware loans

The admin "Hardware loans" list (`/adminHome/loans`) searches by item name, serial number or member, filters by state (All / Active / Overdue / Requests / Returned), and opens each row into a read-only loan detail screen at `/adminHome/loans/:id`: the hardware item and its serial, the member with their email and Discord handle, the signed agreement, and the loan's dates.

The detail screen deliberately has **no hand-off or return buttons**. Handing hardware out and taking it back are done from the admin home's **Check out hardware** (`/adminHome/checkout`) and **Return hardware** (`/adminHome/return`) flows, which find the loan by scanning the unit's barcode, typing its serial, or picking from the list of open loans. The detail screen keeps the space where those buttons were, and the per-loan hand-off routes (`/adminHome/loans/:id/hand-off` and `…/agreement`) still exist and share their screens with the checkout flow.

| State | What the detail screen shows |
| --- | --- |
| Checkout requested | The member's checkout availability, and their signed agreement |
| Active / Overdue | The signed agreement, the loan's dates and who checked it out |
| Return requested | The member's return availability, and their signed agreement |
| Returned | When it came back and who received it |
| Denied | The review note |

The hand-off is a two-step flow. Step 1 (`/adminHome/loans/:id/hand-off`) opens the camera and waits for the unit's barcode. Either way the result lands on the viewfinder — it blurs behind a green tick or a red cross — so the scan visibly registers rather than the screen just changing. A match holds the tick briefly and continues; a mismatch says why and resumes scanning, distinguishing a label from another unit ("Wrong serial number") from something that isn't club hardware at all ("Not recognised in inventory"). "Manually attest to serial number" is the way past it without a scan, behind a dialog that names the serial and asks the admin to own it. Step 2 is reached only with that verification in its route state — landing on it directly sends you back to step 1.

Scanning uses the browser's `BarcodeDetector` where it exists (Chromium only) and lazily loads a WebAssembly polyfill where it doesn't, which covers Safari, Firefox and every browser on iPhone. The `.wasm` is served from the app's own bundle rather than the package's default CDN, so a strict CSP or a blocked CDN doesn't break it.

The app no longer prints labels: units carry UW-issued barcodes, and `useBarcodeScanner` reads only Code 128 until the format of those tags is known (see Phase 2 in the checklist).

Step 2 (`/adminHome/loans/:id/hand-off/agreement`, "Loan agreement sign off") is the admin counterpart to the member's "Sign the Hardware Loan Agreement" step: the same agreement, rendered from the same [`AgreementPreview`](src/components/user-dashboard/AgreementPreview.tsx) in `review` mode, so the admin can check the borrower signed it and that the serial number matches the hardware in their hands. Section 9 reads the borrower's stored signature and date back in the same two-column table the PDF prints them in, and section 10 — which the borrower leaves blank — is where the receiving Hardware Manager types the received date, time and their own name. Confirming calls `handOffLoanRequestItem` with **the typed name**, not the signed-in account's, since section 10 asks who physically handed the hardware over; the typed date and time become the date on the Certificate of Approval, while `reviewed_at` stays the real database timestamp.

Reading section 9 back needs the signature to exist. Until [`supabase/migrations/20260923000000_loan_item_signature.sql`](supabase/migrations/20260923000000_loan_item_signature.sql), the name and date the borrower typed went into the generated PDF and nowhere else; they're now stored on `loan_request_items` as `signature_name`/`signature_date`. Items submitted before that migration have a PDF but no stored values, and the screen shows "Not recorded" rather than deriving a plausible-looking signature from the profile.

`AgreementPreview` is styled to match the generated PDF: an 8.5x11 sheet in a viewer surround, with the Synaptech logo header, the same Bungee/Rubik type at the PDF's point sizes, the same navy and brand blue, the same `#D6E5F8` table fills and hairline borders, and the same 0.75in margins. Both units come from one custom property each (`--in`, `--pt`) derived from the page width, so changing `--doc-width` scales the whole document like a zoom level. Exact line-for-line parity isn't achievable — browsers break lines and kern differently from jsPDF — but every size, colour and margin is the value [`loanAgreementPdf.ts`](src/lib/loanAgreementPdf.ts) uses. Below ~52rem the sheet steps down and the viewer pans, which is what reading the PDF on a phone does too; the member's signing step renders from the same component, so both sides of the hand-off see the same document.

When a checkout bundles several items, each one is a loan in its own right — its own serial, return date and hand-off — so the "Also included in this request" list opens straight into them.

Recording a hand-off calls `handOffLoanRequestItem`: it stamps a Certificate of Approval onto the member's signed agreement and moves the request to `approved`. Recording a return calls `markLoanRequestItemReturned` (the **Return hardware** flow), which sets `loan_request_items.returned_at`, frees the unit for checkout, closes the loan and sends the member their return confirmation.

### Approving a request someone else made

An admin approving a member's request touches that member's signed agreement in the private `loan-agreements` bucket, their `loan_request_items` row and their `loan_requests` row. The member policies are scoped to the member's own rows and folder, so approval by a *different* admin depends entirely on the admin-only policies, written in terms of `public.is_admin()` in [`supabase/migrations/20260926020000_admin_approval_access.sql`](supabase/migrations/20260926020000_admin_approval_access.sql). If an admin can approve their own request but not anyone else's, that migration has not been applied.

### One unit, one borrower

A hardware unit is *held* from the moment it is attached to a request until it comes back: a `loan_request_items` row for the unit with `returned_at` null, whose request is `pending` or `approved`. A denied or cancelled request releases its units. Members can't read each other's requests, so the question "which units are free?" is answered in the database — `available_equipment_units(equipment_id)` and `equipment_availability()` — and a trigger on `loan_request_items` refuses to attach a held unit, which also settles two members submitting at the same instant ([`supabase/migrations/20260926010000_unit_reservation.sql`](supabase/migrations/20260926010000_unit_reservation.sql)).

The member checkout flow picks the first free unit when the agreement is signed, so the signed PDF names it, and carries that unit through to submission. If none is free the flow stops with a message; if someone else takes it in between, submission fails with `UnitUnavailableError` and the member restarts. The "N available" counts members see are free units, not units owned.

### Member home: My hardware

The member home page lists the hardware the member currently has out (`activeHardwareLoans` in [`src/lib/memberLoans.ts`](src/lib/memberLoans.ts), read through `useMemberLoans`), one card each: grey normally, yellow when due within 7 days, and red on or after the due date (`homeLoanTone`). Note this is stricter than the loans list, which only calls a loan overdue once the date has passed. Any red card disables the **Check out hardware** button until that hardware is back.

### Member-initiated cancel and return request

Two things a member can do to their own loan from "My hardware loans" without an admin acting first, added in [`supabase/migrations/20260925000000_member_loan_actions.sql`](supabase/migrations/20260925000000_member_loan_actions.sql) and [`supabase/migrations/20260926000000_return_availability.sql`](supabase/migrations/20260926000000_return_availability.sql):

- **Cancel a pending checkout request** — `cancelLoanRequest` in [`src/lib/memberLoans.ts`](src/lib/memberLoans.ts) moves `loan_requests.status` from `'pending'` to `'cancelled'`, a fourth status alongside `'denied'`. RLS only allows this transition from `'pending'` on the member's own row, so hardware already handed off can't be "cancelled" — that's a return instead. Cancelling releases the unit the same way a denial does (see [One unit, one borrower](#one-unit-one-borrower)).
- **Request a return** — `requestReturn`/`cancelReturnRequest` in [`src/lib/availability.ts`](src/lib/availability.ts), used by [`ReturnAvailability.tsx`](src/components/user-dashboard/ReturnAvailability.tsx), set/clear `loan_request_items.return_requested_at`/`return_requested_by`. It reuses `loan_request_availability` rather than a new table: that table now has a `kind` column (`'checkout'` | `'return'`), where a checkout row points at the whole `loan_request` (everyone in the submission is collected together) and a return row points at a single `loan_request_item` (items in one submission can be given back separately).

Both surface immediately through `bucketForLoanItem`: a cancelled request drops out of every list (same as denied), and a return request moves the item into the `'returns'` bucket — the admin "Hardware loans" list, the loan detail screen's **Return requested** row, and the member's **Processing return request** badge all read the same field.

`bucketForLoanItem` returns `null` for both cancelled and denied requests; the admin loan detail screen ([`LoanDetail.tsx`](src/components/admin-dashboard/LoanDetail.tsx)) tells them apart by `status` and labels each one correctly, showing who cancelled and why when it was an admin.

### Admin cancel, unit hold and unit switch

Three things an admin can do to a request or a unit before anything is handed over. Each has its own migration, and in each the database stamps who and when and refuses the change if it no longer makes sense — the app's own checks are only there to give a readable message first.

- **Cancel a pending request, with a reason** — `cancelLoanRequestAsAdmin` in [`src/lib/loanRequests.ts`](src/lib/loanRequests.ts), from the loan detail screen. It's the same `'pending'` → `'cancelled'` transition a member makes, compare-and-set on `'pending'`, plus `loan_requests.cancelled_at`/`cancelled_by`/`cancellation_reason`. The reason is required in the UI (500 characters, enforced client-side only) because the member is emailed it: `checkout-request-cancellation`, sent by the `loan_request.cancelled` event only when the canceller isn't the member. [`20261002000000_admin_loan_cancellation.sql`](supabase/migrations/20261002000000_admin_loan_cancellation.sql); redeploy `send-email` after applying it.
- **Put a unit on hold** — `setEquipmentUnitOnHold` in [`src/lib/inventory.ts`](src/lib/inventory.ts), from the item's units table. Sets `equipment_units.on_hold_at`/`on_hold_by`, which takes the unit out of `available_equipment_units`, `equipment_availability` and the reservation guard, so members can neither see nor request it. Only a free unit can be held — a unit on a live request belongs to that request, and the way to stop it going out is to cancel the request. [`20261002010000_unit_hold.sql`](supabase/migrations/20261002010000_unit_hold.sql).
- **Switch the unit on a pending request** — `switchLoanItemUnit` in [`src/lib/loanRequests.ts`](src/lib/loanRequests.ts), from the loan detail screen. Points the item at another free unit of the same product and writes the new serial into section 2 of the member's signed agreement (`restampAgreementSerial` in [`loanAgreementApproval.ts`](src/lib/loanAgreementApproval.ts)). Like the hand-off stamp, the rewritten copy is a new object (`…-unit-<serial>.pdf`) and the agreement as signed stays in the bucket. The new copy is uploaded before the item is repointed, so a failed switch can leave an unused PDF behind but never an item without its agreement. [`20261005000000_loan_item_unit_switch.sql`](supabase/migrations/20261005000000_loan_item_unit_switch.sql) adds the database guard (only while `'pending'`, only to the same product) and the readable audit entry; without it a switch still works but is fenced by the app alone.

## Inventory audits

An inventory audit is someone standing in the hardware storage facility scanning everything on the shelf. The admin "Inventory audit" screen (`/adminHome/inventory/audit`) lists past audits newest first with a single badge for each — **All accounted for**, **N missing**, or **N discrepancies** — and a **New audit** button that opens the live scan at `/adminHome/inventory/audit/new`. Clicking a past audit opens its report at `/adminHome/inventory/audit/:id`.

The scan screen loads every serialised hardware unit, marks each one as expected on the shelf or out on loan, then counts down as barcodes arrive. Hardware is scanned in any order and each barcode counts once; the running lists are **Missing** (selected by default — it's the one you walk the shelf against, and the only one that gets shorter as you work), **Confirmed**, **Checked out** and **Flagged**. Each read lands on the viewfinder as a marker the way the hand-off scan does: a green tick for a unit counted, a neutral tick for a label scanned twice, an amber warning for a unit found on the shelf that the records say is out on loan, and a red cross for a barcode matching nothing in inventory. It uses the same `useBarcodeScanner` hook as the checkout, return and hand-off flows — see [Hardware loans](#hardware-loans) for how that works and why the polyfill is there — differing only in that it never stops: every read restarts the camera loop, because an audit is dozens of scans in a row rather than one verification. Serial numbers are normalised through `normalizeSerialNumber` in [`src/lib/serialNumber.ts`](src/lib/serialNumber.ts), shared with those three flows, so a label reading `HJXPP41T5` matches a unit stored as `SYN-HJXPP41T5`. Typing a serial by hand does the same thing as scanning it, for a camera that won't focus, a peeling label, or a browser with no scanner at all.

Five outcomes are recorded per unit, and they're what the report is built from:

| Outcome | What it means |
| --- | --- |
| Confirmed | Expected on the shelf, and scanned |
| Missing | The records placed it in stock, but it was never scanned |
| Checked out | Out on an approved loan, so its absence is accounted for |
| Found in stock | Scanned on the shelf although the records say it's out on loan — a return that was never recorded, or the wrong unit handed over |
| Not recognised | A barcode matching no unit in inventory |

"Out on loan" is the same rule as everywhere else in the app: reserved on an approved `loan_requests` row whose `loan_request_items.returned_at` is still null. Consumables never appear — they have no `equipment_units` rows to scan, and `quantity_total` is their whole stock record.

Nothing is written until **Finish audit**. A half-saved audit abandoned by a phone going to sleep mid-shelf would be indistinguishable from a real finding of mass disappearance, and an audit is only meaningful as a complete statement about a moment. Finishing records **every** unit in inventory, not just the scanned ones: a report that listed only what turned up couldn't be read back as "these two were missing", and the absences are the finding.

### Why a report is a snapshot

`inventory_audits` and `inventory_audit_entries` copy in the serial number, the product name and the borrower's name alongside the foreign keys, the same way `audit_log` snapshots its actor. The interesting question about a three-month-old audit is *what did we find that day*; recomputing it against today's inventory would answer a different question every time it was opened, and would answer nothing at all for a unit since deleted. The report screen therefore re-checks none of it, and says as much under the list. The one thing it doesn't show is the product photo — an image fetched today for a unit that has since been re-photographed would be the only part of the page not from that day.

Rows arrive solely through `record_inventory_audit(p_entries jsonb, p_note text)`, a `SECURITY DEFINER` function: the audit row and its entries land in one transaction, the counts are derived from the entries server-side so they can't disagree with them, and neither table carries an insert, update or delete policy or grant. An admin can read every audit and write none of them directly; a member can read none. Recording one also writes an `inventory_audit.recorded` entry to `audit_log`, so it shows up on the App audit log beside everything else.

### Applying the migration

[`supabase/migrations/20260924000000_inventory_audits.sql`](supabase/migrations/20260924000000_inventory_audits.sql), the same way as the others — paste it into the Supabase SQL editor (see the note at the end of [App audit log](#app-audit-log) about why `supabase db push` is not interchangeable here). It depends on `equipment`/`equipment_units`, `loan_request_items` and the `audit_write` helper from `20260921000000_audit_log.sql`, so run those first. It needs no secrets and is safe to re-run.

## App audit log

The admin "App audit log" screen (`/adminHome/audit-log`) is a single, searchable history of what has happened in the app: who did it, what it affected, and which fields changed. It covers sign-ups, role changes and profile edits; hardware items, units and add-on links being created, edited or removed; checkout requests being submitted, approved, denied, cancelled or deleted, and the items on them (including a member requesting or being given a return); and edits to the email templates (including a template being turned on or off). Rows are filterable by Members / Inventory / Loans / Emails and open to a detail view with the field-level before-and-after.

Entries are written by Postgres triggers, not by the frontend — see [`supabase/migrations/20260921000000_audit_log.sql`](supabase/migrations/20260921000000_audit_log.sql). This app talks straight to PostgREST from the browser, so a log written by the client would only ever contain what the client remembered to report and would miss anything done from the SQL editor, an Edge Function, or a future second client. The acting user comes from `auth.uid()`, the same mechanism the email triggers rely on; an entry with no actor is genuinely not a signed-in user (a scheduled function, a service-role script, or a direct database change) and the screen shows it as **System**.

A few deliberate limits:

- **Personal details are not copied into the log.** A change to a member's phone number, student ID or address is recorded as having happened, without the old and new values — the audit table is append-only and kept forever, so storing them would create a second permanent copy of data a member can otherwise correct. Non-sensitive fields (role, item name, quantity, replacement value, a template's subject line) keep their full before/after.
- **An email template's body** is recorded as edited rather than diffed; the template itself is the source of truth for how it reads now.
- **`loan_request_availability` is not audited.** One checkout writes dozens of rows there (one per free hour in the 14-day grid) and the grid is already visible in full on the loan detail screen.
- **Emails actually sent are not duplicated here** — they have their own richer surface in `email_log` and the "Sent email log" screen, which keeps the rendered body and the provider's error.
- Logging is fire-and-forget, like `notify_email_event`: if a write to `audit_log` fails it raises a server warning and the original write still succeeds, rather than an admin being unable to add a hardware item because the audit table hiccuped.

The table is admin-readable and has no insert, update or delete policy or grant at all, and the helper functions behind the triggers are revoked from `anon`/`authenticated`, so nothing holding a user's JWT can write, rewrite or erase an entry — not through the table and not through a `SECURITY DEFINER` function. It starts empty: history before the migration was applied was never captured and isn't invented.

### Retention

`audit_log` takes a row for every write the app makes, so it's pruned rather than kept forever: `prune_audit_log(months)` deletes entries older than the given number of months, and the migration schedules it weekly via `pg_cron` (Sundays 03:30 UTC) keeping **12 months**. The screen states the policy under the list, so if you change the interval, change `AUDIT_LOG_RETENTION_MONTHS` in [`src/lib/auditLog.ts`](src/lib/auditLog.ts) to match.

*In the fork, [`20261104000000_audit_log_pruning_schedule.sql`](supabase/migrations/20261104000000_audit_log_pruning_schedule.sql) enables `pg_cron` and schedules the job, so the rest of this paragraph describes the original project.* `pg_cron` is available on Supabase but off by default, and the migration doesn't enable it — enabling an extension is a project-level decision, and failing the whole migration over an optional one would be worse. If it isn't on, everything else still applies, the migration prints a notice, and the log simply grows. Turn it on under **Database → Extensions** in the dashboard and re-run the migration to pick up the schedule. To check or change it afterwards:

```sql
select * from cron.job where jobname = 'prune-audit-log';
select cron.schedule('prune-audit-log', '30 3 * * 0', 'select public.prune_audit_log(24)');  -- keep 24 months instead
select public.prune_audit_log(12);  -- run it once, by hand
```

### Applying the migration

Paste these into the Supabase SQL editor in order, the same way the other migrations in this repo have been applied — [`20260921000000_audit_log.sql`](supabase/migrations/20260921000000_audit_log.sql), then [`20260922000000_loan_item_return.sql`](supabase/migrations/20260922000000_loan_item_return.sql) (which redefines one of the audit triggers, so it has to come second), then [`20260923000000_loan_item_signature.sql`](supabase/migrations/20260923000000_loan_item_signature.sql). None needs secrets, and all are safe to re-run.

*This paragraph describes the original project. The fork's migrations are recorded and deploy on merge to `main`; see [This is a fork](#this-is-a-fork).* `supabase db push` is **not** interchangeable here: it applies every local migration the remote `supabase_migrations.schema_migrations` table has no record of, and since this project's migrations were run by hand in the SQL editor, that table doesn't know about them — so a push would attempt to replay all of them, not just this one. Check with `supabase migration list` (read-only) before pushing anything. To move to CLI-managed migrations, mark the already-applied ones with `supabase migration repair --status applied <version>` for each, then `supabase db push` handles this and future migrations normally.

