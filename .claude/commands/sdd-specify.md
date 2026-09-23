---
description: Phase 1 of SDD — write the spec (WHAT and WHY) for a new feature
---

Read `docs/sdd/README.md`, `docs/sdd/constitution.md` and
`docs/sdd/glossary.md` first.

Write a new spec for: $ARGUMENTS

1. Pick the next free id (`NNNN`) from `docs/sdd/backlog.md` and create
   `docs/sdd/specs/NNNN-<slug>/spec.md` from
   `docs/sdd/templates/spec.md`.
2. Fill it in using the project's own vocabulary from `glossary.md`. Add any
   term the spec needs that is missing there.
3. **No technology.** No file paths, library names, endpoint shapes or schema —
   those belong in the plan. The test: could a different stack satisfy this
   spec?
4. Read the relevant `docs/roadmap/*.md` and the code for the area, so the
   spec describes the real gap and not an imagined one. State what you verified.
5. Every genuine unknown becomes `[NEEDS DECISION: question]`. Do not guess.
   Calls made without confirmation go in `Assumptions` as `[ASSUMPTION: ...]`.
6. Fill the `Out of scope` section — it is what keeps the slice small.
7. Add the spec to `docs/sdd/backlog.md`.

Then stop. Report the open decisions and ask them. Do not write a plan: gate 1
is passed by a human answering those questions, not by you.
