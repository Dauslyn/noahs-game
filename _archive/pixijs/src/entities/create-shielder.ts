/**
 * Shielder entity factory — creates a ground enemy that carries a
 * directional energy shield blocking projectiles from one side.
 * Procedural visuals: blocky body with a glowing shield bar on one side.
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

/** Shielder body half-width (pixels). */
const BODY_W = 14;

/** Shielder body half-height (pixels). */
const BODY_H = 18;

/** Shield bar visual offset from body centre (pixels). */
const SHIELD_OFFSET_X = 16;

/** Shield bar height (pixels). */
const SHIELD_HEIGHT = 30;

/**
 * Create a shielder enemy at the given position.
 * Ground unit with friction, blocks projectiles from the front.
 */
export function createShielderEnemy(
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  x: number,
  y: number,
): Entity {
  const entity = world.createEntity();

  // -- Physics body (dynamic, standard gravity, rotation locked) --
  const physPos = toPhysicsPos(x, y);
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(physPos.x, physPos.y)
    .lockRotations();
  const body = physicsCtx.world.createRigidBody(bodyDesc);

  // Cuboid collider slightly smaller than visual for forgiving gameplay
  const colliderDesc = RAPIER.ColliderDesc.cuboid(0.24, 0.32)
    .setFriction(0.5)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createHealth(40));
  world.addComponent(entity, createEnemy('shielder', 10, 200, {
    patrolOriginX: x,
    patrolOriginY: y,
    patrolDistance: 120,
    shieldDirection: 1,
  }));

  // -- Procedural sprite (body + shield bar) --
  const gfx = buildShielderGraphic();
  worldContainer.addChild(gfx);
  world.addComponent(entity, createSprite(gfx, BODY_W * 2 + 10, BODY_H * 2));

  // -- Register collider --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}

/**
 * Draw a blocky armoured body with a glowing energy shield on the right side.
 * The shield visual is a child named 'shield' so it can be flipped by AI.
 */
function buildShielderGraphic(): Graphics {
  const g = new Graphics();

  // Body — dark purple-gray armoured rectangle
  g.rect(-BODY_W, -BODY_H, BODY_W * 2, BODY_H * 2);
  g.fill({ color: 0x664488, alpha: 0.9 });

  // Inner core — lighter accent
  g.rect(-BODY_W + 4, -BODY_H + 4, BODY_W * 2 - 8, BODY_H * 2 - 8);
  g.fill({ color: 0x8866aa, alpha: 0.8 });

  // Eye slit
  g.rect(-6, -6, 12, 4);
  g.fill({ color: 0xff4444, alpha: 1 });

  // Shield bar — bright cyan energy barrier on the right side
  const shieldG = new Graphics();
  shieldG.rect(SHIELD_OFFSET_X - 2, -SHIELD_HEIGHT / 2, 4, SHIELD_HEIGHT);
  shieldG.fill({ color: 0x44ffff, alpha: 0.8 });

  // Shield glow (wider, semi-transparent)
  shieldG.rect(SHIELD_OFFSET_X - 4, -SHIELD_HEIGHT / 2 - 2, 8, SHIELD_HEIGHT + 4);
  shieldG.fill({ color: 0x44ffff, alpha: 0.3 });

  shieldG.label = 'shield';
  g.addChild(shieldG);

  return g;
}
