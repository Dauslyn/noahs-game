/**
 * WeaponComponent – defines an entity's ranged attack parameters.
 *
 * Attached to the mech (or any entity that can shoot).
 * The combat system reads these values to spawn projectiles.
 */

import type { Component } from '../core/types.js';

export interface WeaponComponent extends Component {
  readonly type: 'weapon';
  /** Damage dealt per projectile hit. */
  damage: number;
  /** Shots per second. */
  fireRate: number;
  /**
   * Time remaining until the weapon can fire again (seconds).
   * Decremented each frame; weapon fires when <= 0.
   */
  cooldownTimer: number;
  /** Maximum projectile travel distance (pixels). */
  range: number;
  /** Projectile speed (m/s). */
  projectileSpeed: number;
}

/**
 * Create a WeaponComponent.
 * @param damage          – damage per hit
 * @param fireRate        – shots per second
 * @param range           – max travel distance (pixels)
 * @param projectileSpeed – projectile speed (m/s)
 */
export function createWeapon(
  damage: number,
  fireRate: number,
  range: number,
  projectileSpeed: number,
): WeaponComponent {
  return {
    type: 'weapon',
    damage,
    fireRate,
    cooldownTimer: 0,
    range,
    projectileSpeed,
  };
}
