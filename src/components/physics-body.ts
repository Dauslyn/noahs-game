/**
 * PhysicsBodyComponent – ties an entity to a Rapier2D rigid body.
 *
 * `bodyHandle` is the numeric handle returned by Rapier when the body
 * is added to the physics world.  We store the type so systems can
 * distinguish dynamic, kinematic, and static bodies without querying
 * Rapier each frame.
 */

import type { Component } from '../core/types.js';

/** Mirrors Rapier's RigidBodyType enum for easy comparison. */
export type PhysicsBodyType = 'dynamic' | 'kinematic' | 'static';

export interface PhysicsBodyComponent extends Component {
  readonly type: 'physicsBody';
  /** Rapier rigid-body handle (number). */
  bodyHandle: number;
  /** What kind of physics body this is. */
  bodyType: PhysicsBodyType;
}

/**
 * Create a PhysicsBodyComponent.
 * @param bodyHandle – Rapier rigid-body handle
 * @param bodyType   – dynamic / kinematic / static
 */
export function createPhysicsBody(
  bodyHandle: number,
  bodyType: PhysicsBodyType,
): PhysicsBodyComponent {
  return { type: 'physicsBody', bodyHandle, bodyType };
}
