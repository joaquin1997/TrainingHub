# Glossary — ubiquitous language

Specs must use these exact terms. When a spec needs a word that is not here,
add it here first — an undefined term in a spec is an ambiguity that reaches
production.

## Training model

| Term | Meaning | Not to be confused with |
|---|---|---|
| **Exercise** | A movement in the catalog (e.g. "Back Squat"). System-defined (seeded from wger) or user-defined. | `RoutineExercise`, `WorkoutExercise` |
| **Routine** | A reusable *template* describing intended training. | `WorkoutSession` — a routine is never a record of anything performed |
| **RoutineExercise** | An exercise slot inside a routine template, with intended sets, target values and rest. May belong to a superset group. | `WorkoutExercise` |
| **Routine folder** | Grouping of routines for organisation. | — |
| **WorkoutSession** | One real training session actually performed. | `Routine` |
| **WorkoutExercise** | An exercise as performed inside one `WorkoutSession`. | `RoutineExercise` |
| **WorkoutSet** | The logged data for one set of a `WorkoutExercise`: weight in kg, reps, set type, rest, and whether it was marked done. | Target values, which live on the template |
| **Performed set** | A `WorkoutSet` marked done — or, in a legacy session, any set. The only sets that count as work for progress and "last time" (spec 0013). | A logged set left unmarked |
| **Warmup set** | A `WorkoutSet` of type warmup. Counts toward training volume, never toward personal records or estimated 1RM (spec 0013). | Drop and failure sets, which are working sets |
| **Legacy session** | A `WorkoutSession` saved before sets could be marked done, recognisable because none of its sets is. All its sets count as performed. | — |
| **Active workout** | The single in-progress `WorkoutSession`. At most one exists at a time; it is resumable, survives the app being closed (spec 0010), and its routine is locked from editing and deletion until it is finished or discarded (spec 0014). | A saved (finished) session |
| **WorkoutSessionDraft** | The mobile-side state of the active workout, including the display `unit` captured at session start and the workout identity. Kept on the device, scoped to its owner, so it survives the app being closed (spec 0010). | `WorkoutSession`, which is the persisted record |
| **Pause** | A stretch during which the active workout's clock is stopped. Sets can still be logged. Paused time is saved with the workout and never counts toward its duration (spec 0011). | Rest, which is time between sets and does count |
| **Active duration** | A workout's elapsed time minus its paused time. What every screen shows as a workout's duration (spec 0011). | Elapsed time (end − start) |
| **Workout identity** | An id the device gives a workout when it starts, unique per user. Saving the same identity again returns the workout saved first instead of creating a duplicate (spec 0014). | The server's own session id |
| **Optional provenance** | A saved `WorkoutSession`'s link to the `Routine` / `RoutineExercise` it came from. Kept only when it points at the user's own existing records; the workout is saved without it otherwise (spec 0014). | A required reference |
| **Superset** | A group of `RoutineExercise` entries performed back to back. | — |

## Progress

| Term | Meaning |
|---|---|
| **Session point** | One aggregated data point per `WorkoutSession` for a given exercise, derived from its sets. |
| **Personal record (PR)** | A session that beat the previous best for an exercise. Derived, never stored as a separate concept. |
| **Estimated 1RM** | One-rep-max estimate (Epley) computed from a performed set. Derived. |
| **Training volume** | Aggregated work, in kg. Derived. |

## Identity and preferences

| Term | Meaning |
|---|---|
| **User** | An account. Identified across API boundaries by `publicId`, which is what a token's subject carries. |
| **Dev user** | The legacy `user-development` account that unauthenticated requests currently fall back to. Transitional; being removed (spec 0001). |
| **Settings** | Per-user preferences: display unit (`kg`/`lb`), default rest, language (ES/EN). |
| **Display unit** | A *presentation* preference only. Storage is always kilograms — constitution Article 4. |
| **TokenStorage** | The interface behind which the auth token is kept (get/set/clear), so platform specifics stay isolated. |

## Integrations

| Term | Meaning |
|---|---|
| **Auth provider** | A pluggable identity source. Email/password ships today; Apple is the next. |
| **Live workout status** | The active workout shown outside the app — on iOS a Live Activity on the lock screen and Dynamic Island: routine, clock, active energy, pause, finish (spec 0012). Reached through `LiveWorkoutBridge`. |
| **Active energy** | Calories burned as measured by the person's health data (e.g. a watch), read with permission — never estimated by formula. Unknown when there is no data or no permission, never shown as 0 (spec 0012). |
| **HealthSyncRecord** | Sync *metadata* only. Never a place to duplicate workout data. |
| **HealthIntegration / WorkoutSyncService / LiveWorkoutBridge** | Interfaces for Apple Health, Android Health Connect and live surfaces. Implemented on iOS for the live workout status and active energy (spec 0012); the rest are stubs. |

`TODO(sdd): terms not yet pinned down because the product decision is open —`
`"program" or "training plan" (a multi-week structure above Routine), "cycle",`
`"deload", and whatever social concepts arrive with roadmap area 7 (follow,`
`feed, shared routine). Define them when the first spec needs them, not before.`
