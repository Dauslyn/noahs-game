/**
 * TransformComponent – spatial position, rotation, and scale of an entity.
 *
 * Coordinates are in **pixels** (not physics metres).
 * Rotation is in **radians**, clockwise-positive in screen space.
 */

import type { Component } from '../core/types.js';

export interface TransformComponent extends Component {
  readonly type: 'transform';
  /** Horizontal position (pixels). */
  x: number;
  /** Vertical position (pixels). */
  y: number;
  /** Rotation (radians, clockwise-positive). */
  rotation: number;
  /** Horizontal scale factor (1 = normal). */
  scaleX: number;
  /** Vertical scale factor (1 = normal). */
  scaleY: number;
}

/**
 * Create a TransformComponent with sensible defaults.
 * @param x        – initial x position (default 0)
 * @param y        – initial y position (default 0)
 * @param rotation – initial rotation in radians (default 0)
 * @param scaleX   – horizontal scale (default 1)
 * @param scaleY   – vertical scale (default 1)
 */
export function createTransform(
  x = 0,
  y = 0,
  rotation = 0,
  scaleX = 1,
  scaleY = 1,
): TransformComponent {
  return { type: 'transform', x, y, rotation, scaleX, scaleY };
}
