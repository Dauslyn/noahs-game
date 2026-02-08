# Phase 2 Restructure — Bite-Sized Sub-Phases

**Date:** 2026-02-08
**Status:** Approved

---

## Why Restructure

Phase 2 as originally written (9 major features) is too large for a single session. We're breaking it into sub-phases where each one:
- Fits in one coding session
- Leaves the game playable and visibly improved
- Has a clean handoff to the next session

---

## Revised Phase Breakdown

### Phase 2a: Visual & Audio Upgrade
- Integrate free 32x32 sprite asset packs (player, mech, enemies, tileset)
- Add parallax planet backgrounds
- Add free sound effects pack
- **Result:** Same game, looks and sounds 10x better

### Phase 2b: Multiple Planets
- Simple scene/state manager (menu → planet → death → planet)
- 2-3 planet levels with different tilesets/biomes
- Planet selection screen (precursor to ship view)
- **Result:** Player can choose where to go, worlds feel different

### Phase 2c: Loadout & Inventory
- Mech loadout screen (equip/swap weapons before deploying)
- Basic inventory (collect resources on planets)
- Death loop (die → return to selection → re-equip → retry)
- **Result:** Core roguelite loop works

### Phase 2d: Economy & NPCs
- One friendly planet with a shop/trader NPC
- Buy/sell weapons and items
- Ship upgrade tier 1 → 2 (unlocks harder planet)
- **Result:** Progression feels real

### Phase 2e: Combat Depth
- More enemy variety per biome
- One boss fight
- Mech utility mode (grapple or drill)
- **Result:** Combat is varied and exciting

---

## Design Decisions

- **Art style:** 32x32 pixel art, free packs from itch.io for now, upgrade to custom art later
- **Player character:** Armored space explorer / space marine vibe
- **Mech companion:** Small expressive robot/drone — a trusted companion, not just a weapon platform. Will have personality and dialogue in later phases.
- **Sound effects:** Free sci-fi sound pack, swap individual sounds later as needed
