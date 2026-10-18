---
spec: 0037
status: in-progress  # self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Tasks — First run and record celebration

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec `in-progress` | docs | — | `docs(sdd): plan and tasks for 0037` |
| 2 | [x] Rules (`firstRunRules`), `deviceStore`, settings load state and `save` | mobile | unit tests | `feat(onboarding): first-run rules and device memory` |
| 3 | [x] Rest alert permission state + open settings (native, optional); "Not now" suppresses the first-rest prompt; Settings row | mobile + native | unit tests; **native rebuild** | `feat(rest): rest alerts permission in settings` |
| 4 | [x] First-run screen and gate | mobile | web preview | `feat(onboarding): first run after sign-up` |
| 5 | [x] Record celebration on the summary | mobile | unit tests; web | `feat(workouts): record celebration on the summary` |
| 6 | [x] Progress log, backlog, roadmap | docs | — | `docs(sdd): record 0037 implementation` |
| 7 | [ ] [DEVICE] AC-4 – AC-6 (permission), AC-17 – AC-20, AC-25 (haptic, VoiceOver, Reduce Motion) | device | owner | — |

## Progress log

- (2026-10-18) Tasks 1–6 done; calls made by the assistant under the delegated
  gates, revisable. **Rules** (`onboarding/firstRunRules.ts`, tested):
  set-up = any routine, workout or non-default setting; decision show /
  record / skip; pounds preselected only for the `us` measurement system
  [ASSUMPTION recorded in the plan]; keeping the device language saves
  nothing. **Device memory**: `lib/deviceStore.ts` (AsyncStorage, failures
  read as "nothing remembered"). **Settings context** gains `loadState`
  (loading / loaded / failed) and `save` (throws, for EF-3). **Gate**
  (`useFirstRunGate`): once per sign-in or app start; settings first, then
  routines + workouts in parallel with a 3 s timeout; the root navigator keeps
  the spinner while deciding (no Routines flash) and replaces to
  `/first-run` on `show`. **Screen**: three steps, Skip on each, Back on 2–3,
  language preview via `i18n.changeLanguage` undone on every exit that saves
  nothing; rest chips 1:00/1:30/2:00/3:00; the alert card only when the
  native module says `notAsked`; finish saves then records done, then
  Routines (or Routines + profile edit). **Rest alerts**: native
  `permissionStatus` / `openSettings` in `rest-alert` (optional in JS),
  `RestAlerts` gains `outsideApp`, `permissionStatus`, `openSystemSettings`;
  `withNotNow` (pure, tested) keeps the first rest from prompting after
  "Not now"; Settings → Default rest shows a "Rest alerts" row (hidden when
  unknown). **Celebration**: `RecordCelebration` around the summary's records
  block; `celebration.ts` (tested) keeps the last 50 celebrated identities;
  one record haptic, a screen-reader announcement, and a 900 ms lime halo
  (first tried as a fill behind the block — the block's tint is translucent
  so it tinted the text; now a ring around it); Reduce Motion → a static lime
  edge. Web preview: sign-up in Spanish → first run in Spanish, kg and 1:30
  preselected, no alert card (web), Routines after "Empezar a entrenar";
  a seeded account with workouts went straight to Routines; three finished
  workouts each played the halo once and stored their identity. 670 tests.
