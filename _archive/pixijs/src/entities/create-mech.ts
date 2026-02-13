/**
 * Mech companion entity factory – creates the orbiting mech companion
 * with no physics body (it floats freely around the player).
 *
 * Uses the pixel-robot spritesheet (180x64, 2 rows: idle + run).
 */

import { AnimatedSprite, Sprite } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import { MECH_ORBIT_RADIUS, MECH_ORBIT_SPEED } from '../core/constants.js';
import { getWeaponDef } from '../combat/weapon-defs.js';
import type { WeaponId } from '../combat/weapon-defs.js';
import { getTexture, hasTexture } from '../core/asset-loader.js';
import { extractFrames } from '../core/sprite-utils.js';
import type { AnimationData } from '../components/animation-state.js';
import {
  createTransform,
  createMech,
  createWeapon,
  createSprite,
  createAnimationState,
} from '../components/index.js';

// ---------------------------------------------------------------------------
// Sprite dimensions (pixel robot: 180x64, 2 rows of 7 frames)
// Frames are 12px content on a 16px stride, starting at x=17, each row 32px
// ---------------------------------------------------------------------------

/** Single frame width (content area). */
const FRAME_W = 12;

/** Single frame height (64 / 2 = 32). */
const FRAME_H = 32;

/** Horizontal stride between frame starts (16px grid). */
const FRAME_STRIDE = 16;

/** X offset where the first frame begins. */
const FRAME_OFFSET_X = 17;

/** Number of frames per animation row. */
const FRAME_COUNT = 7;

/** Scale up the small robot sprite to be visible. */
const MECH_SCALE = 2.0;

/** B3ANS PixelLab canvas size. */
const BEANS_SIZE = 40;

/** B3ANS display scale. */
const BEANS_SCALE = 1.5;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the mech companion entity with orbit/weapon components
 * and an animated pixel-robot sprite. No physics body.
 * @param weaponId - Which weapon the mech should equip from the registry.
 */
export function createMechEntity(
  world: World,
  worldContainer: Container,
  ownerEntity: Entity,
  x: number,
  y: number,
  weaponId: WeaponId,
): Entity {
  const entity = world.createEntity();
  const wpn = getWeaponDef(weaponId);

  // -- ECS components --
  world.addComponent(
    entity,
    createMech(ownerEntity, MECH_ORBIT_RADIUS, MECH_ORBIT_SPEED),
  );
  world.addComponent(
    entity,
    createWeapon(weaponId, wpn.damage, wpn.fireRate, wpn.range, wpn.projectileSpeed),
  );

  // -- Sprite: prefer B3ANS (PixelLab) over pixel-robot fallback --
  if (hasTexture('beans-east')) {
    const beansSprite = new Sprite(getTexture('beans-east'));
    beansSprite.anchor.set(0.5, 0.5);
    worldContainer.addChild(beansSprite);
    const sw = BEANS_SIZE * BEANS_SCALE;
    const sh = BEANS_SIZE * BEANS_SCALE;
    world.addComponent(entity, createSprite(beansSprite, sw, sh));
    world.addComponent(entity, createTransform(x, y, 0, BEANS_SCALE, BEANS_SCALE));
  } else {
    const animSprite = buildMechSprite();
    worldContainer.addChild(animSprite);
    const spriteW = FRAME_W * MECH_SCALE;
    const spriteH = FRAME_H * MECH_SCALE;
    world.addComponent(entity, createSprite(animSprite, spriteW, spriteH));
    world.addComponent(entity, createTransform(x, y, 0, MECH_SCALE, MECH_SCALE));
    const animations = buildMechAnimations();
    if (animations.size > 0) {
      world.addComponent(entity, createAnimationState(animations, 'idle'));
    }
  }

  return entity;
}

// ---------------------------------------------------------------------------
// Sprite helpers
// ---------------------------------------------------------------------------

/** Extract mech frames with the correct offset and stride. */
function mechFrames(row: number): import('pixi.js').Texture[] {
  return extractFrames(
    getTexture('mech-robot'),
    FRAME_W, FRAME_H, row, FRAME_COUNT,
    FRAME_OFFSET_X, FRAME_STRIDE,
  );
}

/** Build the AnimatedSprite starting with idle frames. */
function buildMechSprite(): AnimatedSprite {
  if (hasTexture('mech-robot')) {
    const frames = mechFrames(0);
    const sprite = new AnimatedSprite(frames);
    sprite.anchor.set(0.5, 0.5);
    sprite.animationSpeed = 8 / 60;
    sprite.play();
    return sprite;
  }
  const sprite = new AnimatedSprite([getTexture('mech-robot')]);
  sprite.anchor.set(0.5, 0.5);
  return sprite;
}

/** Build idle + run animation map for the mech. */
function buildMechAnimations(): Map<string, AnimationData> {
  const anims = new Map<string, AnimationData>();
  if (!hasTexture('mech-robot')) return anims;

  anims.set('idle', { frames: mechFrames(0), fps: 8, loop: true });
  anims.set('run', { frames: mechFrames(1), fps: 12, loop: true });

  return anims;
}
