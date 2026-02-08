/**
 * Flyer enemy entity factory – creates an alien drone that bobs in the air
 * and chases the player when in range.
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

/** Flyer diamond size (pixels). */
const FLYER_SIZE = 16;

/**
 * Create a flyer enemy – bobs in the air, chases the player when in range.
 * Zero gravity so it floats.
 *
 * @param world          - the ECS world
 * @param physicsCtx     - shared physics context (Rapier world)
 * @param worldContainer - PixiJS container for world-space visuals
 * @param x              - spawn X position (pixels)
 * @param y              - spawn Y position (pixels)
 * @returns the newly created entity ID
 */
export function createFlyerEnemy(
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  x: number,
  y: number,
): Entity {
  const entity = world.createEntity();

  // -- Physics body (dynamic, no gravity, rotation locked) --
  const physPos = toPhysicsPos(x, y);
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(physPos.x, physPos.y)
    .lockRotations()
    .setGravityScale(0);
  const body = physicsCtx.world.createRigidBody(bodyDesc);

  // Small circle collider, radius 0.2m
  const colliderDesc = RAPIER.ColliderDesc.ball(0.2)
    .setFriction(0)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createHealth(20));
  world.addComponent(entity, createEnemy('flyer', 10, 250, 0, x));

  // -- Sci-fi alien drone sprite --
  const gfx = new Graphics();
  const half = FLYER_SIZE / 2;

  // Outer shell: angular carapace
  gfx.moveTo(0, -half - 2);
  gfx.lineTo(half + 3, -2);
  gfx.lineTo(half, half - 2);
  gfx.lineTo(-half, half - 2);
  gfx.lineTo(-half - 3, -2);
  gfx.closePath();
  gfx.fill(0x884400);

  // Inner body: brighter core
  gfx.moveTo(0, -half + 1);
  gfx.lineTo(half - 1, -1);
  gfx.lineTo(half - 2, half - 4);
  gfx.lineTo(-half + 2, half - 4);
  gfx.lineTo(-half + 1, -1);
  gfx.closePath();
  gfx.fill(0xcc6622);

  // Central eye: glowing orange orb
  gfx.circle(0, 0, 3);
  gfx.fill(0xff8800);
  gfx.circle(0, 0, 1.5);
  gfx.fill(0xffcc44);

  // Wing tips: small energy lines
  gfx.moveTo(-half - 3, -2);
  gfx.lineTo(-half - 6, -4);
  gfx.stroke({ width: 1, color: 0xffaa33 });
  gfx.moveTo(half + 3, -2);
  gfx.lineTo(half + 6, -4);
  gfx.stroke({ width: 1, color: 0xffaa33 });

  // Thruster glow: small dot underneath
  gfx.circle(0, half - 2, 2);
  gfx.fill({ color: 0xff6600, alpha: 0.5 });

  worldContainer.addChild(gfx);

  world.addComponent(entity, createSprite(gfx, FLYER_SIZE, FLYER_SIZE));

  // -- Register collider for collision lookups --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}
