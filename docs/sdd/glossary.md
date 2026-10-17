# Glossary — ubiquitous language

Specs must use these exact terms. When a spec needs a word that is not here,
add it here first — an undefined term in a spec is an ambiguity that reaches
production.

## Training model

| Term | Meaning | Not to be confused with |
|---|---|---|
| **Exercise** | A movement in the catalog (e.g. "Back Squat"). System-defined (seeded from wger) and visible to everyone, or user-defined (custom) and visible only to its creator (spec 0015). | `RoutineExercise`, `WorkoutExercise` |
| **Generated warm-up set** | A warm-up set the warm-up action added and nobody changed since (ticking it done is fine); editing a value or its type makes it the person's own. Only generated sets are removed by the action's remove toggle (spec 0031). | Warm-up set typed by the person |
| **Routine** | A reusable *template* describing intended training. | `WorkoutSession` — a routine is never a record of anything performed |
| **RoutineExercise** | An exercise slot inside a routine template, with intended sets, target values and rest. May belong to a superset group. | `WorkoutExercise` |
| **Routine folder** | Grouping of routines for organisation. | — |
| **WorkoutSession** | One real training session actually performed. | `Routine` |
| **WorkoutExercise** | An exercise as performed inside one `WorkoutSession`. | `RoutineExercise` |
| **WorkoutSet** | The logged data for one set of a `WorkoutExercise`: weight in kg, reps, set type, rest, and whether it was marked done. | Target values, which live on the template |
| **Performed set** | A `WorkoutSet` marked done — or, in a legacy session, any set. The only sets that count as work for progress and "last time" (spec 0013). | A logged set left unmarked |
| **Warmup set** | A `WorkoutSet` of type warmup. Counts toward training volume, never toward personal records or estimated 1RM (spec 0013). | Drop and failure sets, which are working sets |
| **Approach set** | A warm-up set worked out from an exercise's first working weight, as one of a ramp of lighter sets added in one action (e.g. 140 kg → 20 × 10, 55 × 5, 85 × 3, 105 × 2, 125 × 1). Saved as an ordinary warm-up set (spec 0024). | Warm-up block, which is not lifting |
| **Legacy session** | A `WorkoutSession` saved before sets could be marked done, recognisable because none of its sets is. All its sets count as performed. | — |
| **Active workout** | The single in-progress `WorkoutSession`. At most one exists at a time; it is resumable, survives the app being closed (spec 0010), and its routine is locked from editing and deletion until it is finished or discarded (spec 0014). | A saved (finished) session |
| **WorkoutSessionDraft** | The mobile-side state of the active workout, including the display `unit` captured at session start and the workout identity. Kept on the device, scoped to its owner, so it survives the app being closed (spec 0010). | `WorkoutSession`, which is the persisted record |
| **Pause** | A stretch during which the active workout's clock is stopped. Sets can still be logged. Paused time is saved with the workout and never counts toward its duration (spec 0011). | Rest, which is time between sets and does count |
| **Active duration** | A workout's elapsed time minus its paused time. What every screen shows as a workout's duration (spec 0011). | Elapsed time (end − start) |
| **Workout identity** | An id the device gives a workout when it starts, unique per user. Saving the same identity again returns the workout saved first instead of creating a duplicate (spec 0014). | The server's own session id |
| **Optional provenance** | A saved `WorkoutSession`'s link to the `Routine` / `RoutineExercise` it came from. Kept only when it points at the user's own existing records; the workout is saved without it otherwise (spec 0014). | A required reference |
| **Superset** | A group of adjacent `RoutineExercise` entries performed in rounds, with one rest per round (spec 0029). Three exercises: tri-set; four or more: giant set. | — |
| **Round** | In a superset, set *n* of every exercise in it that has one; warm-up sets are outside rounds. The rest starts when a round is complete (spec 0029). | A set |
| **Rest timer** | The countdown after a set is marked done. Belongs to the active workout, so it survives leaving the screen and restarting the app, and alerts when it ends (spec 0018). | Pause, which stops the workout clock |
| **Workout bar** | The strip shown on every screen while a workout is in progress, leading back to it (spec 0019). | — |
| **Tracking type** | What an exercise's sets record: weight & reps, reps only, time, weight & time, or distance & time (spec 0021). | Set type (warm-up, drop, failure) |
| **Tracking type sweep** | A reviewed, repeatable classification of the catalog into tracking types. Changes only catalog exercises whose type the system set; a type set by a person (at creation or by hand) is never overridden (spec 0030). | Changing one exercise's type by hand |
| **Warm-up block** | A checklist of non-lifting warm-up items (mobility, cardio, activation) at the start of a routine; ticked in the workout, never counted as sets, volume or records (spec 0024). | Warm-up set |
| **Deleted exercise** | A custom exercise its creator has deleted. Gone from the catalog and every picker, but kept, with its name, for the saved workouts and routines that already contain it (spec 0033). | An exercise removed outright, which history could no longer name |
| **Held exercise** | Another person's custom exercise that someone's routines or saved workouts already contained before custom exercises became private. Readable there, under its name, and still usable in that routine; never shown in the catalog or pickers, never addable anew (spec 0015). | A custom exercise of my own |
| **Unilateral exercise** | An exercise done one side at a time, logged per side (spec 0022). | — |

## Progress

| Term | Meaning |
|---|---|
| **Session point** | One aggregated data point per `WorkoutSession` for a given exercise, derived from its sets. |
| **Personal record (PR)** | A session that beat the previous best for an exercise. Derived, never stored as a separate concept. |
| **Estimated 1RM** | One-rep-max estimate (Epley) computed from a performed set. Derived. |
| **Training volume** | Aggregated work, in kg. Derived. |
| **Record type** | What a personal record measures: heaviest weight, most reps, best set volume, best session volume or best estimated 1RM (spec 0023). |
| **Starting records** | An exercise's best of each record type as it stood when the exercise entered the active workout. Kept with the active workout, never changed by it (spec 0032). |
| **Record badge** | A mark on a performed working set (or, for session volume, an exercise) of the active workout saying it beats a starting record. A notice only, never a stored record; the saved workout's records are authoritative (spec 0032). |

## Presentation

| Term | Meaning |
|---|---|
| **Primary action** | The one action a screen is for (start, finish, save), drawn as the filled lime button. At most one per screen (spec 0017). |
| **Type scale** | The closed set of six named text styles (title, heading, body, caption, figure large, figure). No text uses a size outside it (spec 0034). |
| **Shape scale** | The closed sets of corner radii and spacing steps. No screen uses a value outside them (spec 0034). |
| **Haptic language** | The fixed set of haptic patterns and the events that trigger them — set done, record, rest over, destructive confirm — and nothing else (spec 0034). |
| **Skeleton** | Neutral placeholder shapes shown while a list's first load is in flight, laid out like the content to come; never invented data (spec 0034). |
| **Set status area** | The one fixed place on an active-workout set row that shows its state: record, done, generated warm-up, up next, or nothing (spec 0034). |
| **Up next** | The first set of the active workout, in workout order, not yet done — in a superset, the next set of the current round. At most one at a time (spec 0034). |

## Identity and preferences

| Term | Meaning |
|---|---|
| **User** | An account. Identified across API boundaries by `publicId`, which is what a token's subject carries. |
| **Dev user** | The legacy `user-development` account that unauthenticated requests currently fall back to. Transitional; being removed (spec 0001). |
| **Settings** | Per-user preferences: display unit (`kg`/`lb`), default rest, language (ES/EN). |
| **Measurement entry** | A dated record of body measurements (weight, body-fat %, muscle %, circumferences) owned by a user. BMI and waist-to-height are derived from the latest entries and the height, never stored (spec 0027). |
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
