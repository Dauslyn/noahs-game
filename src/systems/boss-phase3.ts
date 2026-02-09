/**
 * Boss Phase 3 — enrage constants and minion-spawning logic.
 *
 * Phase 3 activates at ≤25% HP (75 HP). The boss attacks faster
 * and periodically spawns walker minions (2 every 8s, cap 4 active).
 */

import type { Container } from 'pixi.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { BossComponent } from '../components/boss.js';
import type { TransformComponent } from '../components/index.js';
import type { SoundManager } from '../audio/sound-manager.js';
import { createWalkerEnemy } from '../entities/create-enemy.js';
import { spawnFlash } from '../effects/spawn-flash.js';

// ---------------------------------------------------------------------------
// Enrage constants (faster attack timings in Phase 3)
// ---------------------------------------------------------------------------

/** Phase 3 charge speed (m/s) — faster than normal 8. */
export const P3_CHARGE_SPEED = 11;

/** Phase 3 cooldown after attack (seconds) — shorter than normal 1.5. */
export const P3_COOLDOWN_DURATION = 0.8;

/** Phase 3 patrol interval before next attack (seconds) — shorter than 3.0. */
export const P3_PATROL_INTERVAL = 1.8;

/** Phase 3 windup duration (seconds) — snappier than normal 0.8. */
export const P3_WINDUP_DURATION = 0.5;

// ---------------------------------------------------------------------------
// Minion spawning
// ---------------------------------------------------------------------------

/** Interval between minion spawn waves (seconds). */
const MINION_SPAWN_INTERVAL = 8.0;

/** Max active non-boss enemies before spawning is suppressed. */
const MAX_ACTIVE_MINIONS = 4;

/** Number of walkers spawned per wave. */
const WALKERS_PER_WAVE = 2;

/** Horizontal offset from boss position for spawned walkers (pixels). */
const SPAWN_OFFSET_X = 80;

/**
 * Attempt to spawn minion walkers during Phase 3.
 *
 * Decrements the spawn timer each frame. When it fires, spawns 2 walkers
 * at the boss position (offset ±80px) if fewer than 4 non-boss enemies
 * are alive. No-ops in phases 1 and 2.
 *
 * @returns true if minions were spawned this frame
 */
export function trySpawnMinions(
  boss: BossComponent,
  transform: TransformComponent,
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  soundManager: SoundManager,
  dt: number,
): boolean {
  // Only spawn minions in Phase 3
  if (boss.phase < 3) return false;

  boss.minionSpawnTimer -= dt;
  if (boss.minionSpawnTimer > 0) return false;

  // Reset timer for next wave
  boss.minionSpawnTimer = MINION_SPAWN_INTERVAL;

  // Count active non-boss enemies
  const enemies = world.query('enemy');
  let activeCount = 0;
  for (const entity of enemies) {
    const bossComp = world.getComponent(entity, 'boss');
    const health = world.getComponent(entity, 'health');
    // Skip the boss itself and dead enemies
    if (bossComp || (health && health.isDead)) continue;
    activeCount++;
  }

  if (activeCount >= MAX_ACTIVE_MINIONS) return false;

  // Spawn walkers at boss position ±offset
  for (let i = 0; i < WALKERS_PER_WAVE; i++) {
    const offsetX = i === 0 ? -SPAWN_OFFSET_X : SPAWN_OFFSET_X;
    createWalkerEnemy(
      world, physicsCtx, worldContainer,
      transform.x + offsetX, transform.y,
    );
    spawnFlash(worldContainer, transform.x + offsetX, transform.y);
  }

  soundManager.play('minion-spawn');
  return true;
}
