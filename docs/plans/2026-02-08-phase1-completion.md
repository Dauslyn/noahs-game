# Phase 1: Playable Prototype - Completion Report

**Date:** 2026-02-08
**Status:** Complete

---

## What Was Built

A fully playable 2D sci-fi platformer prototype with 47 TypeScript source files across 12 commits.

### Systems Implemented (13 total, by priority order)

| Priority | System | Description |
|----------|--------|-------------|
| -10 | StarfieldSystem | 3-layer parallax starfield with simplex noise |
| 0 | PhysicsSystem | Rapier2D fixed timestep (1/60s), body↔transform sync |
| 15 | EnemyAISystem | Walker patrol/chase, flyer hover/chase, turret targeting |
| 16 | PlayerMovementSystem | Run, jump, wall-jump, wall-slide, ground/wall raycasts |
| 20 | MechFollowSystem | Orbit when idle, trail when moving, smooth lerp |
| 30 | WeaponSystem | Auto-fire at nearest enemy in range, cooldown |
| 35 | ProjectileSystem | Lifetime countdown, intersection detection, damage |
| 40 | DamageSystem | Contact damage, invincibility frames, knockback |
| 50 | DeathRespawnSystem | Death freeze → 2s timer → respawn with full health |
| 90 | CameraSystem | Lerp follow, dead zone, level bounds clamping |
| 95 | EffectsSystem | GlowFilter on mech/projectiles, BloomFilter, damage flash |
| 98 | HudSystem | Health bar (green→yellow→red) with numeric display |
| 100 | RenderSystem | Transform→displayObject position sync |

### Entity Factories (7 total)

| Entity | File | Visual |
|--------|------|--------|
| Player | create-player.ts | Armoured character with helmet, visor, boots |
| Mech | create-mech.ts | Layered diamond drone with wing accents |
| Walker Enemy | create-walker.ts | Alien trooper with glowing red eyes |
| Flyer Enemy | create-flyer.ts | Alien drone with angular carapace |
| Turret Enemy | create-turret.ts | Gun emplacement with dual barrels |
| Projectile | create-projectile.ts | Layered laser bolt with glow trail |
| Platforms | level-builder.ts | Metallic panels with rivets and panel lines |

### Core Infrastructure

- **ECS World** - Map-of-Maps component storage, priority-sorted systems
- **PhysicsContext** - Rapier2D WASM wrapper with coordinate conversion helpers
- **EntityManager** - Deferred entity destruction to prevent mid-iteration issues
- **InputManager** - keysDown / keysJustPressed / keysJustReleased pattern
- **SoundManager** - Howler.js wrapper with graceful fallback for missing files
- **HealthBar** - PixiJS Graphics-based UI element in fixed screen space

### File Manifest (47 source files)

```
src/main.ts, style.css
src/core/          types, constants, world, game, physics, collision-utils, entity-manager, debug
src/components/    transform, velocity, sprite, physics-body, player, mech, health, weapon, enemy, projectile, index
src/systems/       physics, render, player-movement, camera, mech-follow, weapon, projectile, enemy-ai, enemy-ai-behaviours, damage, death-respawn, starfield, effects, hud
src/entities/      create-player, create-mech, create-enemy (barrel), create-walker, create-flyer, create-turret, create-projectile
src/input/         input-manager, actions
src/level/         level-data, level-builder, ldtk-loader (stub)
src/audio/         sound-manager
src/ui/            health-bar
```

---

## Known Issues / Deferred Items

1. **Sound files not generated** — SoundManager is wired up but `assets/sounds/*.wav` files don't exist yet. User needs to generate them via sfxr.me.
2. **LDtk integration deferred** — Using a hardcoded `PROTOTYPE_LEVEL` in level-data.ts instead. ldtk-loader.ts is a stub.
3. **No sprite assets** — All visuals are procedural PixiJS Graphics. Good enough for prototype, real sprites planned for Phase 2.
4. **No gamepad support** — Keyboard only for now.
5. **No save system** — Fresh start each page load.
6. **Enemy AI is basic** — Walkers patrol/chase, flyers hover/chase, turrets shoot. No complex behavior trees.

---

## Bugs Fixed During Development

- **Jump not working** — `inputManager.update()` was called before systems loop, clearing `keysJustPressed` before `PlayerMovementSystem` could read it. Fixed by moving the call to after the loop.

---

## Architecture Decisions Worth Noting

- **No velocity component used** — Player movement sets Rapier body linvel directly for snappy control
- **Capsule collider for player** — Prevents catching on tile edges
- **Sensor colliders for projectiles** — Overlap detection without physical push
- **Deferred entity destruction** — EntityManager queues removals, processes at frame start
- **inputManager.update() ordering** — MUST be called AFTER systems loop, not before
