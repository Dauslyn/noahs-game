/**
 * ProjectileSystem -- manages projectile lifetime and hit detection.
 *
 * Priority 35: runs after WeaponSystem (30) so newly-spawned projectiles
 * get at least one frame before being processed.
 *
 * Hit detection uses a simple pixel-distance check rather than Rapier
 * sensor events to keep the implementation straightforward.
 *
 * Entity destruction is delegated to the centralised EntityManager,
 * which processes the destroy queue at the start of each frame.
 */

import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import type { EntityManager } from '../core/entity-manager.js';
import type { SoundManager } from '../audio/sound-manager.js';

/** Distance in pixels at which a projectile "hits" an enemy. */
const HIT_DISTANCE = 15;

export class ProjectileSystem implements System {
  readonly priority = 35;

  private readonly entityManager: EntityManager;
  private readonly soundManager: SoundManager;

  /**
   * @param entityManager - centralised manager for deferred entity destruction
   * @param soundManager  - audio manager for deflect sound
   */
  constructor(entityManager: EntityManager, soundManager: SoundManager) {
    this.entityManager = entityManager;
    this.soundManager = soundManager;
  }

  /**
   * Each frame: (1) decrement lifetimes, (2) check for enemy hits,
   * and queue expired / hit projectiles for destruction via EntityManager.
   *
   * @param world - the ECS world to query / mutate
   * @param dt    - elapsed time since last frame (seconds)
   */
  update(world: World, dt: number): void {
    const projectiles = world.query('projectile', 'transform', 'physicsBody');

    // Gather enemy data once for all projectile hit checks
    const enemies = world.query('enemy', 'transform');

    for (const entity of projectiles) {
      const proj = world.getComponent(entity, 'projectile');
      const projTransform = world.getComponent(entity, 'transform');
      if (!proj || !projTransform) continue;

      // 1. Decrement lifetime; queue for destruction if expired
      proj.lifetime -= dt;
      if (proj.lifetime <= 0) {
        this.entityManager.markForDestruction(entity);
        continue;
      }

      // 2. Check proximity-based hit against enemies
      for (const enemyEntity of enemies) {
        const enemyTransform = world.getComponent(enemyEntity, 'transform');
        if (!enemyTransform) continue;

        // Skip the owner entity (no self-damage)
        if (enemyEntity === proj.ownerEntity) continue;

        const dx = enemyTransform.x - projTransform.x;
        const dy = enemyTransform.y - projTransform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < HIT_DISTANCE) {
          // Check shielder shield: block projectile if hitting shielded side
          const enemy = world.getComponent(enemyEntity, 'enemy');
          if (enemy && enemy.enemyType === 'shielder' && enemy.state !== 'idle') {
            // Projectile approaching from left: dx > 0 (enemy right of proj)
            // Shield direction 1 = facing right, -1 = facing left
            const approachFromRight = dx < 0;
            const approachFromLeft = dx > 0;
            const shieldBlocksRight = enemy.shieldDirection === 1 && approachFromLeft;
            const shieldBlocksLeft = enemy.shieldDirection === -1 && approachFromRight;

            if (shieldBlocksRight || shieldBlocksLeft) {
              // Deflected! Destroy projectile, no damage
              this.entityManager.markForDestruction(entity);
              this.soundManager.play('shield-break');
              break;
            }
          }

          // Apply damage if the enemy has a health component
          const health = world.getComponent(enemyEntity, 'health');
          if (health && !health.isDead && health.invincibleTimer <= 0) {
            health.current = Math.max(0, health.current - proj.damage);
            if (health.current <= 0) {
              health.isDead = true;
            }
          }

          // Queue projectile for destruction (it has hit something)
          this.entityManager.markForDestruction(entity);
          break; // one projectile can only hit one enemy
        }
      }
    }
  }
}
