/**
 * Walker enemy entity factory – creates an alien trooper that patrols
 * platforms and chases the player when in range.
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

/** Walker sprite width (pixels). */
const WALKER_WIDTH = 20;

/** Walker sprite height (pixels). */
const WALKER_HEIGHT = 24;

/**
 * Create a walker enemy – patrols back and forth on platforms,
 * chases the player when in range.
 *
 * @param world          - the ECS world
 * @param physicsCtx     - shared physics context (Rapier world)
 * @param worldContainer - PixiJS container for world-space visuals
 * @param x              - spawn X position (pixels)
 * @param y              - spawn Y position (pixels)
 * @returns the newly created entity ID
 */
export function createWalkerEnemy(
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

  // Capsule collider: half-height 0.2m, radius 0.2m, friction 0.5
  const colliderDesc = RAPIER.ColliderDesc.capsule(0.2, 0.2)
    .setFriction(0.5)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createHealth(30));
  world.addComponent(entity, createEnemy('walker', 15, 200, 100, x));

  // -- Sci-fi alien trooper sprite --
  const gfx = new Graphics();
  const wHalf = WALKER_WIDTH / 2;
  const wHh = WALKER_HEIGHT / 2;

  // Legs: two dark pillars
  gfx.rect(-wHalf, wHh - 8, 7, 8);
  gfx.fill(0x661122);
  gfx.rect(wHalf - 7, wHh - 8, 7, 8);
  gfx.fill(0x661122);

  // Body: armoured torso with layered plates
  gfx.roundRect(-wHalf, -wHh + 6, WALKER_WIDTH, WALKER_HEIGHT - 14, 2);
  gfx.fill(0x881133);
  gfx.roundRect(-wHalf + 2, -wHh + 8, WALKER_WIDTH - 4, WALKER_HEIGHT - 18, 2);
  gfx.fill(0xaa2244);

  // Chest vent (glowing slit)
  gfx.rect(-wHalf + 4, -wHh + 12, WALKER_WIDTH - 8, 2);
  gfx.fill(0xff6644);

  // Head: rounded alien helmet
  gfx.roundRect(-wHalf + 2, -wHh, WALKER_WIDTH - 4, 10, 4);
  gfx.fill(0x992233);

  // Eyes: two glowing red dots
  gfx.circle(-3, -wHh + 5, 2);
  gfx.fill(0xff4444);
  gfx.circle(3, -wHh + 5, 2);
  gfx.fill(0xff4444);

  // Eye glow centres
  gfx.circle(-3, -wHh + 5, 1);
  gfx.fill(0xffaaaa);
  gfx.circle(3, -wHh + 5, 1);
  gfx.fill(0xffaaaa);

  worldContainer.addChild(gfx);

  world.addComponent(
    entity,
    createSprite(gfx, WALKER_WIDTH, WALKER_HEIGHT),
  );

  // -- Register collider for collision lookups --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}
