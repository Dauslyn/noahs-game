/**
 * AnimationSystem – switches AnimatedSprite textures when the
 * AnimationStateComponent's currentAnimation changes, and handles flipX.
 *
 * Priority 92: runs after Camera (90) but before Effects (95),
 * so animations are resolved before glow/flash effects are applied.
 */

import { AnimatedSprite } from 'pixi.js';
import type { System, Entity } from '../core/types.js';
import type { World } from '../core/world.js';

export class AnimationSystem implements System {
  readonly priority = 92;

  /**
   * Tracks the last animation name per entity so we only swap textures
   * when the state actually changes.
   */
  private readonly lastAnimation = new Map<Entity, string>();

  /**
   * Tracks the last flipX state per entity to avoid redundant scale changes.
   */
  private readonly lastFlipX = new Map<Entity, boolean>();

  update(world: World, _dt: number): void {
    const entities = world.query('sprite', 'animationState');

    for (const entity of entities) {
      const sprite = world.getComponent(entity, 'sprite');
      const animState = world.getComponent(entity, 'animationState');
      if (!sprite || !animState) continue;

      const displayObj = sprite.displayObject;
      if (!(displayObj instanceof AnimatedSprite)) continue;

      // Switch animation textures when state changes
      const prevAnim = this.lastAnimation.get(entity);
      if (prevAnim !== animState.currentAnimation) {
        const animData = animState.animations.get(animState.currentAnimation);
        if (animData && animData.frames.length > 0) {
          displayObj.textures = animData.frames;
          // Convert fps to PixiJS animationSpeed (fraction of 60fps ticker)
          displayObj.animationSpeed = animData.fps / 60;
          displayObj.loop = animData.loop;
          displayObj.gotoAndPlay(0);
        }
        this.lastAnimation.set(entity, animState.currentAnimation);
      }

      // Handle horizontal flip
      const prevFlip = this.lastFlipX.get(entity);
      if (prevFlip !== animState.flipX) {
        const absScaleX = Math.abs(displayObj.scale.x);
        displayObj.scale.x = animState.flipX ? -absScaleX : absScaleX;
        this.lastFlipX.set(entity, animState.flipX);
      }
    }

    // Cleanup destroyed entities
    for (const entity of this.lastAnimation.keys()) {
      if (!world.hasEntity(entity)) {
        this.lastAnimation.delete(entity);
        this.lastFlipX.delete(entity);
      }
    }
  }
}
