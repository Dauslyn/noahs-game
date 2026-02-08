/**
 * EntityManager -- centralised deferred entity destruction.
 *
 * Several systems (ProjectileSystem, DamageSystem, DeathRespawnSystem) need
 * to destroy entities, but doing so mid-iteration can corrupt query results.
 * The EntityManager collects destruction requests during the frame and
 * processes them all at once at the START of the next frame, before any
 * systems run.
 *
 * Cleanup responsibilities per entity:
 *   1. Unregister all Rapier colliders from the collider-to-entity map.
 *   2. Remove the Rapier rigid body from the physics world.
 *   3. Detach the PixiJS display object from its parent container.
 *   4. Remove the ECS entity and all its components from the World.
 */

import type { Entity } from './types.js';
import type { World } from './world.js';
import type { PhysicsContext } from './physics.js';
import type { Container } from 'pixi.js';
import { unregisterCollider } from './collision-utils.js';

// ---------------------------------------------------------------------------
// EntityManager
// ---------------------------------------------------------------------------

export class EntityManager {
  /** Set of entities queued for destruction (prevents duplicates). */
  private readonly destroyQueue = new Set<Entity>();

  private readonly physicsCtx: PhysicsContext;
  private readonly worldContainer: Container;

  /**
   * @param physicsCtx     - shared Rapier physics context for body removal
   * @param worldContainer - PixiJS world-space container for display cleanup
   */
  constructor(physicsCtx: PhysicsContext, worldContainer: Container) {
    this.physicsCtx = physicsCtx;
    this.worldContainer = worldContainer;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Queue an entity for destruction at the start of the next frame.
   *
   * Safe to call multiple times with the same entity -- duplicates are
   * ignored thanks to the internal Set.
   *
   * @param entity - the ECS entity ID to destroy
   */
  markForDestruction(entity: Entity): void {
    this.destroyQueue.add(entity);
  }

  /**
   * Process every queued entity: remove physics bodies, display objects,
   * and ECS data. Call this once per frame BEFORE any systems run.
   *
   * @param world - the ECS world to mutate
   */
  processDestroyQueue(world: World): void {
    for (const entity of this.destroyQueue) {
      this.destroyEntity(world, entity);
    }
    this.destroyQueue.clear();
  }

  /**
   * Returns the number of entities currently queued for destruction.
   * Useful for debugging / metrics.
   */
  get pendingCount(): number {
    return this.destroyQueue.size;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  /**
   * Fully destroy a single entity:
   *   1. Remove its Rapier rigid body (and unregister all colliders).
   *   2. Detach its PixiJS display object.
   *   3. Remove the entity from the ECS world.
   *
   * Silently skips entities that have already been removed.
   *
   * @param world  - the ECS world
   * @param entity - entity ID to destroy
   */
  private destroyEntity(world: World, entity: Entity): void {
    // Guard: entity may have been removed by another path
    if (!world.hasEntity(entity)) return;

    // 1. Physics cleanup
    const pb = world.getComponent(entity, 'physicsBody');
    if (pb) {
      const body = this.physicsCtx.world.getRigidBody(pb.bodyHandle);
      if (body) {
        // Unregister every collider attached to this body
        for (let i = 0; i < body.numColliders(); i++) {
          const collider = body.collider(i);
          unregisterCollider(this.physicsCtx, collider.handle);
        }
        this.physicsCtx.world.removeRigidBody(body);
      }
    }

    // 2. Display object cleanup
    const sprite = world.getComponent(entity, 'sprite');
    if (sprite && sprite.displayObject.parent) {
      this.worldContainer.removeChild(sprite.displayObject);
    }

    // 3. ECS cleanup
    world.removeEntity(entity);
  }
}
