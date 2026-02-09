/**
 * EnemyAISystem – drives enemy behaviour: patrol, chase, and turret firing.
 *
 * Priority 15: runs after PhysicsSystem (10) so positions are updated,
 * but before MechFollowSystem (20) and WeaponSystem (30).
 *
 * Per-enemy-type behaviour is delegated to functions in
 * `enemy-ai-behaviours.ts` to keep each file under 250 lines.
 */

import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { Container } from 'pixi.js';
import type {
  TransformComponent,
  AnimationStateComponent,
} from '../components/index.js';
import {
  updateWalker,
  updateFlyer,
  updateTurret,
} from './enemy-ai-behaviours.js';
import {
  updateSentry,
  updateCrawler,
} from './enemy-ai-behaviours-2.js';
import { updateShielder } from './enemy-ai-behaviours-3.js';
import { updatePhantom } from './enemy-ai-behaviours-4.js';
import { spawnWarpParticles } from '../effects/warp-particles.js';

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export class EnemyAISystem implements System {
  readonly priority = 15;

  private readonly physicsCtx: PhysicsContext;
  private readonly worldContainer: Container;

  /** Running time accumulator for flyer sine-wave bob. */
  private time = 0;

  /**
   * @param physicsCtx     - shared physics context for body access
   * @param worldContainer - PixiJS container for turret projectile visuals
   */
  constructor(physicsCtx: PhysicsContext, worldContainer: Container) {
    this.physicsCtx = physicsCtx;
    this.worldContainer = worldContainer;
  }

  /**
   * Each frame, update AI state and movement for all enemies.
   *
   * @param world - the ECS world to query / mutate
   * @param dt    - elapsed time since last frame (seconds)
   */
  update(world: World, dt: number): void {
    this.time += dt;

    // Find player position (needed for detection and chasing)
    const playerTransform = this.getPlayerTransform(world);
    if (!playerTransform) return;

    const enemies = world.query('enemy', 'transform', 'physicsBody');

    for (const entity of enemies) {
      const enemy = world.getComponent(entity, 'enemy');
      const transform = world.getComponent(entity, 'transform');
      const pb = world.getComponent(entity, 'physicsBody');
      if (!enemy || !transform || !pb) continue;

      // Skip dead enemies
      const health = world.getComponent(entity, 'health');
      if (health && health.isDead) continue;

      // Skip boss entities — handled by BossAISystem
      const bossComp = world.getComponent(entity, 'boss');
      if (bossComp) continue;

      // Distance to player (pixels)
      const dx = playerTransform.x - transform.x;
      const dy = playerTransform.y - transform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inRange = dist < enemy.detectionRange;

      switch (enemy.enemyType) {
        case 'walker':
          updateWalker(
            this.physicsCtx, enemy, pb.bodyHandle,
            transform, playerTransform, inRange,
          );
          break;
        case 'flyer':
          updateFlyer(
            this.physicsCtx, enemy, pb.bodyHandle,
            transform, playerTransform, dist, inRange, this.time,
          );
          break;
        case 'turret':
          updateTurret(
            world, this.physicsCtx, this.worldContainer,
            entity, transform, playerTransform, dist, inRange, dt,
          );
          break;
        case 'sentry':
          updateSentry(
            this.physicsCtx, enemy, pb.bodyHandle,
            transform, playerTransform, inRange, this.time, dt,
          );
          break;
        case 'crawler':
          updateCrawler(
            this.physicsCtx, enemy, pb.bodyHandle,
            transform, playerTransform, inRange, dt,
          );
          break;
        case 'shielder':
          updateShielder(
            this.physicsCtx, enemy, pb.bodyHandle,
            transform, playerTransform, inRange, dt,
            world.getComponent(entity, 'sprite'),
          );
          break;
        case 'phantom': {
          const prevState = enemy.state;
          updatePhantom(
            this.physicsCtx, enemy, pb.bodyHandle,
            transform, playerTransform, inRange, dt,
            world.getComponent(entity, 'sprite'),
          );
          // Spawn warp particles on state transitions:
          // Warp-in: particles at departure point (old hidden position)
          // Warp-out: particles at last visible position (pre-teleport)
          if (prevState === 'idle' && enemy.state === 'chasing') {
            spawnWarpParticles(this.worldContainer, transform.x, transform.y);
          } else if (prevState === 'patrolling' && enemy.state === 'idle') {
            spawnWarpParticles(this.worldContainer, transform.x, transform.y);
          }
          break;
        }
      }

      // Sync animation state based on AI state
      this.syncEnemyAnimation(world, entity, enemy.enemyType, enemy.state);
    }
  }

  /** Set the animation state for enemies that have an AnimationStateComponent. */
  private syncEnemyAnimation(
    world: World,
    entity: number,
    type: string,
    aiState: string,
  ): void {
    const animState = world.getComponent(entity, 'animationState') as
      | AnimationStateComponent
      | undefined;
    if (!animState) return;

    if (type === 'walker') {
      animState.currentAnimation =
        aiState === 'chasing' ? 'walk' : 'idle';
      // Flip based on patrol direction
      const enemy = world.getComponent(entity, 'enemy');
      if (enemy) {
        animState.flipX = enemy.patrolDirection === -1;
      }
    }
    // Flyer and turret only have one animation; no switching needed
  }

  /**
   * Find the player entity and return its TransformComponent.
   * Returns undefined if no player exists.
   */
  private getPlayerTransform(world: World): TransformComponent | undefined {
    const players = world.query('player', 'transform');
    if (players.length === 0) return undefined;
    return world.getComponent(players[0], 'transform');
  }
}
