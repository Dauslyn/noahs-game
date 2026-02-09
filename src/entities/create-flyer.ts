/**
 * Flyer enemy entity factory – creates an alien drone that bobs in the air
 * and chases the player when in range.
 *
 * Uses Ansimuz alien-flying-enemy sprites (8 individual PNGs).
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
// Sprite config
// ---------------------------------------------------------------------------

/** Each flyer frame is 83x64 pixels. */
const FRAME_W = 83;
const FRAME_H = 64;

/** Display scale (these are larger sprites, scale down a bit). */
const FLYER_SCALE = 0.7;

/** The 8 individual texture aliases for the flyer animation. */
const FLYER_FRAME_ALIASES = [
  'flyer-1', 'flyer-2', 'flyer-3', 'flyer-4',
  'flyer-5', 'flyer-6', 'flyer-7', 'flyer-8',
];

/**
 * Create a flyer enemy with animated sprite.
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

  const colliderDesc = RAPIER.ColliderDesc.ball(0.2)
    .setFriction(0)
    .setRestitution(0);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'dynamic'));
  world.addComponent(entity, createHealth(20));
  world.addComponent(entity, createEnemy('flyer', 10, 250, 0, x));

  // -- Animated sprite --
  const animSprite = buildFlyerSprite();
  animSprite.scale.set(FLYER_SCALE);
  worldContainer.addChild(animSprite);

  const spriteW = FRAME_W * FLYER_SCALE;
  const spriteH = FRAME_H * FLYER_SCALE;
  world.addComponent(entity, createSprite(animSprite, spriteW, spriteH));

  // -- Animation state --
  const animations = buildFlyerAnimations();
  if (animations.size > 0) {
    world.addComponent(entity, createAnimationState(animations, 'fly'));
  }

  // -- Register collider --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}

// ---------------------------------------------------------------------------
// Sprite helpers
// ---------------------------------------------------------------------------

/** Collect the 8 individual flyer textures into an array. */
function collectFlyerFrames(): import('pixi.js').Texture[] {
  const frames = [];
  for (const alias of FLYER_FRAME_ALIASES) {
    if (hasTexture(alias)) {
      frames.push(getTexture(alias));
    }
  }
  return frames;
}

function buildFlyerSprite(): AnimatedSprite {
  const frames = collectFlyerFrames();
  if (frames.length > 0) {
    const sprite = new AnimatedSprite(frames);
    sprite.anchor.set(0.5, 0.5);
    sprite.animationSpeed = 10 / 60;
    sprite.play();
    return sprite;
  }
  const sprite = new AnimatedSprite([getTexture('flyer-1')]);
  sprite.anchor.set(0.5, 0.5);
  return sprite;
}

function buildFlyerAnimations(): Map<string, AnimationData> {
  const anims = new Map<string, AnimationData>();
  const frames = collectFlyerFrames();
  if (frames.length > 0) {
    anims.set('fly', { frames, fps: 10, loop: true });
  }
  return anims;
}
