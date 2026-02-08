/**
 * Turret enemy entity factory – creates a fixed gun emplacement
 * that shoots at the player when in range.
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

  // -- Sci-fi gun turret sprite --
  const gfx = new Graphics();
  const halfT = TURRET_SIZE / 2;

  // Base: wide trapezoid foundation
  gfx.moveTo(-halfT, halfT);
  gfx.lineTo(halfT, halfT);
  gfx.lineTo(halfT - 3, halfT - 6);
  gfx.lineTo(-halfT + 3, halfT - 6);
  gfx.closePath();
  gfx.fill(0x551111);

  // Body: armoured hexagonal housing
  gfx.moveTo(-halfT + 2, halfT - 6);
  gfx.lineTo(-halfT, 0);
  gfx.lineTo(-halfT + 3, -halfT + 4);
  gfx.lineTo(halfT - 3, -halfT + 4);
  gfx.lineTo(halfT, 0);
  gfx.lineTo(halfT - 2, halfT - 6);
  gfx.closePath();
  gfx.fill(0x772222);

  // Inner panel: lighter inset
  gfx.rect(-halfT + 4, -halfT + 6, TURRET_SIZE - 8, 8);
  gfx.fill(0x993333);

  // Targeting sensor: glowing slit
  gfx.rect(-4, -halfT + 8, 8, 3);
  gfx.fill(0xff3333);
  gfx.rect(-2, -halfT + 9, 4, 1);
  gfx.fill(0xffaaaa);

  // Barrel: dual-barrel cannon pointing up
  gfx.rect(-4, -halfT - 6, 3, 10);
  gfx.fill(0x993333);
  gfx.rect(1, -halfT - 6, 3, 10);
  gfx.fill(0x993333);

  // Barrel tips: bright muzzle flash points
  gfx.circle(-2.5, -halfT - 6, 2);
  gfx.fill({ color: 0xff4444, alpha: 0.6 });
  gfx.circle(2.5, -halfT - 6, 2);
  gfx.fill({ color: 0xff4444, alpha: 0.6 });

  // Rivets: small detail dots on body
  gfx.circle(-halfT + 4, 0, 1);
  gfx.fill(0x553333);
  gfx.circle(halfT - 4, 0, 1);
  gfx.fill(0x553333);

  worldContainer.addChild(gfx);

  world.addComponent(entity, createSprite(gfx, TURRET_SIZE, TURRET_SIZE));

  // -- Register collider for collision lookups --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}
