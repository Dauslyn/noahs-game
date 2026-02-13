/**
 * WeaponSystem – the mech companion auto-fires projectiles at the
 * nearest enemy within range.
 *
 * Priority 30: runs after MechFollowSystem (20) so the mech's
 * position is finalised before projectile spawn points are computed.
 */

import type { System, Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { Container } from 'pixi.js';
import { createProjectileEntity } from '../entities/create-projectile.js';
import { getWeaponDef } from '../combat/weapon-defs.js';
import type { SoundManager } from '../audio/sound-manager.js';

export class WeaponSystem implements System {
  readonly priority = 30;

  private readonly physicsCtx: PhysicsContext;
  private readonly worldContainer: Container;
  private readonly soundManager: SoundManager;

  /**
   * @param physicsCtx     - shared physics context for projectile creation
   * @param worldContainer - PixiJS container for projectile visuals
   * @param soundManager   - audio manager for firing sounds
   */
  constructor(physicsCtx: PhysicsContext, worldContainer: Container, soundManager: SoundManager) {
    this.physicsCtx = physicsCtx;
    this.worldContainer = worldContainer;
    this.soundManager = soundManager;
  }

  /**
   * Each frame, decrement cooldowns and fire at the nearest enemy
   * for every mech entity with a weapon.
   *
   * @param world - the ECS world to query / mutate
   * @param dt    - elapsed time since last frame (seconds)
   */
  update(world: World, dt: number): void {
    const mechs = world.query('mech', 'weapon', 'transform');

    for (const entity of mechs) {
      const weapon = world.getComponent(entity, 'weapon');
      const mechTransform = world.getComponent(entity, 'transform');
      if (!weapon || !mechTransform) continue;

      // Decrement cooldown timer
      weapon.cooldownTimer -= dt;
      if (weapon.cooldownTimer > 0) continue;

      // Find the nearest enemy within weapon range (pixels)
      const target = this.findNearestEnemy(
        world,
        mechTransform.x,
        mechTransform.y,
        weapon.range,
      );
      if (target === null) continue;

      const enemyTransform = world.getComponent(target, 'transform');
      if (!enemyTransform) continue;

      // Compute direction from mech to enemy (in pixels)
      const dx = enemyTransform.x - mechTransform.x;
      const dy = enemyTransform.y - mechTransform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Avoid division by zero for overlapping positions
      if (dist < 1) continue;

      // Normalise direction and scale to projectile speed (m/s)
      const dirX = dx / dist;
      const dirY = dy / dist;
      const vx = dirX * weapon.projectileSpeed;
      const vy = dirY * weapon.projectileSpeed;

      // Look up the weapon definition for projectile visual style
      const wdef = getWeaponDef(weapon.weaponId);

      // Spawn the projectile at the mech's current position
      createProjectileEntity(
        world,
        this.physicsCtx,
        this.worldContainer,
        mechTransform.x,
        mechTransform.y,
        vx,
        vy,
        weapon.damage,
        entity,
        wdef.style,
      );

      this.soundManager.play('laser');

      // Reset cooldown: 1 / fireRate seconds between shots
      weapon.cooldownTimer = 1 / weapon.fireRate;
    }
  }

  /**
   * Find the nearest enemy entity within a pixel-distance range.
   *
   * @param world - the ECS world to query
   * @param x     - origin X (pixels)
   * @param y     - origin Y (pixels)
   * @param range - maximum distance in pixels
   * @returns the nearest enemy Entity, or null if none in range
   */
  private findNearestEnemy(
    world: World,
    x: number,
    y: number,
    range: number,
  ): Entity | null {
    const enemies = world.query('enemy', 'transform');
    let closest: Entity | null = null;
    let closestDist = range;

    for (const enemy of enemies) {
      const et = world.getComponent(enemy, 'transform');
      if (!et) continue;

      const dx = et.x - x;
      const dy = et.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    }

    return closest;
  }
}
