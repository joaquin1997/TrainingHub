---
spec: 0052
status: approved
created: 2026-11-03
---

# Plan — App errors and service availability monitoring

Self-reviewed against the constitution and the owner's spec review. Design
only: no implementation, migration, external activation or device acceptance.

## Constitution check

| Article | Compliance |
|---|---|
| 1 | Operational errors/availability only; no analytics/replay or self-healing. |
| 2 | No changes to templates or performed training. |
| 3 | Framework-free diagnostic boundary; provider payloads isolated. |
| 4 | No measurement collection or weight storage change. |
| 5 | No training schema or user-data migration. |
| 6 | Sentry/observer behind adapters, not embedded in feature rules. |
| 7 | Allowlist redaction at JS/native/server; secrets runtime/build only. |
| 8 | Harness, sanitizer, adapters, operational acceptance split; no fabricated evidence. |
| 9 | One justified native SDK; explicit full native rebuild and compatible pin gate. |
| 10 | Native expiry/privacy and observer mute/delivery limitations are stop gates. |
| 11 | Maintainer-only dashboards; no new public user-data endpoint or identity bypass. |

## Current code and approach

API logging and database-aware `/health` exist, but no app crash integration
or external availability observer. Docker's local healthcheck alone cannot
notify if its own host stops. Select two isolated adapters for the first slice:
Sentry for app diagnostics; a private-network probe with an external
Healthchecks.io observer for availability and missed probe heartbeats.
These are design choices, not activated services or paid commitments.

### Provider evidence and initial compatibility gate

[Expo's Sentry integration guide](https://docs.expo.dev/guides/using-sentry/)
documents the maintained React Native integration for native/web apps and
source maps. [Sentry's event-count guidance](https://www.sentry.help/en/articles/13964336-why-does-the-event-count-in-my-issue-not-match-up-with-the-count-in-the-all-events-tab-of-the-issue)
states Developer error events have 30-day retention; do not assume the same
for paid/trial plans. Use a maintainer-only project with confirmed 30-day
retention or do not enable reporting. No upgrade/purchase is part of this plan.

Start with a controlled SDK compatibility harness for the actual Expo 58 /
RN 0.88 app: install a compatible pinned `@sentry/react-native`, verify web
and native crash capture, symbolication and bounded delivery. SDK/native
privacy and cache hooks must be proven, not inferred from JS `beforeSend`.
Native events can bypass JS filtering. Require native-layer sanitization and
expiry before upload in addition to JS filtering; if this cannot be implemented
with the pinned SDK and project config, stop after the harness and revise the
adapter plan. Do not ship native capture with an unverified 30-day queue.
This technical gate does not authorize telemetry transmission to a new account.

### Alternatives considered

- A custom native crash collector: recreates symbolication and delivery machinery
  that an established adapter already supplies; rejected for this slice.
- Only the API container's healthcheck: cannot notify when its own host fails.
- Publicly expose the private API for hosted polling: unnecessary; private
  probe plus independent missed-heartbeat observation preserves the boundary.
- Enable SDK defaults and filter only JS events: native privacy/cache limits
  remain unproven; rejected until the explicit native harness gate passes.

## Interfaces and diagnostic data

Add framework-free `Diagnostics` contract (capture unexpected operation error
and no-op adapter) in domain or a shared diagnostics module, with a closed
operation union: auth, workout-save, starting-records, watch-event. Provider
imports live under mobile infrastructure, not workout/auth feature code.
Root-level error boundary plus SDK native handlers cover unhandled failures;
explicit operation captures are for unexpected failures only. Expected offline,
validation, cancellation and duplicate ignored events never become crashes.

Default collection disables user identity, automatic console/network/UI
breadcrumbs, tracing/profiling, logs, screenshots, attachments and replay.
Allow only release/build/platform, normalized error class, scrubbed code-only
stack frames, operation and random per-failure correlation reference. Strip
URL/query/body/header/notes/measurements and arbitrary exception messages;
when uncertain drop context rather than forward it. No bearer token, account
or exercise name. Configure server-side scrubbing too, before enabling.
Group by release-independent error class/stack plus operation so repeated
failures form one issue with per-release context. All captures return without
waiting for delivery; reporting its own error is a no-op, not recursive capture.

Offline diagnostics: bound application queue to 50 sanitized events and 256 KiB,
drop oldest first, expire at 30 days and recheck before any send. Apply an
equivalent bound/expiry to native crash envelopes using the verified native
adapter; disable SDK features that create a second unbounded queue. Web may
lose an unhandled event while offline; never block training to guarantee it.
Clear account-sensitive context on sign-out (none should be present) without
clearing active training data. Native watch crashes are explicitly not covered
by the initial React Native SDK; phone-side watch processing errors are covered.
Report that coverage gap in rollout rather than claiming instrumented watchOS.

## Availability probe and independent observer

Add a small Node probe (platform runtime, no new package) executed by a one-minute
systemd timer on a continuously-on tailnet peer. Prefer a peer independent of
the API host; deployment records actual host/failure domain. Check deployed
private HTTPS `/health` with a 5-second timeout and validate `status/db`, not
HTTP status alone. Classify network/service vs reachable database-down.
Persist consecutive counts, current incident, last result and mute-until
atomically, with a lock to avoid overlapping timer runs. Initial state is
unknown until a result arrives, never implicitly healthy.

The probe transitions to down after three failed results and up after two
successes. Send one transition signal per incident/recovery through a provider
adapter, retrying with a stable transition identity, not creating new incidents
on every check. Default configured delivery is Healthchecks email to the
maintainer account, never a guessed address. No recipient added/sent here.

[Healthchecks Pinging API](https://healthchecks.io/docs/http_api/) supports
success/fail/log signals. Use one availability check and a separate probe
heartbeat check. The heartbeat is sent after every completed probe cycle,
including service failure, so missing execution is distinct from service-down.
Configure heartbeat period 60 s plus grace 240 s, following
[period/grace semantics](https://healthchecks.io/docs/configuring_checks/),
so silence is marked unavailable at five minutes. Availability fail is sent
on the third failed probe, recovery only after the second success. While down,
use a log/keepalive signal that cannot change its down state; verify chosen
provider semantics before rollout. Timeout of availability reporting is not
a service recovery; mark observer delivery stale locally and heartbeat still
exposes missing/failed reporting. Healthchecks incident transition retries must
be checked for deduplication and no repeated email in the controlled outage.

Maintainer can inspect provider incident history and a sanitized local status
command showing last check time/classification and delivery status. Neither
must represent a stale check as fresh healthy service. An independent hosted
heartbeat observer still alerts if the probe/API host or tailnet node is down.
Avoid making the API public just so an external service can reach it.

Mute alerts until an explicit timestamp via probe configuration, while keeping
results/heartbeats flowing. Use provider-managed timed notification suppression
if it supports auto-expiry; otherwise configure an independent hosted scheduled
resume before applying a mute. Never rely solely on the muted probe to unmute
itself if it dies. Verify auto-expiry as a rollout gate; do not ship indefinite
pause as maintenance. Already-delivered notifications cannot be revoked.

## Dependencies, secrets, API and schema

One native diagnostic SDK earns its cost by native crash capture and grouping;
no analytics SDK, custom crash backend or Sentry server dependency. No training
schema change or public telemetry intake endpoint. `/health` remains public
with its existing minimal payload. Existing API request logging must redact
authorization and remove explicit raw bodies in routine routes before exporting
any diagnostics; do not pipe console output wholesale into Sentry.

Sentry DSN is public routing configuration, never an admin token; upload token
and Healthchecks ping URLs remain runtime/build secrets in ignored env files.
Document names/shapes in examples only. Symbol files upload from local release
build or CI credentials, never committed. No secret in Docker layers/console.

## Verification mapping

| Criteria | Checks |
|---|---|
| AC-1, AC-6 | Same controlled error twice, release/operation grouping; inspect raw JS/native envelopes and scrub canary tokens/notes/measurements before upload. |
| AC-2–AC-4 | Fake clock/status fixtures for three failures/two successes, DB-vs-network, five-minute missed heartbeat; real observer outage/recovery including probe stopped. |
| AC-5 | SDK failure/offline queue limit/expiry, no recursive logging, workout save/rest/persistence unaffected. |
| AC-7 | Event-store policy proof, expired local/native envelopes, maintenance timed resumption even with probe stopped. |
| EF-1–EF-4 | Bounds, stale delivery, no corrupted training fixtures, old build and watch-native coverage clearly labelled. |

Unit tests use fake provider, clock, fetch and queue. Native crash, symbol maps,
actual notifications, retention settings and independent failure-domain tests
are operational/device tasks and cannot be marked passed by mocks.

## Files to touch

- `packages/domain/src/diagnostics.ts` and index (new contract, no SDK types).
- Mobile `package.json`, lockfile, app config, Metro/Babel config as required by the pinned SDK.
- New mobile infrastructure diagnostics adapter, sanitizer, bounded queue and tests.
- `apps/mobile/src/app/_layout.tsx` root initialization/error boundary; auth/save/record/watch error boundaries via injected Diagnostics.
- Native generated/config-plugin hooks only for demonstrated native scrub/expiry support; do not edit disposable generated files alone.
- API `app.ts` logger redaction, routine route body logging removal and tests.
- New `ops/monitoring/` probe/state machine/provider CLI, timer/service/env templates and tests.
- `docs/deployment.md`, env examples, monitoring runbook and roadmap/backlog.

## Risks and rollout

Mandatory gates: proven SDK support/redaction/expiry, provider 30-day retention,
actual private probe host, maintainer-owned projects, verified destination and
independent auto-expiring mute. If a provider cannot meet a gate, stop that
rollout and revise the adapter, not the accepted requirements. These concrete
configuration values/credentials are intentionally not invented in repository
text. No account provisioning, paid plan or external sending is authorized by
this planning commit alone.

Ship sanitized no-op-capable code first. Configure projects/observer separately,
then release-build/reinstall phone app for native crash support; old binaries
can use safe JS-only/no-op fallback. Test web separately. Enable only after
controlled failure/expiry/outage evidence; rollback disables DSN/probe alerts
without touching workout data and explicitly marks monitoring inactive.
