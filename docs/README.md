# Documentation

Start with the root [README](../README.md) for the product, package layout and
quick start. These guides describe the current code; deployment/device checks
are tracked explicitly rather than inferred from implementation status.

| Guide | Purpose |
|---|---|
| [Development](development.md) | Existing environment, configuration, source review and checks |
| [Deployment](deployment.md) | Runtime configuration, migration ordering, native distribution and recovery |
| [Architecture](codex-project-context.md) | Domain boundaries, package responsibilities and implementation rules |
| [Mobile](../apps/mobile/README.md) | Native modules, iOS development builds, Watch and widget options |
| [API](../apps/api/README.md) | Feature areas, authentication boundary and database commands |
| [Domain](../packages/domain/README.md) | Shared contracts and pure business rules |
| [Security](../SECURITY.md) | Secret handling, sharing a repository and audit scope |
| [Credential review](security-review-2026-11-03.md) | Scope and results of the repository/history scan |
| [Data sources](data-sources.md) | Catalog, images and third-party attribution |
| [SDD workflow](sdd/README.md) | Specify → plan → tasks → implement |
| [Spec backlog](sdd/backlog.md) | Feature status, rollout work and unresolved decisions |
| [Roadmap](roadmap/README.md) | Longer-term work by product area |

## Reading status correctly

A spec marked `done` records accepted work. `in-progress` may mean code exists
but deployment, data migration or device acceptance is still pending; inspect
its task list. `ready` and `planned` describe design work, not a shipped feature.
Older spec progress logs and reference screenshots describe their dated state;
they are not automatically statements about the current app.

`prompts` is a historical development log. It is not a setup guide or a list
of current tasks. Machine-specific operational notes belong under ignored
`docs/local/`, never in the shared setup instructions.
