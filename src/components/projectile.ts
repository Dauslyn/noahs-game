/**
 * ProjectileComponent – marks an entity as a projectile (laser bolt, etc.).
 *
 * The projectile system decrements `lifetime` each frame and destroys
 * the entity when it reaches zero or on collision.
 */

import type { Component, Entity } from '../core/types.js';

export interface ProjectileComponent extends Component {
  readonly type: 'projectile';
  /** Damage dealt on hit. */
  damage: number;
  /** Entity that fired this projectile (to avoid self-damage). */
  ownerEntity: Entity;
  /** Remaining time before auto-despawn (seconds). */
  lifetime: number;
  /** Travel speed (m/s). */
  speed: number;
}

/**
 * Create a ProjectileComponent.
 * @param damage      – damage on hit
 * @param ownerEntity – entity that spawned this projectile
 * @param lifetime    – seconds before auto-despawn
 * @param speed       – travel speed (m/s)
 */
export function createProjectile(
  damage: number,
  ownerEntity: Entity,
  lifetime: number,
  speed: number,
): ProjectileComponent {
  return { type: 'projectile', damage, ownerEntity, lifetime, speed };
}
