# Phase 2e-4: Boss Phase 3, Boss Sounds, Phantom Enemy

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the Boss Warden fight with Phase 3 enrage + minion spawns, wire up boss sound effects, and add a new Phantom (teleporter) enemy type.

**Architecture:** Three independent features that layer onto the existing ECS. Boss Phase 3 extends the existing BossComponent + BossAISystem with enrage multipliers and a minion spawn timer. Boss sounds are wired into existing state transitions via SoundManager. The Phantom enemy is a new EnemyType with its own factory + AI behaviour file, following the established pattern (create-*.ts + enemy-ai-behaviours-*.ts).

**Tech Stack:** TypeScript strict, PixiJS v8, Rapier2D WASM, Howler.js

---

## Task 1: Add Phase 3 fields to BossComponent

**Files:**
- Modify: `src/components/boss.ts`

**Step 1: Add minionSpawnTimer field to BossComponent interface**

Add after `laserFired: boolean;` at line 41:

```typescript
/** Time until next minion spawn in Phase 3 (seconds). */
minionSpawnTimer: number;
```

**Step 2: Update createBoss() factory to include default**

In the return object of `createBoss()` (line 49-60), add:

```typescript
minionSpawnTimer: 8.0,
```

**Step 3: Verify the build compiles**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`
Expected: No errors (existing boss code just ignores the new field).

**Step 4: Commit**

```bash
git add src/components/boss.ts
git commit -m "feat: add minionSpawnTimer field to BossComponent for Phase 3"
```

---

## Task 2: Create boss-phase3.ts with enrage constants + minion spawn logic

**Files:**
- Create: `src/systems/boss-phase3.ts`

**Step 1: Write the Phase 3 module**

This file exports enrage speed/timing multipliers and a `trySpawnMinions()` function:

```typescript
/**
 * Boss Phase 3 logic — enrage multipliers and minion spawning.
 * Extracted to keep boss-ai-behaviours.ts under 250 lines.
 */

import type { Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { Container } from 'pixi.js';
import type { BossComponent } from '../components/boss.js';
import type { TransformComponent } from '../components/index.js';
import type { SoundManager } from '../audio/sound-manager.js';
import { createWalkerEnemy } from '../entities/create-enemy.js';

// ---------------------------------------------------------------------------
// Enrage multipliers (Phase 3 vs Phase 1/2 defaults)
// ---------------------------------------------------------------------------

/** Phase 3 charge speed (m/s). Phase 1-2 = 8. */
export const P3_CHARGE_SPEED = 11;

/** Phase 3 cooldown after attack (seconds). Phase 1-2 = 1.5. */
export const P3_COOLDOWN_DURATION = 0.8;

/** Phase 3 patrol attack interval (seconds). Phase 1-2 = 3.0. */
export const P3_PATROL_INTERVAL = 1.8;

/** Phase 3 windup duration (seconds). Phase 1-2 = 0.8. */
export const P3_WINDUP_DURATION = 0.5;

/** Time between minion spawns (seconds). */
const MINION_SPAWN_INTERVAL = 8.0;

/** Max non-boss enemies alive before skipping spawn. */
const MAX_ACTIVE_MINIONS = 4;

/** Horizontal offset for spawned minions from boss position (pixels). */
const MINION_OFFSET_X = 80;

// ---------------------------------------------------------------------------
// Minion spawning
// ---------------------------------------------------------------------------

/**
 * Attempt to spawn walker minions during Phase 3.
 * Spawns 2 walkers (one on each side of the boss) every MINION_SPAWN_INTERVAL.
 * Skips if MAX_ACTIVE_MINIONS non-boss enemies are already alive.
 *
 * @returns true if minions were spawned this frame
 */
export function trySpawnMinions(
  boss: BossComponent,
  transform: TransformComponent,
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  soundManager: SoundManager,
  dt: number,
): boolean {
  if (boss.phase < 3) return false;

  boss.minionSpawnTimer -= dt;
  if (boss.minionSpawnTimer > 0) return false;

  // Reset timer
  boss.minionSpawnTimer = MINION_SPAWN_INTERVAL;

  // Count active non-boss enemies
  const enemies = world.query('enemy', 'health');
  let activeCount = 0;
  for (const e of enemies) {
    const bComp = world.getComponent(e, 'boss');
    if (bComp) continue; // skip boss itself
    const health = world.getComponent(e, 'health');
    if (health && !health.isDead) activeCount++;
  }

  if (activeCount >= MAX_ACTIVE_MINIONS) return false;

  // Spawn 2 walkers, one on each side
  const spawnY = transform.y;
  createWalkerEnemy(
    world, physicsCtx, worldContainer,
    transform.x - MINION_OFFSET_X, spawnY,
  );
  createWalkerEnemy(
    world, physicsCtx, worldContainer,
    transform.x + MINION_OFFSET_X, spawnY,
  );

  soundManager.play('minion-spawn');
  return true;
}
```

**Step 2: Verify the build compiles**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`
Expected: No errors (file is imported nowhere yet).

**Step 3: Commit**

```bash
git add src/systems/boss-phase3.ts
git commit -m "feat: add boss Phase 3 enrage constants and minion spawn logic"
```

---

## Task 3: Wire Phase 3 into BossAISystem + behaviours

**Files:**
- Modify: `src/systems/boss-ai-system.ts`
- Modify: `src/systems/boss-ai-behaviours.ts`

**Step 1: Update BossAISystem to accept SoundManager and call trySpawnMinions**

In `boss-ai-system.ts`:

1. Add imports at top:
```typescript
import type { SoundManager } from '../audio/sound-manager.js';
import { trySpawnMinions } from './boss-phase3.js';
```

2. Add `soundManager` field to constructor:
```typescript
private readonly soundManager: SoundManager;

constructor(physicsCtx: PhysicsContext, worldContainer: Container, soundManager: SoundManager) {
  this.physicsCtx = physicsCtx;
  this.worldContainer = worldContainer;
  this.soundManager = soundManager;
}
```

3. In `update()`, after the `switch` block (after line 86), add minion spawn call:
```typescript
// Phase 3: attempt minion spawns
trySpawnMinions(
  boss, transform, world, this.physicsCtx,
  this.worldContainer, this.soundManager, dt,
);
```

4. Update `updateVisual()` to show permanent red tint in Phase 3 (replaces existing tint logic):
```typescript
private updateVisual(world: World, entity: Entity, boss: BossComponent): void {
  const sprite = world.getComponent(entity, 'sprite');
  if (!sprite) return;

  const gfx = sprite.displayObject;

  // Phase 3: permanent deep red tint (overrides all states)
  if (boss.phase === 3) {
    if (boss.attackState === 'windup') {
      const flash = Math.sin(boss.stateTimer * 25) > 0;
      gfx.tint = flash ? 0xff0000 : 0xaa0000;
    } else {
      gfx.tint = 0xff2222;
    }
    return;
  }

  if (boss.attackState === 'windup') {
    const flash = Math.sin(boss.stateTimer * 20) > 0;
    gfx.tint = flash ? 0xff4444 : 0xffffff;
  } else if (boss.attackState === 'charging') {
    gfx.tint = 0xff6644;
  } else if (boss.attackState === 'laser') {
    gfx.tint = 0xff8844;
  } else {
    gfx.tint = 0xffffff;
  }
}
```

**Step 2: Update boss-ai-behaviours.ts to use Phase 3 speed multipliers**

In `boss-ai-behaviours.ts`:

1. Add imports:
```typescript
import {
  P3_CHARGE_SPEED,
  P3_COOLDOWN_DURATION,
  P3_PATROL_INTERVAL,
  P3_WINDUP_DURATION,
} from './boss-phase3.js';
```

2. Update `handlePatrol()` — use phase-aware attack interval:
Change line 70 (`boss.patrolTimer -= dt;`) block:
```typescript
boss.patrolTimer -= dt;
if (boss.patrolTimer <= 0) {
  boss.chargeDirection = playerTransform.x > transform.x ? 1 : -1;
  boss.attackState = 'windup';
  boss.stateTimer = boss.phase >= 3 ? P3_WINDUP_DURATION : WINDUP_DURATION;
  body.setLinvel({ x: 0, y: vel.y }, true);
}
```

3. Update `handleCharge()` — use phase-aware charge speed:
Change line 103:
```typescript
const speed = boss.phase >= 3 ? P3_CHARGE_SPEED : CHARGE_SPEED;
body.setLinvel({ x: boss.chargeDirection * speed, y: vel.y }, true);
```

And change the cooldown transition (line ~122):
```typescript
boss.attackState = 'cooldown';
boss.stateTimer = boss.phase >= 3 ? P3_COOLDOWN_DURATION : COOLDOWN_DURATION;
```

4. Update `handleLaser()` cooldown transition (line ~155):
```typescript
boss.attackState = 'cooldown';
boss.stateTimer = boss.phase >= 3 ? P3_COOLDOWN_DURATION : COOLDOWN_DURATION;
```

5. Update `handleCooldown()` — use phase-aware patrol interval:
Change line 172:
```typescript
boss.attackState = 'patrol';
boss.patrolTimer = boss.phase >= 3 ? P3_PATROL_INTERVAL : PATROL_ATTACK_INTERVAL;
```

**Step 3: Update game.ts to pass SoundManager to BossAISystem**

In `src/core/game.ts` line 205:
```typescript
this.addSystem(new BossAISystem(this.physicsCtx, this.worldContainer, this.soundManager));
```

**Step 4: Verify build compiles**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/systems/boss-ai-system.ts src/systems/boss-ai-behaviours.ts src/core/game.ts src/systems/boss-phase3.ts
git commit -m "feat: wire Boss Phase 3 enrage speeds + minion spawns into AI system"
```

---

## Task 4: Add boss sound effects to SoundManager

**Files:**
- Modify: `src/audio/sound-manager.ts`

**Step 1: Add boss sound definitions**

In `loadAll()`, add these entries to the `soundDefs` array (after the existing entries):

```typescript
{ name: 'boss-spawn', src: ['/assets/sounds/phaserDown3.mp3'], volume: 0.6 },
{ name: 'boss-windup', src: ['/assets/sounds/phaseJump3.mp3'], volume: 0.35 },
{ name: 'boss-charge', src: ['/assets/sounds/lowThreeTone.mp3'], volume: 0.4 },
{ name: 'boss-laser', src: ['/assets/sounds/laser7.mp3'], volume: 0.3 },
{ name: 'boss-phase-up', src: ['/assets/sounds/phaserUp7.mp3'], volume: 0.5 },
{ name: 'boss-death', src: ['/assets/sounds/spaceTrash5.mp3'], volume: 0.6 },
{ name: 'minion-spawn', src: ['/assets/sounds/pepSound3.mp3'], volume: 0.3 },
```

**Step 2: Verify build compiles**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/audio/sound-manager.ts
git commit -m "feat: register boss + minion sound effects in SoundManager"
```

---

## Task 5: Wire boss sounds into trigger, AI, and behaviours

**Files:**
- Modify: `src/systems/boss-trigger-system.ts`
- Modify: `src/systems/boss-ai-system.ts`
- Modify: `src/systems/boss-ai-behaviours.ts`

**Step 1: Add spawn sound to BossTriggerSystem**

In `boss-trigger-system.ts`:

1. Import SoundManager and accept it in constructor:
```typescript
import type { SoundManager } from '../audio/sound-manager.js';
```

2. Add field + constructor parameter:
```typescript
private readonly soundManager: SoundManager;

constructor(
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  levelData: LevelData,
  soundManager: SoundManager,
) {
  this.physicsCtx = physicsCtx;
  this.worldContainer = worldContainer;
  this.levelData = levelData;
  this.soundManager = soundManager;
}
```

3. After `this.bossSpawned = true;` (line 85), add:
```typescript
this.soundManager.play('boss-spawn');
```

**Step 2: Add phase transition sound to BossAISystem**

In `boss-ai-system.ts`, update `updatePhase()`:
```typescript
private updatePhase(boss: BossComponent, currentHp: number): void {
  if (boss.phase === 1 && currentHp <= PHASE2_HP) {
    boss.phase = 2;
    this.soundManager.play('boss-phase-up');
  } else if (boss.phase === 2 && currentHp <= PHASE3_HP) {
    boss.phase = 3;
    this.soundManager.play('boss-phase-up');
  }
}
```

**Step 3: Add attack sounds to boss-ai-behaviours.ts**

Need to pass SoundManager into behaviour handlers. Update signatures:

1. Add `SoundManager` parameter to `handlePatrol`, `handleCharge`, `handleLaser`:

`handlePatrol` — add `soundManager: SoundManager` as last param. When transitioning to windup:
```typescript
soundManager.play('boss-windup');
```

`handleCharge` — add `soundManager: SoundManager`. On first frame (stateTimer near max), play charge:
Actually, simpler: play charge sound when entering charge state from windup. In `handleWindup`, add `soundManager` param, and when transitioning to charging:
```typescript
soundManager.play('boss-charge');
```

`handleLaser` — when `!boss.laserFired` fires the laser, also:
```typescript
soundManager.play('boss-laser');
```

2. Update all call sites in `boss-ai-system.ts` to pass `this.soundManager`.

**Step 4: Update game.ts BossTriggerSystem constructor**

In `src/core/game.ts` line 202-204:
```typescript
this.addSystem(new BossTriggerSystem(
  this.physicsCtx, this.worldContainer, levelData, this.soundManager,
));
```

**Step 5: Verify build compiles**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`

**Step 6: Commit**

```bash
git add src/systems/boss-trigger-system.ts src/systems/boss-ai-system.ts src/systems/boss-ai-behaviours.ts src/core/game.ts
git commit -m "feat: wire boss sound effects into spawn, phase transitions, and attacks"
```

---

## Task 6: Add 'phantom' EnemyType and factory

**Files:**
- Modify: `src/components/enemy.ts` (add 'phantom' to EnemyType union)
- Create: `src/entities/create-phantom.ts`
- Modify: `src/entities/create-enemy.ts` (add re-export)

**Step 1: Add 'phantom' to EnemyType**

In `src/components/enemy.ts` line 12, update:
```typescript
export type EnemyType =
  | 'walker' | 'flyer' | 'turret'
  | 'sentry' | 'crawler' | 'shielder'
  | 'phantom';
```

**Step 2: Create the Phantom entity factory**

Create `src/entities/create-phantom.ts`:

```typescript
/**
 * Phantom enemy factory — creates a teleporting ambusher that warps
 * near the player, attacks briefly, then vanishes.
 * Procedural visuals: semi-transparent purple/magenta shimmer body.
 */

import RAPIER from '@dimforge/rapier2d-compat';
import { Graphics } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import { toPhysicsPos } from '../core/physics.js';
import { registerCollider } from '../core/collision-utils.js';
import {
  createTransform,
  createPhysicsBody,
  createEnemy,
  createHealth,
  createSprite,
} from '../components/index.js';

/** Phantom body half-width (pixels). */
const BODY_W = 12;

/** Phantom body half-height (pixels). */
const BODY_H = 16;

/**
 * Create a phantom enemy at the given position.
 * Starts invisible (alpha 0) — AI system handles visibility transitions.
 */
export function createPhantomEnemy(
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  x: number,
  y: number,
): Entity {
  const entity = world.createEntity();

  // -- Physics body (dynamic, rotation locked) --
  const physPos = toPhysicsPos(x, y);
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(physPos.x, physPos.y)
    .lockRotations();
  const body = physicsCtx.world.createRigidBody(bodyDesc);

  // Small capsule collider
  const colliderDesc = RAPIER.ColliderDesc.capsule(0.16, 0.16)
    .setFriction(0.3)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createHealth(30));
  world.addComponent(entity, createEnemy('phantom', 15, 300, {
    patrolOriginX: x,
    patrolOriginY: y,
    patrolDistance: 150,
    actionTimer: 2.0, // initial hidden phase delay
  }));

  // -- Procedural sprite: ethereal purple shimmer --
  const gfx = buildPhantomGraphic();
  gfx.alpha = 0; // start invisible
  worldContainer.addChild(gfx);
  world.addComponent(entity, createSprite(gfx, BODY_W * 2, BODY_H * 2));

  // -- Register collider --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}

/** Draw a ghostly semi-transparent purple body with inner glow. */
function buildPhantomGraphic(): Graphics {
  const g = new Graphics();

  // Outer body — dark magenta, semi-transparent
  g.rect(-BODY_W, -BODY_H, BODY_W * 2, BODY_H * 2);
  g.fill({ color: 0x8822aa, alpha: 0.7 });

  // Inner core — brighter purple glow
  g.rect(-BODY_W + 3, -BODY_H + 3, BODY_W * 2 - 6, BODY_H * 2 - 6);
  g.fill({ color: 0xcc44ff, alpha: 0.5 });

  // Eye slits — bright magenta
  g.rect(-6, -4, 4, 3);
  g.fill({ color: 0xff44ff, alpha: 1 });
  g.rect(2, -4, 4, 3);
  g.fill({ color: 0xff44ff, alpha: 1 });

  return g;
}
```

**Step 3: Add re-export to barrel file**

In `src/entities/create-enemy.ts`, add:
```typescript
export { createPhantomEnemy } from './create-phantom.js';
```

**Step 4: Verify build compiles**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/components/enemy.ts src/entities/create-phantom.ts src/entities/create-enemy.ts
git commit -m "feat: add Phantom enemy type and entity factory"
```

---

## Task 7: Implement Phantom AI behaviour

**Files:**
- Create: `src/systems/enemy-ai-behaviours-4.ts`

**Step 1: Write the Phantom AI module**

```typescript
/**
 * Phantom (Teleporter) enemy AI — ambush behaviour.
 *
 * States:
 * - 'idle': hidden phase (invisible, no collision). Counting down.
 * - 'chasing': warp-in shimmer (alpha ramping up, moving toward player slowly)
 * - 'attacking': visible, moving toward player, dealing contact damage
 * - 'patrolling': warp-out shimmer (alpha ramping down), then back to idle
 *
 * Uses actionTimer for state duration timing.
 */

import type { PhysicsContext } from '../core/physics.js';
import type { TransformComponent, EnemyComponent } from '../components/index.js';
import type { SpriteComponent } from '../components/sprite.js';
import { PIXELS_PER_METER } from '../core/constants.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Duration of hidden phase (seconds). */
const HIDDEN_DURATION = 3.0;

/** Duration of warp-in shimmer (seconds). */
const WARPIN_DURATION = 0.4;

/** Duration of visible attack window (seconds). */
const ATTACK_DURATION = 1.8;

/** Duration of warp-out shimmer (seconds). */
const WARPOUT_DURATION = 0.3;

/** Movement speed while visible and attacking (m/s). */
const ATTACK_SPEED = 2.5;

/** Min teleport distance from player (pixels). */
const TELEPORT_MIN_DIST = 80;

/** Max teleport distance from player (pixels). */
const TELEPORT_MAX_DIST = 150;

// ---------------------------------------------------------------------------
// Main update
// ---------------------------------------------------------------------------

/**
 * Phantom AI: teleporting ambusher.
 *
 * @param sprite - used for alpha transitions
 */
export function updatePhantom(
  physicsCtx: PhysicsContext,
  enemy: EnemyComponent,
  bodyHandle: number,
  transform: TransformComponent,
  playerTransform: TransformComponent,
  inRange: boolean,
  dt: number,
  sprite?: SpriteComponent,
): void {
  const body = physicsCtx.world.getRigidBody(bodyHandle);
  if (!body) return;

  switch (enemy.state) {
    case 'idle':
      handleHidden(enemy, body, transform, playerTransform, inRange, dt, sprite);
      break;
    case 'chasing':
      handleWarpIn(enemy, body, dt, sprite);
      break;
    case 'attacking':
      handleAttack(physicsCtx, enemy, body, transform, playerTransform, dt, sprite);
      break;
    case 'patrolling':
      handleWarpOut(enemy, body, transform, dt, sprite);
      break;
  }
}

// ---------------------------------------------------------------------------
// State handlers
// ---------------------------------------------------------------------------

/** Hidden phase: invisible, frozen, counting down. */
function handleHidden(
  enemy: EnemyComponent,
  body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, w: boolean): void },
  transform: TransformComponent,
  playerTransform: TransformComponent,
  inRange: boolean,
  dt: number,
  sprite?: SpriteComponent,
): void {
  // Stay still and invisible
  const vel = body.linvel();
  body.setLinvel({ x: 0, y: vel.y }, true);
  if (sprite) sprite.displayObject.alpha = 0;

  enemy.actionTimer -= dt;
  if (enemy.actionTimer <= 0 && inRange) {
    // Teleport near player
    teleportNearPlayer(body, transform, playerTransform);
    enemy.state = 'chasing'; // warp-in
    enemy.actionTimer = WARPIN_DURATION;
  } else if (enemy.actionTimer <= 0) {
    // Not in range — reset timer and wait
    enemy.actionTimer = 1.0;
  }
}

/** Warp-in: alpha ramping from 0 to 1, standing still. */
function handleWarpIn(
  enemy: EnemyComponent,
  body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, w: boolean): void },
  dt: number,
  sprite?: SpriteComponent,
): void {
  const vel = body.linvel();
  body.setLinvel({ x: 0, y: vel.y }, true);

  enemy.actionTimer -= dt;
  const progress = 1 - (enemy.actionTimer / WARPIN_DURATION);
  if (sprite) sprite.displayObject.alpha = Math.min(1, progress);

  if (enemy.actionTimer <= 0) {
    enemy.state = 'attacking';
    enemy.actionTimer = ATTACK_DURATION;
    if (sprite) sprite.displayObject.alpha = 1;
  }
}

/** Attack: visible, moving slowly toward player. */
function handleAttack(
  physicsCtx: PhysicsContext,
  enemy: EnemyComponent,
  body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, w: boolean): void },
  transform: TransformComponent,
  playerTransform: TransformComponent,
  dt: number,
  sprite?: SpriteComponent,
): void {
  // Move toward player
  const dx = playerTransform.x - transform.x;
  const dir = dx > 0 ? 1 : -1;
  const vel = body.linvel();
  body.setLinvel({ x: dir * ATTACK_SPEED, y: vel.y }, true);

  if (sprite) sprite.displayObject.alpha = 1;

  enemy.actionTimer -= dt;
  if (enemy.actionTimer <= 0) {
    enemy.state = 'patrolling'; // warp-out
    enemy.actionTimer = WARPOUT_DURATION;
  }
}

/** Warp-out: alpha ramping from 1 to 0, then teleport back to patrol origin. */
function handleWarpOut(
  enemy: EnemyComponent,
  body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, w: boolean): void },
  transform: TransformComponent,
  dt: number,
  sprite?: SpriteComponent,
): void {
  const vel = body.linvel();
  body.setLinvel({ x: 0, y: vel.y }, true);

  enemy.actionTimer -= dt;
  const progress = enemy.actionTimer / WARPOUT_DURATION;
  if (sprite) sprite.displayObject.alpha = Math.max(0, progress);

  if (enemy.actionTimer <= 0) {
    // Teleport back to patrol origin
    const originPhysX = enemy.patrolOriginX / PIXELS_PER_METER;
    const originPhysY = -enemy.patrolOriginY / PIXELS_PER_METER;
    body.setLinvel({ x: 0, y: 0 }, true);
    // Move body to origin position
    const fullBody = body as unknown as {
      setTranslation(v: { x: number; y: number }, w: boolean): void;
    };
    fullBody.setTranslation({ x: originPhysX, y: originPhysY }, true);

    // Reset to hidden
    enemy.state = 'idle';
    enemy.actionTimer = HIDDEN_DURATION;
    if (sprite) sprite.displayObject.alpha = 0;
  }
}

// ---------------------------------------------------------------------------
// Teleport helper
// ---------------------------------------------------------------------------

/** Move the physics body to a random position near the player. */
function teleportNearPlayer(
  body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, w: boolean): void },
  transform: TransformComponent,
  playerTransform: TransformComponent,
): void {
  // Random angle, random distance between min and max
  const angle = Math.random() * Math.PI * 2;
  const dist = TELEPORT_MIN_DIST + Math.random() * (TELEPORT_MAX_DIST - TELEPORT_MIN_DIST);

  const newX = playerTransform.x + Math.cos(angle) * dist;
  const newY = playerTransform.y + Math.sin(angle) * dist;

  // Convert to physics coords
  const physX = newX / PIXELS_PER_METER;
  const physY = -newY / PIXELS_PER_METER;

  // Rapier setTranslation — cast to access method
  const fullBody = body as unknown as {
    setTranslation(v: { x: number; y: number }, w: boolean): void;
  };
  fullBody.setTranslation({ x: physX, y: physY }, true);
}
```

**Step 2: Verify build compiles**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/systems/enemy-ai-behaviours-4.ts
git commit -m "feat: add Phantom AI behaviour — teleport ambush cycle"
```

---

## Task 8: Wire Phantom into EnemyAISystem and spawn-enemies

**Files:**
- Modify: `src/systems/enemy-ai-system.ts`
- Modify: `src/level/spawn-enemies.ts`
- Modify: `src/level/level-data.ts` (add 'enemy-phantom' to SpawnPointDef type)

**Step 1: Add 'enemy-phantom' to SpawnPointDef type union**

In `src/level/level-data.ts` line 35-38, add `'enemy-phantom'`:
```typescript
type:
  | 'player' | 'enemy-walker' | 'enemy-flyer' | 'enemy-turret'
  | 'enemy-sentry' | 'enemy-crawler' | 'enemy-shielder'
  | 'enemy-boss-warden' | 'enemy-phantom';
```

**Step 2: Add phantom case to EnemyAISystem**

In `src/systems/enemy-ai-system.ts`:

1. Import:
```typescript
import { updatePhantom } from './enemy-ai-behaviours-4.js';
```

2. Add case in the switch block (after `case 'shielder':`):
```typescript
case 'phantom':
  updatePhantom(
    this.physicsCtx, enemy, pb.bodyHandle,
    transform, playerTransform, inRange, dt,
    world.getComponent(entity, 'sprite'),
  );
  break;
```

**Step 3: Add phantom case to spawn-enemies.ts**

In `src/level/spawn-enemies.ts`:

1. Import:
```typescript
import { createPhantomEnemy } from '../entities/create-enemy.js';
```

(Note: already importing from create-enemy.ts barrel, just add to the existing import)

2. Add case before `'enemy-boss-warden'`:
```typescript
case 'enemy-phantom':
  createPhantomEnemy(world, physicsCtx, worldContainer, sp.x, sp.y);
  break;
```

**Step 4: Verify build compiles**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/systems/enemy-ai-system.ts src/level/spawn-enemies.ts src/level/level-data.ts
git commit -m "feat: wire Phantom enemy into AI system and level spawner"
```

---

## Task 9: Place Phantoms in levels

**Files:**
- Modify: `src/level/extra-levels.ts`

**Step 1: Add Phantom spawn points to Crystal Caverns and Neon Outpost**

Crystal Caverns — add 1 phantom in the vertical shaft area:
```typescript
{ x: 1600, y: 1070, type: 'enemy-phantom' },
```

Neon Outpost — add 1 phantom in the corridor area:
```typescript
{ x: 1650, y: 970, type: 'enemy-phantom' },
```

**Step 2: Verify build compiles**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/level/extra-levels.ts
git commit -m "feat: place Phantom enemies in Crystal Caverns and Neon Outpost"
```

---

## Task 10: Add boss death sound + integration test

**Files:**
- Modify: `src/systems/damage-system.ts` (need to check current boss death handling)

**Step 1: Verify boss death path**

The DamageSystem already plays `enemy-death` for enemies. Check if there's a way to differentiate boss death. If the entity has a `boss` component, play `boss-death` instead:

In the enemy death handling section of DamageSystem, add:
```typescript
const bossComp = world.getComponent(entity, 'boss');
if (bossComp) {
  this.soundManager.play('boss-death');
} else {
  this.soundManager.play('enemy-death');
}
```

(This replaces the existing `this.soundManager.play('enemy-death')` call for enemy deaths.)

**Step 2: Manual integration test**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npm run dev`

Test checklist:
- [ ] Start Neon Outpost, defeat all 10 regular enemies, cross boss trigger
- [ ] Boss spawn sound plays on appearance
- [ ] Boss windup sound plays before charge
- [ ] Boss charge sound plays during dash
- [ ] Boss phase transition sound plays when HP drops to 60% and 25%
- [ ] At Phase 3 (25% HP), boss turns red, attacks faster
- [ ] Minions spawn every ~8 seconds during Phase 3
- [ ] Level completes only when boss AND all minions are dead
- [ ] Boss death sound plays (different from normal enemy death)
- [ ] Crystal Caverns has 1 phantom that teleports near player and attacks
- [ ] Neon Outpost has 1 phantom in corridor area
- [ ] Phantom: appears with shimmer, attacks, fades out, reappears later

**Step 3: Commit**

```bash
git add src/systems/damage-system.ts
git commit -m "feat: play distinct boss-death sound when Boss Warden is killed"
```

---

## Task 11: Update memory files

**Files:**
- Modify: `MEMORY.md` (project root) and `/Users/home/.claude/projects/-Users-home-Documents-Vibe-Coding-Noahs-Game/memory/MEMORY.md`

**Step 1: Update phase status**

Change Phase 2e-4 from NEXT to COMPLETE. Add summary of what was built.

**Step 2: Update key files section**

Add:
- `src/systems/boss-phase3.ts`
- `src/systems/enemy-ai-behaviours-4.ts`
- `src/entities/create-phantom.ts`

**Step 3: Update enemy types list**

Now 7 types: walker, flyer, turret, sentry, crawler, shielder, phantom.

**Step 4: Update sound names**

Add: boss-spawn, boss-windup, boss-charge, boss-laser, boss-phase-up, boss-death, minion-spawn

**Step 5: Commit**

```bash
git add MEMORY.md
git commit -m "docs: update memory files for Phase 2e-4 completion"
```
