---
id: 0027
title: Personal profile
status: draft
roadmap: docs/roadmap/03-auth-and-users.md
created: 2026-10-16
---

# Personal profile

> **No technology in this file.** See `../README.md`.

## Problem

The owner asked for a personal data section: weight, height, photo, bio
(2026-10-16). Today an account has an email and a display name that cannot be
seen or changed in the app.

## Why now

Body weight is also the missing input for bodyweight exercises (dips, pull-ups
are logged as "+15 kg" with no total) and for future calorie estimates.

## Users and scenarios

- **Weigh-in.** Someone records 82.4 kg on Monday mornings and sees the trend.
- **Profile.** Someone sets a photo, name and short bio.

## Scope

### In scope
- A profile screen: photo, display name, bio, height, body weight.
- Body weight in the display unit (Article 4).

### Out of scope
- Public profiles, followers — roadmap area 7.
- Body measurements beyond height and weight (waist, body fat…) — follow-up.
- Using body weight in volume or calories — follow-up once it exists.

## Functional requirements

- **FR-1.** The person MUST be able to see and edit display name, bio, height
  and body weight.
- **FR-2.** The person MUST be able to set and remove a profile photo.
- **FR-3.** Body weight MUST be stored in kg and shown in the display unit;
  height in cm (ft/in when the unit is lb).
- **FR-4.** The profile MUST be private to its owner.

## Behaviour when things go wrong

- **EF-1.** An oversized photo is reduced before upload, not rejected.
- **EF-2.** Values outside plausible ranges (e.g. 0 kg, 4 m) are rejected with
  a clear message.

## Domain impact

**User** gains profile fields. Possibly a new **body weight entry** concept
(open decision). Migration.

## Acceptance criteria

- **AC-1.** Given the profile, when 180 cm and 82.4 kg are saved and the unit
  is switched to lb, then 181.7 lb and 5 ft 11 in are shown.
- **AC-2.** Given a photo, when it is set, then it shows in Settings/profile
  after restarting the app.

## Assumptions

- **[ASSUMPTION: the profile is reached from Settings (account card), not a
  sixth tab.]**
- **[ASSUMPTION: photos are stored on the home server (same decision as 0026).]**

## Open decisions

- **[NEEDS DECISION: is body weight a single current value, or a history of
  weigh-ins with a trend chart?]** A history is more useful but turns this
  into a progress feature.

## Related

- 0009 (accounts), 0001 (auth hardening, `/auth/me`), 0026 (photo storage).
- Constitution articles engaged: 3, 4, 5, 7.
