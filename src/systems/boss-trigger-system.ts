/**
 * BossTriggerSystem — spawns the boss when the player crosses the
 * trigger line and all normal enemies have been eliminated.
 *
 * Priority 13: runs before BossAISystem (14) and EnemyAISystem (15).
 */

import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { Container } from 'pixi.js';
import type { LevelData } from '../level/level-data.js';
import { createBossWarden } from '../entities/create-boss-warden.js';

export class BossTriggerSystem implements System {
  readonly priority = 13;

  private readonly physicsCtx: PhysicsContext;
  private readonly worldContainer: Container;
  private readonly levelData: LevelData;

  /** Whether the player has crossed the trigger X-threshold. */
  private triggered = false;

  /** Whether the boss has been spawned (prevents double-spawn). */
  private bossSpawned = false;

  constructor(
    physicsCtx: PhysicsContext,
    worldContainer: Container,
    levelData: LevelData,
  ) {
    this.physicsCtx = physicsCtx;
    this.worldContainer = worldContainer;
    this.levelData = levelData;
  }

  update(world: World, _dt: number): void {
    // Only run once
    if (this.bossSpawned) return;

    // Only applies to levels with a boss arena
    if (!this.levelData.bossTriggerX || !this.levelData.bossArena) return;

    // Find player position
    const players = world.query('player', 'transform');
    if (players.length === 0) return;
    const playerTransform = world.getComponent(players[0], 'transform');
    if (!playerTransform) return;

    // Check if player has crossed the trigger line
    if (!this.triggered) {
      if (playerTransform.x >= this.levelData.bossTriggerX) {
        this.triggered = true;
      } else {
        return;
      }
    }

    // Check if all normal enemies are dead
    const enemies = world.query('enemy', 'health');
    for (const entity of enemies) {
      // Skip boss entities
      const boss = world.getComponent(entity, 'boss');
      if (boss) continue;

      const health = world.getComponent(entity, 'health');
      if (health && !health.isDead) return; // living enemy found — wait
    }

    // All clear — spawn the boss!
    const arena = this.levelData.bossArena;
    const spawnX = (arena.minX + arena.maxX) / 2;

    const bossEntity = createBossWarden(
      world, this.physicsCtx, this.worldContainer,
      spawnX, arena.y,
      arena.minX, arena.maxX,
    );

    // Activate the boss immediately
    const bossComp = world.getComponent(bossEntity, 'boss');
    if (bossComp) bossComp.activated = true;

    this.bossSpawned = true;
  }
}
