---
description: Phase 3 of SDD — break an approved plan into ordered, committable tasks
---

Break down the plan for spec: $ARGUMENTS

1. Read the spec and the plan. If the plan is not approved or still has
   blocking TODOs, stop and say so.
2. Create `tasks.md` in the spec's folder from `docs/sdd/templates/tasks.md`.
3. Order by dependency: `packages/domain` → migration → API → mobile → docs.
   A breaking change lands only after the consumer can cope with it.
4. Every task must be independently committable and independently verifiable,
   leaving `pnpm -r typecheck` and `pnpm -r test` green (Article 8). Give each
   one a conventional commit message.
5. Mark tasks that cannot be verified in CI — device rebuild, redeploy, manual
   check on a phone.
6. Map the spec's acceptance criteria onto tasks so none is orphaned.

Then stop for review.
