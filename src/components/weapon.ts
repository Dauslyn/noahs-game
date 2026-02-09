/**
 * WeaponComponent – defines an entity's ranged attack parameters.
 *
 * Attached to the mech (or any entity that can shoot).
 * The combat system reads these values to spawn projectiles.
 */

import type { Component } from '../core/types.js';
import type { WeaponId } from '../combat/weapon-defs.js';

export interface WeaponComponent extends Component {
  readonly type: 'weapon';
  /** Which weapon definition this component uses. */
  weaponId: WeaponId;
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
 * @param weaponId        – which weapon def this component uses
 * @param damage          – damage per hit
 * @param fireRate        – shots per second
 * @param range           – max travel distance (pixels)
 * @param projectileSpeed – projectile speed (m/s)
 */
export function createWeapon(
  weaponId: WeaponId,
  damage: number,
  fireRate: number,
  range: number,
  projectileSpeed: number,
): WeaponComponent {
  return {
    type: 'weapon',
    weaponId,
    damage,
    fireRate,
    cooldownTimer: 0,
    range,
    projectileSpeed,
  };
}
