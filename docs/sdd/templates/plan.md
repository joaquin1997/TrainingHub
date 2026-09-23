---
spec: NNNN
status: draft        # draft | approved | in-progress | done
created: YYYY-MM-DD
---

# Plan — <feature name>

How `spec.md` gets built. This is where technology belongs.

## Constitution check

Walk every article in `../constitution.md` that this plan engages. State
compliance, or state the violation and its justification. A violation without
a written justification means the plan is not approved.

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | | |
| 2 — Template vs performed | | |
| 3 — Shared domain types | | |
| 4 — Weight in kg | | |
| 5 — Prisma migrations | | |
| 6 — Integrations behind interfaces | | |
| 7 — Secrets | | |
| 8 — Committable + verified | | |
| 9 — Dependencies | | |
| 10 — TODOs over half-solutions | | |

## Approach

The shape of the solution in a few paragraphs, and — importantly — the
alternatives rejected and why. A plan that presents one option hides the
decision.

### Alternatives considered

- **<Option>** — rejected because <reason>.

## Shared contracts (`packages/domain`)

New or changed types and DTO contracts. Both apps consume these, so changes
here ripple: state the impact on `apps/api` and `apps/mobile` explicitly.

## Data model and migrations

Schema changes, the migration that carries them, and what happens to existing
rows. Article 5: Prisma only.

- Migration name: `<timestamp>_<name>`
- Backfill / data migration needed: yes / no — <what>

## API surface (`apps/api`)

Endpoints added or changed, with method, path, auth requirement, request and
response shape, and status codes including failures.

## Mobile surface (`apps/mobile`)

Screens, state, and where the new behaviour attaches. Note whether a native
rebuild is required (new native dependency, `app.json` change, new permission).

## Testing strategy

What is unit-tested (prefer pure helpers), what is route-tested, what can only
be verified by hand on a device, and how each acceptance criterion in the spec
maps to a check.

| Spec AC | Verified by |
|---|---|
| AC-1 | |

## Files to touch

An enumerated list, so scope creep is visible in review.

- `path` — <what changes>

## Risks and open questions

Anything that could make this plan wrong, and what would resolve it. Article
10: if a step's outcome is unpredictable, say so here rather than discovering
it mid-implementation.

## Rollout

Deployment, ordering constraints (does the API ship before the app?),
backwards compatibility for clients on an older bundle, and how to roll back.
