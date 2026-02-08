/**
 * Projectile entity factory – creates a laser bolt with a dynamic sensor
 * physics body (zero gravity) and a thin yellow line visual.
 *
 * The projectile travels at a fixed velocity until its lifetime expires
 * or it collides with an enemy.
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
  createProjectile,
  createSprite,
} from '../components/index.js';

// ---------------------------------------------------------------------------
// Visual dimensions (pixels)
// ---------------------------------------------------------------------------

/** Laser bolt visual width (pixels). */
const BOLT_WIDTH = 8;

/** Laser bolt visual height (pixels). */
const BOLT_HEIGHT = 3;

/** Default lifetime before auto-despawn (seconds). */
const DEFAULT_LIFETIME = 2.0;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a projectile entity with a dynamic sensor body, thin yellow sprite,
 * and projectile component for lifetime tracking.
 *
 * @param world          - the ECS world
 * @param physicsCtx     - shared physics context (Rapier world)
 * @param worldContainer - PixiJS container for world-space visuals
 * @param x              - spawn X position (pixels)
 * @param y              - spawn Y position (pixels)
 * @param vx             - horizontal velocity (m/s)
 * @param vy             - vertical velocity (m/s)
 * @param damage         - damage dealt on hit
 * @param ownerEntity    - entity that fired this projectile
 * @returns the newly created entity ID
 */
export function createProjectileEntity(
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  x: number,
  y: number,
  vx: number,
  vy: number,
  damage: number,
  ownerEntity: Entity,
): Entity {
  const entity = world.createEntity();

  // -- Physics body (dynamic, no gravity, locked rotation) --
  const physPos = toPhysicsPos(x, y);
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(physPos.x, physPos.y)
    .lockRotations()
    .setGravityScale(0);
  const body = physicsCtx.world.createRigidBody(bodyDesc);

  // Set initial velocity in m/s
  body.setLinvel({ x: vx, y: vy }, true);

  // Small cuboid collider as a SENSOR (no physical collision response)
  const colliderDesc = RAPIER.ColliderDesc.cuboid(0.08, 0.02).setSensor(true);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));

  // Compute speed from velocity magnitude for the component
  const speed = Math.sqrt(vx * vx + vy * vy);
  world.addComponent(
    entity,
    createProjectile(damage, ownerEntity, DEFAULT_LIFETIME, speed),
  );

  // -- Sci-fi laser bolt sprite --
  const gfx = new Graphics();

  // Outer glow trail (wider, dimmer)
  gfx.rect(-BOLT_WIDTH / 2 - 2, -BOLT_HEIGHT, BOLT_WIDTH + 4, BOLT_HEIGHT * 2);
  gfx.fill({ color: 0xffff00, alpha: 0.3 });

  // Core beam (bright white-yellow)
  gfx.rect(-BOLT_WIDTH / 2, -BOLT_HEIGHT / 2, BOLT_WIDTH, BOLT_HEIGHT);
  gfx.fill(0xffffcc);

  // Hot centre line
  gfx.rect(-BOLT_WIDTH / 2 + 1, -0.5, BOLT_WIDTH - 2, 1);
  gfx.fill(0xffffff);

  // Rotate to match velocity direction: atan2(vy, vx)
  gfx.rotation = Math.atan2(vy, vx);
  worldContainer.addChild(gfx);

  world.addComponent(
    entity,
    createSprite(gfx, BOLT_WIDTH, BOLT_HEIGHT),
  );

  // -- Register collider for collision lookups --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}
