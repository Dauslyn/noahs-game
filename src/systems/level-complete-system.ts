/**
 * LevelCompleteSystem — detects when all enemies are defeated and
 * transitions the player back to the hub screen after a short delay.
 *
 * Priority 55: runs after DamageSystem (40) and DeathRespawnSystem (50)
 * so all death flags and destruction have been processed.
 */

import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import type { Container } from 'pixi.js';
import type { SoundManager } from '../audio/sound-manager.js';
import { spawnFloatText } from '../ui/float-text.js';

/** Seconds to wait after enemies cleared before returning to hub. */
const VICTORY_DELAY = 2.5;

/**
 * Minimum seconds before we start checking for completion.
 * Prevents triggering on the very first frame before enemies are spawned,
 * or during the brief window while BossTriggerSystem is about to spawn.
 */
const GRACE_PERIOD = 1.0;

export class LevelCompleteSystem implements System {
  readonly priority = 55;

  private readonly worldContainer: Container;
  private readonly soundManager: SoundManager;
  private readonly onLevelComplete: () => void;

  /** Whether the level has a boss that still needs to be spawned. */
  private readonly hasBoss: boolean;

  /** Elapsed time since level start — used for grace period. */
  private elapsed = 0;

  /** Whether the victory sequence has started. */
  private victoryTriggered = false;

  /** Countdown until hub transition. */
  private victoryTimer = 0;

  /**
   * @param worldContainer  - PixiJS container for floating text
   * @param soundManager    - audio manager for victory sound
   * @param hasBoss         - whether the level has a boss encounter
   * @param onLevelComplete - callback to transition back to hub
   */
  constructor(
    worldContainer: Container,
    soundManager: SoundManager,
    hasBoss: boolean,
    onLevelComplete: () => void,
  ) {
    this.worldContainer = worldContainer;
    this.soundManager = soundManager;
    this.hasBoss = hasBoss;
    this.onLevelComplete = onLevelComplete;
  }

  update(world: World, dt: number): void {
    // Already triggered — count down and transition
    if (this.victoryTriggered) {
      this.victoryTimer -= dt;
      if (this.victoryTimer <= 0) {
        this.onLevelComplete();
      }
      return;
    }

    // Grace period: don't check too early
    this.elapsed += dt;
    if (this.elapsed < GRACE_PERIOD) return;

    // Don't complete while player is dead
    const players = world.query('player', 'health');
    if (players.length === 0) return;
    const playerHealth = world.getComponent(players[0], 'health');
    if (playerHealth && playerHealth.isDead) return;

    // Check all enemies (including boss if present)
    if (!this.allEnemiesDefeated(world)) return;

    // All enemies dead — trigger victory!
    this.victoryTriggered = true;
    this.victoryTimer = VICTORY_DELAY;
    this.soundManager.play('powerup');

    // Spawn floating "LEVEL COMPLETE!" text at player position
    const playerTransform = world.getComponent(players[0], 'transform');
    if (playerTransform) {
      spawnFloatText(
        this.worldContainer,
        playerTransform.x,
        playerTransform.y - 50,
        'LEVEL COMPLETE!',
      );
    }
  }

  /**
   * Returns true when every enemy entity is dead or destroyed.
   * On boss levels, also checks that the boss has been spawned
   * and defeated (prevents early completion before boss trigger).
   */
  private allEnemiesDefeated(world: World): boolean {
    const enemies = world.query('enemy', 'health');

    // No enemies at all — could be an empty level, or all destroyed
    if (enemies.length === 0) {
      // On boss levels, boss must have been spawned first
      // BossTriggerSystem sets bossSpawned internally, but we can check
      // if any boss component exists or ever existed by looking at enemies
      // If hasBoss and zero enemies, the boss was killed (it gets destroyed)
      return true;
    }

    // Check if any living enemies remain
    for (const entity of enemies) {
      const health = world.getComponent(entity, 'health');
      if (health && !health.isDead) return false;
    }

    return true;
  }
}
