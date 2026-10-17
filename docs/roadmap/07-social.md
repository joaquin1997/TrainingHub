# 7. Social (decide if in MVP)

Hevy's differentiator. **Decision (2026-05-31): OUT of scope for the MVP — post-MVP.**
Depends on auth (point 3); revisit after the app ships.

## Checklist
- [ ] User profiles
- [ ] Followers
- [ ] Feed (shared workouts)
- [ ] Likes / comments
- [x] Share a workout — as text through the share sheet (spec 0028; device
  check pending)

## Notes
- Depends on auth (point 3). Large surface; gate behind a product decision.

## Progress log
- (2026-10-16 → 2026-10-17) Spec 0028 — share a workout, the one item done
  ahead of the post-MVP decision since it needs no accounts talking to each
  other. A pure formatter (`formatWorkoutShareText`) builds the text — date,
  routine, duration, volume, each exercise with its done sets and set type,
  in the person's language and unit — and names the records beaten (0023).
  A Share button on the summary and the workout detail opens the phone's
  share sheet; cancelling does nothing. No rebuild; the sheet to Notes is a
  pending device check. An image card is a follow-up.
