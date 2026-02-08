# Phase 1: Playable Prototype - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a playable 2D sci-fi platformer prototype with player movement, mech companion, combat, enemies, death/respawn, visual effects, and audio.

**Architecture:** ECS pattern with numeric entity IDs, plain data components (discriminated unions), and system classes with prioritized `update(world, dt)`. PixiJS v8 for rendering, Rapier2D for physics (fixed timestep), Howler.js for audio.

**Tech Stack:** Vite 7.3.x, TypeScript 5.9 (strict), PixiJS 8.16.0, @dimforge/rapier2d-compat 0.19.3, Howler.js 2.2.4, pixi-filters 6.x, simplex-noise 4.0.3

---

## Task 1: Project Scaffolding

**Files to create:**
- `package.json` - project config with all dependencies
- `tsconfig.json` - strict TypeScript config
- `vite.config.ts` - Vite config (exclude rapier2d-compat from optimizeDeps)
- `index.html` - HTML shell with `#game-container` div
- `src/main.ts` - async bootstrap: init PixiJS app, append canvas
- `src/style.css` - body margin:0, overflow:hidden, bg black

**Dependencies:** `pixi.js@^8.16.0`, `@dimforge/rapier2d-compat@^0.19.3`, `howler@^2.2.4`, `pixi-filters@^6.0.0`, `simplex-noise@^4.0.3`, devDeps: `typescript@^5.9.0`, `@types/howler@^2.2.11`, `vite@^7.3.0`

**Key patterns:**
- PixiJS v8: `const app = new Application(); await app.init({...}); document.body.appendChild(app.canvas);`
- Wrap in async IIFE, NOT top-level await (Vite production build issue)

**Create directories:** `src/{core,components,systems,entities,input,level,audio,ui}`, `assets/{sprites,tiles,sounds,levels}`

**Verify:** `npm install && npm run dev` shows dark blue canvas at localhost:5173

**Commit:** `feat: project scaffolding with Vite + TypeScript + PixiJS`

---

## Task 2: Core ECS Engine

**Files to create:**
- `src/core/types.ts` - Entity (number), Component interface, System interface, Vector2, ComponentType union
- `src/core/constants.ts` - all game constants (PIXELS_PER_METER=50, GRAVITY=9.81, speeds, damage values, etc.)
- `src/core/world.ts` - World class: createEntity, addComponent, getComponent, removeComponent, removeEntity, query(...types)
- `src/components/transform.ts` - TransformComponent (x, y, rotation, scaleX, scaleY)
- `src/components/velocity.ts` - VelocityComponent (vx, vy)
- `src/components/sprite.ts` - SpriteComponent (displayObject: Container, width, height)
- `src/components/physics-body.ts` - PhysicsBodyComponent (bodyHandle, bodyType)
- `src/components/player.ts` - PlayerComponent (isGrounded, wallDirection, jumpCount, facingDirection, state)
- `src/components/mech.ts` - MechComponent (ownerEntity, mode, orbitAngle, orbitRadius, orbitSpeed)
- `src/components/health.ts` - HealthComponent (current, max, invincibleTimer, isDead)
- `src/components/weapon.ts` - WeaponComponent (damage, fireRate, cooldownTimer, range, projectileSpeed)
- `src/components/enemy.ts` - EnemyComponent (enemyType, patrolDirection, contactDamage, detectionRange, state)
- `src/components/projectile.ts` - ProjectileComponent (damage, ownerEntity, lifetime, speed)
- `src/components/index.ts` - barrel file + ComponentMap type for type-safe queries

**Key design:**
- Components stored as `Map<ComponentType, Map<Entity, Component>>` (keyed by type, then entity)
- `query()` iterates smallest map, checks presence in others
- ComponentMap maps string literal types to concrete interfaces for type-safe getComponent

**Verify:** Temporary test in main.ts: create World, add entities with components, query, log results. Remove after confirming.

**Commit:** `feat: ECS core - World, components, types`

---

## Task 3: Physics Integration

**Files to create:**
- `src/core/physics.ts` - PhysicsContext class + coordinate conversion helpers
- `src/core/collision-utils.ts` - colliderToEntity map, entity lookup from collider handle
- `src/systems/physics-system.ts` - PhysicsSystem (priority 0)

**PhysicsContext:**
- `static async create()`: calls `await RAPIER.init()`, creates world with gravity {x:0, y:9.81}
- `colliderToEntity: Map<number, Entity>` for collision lookups
- `accumulator: number` for fixed timestep
- Helper functions: `pixelsToMeters()`, `metersToPixels()`, `toPhysicsPos()`, `toScreenPos()`

**PhysicsSystem (priority 0):**
1. Accumulate dt, step physics in fixed increments (1/60s)
2. Sync Rapier body positions -> TransformComponent for all entities with ['transform', 'physics-body']

**Key gotcha:** Rapier Y-down matches screen coords. PIXELS_PER_METER=50.

**Verify:** Temporary: create dynamic body at top of screen, it falls under gravity (visible once render system exists).

**Commit:** `feat: Rapier2D physics integration with fixed timestep`

---

## Task 4: Rendering + Input + Camera

**Files to create:**
- `src/systems/render-system.ts` - RenderSystem (priority 100): syncs TransformComponent -> displayObject position
- `src/input/input-manager.ts` - InputManager: keysDown, keysJustPressed, keysJustReleased sets
- `src/input/actions.ts` - Action enum (MoveLeft, MoveRight, Jump, Down) + key bindings + helper functions
- `src/systems/camera-system.ts` - CameraSystem (priority 90): lerp follow player, dead zone, level bounds clamping
- `src/core/debug.ts` - DebugRenderer: draw Rapier collider outlines (toggle with F1)

**Stage hierarchy:** `app.stage` -> starfieldContainer (z-index 0), worldContainer (z-index 1), uiContainer (z-index 2). Camera moves worldContainer, UI stays fixed.

**Verify:** Colored rectangle entities appear on screen. Input logged to console. Camera placeholder ready.

**Commit:** `feat: rendering, input, and camera systems`

---

## Task 5: Player Character

**Files to create:**
- `src/entities/create-player.ts` - factory: dynamic body, capsule collider (lockRotations, friction 0), blue rectangle placeholder sprite
- `src/systems/player-movement-system.ts` - PlayerMovementSystem (priority 10)

**Player physics:**
- Capsule collider (half-height 0.4m, radius 0.25m) - prevents catching on tile edges
- `lockRotations()` - no spinning
- Friction 0 - movement controlled entirely via code

**Movement system logic:**
1. **Ground detection:** ray cast down from center, length = capsule extent + 0.1m
2. **Wall detection:** ray cast left/right, length = radius + 0.1m
3. **Horizontal:** `setLinvel({x: targetVx, y: currentVy})` - snappy, direct control
4. **Jump:** `setLinvel({x: currentVx, y: JUMP_IMPULSE})` when grounded
5. **Wall-jump:** set velocity away from wall + upward when wall-sliding + jump pressed
6. **Wall-slide:** clamp downward velocity when touching wall and holding toward it
7. **State machine:** idle/running/jumping/falling/wall-sliding/dead based on velocity + contacts

**Verify:** Blue rectangle runs with arrow keys, jumps with space, wall-jumps off walls, falls with gravity. Responsive, snappy feel.

**Commit:** `feat: player character with run, jump, wall-jump`

---

## Task 6: Level / Platforms

**Files to create:**
- `src/level/level-data.ts` - LevelData, PlatformDef, SpawnPointDef interfaces + PROTOTYPE_LEVEL constant
- `src/level/level-builder.ts` - buildLevel(): creates static physics bodies + dark gray rectangle visuals for each platform
- `src/level/ldtk-loader.ts` - type definitions + stub (throws "not yet implemented")

**PROTOTYPE_LEVEL:** ~2560x1440px level with:
- Ground floor spanning full width
- 8-10 floating platforms at varying heights
- Walls on left/right edges + some internal walls for wall-jumping
- 3-4 enemy spawn points
- Player spawn at center-left

**Verify:** Level renders with visible platforms. Player stands on ground, jumps to platforms, wall-jumps off walls. No falling through floors. Camera follows within level bounds.

**Commit:** `feat: prototype level with platforms and walls`

---

## Task 7: Mech Companion

**Files to create:**
- `src/entities/create-mech.ts` - factory: no physics body, cyan diamond placeholder sprite, MechComponent + WeaponComponent
- `src/systems/mech-follow-system.ts` - MechFollowSystem (priority 20)

**Follow behavior:**
- **Idle:** elliptical orbit around player (cos/sin * radius, flattened vertically)
- **Moving:** trail behind player (opposite of facing direction), lerp smoothly
- No physics body - purely computed position, floats freely through geometry

**Verify:** Small cyan shape orbits player when idle, trails when moving, transitions smoothly on direction change.

**Commit:** `feat: mech companion with orbit and follow behavior`

---

## Task 8: Combat System

**Files to create:**
- `src/entities/create-projectile.ts` - factory: dynamic sensor body (gravity scale 0), thin yellow line sprite
- `src/systems/weapon-system.ts` - WeaponSystem (priority 30): mech auto-fires at nearest enemy in range
- `src/systems/projectile-system.ts` - ProjectileSystem (priority 35): lifetime countdown, intersection detection, apply damage

**Projectile physics:**
- Dynamic body with `setGravityScale(0)` - flies straight
- Sensor collider (`setSensor(true)`) - detects overlap without physical response
- Velocity set via `setLinvel()` on creation

**Weapon logic:**
- Cooldown timer per weapon
- Find nearest enemy within range
- Compute direction, spawn projectile at mech position
- Projectile destroyed on hit or lifetime expiry

**Verify:** Place test enemy. Mech fires yellow projectiles when enemy in range. Projectiles travel, hit, deal damage (console log). Miss projectiles despawn after 2s.

**Commit:** `feat: combat system - mech auto-fire and projectiles`

---

## Task 9: Enemies

**Files to create:**
- `src/entities/create-enemy.ts` - three factories: createWalkerEnemy, createFlyerEnemy, createTurretEnemy
- `src/systems/enemy-ai-system.ts` - EnemyAISystem (priority 15)
- `src/systems/damage-system.ts` - DamageSystem (priority 40): contact damage, invincibility, knockback

**Enemy types:**
- **Walker** (red rect, 30HP): patrols on platforms, chases player when detected, edge detection to avoid falling off
- **Flyer** (orange diamond, 20HP): bobs up/down, moves toward player when detected, gravity scale 0
- **Turret** (dark red square, 50HP): fixed position, fires projectiles at player (has own WeaponComponent)

**Contact damage:** Rapier contact pairs -> lookup entities -> if player+enemy and player not invincible -> apply damage + knockback + invincibility timer

**Verify:** Enemies spawn at level positions. Walkers patrol without falling off edges. Flyers bob and chase. Turrets shoot. Contact damages player. Mech shoots enemies. Enemies die at 0 HP.

**Commit:** `feat: three enemy types with AI and contact damage`

---

## Task 10: Death and Respawn

**Files to create:**
- `src/systems/death-respawn-system.ts` - DeathRespawnSystem (priority 50)

**Logic:**
1. Player health <= 0 -> set state 'dead', freeze body, start respawn timer (2s)
2. Timer expires -> teleport to spawn, reset health, reset enemies, brief invincibility
3. Make body dynamic again, set state 'idle'

**Verify:** Take damage until death. Player freezes, waits 2s, respawns at spawn point with full health. Enemies reset.

**Commit:** `feat: death and respawn system`

---

## Task 11: Starfield Background

**Files to create:**
- `src/systems/starfield-system.ts` - StarfieldSystem (priority -10)

**Procedural generation:**
- 3 parallax layers (back/mid/front) with different parallax factors (0.1, 0.3, 0.6)
- Use `createNoise2D()` from simplex-noise to place stars at grid points where noise > threshold
- Vary size (1-3px) and brightness (alpha 0.3-1.0) based on noise value
- Optional subtle twinkle (random alpha oscillation)

**Verify:** Stars visible behind level. Parallax effect as camera moves. Varying sizes and brightness.

**Commit:** `feat: procedural starfield background with parallax`

---

## Task 12: Visual Effects

**Files to create:**
- `src/systems/effects-system.ts` - EffectsSystem (priority 95)

**Effects:**
- Mech: GlowFilter (cyan, pulsing outerStrength via sine wave)
- Projectiles: GlowFilter (yellow) applied on creation
- World container: subtle BloomFilter (strength 0.3)
- Damage flash: brief white tint on hit entities

**Verify:** Mech glows cyan and pulses. Lasers glow yellow. Subtle bloom on bright elements. Damage causes flash.

**Commit:** `feat: glow and bloom visual effects`

---

## Task 13: Audio

**Files to create:**
- `src/audio/sound-manager.ts` - SoundManager: loads Howl instances, play by name, graceful fallback if missing

**Sounds needed (user generates via sfxr.me):**
- `assets/sounds/jump.wav`, `laser.wav`, `hit.wav`, `death.wav`, `enemy-death.wav`

**Integration points:**
- PlayerMovementSystem -> play 'jump' on jump
- WeaponSystem -> play 'laser' on fire
- DamageSystem -> play 'hit' on player damage, 'enemy-death' on enemy death
- DeathRespawnSystem -> play 'death' on player death

SoundManager handles missing files gracefully (warn, don't crash). Browser autoplay policy handled by requiring user interaction to start (click-to-start overlay or first input).

**Verify:** Each action produces correct sound. No errors if sound files missing.

**Commit:** `feat: sound effects for jump, laser, hit, death`

---

## Task 14: HUD

**Files to create:**
- `src/ui/health-bar.ts` - HealthBar class: PixiJS Graphics background + foreground + border + text
- `src/systems/hud-system.ts` - HudSystem (priority 98): reads player health, updates HealthBar

**Health bar:** Top-left of screen (in uiContainer, fixed position). Green->yellow->red as health drops. Numeric display.

**Verify:** Health bar visible. Updates on damage. Refills on respawn.

**Commit:** `feat: HUD with player health bar`

---

## Task 15: Integration and Polish

**Files to create/modify:**
- `src/core/entity-manager.ts` - EntityManager: deferred entity destruction queue (prevents mid-iteration issues)
- `src/core/game.ts` - final Game class wiring all systems, entities, level, audio

**Game.init() order:**
1. Init PixiJS + Rapier2D (parallel)
2. Create World, PhysicsContext
3. Create stage hierarchy (starfield, world, UI containers)
4. Register all 13 systems in priority order
5. Build prototype level
6. Spawn player + mech + enemies
7. Load sounds
8. Start game loop

**Final verification checklist:**
- [ ] Game loads without errors
- [ ] Starfield parallax behind level
- [ ] Player runs, jumps, wall-jumps responsively
- [ ] Mech orbits/follows player
- [ ] Enemies patrol, chase, shoot
- [ ] Mech auto-fires at enemies
- [ ] Projectiles glow and travel correctly
- [ ] Contact damage + knockback works
- [ ] Health bar updates
- [ ] Death -> 2s delay -> respawn with full health
- [ ] Sound effects play correctly
- [ ] Glow/bloom effects visible
- [ ] Steady 60fps, no console errors

**Commit:** `feat: Phase 1 integration and polish`

---

## File Manifest (~38 files, all under 250 lines)

```
Root:           package.json, tsconfig.json, vite.config.ts, index.html
src/            main.ts, style.css
src/core/       types.ts, constants.ts, world.ts, game.ts, physics.ts, collision-utils.ts, entity-manager.ts, debug.ts
src/components/ transform.ts, velocity.ts, sprite.ts, physics-body.ts, player.ts, mech.ts, health.ts, weapon.ts, enemy.ts, projectile.ts, index.ts
src/systems/    physics-system.ts, render-system.ts, player-movement-system.ts, camera-system.ts, mech-follow-system.ts, weapon-system.ts, projectile-system.ts, enemy-ai-system.ts, damage-system.ts, death-respawn-system.ts, starfield-system.ts, effects-system.ts, hud-system.ts
src/entities/   create-player.ts, create-mech.ts, create-enemy.ts, create-projectile.ts
src/input/      input-manager.ts, actions.ts
src/level/      level-data.ts, level-builder.ts, ldtk-loader.ts
src/audio/      sound-manager.ts
src/ui/         health-bar.ts
assets/sounds/  jump.wav, laser.wav, hit.wav, death.wav, enemy-death.wav
```
