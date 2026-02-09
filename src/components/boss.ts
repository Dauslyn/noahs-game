/**
 * BossComponent — phase-based attack state machine for boss entities.
 * Separate from EnemyComponent; boss entities have BOTH components.
 */

import type { Component } from '../core/types.js';

/** Boss attack phases, driven by HP thresholds. */
export type BossPhase = 1 | 2 | 3;

/**
 * Boss AI states:
 * - 'patrol': slow back-and-forth across arena
 * - 'windup': pausing before charge (visual flash)
 * - 'charging': high-speed horizontal dash
 * - 'laser': firing horizontal laser sweep (Phase 2+)
 * - 'cooldown': brief recovery after attack
 */
export type BossAttackState =
  | 'patrol' | 'windup' | 'charging' | 'laser' | 'cooldown';

export interface BossComponent extends Component {
  readonly type: 'boss';
  /** Current phase (1, 2, or 3). */
  phase: BossPhase;
  /** Current attack state. */
  attackState: BossAttackState;
  /** General-purpose timer for current state duration (seconds). */
  stateTimer: number;
  /** Time spent patrolling before next attack (seconds). */
  patrolTimer: number;
  /** Direction of current charge: -1 = left, 1 = right. */
  chargeDirection: -1 | 1;
  /** Left edge of the boss arena (pixels). */
  arenaMinX: number;
  /** Right edge of the boss arena (pixels). */
  arenaMaxX: number;
  /** Whether the boss has been activated (player crossed trigger). */
  activated: boolean;
  /** Whether the laser has been fired in the current laser state. */
  laserFired: boolean;
  /** Time until next minion spawn in Phase 3 (seconds). */
  minionSpawnTimer: number;
}

/** Create a BossComponent with default values. */
export function createBoss(
  arenaMinX: number,
  arenaMaxX: number,
): BossComponent {
  return {
    type: 'boss',
    phase: 1,
    attackState: 'patrol',
    stateTimer: 0,
    patrolTimer: 3.0,
    chargeDirection: -1,
    arenaMinX,
    arenaMaxX,
    activated: false,
    laserFired: false,
    minionSpawnTimer: 8.0,
  };
}
