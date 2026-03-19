# Domain Package

Shared source of truth for domain types and contracts.

- `src/entities.ts` defines the core domain entities used across mobile and api
- `src/auth.ts` defines provider-based auth contracts shared by mobile and api
- `src/health.ts` defines health integration boundaries shared by mobile and api

Key boundaries:

- Routine templates and performed workout data are modeled as separate types
- Auth providers are expressed through explicit client/server interfaces
- Health sync is represented as metadata and integration contracts, not native payloads

Keep this package framework-agnostic. Add shared contracts here only when they are the real source of truth for both apps.
