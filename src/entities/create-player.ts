/**
 * Player entity factory – creates the player character with all required
 * ECS components and a Rapier dynamic rigid body.
 *
 * Placeholder visual: a 24x40 blue rectangle (replaced by sprites later).
 */

import RAPIER from '@dimforge/rapier2d-compat';
import { Graphics } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import { toPhysicsPos, pixelsToMeters } from '../core/physics.js';
import { registerCollider } from '../core/collision-utils.js';
import { PLAYER_MAX_HEALTH } from '../core/constants.js';
import {
  createTransform,
  createPhysicsBody,
  createPlayer,
  createHealth,
  createSprite,
} from '../components/index.js';

// ---------------------------------------------------------------------------
// Player visual dimensions (pixels)
// ---------------------------------------------------------------------------

/** Placeholder sprite width (pixels). */
const SPRITE_WIDTH = 24;

/** Placeholder sprite height (pixels). */
const SPRITE_HEIGHT = 40;

/** Capsule half-height in metres (vertical extent from centre to cap start). */
const CAPSULE_HALF_HEIGHT = 0.4;

/** Capsule radius in metres (half of horizontal extent). */
const CAPSULE_RADIUS = 0.25;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the player entity with physics body, placeholder sprite,
 * and all required components.
 *
 * @param world          - the ECS world
 * @param physicsCtx     - shared physics context (Rapier world)
 * @param worldContainer - PixiJS container for world-space visuals
 * @param x              - spawn X position (pixels)
 * @param y              - spawn Y position (pixels)
 * @returns the newly created entity ID
 */
export function createPlayerEntity(
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

  // Capsule collider: zero friction for crisp wall-slides, zero restitution
  const colliderDesc = RAPIER.ColliderDesc.capsule(
    CAPSULE_HALF_HEIGHT,
    CAPSULE_RADIUS,
  )
    .setFriction(0)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createPlayer());
  world.addComponent(entity, createHealth(PLAYER_MAX_HEALTH));

  // -- Placeholder sprite (blue rectangle, anchor at centre) --
  const gfx = new Graphics();
  gfx.rect(
    -SPRITE_WIDTH / 2,
    -SPRITE_HEIGHT / 2,
    SPRITE_WIDTH,
    SPRITE_HEIGHT,
  );
  gfx.fill(0x4488ff);
  worldContainer.addChild(gfx);

  world.addComponent(entity, createSprite(gfx, SPRITE_WIDTH, SPRITE_HEIGHT));

  // -- Register collider for collision lookups --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}
