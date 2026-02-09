/**
 * spawnEnemies — creates enemy entities from level spawn point definitions.
 * Extracted from game.ts to keep the orchestrator under 250 lines.
 */

import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { Container } from 'pixi.js';
import type { SpawnPointDef } from './level-data.js';
import {
  createWalkerEnemy,
  createFlyerEnemy,
  createTurretEnemy,
  createSentryEnemy,
  createCrawlerEnemy,
  createShielderEnemy,
} from '../entities/create-enemy.js';

/**
 * Iterate over a level's spawn points and create the corresponding
 * enemy entities. Player spawn is handled separately by game.ts.
 */
export function spawnEnemies(
  spawnPoints: SpawnPointDef[],
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
): void {
  for (const sp of spawnPoints) {
    switch (sp.type) {
      case 'enemy-walker':
        createWalkerEnemy(world, physicsCtx, worldContainer, sp.x, sp.y);
        break;
      case 'enemy-flyer':
        createFlyerEnemy(world, physicsCtx, worldContainer, sp.x, sp.y);
        break;
      case 'enemy-turret':
        createTurretEnemy(world, physicsCtx, worldContainer, sp.x, sp.y);
        break;
      case 'enemy-sentry':
        createSentryEnemy(world, physicsCtx, worldContainer, sp.x, sp.y);
        break;
      case 'enemy-crawler':
        createCrawlerEnemy(world, physicsCtx, worldContainer, sp.x, sp.y);
        break;
      case 'enemy-shielder':
        createShielderEnemy(world, physicsCtx, worldContainer, sp.x, sp.y);
        break;
      case 'enemy-boss-warden':
        // Boss spawned dynamically by BossTriggerSystem — skip here
        break;
    }
  }
}
