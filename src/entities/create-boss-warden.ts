/**
 * Boss Warden entity factory — creates the large cyberpunk mech boss
 * for the Neon Outpost boss arena. ~3x player size, 300 HP.
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
import { createBoss } from '../components/boss.js';

/** Boss body half-width (pixels). */
const BODY_W = 36;

/** Boss body half-height (pixels). */
const BODY_H = 56;

/**
 * Create the Warden boss at the given position.
 *
 * @param arenaMinX - left edge of boss arena (pixels)
 * @param arenaMaxX - right edge of boss arena (pixels)
 */
export function createBossWarden(
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  x: number,
  y: number,
  arenaMinX: number,
  arenaMaxX: number,
): Entity {
  const entity = world.createEntity();

  // -- Physics body (dynamic, rotation locked) --
  const physPos = toPhysicsPos(x, y);
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(physPos.x, physPos.y)
    .lockRotations();
  const body = physicsCtx.world.createRigidBody(bodyDesc);

  // Large cuboid collider (~3x player size)
  // Player is ~0.24 x 0.36 → Boss is ~0.64 x 1.08
  const colliderDesc = RAPIER.ColliderDesc.cuboid(0.64, 1.08)
    .setFriction(0.5)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createHealth(300));

  // EnemyComponent for damage/death/scrap interop
  // Uses 'walker' type but AI is driven by BossAISystem
  world.addComponent(entity, createEnemy('walker', 25, 600, {
    patrolOriginX: x,
    patrolOriginY: y,
    patrolDistance: (arenaMaxX - arenaMinX) / 2,
  }));

  // BossComponent for phase-based attack logic
  world.addComponent(entity, createBoss(arenaMinX, arenaMaxX));

  // -- Procedural sprite: large imposing cyberpunk mech --
  const gfx = buildWardenGraphic();
  worldContainer.addChild(gfx);
  world.addComponent(entity, createSprite(gfx, BODY_W * 2, BODY_H * 2));

  // -- Register collider for collision lookups --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}

/** Draw a large imposing cyberpunk mech body. */
function buildWardenGraphic(): Graphics {
  const g = new Graphics();

  // Main body — dark gunmetal
  g.rect(-BODY_W, -BODY_H, BODY_W * 2, BODY_H * 2);
  g.fill({ color: 0x2a2a3a, alpha: 0.95 });

  // Armour plating — lighter panels top and bottom
  g.rect(-BODY_W + 4, -BODY_H + 4, BODY_W * 2 - 8, 24);
  g.fill({ color: 0x3a3a4a, alpha: 0.9 });
  g.rect(-BODY_W + 4, BODY_H - 28, BODY_W * 2 - 8, 24);
  g.fill({ color: 0x3a3a4a, alpha: 0.9 });

  // Central core — red/orange glow
  g.rect(-12, -20, 24, 16);
  g.fill({ color: 0xff3322, alpha: 0.9 });

  // Eye visor — bright red slit
  g.rect(-20, -BODY_H + 12, 40, 6);
  g.fill({ color: 0xff0000, alpha: 1.0 });

  // Shoulder pauldrons
  g.rect(-BODY_W - 6, -BODY_H + 2, 12, 30);
  g.fill({ color: 0x444466, alpha: 0.9 });
  g.rect(BODY_W - 6, -BODY_H + 2, 12, 30);
  g.fill({ color: 0x444466, alpha: 0.9 });

  // Cyan accent lines (cyberpunk aesthetic)
  g.rect(-BODY_W + 2, -2, BODY_W * 2 - 4, 4);
  g.fill({ color: 0x44ffff, alpha: 0.6 });

  return g;
}
