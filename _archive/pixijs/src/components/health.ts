/**
 * HealthComponent – tracks hit points and invincibility frames.
 *
 * Used by both the player and enemies.
 */

import type { Component } from '../core/types.js';

export interface HealthComponent extends Component {
  readonly type: 'health';
  /** Current hit points. */
  current: number;
  /** Maximum hit points (used for UI bars and respawn). */
  max: number;
  /**
   * Remaining invincibility time (seconds).
   * While > 0 the entity cannot take damage.
   */
  invincibleTimer: number;
  /** True once current reaches 0. */
  isDead: boolean;
}

/**
 * Create a HealthComponent at full health.
 * @param max – maximum (and starting) hit points
 */
export function createHealth(max: number): HealthComponent {
  return {
    type: 'health',
    current: max,
    max,
    invincibleTimer: 0,
    isDead: false,
  };
}
