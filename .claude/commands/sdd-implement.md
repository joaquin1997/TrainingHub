---
description: Phase 4 of SDD — implement the next task from an approved tasks.md
---

Implement the next unchecked task for spec: $ARGUMENTS

1. Read the spec, the plan and `tasks.md`. Work on **one task only** — the
   next unchecked one, unless told otherwise.
2. Delegate to the right area agent (`domain`, `backend-api`, `mobile-frontend`,
   `data-sql`) when the task sits squarely in one of them.
3. Respect the constitution. If the task cannot be done cleanly, leave a TODO
   stating what is missing and what would unblock it — never a plausible-looking
   half-solution (Article 10).
4. Validate: `pnpm -r typecheck` and `pnpm -r test`. Report real output; if
   something fails, say so.
5. Update `tasks.md` (check the task, append to the progress log) and the
   relevant `docs/roadmap/*.md` checklist.
6. Leave the change ready to commit with the task's conventional message — do
   not push.

Respond in the project's format: current state, plan, files touched, the
changes, validation commands, then risks and pending decisions.
