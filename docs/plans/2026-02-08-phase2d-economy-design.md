# Phase 2d: Economy & NPCs — Design Document

**Date:** 2026-02-08
**Status:** Approved

---

## Overview

Add a functioning economy to the roguelite loop. Players spend scrap at a shop on the hub screen to unlock weapons permanently, buy per-run consumables, and upgrade their ship to access harder planets.

---

## GameState Changes

```typescript
interface GameState {
  scrap: number;
  equippedWeapon: WeaponId | null;

  // Permanent unlocks
  unlockedWeapons: Set<WeaponId>;  // starts with ['laser']
  shipTier: number;                 // starts at 1

  // Per-run consumables (lost on death)
  shieldCharge: boolean;
  repairKit: boolean;
}
```

**On death:** equippedWeapon cleared, shieldCharge + repairKit cleared, 50% scrap lost. Unlocked weapons and shipTier never lost.

**On game start:** unlockedWeapons = {'laser'}, shipTier = 1, everything else zero/null/false.

---

## Shop Items

| Item | ID | Cost | Category | Repeatable |
|---|---|---|---|---|
| Rocket Launcher | unlock-rockets | 150 | weapon-unlock | No |
| Plasma Repeater | unlock-plasma | 120 | weapon-unlock | No |
| Shield Charge | shield-charge | 40 | consumable | Yes (per run) |
| Repair Kit | repair-kit | 50 | consumable | Yes (per run) |
| Ship Tier 2 | ship-tier-2 | 300 | ship-upgrade | No |

**Purchase rules:**
- Can't buy permanent items you already own (grayed out, "OWNED" label)
- Can't buy consumables you already have equipped for this run
- Can't buy if insufficient scrap
- Buying deducts scrap immediately

---

## Hub Screen Layout

```
NOAH'S GAME
SCRAP: 240

── SHOP ──
[Shield Charge 40] [Repair Kit 50] [Rockets 150] [Plasma 120] [Ship Tier 2 300]

── LOADOUT ──
[Laser]  [Rockets 🔒]  [Plasma 🔒]

── DEPLOY ──
[Zeta Station - Easy]
[Crystal Caverns - Medium 🔒]
[Neon Outpost - Hard 🔒]
```

- Shop items: bright border if affordable, dimmed if too expensive
- Permanent items show "OWNED" once purchased
- Locked weapons show lock icon, unselectable until purchased
- Locked planets show "REQUIRES SHIP TIER 2"
- Active consumables shown as icons near scrap counter

Shop section extracted to `shop-panel.ts` (hub-screen.ts would exceed 250 lines otherwise).

---

## Gameplay Integration

### Shield Charge
- Small shield icon on HUD when active
- DamageSystem checks `gameState.shieldCharge` before applying damage
- If true: absorb hit (0 damage), set false, play shield-break sound, blue flash effect
- If false: normal damage

### Repair Kit
- Small medkit icon on HUD when active
- After DamageSystem applies damage: if player HP < 25% and repairKit is true
- Auto-triggers: heal to full, set false, play heal sound, green flash effect
- Can save you from a killing blow (damage applies, then heal triggers)

### Level Gating
- Ship Tier 1: only Zeta Station (Easy)
- Ship Tier 2: all three levels unlocked
- Locked levels visible but grayed out with "REQUIRES SHIP TIER 2"

### Death Penalty (updated)
- Lose equipped weapon (existing)
- Lose 50% scrap (existing)
- Lose shield charge and repair kit (NEW)
- Keep weapon unlocks, ship tier (permanent)

---

## Economy Balance

- Zeta Station: 4 enemies x ~10 scrap = ~40 scrap/run
- Unlock a weapon: 3-4 successful runs
- Ship Tier 2: ~8 successful runs
- Consumable: 1 run's earnings
- Death penalty (50% scrap) keeps pressure on

These are starting values — tune after playtesting.

---

## Build Phases

See `2026-02-08-phase2d-build-plan.md` for the session-by-session implementation plan.
