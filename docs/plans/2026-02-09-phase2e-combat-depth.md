# Phase 2e: Combat Depth — Design Document

**Date:** 2026-02-09
**Status:** Approved

---

## Scope

Two pillars (utility mode deferred — player already has triple jump + infinite wall jump):

1. **3 new biome-specific enemies** (one per planet)
2. **1 phase boss** at the end of Neon Outpost ("The Warden")

---

## New Enemies

### Sentry Drone (Zeta Station)

- **Behaviour:** Orbits a fixed point. Periodically winds up, then burst-dashes toward the player. Returns to orbit after the dash.
- **Feel:** Teaches timing — dodge the dash, punish during orbit.
- **Stats:** Low HP (15), moderate contact damage (15), detection range 250px.
- **Scrap reward:** 7

### Crawler (Crystal Caverns)

- **Behaviour:** Clings to the ceiling. When the player passes below, drops down. After landing, scurries toward the player briefly, then leaps back to the ceiling.
- **Feel:** Punishes inattention in vertical shafts — forces you to look up while wall-jumping.
- **Stats:** Medium HP (25), high contact damage (20), detection range 150px (directly below only).
- **Scrap reward:** 9

### Shielder (Neon Outpost)

- **Behaviour:** Ground enemy with a front-facing energy shield that blocks projectiles from one direction. Lowers shield briefly during its attack wind-up (a short charge). Player must flank or time shots during the wind-up window.
- **Feel:** Teaches positioning in tight corridors — get behind it or be patient.
- **Stats:** High HP (40), low contact damage (10), detection range 200px. Shield blocks all projectile damage from the front.
- **Scrap reward:** 12

---

## Boss: The Warden (Neon Outpost)

A large cyberpunk mech (~3x player size) that guards the end of Neon Outpost.

### Arena

- Flat wide platform (~800px) at the far right end of Neon Outpost.
- Two small elevated platforms for dodging.
- Boss spawns when player crosses an X-threshold trigger. Normal enemies must be cleared first to reach it.

### Phase 1 — Charge (100%–60% HP)

- Patrols back and forth across arena.
- Periodically winds up (brief pause + visual flash), then charges across at high speed.
- Vulnerable to shots between charges.
- Simple pattern to learn.

### Phase 2 — Charge + Lasers (60%–25% HP)

- Same charge attack.
- Between charges, fires a horizontal laser sweep (slow projectile spanning arena height).
- Player must jump over the laser while watching for the next charge.
- Two things to track instead of one.

### Phase 3 — Enrage (25%–0% HP)

- Charges faster, lasers more frequent.
- Spawns one walker minion every 10 seconds.
- Arena gets hectic — kill the boss before getting overwhelmed.

### Boss Stats

- **HP:** 300
- **Contact damage:** 25
- **Charge speed:** 2x walker chase speed
- **Scrap reward:** 200

### Boss Health Bar

- Second `HealthBar` instance pinned to bottom-centre of screen.
- Only visible during the boss fight.
- Shows boss name "THE WARDEN" above the bar.

---

## Architecture

### New Enemy Types

- Extend `EnemyType` union: add `'sentry' | 'crawler' | 'shielder'`
- New behaviour functions in `src/systems/enemy-ai-behaviours-2.ts` (original file is ~227 lines)
- New factory files: `create-sentry.ts`, `create-crawler.ts`, `create-shielder.ts`
- New cases in `EnemyAISystem` switch statement
- New spawn point types in level definitions

### Boss

- New `BossComponent` (phase, HP thresholds, attack state, timers)
- New `src/systems/boss-ai-behaviours.ts` for phase logic
- Handled via `case 'boss-warden'` in `EnemyAISystem`
- Arena trigger: spawn boss when player crosses X threshold in Neon Outpost
- Boss health bar: separate HUD element, visible only during fight

### Shielder Shield Mechanic

- `EnemyComponent` gets optional `shieldDirection` field (-1 or 1)
- `ProjectileSystem` checks if enemy has a shield facing the projectile direction — if so, destroy projectile but deal no damage
- Shield drops during wind-up attack state

---

## Session Breakdown

### Session 2e-1: Sentry Drone + Crawler

1. Extend `EnemyType` union
2. Implement `updateSentry` behaviour (orbit + dash)
3. Create `create-sentry.ts` factory
4. Implement `updateCrawler` behaviour (ceiling cling + drop + scurry)
5. Create `create-crawler.ts` factory
6. Wire into `EnemyAISystem` switch
7. Add spawn points to Zeta Station and Crystal Caverns
8. Update scrap rewards in `DamageSystem`
9. Verify + commit

### Session 2e-2: Shielder

1. Add `shieldDirection` to `EnemyComponent`
2. Implement `updateShielder` behaviour (patrol + shield + charge wind-up)
3. Create `create-shielder.ts` factory
4. Update `ProjectileSystem` to check shield direction before applying damage
5. Add shield visual (procedural glow rectangle on front side)
6. Add spawn points to Neon Outpost
7. Verify + commit

### Session 2e-3: Boss Warden (Phases 1–2)

1. Create `BossComponent` with phase tracking and attack state machine
2. Implement Phase 1 AI (charge pattern)
3. Implement Phase 2 AI (charge + laser sweep)
4. Create `create-boss-warden.ts` factory
5. Add boss arena platforms to Neon Outpost level data
6. Add X-threshold trigger to spawn boss
7. Add boss health bar to HUD
8. Verify + commit

### Session 2e-4: Boss Phase 3 + Polish

1. Implement Phase 3 AI (enrage + minion spawns)
2. Add boss-specific sound effects (charge wind-up, laser, phase transition)
3. Add 200-scrap reward on boss kill
4. Boss death visual effect (explosion + float text)
5. Balance pass on all new enemy stats
6. Full playtest of all 3 levels
7. Commit + update MEMORY.md
