/**
 * VelocityComponent – linear velocity of an entity.
 *
 * Values are in **metres per second** and converted to pixels during
 * rendering via PIXELS_PER_METER.
 */

import type { Component } from '../core/types.js';

export interface VelocityComponent extends Component {
  readonly type: 'velocity';
  /** Horizontal velocity (m/s, positive = right). */
  vx: number;
  /** Vertical velocity (m/s, positive = down in Y-down space). */
  vy: number;
}

/**
 * Create a VelocityComponent.
 * @param vx – horizontal velocity (default 0)
 * @param vy – vertical velocity (default 0)
 */
export function createVelocity(vx = 0, vy = 0): VelocityComponent {
  return { type: 'velocity', vx, vy };
}
