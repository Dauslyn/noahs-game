/**
 * Enemy AI behaviour functions – walker, flyer, and turret update logic.
 *
 * Extracted from EnemyAISystem to keep files under 250 lines.
 * Each function drives one enemy type's movement and actions per frame.
 */

import type { Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { Container } from 'pixi.js';
import type { TransformComponent, EnemyComponent } from '../components/index.js';
import { pixelsToMeters } from '../core/physics.js';
import { createProjectileEntity } from '../entities/create-projectile.js';

// ---------------------------------------------------------------------------
// AI constants
// ---------------------------------------------------------------------------

/** Walker horizontal speed while patrolling (m/s). */
const WALKER_PATROL_SPEED = 2;

/** Walker horizontal speed while chasing (m/s). */
const WALKER_CHASE_SPEED = 3;

/** Flyer bob amplitude (pixels). */
const FLYER_BOB_AMPLITUDE_PX = 20;

/** Flyer bob frequency (Hz). */
const FLYER_BOB_FREQUENCY = 1;

/** Flyer horizontal drift speed during patrol (m/s). */
const FLYER_DRIFT_SPEED = 0.5;

/** Flyer chase speed (m/s). */
const FLYER_CHASE_SPEED = 2;

/** Ground-check ray length below the walker's front edge (m). */
const WALKER_EDGE_RAY_LENGTH = 1.0;

/** Horizontal offset from walker centre for edge-detection ray (m). */
const WALKER_EDGE_RAY_OFFSET = 0.3;

// ---------------------------------------------------------------------------
// Walker
// ---------------------------------------------------------------------------

/**
 * Walker AI: patrol back and forth, chase when player is in range.
 * Uses edge-detection ray cast to avoid walking off platforms.
 */
export function updateWalker(
  physicsCtx: PhysicsContext,
  enemy: EnemyComponent,
  bodyHandle: number,
  transform: TransformComponent,
  playerTransform: TransformComponent,
  inRange: boolean,
): void {
  const body = physicsCtx.world.getRigidBody(bodyHandle);
  if (!body) return;

  if (inRange) {
    enemy.state = 'chasing';
    const dirX = playerTransform.x > transform.x ? 1 : -1;
    const currentVel = body.linvel();
    body.setLinvel({ x: dirX * WALKER_CHASE_SPEED, y: currentVel.y }, true);
    enemy.patrolDirection = dirX as -1 | 1;
  } else {
    enemy.state = 'patrolling';

    // Reverse if too far from patrol origin
    const distFromOrigin = transform.x - enemy.patrolOriginX;
    if (Math.abs(distFromOrigin) > enemy.patrolDistance) {
      enemy.patrolDirection = distFromOrigin > 0 ? -1 : 1;
    }

    // Edge detection: cast ray downward from front edge
    if (isAtEdge(physicsCtx, body, enemy.patrolDirection)) {
      enemy.patrolDirection = (enemy.patrolDirection * -1) as -1 | 1;
    }

    const currentVel = body.linvel();
    body.setLinvel(
      { x: enemy.patrolDirection * WALKER_PATROL_SPEED, y: currentVel.y },
      true,
    );
  }
}

/**
 * Cast a ray downward from the walker's front edge.
 * Returns true if no ground is found within range (edge detected).
 */
function isAtEdge(
  physicsCtx: PhysicsContext,
  body: { translation(): { x: number; y: number } },
  direction: -1 | 1,
): boolean {
  const pos = body.translation();

  // Ray origin: offset horizontally in patrol direction, slightly below feet
  const rayOrigin = {
    x: pos.x + direction * WALKER_EDGE_RAY_OFFSET,
    y: pos.y + 0.3,
  };
  const rayDir = { x: 0, y: 1 };

  const hit = physicsCtx.world.castRay(
    new physicsCtx.rapier.Ray(rayOrigin, rayDir),
    WALKER_EDGE_RAY_LENGTH,
    true,
  );

  return hit === null;
}

// ---------------------------------------------------------------------------
// Flyer
// ---------------------------------------------------------------------------

/**
 * Flyer AI: sine-wave bob during patrol, direct chase when player is in range.
 *
 * @param time - running time accumulator for sine wave phase
 */
export function updateFlyer(
  physicsCtx: PhysicsContext,
  enemy: EnemyComponent,
  bodyHandle: number,
  transform: TransformComponent,
  playerTransform: TransformComponent,
  dist: number,
  inRange: boolean,
  time: number,
): void {
  const body = physicsCtx.world.getRigidBody(bodyHandle);
  if (!body) return;

  if (inRange) {
    enemy.state = 'chasing';
    if (dist < 1) return; // Avoid division by zero

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const dirX = dx / dist;
    const dirY = dy / dist;

    body.setLinvel(
      { x: dirX * FLYER_CHASE_SPEED, y: dirY * FLYER_CHASE_SPEED },
      true,
    );
  } else {
    enemy.state = 'patrolling';

    // Bob velocity: d/dt[A*sin(wt)] = A*w*cos(wt), in metres/s
    const bobAmplitudeM = pixelsToMeters(FLYER_BOB_AMPLITUDE_PX);
    const omega = 2 * Math.PI * FLYER_BOB_FREQUENCY;
    const vy = bobAmplitudeM * omega * Math.cos(omega * time);

    body.setLinvel(
      { x: enemy.patrolDirection * FLYER_DRIFT_SPEED, y: vy },
      true,
    );
  }
}

// ---------------------------------------------------------------------------
// Turret
// ---------------------------------------------------------------------------

/**
 * Turret AI: fixed in place, fires projectiles at the player when in range.
 * Manages weapon cooldown and spawns projectile entities.
 */
export function updateTurret(
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  entity: Entity,
  transform: TransformComponent,
  playerTransform: TransformComponent,
  dist: number,
  inRange: boolean,
  dt: number,
): void {
  const weapon = world.getComponent(entity, 'weapon');
  if (!weapon) return;

  // Always decrement cooldown
  weapon.cooldownTimer -= dt;
  if (weapon.cooldownTimer < 0) weapon.cooldownTimer = 0;

  if (!inRange || dist < 1) return;
  if (weapon.cooldownTimer > 0) return;

  // Direction from turret to player (pixels)
  const dx = playerTransform.x - transform.x;
  const dy = playerTransform.y - transform.y;
  const dirX = dx / dist;
  const dirY = dy / dist;

  // Projectile velocity in m/s
  const vx = dirX * weapon.projectileSpeed;
  const vy = dirY * weapon.projectileSpeed;

  createProjectileEntity(
    world,
    physicsCtx,
    worldContainer,
    transform.x,
    transform.y,
    vx,
    vy,
    weapon.damage,
    entity,
  );

  // Reset cooldown: 1 / fireRate seconds between shots
  weapon.cooldownTimer = 1 / weapon.fireRate;
}
