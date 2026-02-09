# Phase 2e-3: Boss Warden (Phases 1–2) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add The Warden boss fight to Neon Outpost — a large cyberpunk mech with a two-phase attack pattern (charge + laser sweep), boss arena, spawn trigger, and a dedicated boss health bar HUD.

**Architecture:** New `BossComponent` (separate from `EnemyComponent`) tracks phase state machine. New `BossAISystem` (priority 16) handles patrol/charge/laser logic. Boss also gets an `EnemyComponent` so existing damage/death/scrap systems work. Boss laser is a wide, slow projectile created by the AI system. Arena trigger checks player X-position + enemy clear count. Boss health bar is a new HUD element in `HudSystem`.

**Tech Stack:** TypeScript, PixiJS v8, Rapier2D, ECS architecture

---

## Task 1: Create Git Worktree

**Step 1: Create feature branch worktree**

```bash
cd "/Users/home/Documents/Vibe Coding/Noahs Game"
git worktree add .worktrees/phase2e3 -b feature/phase2e3-boss-warden
```

**Step 2: Verify worktree**

```bash
cd "/Users/home/Documents/Vibe Coding/Noahs Game/.worktrees/phase2e3"
git branch --show-current
```

Expected: `feature/phase2e3-boss-warden`

All subsequent work happens in `.worktrees/phase2e3/`.

---

## Task 2: BossComponent + ECS Registration

Create the boss component with phase tracking and attack state machine.

**Files:**
- Create: `src/components/boss.ts`
- Modify: `src/core/types.ts` — add `'boss'` to `ComponentType`
- Modify: `src/components/index.ts` — add `BossComponent` to exports + `ComponentMap`

**Step 1: Create `src/components/boss.ts`**

```typescript
/**
 * BossComponent — phase-based attack state machine for boss entities.
 * Separate from EnemyComponent; boss entities have BOTH components.
 */

import type { Component } from '../core/types.js';

/** Boss attack phases, driven by HP thresholds. */
export type BossPhase = 1 | 2 | 3;

/**
 * Boss AI states:
 * - 'patrol': slow back-and-forth across arena
 * - 'windup': pausing before charge (visual flash)
 * - 'charging': high-speed horizontal dash
 * - 'laser': firing horizontal laser sweep (Phase 2+)
 * - 'cooldown': brief recovery after attack
 */
export type BossAttackState =
  | 'patrol' | 'windup' | 'charging' | 'laser' | 'cooldown';

export interface BossComponent extends Component {
  readonly type: 'boss';
  /** Current phase (1, 2, or 3). */
  phase: BossPhase;
  /** Current attack state. */
  attackState: BossAttackState;
  /** General-purpose timer for current state duration (seconds). */
  stateTimer: number;
  /** Time spent patrolling before next attack (seconds). */
  patrolTimer: number;
  /** Direction of current charge: -1 = left, 1 = right. */
  chargeDirection: -1 | 1;
  /** Left edge of the boss arena (pixels). */
  arenaMinX: number;
  /** Right edge of the boss arena (pixels). */
  arenaMaxX: number;
  /** Whether the boss has been activated (player crossed trigger). */
  activated: boolean;
}

/** Create a BossComponent with default values. */
export function createBoss(arenaMinX: number, arenaMaxX: number): BossComponent {
  return {
    type: 'boss',
    phase: 1,
    attackState: 'patrol',
    stateTimer: 0,
    patrolTimer: 3.0,
    chargeDirection: -1,
    arenaMinX,
    arenaMaxX,
    activated: false,
  };
}
```

**Step 2: Add `'boss'` to `ComponentType` in `src/core/types.ts`**

Add `| 'boss'` to the ComponentType union (after `'animationState'`).

**Step 3: Add to `src/components/index.ts`**

Add re-export:
```typescript
export { type BossComponent, type BossPhase, type BossAttackState, createBoss } from './boss.js';
```

Add import:
```typescript
import type { BossComponent } from './boss.js';
```

Add to ComponentMap:
```typescript
boss: BossComponent;
```

**Step 4: Verify build**

```bash
cd ".worktrees/phase2e3" && npx tsc --noEmit
```

Expected: No errors.

**Step 5: Commit**

```bash
git add src/components/boss.ts src/core/types.ts src/components/index.ts
git commit -m "feat: add BossComponent with phase/attack state machine"
```

---

## Task 3: Boss Warden Entity Factory

Create the large cyberpunk mech entity with ~3x player size.

**Files:**
- Create: `src/entities/create-boss-warden.ts`
- Modify: `src/entities/create-enemy.ts` — add re-export

**Step 1: Create `src/entities/create-boss-warden.ts`**

Key specs:
- **Body size:** ~3x player. Player is roughly 12x20 px half-extents → Boss is ~36x60 px half-extents → collider 0.64 x 1.08 metres
- **HP:** 300, **Contact damage:** 25, **Detection range:** 600
- **EnemyType:** `'walker'` (reuses walker for shared enemy queries in damage/death systems — but BossAISystem overrides AI)
- **Also has:** BossComponent for phase logic
- Procedural visual: large dark mech body with red eye, armour plating, glowing accents

```typescript
/**
 * Boss Warden entity factory — creates the large cyberpunk mech boss
 * for the Neon Outpost boss arena. ~3x player size, 300 HP.
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
import { createBoss } from '../components/boss.js';

/** Boss body half-width (pixels). */
const BODY_W = 36;

/** Boss body half-height (pixels). */
const BODY_H = 56;

/**
 * Create the Warden boss at the given position.
 *
 * @param arenaMinX - left edge of boss arena (pixels)
 * @param arenaMaxX - right edge of boss arena (pixels)
 */
export function createBossWarden(
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  x: number,
  y: number,
  arenaMinX: number,
  arenaMaxX: number,
): Entity {
  const entity = world.createEntity();

  // -- Physics body (dynamic, rotation locked) --
  const physPos = toPhysicsPos(x, y);
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(physPos.x, physPos.y)
    .lockRotations();
  const body = physicsCtx.world.createRigidBody(bodyDesc);

  // Large cuboid collider (~3x player)
  const colliderDesc = RAPIER.ColliderDesc.cuboid(0.64, 1.08)
    .setFriction(0.5)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createHealth(300));

  // EnemyComponent for damage/death/scrap interop (type 'walker' but AI handled by BossAISystem)
  world.addComponent(entity, createEnemy('walker', 25, 600, {
    patrolOriginX: x,
    patrolOriginY: y,
    patrolDistance: (arenaMaxX - arenaMinX) / 2,
  }));

  // BossComponent for phase logic
  world.addComponent(entity, createBoss(arenaMinX, arenaMaxX));

  // -- Procedural sprite --
  const gfx = buildWardenGraphic();
  worldContainer.addChild(gfx);
  world.addComponent(entity, createSprite(gfx, BODY_W * 2, BODY_H * 2));

  // -- Register collider --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}

/** Draw a large imposing cyberpunk mech body. */
function buildWardenGraphic(): Graphics {
  const g = new Graphics();

  // Main body — dark gunmetal
  g.rect(-BODY_W, -BODY_H, BODY_W * 2, BODY_H * 2);
  g.fill({ color: 0x2a2a3a, alpha: 0.95 });

  // Armour plating — slightly lighter panels
  g.rect(-BODY_W + 4, -BODY_H + 4, BODY_W * 2 - 8, 24);
  g.fill({ color: 0x3a3a4a, alpha: 0.9 });
  g.rect(-BODY_W + 4, BODY_H - 28, BODY_W * 2 - 8, 24);
  g.fill({ color: 0x3a3a4a, alpha: 0.9 });

  // Central core — red/orange glow
  g.rect(-12, -20, 24, 16);
  g.fill({ color: 0xff3322, alpha: 0.9 });

  // Eye visor — bright red slit
  g.rect(-20, -BODY_H + 12, 40, 6);
  g.fill({ color: 0xff0000, alpha: 1.0 });

  // Shoulder pauldrons
  g.rect(-BODY_W - 6, -BODY_H + 2, 12, 30);
  g.fill({ color: 0x444466, alpha: 0.9 });
  g.rect(BODY_W - 6, -BODY_H + 2, 12, 30);
  g.fill({ color: 0x444466, alpha: 0.9 });

  // Cyan accent lines (cyberpunk)
  g.rect(-BODY_W + 2, -2, BODY_W * 2 - 4, 4);
  g.fill({ color: 0x44ffff, alpha: 0.6 });

  return g;
}
```

**Step 2: Add re-export to `src/entities/create-enemy.ts`**

```typescript
export { createBossWarden } from './create-boss-warden.js';
```

**Step 3: Verify build**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/entities/create-boss-warden.ts src/entities/create-enemy.ts
git commit -m "feat: add Boss Warden entity factory (300 HP, 3x player size)"
```

---

## Task 4: Boss AI System — Phase 1 (Patrol + Charge)

Create the BossAISystem that drives the Warden's behaviour.

**Files:**
- Create: `src/systems/boss-ai-system.ts`

**Step 1: Create `src/systems/boss-ai-system.ts`**

Phase 1 logic:
- **Patrol:** Slow walk back-and-forth across arena (1.5 m/s)
- **Windup:** After patrolTimer expires, stop and flash for 0.8s
- **Charge:** Dash at 8 m/s (2x walker chase of ~4 m/s) in chargeDirection for 0.6s
- **Cooldown:** Brief 1.5s pause after charge, then back to patrol

Phase transitions: phase 2 at 60% HP (180), phase 3 at 25% HP (75).

```typescript
/**
 * BossAISystem — drives the Warden boss through patrol, charge,
 * and laser sweep attack patterns based on HP-driven phases.
 *
 * Priority 16: after EnemyAISystem (15), before PlayerMovement (16).
 * Actually set to 14 to run BEFORE EnemyAI so boss entities are
 * processed here and skipped by EnemyAI.
 */

import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { Container } from 'pixi.js';
import type { BossComponent } from '../components/boss.js';
import type { TransformComponent } from '../components/index.js';

// -- Constants --

/** Patrol speed (m/s). */
const PATROL_SPEED = 1.5;

/** Charge speed (m/s) — 2x walker chase speed. */
const CHARGE_SPEED = 8;

/** Windup duration before charge (seconds). */
const WINDUP_DURATION = 0.8;

/** Charge duration (seconds). */
const CHARGE_DURATION = 0.6;

/** Cooldown after charge (seconds). */
const COOLDOWN_DURATION = 1.5;

/** Time between charges during patrol (seconds). */
const PATROL_ATTACK_INTERVAL = 3.0;

/** Phase 2 HP threshold (60% of 300). */
const PHASE2_HP = 180;

/** Phase 3 HP threshold (25% of 300). */
const PHASE3_HP = 75;

export class BossAISystem implements System {
  readonly priority = 14;

  private readonly physicsCtx: PhysicsContext;
  private readonly worldContainer: Container;

  constructor(physicsCtx: PhysicsContext, worldContainer: Container) {
    this.physicsCtx = physicsCtx;
    this.worldContainer = worldContainer;
  }

  update(world: World, dt: number): void {
    const playerTransform = this.getPlayerTransform(world);
    if (!playerTransform) return;

    const bosses = world.query('boss', 'enemy', 'transform', 'physicsBody', 'health');

    for (const entity of bosses) {
      const boss = world.getComponent(entity, 'boss');
      const enemy = world.getComponent(entity, 'enemy');
      const transform = world.getComponent(entity, 'transform');
      const pb = world.getComponent(entity, 'physicsBody');
      const health = world.getComponent(entity, 'health');
      if (!boss || !enemy || !transform || !pb || !health) continue;

      if (health.isDead || !boss.activated) continue;

      // Update phase based on HP
      this.updatePhase(boss, health.current);

      const body = this.physicsCtx.world.getRigidBody(pb.bodyHandle);
      if (!body) continue;

      switch (boss.attackState) {
        case 'patrol':
          this.handlePatrol(boss, enemy, body, transform, playerTransform, dt);
          break;
        case 'windup':
          this.handleWindup(boss, body, dt);
          break;
        case 'charging':
          this.handleCharge(boss, body, transform, dt);
          break;
        case 'cooldown':
          this.handleCooldown(boss, body, dt);
          break;
        case 'laser':
          this.handleLaser(boss, world, transform, body, dt);
          break;
      }
    }
  }

  /** Transition to new phase when HP drops below thresholds. */
  private updatePhase(boss: BossComponent, currentHp: number): void {
    if (boss.phase === 1 && currentHp <= PHASE2_HP) {
      boss.phase = 2;
    } else if (boss.phase === 2 && currentHp <= PHASE3_HP) {
      boss.phase = 3;
    }
  }

  /** Slow patrol across arena, counting down to next attack. */
  private handlePatrol(
    boss: BossComponent,
    enemy: { patrolDirection: -1 | 1 },
    body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, w: boolean): void },
    transform: TransformComponent,
    playerTransform: TransformComponent,
    dt: number,
  ): void {
    const vel = body.linvel();

    // Reverse at arena edges
    if (transform.x <= boss.arenaMinX + 40) enemy.patrolDirection = 1;
    if (transform.x >= boss.arenaMaxX - 40) enemy.patrolDirection = -1;

    body.setLinvel({ x: enemy.patrolDirection * PATROL_SPEED, y: vel.y }, true);

    boss.patrolTimer -= dt;
    if (boss.patrolTimer <= 0) {
      // Start windup — face toward player
      boss.chargeDirection = playerTransform.x > transform.x ? 1 : -1;
      boss.attackState = 'windup';
      boss.stateTimer = WINDUP_DURATION;
      body.setLinvel({ x: 0, y: vel.y }, true);
    }
  }

  /** Pause before charge — visual flash handled by render/effects. */
  private handleWindup(
    boss: BossComponent,
    body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, w: boolean): void },
    dt: number,
  ): void {
    const vel = body.linvel();
    body.setLinvel({ x: 0, y: vel.y }, true);

    boss.stateTimer -= dt;
    if (boss.stateTimer <= 0) {
      boss.attackState = 'charging';
      boss.stateTimer = CHARGE_DURATION;
    }
  }

  /** High-speed horizontal charge. */
  private handleCharge(
    boss: BossComponent,
    body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, w: boolean): void },
    transform: TransformComponent,
    dt: number,
  ): void {
    const vel = body.linvel();
    body.setLinvel({ x: boss.chargeDirection * CHARGE_SPEED, y: vel.y }, true);

    boss.stateTimer -= dt;

    // Stop if hitting arena edge
    const hitEdge = transform.x <= boss.arenaMinX + 20 || transform.x >= boss.arenaMaxX - 20;

    if (boss.stateTimer <= 0 || hitEdge) {
      body.setLinvel({ x: 0, y: vel.y }, true);
      // Phase 2+: alternate between charge and laser
      if (boss.phase >= 2 && boss.attackState === 'charging') {
        boss.attackState = 'laser';
        boss.stateTimer = 1.2; // laser duration
      } else {
        boss.attackState = 'cooldown';
        boss.stateTimer = COOLDOWN_DURATION;
      }
    }
  }

  /** Brief recovery, then back to patrol. */
  private handleCooldown(
    boss: BossComponent,
    body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, w: boolean): void },
    dt: number,
  ): void {
    const vel = body.linvel();
    body.setLinvel({ x: 0, y: vel.y }, true);

    boss.stateTimer -= dt;
    if (boss.stateTimer <= 0) {
      boss.attackState = 'patrol';
      boss.patrolTimer = PATROL_ATTACK_INTERVAL;
    }
  }

  /** Phase 2: fire horizontal laser sweep, then cooldown. */
  private handleLaser(
    boss: BossComponent,
    _world: World,
    _transform: TransformComponent,
    body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, w: boolean): void },
    dt: number,
  ): void {
    // Hold still during laser
    const vel = body.linvel();
    body.setLinvel({ x: 0, y: vel.y }, true);

    boss.stateTimer -= dt;
    if (boss.stateTimer <= 0) {
      boss.attackState = 'cooldown';
      boss.stateTimer = COOLDOWN_DURATION;
    }
  }

  private getPlayerTransform(world: World): TransformComponent | undefined {
    const players = world.query('player', 'transform');
    if (players.length === 0) return undefined;
    return world.getComponent(players[0], 'transform');
  }
}
```

Note: The laser projectile spawning will be added in Task 6. This task just sets up the state machine.

**Step 2: Verify build**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/systems/boss-ai-system.ts
git commit -m "feat: add BossAISystem with patrol/charge state machine (Phase 1 + 2)"
```

---

## Task 5: Boss Laser Projectile

Create the horizontal laser sweep — a wide, slow-moving beam projectile.

**Files:**
- Create: `src/entities/create-boss-laser.ts`
- Modify: `src/systems/boss-ai-system.ts` — spawn laser in `handleLaser`

**Step 1: Create `src/entities/create-boss-laser.ts`**

The laser is a tall, thin projectile that spans much of the arena height, moves slowly horizontally. Player must jump over it.

```typescript
/**
 * Boss laser projectile — a wide horizontal energy beam that moves
 * slowly across the boss arena. Player must jump over it.
 */

import RAPIER from '@dimforge/rapier2d-compat';
import { Graphics } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import { toPhysicsPos } from '../core/physics.js';
import { registerCollider } from '../core/collision-utils.js';
import { PIXELS_PER_METER } from '../core/constants.js';
import {
  createTransform,
  createPhysicsBody,
  createProjectile,
  createSprite,
} from '../components/index.js';

/** Laser beam width (pixels). */
const BEAM_WIDTH = 12;

/** Laser beam height — tall enough to block arena (pixels). */
const BEAM_HEIGHT = 200;

/** Horizontal speed of the laser sweep (m/s). */
const LASER_SPEED = 3;

/** Lifetime before auto-despawn (seconds). */
const LASER_LIFETIME = 4.0;

/** Damage dealt to player on contact. */
const LASER_DAMAGE = 20;

/**
 * Spawn a boss laser beam that sweeps horizontally.
 *
 * @param direction - -1 = moves left, 1 = moves right
 */
export function createBossLaser(
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  x: number,
  y: number,
  direction: -1 | 1,
  ownerEntity: Entity,
): Entity {
  const entity = world.createEntity();

  const physPos = toPhysicsPos(x, y);
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(physPos.x, physPos.y)
    .lockRotations()
    .setGravityScale(0);
  const body = physicsCtx.world.createRigidBody(bodyDesc);

  body.setLinvel({ x: direction * LASER_SPEED, y: 0 }, true);

  const colliderW = (BEAM_WIDTH / 2) / PIXELS_PER_METER;
  const colliderH = (BEAM_HEIGHT / 2) / PIXELS_PER_METER;
  const colliderDesc = RAPIER.ColliderDesc.cuboid(colliderW, colliderH).setSensor(true);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createProjectile(
    LASER_DAMAGE, ownerEntity, LASER_LIFETIME, LASER_SPEED,
  ));

  // Tall red/orange energy beam visual
  const gfx = new Graphics();
  gfx.rect(-BEAM_WIDTH / 2 - 4, -BEAM_HEIGHT / 2, BEAM_WIDTH + 8, BEAM_HEIGHT);
  gfx.fill({ color: 0xff4400, alpha: 0.25 });
  gfx.rect(-BEAM_WIDTH / 2, -BEAM_HEIGHT / 2, BEAM_WIDTH, BEAM_HEIGHT);
  gfx.fill({ color: 0xff2200, alpha: 0.7 });
  gfx.rect(-2, -BEAM_HEIGHT / 2 + 4, 4, BEAM_HEIGHT - 8);
  gfx.fill({ color: 0xffaa00, alpha: 1.0 });
  worldContainer.addChild(gfx);

  world.addComponent(entity, createSprite(gfx, BEAM_WIDTH, BEAM_HEIGHT));
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}
```

**Step 2: Update `handleLaser` in `src/systems/boss-ai-system.ts`**

Add import at top:
```typescript
import { createBossLaser } from '../entities/create-boss-laser.js';
```

Replace the `handleLaser` method to spawn a laser on entry:

```typescript
/** Phase 2: fire horizontal laser sweep, then cooldown. */
private handleLaser(
  boss: BossComponent,
  world: World,
  transform: TransformComponent,
  body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, w: boolean): void },
  dt: number,
  entity: Entity,
): void {
  const vel = body.linvel();
  body.setLinvel({ x: 0, y: vel.y }, true);

  // Spawn laser on first frame of laser state
  if (boss.stateTimer === 1.2) {
    // Fire laser in the opposite direction of last charge
    const laserDir = (boss.chargeDirection * -1) as -1 | 1;
    createBossLaser(
      world, this.physicsCtx, this.worldContainer,
      transform.x, transform.y,
      laserDir, entity,
    );
  }

  boss.stateTimer -= dt;
  if (boss.stateTimer <= 0) {
    boss.attackState = 'cooldown';
    boss.stateTimer = COOLDOWN_DURATION;
  }
}
```

Also update the call site in `update()` to pass `entity`:
```typescript
case 'laser':
  this.handleLaser(boss, world, transform, body, dt, entity);
  break;
```

Note: The "spawn on first frame" check (`stateTimer === 1.2`) is fragile. Better approach: add a `laserFired` boolean flag to `BossComponent`, reset to false when entering laser state, set to true after spawning. Update `BossComponent` accordingly:
- Add field: `laserFired: boolean` (default `false`)
- In handleCharge, when transitioning to laser: `boss.laserFired = false;`
- In handleLaser: `if (!boss.laserFired) { spawn laser; boss.laserFired = true; }`

**Step 3: Update BossComponent**

Add to `src/components/boss.ts`:
```typescript
/** Whether the laser has been fired in the current laser state. */
laserFired: boolean;
```

Default in factory: `laserFired: false`

**Step 4: Update handleLaser with laserFired flag**

```typescript
private handleLaser(
  boss: BossComponent,
  world: World,
  transform: TransformComponent,
  body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, w: boolean): void },
  dt: number,
  entity: Entity,
): void {
  const vel = body.linvel();
  body.setLinvel({ x: 0, y: vel.y }, true);

  if (!boss.laserFired) {
    boss.laserFired = true;
    const laserDir = (boss.chargeDirection * -1) as -1 | 1;
    createBossLaser(
      world, this.physicsCtx, this.worldContainer,
      transform.x, transform.y,
      laserDir, entity,
    );
  }

  boss.stateTimer -= dt;
  if (boss.stateTimer <= 0) {
    boss.attackState = 'cooldown';
    boss.stateTimer = COOLDOWN_DURATION;
  }
}
```

**Step 5: Verify build**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/entities/create-boss-laser.ts src/systems/boss-ai-system.ts src/components/boss.ts
git commit -m "feat: add boss laser sweep projectile (Phase 2 attack)"
```

---

## Task 6: Boss Arena + Neon Outpost Level Changes

Add the boss arena to the far-right end of Neon Outpost. Expand level width to fit.

**Files:**
- Modify: `src/level/extra-levels.ts` — update `NEON_OUTPOST`
- Modify: `src/level/level-data.ts` — add `'enemy-boss-warden'` to `SpawnPointDef.type` and add optional `bossTriggerX` to `LevelData`

**Step 1: Update `SpawnPointDef` type union in `src/level/level-data.ts`**

Add `| 'enemy-boss-warden'` to the type union in `SpawnPointDef`.

Add to `LevelData` interface:
```typescript
/** X coordinate that triggers boss spawn when player crosses it (pixels). */
bossTriggerX?: number;
/** Arena bounds for boss fight [minX, maxX] (pixels). */
bossArena?: { minX: number; maxX: number; y: number };
```

**Step 2: Update `NEON_OUTPOST` in `src/level/extra-levels.ts`**

Expand width from 2800 to 3600 to fit the boss arena. Add:
- Wide floor platform at far right (~800px wide): `{ x: 3200, y: 1360, width: 800, height: 80 }`
- Right wall moved from 2790 to 3590: `{ x: 3590, y: 700, width: 20, height: 1400 }`
- Two elevated dodge platforms in the arena:
  - `{ x: 3000, y: 1100, width: 160, height: 24 }`
  - `{ x: 3400, y: 1100, width: 160, height: 24 }`
- Boss spawn point: `{ x: 3200, y: 1280, type: 'enemy-boss-warden' }`
- `bossTriggerX: 2850`
- `bossArena: { minX: 2800, maxX: 3580, y: 1280 }`

**Step 3: Verify build**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/level/level-data.ts src/level/extra-levels.ts
git commit -m "feat: add boss arena platforms to Neon Outpost level"
```

---

## Task 7: Boss Spawn Trigger + Enemy Spawning

Wire up the boss spawn — when player crosses the trigger X and all normal enemies are dead, spawn the boss.

**Files:**
- Modify: `src/level/spawn-enemies.ts` — add boss-warden case (but DON'T spawn immediately — just store the data)
- Create: `src/systems/boss-trigger-system.ts` — checks player X, enemy count, spawns boss

**Step 1: Update `src/level/spawn-enemies.ts`**

The boss should NOT be spawned at level start. Skip `enemy-boss-warden` in `spawnEnemies`.

Add a comment and skip case:
```typescript
case 'enemy-boss-warden':
  // Boss spawned dynamically by BossTriggerSystem
  break;
```

**Step 2: Create `src/systems/boss-trigger-system.ts`**

This system:
- Checks if player has crossed `bossTriggerX`
- Checks if all regular enemies are dead (no living enemy entities without a boss component)
- Spawns the boss, activates it
- Only runs once

```typescript
/**
 * BossTriggerSystem — spawns the boss when the player crosses the
 * trigger line and all normal enemies have been eliminated.
 *
 * Priority 13: runs before BossAISystem (14) and EnemyAISystem (15).
 */

import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { Container } from 'pixi.js';
import type { LevelData } from '../level/level-data.js';
import { createBossWarden } from '../entities/create-boss-warden.js';

export class BossTriggerSystem implements System {
  readonly priority = 13;

  private readonly physicsCtx: PhysicsContext;
  private readonly worldContainer: Container;
  private readonly levelData: LevelData;
  private triggered = false;
  private bossSpawned = false;

  constructor(
    physicsCtx: PhysicsContext,
    worldContainer: Container,
    levelData: LevelData,
  ) {
    this.physicsCtx = physicsCtx;
    this.worldContainer = worldContainer;
    this.levelData = levelData;
  }

  update(world: World, _dt: number): void {
    if (this.bossSpawned) return;
    if (!this.levelData.bossTriggerX || !this.levelData.bossArena) return;

    // Find player position
    const players = world.query('player', 'transform');
    if (players.length === 0) return;
    const playerTransform = world.getComponent(players[0], 'transform');
    if (!playerTransform) return;

    // Check if player has crossed the trigger line
    if (!this.triggered) {
      if (playerTransform.x >= this.levelData.bossTriggerX) {
        this.triggered = true;
      } else {
        return;
      }
    }

    // Check if all normal enemies are dead
    const enemies = world.query('enemy', 'health');
    for (const entity of enemies) {
      // If any living enemy exists that is NOT a boss, wait
      const boss = world.getComponent(entity, 'boss');
      if (boss) continue;

      const health = world.getComponent(entity, 'health');
      if (health && !health.isDead) return;
    }

    // All clear — spawn the boss!
    const arena = this.levelData.bossArena;
    const bossSpawn = this.levelData.bossArena;

    const bossEntity = createBossWarden(
      world, this.physicsCtx, this.worldContainer,
      (arena.minX + arena.maxX) / 2, arena.y,
      arena.minX, arena.maxX,
    );

    // Activate the boss
    const boss = world.getComponent(bossEntity, 'boss');
    if (boss) boss.activated = true;

    this.bossSpawned = true;
  }
}
```

**Step 3: Verify build**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/systems/boss-trigger-system.ts src/level/spawn-enemies.ts
git commit -m "feat: add BossTriggerSystem for boss spawn on arena entry"
```

---

## Task 8: Boss Health Bar HUD

Add a dedicated boss health bar at bottom-centre of screen, visible only during boss fight.

**Files:**
- Create: `src/ui/boss-health-bar.ts`
- Modify: `src/systems/hud-system.ts` — add boss health bar

**Step 1: Create `src/ui/boss-health-bar.ts`**

```typescript
/**
 * BossHealthBar — large health bar at bottom-centre of screen.
 * Shows boss name "THE WARDEN" above the bar.
 * Only visible when a boss entity exists and is alive.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';

const BAR_WIDTH = 400;
const BAR_HEIGHT = 24;
const MARGIN_BOTTOM = 60;

const NAME_STYLE = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 18,
  fill: 0xff4444,
  fontWeight: 'bold',
});

export class BossHealthBar {
  readonly container: Container;

  private readonly background: Graphics;
  private readonly foreground: Graphics;
  private readonly border: Graphics;
  private readonly nameLabel: Text;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    // Background
    this.background = new Graphics();
    this.background.rect(-BAR_WIDTH / 2, 0, BAR_WIDTH, BAR_HEIGHT);
    this.background.fill(0x222222);

    // Foreground (health fill)
    this.foreground = new Graphics();

    // Border
    this.border = new Graphics();
    this.border.rect(-BAR_WIDTH / 2, 0, BAR_WIDTH, BAR_HEIGHT);
    this.border.stroke({ color: 0xff4444, width: 2 });

    // Boss name label
    this.nameLabel = new Text({ text: 'THE WARDEN', style: NAME_STYLE });
    this.nameLabel.anchor.set(0.5, 1);
    this.nameLabel.y = -6;

    this.container.addChild(
      this.background, this.foreground, this.border, this.nameLabel,
    );
  }

  /** Reposition based on screen size (call once or on resize). */
  reposition(screenWidth: number, screenHeight: number): void {
    this.container.x = screenWidth / 2;
    this.container.y = screenHeight - MARGIN_BOTTOM;
  }

  /** Update bar fill. Shows container when called, hides when hide() called. */
  update(current: number, max: number): void {
    this.container.visible = true;
    const ratio = Math.max(0, Math.min(1, current / max));
    const width = ratio * BAR_WIDTH;

    // Color: red when low, orange mid, red-orange high
    let color: number;
    if (ratio > 0.6) color = 0xff4444;
    else if (ratio > 0.3) color = 0xff6622;
    else color = 0xff2200;

    this.foreground.clear();
    this.foreground.rect(-BAR_WIDTH / 2, 0, width, BAR_HEIGHT);
    this.foreground.fill(color);
  }

  /** Hide the boss health bar (boss dead or not in fight). */
  hide(): void {
    this.container.visible = false;
  }
}
```

**Step 2: Update `src/systems/hud-system.ts`**

Add boss health bar management. Import and create `BossHealthBar`. In `update()`:
- Query for entities with both `'boss'` and `'health'` components
- If a living boss exists and is activated → update boss health bar
- Otherwise → hide it

Add to imports:
```typescript
import { BossHealthBar } from '../ui/boss-health-bar.js';
```

Add to constructor:
```typescript
this.bossHealthBar = new BossHealthBar();
this.bossHealthBar.reposition(window.innerWidth, window.innerHeight);
uiContainer.addChild(this.bossHealthBar.container);
```

Add field: `private readonly bossHealthBar: BossHealthBar;`

Add to `update()` after existing logic:
```typescript
// Boss health bar
const bossEntities = world.query('boss', 'health');
let bossVisible = false;
for (const bossEntity of bossEntities) {
  const bossComp = world.getComponent(bossEntity, 'boss');
  const bossHealth = world.getComponent(bossEntity, 'health');
  if (bossComp?.activated && bossHealth && !bossHealth.isDead) {
    this.bossHealthBar.update(bossHealth.current, bossHealth.max);
    bossVisible = true;
    break;
  }
}
if (!bossVisible) this.bossHealthBar.hide();
```

**Step 3: Verify build**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/ui/boss-health-bar.ts src/systems/hud-system.ts
git commit -m "feat: add boss health bar HUD (bottom-centre, shows THE WARDEN)"
```

---

## Task 9: Wire Into Game + DamageSystem Boss Scrap

Connect BossTriggerSystem and BossAISystem to the game loop. Update DamageSystem for boss scrap reward.

**Files:**
- Modify: `src/core/game.ts` — add BossTriggerSystem + BossAISystem to `loadLevel()`
- Modify: `src/systems/damage-system.ts` — add boss scrap value (200)

**Step 1: Update `src/core/game.ts`**

Add imports:
```typescript
import { BossAISystem } from '../systems/boss-ai-system.js';
import { BossTriggerSystem } from '../systems/boss-trigger-system.js';
```

In `loadLevel()`, after creating `EnemyAISystem`, add:
```typescript
this.addSystem(new BossTriggerSystem(
  this.physicsCtx, this.worldContainer, levelData,
));
this.addSystem(new BossAISystem(this.physicsCtx, this.worldContainer));
```

**Step 2: Update `src/systems/damage-system.ts`**

In `getScrapValue()`, add a case:
```typescript
case 'boss-warden': return 200;
```

Wait — the boss uses `enemyType: 'walker'` from its EnemyComponent. We need a way to identify it as a boss for scrap purposes.

Better approach: In `queueDeadEnemies()`, check if the entity also has a `boss` component. If so, award 200 scrap instead of the normal amount.

Update `queueDeadEnemies`:
```typescript
private queueDeadEnemies(world: World): void {
  const enemies = world.query('enemy', 'health');

  for (const entity of enemies) {
    const health = world.getComponent(entity, 'health');
    if (!health) continue;

    if (health.isDead) {
      this.entityManager.markForDestruction(entity);
      this.soundManager.play('enemy-death');

      // Boss entities get special scrap reward
      const bossComp = world.getComponent(entity, 'boss');
      const enemy = world.getComponent(entity, 'enemy');
      const scrapAmount = bossComp ? 200
        : enemy ? this.getScrapValue(enemy.enemyType) : 5;
      addScrap(this.gameState, scrapAmount);

      const transform = world.getComponent(entity, 'transform');
      if (transform) {
        spawnFloatText(
          this.worldContainer,
          transform.x,
          transform.y - 20,
          `+${scrapAmount}`,
        );
      }
    }
  }
}
```

**Step 3: Verify build**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/core/game.ts src/systems/damage-system.ts
git commit -m "feat: wire boss systems into game loop, 200 scrap boss reward"
```

---

## Task 10: Boss Laser Damage to Player

The boss laser is a projectile entity. Currently `ProjectileSystem` checks for enemy hits only. We need the laser (and other "enemy projectiles") to damage the player.

**Files:**
- Modify: `src/systems/projectile-system.ts` — add player hit check for projectiles not owned by the player/mech

**Step 1: Update `ProjectileSystem.update()`**

After the enemy hit-check loop, add a player hit-check for enemy-owned projectiles:

```typescript
// 3. Check proximity-based hit against player (enemy projectiles)
const players = world.query('player', 'transform', 'health');
for (const playerEntity of players) {
  const playerTransform = world.getComponent(playerEntity, 'transform');
  const playerHealth = world.getComponent(playerEntity, 'health');
  if (!playerTransform || !playerHealth) continue;

  // Skip if this projectile was fired by a player-owned entity
  if (proj.ownerEntity === playerEntity) continue;

  // Skip if player is dead or invincible
  if (playerHealth.isDead || playerHealth.invincibleTimer > 0) continue;

  const pdx = playerTransform.x - projTransform.x;
  const pdy = playerTransform.y - projTransform.y;
  const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

  // Larger hit distance for boss laser (wider beam)
  const hitDist = 30; // generous for wide beam
  if (pdist < hitDist) {
    playerHealth.current = Math.max(0, playerHealth.current - proj.damage);
    if (playerHealth.current <= 0) playerHealth.isDead = true;
    playerHealth.invincibleTimer = 1.0;
    this.entityManager.markForDestruction(entity);
    this.soundManager.play('hit');
    break;
  }
}
```

But we need to be careful — mech projectiles should NOT hit the player, and boss laser SHOULD hit the player. The check is: if `ownerEntity` is NOT a mech/player entity, check against the player.

Simpler: check if the projectile owner has a `boss` component. If it does, it's an enemy projectile → check against player.

```typescript
// 3. Boss projectiles can hit the player
const boss = world.getComponent(proj.ownerEntity, 'boss');
if (boss) {
  const players = world.query('player', 'transform', 'health');
  for (const playerEntity of players) {
    const pt = world.getComponent(playerEntity, 'transform');
    const ph = world.getComponent(playerEntity, 'health');
    if (!pt || !ph || ph.isDead || ph.invincibleTimer > 0) continue;

    const pdx = pt.x - projTransform.x;
    const pdy = pt.y - projTransform.y;
    const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

    if (pdist < 30) {
      ph.current = Math.max(0, ph.current - proj.damage);
      if (ph.current <= 0) ph.isDead = true;
      ph.invincibleTimer = 1.0;
      this.entityManager.markForDestruction(entity);
      this.soundManager.play('hit');
      break;
    }
  }
}
```

**Step 2: Verify build**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/systems/projectile-system.ts
git commit -m "feat: boss laser projectiles can damage the player"
```

---

## Task 11: Windup Visual Flash

When the boss is in 'windup' state, flash the sprite red/white to telegraph the charge.

**Files:**
- Modify: `src/systems/boss-ai-system.ts` — add visual flash during windup

**Step 1: Update BossAISystem**

In the `update()` loop, after the state switch, add a visual flash for windup:

```typescript
// Visual: flash during windup
const sprite = world.getComponent(entity, 'sprite');
if (sprite) {
  const gfx = sprite.displayObject;
  if (boss.attackState === 'windup') {
    // Flash between red and white
    const flash = Math.sin(boss.stateTimer * 20) > 0;
    gfx.tint = flash ? 0xff4444 : 0xffffff;
  } else if (boss.attackState === 'charging') {
    gfx.tint = 0xff6644; // orange tint while charging
  } else {
    gfx.tint = 0xffffff; // reset
  }
}
```

**Step 2: Verify build**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/systems/boss-ai-system.ts
git commit -m "feat: boss windup visual flash + charge tint"
```

---

## Task 12: EnemyAI Skip Boss Entities

The EnemyAISystem currently processes all entities with 'enemy' component, including the boss. We need to skip boss entities so they're only handled by BossAISystem.

**Files:**
- Modify: `src/systems/enemy-ai-system.ts`

**Step 1: In the enemy loop, skip entities that have a boss component**

```typescript
// Skip boss entities — handled by BossAISystem
const bossComp = world.getComponent(entity, 'boss');
if (bossComp) continue;
```

Add this right after the `if (health && health.isDead) continue;` check.

**Step 2: Verify build + Commit**

```bash
npx tsc --noEmit
git add src/systems/enemy-ai-system.ts
git commit -m "feat: EnemyAISystem skips boss entities"
```

---

## Task 13: Full Integration Verification

**Step 1: Start dev server and test**

```bash
cd ".worktrees/phase2e3"
npx vite --port 3001
```

**Step 2: Manual test checklist**

1. Launch game → Hub screen loads
2. Deploy to Neon Outpost (need Ship Tier 2 — may need to test with Zeta Station first to earn scrap, or temporarily set scrap/tier in game-state)
3. Play through Neon Outpost, defeat all normal enemies
4. Cross the trigger line (X > 2850)
5. Boss spawns in the arena — large mech visible
6. Boss health bar appears at bottom-centre with "THE WARDEN" label
7. Boss patrols back and forth across arena
8. Boss winds up (flashes red/white), then charges at high speed
9. Boss is vulnerable between charges — shoot it
10. At 60% HP, boss enters Phase 2 — charges then fires horizontal laser
11. Laser moves horizontally — must jump over it
12. Boss awards 200 scrap on death
13. Boss health bar disappears after boss dies

**Step 3: Fix any issues found during testing**

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Boss Warden fight complete (Phases 1-2) — Phase 2e-3"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Git worktree setup | — |
| 2 | BossComponent + ECS registration | `boss.ts`, `types.ts`, `index.ts` |
| 3 | Boss Warden entity factory | `create-boss-warden.ts` |
| 4 | BossAISystem (patrol + charge) | `boss-ai-system.ts` |
| 5 | Boss laser projectile | `create-boss-laser.ts` |
| 6 | Arena + level changes | `extra-levels.ts`, `level-data.ts` |
| 7 | Boss spawn trigger | `boss-trigger-system.ts`, `spawn-enemies.ts` |
| 8 | Boss health bar HUD | `boss-health-bar.ts`, `hud-system.ts` |
| 9 | Wire into Game + scrap reward | `game.ts`, `damage-system.ts` |
| 10 | Laser damages player | `projectile-system.ts` |
| 11 | Windup visual flash | `boss-ai-system.ts` |
| 12 | EnemyAI skip boss | `enemy-ai-system.ts` |
| 13 | Integration test | Manual browser test |
