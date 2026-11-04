# Verification — 0043

Code implementation completed 2026-11-03. Task 8 (production delivery and
physical-device acceptance) remains open; the spec is not marked done.

## Automated checks

- `pnpm -r typecheck`: all workspace packages pass.
- `TRAININGHUB_TEST_DATABASE_URL=<isolated database> pnpm -r test`: includes
  the new PostgreSQL integration suite as well as ordinary API/mobile suites.
  Default test runs skip the opt-in database suite rather than connect to the
  application's database.
- Prisma generated the additive migration from the pre-change schema diff.
  Applied all 27 migrations to a disposable PostgreSQL 16 container. It uses
  a separate database and explicit test-only connection; no production rows
  or schema were inspected or changed.
- Database tests verify separate users on the same exercise, default/reset
  round trips, private/deleted/retired access denial and unchanged catalog kind.
- Route tests verify signed identity, malformed count/increment/kind rejection,
  explicit reset and identical not-found responses.
- Pure tests cover all count schemes, 140 kg barbell regression, dumbbell and
  machine increments, EZ bars, normalized primary muscles/category fallback,
  distinct back muscles, kg/lb physical step conversion and invalid/light ramps.
- Draft tests cover known/old/malformed/foreign envelopes, pending preference
  persistence, completed working-set context, exact type-selection no-op,
  preserved values/rest/completion and stale weight/unit confirmation rejection.
- Preference-delivery tests cover overlapping saves, late read/write replies,
  failed-save retry, restored pending choices, account changes and older API
  versus specifically inaccessible-exercise responses.

## Web smoke checks

A temporary local API used the disposable database and fabricated training
fixtures. Browser checks used an isolated headless Chrome profile. Because
the current API has no cross-origin web development headers, the local test
harness supplied CORS headers without changing production API policy.
This is not a claim that cross-origin production hosting was configured.

- English/dark workout at 390 pt: barbell 140 kg preview, custom count and
  2.5 kg step, invalid negative input rejected, quick step selection repairs
  invalid text, five generated rows inserted, named type picker changes a
  normal set to warm-up, and dumbbell 32.5 kg preview has no bar floor.
- Light workout at 320 pt: controls wrap without overlap and the sheet scrolls
  to its actions. Existing rows remain separate from preview preferences.
- Spanish/light routine editor with a second account at 320 pt: preceding
  planned chest exercise explains the shortened automatic ramp; explicit five
  sets and 2.5 kg step persist through the authenticated API; insertion works.
  The routine picker offers only normal/warm-up with explanations and accepts
  a manual warm-up change.
- No unhandled browser errors in the passing flows. Missing previous history
  on these fresh fixtures correctly returns the existing not-found response.

## Delivery order and checks still pending

1. Back up and apply the new generated migration to the intended deployment
   database, then deploy the API before distributing the mobile bundle.
2. Confirm preferences from one actual device are read on another under the
   same account and remain isolated from another account.
3. On iPhone/Android, check both preview/type sheets in both languages/themes,
   large accessibility text, keyboard interaction, offline edits, close/reopen
   and retry. Existing native binaries need no new module or capability for
   this spec, but actual bundle delivery is still required.
4. Exercise the complete AC-1–AC-13 checklist, including expired credentials,
   inaccessible exercises and restored old drafts on real devices. Record
   acceptance evidence before marking task 8/spec/plan done.

These are implementation delivery/acceptance tasks, not authorization to
modify the production database as part of the completed local test pass.

## Paired Release delivery — 2026-11-04

Native prebuild completed with Watch/widget enabled. Release builds succeeded
for the paired Watch and iPhone, and the signed phone bundle passed
`codesign --verify --deep --strict`. Both apps were installed successfully and
launched on the owner's iPhone and Watch. The bundle includes local 0042,
0043, 0046 and the 0045 mirroring follow-up; the phone's compiled Info.plist
retains `workout-processing`. No Metro connection is required.

API health and database availability pass; anonymous workout access remains
401. All 27 migrations, including personal warm-up preferences, were already
applied; deployment reports no pending migration. Runtime credentials were
preserved, and no legacy-user reassignment or catalog rewrite was performed.
Full types/tests pass (852 mobile + 479 API; two database tests skipped).
Delivery is complete; this does not close the remaining feature-specific
physical-device/accessibility/identity checks.
