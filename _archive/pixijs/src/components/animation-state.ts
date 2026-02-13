/**
 * AnimationStateComponent – tracks the current animation state and
 * available animations for sprite-based entities.
 *
 * Used by the AnimationSystem to switch AnimatedSprite textures
 * when the current animation changes.
 */

import type { Texture } from 'pixi.js';
import type { Component } from '../core/types.js';

/** Data for a single animation. */
export interface AnimationData {
  frames: Texture[];
  fps: number;
  loop: boolean;
}

export interface AnimationStateComponent extends Component {
  readonly type: 'animationState';
  /** Current animation name (e.g., 'idle', 'run', 'jump'). */
  currentAnimation: string;
  /** Map of animation name → frame data. */
  animations: Map<string, AnimationData>;
  /** Whether the sprite is flipped horizontally (facing left). */
  flipX: boolean;
}

/**
 * Create an AnimationStateComponent.
 *
 * @param animations       - map of animation name → frame data
 * @param initialAnimation - the animation to start with (default 'idle')
 */
export function createAnimationState(
  animations: Map<string, AnimationData>,
  initialAnimation: string = 'idle',
): AnimationStateComponent {
  return {
    type: 'animationState',
    currentAnimation: initialAnimation,
    animations,
    flipX: false,
  };
}
