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
| **WorkoutSet** | The actual logged data for one performed set: weight in kg, reps, set type, rest. | Target values, which live on the template |
| **Active workout** | The single in-progress `WorkoutSession`. At most one exists at a time; it is resumable, and its routine is locked from editing until it is finished or discarded. | A saved (finished) session |
| **WorkoutSessionDraft** | The mobile-side in-memory state of the active workout, including the display `unit` captured at session start. | `WorkoutSession`, which is the persisted record |
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
| **HealthSyncRecord** | Sync *metadata* only. Never a place to duplicate workout data. |
| **HealthIntegration / WorkoutSyncService / LiveWorkoutBridge** | Prepared interfaces for Apple Health, Android Health Connect and future Apple Watch mirroring. Interfaces and stubs only at this stage. |

`TODO(sdd): terms not yet pinned down because the product decision is open —`
`"program" or "training plan" (a multi-week structure above Routine), "cycle",`
`"deload", and whatever social concepts arrive with roadmap area 7 (follow,`
`feed, shared routine). Define them when the first spec needs them, not before.`
