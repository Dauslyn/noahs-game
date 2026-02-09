/**
 * Walker enemy entity factory – creates an alien trooper that patrols
 * platforms and chases the player when in range.
 *
 * Uses Ansimuz alien-walking-enemy spritesheets.
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
  createSprite,
  createAnimationState,
} from '../components/index.js';

// ---------------------------------------------------------------------------
// Sprite dimensions
// ---------------------------------------------------------------------------

/** Walker idle frames: 192/4 = 48 wide, 48 tall. */
const IDLE_FRAME_W = 48;
const IDLE_FRAME_H = 48;

/** Walker walk frames: ~49 wide, 42 tall. Use 48x42 for cleaner extraction. */
const WALK_FRAME_W = 48;
const WALK_FRAME_H = 42;

/** Display scale. */
const WALKER_SCALE = 1.2;

/**
 * Create a walker enemy with animated sprite.
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

  const colliderDesc = RAPIER.ColliderDesc.capsule(0.2, 0.2)
    .setFriction(0.5)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createHealth(30));
  world.addComponent(entity, createEnemy('walker', 15, 200, 100, x));

  // -- Animated sprite --
  const animSprite = buildWalkerSprite();
  animSprite.scale.set(WALKER_SCALE);
  worldContainer.addChild(animSprite);

  const spriteW = IDLE_FRAME_W * WALKER_SCALE;
  const spriteH = IDLE_FRAME_H * WALKER_SCALE;
  world.addComponent(entity, createSprite(animSprite, spriteW, spriteH));

  // -- Animation state --
  const animations = buildWalkerAnimations();
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

function buildWalkerSprite(): AnimatedSprite {
  if (hasTexture('walker-idle')) {
    const frames = extractFrames(
      getTexture('walker-idle'), IDLE_FRAME_W, IDLE_FRAME_H, 0, 4,
    );
    const sprite = new AnimatedSprite(frames);
    sprite.anchor.set(0.5, 0.5);
    sprite.animationSpeed = 6 / 60;
    sprite.play();
    return sprite;
  }
  const sprite = new AnimatedSprite([getTexture('walker-idle')]);
  sprite.anchor.set(0.5, 0.5);
  return sprite;
}

function buildWalkerAnimations(): Map<string, AnimationData> {
  const anims = new Map<string, AnimationData>();

  if (hasTexture('walker-idle')) {
    anims.set('idle', {
      frames: extractFrames(
        getTexture('walker-idle'), IDLE_FRAME_W, IDLE_FRAME_H, 0, 4,
      ),
      fps: 6,
      loop: true,
    });
  }
  if (hasTexture('walker-walk')) {
    anims.set('walk', {
      frames: extractFrames(
        getTexture('walker-walk'), WALK_FRAME_W, WALK_FRAME_H, 0, 7,
      ),
      fps: 10,
      loop: true,
    });
  }

  return anims;
}
