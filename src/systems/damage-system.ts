/**
 * DamageSystem – handles contact damage, invincibility timers,
 * knockback impulses, and enemy death/destruction.
 *
 * Priority 40: runs after ProjectileSystem (35) so projectile hits
 * are already applied, but before RenderSystem (100).
 */

import type { System, Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { Container } from 'pixi.js';
import { unregisterCollider } from '../core/collision-utils.js';
import { INVINCIBILITY_DURATION } from '../core/constants.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pixel distance at which enemy-player contact counts as a hit. */
const CONTACT_DISTANCE = 25;

/** Horizontal knockback impulse magnitude (m/s). */
const KNOCKBACK_IMPULSE_X = 5;

/** Vertical knockback impulse (m/s, negative = upward in Y-down). */
const KNOCKBACK_IMPULSE_Y = -3;

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export class DamageSystem implements System {
  readonly priority = 40;

  private readonly physicsCtx: PhysicsContext;
  private readonly worldContainer: Container;

  /** Queue of enemy entities to destroy at end of frame. */
  private destroyQueue: Entity[] = [];

  /**
   * @param physicsCtx     - shared physics context for body removal / impulse
   * @param worldContainer - PixiJS container for display object cleanup
   */
  constructor(physicsCtx: PhysicsContext, worldContainer: Container) {
    this.physicsCtx = physicsCtx;
    this.worldContainer = worldContainer;
  }

  /**
   * Each frame:
   * 1. Decrement invincibility timers on all entities with health.
   * 2. Check contact damage between enemies and the player.
   * 3. Destroy dead enemies (deferred from this frame or previous).
   *
   * @param world - the ECS world to query / mutate
   * @param dt    - elapsed time since last frame (seconds)
   */
  update(world: World, dt: number): void {
    // 0. Process destroy queue from previous frame
    this.processDestroyQueue(world);

    // 1. Update invincibility timers for all entities with health
    this.updateInvincibilityTimers(world, dt);

    // 2. Contact damage: enemy -> player
    this.checkContactDamage(world);

    // 3. Queue dead enemies for destruction
    this.queueDeadEnemies(world);
  }

  // -----------------------------------------------------------------------
  // Invincibility timers
  // -----------------------------------------------------------------------

  /** Decrement invincibleTimer on every health component, clamp to 0. */
  private updateInvincibilityTimers(world: World, dt: number): void {
    const entities = world.query('health');

    for (const entity of entities) {
      const health = world.getComponent(entity, 'health');
      if (!health) continue;

      if (health.invincibleTimer > 0) {
        health.invincibleTimer = Math.max(0, health.invincibleTimer - dt);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Contact damage
  // -----------------------------------------------------------------------

  /**
   * For each enemy, check pixel distance to the player.
   * If within CONTACT_DISTANCE and player is not invincible,
   * apply damage, set invincibility, and apply knockback.
   */
  private checkContactDamage(world: World): void {
    // Find player
    const players = world.query('player', 'transform', 'health', 'physicsBody');
    if (players.length === 0) return;

    const playerEntity = players[0];
    const playerTransform = world.getComponent(playerEntity, 'transform');
    const playerHealth = world.getComponent(playerEntity, 'health');
    const playerPb = world.getComponent(playerEntity, 'physicsBody');
    if (!playerTransform || !playerHealth || !playerPb) return;

    // Skip if player is already dead
    if (playerHealth.isDead) return;

    const enemies = world.query('enemy', 'transform');

    for (const enemyEntity of enemies) {
      const enemy = world.getComponent(enemyEntity, 'enemy');
      const enemyTransform = world.getComponent(enemyEntity, 'transform');
      if (!enemy || !enemyTransform) continue;

      // Skip enemies with zero contact damage (turrets)
      if (enemy.contactDamage <= 0) continue;

      // Skip dead enemies
      const enemyHealth = world.getComponent(enemyEntity, 'health');
      if (enemyHealth && enemyHealth.isDead) continue;

      // Pixel distance check
      const dx = enemyTransform.x - playerTransform.x;
      const dy = enemyTransform.y - playerTransform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= CONTACT_DISTANCE) continue;

      // Player must not be invincible
      if (playerHealth.invincibleTimer > 0) continue;

      // Apply contact damage
      playerHealth.current = Math.max(
        0,
        playerHealth.current - enemy.contactDamage,
      );

      // Set invincibility
      playerHealth.invincibleTimer = INVINCIBILITY_DURATION;

      // Apply knockback impulse (push player away from enemy)
      this.applyKnockback(playerPb.bodyHandle, dx, dy);

      // Check for player death
      if (playerHealth.current <= 0) {
        playerHealth.isDead = true;
      }

      // Only one enemy can damage the player per frame
      break;
    }
  }

  /**
   * Apply a horizontal knockback impulse to the player body,
   * pushing them away from the enemy.
   *
   * @param bodyHandle - Rapier body handle for the player
   * @param dx         - X distance from player to enemy (pixels)
   * @param dy         - Y distance from player to enemy (pixels)
   */
  private applyKnockback(
    bodyHandle: number,
    dx: number,
    _dy: number,
  ): void {
    const body = this.physicsCtx.world.getRigidBody(bodyHandle);
    if (!body) return;

    // Push player away from enemy (opposite of dx direction)
    // dx = enemy.x - player.x, so if enemy is to the right (dx > 0),
    // push player left (negative impulse)
    const knockX = dx > 0 ? -KNOCKBACK_IMPULSE_X : KNOCKBACK_IMPULSE_X;

    body.applyImpulse({ x: knockX, y: KNOCKBACK_IMPULSE_Y }, true);
  }

  // -----------------------------------------------------------------------
  // Enemy death
  // -----------------------------------------------------------------------

  /** Find dead enemies and add them to the destroy queue. */
  private queueDeadEnemies(world: World): void {
    const enemies = world.query('enemy', 'health');

    for (const entity of enemies) {
      const health = world.getComponent(entity, 'health');
      if (!health) continue;

      if (health.isDead) {
        this.destroyQueue.push(entity);
      }
    }
  }

  /**
   * Remove all queued entities: physics bodies, display objects, and
   * ECS entity/component data.
   */
  private processDestroyQueue(world: World): void {
    for (const entity of this.destroyQueue) {
      // Skip if already removed (e.g. double-queued)
      if (!world.hasEntity(entity)) continue;

      // Remove physics body and unregister its colliders
      const pb = world.getComponent(entity, 'physicsBody');
      if (pb) {
        const body = this.physicsCtx.world.getRigidBody(pb.bodyHandle);
        if (body) {
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

    this.destroyQueue = [];
  }
}
