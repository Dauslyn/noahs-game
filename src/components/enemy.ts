/**
 * EnemyComponent – AI state for hostile entities.
 *
 * Each enemy has a type identifier, a simple state machine, patrol
 * direction, and combat parameters read by the enemy AI system.
 */

import type { Component } from '../core/types.js';

/** Broad categories of enemy behaviour. */
export type EnemyType =
  | 'walker' | 'flyer' | 'turret'
  | 'sentry' | 'crawler' | 'shielder';

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
  /** Maximum patrol distance from origin before reversing (pixels). */
  patrolDistance: number;
  /** X coordinate where the enemy was spawned (pixels). Used as patrol centre. */
  patrolOriginX: number;
  /** Y coordinate where the enemy was spawned (pixels). Used by sentry orbit. */
  patrolOriginY: number;
  /** General-purpose timer for sentry dash cooldown, crawler drop delay, etc. */
  actionTimer: number;
  /** Damage dealt on contact with the player. */
  contactDamage: number;
  /** Distance at which the enemy notices the player (pixels). */
  detectionRange: number;
  /** Current AI state. */
  state: EnemyState;
}

/** Options for createEnemy beyond the required fields. */
interface EnemyOptions {
  patrolDistance?: number;
  patrolOriginX?: number;
  patrolOriginY?: number;
  actionTimer?: number;
}

/** Create an EnemyComponent with sensible defaults for optional fields. */
export function createEnemy(
  enemyType: EnemyType,
  contactDamage: number,
  detectionRange: number,
  opts: EnemyOptions = {},
): EnemyComponent {
  return {
    type: 'enemy',
    enemyType,
    patrolDirection: 1,
    patrolDistance: opts.patrolDistance ?? 100,
    patrolOriginX: opts.patrolOriginX ?? 0,
    patrolOriginY: opts.patrolOriginY ?? 0,
    actionTimer: opts.actionTimer ?? 0,
    contactDamage,
    detectionRange,
    state: 'patrolling',
  };
}
