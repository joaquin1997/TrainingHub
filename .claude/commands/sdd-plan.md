---
description: Phase 2 of SDD — turn an approved spec into a technical plan (HOW)
---

Plan the implementation of spec: $ARGUMENTS

1. Read the spec. **If it still has `[NEEDS DECISION]` markers, stop and ask
   them** — gate 1 is not passed and planning would bake in guesses.
2. Read `docs/sdd/constitution.md` and `docs/codex-project-context.md`.
3. Read the actual code you intend to change before proposing anything. State
   what the current state *is*, verified, separately from what you propose.
4. Create `plan.md` in the spec's folder from `docs/sdd/templates/plan.md`.
5. Complete the constitution check table honestly. A violation needs a written
   justification or the plan is not approved.
6. Present alternatives and say why you rejected them. A plan with one option
   hides the decision.
7. Enumerate the files to touch, the migration (if any), and how each
   acceptance criterion gets verified.
8. Anything you cannot determine becomes
   `TODO(sdd): <what is missing> — <what would unblock it>`. Never invent a
   step whose outcome nobody can predict (Article 10).

Then stop for review. Do not write tasks and do not start implementing.
