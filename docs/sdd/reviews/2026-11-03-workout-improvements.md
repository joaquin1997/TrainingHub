# Workout improvement spec review — 2026-11-03

Scope: review the owner's checklist, reuse the 2026-10-27 drafts against
current master, and produce Specify artifacts. No application changes,
server access, migrations, monitoring activation or device checks were
performed in this pass. New specs are ready to plan, not implemented.

## Checklist coverage

| Owner's request | Current artifact | Review result |
|---|---|---|
| Revisar calentamientos | [0043](../specs/0043-smarter-warm-ups/spec.md) | Planned and owner-reviewed: loading kind, muscle/context, preview, configurable count up to five, adjustable increments and preferences per user/exercise. |
| Botón de guardar arriba | [0046](../specs/0046-set-rows-and-finish/spec.md) | Top Finish action using existing workout-save rules and visible errors. |
| Reloj no carga la siguiente al acabar descanso hasta abrir móvil | [0045](../specs/0045-watch-with-phone-locked/spec.md) | Master already records implemented and accepted locked-phone behaviour, including a workout with the phone app closed. Do not reintroduce the old independent-watch progression design. A recurrence on the installed build needs a fresh reproduction against 0045. |
| Poner blanco el número al marcar hecha | [0046](../specs/0046-set-rows-and-finish/spec.md) | All effective logged figures use normal theme text after completion, including accepted suggestions; light theme stays readable. |
| No marca récords; solo búlgaras; posible migración | [0048](../specs/0048-trustworthy-live-records/spec.md) | Loading/unavailable/confirmed-empty are distinct; retry and all exercise entry paths covered. Migration remains a hypothesis. Original defect cannot close without reproducing or owner-checking a concrete case. |
| Saltar descanso en reloj | [0047](../specs/0047-watch-skip-rest/spec.md) | Remaining watch feature: specific-rest skip, alert cancellation and safe delayed delivery. |
| Tipos de serie más entendibles | [0043](../specs/0043-smarter-warm-ups/spec.md) | Amended FR-13/AC-10 and existing plan: full names, short meanings and effect on records; picking type preserves values/completion. |
| Seleccionar de nuevo al deshacer serie | [0046](../specs/0046-set-rows-and-finish/spec.md) | Latest undo selects the set, surviving reopen; cancels only the rest started by that completion. Superset round order remains authoritative. |
| Peso izquierdo/derecho configurable | [0049](../specs/0049-weight-per-side/spec.md) | Per occurrence in routine/workout; defaults to shared. Switching unequal pairs back requires a deliberate choice, not silently keeping the higher load. |
| No cuadra el récord | [0048](../specs/0048-trustworthy-live-records/spec.md) | Current vs starting-best figures, explicit additional-record count and inspectable detail; no assumption that last time equals all-time best. |
| Editar erratas cuando has entrenado | [0050](../specs/0050-correct-saved-workout/spec.md) | Bounded corrections to existing set values, completion, type and notes. Structural edits and deleting sessions remain out of scope. |
| Preguntar si guardar cambios después | [0051](../specs/0051-offer-routine-update/spec.md) | Owner confirmed: offer to update the routine. Review comes after successful workout save; history and future targets stay separate. |
| Monitoring | [0052](../specs/0052-app-errors-and-service-monitoring/spec.md) | Owner confirmed: app errors and server availability. No product analytics or health monitoring. |
| Agrupar récords por ejercicio | [0053](../specs/0053-records-grouped-by-exercise/spec.md) | Group Records today in the summary by exercise identity; preserve every record and value. Existing single-exercise Progress stays single-exercise. |

Empty backslash lines in the supplied list have no standalone requirement.

## Earlier drafts and ID reconciliation

0045 is already assigned on master. The old draft numbers are therefore
not imported as current identifiers and the old backlog is not merged.

| Earlier draft | Current destination | Reuse and corrections |
|---|---|---|
| 0045 set rows / undo / Finish | 0046 | Reused scenarios and observable requirements; corrected glossary mismatch for explicit undo selection; removed historical code assertions from the spec. |
| 0046 watch progression / skip | Existing 0045 + new 0047 | Existing accepted 0045 covers progression; retain only skip. Removed independent workout progression and retained phone authority. |
| 0047 trustworthy record badges | 0048 | Reused badge values, failure/retry requirements and migration caution. Removed unprovided screenshot claims and guessed diagnosis; separated unknown reproduction evidence from product decisions. |
| 0048 weight per side | 0049 | Reused shared/default mode, side volume and display coverage. Replaced silent heavier-side collapse, impossible fixed-height constraint, unsafe older-client fallback and cross-side record pairing. |
| 0049 saved-workout correction | 0050 | Reused correction/save/cancel/derived-refresh requirements. Bounded scope to existing measurements and notes; preserve pending edits on concurrent changes. |
| No earlier dedicated draft | 0051, 0052, 0053 | Added the remaining requested features; incorporated the owner's clarification of routine updates and operational monitoring. |

## Current code evidence

These are source observations, not proof of production state or a fresh device
acceptance. No live personal training data was inspected.

- [WorkoutSetRow](../../../apps/mobile/src/features/workouts/components/WorkoutSetRow.tsx)
  supplies `placeholderTextColor` independently of completion; completed-row
  styles do not make a placeholder normal text. It still receives an action
  to cycle type. [RoutineSetTable](../../../apps/mobile/src/features/routines/components/RoutineSetTable.tsx)
  also offers type toggling rather than the planned explained picker.
- [ActiveWorkoutScreen](../../../apps/mobile/src/features/workouts/screens/ActiveWorkoutScreen.tsx)
  renders Finish after the workout list; the lock-screen finish effect already
  confirms. [StickyWorkoutHeader](../../../apps/mobile/src/features/workouts/components/StickyWorkoutHeader.tsx)
  shows timing/up-next without Finish.
- [nextSetToDo](../../../apps/mobile/src/features/workouts/restTimer/nextSetToDo.ts)
  anchors to `lastTickedExerciseId`, then current rest, then an unfinished
  exercise. [Draft state](../../../apps/mobile/src/features/workouts/state/workoutDraftStore.ts)
  contains no explicit most-recently-undone set selection. 0046 must amend
  behaviour rather than claim the existing glossary already describes it.
- [Watch protocol](../../../apps/mobile/src/features/workouts/watch/watchProtocol.ts)
  handles done/pause/resume and supplies the next set; no rest-skip handler.
  [WorkoutView](../../../apps/mobile/targets/watch/WorkoutView.swift) and
  [WorkoutModel](../../../apps/mobile/targets/watch/WorkoutModel.swift) show the
  next set/rest and the newer wait-for-phone state, but no Skip action.
  [0045 tasks](../specs/0045-watch-with-phone-locked/tasks.md) record the newer
  physical-device acceptance; the old blank-watch investigation is stale.
- [Starting-record loading](../../../apps/mobile/src/features/workouts/liveRecords/useStartingRecords.ts)
  retries failed requests after 30 seconds but stops after a permanent refusal
  for that mounted workout; no per-exercise visible failure state is returned.
  [Badge labels](../../../apps/mobile/src/features/workouts/liveRecords/recordBadgeLabel.ts)
  show the leading type plus extra-record count, without current/previous
  figures. [Record rules](../../../packages/domain/src/records.ts) require a
  starting best and strictly greater performed working-set values. Empty
  history earns no beaten-record badge by design.
- [Watch targets](../../../apps/mobile/src/features/workouts/watch/watchProtocol.ts)
  and [workout inputs](../../../apps/api/src/features/workouts/routes.ts)
  currently use one weight with separate left/right reps; per-side load needs
  coordinated contract and calculation planning, not just another text input.
- [Workout routes](../../../apps/api/src/features/workouts/routes.ts) offer
  list/detail/last-performance/create; no saved-workout update/delete.
  [Saved detail](../../../apps/mobile/src/features/workouts/screens/WorkoutSessionDetailScreen.tsx)
  is read-only. [Summary](../../../apps/mobile/src/features/workouts/screens/WorkoutSummaryScreen.tsx)
  has no offer to update the routine. [Routine routes](../../../apps/api/src/features/routines/routes.ts)
  already support explicit updates; conflict detection still needs planning.
- [Summary](../../../apps/mobile/src/features/workouts/screens/WorkoutSummaryScreen.tsx)
  maps records into a flat [RecordsCard](../../../apps/mobile/src/features/progress/components/RecordsCard.tsx)
  with exercise name as repeated metadata. Progress currently has one latest
  record on the overview and per-exercise record lists in detail, so 0053 does
  not invent a cross-exercise Progress screen.
- [Service health](../../../apps/api/src/routes/health.ts) checks the database
  and returns an unhealthy result when it cannot answer. [API setup](../../../apps/api/src/app.ts)
  enables request logging. The [production roadmap](../../roadmap/09-production-readiness.md)
  still tracks health alerts and crash reporting as unimplemented; no monitoring
  or error-reporting integration was found in the reviewed app sources.

## Self-review and next gate

All eight new specs include bounded scope, failure paths, observable acceptance
criteria and explicit assumptions, with no blocking product decisions.
0043 retains its planned status and its plan records the explanation amendment.
Backlog and roadmap entries distinguish specifications from deployed behaviour.

Key constraints: routine/performed separation (Article 2), canonical weight
meaning (4), scoped changes (1), data ownership (11), and explicit unresolved
implementation risks (10). No vendor or extra dependency is selected here.

Suggested planning order: 0046, 0048, 0047, 0053, 0050, 0051, then 0049;
0052 can support the diagnostic work independently. Existing 0043 → 0042
priority remains intact. Only Specify work is completed for 0046–0053;
implementation plans, task breakdowns, rollout and device checks remain later
phases. The record report's concrete reproduction remains pending even after
its spec is ready.

## Documentation validation

Checked all 19 changed/new Markdown files: 104 relative links resolve;
new/amended specs have the required sections, sequential requirement and
acceptance IDs, and no blocking decision markers. Whitespace checks passed.
No application tests were run because this change contains documentation only.

## Owner review — 0043

Confirmed on 2026-11-03: count configurable up to five, increment adjustable
(including 2.5/5 kg for cables), and choices per user. Spec FR-14–FR-16 and
AC-11–AC-13 cover these decisions. The revised plan replaces its original
shared-catalog provenance proposal with personal preference persistence.
Automatic remains the initial count; preview placement and explicit-count
numeric schemes are reversible assumptions. No implementation was started.

## Owner review — 0046

Confirmed on 2026-11-03: undo cancels the active rest only if it originated
from that set completion. FR-9, EF-4–EF-5 and AC-9–AC-11 cover cancellation,
alerts and connected-watch synchronization, unrelated rests (including other
sets of the same exercise), paused rests and delayed replay. Older rests
without known origin must not be cancelled by inference. No implementation
was started; identifying the originating completion is a planning requirement.

## Owner review — 0047

Owner accepted the proposed behaviour on 2026-11-03: skip without confirmation,
show the next set without completing it, synchronize the targeted rest and
cancel its pending alert, preserve newer rests on delayed delivery, and show
pending synchronization when disconnected. A phone alert may still fire until
the unreachable phone receives cancellation. Spec remains ready for planning;
no implementation or new device acceptance is implied by this review.

## Owner review — 0048

On 2026-11-03 the owner accepted explicit extra-record wording, loading/error
states, recalculation after edits and no beaten PR on an exercise's first
session. The owner asked about distinguishing historical best from the last
workout for more feedback. FR-12–FR-15 / AC-10–AC-12 now specify both: an
all-time personal record takes priority; improvement over the latest previous
session remains visible as separately labelled feedback, not another PR.
Reference data, metrics and missing-data behaviour must stay explicit; no
fictitious weight/reps pair or zero baseline. No code was changed and the
original record discrepancy is still unconfirmed.

The owner subsequently confirmed the combined 0048 proposal: show historical
PRs and last-session improvement separately, prioritize the PR label when
both qualify, and show both references in detail without duplicate notices.
0048 is owner-reviewed and ready to plan; the original discrepancy remains
unconfirmed and no implementation/device acceptance is implied.

## Owner review — 0049

On 2026-11-03 the owner confirmed both review points: returning unequal loads
to shared mode asks which side to retain, and generated common warm-ups use
the lower working load. FR-3/AC-3 and FR-10/AC-8 already specify these
behaviours; they are now recorded as confirmed rather than assumed. Spec is
ready to plan; no implementation or device acceptance is implied.

## Owner review — 0050

Owner accepted the proposed initial scope on 2026-11-03: existing set values,
completion, type and notes; explicit save and unsaved-change choices; refresh
of derived training views, unchanged routines and retained edits on failure.
Structural changes, date/duration changes, workout deletion and rewriting
health exports remain excluded for now. Ready for planning, not implemented.

## Owner review — 0051

Owner accepted the flow on 2026-11-03 and explicitly confirmed selecting all
compatible changes initially while allowing deselection of one-off changes.
Save the workout first, then optionally review future routine targets;
generated approach sets stay excluded and routine-update failure does not
undo the workout save. Ready for planning; no implementation implied.

## Owner review — 0052

Owner accepted the operational scope and thresholds on 2026-11-03: grouped
app errors with release/platform/operation, minute-based service/data checks,
three failures for an incident and two successes for recovery, monitoring
freshness detection, redacted diagnostics retained for 30 days and reporting
that never blocks training. Availability incidents alert automatically;
individual app errors remain inspectable rather than sending every occurrence.
Vendor and notification channel are planning decisions. No external service,
paid subscription, alert recipient or monitoring deployment was activated.

## Owner review — 0053

Owner accepted the summary grouping on 2026-11-03: one exercise heading with
all records visible below it, workout order, no collapsed groups, and separate
last-session labels that do not increase PR counts. FR-7/AC-7 explicitly
preserve the distinction agreed in 0048. Existing per-exercise Progress is
unchanged. Ready to plan; no implementation or device acceptance implied.

## Review completion

The owner has reviewed 0043 and all eight new specs (0046–0053). Confirmed
changes are recorded in the relevant artifacts. 0043 remains planned with its
revised personal-preference plan; 0046–0053 remain ready for planning. 0045's
prior device acceptance remains distinct from these spec reviews. The original
missing/wrong-record case still needs reproduction or owner verification as
required by 0048. No application code, production data or deployment was changed.

## Planning follow-through — 2026-11-03

After the owner requested commits, plans and tasks, 0043 received its task
breakdown and 0046–0053 received approved plans plus ordered unchecked tasks.
Their current spec status is planned; this supersedes the earlier ready-to-plan
state recorded above. See [the execution sequence](2026-11-03-workout-implementation-sequence.md).

Code inspection clarified one drafting ambiguity: 0011 explicitly excludes
pausing the independent rest timer, and current pauseWorkout freezes only the
workout clock. 0046 now says “while the workout is paused”, and 0047 disables
Skip during workout pause without claiming that rest itself is frozen. This
preserves current pause scope rather than adding rest-pause functionality.

The reviewed user decisions remain intact. No application code or personal
training data was changed. Technical monitoring choices are documented behind
an initial native SDK privacy/expiry gate; no provider was activated.
