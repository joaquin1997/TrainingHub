---
id: 0052
title: App errors and service availability monitoring
status: planned
roadmap: docs/roadmap/09-production-readiness.md
created: 2026-11-03
---

# App errors and service availability monitoring

## Problem

An unavailable service or app failure can remain unnoticed until the owner
hits it during training. The production roadmap records a past database
outage that went unnoticed for a week. Existing service logs alone do not
provide an actionable view of failures on the installed app.

## Why now

The owner explicitly requested monitoring of app errors and server
availability. This supports diagnosing problems such as missing live records
without guessing their cause from a single screenshot.

## Users and scenarios

- **Broken service.** The maintainer learns that the deployed service or its
  data store is unavailable and receives a recovery notice.
- **App failure.** The maintainer can distinguish a crash in one app version
  from repeated failure to load records, without exposing workout contents.
- **Offline training.** Losing connectivity does not block training or
  produce a flood of misleading service-outage incidents.

## Scope

### In scope

- Crash/unhandled error reports for mobile and web, and unexpected errors in
  critical flows: sign-in, workout save, starting records and watch delivery.
- Availability checks for the deployed service and its ability to reach data.
- Maintainer-visible incidents, alert/recovery rules, release identification
  and bounded, redacted diagnostic context.

### Out of scope

- Product analytics, user profiling, workout/health metrics or session replay.
- A public status site, automatic remediation or a general infrastructure
  metrics platform.
- Monitoring consumer devices as always-online services.
- Selecting a vendor, paid subscription or external alert recipient in this
  spec; those belong to an explicit rollout configuration.

## Functional requirements

- **FR-1.** Unexpected app failures MUST be inspectable by app release,
  platform, occurrence time, failing operation and a diagnostic error trace
  where available. Repeated occurrences of the same failure MUST be grouped
  with counts and first/last seen times.
- **FR-2.** Failed workout saves, unavailable starting records and unsuccessful
  watch-event processing MUST be distinguishable operations. Expected offline
  states, user cancellations and invalid user input MUST NOT be reported as
  crashes or separately alert on every retry.
- **FR-3.** Availability MUST be checked at least once per minute from a
  location able to reach the deployed private service. The check MUST
  distinguish service reachability from inability to access its data.
- **FR-4.** Three consecutive failed checks MUST open one incident and alert
  the configured maintainer within five minutes of the first failed check.
  Continued failure MUST update that incident rather than alert every minute.
  Two consecutive successful checks MUST resolve it and issue one recovery notice.
- **FR-5.** The maintainer MUST see whether checks themselves are current.
  If no check result arrives for five minutes, the monitoring observer MUST
  mark monitoring unavailable and alert through an independent functioning
  route; silence MUST NOT be presented as healthy service.
- **FR-6.** Reports MUST exclude credentials, authorization data, personal
  notes, workout measurements, health data and full request/response bodies.
  A diagnostic correlation reference may link app and service failures
  without revealing a person's training or identity in alert text.
- **FR-7.** Collection, queuing and delivery MUST NOT prevent logging,
  resting, saving or recovering a workout. A reporting outage MUST NOT
  trigger recursive error reports or unbounded device storage.
- **FR-8.** Diagnostics MUST expire after 30 days, including pending device
  reports that have become too old. Detailed reports MUST be accessible only
  to the maintainer. User-data access protections MUST remain intact.
- **FR-9.** Planned maintenance MUST allow alerts to be muted until a named
  end time while results remain inspectable. Muting MUST expire automatically.

## Behaviour when things go wrong

- **EF-1.** With no connection, reports may wait in a bounded queue;
  when full, discard oldest diagnostics and retain training data untouched.
- **EF-2.** If monitoring delivery fails, training MUST continue and the
  maintainer view MUST NOT show stale observations as current health.
- **EF-3.** Before rollout, a controlled app error and a simulated service/
  data outage MUST demonstrate grouping, redaction, alert and recovery.
  These checks MUST NOT require corrupting personal training data.
- **EF-4.** Unsupported older builds remain usable; missing instrumentation
  MUST NOT be mistaken for evidence that they have no errors.

## Domain impact

No training concept changes. Operational failure reports and availability
incidents describe system behaviour, not performed work or personal records.

## Acceptance criteria

- **AC-1.** Given two occurrences of the same controlled app failure, then
  the maintainer sees one group with two occurrences, release and operation,
  with no secret or personal training value in report or alert.
- **AC-2.** Given three failed one-minute checks, then one incident and one
  initial alert exist within five minutes; continued failures add no initial
  alerts, and two successful checks produce one recovery notice.
- **AC-3.** Given the service reachable but unable to access data, then the
  incident identifies data unavailability instead of healthy service.
- **AC-4.** Given check results stop arriving, then after five minutes the
  observer reports monitoring unavailable rather than service healthy.
- **AC-5.** Given offline logging or a reporting outage, then set completion,
  rest and workout persistence remain usable; diagnostics stay bounded.
- **AC-6.** Given a failed records load and a failed workout save in the same
  release, then their operations are distinguishable without including weights,
  exercise names, notes, health data or authorization material.
- **AC-7.** Given diagnostics older than 30 days or expired maintenance mute,
  then reports expire and alerting resumes automatically, respectively.

## Non-functional requirements

- No public exposure of the private service solely for monitoring.
- App-version and native watch coverage must be stated in rollout acceptance;
  absence of native crash coverage must remain a visible limitation.
- Monitoring faults may lose diagnostics but must never lose training data.

## Assumptions

- Owner-confirmed initial thresholds: checks each minute, incident after
  three consecutive failures, recovery after two successes, and diagnostic
  retention of 30 days. One maintainer destination remains the initial
  private-use assumption.
- Owner-confirmed alerting scope: availability incidents alert automatically;
  individual app errors are grouped for inspection. Per-error push alerts
  wait for a later explicitly configured noise policy.

## Open decisions

Owner reviewed and accepted the behaviour and thresholds on 2026-11-03,
including app-error grouping, availability/recovery alerts, detection of stale
monitoring, privacy constraints and non-blocking reporting. No blocking product
decision. Vendor, cost, maintainer destination and independent observer
placement must be concrete in planning before any external rollout. No
monitoring has been installed or activated by this spec review.

## Related

- Roadmap 9: health alerts and crash reporting; builds on 0001.
- Supports investigation under 0045, 0047 and 0048.
- Constitution articles engaged: 1, 9, 10, 11.
