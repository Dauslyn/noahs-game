/**
 * Player entity factory – creates the player character with all required
 * ECS components, a Rapier dynamic rigid body, and animated sprite.
 */

import RAPIER from '@dimforge/rapier2d-compat';
import { AnimatedSprite } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import { toPhysicsPos } from '../core/physics.js';
import { registerCollider } from '../core/collision-utils.js';
import { PLAYER_MAX_HEALTH } from '../core/constants.js';
import { getTexture, hasTexture } from '../core/asset-loader.js';
import { extractFrames } from '../core/sprite-utils.js';
import type { AnimationData } from '../components/animation-state.js';
import {
  createTransform,
  createPhysicsBody,
  createPlayer,
  createHealth,
  createSprite,
  createAnimationState,
} from '../components/index.js';

// ---------------------------------------------------------------------------
// Sprite dimensions (from Ansimuz space-marine sheets)
// ---------------------------------------------------------------------------

/** Standard frame size for idle/run animations. */
const FRAME_W = 48;
const FRAME_H = 48;

/** Display scale multiplier to make the 48px sprites visible. */
const SPRITE_SCALE = 1.5;

/** Capsule half-height in metres (vertical extent from centre to cap start). */
const CAPSULE_HALF_HEIGHT = 0.4;

/** Capsule radius in metres (half of horizontal extent). */
const CAPSULE_RADIUS = 0.25;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the player entity with physics body, animated sprite,
 * and all required components.
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

  // -- Animated sprite --
  const animSprite = buildPlayerSprite();
  animSprite.scale.set(SPRITE_SCALE);
  worldContainer.addChild(animSprite);

  const spriteW = FRAME_W * SPRITE_SCALE;
  const spriteH = FRAME_H * SPRITE_SCALE;
  world.addComponent(entity, createSprite(animSprite, spriteW, spriteH));

  // -- Animation state --
  const animations = buildPlayerAnimations();
  if (animations.size > 0) {
    world.addComponent(entity, createAnimationState(animations, 'idle'));
  }

  // -- Register collider for collision lookups --
  registerCollider(physicsCtx, collider.handle, entity);

  return entity;
}

// ---------------------------------------------------------------------------
// Sprite helpers
// ---------------------------------------------------------------------------

/** Build the AnimatedSprite starting with idle frames. */
function buildPlayerSprite(): AnimatedSprite {
  if (hasTexture('player-idle')) {
    const idleTex = getTexture('player-idle');
    const frames = extractFrames(idleTex, FRAME_W, FRAME_H, 0, 4);
    const sprite = new AnimatedSprite(frames);
    sprite.anchor.set(0.5, 0.5);
    sprite.animationSpeed = 8 / 60;
    sprite.play();
    return sprite;
  }
  // Fallback: single white pixel (should not happen with asset loader)
  const sprite = new AnimatedSprite([getTexture('player-idle')]);
  sprite.anchor.set(0.5, 0.5);
  return sprite;
}

/** Build the animation map for the player. */
function buildPlayerAnimations(): Map<string, AnimationData> {
  const anims = new Map<string, AnimationData>();

  if (hasTexture('player-idle')) {
    anims.set('idle', {
      frames: extractFrames(getTexture('player-idle'), FRAME_W, FRAME_H, 0, 4),
      fps: 8,
      loop: true,
    });
  }
  if (hasTexture('player-run')) {
    anims.set('run', {
      frames: extractFrames(getTexture('player-run'), FRAME_W, FRAME_H, 0, 11),
      fps: 14,
      loop: true,
    });
  }
  if (hasTexture('player-jump')) {
    // Jump frames are 36x33 (non-standard size)
    anims.set('jump', {
      frames: extractFrames(getTexture('player-jump'), 36, 33, 0, 6),
      fps: 10,
      loop: false,
    });
    // Reuse jump for fall (last frames look like falling)
    anims.set('fall', {
      frames: extractFrames(getTexture('player-jump'), 36, 33, 0, 6),
      fps: 10,
      loop: false,
    });
  }
  if (hasTexture('player-die')) {
    // Die frames are 64x48 (wider than standard)
    anims.set('die', {
      frames: extractFrames(getTexture('player-die'), 64, 48, 0, 5),
      fps: 8,
      loop: false,
    });
  }

  return anims;
}
