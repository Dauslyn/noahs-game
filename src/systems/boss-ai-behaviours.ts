/**
 * Boss AI state handler functions — patrol, windup, charge, laser, cooldown.
 * Extracted from BossAISystem to keep files under 250 lines.
 */

import type { Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { Container } from 'pixi.js';
import type { BossComponent } from '../components/boss.js';
import type { TransformComponent } from '../components/index.js';
import { createBossLaser } from '../entities/create-boss-laser.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Patrol speed (m/s). */
const PATROL_SPEED = 1.5;

/** Charge speed (m/s) — ~2x walker chase speed. */
const CHARGE_SPEED = 8;

/** Windup duration before charge (seconds). */
const WINDUP_DURATION = 0.8;

/** Charge duration (seconds). */
const CHARGE_DURATION = 0.6;

/** Cooldown after attack (seconds). */
const COOLDOWN_DURATION = 1.5;

/** Time between charges during patrol (seconds). */
const PATROL_ATTACK_INTERVAL = 3.0;

/** Laser state duration (seconds). */
const LASER_DURATION = 1.2;

// ---------------------------------------------------------------------------
// Rapier body shape (duck-typed for method access)
// ---------------------------------------------------------------------------

type RapierBody = {
  linvel(): { x: number; y: number };
  setLinvel(v: { x: number; y: number }, w: boolean): void;
};

// ---------------------------------------------------------------------------
// State handlers
// ---------------------------------------------------------------------------

/** Slow patrol across arena, counting down to next attack. */
export function handlePatrol(
  boss: BossComponent,
  enemy: { patrolDirection: -1 | 1 },
  body: RapierBody,
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
    // Face toward player and begin windup
    boss.chargeDirection = playerTransform.x > transform.x ? 1 : -1;
    boss.attackState = 'windup';
    boss.stateTimer = WINDUP_DURATION;
    body.setLinvel({ x: 0, y: vel.y }, true);
  }
}

/** Pause before charge — visual flash telegraphs the attack. */
export function handleWindup(
  boss: BossComponent,
  body: RapierBody,
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

/** High-speed horizontal charge across the arena. */
export function handleCharge(
  boss: BossComponent,
  body: RapierBody,
  transform: TransformComponent,
  dt: number,
): void {
  const vel = body.linvel();
  body.setLinvel({ x: boss.chargeDirection * CHARGE_SPEED, y: vel.y }, true);

  boss.stateTimer -= dt;

  // Stop if hitting arena edge
  const hitEdge =
    transform.x <= boss.arenaMinX + 20
    || transform.x >= boss.arenaMaxX - 20;

  if (boss.stateTimer <= 0 || hitEdge) {
    body.setLinvel({ x: 0, y: vel.y }, true);

    // Phase 2+: fire laser after charge
    if (boss.phase >= 2) {
      boss.attackState = 'laser';
      boss.stateTimer = LASER_DURATION;
      boss.laserFired = false;
    } else {
      boss.attackState = 'cooldown';
      boss.stateTimer = COOLDOWN_DURATION;
    }
  }
}

/** Phase 2: fire horizontal laser sweep, then cooldown. */
export function handleLaser(
  boss: BossComponent,
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  transform: TransformComponent,
  body: RapierBody,
  dt: number,
  entity: Entity,
): void {
  const vel = body.linvel();
  body.setLinvel({ x: 0, y: vel.y }, true);

  // Spawn laser on first frame of laser state
  if (!boss.laserFired) {
    boss.laserFired = true;
    // Fire laser opposite to last charge direction
    const laserDir = (boss.chargeDirection * -1) as -1 | 1;
    createBossLaser(
      world, physicsCtx, worldContainer,
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

/** Brief recovery, then back to patrol. */
export function handleCooldown(
  boss: BossComponent,
  body: RapierBody,
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
