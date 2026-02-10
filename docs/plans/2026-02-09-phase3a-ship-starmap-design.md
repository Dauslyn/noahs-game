# Phase 3a: Ship Interior + Star Map — Design

**Date:** 2026-02-09
**Status:** Approved
**Scope:** Replace menu hub with walkable ship interior + visual star map

---

## Overview

Replace the current menu-based hub screen with two new scenes:
1. **Ship Interior** — A single walkable room with interactive stations
2. **Star Map** — A top-down visual node graph of star systems

Goal: Make the game feel like a real space exploration experience.

---

## Game Flow (New)

```
Death/Victory → Ship Interior → [walk to station OR hotkey]
  ├── Cockpit (C/M) → Star Map → Pick planet → Warp → Level
  ├── Workbench (L) → Weapon Loadout overlay
  └── Terminal (S) → Shop overlay
```

What stays the same:
- Weapon loadout UI, shop UI, planet tier gating logic
- All combat/level/enemy systems
- GameState, economy, death penalty

What changes:
- Hub screen (menu) → Ship interior (walkable scene)
- Planet panel (menu buttons) → Star map (visual node graph)
- Scene transitions get a warp animation

---

## Ship Interior

**Scene:** Single horizontal room, ~800x400px visible area, no scrolling.

**Layout (left to right):**
- **Workbench** (left) — Table/rack with weapon silhouettes. Press E or L hotkey → loadout overlay
- **Shop Terminal** (center-left) — Glowing screen/kiosk. Press E or S hotkey → shop overlay
- **Cockpit** (right) — Large viewport showing stars. Press E or C/M hotkey → star map scene

**Player in ship:**
- Same player sprite, run/jump controls
- Flat floor, simple room bounds (basic AABB, no Rapier needed)
- No enemies, no combat, no hazards
- Station labels float above each spot ("COCKPIT", "LOADOUT", "SHOP")

**Visual style:**
- Dark metallic walls/floor (procedural rectangles with panel lines)
- Colored accent lighting per station (blue=cockpit, orange=workbench, green=terminal)
- Viewport window at cockpit showing slow starfield
- Minimal but atmospheric

**Interaction:**
- Near station → "Press E" prompt appears
- Existing UI panels render as overlays on ship scene
- ESC closes any open panel → return to walking
- Hotkeys (M/C/L/S) work from anywhere in ship

---

## Star Map

**Scene:** Top-down view of star systems connected by travel lanes.

**Layout:**
- Dark space background with subtle procedural nebula
- 3-5 star nodes as glowing dots, connected by faint lines
- Ship location highlighted with pulsing indicator
- Stars color-coded by difficulty (white=easy, yellow=medium, red=hard)

**Star systems (maps to existing levels):**
| Star System | Planet | Tier | Difficulty |
|---|---|---|---|
| Sol Station | Zeta Station | 1 | Easy |
| Crystallis | Crystal Caverns | 2 | Medium |
| Neon Prime | Neon Outpost | 2 | Hard (Boss) |

**Interaction:**
- Arrow keys or mouse to move cursor between stars
- Enter/click → select star → show planet info panel on side
- Planet info: name, difficulty, biome, tier requirement, best scrap
- If tier met → "Press ENTER to deploy" → warp animation → level
- If tier too low → greyed out, "Requires Ship Tier X"
- ESC → return to ship interior

**Visuals:**
- Stars gently pulse/twinkle
- Connection lines show travel routes
- Selected star enlarges with ring highlight
- Locked stars dimmer with lock icon

**Future-proofing:**
- Star positions in data (easy to add more)
- Each star can hold multiple planets (1 each for now)
- Zone boundaries as faint rings when we add more systems

---

## Warp Transition

- Brief star-stretch effect: lines radiate from center (1-2 seconds)
- Fade to black → load level as normal
- Plays on deploy from star map

---

## Implementation Approach

Build order:
1. Extract scene routing from game.ts → scene-router.ts
2. Ship interior scene (room, stations, player movement, interaction)
3. Star map scene (nodes, connections, selection, planet info)
4. Warp transition effect
5. Flow wiring (death/victory → ship, cockpit → star map, deploy → warp → level)
6. Hotkey shortcuts
7. Remove old hub screen entry point

**Key constraints:**
- game.ts at 249/250 lines — must extract scene routing first
- Ship uses basic AABB collision, NOT Rapier (overkill for flat room)
- Star map is pure UI — no physics, no ECS
- Each scene self-contained, cleans up after itself

**New files (~7-8):**
- `src/core/scene-router.ts` — Scene transition logic
- `src/scenes/ship-interior.ts` — Ship scene
- `src/scenes/star-map.ts` — Star map scene
- `src/scenes/star-map-data.ts` — Star system definitions
- `src/scenes/warp-transition.ts` — Warp effect
- `src/ui/interact-prompt.ts` — "Press E" prompt
- `src/ui/planet-info-panel.ts` — Star map planet sidebar

**Estimated scope:** ~1200-1500 lines new code across 7-8 files. No changes to combat, enemies, or level systems.
