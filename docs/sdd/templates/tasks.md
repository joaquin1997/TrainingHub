---
spec: NNNN
status: draft        # draft | in-progress | done
created: YYYY-MM-DD
---

# Tasks — <feature name>

Ordered, independently committable, independently verifiable. Each task leaves
the tree green: `pnpm -r typecheck` and `pnpm -r test` pass at every step
(Article 8).

Order tasks so the shared contract lands before its consumers:
`packages/domain` → migration → API → mobile → docs.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | | domain / api / mobile / docs | | `type(scope): ...` |
| 2 | | | | |

Mark `[x]` as each lands, and append a line to the progress log. Note tasks
that need a device rebuild or a redeploy — they are not verifiable in CI.

## Progress log

- YYYY-MM-DD — <what landed, what surprised you>

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Relevant `docs/roadmap/NN-*.md` checklist and progress log updated
- [ ] `spec.md` status set to `done`; `../backlog.md` updated
- [ ] Constitution amended if this work settled a new invariant
