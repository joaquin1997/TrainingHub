---
id: NNNN
title: <short feature name>
status: draft        # draft | ready | planned | in-progress | done | superseded | retro
roadmap: <docs/roadmap/NN-area.md#sub-point, or "-">
created: YYYY-MM-DD
---

# <Feature name>

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

What is wrong or missing today, from the user's point of view. Two or three
sentences. If you cannot state the problem without naming a solution, the
problem is not understood yet.

## Why now

What this unblocks, or what it costs to keep deferring. Keeps the backlog
honest about ordering.

## Users and scenarios

Who is affected, and the concrete situations they are in. Prefer real
scenarios over personas.

- **<Scenario name>.** <Someone> is <in some situation> and wants <outcome>.

## Scope

### In scope
- <observable capability>

### Out of scope
- <thing deliberately excluded> — <why, or what would change to include it>

> The out-of-scope list is what keeps the slice small. Filling it in is not
> optional.

## Functional requirements

Numbered, testable, each one independently checkable. Use MUST / SHOULD /
MUST NOT.

- **FR-1.** The system MUST <observable behaviour>.
- **FR-2.** The system MUST NOT <observable behaviour>.

## Behaviour when things go wrong

The unhappy paths. Expired credentials, empty state, lost connectivity
mid-action, conflicting data, a value out of range. Half of real behaviour
lives here.

- **EF-1.** When <failure>, the system MUST <behaviour>.

## Domain impact

Which domain concepts this touches, in the project's own vocabulary (see
`glossary.md`). Whether it introduces a new concept, changes the meaning of an
existing one, or only reads them. Nothing about tables or types.

## Acceptance criteria

Observable from outside the system. Given / When / Then.

- **AC-1.** Given <state>, when <action>, then <observable result>.

## Non-functional requirements

Only the ones that actually constrain this feature — performance budgets,
offline behaviour, platform reach (iOS / Android / web), data retention,
migration of existing data. Omit the section rather than filling it with
platitudes.

## Assumptions

Calls made without confirmation, recorded so they can be reversed cheaply.

- **[ASSUMPTION: ...]**

## Open decisions

Questions for a human. These block the Specify gate.

- **[NEEDS DECISION: ...]**

## Related

- Supersedes / superseded by: <spec id>
- Roadmap: <file>
- Constitution articles engaged: <numbers>
