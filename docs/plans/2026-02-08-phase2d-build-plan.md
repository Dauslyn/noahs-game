# Phase 2d: Build Plan — Session Breakdown

**Date:** 2026-02-08
**Design:** `2026-02-08-phase2d-economy-design.md`

---

## Session 2d-1: Data Layer + GameState

**Goal:** All economy data exists and death penalty works. No UI yet.

### Tasks
1. Update `GameState` interface — add `unlockedWeapons`, `shipTier`, `shieldCharge`, `repairKit`
2. Update `createGameState()` — initialize defaults (laser unlocked, tier 1)
3. Update `applyDeathPenalty()` — clear consumables on death
4. Create `src/economy/shop-defs.ts` — ShopItem interface, all 5 items, pricing
5. Create `src/economy/shop-logic.ts` — `canBuy()`, `buyItem()`, `getAvailableItems()` pure functions
6. Verify: `npm run dev` still works, no regressions

### Deliverable
Economy data and logic ready for UI to consume. Game still plays exactly the same.

---

## Session 2d-2: Shop UI + Hub Integration

**Goal:** Shop panel visible on hub screen. Player can buy items.

### Tasks
1. Create `src/ui/shop-panel.ts` — renders shop item buttons, handles purchase clicks
2. Update `src/ui/hub-screen.ts` — import ShopPanel, add SHOP section, re-layout spacing
3. Wire up purchase flow: click item → `buyItem()` → refresh scrap display + item states
4. Show locked weapons in LOADOUT (lock icon, unselectable)
5. Show locked planets in DEPLOY ("REQUIRES SHIP TIER 2", grayed out)
6. Show active consumable icons near scrap counter
7. Verify: can buy items, scrap deducts, owned items gray out, locked items unselectable

### Deliverable
Full shop experience on hub screen. Economy is spendable.

---

## Session 2d-3: Consumable Effects + Polish

**Goal:** Shield Charge and Repair Kit work in gameplay. Everything polished.

### Tasks
1. Update `DamageSystem` — check `shieldCharge` before damage, absorb hit + effect
2. Update `DamageSystem` — check `repairKit` after damage, auto-heal at <25% HP + effect
3. Update `HudSystem` — show shield/medkit icons when consumables are active
4. Add sound effects for shield break and heal (reuse existing Kenney sounds)
5. Playtest full loop: buy consumables → deploy → take damage → consumables trigger → die → return to hub → consumables gone
6. Balance pass: adjust prices if needed based on playtesting
7. Commit and update MEMORY.md

### Deliverable
Phase 2d complete. Full roguelite economy loop working.

---

## Session Handoff Format

Each session ends with:
- All changes committed
- MEMORY.md updated with new files/patterns
- Handoff note for next session describing what's done and what's next
