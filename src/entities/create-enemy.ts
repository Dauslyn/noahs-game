/**
 * Enemy entity factories – creates walker, flyer, and turret enemies
 * with their physics bodies, placeholder visuals, and ECS components.
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
  createWeapon,
  createSprite,
} from '../components/index.js';

// ---------------------------------------------------------------------------
// Walker Enemy
// ---------------------------------------------------------------------------

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

  // -- Placeholder visual: red rectangle --
  const gfx = new Graphics();
  gfx.rect(-WALKER_WIDTH / 2, -WALKER_HEIGHT / 2, WALKER_WIDTH, WALKER_HEIGHT);
  gfx.fill(0xff3344);
  worldContainer.addChild(gfx);

  world.addComponent(
    entity,
    createSprite(gfx, WALKER_WIDTH, WALKER_HEIGHT),
  );

  // -- Register collider for collision lookups --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}

// ---------------------------------------------------------------------------
// Flyer Enemy
// ---------------------------------------------------------------------------

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

  // -- Placeholder visual: orange diamond --
  const gfx = new Graphics();
  const half = FLYER_SIZE / 2;
  // Draw diamond shape: top, right, bottom, left
  gfx.moveTo(0, -half);
  gfx.lineTo(half, 0);
  gfx.lineTo(0, half);
  gfx.lineTo(-half, 0);
  gfx.closePath();
  gfx.fill(0xff8844);
  worldContainer.addChild(gfx);

  world.addComponent(entity, createSprite(gfx, FLYER_SIZE, FLYER_SIZE));

  // -- Register collider for collision lookups --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}

// ---------------------------------------------------------------------------
// Turret Enemy
// ---------------------------------------------------------------------------

/** Turret body size (pixels). */
const TURRET_SIZE = 24;

/**
 * Create a turret enemy – fixed in place, shoots at the player when in range.
 *
 * @param world          - the ECS world
 * @param physicsCtx     - shared physics context (Rapier world)
 * @param worldContainer - PixiJS container for world-space visuals
 * @param x              - spawn X position (pixels)
 * @param y              - spawn Y position (pixels)
 * @returns the newly created entity ID
 */
export function createTurretEnemy(
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  x: number,
  y: number,
): Entity {
  const entity = world.createEntity();

  // -- Physics body (fixed, does not move) --
  const physPos = toPhysicsPos(x, y);
  const bodyDesc = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(physPos.x, physPos.y);
  const body = physicsCtx.world.createRigidBody(bodyDesc);

  // Circle collider, radius 0.25m
  const colliderDesc = RAPIER.ColliderDesc.ball(0.25)
    .setFriction(0)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'static'));
  world.addComponent(entity, createHealth(50));
  world.addComponent(entity, createEnemy('turret', 0, 300, 0, x));
  // Weapon: damage 8, fireRate 1.5/sec, range 300px, projectileSpeed 10 m/s
  world.addComponent(entity, createWeapon(8, 1.5, 300, 10));

  // -- Placeholder visual: dark red square with barrel line --
  const gfx = new Graphics();
  const halfT = TURRET_SIZE / 2;
  // Body: dark red square
  gfx.rect(-halfT, -halfT, TURRET_SIZE, TURRET_SIZE);
  gfx.fill(0x882222);
  // Barrel: small line on top centre pointing up
  gfx.moveTo(0, -halfT);
  gfx.lineTo(0, -halfT - 8);
  gfx.stroke({ width: 3, color: 0xaa4444 });
  worldContainer.addChild(gfx);

  world.addComponent(entity, createSprite(gfx, TURRET_SIZE, TURRET_SIZE));

  // -- Register collider for collision lookups --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}
