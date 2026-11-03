# Constitution

The non-negotiable rules of TrainingHub. Every `plan.md` is checked against
this list before implementation starts (the *constitution check*).

This is deliberately short. It is not a summary of
[codex-project-context.md](../codex-project-context.md) — that document stays
the full architecture reference. This is the enforceable subset: rules where a
violation means the plan is wrong, not merely unusual.

Each article states the rule, why it exists, and how to check a plan against
it.

---

## Article 1 — Scope control beats completeness

**Rule.** Build only what the current spec asks for. Prefer a correct skeleton
with TODOs over a deep half-implementation. Architecture readiness > feature
completeness.

**Why.** The owner continues this codebase manually. An overgenerated
implementation is harder to take over than an honest stub, and burns tokens
producing code that gets deleted.

**Check.** Does the plan touch anything the spec's `Out of scope` section
excludes? Does it introduce a layer no requirement needs?

---

## Article 2 — Templates and performed work are different things

**Rule.** `Routine` / `RoutineExercise` describe *intended* training.
`WorkoutSession` / `WorkoutExercise` / `WorkoutSet` describe *performed*
training. They never share a model, a table, or a type.

**Why.** Conflating them is the single mistake that would make progress
tracking, history and PR detection unfixable. Editing a routine must never
retroactively rewrite what someone actually lifted.

**Check.** Does any new type, table or endpoint serve both a template and a
performed session?

---

## Article 3 — `packages/domain` is the only source of truth for shared types

**Rule.** Shared entities, DTO contracts and integration interfaces live in
`packages/domain`. Never duplicated in `apps/*`. No framework types (Fastify,
Prisma, React Native) leak in.

**Why.** Two copies of a contract drift, and the drift surfaces as a runtime
bug on a device, not a type error in CI.

**Check.** Does the plan define the same shape in two places? Does it import
Prisma or Fastify types into `packages/domain`?

---

## Article 4 — Weight is stored in kilograms, always

**Rule.** Domain, API and database store kilograms (`weightKg`,
`targetWeight`, `bestWeightKg`, volumes). `kg`/`lb` is a **display preference
only** (`settings.unit`). Conversion happens at the edges, via
`apps/mobile/src/lib/weight.ts`.

**Why.** A single pound value persisted anywhere silently corrupts every
aggregate that reads it — volume, PRs, estimated 1RM — and the corruption is
undetectable after the fact.

**Sub-rule (active workout).** The display unit is captured once, at session
start, in `WorkoutSessionDraft.unit`. It is never re-read from settings
mid-session, so changing the preference during a workout cannot reinterpret
numbers already typed.

**Check.** Does any new persisted field, request body or aggregate carry a
non-kg number? Does any new screen format a weight without going through the
conversion helpers?

---

## Article 5 — Prisma migrations are the only schema authority

**Rule.** Schema changes flow: edit `apps/api/prisma/schema.prisma` →
`npm run db:migrate` → commit the generated `prisma/migrations/` folder. No
hand-written DDL that competes with the schema.

**Exception — hand-written migration.** When `prisma migrate dev` cannot run
non-interactively (e.g. it stops on a data-loss warning), a `migration.sql` may
be written by hand, as long as it expresses *exactly* the change made to
`schema.prisma`, sits in its own timestamped folder, and is applied with
`npm run db:deploy`. The schema file stays the authority; the SQL only mirrors
it. Precedent: `add_user_password_email_unique`.

**Data changes are not migrations.** Moving or fixing *rows* (e.g. reassigning
one account's data to another) goes in a one-off script under
`apps/api/src/scripts/`, never in `prisma/migrations/`. Migrations run on every
database, including fresh ones; a data fix tied to specific rows would fail or
misbehave there.

**Why.** A previous `sql/` init script competed with Prisma and was removed
for exactly this reason.

**Check.** Does the plan introduce SQL that is not a generated migration? If it
is hand-written, does it mirror a `schema.prisma` change exactly? Does any
migration touch data that only exists on one database? Are the migrations
committed alongside the schema change?

---

## Article 6 — Integrations sit behind interfaces, not inside features

**Rule.** Auth providers, health providers and token storage are reached
through explicit interfaces with isolated implementations. Apple-specific,
Google-specific or SecureStore-specific code never spreads into feature code.

**Why.** Apple is the first auth provider, not the only one; the app runs on
iOS, Android and web, so storage and health APIs differ per platform. Coupling
features to one implementation means rewriting the features to add the second.

**Known instances.** `TokenStorage` (get/set/clear, default impl
`expo-secure-store`); auth provider contracts in
`packages/domain/src/auth.ts`; `HealthIntegration` / `WorkoutSyncService` /
`LiveWorkoutBridge`.

**Check.** Does feature code import a provider implementation directly instead
of its interface?

---

## Article 7 — Secrets never enter the repo or an image

**Rule.** `DATABASE_URL` and `JWT_SECRET` live in `apps/api/.env` (gitignored),
documented by shape in `.env.example`, injected at runtime — never baked into
a Docker image or a commit. Credentials are read from the running container's
env, never printed into a transcript.

**Why.** The API image is built from the repo root and deployed to a home
server; a baked secret would be permanent.

**Check.** Does the plan add a secret to a committed file, a Dockerfile, or a
compose file?

---

## Article 8 — Every change is independently committable and verified

**Rule.** One logical change per commit, conventional message. Validate with
`pnpm -r typecheck` and `pnpm -r test` before each commit. The owner pushes.

**Why.** Small reviewable commits are what makes manual continuation possible;
CI (`.github/workflows/ci.yml`) runs the same two checks.

**Check.** Can each task in `tasks.md` be committed on its own without leaving
the tree broken?

---

## Article 9 — Dependencies must earn their place

**Rule.** No new dependency unless it clearly removes more complexity than it
adds. Prefer mature, actively maintained libraries. Native dependencies carry
an extra cost: they require `expo prebuild` and a full device rebuild.

**Why.** Already exercised in practice: line charts were deferred rather than
pull in `react-native-svg`, and dependency-free bar charts shipped instead.

**Check.** Does the plan add a package? Is the justification written down? Is
it native, and does the plan say a rebuild is needed?

---

## Article 10 — When implementation cannot be clean, leave a TODO

**Rule.** Never invent a half-solution to avoid an unknown. Leave a TODO that
states what is missing and what would unblock it, and surface it in the
`plan.md` risks section.

**Why.** A visible gap is cheap; a plausible-looking wrong implementation is
expensive to find.

**Check.** Does the plan contain any step whose outcome nobody can predict?

---

## Article 11 — User data requires a validated identity

**Rule.** User-data operations require signed, expiring credentials whose
subject is an existing account. No request creates, selects or falls back to
a default user. Only explicitly listed credential-acquisition operations and
the liveness check are public. Server unavailability must not be mistaken
for credential rejection on the device.

**Why.** Per-user scoping has no effect when anonymous callers can select a
shared account. New routes must inherit the protection automatically.

**Check.** Can a new route return data without authentication? Can a resolver
invent an owner? Does a network failure clear stored credentials?

Applies to local code after spec 0001; live enforcement begins with its
ordered reassignment/deployment rollout.

---

## Amending this document

The constitution changes when a decision proves itself, not when a decision is
proposed. To amend: state the article, the reason, and the spec that forced the
change. Record it below.

### Amendment log

- **2026-11-03 — Article 11.** Spec 0001 removes the default account and
  makes the API boundary strict by default; implemented and tested locally,
  server rollout pending. Offline startup retains credentials separately
  from an actual authentication rejection.

- **2026-09-23 — Founding.** Extracted from `docs/codex-project-context.md`,
  the per-area roadmap notes, and decisions taken during the routines /
  workouts / progress / auth / settings slices (weight-unit invariant,
  `TokenStorage` interface, Prisma-only schema authority).
- **2026-09-24 — Article 5.** Recorded the hand-written migration exception
  already used by `add_user_password_email_unique`, and ruled that data fixes
  are scripts, not migrations. Forced by spec 0001, whose plan put an
  account-specific data reassignment into a migration.
- **2026-10-18 — Article 9 (example).** The deferral the article cites as its
  example is reversed: spec 0034 (FR-22) asks for smooth line charts with an
  area, which `View`-built bars cannot draw, so `react-native-svg` (the
  Expo SDK's pinned native module) was added, justified in
  `specs/0034-visual-polish/plan-b.md` and guarded so older binaries keep the
  bars. The rule itself is unchanged; the example now records a dependency
  that earned its place once a spec needed it.

`TODO(sdd): Articles 4 and 6 encode decisions that currently live only in the`
`assistant's memory notes, not in any repo document. Confirm they are stated`
`correctly here, because from now on this file is where they live.`
