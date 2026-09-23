---
id: 0008
title: "Retro: settings and language"
status: retro
roadmap: docs/roadmap/08-integrations-and-platform.md
created: 2026-09-23
---

# Retro: settings and language

> **Retro-spec.** Records what exists so a future change has something to build
> on. Small area, but it carries the project's most easily broken invariant.

## What settings are

Per-user preferences, persisted server-side so they follow the account rather
than the device: display unit, default rest time, and language.

## Behaviour today

- **Display unit (`kg`/`lb`).** Applied across logging, history and progress.
- **Default rest time.**
- **Language (ES/EN).** Persisted per user; the app falls back to the device
  locale when nothing is saved. Every screen, navigation title and shared
  component reads from the translation catalogs rather than hardcoded strings,
  and the catalogs are type-checked against a shared shape so a missing key is
  a build error, not a blank label.
- Settings reload when the acting user changes.

## Invariants worth protecting

- **The display unit is a *presentation* preference and nothing else**
  (Article 4). Storage is always kilograms; conversion happens at the edges via
  the weight helpers. Persisting a pound value anywhere silently corrupts every
  aggregate that reads it, undetectably after the fact.
- **The active workout freezes its unit at session start** — it does not read
  the current setting mid-session.
- **Translation catalogs are type-checked.** Adding a string means adding it to
  both catalogs; that is the point.
- **Preferences belong to the account, not the device.** Anything new added here
  should follow that, or the reason not to should be written down.

## Known gaps

Roadmap area 8 lists theme and onboarding as unbuilt settings, alongside the
larger platform items (offline sync, health integrations, Apple Watch, push
notifications, data export) which are not settings work at all.

`TODO(sdd): area 8 mixes two unrelated things — small user preferences and`
`large platform integrations. Worth splitting the roadmap file when the first`
`of either gets specified, because they share nothing but a heading.`

## Related

- Glossary: settings, display unit
- Constitution articles engaged: 3, 4
