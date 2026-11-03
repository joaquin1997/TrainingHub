---
spec: 0045
status: in-progress
created: 2026-11-03
---

# Tasks — The watch keeps going with the phone locked

Ordered, independently committable, independently verifiable. Each task leaves
the tree green: `pnpm -r typecheck` and `pnpm -r test` pass at every step
(Article 8). No domain, migration or API work: mobile and native only.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| [x] 1 | Token read retried when the app becomes active after a failed read (helper + `AuthContext`) — EF-2 | mobile | unit test of the helper; typecheck | `fix(auth): read the token again when a locked-phone launch could not` |
| [x] 2 | `waitingPhone` label: wire (TS + Swift fallback), i18n es/en, passed by `useLiveWorkoutController`; wire tests | mobile / watch | `wire.test.mjs`, `appleWatchWire.test.ts`; swiftc typecheck (watchOS) | `feat(watch): waiting-for-the-phone label on the wire` |
| [x] 3 | Watch: start mirroring after the session begins; events also over the mirrored session; contexts received over it; identical-context dedupe; 5 s waiting state and its line in the view — FR-1, FR-3, FR-4, EF-1, EF-3 | watch (**native — rebuild**) | swiftc typecheck (watchOS) | `feat(watch): mirror the workout to the iPhone and say when it waits` |
| [x] 4 | Phone: AppDelegate subscriber installs the mirroring handler at launch; `PhoneWatchLink` keeps the mirrored session, delivers its events, sends contexts over it, releases it on end/failure/disconnect; `UIBackgroundModes: workout-processing` — FR-1, FR-2, FR-5, EF-4 | ios (**native — prebuild + rebuild**) | `expo config` shows the background mode; Release build of the app with the watch app | `feat(ios): keep the app working while the watch runs the workout` |
| [x] 5 | Docs: backlog, roadmap 08 progress log, spec status | docs | — | `docs(sdd): 0045 code complete` |
| [ ] 6 | **[DEVICE]** prebuild + rebuild + install (`deploy-pending.sh` or prebuild + `renew-iphone.sh`); AC-1–AC-7; note the double buzz and the swipe-away case | owner | on the iPhone + watch | — |

Acceptance criteria → tasks: AC-1 (3, 4, 6), AC-2 (4, 6), AC-3 (3, 4, 6),
AC-4 (2, 3, 6), AC-5 (4, 6), AC-6 (3, 4, 6), AC-7 (4, 6).

## Progress log

- 2026-11-03 — Spec approved by the owner (double buzz kept to try); plan and
  tasks self-approved under the delegated gates.
- 2026-11-03 — Tasks 1–5 landed on `feat/sdd-0045-watch-phone-locked`.
  `pnpm -r typecheck` and `pnpm -r test` green; watch sources typechecked
  against watchOS 11, `PhoneWatchLink` against iOS 15.1 (iOS 17 parts behind
  `#available`); `expo prebuild` puts `workout-processing` in the app's
  Info.plist and registers `WatchWorkoutAppDelegate` in the modules provider.
  The JS needed no change for FR-2: with the app running, the existing
  controllers start the rest alert, update the live status and send the next
  context.
- 2026-11-03 — Owner's first device check (build `d4c793b`): AC-1 passes
  (next set on the watch with the phone locked); AC-3 passes (every set on the
  phone after unlocking); the app swiped away mid-workout stays running in
  the background and the watch keeps working. AC-2 fails: the rest started
  from the watch does not show on the lock screen — under investigation.
  AC-4 not testable by the owner.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Relevant `docs/roadmap/NN-*.md` checklist and progress log updated
- [ ] `spec.md` status set to `done`; `../backlog.md` updated
- [ ] Constitution amended if this work settled a new invariant
