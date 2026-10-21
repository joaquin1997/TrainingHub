---
id: 0027
title: Personal profile and body measurements
status: done
decided: 2026-10-16
roadmap: docs/roadmap/03-auth-and-users.md
created: 2026-10-16
---

# Personal profile and body measurements

> **No technology in this file.** See `../README.md`.

## Problem

The owner asked for a personal data section — weight, height, photo, bio — and
for tracking the body over time: weigh-ins, chest, waist, body-fat %, muscle %,
and a BMI computed from weight and height (2026-10-16). Today an account has
an email and a display name that cannot be seen or changed in the app, and
nothing about the body is recorded.

## Why now

Training progress is only half the picture without the body's. Body weight is
also the missing input for bodyweight exercises (dips, pull-ups are logged as
"+15 kg" with no total) and for future calorie estimates.

## Users and scenarios

- **Weekly weigh-in.** Someone records 82.4 kg every Monday morning and sees
  the trend over three months.
- **Monthly check.** Once a month someone also records waist, chest, arm and
  the body-fat % and muscle % their scale shows, and compares with last month.
- **Rough BMI.** Someone sees their BMI next to their weight, knowing it is a
  rough indicator.
- **Profile.** Someone sets a photo, name and short bio.

## Scope

### In scope
- A profile: photo, display name, bio, height.
- **Measurements over time.** Each entry has a date and any subset of:
  body weight, body-fat %, muscle %, and circumferences — neck, chest, waist,
  hips, arm, forearm, thigh, calf.
- A history per measurement with its trend (chart and change since the
  previous and the first entry).
- **Derived figures**, computed from the latest values, never typed: BMI
  (weight / height²) and waist-to-height ratio.

### Out of scope
- Public profiles, followers — roadmap area 7.
- Progress photos (body pictures per date) — follow-up; they reuse the photo
  storage decided here.
- Left and right circumferences separately — one value per measurement.
- Importing weigh-ins from Apple Health or a smart scale — follow-up
  (roadmap area 8).
- Using body weight in volume or calories — follow-up once it exists.
- Goals (target weight) — follow-up.

## Functional requirements

- **FR-1.** The person MUST be able to see and edit display name, bio, height
  and photo (set and remove).
- **FR-2.** The person MUST be able to add a measurement entry for a date
  (today by default) with any subset of the measurements in scope, and edit or
  delete an entry.
- **FR-3.** Each measurement MUST have a history listing its entries and a
  trend chart, showing the change since the previous entry and since the
  first.
- **FR-4.** The profile MUST show the latest value of each measurement that
  has one, with its date.
- **FR-5.** BMI MUST be computed from the latest body weight and the height,
  shown with one decimal and labelled as a rough indicator; it MUST NOT be
  shown without both values.
- **FR-6.** Waist-to-height ratio MUST be computed from the latest waist and
  the height, under the same rules as FR-5.
- **FR-7.** Body weight MUST be stored in kg and lengths in cm; shown in the
  display unit (kg/cm, or lb/in when the unit is lb). Percentages are shown
  as entered.
- **FR-8.** The profile and measurements MUST be private to their owner.

## Behaviour when things go wrong

- **EF-1.** An oversized photo is reduced before upload, not rejected.
- **EF-2.** Values outside plausible ranges (e.g. 0 kg, 4 m, 80 % body fat,
  a 300 cm waist) are rejected with a clear message.
- **EF-3.** Two entries on the same date are allowed (morning and evening);
  the chart uses each entry, the "latest" is the most recent by date and time.
- **EF-4.** A measurement with a single entry shows its value without a chart
  or a change.

## Domain impact

**User** gains profile fields (photo, bio, height). New concept **measurement
entry**: a dated record of body measurements, owned by the user; derived
figures (BMI, waist-to-height) are never stored. It is neither a template
nor a workout (Article 2 unaffected). Body weight is canonical kg, lengths
canonical cm (Article 4 extended to lengths). Migration.

## Acceptance criteria

- **AC-1.** Given height 180 cm and a weigh-in of 82.4 kg, when the profile is
  opened, then BMI shows 25.4 with a "rough indicator" note; switching the unit
  to lb shows 181.7 lb and 5 ft 11 in, and the same BMI.
- **AC-2.** Given weigh-ins of 84.0, 83.1 and 82.4 kg over three weeks, when the
  weight history is opened, then the chart shows the three points, −0.7 kg
  since the previous and −1.6 kg since the first.
- **AC-3.** Given an entry with only waist 88 cm and body-fat 18 %, when it is
  saved, then weight history is unchanged, waist-to-height shows 0.49 and
  body-fat shows 18 %.
- **AC-4.** Given no height, then neither BMI nor waist-to-height is shown.
- **AC-5.** Given a photo, when it is set, then it shows in the profile after
  restarting the app.

## Assumptions

- **[ASSUMPTION: the profile is reached from Settings (account card), not a
  sixth tab.]**
- **[ASSUMPTION: photos are stored on the home server (same decision as 0026).]**
- **[ASSUMPTION: body-fat % and muscle % are entered as read from a scale or
  other method; the app does not estimate them.]**
- **[ASSUMPTION: BMI is shown with the standard WHO band name (e.g.
  "overweight") next to the "rough indicator" note.]**

## Open decisions

None. Decided by the owner 2026-10-16: **body weight is a history of
weigh-ins**, extended to other body measurements (chest, waist, body-fat %,
muscle %, …) with BMI computed from weight and height.

## Related

- 0009 (accounts), 0001 (auth hardening, `/auth/me`), 0026 (photo storage).
- Constitution articles engaged: 2, 3, 4, 5, 7.
