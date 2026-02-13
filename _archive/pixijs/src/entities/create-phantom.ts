/**
 * Phantom enemy factory -- creates a teleporting ambusher that warps
 * near the player, attacks briefly, then vanishes.
 * Procedural visuals: semi-transparent purple/magenta shimmer body.
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

/** Phantom body half-width (pixels). */
const BODY_W = 12;

/** Phantom body half-height (pixels). */
const BODY_H = 16;

/**
 * Create a phantom enemy at the given position.
 * Starts invisible (alpha 0) -- AI handles visibility transitions.
 */
export function createPhantomEnemy(
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  x: number,
  y: number,
): Entity {
  const entity = world.createEntity();

  // -- Physics body (dynamic, gravity off so it floats, rotation locked) --
  const physPos = toPhysicsPos(x, y);
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(physPos.x, physPos.y)
    .lockRotations();
  const body = physicsCtx.world.createRigidBody(bodyDesc);

  // Disable gravity so the phantom can float freely
  body.setGravityScale(0, true);

  // Small capsule collider for a slim ghostly shape
  const colliderDesc = RAPIER.ColliderDesc.capsule(0.16, 0.16)
    .setFriction(0.3)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createHealth(30));
  world.addComponent(entity, createEnemy('phantom', 15, 300, {
    patrolOriginX: x,
    patrolOriginY: y,
    patrolDistance: 150,
    actionTimer: 2.0,
  }));

  // -- Procedural sprite (ghostly shimmer) --
  const gfx = buildPhantomGraphic();
  gfx.alpha = 0;
  worldContainer.addChild(gfx);
  world.addComponent(entity, createSprite(gfx, BODY_W * 2, BODY_H * 2));

  // -- Register collider --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}

/** Draw a ghostly semi-transparent purple body with inner glow. */
function buildPhantomGraphic(): Graphics {
  const g = new Graphics();

  // Outer body -- dark magenta
  g.rect(-BODY_W, -BODY_H, BODY_W * 2, BODY_H * 2);
  g.fill({ color: 0x8822aa, alpha: 0.7 });

  // Inner core -- brighter purple glow
  g.rect(-BODY_W + 3, -BODY_H + 3, BODY_W * 2 - 6, BODY_H * 2 - 6);
  g.fill({ color: 0xcc44ff, alpha: 0.5 });

  // Eye slits -- bright magenta
  g.rect(-6, -4, 4, 3);
  g.fill({ color: 0xff44ff, alpha: 1 });
  g.rect(2, -4, 4, 3);
  g.fill({ color: 0xff44ff, alpha: 1 });

  return g;
}
