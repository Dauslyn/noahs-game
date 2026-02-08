/**
 * EnemyComponent – AI state for hostile entities.
 *
 * Each enemy has a type identifier, a simple state machine, patrol
 * direction, and combat parameters read by the enemy AI system.
 */

import type { Component } from '../core/types.js';

/** Broad categories of enemy behaviour. */
export type EnemyType = 'walker' | 'flyer' | 'turret';

/** High-level AI state. */
export type EnemyState = 'idle' | 'patrolling' | 'chasing' | 'attacking' | 'dead';

/** -1 = moving left, 1 = moving right. */
export type PatrolDirection = -1 | 1;

export interface EnemyComponent extends Component {
  readonly type: 'enemy';
  /** What kind of enemy this is. */
  enemyType: EnemyType;
  /** Current horizontal patrol direction. */
  patrolDirection: PatrolDirection;
  /** Damage dealt on contact with the player. */
  contactDamage: number;
  /** Distance at which the enemy notices the player (pixels). */
  detectionRange: number;
  /** Current AI state. */
  state: EnemyState;
}

/**
 * Create an EnemyComponent.
 * @param enemyType      – walker / flyer / turret
 * @param contactDamage  – damage on touch
 * @param detectionRange – aggro radius in pixels
 */
export function createEnemy(
  enemyType: EnemyType,
  contactDamage: number,
  detectionRange: number,
): EnemyComponent {
  return {
    type: 'enemy',
    enemyType,
    patrolDirection: 1,
    contactDamage,
    detectionRange,
    state: 'patrolling',
  };
}
