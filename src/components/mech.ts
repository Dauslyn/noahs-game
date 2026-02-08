/**
 * MechComponent – state for the mech companion that orbits the player.
 *
 * The mech has two modes:
 * - **orbit** – circles the player, auto-fires at nearby enemies.
 * - **manual** – player takes direct control of the mech's aim.
 */

import type { Component, Entity } from '../core/types.js';

/** Behaviour mode for the mech companion. */
export type MechMode = 'orbit' | 'manual';

export interface MechComponent extends Component {
  readonly type: 'mech';
  /** Entity ID of the player this mech belongs to. */
  ownerEntity: Entity;
  /** Current behaviour mode. */
  mode: MechMode;
  /** Current angle around the owner (radians). */
  orbitAngle: number;
  /** Distance from owner centre (pixels). */
  orbitRadius: number;
  /** Angular speed (radians / second). */
  orbitSpeed: number;
}

/**
 * Create a MechComponent bound to the given player entity.
 * @param ownerEntity – entity ID of the player
 * @param orbitRadius – orbit distance in pixels (default from constants)
 * @param orbitSpeed  – angular speed in rad/s (default from constants)
 */
export function createMech(
  ownerEntity: Entity,
  orbitRadius: number,
  orbitSpeed: number,
): MechComponent {
  return {
    type: 'mech',
    ownerEntity,
    mode: 'orbit',
    orbitAngle: 0,
    orbitRadius,
    orbitSpeed,
  };
}
