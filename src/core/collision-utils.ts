/**
 * Collision utilities – maps Rapier collider handles to ECS entities.
 *
 * When Rapier reports a collision event it returns collider handles (numbers).
 * These helpers let game systems resolve a collider handle back to the
 * Entity that owns it, bridging the physics engine and the ECS.
 */

import type { Entity } from './types.js';
import type { PhysicsContext } from './physics.js';

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register a collider handle -> entity mapping.
 *
 * Call this whenever a new collider is attached to a Rapier body that
 * belongs to an ECS entity.
 *
 * @param physicsCtx     - the active PhysicsContext
 * @param colliderHandle - Rapier collider handle (number)
 * @param entity         - the owning ECS entity ID
 */
export function registerCollider(
  physicsCtx: PhysicsContext,
  colliderHandle: number,
  entity: Entity,
): void {
  physicsCtx.colliderToEntity.set(colliderHandle, entity);
}

// ---------------------------------------------------------------------------
// Unregistration
// ---------------------------------------------------------------------------

/**
 * Remove a collider handle mapping.
 *
 * Call this when a collider is removed from the physics world
 * (e.g. entity destruction) so the map stays clean.
 *
 * @param physicsCtx     - the active PhysicsContext
 * @param colliderHandle - Rapier collider handle to remove
 */
export function unregisterCollider(
  physicsCtx: PhysicsContext,
  colliderHandle: number,
): void {
  physicsCtx.colliderToEntity.delete(colliderHandle);
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/**
 * Resolve a Rapier collider handle to its ECS entity.
 *
 * Returns `undefined` if the handle has no registered entity (e.g. a
 * terrain collider that isn't backed by an entity, or a stale handle).
 *
 * @param physicsCtx     - the active PhysicsContext
 * @param colliderHandle - Rapier collider handle to look up
 * @returns the Entity that owns this collider, or undefined
 */
export function getEntityFromCollider(
  physicsCtx: PhysicsContext,
  colliderHandle: number,
): Entity | undefined {
  return physicsCtx.colliderToEntity.get(colliderHandle);
}
