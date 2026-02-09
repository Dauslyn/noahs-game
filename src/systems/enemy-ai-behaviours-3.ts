/**
 * Enemy AI behaviours for the Shielder enemy (Neon Outpost).
 * Separated from behaviours-2.ts to stay under 250 lines.
 *
 * Shielder: slow ground patrol, rotates shield to face player,
 * periodically charges at the player with shield lowered.
 */

import type { PhysicsContext } from '../core/physics.js';
import type { TransformComponent, EnemyComponent } from '../components/index.js';
import type { SpriteComponent } from '../components/sprite.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Slow patrol speed (m/s). */
const PATROL_SPEED = 1.2;

/** Charge speed when attacking (m/s). */
const CHARGE_SPEED = 4.5;

/** Duration of the charge attack (seconds). */
const CHARGE_DURATION = 0.5;

/** Wind-up time before charging — shield is lowered during this (seconds). */
const WINDUP_DURATION = 0.6;

/** Cooldown between charge attacks (seconds). */
const CHARGE_COOLDOWN = 3.0;

/** Initial cooldown so shielders don't all charge at once. */
const INITIAL_COOLDOWN = 1.5;

// ---------------------------------------------------------------------------
// Shielder AI
// ---------------------------------------------------------------------------

/**
 * Shielder AI: slow ground patrol, rotates shield toward player,
 * periodically wind-up then charges.
 *
 * States:
 * - 'patrolling': slow patrol, shield faces player, counting down to attack
 * - 'idle': wind-up before charge (shield lowered — vulnerable!)
 * - 'attacking': charging toward player
 * - 'chasing': cooldown after charge, back to patrol behaviour
 *
 * @param sprite - optional, used to flip the shield visual
 */
export function updateShielder(
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

  // Always face shield toward player when in range
  if (inRange && enemy.state !== 'idle') {
    const newDir = playerTransform.x > transform.x ? 1 : -1;
    enemy.shieldDirection = newDir as -1 | 1;
  }

  // Flip shield visual to match direction
  if (sprite) {
    updateShieldVisual(sprite, enemy.shieldDirection, enemy.state === 'idle');
  }

  switch (enemy.state) {
    case 'patrolling':
      handlePatrol(physicsCtx, enemy, body, transform, inRange, dt);
      break;
    case 'idle':
      handleWindup(enemy, body, dt);
      break;
    case 'attacking':
      handleCharge(enemy, body, transform, playerTransform, dt);
      break;
    case 'chasing':
      handleCooldown(physicsCtx, enemy, body, transform, dt);
      break;
  }
}

/** Slow patrol. Shield faces player. Count down to charge. */
function handlePatrol(
  physicsCtx: PhysicsContext,
  enemy: EnemyComponent,
  body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, wake: boolean): void },
  transform: TransformComponent,
  inRange: boolean,
  dt: number,
): void {
  // Patrol back and forth
  const currentVel = body.linvel();
  const dx = transform.x - enemy.patrolOriginX;

  if (Math.abs(dx) > enemy.patrolDistance) {
    enemy.patrolDirection = dx > 0 ? -1 : 1;
  }

  body.setLinvel({
    x: enemy.patrolDirection * PATROL_SPEED,
    y: currentVel.y,
  }, true);

  // Count down to attack
  enemy.actionTimer -= dt;
  if (enemy.actionTimer <= 0 && inRange) {
    // Start wind-up (shield lowers — vulnerable!)
    enemy.state = 'idle';
    enemy.actionTimer = WINDUP_DURATION;
    body.setLinvel({ x: 0, y: currentVel.y }, true);
  } else if (enemy.actionTimer <= 0) {
    enemy.actionTimer = INITIAL_COOLDOWN;
  }
}

/** Wind-up before charge. Shield is lowered — player can shoot freely. */
function handleWindup(
  enemy: EnemyComponent,
  body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, wake: boolean): void },
  dt: number,
): void {
  // Hold still during wind-up
  const vel = body.linvel();
  body.setLinvel({ x: 0, y: vel.y }, true);

  enemy.actionTimer -= dt;
  if (enemy.actionTimer <= 0) {
    // Wind-up complete — charge!
    enemy.state = 'attacking';
    enemy.actionTimer = CHARGE_DURATION;
  }
}

/** Charge toward the player at high speed. */
function handleCharge(
  enemy: EnemyComponent,
  body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, wake: boolean): void },
  transform: TransformComponent,
  playerTransform: TransformComponent,
  dt: number,
): void {
  // Charge in the direction the shield was facing (toward player)
  const chargeDir = enemy.shieldDirection;
  const currentVel = body.linvel();
  body.setLinvel({ x: chargeDir * CHARGE_SPEED, y: currentVel.y }, true);

  enemy.actionTimer -= dt;
  if (enemy.actionTimer <= 0) {
    // Charge finished — enter cooldown
    enemy.state = 'chasing';
    enemy.actionTimer = CHARGE_COOLDOWN;
  }
}

/** Post-charge cooldown. Resume slow patrol behaviour. */
function handleCooldown(
  physicsCtx: PhysicsContext,
  enemy: EnemyComponent,
  body: { linvel(): { x: number; y: number }; setLinvel(v: { x: number; y: number }, wake: boolean): void },
  transform: TransformComponent,
  dt: number,
): void {
  // Slow patrol during cooldown
  const currentVel = body.linvel();
  const dx = transform.x - enemy.patrolOriginX;

  if (Math.abs(dx) > enemy.patrolDistance) {
    enemy.patrolDirection = dx > 0 ? -1 : 1;
  }

  body.setLinvel({
    x: enemy.patrolDirection * PATROL_SPEED,
    y: currentVel.y,
  }, true);

  enemy.actionTimer -= dt;
  if (enemy.actionTimer <= 0) {
    enemy.state = 'patrolling';
    enemy.actionTimer = CHARGE_COOLDOWN;
  }
}

/**
 * Flip the shield child graphic to match the current shield direction.
 * Hide the shield during wind-up (idle state) so the player sees the opening.
 */
function updateShieldVisual(
  sprite: SpriteComponent,
  direction: -1 | 1,
  isWindingUp: boolean,
): void {
  const gfx = sprite.displayObject;
  const shieldChild = gfx.getChildByLabel('shield');
  if (!shieldChild) return;

  // Shield visible unless winding up
  shieldChild.visible = !isWindingUp;

  // Flip entire sprite to face shield direction
  gfx.scale.x = direction;
}
