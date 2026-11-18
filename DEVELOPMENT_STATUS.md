# Hisab Development Status

Updated: 18 Nov 2026

This status separates the build prompt's requirements from claims already present in the repository documentation. It reflects source inspection and local verification; the manual, authenticated two-account and offline checklist has not been run.

## Phase 1 — Foundation

**Completed:** Next.js App Router, TypeScript strict mode, Tailwind, modular Firebase setup, local demo store, shared paise-based money/bill/date/phone domain functions, Zod schemas, shared UI primitives, and Vitest coverage are present.

**UI repair:** The Tailwind v4 stylesheet import had no configured compiler plugin, so utility classes were emitted as plain text and every screen looked unstyled. Added the supported Tailwind PostCSS plugin and configuration, then set Next scripts to Webpack so the environment does not hit Turbopack's restricted CSS worker startup. The running app's generated CSS now contains the page and shared-component utility selectors.

**Improved in this pass:** Demo mode no longer auto-signs in, pre-fills a fictitious shop, or seeds sample fruit. First run now presents the intended empty/setup flow. Clearing optional demo shop fields now persists the empty value.

**Completed in this pass:** Authenticated users now have a `users/{uid}` parent document. New customers, fruits, sales, payments, bill history, and settings are stored in that user's subcollections. Reads combine these with owned legacy top-level records (nested documents take precedence by ID); edits promote a matching legacy record into the nested path. Existing legacy documents are left intact except when the user explicitly deletes a fruit.

**Partial / pending:** Verify the deployed iOS client against the requested nested structure before sharing data between platforms. Forms use Zod schemas inconsistently rather than all being wired through react-hook-form.

## Phase 2 — Auth + setup

**Present:** Phone OTP, email/password sign-in and account creation, password reset, Google popup sign-in, setup screen, auth/settings guards, responsive navigation shell, and quick-add menu.

**Partial / pending:** Verify provider conflict messaging and all auth error paths against Firebase; manual Firebase credentials and authorized domains are needed for real-provider testing. Demo auth remains a local simulation by design.

## Phase 3 — Master data

**Present:** Customer and fruit list/form/detail flows, searching, active filters, duplicate-phone warning, customer deactivation, fruit sales stats, and delete protection when sales exist.

**Partial / pending:** Confirm every field-level validation and narrow-screen interaction manually. Long lists are not paginated.

## Phase 4 — Transactions

**Present:** Sale/payment creation, preselection, transaction editing via customer ledger, void confirmations, and balance derivation from non-voided transactions.

**Fixed in this pass:** Payment creation no longer passes a newly generated document ID as an existing-record ID, which had sent new payments through the update path and caused Firestore permission errors. Nested subcollection reads now permit the authenticated owner to check for a not-yet-created document; create/update rules still enforce `ownerId`.

**Storage preference update:** Every monetary Firestore field is now written in rupees with `moneyUnit: "INR"` (payments also use `amountUnit: "INR"`). The app converts values back to integer paise for calculations. Existing unmarked customer, fruit, sale, payment, and bill-history records are transactionally migrated from paise to rupees as their collections are read. Unit tests cover storage, compatibility, and migration conversions.

**Partial / pending:** Check offline write feedback end-to-end; verify customer ownership for every mutation by emulator/security-rules tests; reason text is stored by replacing a transaction note rather than a dedicated audit field.

## Phase 5 — Home + Bills

**Present:** Dashboard, bill dashboard, period calculations, print preview, copy/WhatsApp/PDF actions, history writes, and reviewed bulk queue are implemented.

**Partial / pending:** Manually reconcile the section 20 worked example through UI and real PDFs. Bulk download ZIP is not implemented. Bill history's `manual` channel and cancellation behavior need manual checks.

## Phase 6 — Reports + Settings

**Present:** Five report tabs, date presets, Recharts, CSV export, shop settings, weekly-start setting, JSON data export, security disclosure, and sign-out.

**Partial / pending:** Manually reconcile report totals against ledger/bills and verify weekly-start changes. Ensure export handles large datasets.

## Phase 7 — Hardening

**Present:** Firestore rules/indexes, multi-tab persistent Firestore cache, service worker, manifest, SVG icons, global error and not-found screens, print CSS, and README setup instructions.

**Partial / pending:** Sync indicator currently reports browser connectivity only and never reflects Firestore pending writes or a confirmed synced state. Service-worker offline app-shell behavior is not integration-tested. Prompt requests 192/512 PNG icons; repository supplies SVGs. Rules need Firebase Emulator verification and collection validation tightening. Lists are not paginated/virtualized. Run accessibility, reduced-motion, 375px/1280px layout, PWA install, offline, and two-owner isolation checks with a configured Firebase project.

## Storage structure decision

The user confirmed the Firestore console structure `users/{uid}` with `customers`, `fruits`, `sales`, `payments`, and `settings` subcollections. New web writes follow that structure. Existing top-level owner-scoped collections remain readable for compatibility and are not bulk-migrated or deleted. Firestore rules permit each user to access only their own nested documents, and preserve the previous top-level rules for legacy data.

## Verification performed

- `npx tsc --noEmit` — passed after the Firestore path changes.
- `npm test -- --reporter=dot` — passed, 41 tests across 3 files.
- `npm run build` — passed; all 17 routes generated.
- `npm run lint` — passed with 0 errors; existing project warnings remain.
- Updated `firestore.rules` deployed to Firebase project `hisab-e3cdd` on 17 Nov 2026. The existing indexes cover the nested collection queries.
- Manual in-app transaction flows and Firebase Emulator / two-account isolation tests — not run.
