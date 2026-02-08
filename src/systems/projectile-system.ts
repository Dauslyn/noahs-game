/**
 * ProjectileSystem – manages projectile lifetime, hit detection, and
 * deferred cleanup of expired or collided projectiles.
 *
 * Priority 35: runs after WeaponSystem (30) so newly-spawned projectiles
 * get at least one frame before being processed.
 *
 * Hit detection uses a simple pixel-distance check rather than Rapier
 * sensor events to keep the implementation straightforward.
 */

import type { System, Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { Container } from 'pixi.js';
import { unregisterCollider } from '../core/collision-utils.js';

/** Distance in pixels at which a projectile "hits" an enemy. */
const HIT_DISTANCE = 15;

export class ProjectileSystem implements System {
  readonly priority = 35;

  private readonly physicsCtx: PhysicsContext;
  private readonly worldContainer: Container;

  /** Queue of entities to destroy at the start of the next frame. */
  private entitiesToDestroy: Entity[] = [];

  /**
   * @param physicsCtx     - shared physics context for body removal
   * @param worldContainer - PixiJS container for display object removal
   */
  constructor(physicsCtx: PhysicsContext, worldContainer: Container) {
    this.physicsCtx = physicsCtx;
    this.worldContainer = worldContainer;
  }

  /**
   * Each frame: (1) clean up queued entities from last frame,
   * (2) decrement lifetimes, (3) check for enemy hits.
   *
   * @param world - the ECS world to query / mutate
   * @param dt    - elapsed time since last frame (seconds)
   */
  update(world: World, dt: number): void {
    // 1. Process destroy queue from previous frame (deferred cleanup)
    this.processDestroyQueue(world);

    const projectiles = world.query('projectile', 'transform', 'physicsBody');

    // Gather enemy data once for all projectile hit checks
    const enemies = world.query('enemy', 'transform');

    for (const entity of projectiles) {
      const proj = world.getComponent(entity, 'projectile');
      const projTransform = world.getComponent(entity, 'transform');
      if (!proj || !projTransform) continue;

      // 2. Decrement lifetime; queue for destruction if expired
      proj.lifetime -= dt;
      if (proj.lifetime <= 0) {
        this.entitiesToDestroy.push(entity);
        continue;
      }

      // 3. Check proximity-based hit against enemies
      for (const enemyEntity of enemies) {
        const enemyTransform = world.getComponent(enemyEntity, 'transform');
        if (!enemyTransform) continue;

        // Skip the owner entity (no self-damage)
        if (enemyEntity === proj.ownerEntity) continue;

        const dx = enemyTransform.x - projTransform.x;
        const dy = enemyTransform.y - projTransform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < HIT_DISTANCE) {
          // Apply damage if the enemy has a health component
          const health = world.getComponent(enemyEntity, 'health');
          if (health && !health.isDead && health.invincibleTimer <= 0) {
            health.current = Math.max(0, health.current - proj.damage);
            if (health.current <= 0) {
              health.isDead = true;
            }
          }

          // Queue projectile for destruction (it has hit something)
          this.entitiesToDestroy.push(entity);
          break; // one projectile can only hit one enemy
        }
      }
    }
  }

  /**
   * Remove all queued entities: physics bodies, display objects, and
   * ECS entity/component data. Runs at the start of each frame to
   * avoid mutating collections during iteration.
   */
  private processDestroyQueue(world: World): void {
    for (const entity of this.entitiesToDestroy) {
      // Skip if already removed (e.g. double-queued)
      if (!world.hasEntity(entity)) continue;

      // Remove physics body and unregister its collider
      const pb = world.getComponent(entity, 'physicsBody');
      if (pb) {
        const body = this.physicsCtx.world.getRigidBody(pb.bodyHandle);
        if (body) {
          // Unregister all colliders attached to this body
          for (let i = 0; i < body.numColliders(); i++) {
            const collider = body.collider(i);
            unregisterCollider(this.physicsCtx, collider.handle);
          }
          this.physicsCtx.world.removeRigidBody(body);
        }
      }

      // Remove display object from the world container
      const sprite = world.getComponent(entity, 'sprite');
      if (sprite && sprite.displayObject.parent) {
        this.worldContainer.removeChild(sprite.displayObject);
      }

      // Remove the entity and all its components from the ECS world
      world.removeEntity(entity);
    }

    this.entitiesToDestroy = [];
  }
}
