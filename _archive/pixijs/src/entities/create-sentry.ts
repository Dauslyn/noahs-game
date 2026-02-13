/**
 * Sentry Drone entity factory — creates a floating drone that orbits
 * its spawn point and periodically dashes at the player.
 * Procedural visuals (diamond shape with pulsing glow).
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

/** Sentry visual size (pixels). */
const SENTRY_SIZE = 16;

/** Initial dash cooldown so sentries don't all fire at once. */
const INITIAL_DASH_TIMER = 2.0;

/**
 * Create a sentry drone enemy at the given position.
 * Floats in zero-gravity, orbits spawn point, dashes at player.
 */
export function createSentryEnemy(
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

  const colliderDesc = RAPIER.ColliderDesc.ball(0.15)
    .setFriction(0)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createHealth(15));
  world.addComponent(entity, createEnemy('sentry', 15, 250, {
    patrolOriginX: x,
    patrolOriginY: y,
    actionTimer: INITIAL_DASH_TIMER,
  }));

  // -- Procedural sprite (diamond shape) --
  const gfx = buildSentryGraphic();
  worldContainer.addChild(gfx);
  world.addComponent(entity, createSprite(gfx, SENTRY_SIZE * 2, SENTRY_SIZE * 2));

  // -- Register collider --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}

/** Draw a diamond-shaped sentry with a cyan-yellow colour scheme. */
function buildSentryGraphic(): Graphics {
  const g = new Graphics();
  const s = SENTRY_SIZE;

  // Outer diamond (yellow-orange)
  g.poly([0, -s, s, 0, 0, s, -s, 0]);
  g.fill({ color: 0xffaa22, alpha: 0.9 });

  // Inner diamond (bright yellow core)
  const inner = s * 0.5;
  g.poly([0, -inner, inner, 0, 0, inner, -inner, 0]);
  g.fill({ color: 0xffff44, alpha: 1 });

  return g;
}
