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
import { PIXELS_PER_METER } from '../core/constants.js';
import type { ProjectileStyle } from '../combat/weapon-defs.js';
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
 * Create a projectile entity with a dynamic sensor body, styled bolt sprite,
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
 * @param style          - optional visual style (defaults to yellow laser bolt)
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
  style?: ProjectileStyle,
): Entity {
  const entity = world.createEntity();

  // Resolve visual dimensions and colours from style (with fallbacks)
  const w = style?.width ?? BOLT_WIDTH;
  const h = style?.height ?? BOLT_HEIGHT;
  const core = style?.coreColor ?? 0xffffcc;
  const glow = style?.glowColor ?? 0xffff00;

  // -- Physics body (dynamic, no gravity, locked rotation) --
  const physPos = toPhysicsPos(x, y);
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(physPos.x, physPos.y)
    .lockRotations()
    .setGravityScale(0);
  const body = physicsCtx.world.createRigidBody(bodyDesc);

  // Set initial velocity in m/s
  body.setLinvel({ x: vx, y: vy }, true);

  // Cuboid collider scaled to projectile dimensions (sensor, no physics response)
  const colliderW = (w / 2) / PIXELS_PER_METER;
  const colliderH = (h / 2) / PIXELS_PER_METER;
  const colliderDesc = RAPIER.ColliderDesc.cuboid(colliderW, colliderH).setSensor(true);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));

  // Compute speed from velocity magnitude for the component
  const speed = Math.sqrt(vx * vx + vy * vy);
  world.addComponent(
    entity,
    createProjectile(damage, ownerEntity, DEFAULT_LIFETIME, speed, style?.glowColor),
  );

  // -- Sci-fi laser bolt sprite (styled per weapon) --
  const gfx = new Graphics();

  // Outer glow trail (wider, dimmer)
  gfx.rect(-w / 2 - 2, -h, w + 4, h * 2);
  gfx.fill({ color: glow, alpha: 0.3 });

  // Core beam
  gfx.rect(-w / 2, -h / 2, w, h);
  gfx.fill(core);

  // Hot centre line
  gfx.rect(-w / 2 + 1, -0.5, w - 2, 1);
  gfx.fill(0xffffff);

  // Rotate to match velocity direction: atan2(vy, vx)
  gfx.rotation = Math.atan2(vy, vx);
  worldContainer.addChild(gfx);

  world.addComponent(entity, createSprite(gfx, w, h));

  // -- Register collider for collision lookups --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}
