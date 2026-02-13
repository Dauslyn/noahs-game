/**
 * Boss laser projectile — a tall horizontal energy beam that moves
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
 * @param ownerEntity - the boss entity that fired this laser
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

  // -- Physics body (dynamic, zero gravity, locked rotation) --
  const physPos = toPhysicsPos(x, y);
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(physPos.x, physPos.y)
    .lockRotations()
    .setGravityScale(0);
  const body = physicsCtx.world.createRigidBody(bodyDesc);

  // Set horizontal velocity
  body.setLinvel({ x: direction * LASER_SPEED, y: 0 }, true);

  // Tall thin collider (sensor — no physics push)
  const colliderW = (BEAM_WIDTH / 2) / PIXELS_PER_METER;
  const colliderH = (BEAM_HEIGHT / 2) / PIXELS_PER_METER;
  const colliderDesc = RAPIER.ColliderDesc.cuboid(colliderW, colliderH)
    .setSensor(true);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createProjectile(
    LASER_DAMAGE, ownerEntity, LASER_LIFETIME, LASER_SPEED,
  ));

  // -- Tall red/orange energy beam visual --
  const gfx = new Graphics();

  // Outer glow (wider, dimmer)
  gfx.rect(-BEAM_WIDTH / 2 - 4, -BEAM_HEIGHT / 2, BEAM_WIDTH + 8, BEAM_HEIGHT);
  gfx.fill({ color: 0xff4400, alpha: 0.25 });

  // Core beam
  gfx.rect(-BEAM_WIDTH / 2, -BEAM_HEIGHT / 2, BEAM_WIDTH, BEAM_HEIGHT);
  gfx.fill({ color: 0xff2200, alpha: 0.7 });

  // Hot centre line
  gfx.rect(-2, -BEAM_HEIGHT / 2 + 4, 4, BEAM_HEIGHT - 8);
  gfx.fill({ color: 0xffaa00, alpha: 1.0 });

  worldContainer.addChild(gfx);
  world.addComponent(entity, createSprite(gfx, BEAM_WIDTH, BEAM_HEIGHT));

  // -- Register collider --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}
