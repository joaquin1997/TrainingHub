# Spec-Driven Development (SDD)

## Why this exists

Until now this repo was **prompt-driven**: `prompts` held a numbered list of
Codex prompts, and `docs/roadmap/` holds a checklist per area. That got the
product to a working state, but the *intent* behind each slice was never
written down — it lived in the prompt, was consumed once, and evaporated. The
reasoning only survives in commit messages and in per-area notes written
after the fact.

SDD inverts that: **the spec is the durable artifact, the code is its output.**
When behaviour is questioned six months from now, the answer is in `spec.md`,
not in a chat log.

This is deliberately a *lightweight* SDD: four markdown artifacts and four
review gates. No new tooling, no CLI, no generated scaffolding.

## The loop

One feature = one folder under `specs/NNNN-slug/`. Four phases, each one a
gate. Do not skip forward; do not start the next phase while the current
artifact still has open decisions.

| # | Phase | Artifact | Answers | Gate to pass before moving on |
|---|---|---|---|---|
| 1 | Specify | `spec.md` | WHAT and WHY | Zero `[NEEDS DECISION]` left; every acceptance criterion is observable from outside the system |
| 2 | Plan | `plan.md` | HOW | Constitution check passes; files to touch enumerated; migrations identified |
| 3 | Tasks | `tasks.md` | in which ORDER | Every task is independently committable and independently verifiable |
| 4 | Implement | code + tests | — | `pnpm -r typecheck` and `pnpm -r test` green; roadmap + spec status updated |

### Hard rule: the spec contains no technology

`spec.md` must be readable by someone who has never seen this codebase. No
file paths, no library names, no Prisma models, no endpoint shapes, no
component names. If you catch yourself writing `apps/api/src/...` in a spec,
it belongs in `plan.md`.

The test: *could this spec be implemented in a completely different stack and
still be satisfied?* If no, it is a plan wearing a spec's clothes.

### Hard rule: unknowns are explicit and they block

Anything genuinely undecided is written inline as:

```
[NEEDS DECISION: should workouts owned by the dev user be migrated or deleted?]
```

`[NEEDS DECISION]` markers block the Specify gate. They are questions for a
human, not invitations to guess. This replaces the old habit of making a
reasonable assumption silently — assumptions are still allowed, but they get
written into the `Assumptions` section where they can be challenged.

Two other markers, which do *not* block:

- `TODO(sdd): <what is missing> — <what would unblock it>` — a known gap
  someone can fill later. Always state what information or decision would
  close it, otherwise it is just noise.
- `[ASSUMPTION: ...]` — a call made without confirmation, recorded so it can
  be reversed cheaply.

## Artifact status

Each `spec.md` carries a status in its front matter. Keep `backlog.md` in sync.

| Status | Meaning |
|---|---|
| `draft` | Being written; gate 1 not passed |
| `ready` | Gate 1 passed; no open decisions; safe to plan |
| `planned` | `plan.md` exists and passed gate 2 |
| `in-progress` | Implementation started |
| `done` | Shipped, verified, roadmap updated |
| `superseded` | Replaced — link the spec that replaced it |
| `retro` | Written *after* the code, to document what already exists |

## How this fits what already exists

Nothing is thrown away. The mapping is:

| Existing | Role under SDD |
|---|---|
| `docs/codex-project-context.md` | Stays the architecture reference. `constitution.md` is the short, enforceable subset that every plan is checked against, and links here for detail. |
| `docs/roadmap/*.md` | Stays the **backlog and progress log** — the "what's left" per area. A roadmap sub-point graduates into a spec when it is picked up. |
| `docs/sdd/specs/` | New: the intent behind each slice actually being built. |
| `prompts` | **Historical.** Superseded by this workflow. Kept for provenance; do not add to it. |
| `.claude/agents/*` | Per-area implementers. They execute phase 4 against a `tasks.md`. |
| `.cursor/rules/project-rule.mdc` | Unchanged; points at the context doc. |

`TODO(sdd): decide whether docs/roadmap/ checklists should eventually be`
`generated from spec statuses instead of maintained by hand — would need a`
`convention linking each roadmap sub-point to a spec id.`

## Writing a spec: the parts that matter

Most specs fail in one of three ways. Watch for these:

1. **Requirements that are not testable.** "The app should feel fast" is not a
   requirement. "A saved workout appears in history without a manual refresh"
   is.
2. **Missing the unhappy paths.** Half of real behaviour is what happens on
   an expired token, an empty list, a dropped connection mid-set. If the spec
   only covers the happy path, the implementation will too.
3. **Scope that only says what's in.** The `Out of scope` section is what
   stops a two-day slice becoming a two-week one. This project's whole
   philosophy is scope control — see `constitution.md` Article 1.

## Retro-specs

The six already-built areas (routines, workouts, progress, exercises, settings
and language, accounts and sessions) were specified retroactively in one pass
on 2026-09-23 — see `backlog.md`. They carry status `retro` and are deliberately
thin: what the area does today, the invariants worth protecting, and the known
gaps. They record behaviour, not intent, because the intent was never written
down.

Their value is as a base to build on: a change to a built area starts from its
retro-spec rather than from reading the code cold. Writing them also surfaced
four questions nobody had recorded — listed in `backlog.md` — which is the
usual return on this kind of pass.

Keep them thin. A retro-spec that grows into a full spec is documentation for
its own sake; deepen one only when a change to that area needs the detail.
