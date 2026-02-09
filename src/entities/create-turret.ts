/**
 * Turret enemy entity factory – creates a fixed gun emplacement
 * that shoots at the player when in range.
 *
 * Uses Ansimuz tank-unit spritesheet (512x64, 4 frames @ 128x64).
 */

import RAPIER from '@dimforge/rapier2d-compat';
import { AnimatedSprite } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import { toPhysicsPos } from '../core/physics.js';
import { registerCollider } from '../core/collision-utils.js';
import { getTexture, hasTexture } from '../core/asset-loader.js';
import { extractFrames } from '../core/sprite-utils.js';
import type { AnimationData } from '../components/animation-state.js';
import {
  createTransform,
  createPhysicsBody,
  createEnemy,
  createHealth,
  createWeapon,
  createSprite,
  createAnimationState,
} from '../components/index.js';

// ---------------------------------------------------------------------------
// Sprite dimensions (tank-unit: 512x64, 4 frames)
// ---------------------------------------------------------------------------

/** Tank frame size. */
const FRAME_W = 128;
const FRAME_H = 64;

/** Scale down — 128px wide is quite large. */
const TURRET_SCALE = 0.5;

/**
 * Create a turret enemy with animated sprite.
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

  const colliderDesc = RAPIER.ColliderDesc.ball(0.25)
    .setFriction(0)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'static'));
  world.addComponent(entity, createHealth(50));
  world.addComponent(entity, createEnemy('turret', 0, 300, 0, x));
  world.addComponent(entity, createWeapon(8, 1.5, 300, 10));

  // -- Animated sprite --
  const animSprite = buildTurretSprite();
  animSprite.scale.set(TURRET_SCALE);
  worldContainer.addChild(animSprite);

  const spriteW = FRAME_W * TURRET_SCALE;
  const spriteH = FRAME_H * TURRET_SCALE;
  world.addComponent(entity, createSprite(animSprite, spriteW, spriteH));

  // -- Animation state --
  const animations = buildTurretAnimations();
  if (animations.size > 0) {
    world.addComponent(entity, createAnimationState(animations, 'idle'));
  }

  // -- Register collider --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}

// ---------------------------------------------------------------------------
// Sprite helpers
// ---------------------------------------------------------------------------

function buildTurretSprite(): AnimatedSprite {
  if (hasTexture('tank-unit')) {
    const frames = extractFrames(
      getTexture('tank-unit'), FRAME_W, FRAME_H, 0, 4,
    );
    const sprite = new AnimatedSprite(frames);
    sprite.anchor.set(0.5, 0.5);
    sprite.animationSpeed = 4 / 60;
    sprite.play();
    return sprite;
  }
  const sprite = new AnimatedSprite([getTexture('tank-unit')]);
  sprite.anchor.set(0.5, 0.5);
  return sprite;
}

function buildTurretAnimations(): Map<string, AnimationData> {
  const anims = new Map<string, AnimationData>();
  if (!hasTexture('tank-unit')) return anims;

  const tex = getTexture('tank-unit');
  anims.set('idle', {
    frames: extractFrames(tex, FRAME_W, FRAME_H, 0, 4),
    fps: 4,
    loop: true,
  });

  return anims;
}
