/**
 * Crawler entity factory — creates a ceiling-clinging enemy that drops
 * onto players passing below, scurries briefly, then leaps back up.
 * Procedural visuals (spiky oval in green/purple).
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

/** Crawler visual dimensions (pixels). */
const CRAWLER_W = 20;
const CRAWLER_H = 12;

/**
 * Create a crawler enemy at the given position (should be near a ceiling).
 * Starts with gravity disabled; drops when player passes below.
 */
export function createCrawlerEnemy(
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  x: number,
  y: number,
): Entity {
  const entity = world.createEntity();

  // -- Physics body (dynamic, gravity OFF initially, rotation locked) --
  const physPos = toPhysicsPos(x, y);
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(physPos.x, physPos.y)
    .lockRotations()
    .setGravityScale(0); // Disabled until drop
  const body = physicsCtx.world.createRigidBody(bodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.cuboid(0.2, 0.12)
    .setFriction(0.5)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createHealth(25));
  world.addComponent(entity, createEnemy('crawler', 20, 150, {
    patrolOriginX: x,
    patrolOriginY: y,
  }));

  // -- Procedural sprite (spiky bug shape) --
  const gfx = buildCrawlerGraphic();
  worldContainer.addChild(gfx);
  world.addComponent(entity, createSprite(gfx, CRAWLER_W * 2, CRAWLER_H * 2));

  // -- Register collider --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}

/** Draw a spiky, insect-like crawler shape. */
function buildCrawlerGraphic(): Graphics {
  const g = new Graphics();

  // Body oval (dark green)
  g.ellipse(0, 0, CRAWLER_W * 0.7, CRAWLER_H * 0.6);
  g.fill({ color: 0x22aa44, alpha: 0.9 });

  // Spiky legs (3 per side)
  g.moveTo(-CRAWLER_W * 0.5, 0);
  g.lineTo(-CRAWLER_W * 0.8, CRAWLER_H * 0.5);
  g.moveTo(0, 0);
  g.lineTo(-CRAWLER_W * 0.2, CRAWLER_H * 0.6);
  g.moveTo(CRAWLER_W * 0.5, 0);
  g.lineTo(CRAWLER_W * 0.8, CRAWLER_H * 0.5);
  g.stroke({ color: 0x44ff66, width: 2 });

  // Eyes (two small purple dots)
  g.circle(-4, -3, 2);
  g.circle(4, -3, 2);
  g.fill({ color: 0xcc44ff });

  return g;
}
