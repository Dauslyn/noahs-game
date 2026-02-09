/**
 * DeathRespawnSystem -- detects player death, runs a respawn timer,
 * resets the player to the spawn point, and re-spawns destroyed enemies.
 *
 * Priority 50: runs after DamageSystem (40) so death flags are already set,
 * but before RenderSystem (100) so visual changes appear this frame.
 */

import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { Container } from 'pixi.js';
import type { SpawnPointDef } from '../level/level-data.js';
import type { PlayerComponent } from '../components/player.js';
import type { HealthComponent } from '../components/health.js';
import type { PhysicsBodyComponent } from '../components/physics-body.js';
import type { SpriteComponent } from '../components/sprite.js';
import { toPhysicsPos } from '../core/physics.js';
import { RESPAWN_DELAY, INVINCIBILITY_DURATION } from '../core/constants.js';
import {
  createWalkerEnemy,
  createFlyerEnemy,
  createTurretEnemy,
  createSentryEnemy,
  createCrawlerEnemy,
} from '../entities/create-enemy.js';
import type { SoundManager } from '../audio/sound-manager.js';

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export class DeathRespawnSystem implements System {
  readonly priority = 50;

  /** Countdown timer until respawn (seconds). */
  private respawnTimer = 0;

  /** True while the player is in the dead state awaiting respawn. */
  private isPlayerDead = false;

  /** Player spawn point in pixels (set from level data). */
  private readonly playerSpawn: { x: number; y: number };

  /** Original enemy spawn definitions for re-spawning on player death. */
  private readonly enemySpawnPoints: SpawnPointDef[];

  private readonly physicsCtx: PhysicsContext;
  private readonly worldContainer: Container;
  private readonly soundManager: SoundManager;

  /** Called after death delay to transition out of gameplay. */
  private readonly onDeathComplete: (() => void) | null;

  /**
   * @param physicsCtx     - shared Rapier physics context
   * @param worldContainer - PixiJS world-space container for visuals
   * @param playerSpawn    - pixel position where the player respawns
   * @param spawnPoints    - enemy spawn definitions from the level data
   * @param soundManager   - audio manager for death sound
   * @param onDeathComplete - callback when death delay ends (scene transition)
   */
  constructor(
    physicsCtx: PhysicsContext,
    worldContainer: Container,
    playerSpawn: { x: number; y: number },
    spawnPoints: SpawnPointDef[],
    soundManager: SoundManager,
    onDeathComplete?: () => void,
  ) {
    this.physicsCtx = physicsCtx;
    this.worldContainer = worldContainer;
    this.playerSpawn = playerSpawn;
    this.soundManager = soundManager;
    this.onDeathComplete = onDeathComplete ?? null;
    // Only keep enemy spawn points (filter out player type)
    this.enemySpawnPoints = spawnPoints.filter(
      (sp) => sp.type !== 'player',
    );
  }

  /**
   * Each frame:
   * 1. Detect player death (health <= 0).
   * 2. Count down the respawn timer.
   * 3. On timer expiry, reset player and re-spawn dead enemies.
   *
   * @param world - the ECS world to query / mutate
   * @param dt    - elapsed time since last frame (seconds)
   */
  update(world: World, dt: number): void {
    const players = world.query('player', 'health', 'physicsBody', 'sprite');
    if (players.length === 0) return;

    const playerEntity = players[0];
    const player = world.getComponent(playerEntity, 'player');
    const health = world.getComponent(playerEntity, 'health');
    const pb = world.getComponent(playerEntity, 'physicsBody');
    const sprite = world.getComponent(playerEntity, 'sprite');

    if (!player || !health || !pb || !sprite) return;

    // 1. Death detection: health dropped to zero this frame
    if (health.current <= 0 && !this.isPlayerDead) {
      this.triggerDeath(player, pb, sprite);
    }

    // 2. Respawn countdown
    if (this.isPlayerDead) {
      this.respawnTimer -= dt;

      if (this.respawnTimer <= 0) {
        if (this.onDeathComplete) {
          // Scene transition: return to planet select
          this.isPlayerDead = false;
          this.onDeathComplete();
        } else {
          // Legacy: respawn in place
          this.triggerRespawn(world, player, health, pb, sprite);
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Death
  // -----------------------------------------------------------------------

  /**
   * Initiate the death sequence: freeze the player, fade the sprite,
   * and start the respawn countdown.
   */
  private triggerDeath(
    player: PlayerComponent,
    pb: PhysicsBodyComponent,
    sprite: SpriteComponent,
  ): void {
    player.state = 'dead';
    this.isPlayerDead = true;
    this.respawnTimer = RESPAWN_DELAY;
    this.soundManager.play('death');

    // Zero out velocity so the body doesn't slide while dead
    const body = this.physicsCtx.world.getRigidBody(pb.bodyHandle);
    if (body) {
      body.setLinvel({ x: 0, y: 0 }, true);
    }

    // Fade the sprite to indicate death
    sprite.displayObject.alpha = 0.3;
  }

  // -----------------------------------------------------------------------
  // Respawn
  // -----------------------------------------------------------------------

  /**
   * Reset the player to the spawn point at full health, grant brief
   * invincibility, and re-spawn any missing enemies.
   */
  private triggerRespawn(
    world: World,
    player: PlayerComponent,
    health: HealthComponent,
    pb: PhysicsBodyComponent,
    sprite: SpriteComponent,
  ): void {
    // Move Rapier body back to spawn point (pixel -> metres)
    const spawnPhys = toPhysicsPos(this.playerSpawn.x, this.playerSpawn.y);
    const body = this.physicsCtx.world.getRigidBody(pb.bodyHandle);
    if (body) {
      body.setTranslation(spawnPhys, true);
      body.setLinvel({ x: 0, y: 0 }, true);
    }

    // Reset health
    health.current = health.max;
    health.isDead = false;
    health.invincibleTimer = INVINCIBILITY_DURATION;

    // Reset player state
    player.state = 'idle';
    player.jumpCount = 0;

    // Restore sprite visibility
    sprite.displayObject.alpha = 1.0;

    // Clear internal flag
    this.isPlayerDead = false;

    // Re-spawn dead enemies
    this.respawnEnemies(world);
  }

  // -----------------------------------------------------------------------
  // Enemy re-spawn
  // -----------------------------------------------------------------------

  /**
   * Compare the expected enemy spawn points against living enemies.
   * If fewer enemies exist than expected, spawn new ones at the
   * original positions.
   */
  private respawnEnemies(world: World): void {
    const livingEnemies = world.query('enemy');
    const expectedCount = this.enemySpawnPoints.length;

    // If all enemies are alive, nothing to do
    if (livingEnemies.length >= expectedCount) return;

    // Build a set of occupied spawn positions (to avoid duplicates).
    // patrolOriginX matches the spawn X passed to createEnemy().
    const occupied = new Set<string>();
    for (const entity of livingEnemies) {
      const enemy = world.getComponent(entity, 'enemy');
      if (!enemy) continue;
      occupied.add(`${enemy.patrolOriginX}`);
    }

    // Recreate enemies at unoccupied spawn points
    for (const sp of this.enemySpawnPoints) {
      if (occupied.has(`${sp.x}`)) continue;

      switch (sp.type) {
        case 'enemy-walker':
          createWalkerEnemy(
            world, this.physicsCtx, this.worldContainer, sp.x, sp.y,
          );
          break;
        case 'enemy-flyer':
          createFlyerEnemy(
            world, this.physicsCtx, this.worldContainer, sp.x, sp.y,
          );
          break;
        case 'enemy-turret':
          createTurretEnemy(
            world, this.physicsCtx, this.worldContainer, sp.x, sp.y,
          );
          break;
        case 'enemy-sentry':
          createSentryEnemy(
            world, this.physicsCtx, this.worldContainer, sp.x, sp.y,
          );
          break;
        case 'enemy-crawler':
          createCrawlerEnemy(
            world, this.physicsCtx, this.worldContainer, sp.x, sp.y,
          );
          break;
      }
    }
  }
}
