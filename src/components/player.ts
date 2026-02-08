/**
 * PlayerComponent – state specific to the player-controlled entity.
 *
 * Tracks grounding, wall contact, jump count, facing direction,
 * and a high-level state machine label used by the movement system.
 */

import type { Component } from '../core/types.js';

/** High-level player state for animation and physics branching. */
export type PlayerState =
  | 'idle'
  | 'running'
  | 'jumping'
  | 'falling'
  | 'wallSliding'
  | 'dead';

/** -1 = touching wall on the left, 0 = no wall, 1 = wall on the right. */
export type WallDirection = -1 | 0 | 1;

/** -1 = facing left, 1 = facing right. */
export type FacingDirection = -1 | 1;

export interface PlayerComponent extends Component {
  readonly type: 'player';
  /** True when the player is standing on solid ground. */
  isGrounded: boolean;
  /** Which side a wall is on (-1 left, 0 none, 1 right). */
  wallDirection: WallDirection;
  /** Number of jumps used since last grounded (for double-jump). */
  jumpCount: number;
  /** Horizontal facing direction (-1 left, 1 right). */
  facingDirection: FacingDirection;
  /** Current high-level state. */
  state: PlayerState;
}

/**
 * Create a PlayerComponent with default idle state.
 */
export function createPlayer(): PlayerComponent {
  return {
    type: 'player',
    isGrounded: false,
    wallDirection: 0,
    jumpCount: 0,
    facingDirection: 1,
    state: 'idle',
  };
}
