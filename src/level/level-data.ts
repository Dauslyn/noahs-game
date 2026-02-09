/**
 * Level data interfaces and the prototype level definition.
 *
 * All coordinate and size values are in **pixels**. The level builder
 * converts them to Rapier metres when creating physics bodies.
 */

import type { EnvironmentTheme } from './biome-config.js';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Defines a single rectangular platform / wall. */
export interface PlatformDef {
  /** Centre X position (pixels). */
  x: number;
  /** Centre Y position (pixels). */
  y: number;
  /** Width (pixels). */
  width: number;
  /** Height (pixels). */
  height: number;
  /** Optional fill colour (hex). Defaults to dark gray. */
  color?: number;
}

/** A spawn point for players or enemies within the level. */
export interface SpawnPointDef {
  /** X position (pixels). */
  x: number;
  /** Y position (pixels). */
  y: number;
  /** Entity type to spawn. */
  type:
    | 'player' | 'enemy-walker' | 'enemy-flyer' | 'enemy-turret'
    | 'enemy-sentry' | 'enemy-crawler' | 'enemy-shielder'
    | 'enemy-boss-warden';
}

/** Complete level definition consumed by the level builder. */
export interface LevelData {
  /** Human-readable level name. */
  name: string;
  /** Difficulty label shown on planet select. */
  difficulty: 'Easy' | 'Medium' | 'Hard';
  /** Visual biome theme for backgrounds and platform tinting. */
  environmentTheme: EnvironmentTheme;
  /** Total level width (pixels). */
  width: number;
  /** Total level height (pixels). */
  height: number;
  /** All platforms and walls. */
  platforms: PlatformDef[];
  /** Non-player spawn points. */
  spawnPoints: SpawnPointDef[];
  /** Where the player starts. */
  playerSpawn: { x: number; y: number };
  /** X coordinate that triggers boss spawn when player crosses it (pixels). */
  bossTriggerX?: number;
  /** Arena bounds for boss fight (pixels). */
  bossArena?: { minX: number; maxX: number; y: number };
}

// ---------------------------------------------------------------------------
// Prototype Level (~2560 x 1440)
// ---------------------------------------------------------------------------

/**
 * Hand-crafted test level for the playable prototype.
 *
 * Layout encourages jumping, double-jumping, and wall-jumping:
 *   - Full-width ground floor
 *   - Side walls and internal walls for wall-jump practice
 *   - Staggered floating platforms at varying heights
 */
export const PROTOTYPE_LEVEL: LevelData = {
  name: 'Zeta Station',
  difficulty: 'Easy',
  environmentTheme: 'sci-fi-interior',
  width: 2560,
  height: 1440,

  playerSpawn: { x: 200, y: 1300 },

  platforms: [
    // ---- Ground floor (full width) ----
    { x: 1280, y: 1400, width: 2560, height: 80 },

    // ---- Left wall ----
    { x: 10, y: 720, width: 20, height: 1440 },

    // ---- Right wall ----
    { x: 2550, y: 720, width: 20, height: 1440 },

    // ---- Internal wall (left-centre, good for wall-jumping) ----
    { x: 600, y: 1000, width: 30, height: 500 },

    // ---- Internal wall (centre-right, wall-jump practice) ----
    { x: 1600, y: 900, width: 30, height: 600 },

    // ---- Internal wall (far right) ----
    { x: 2200, y: 800, width: 30, height: 500 },

    // ---- Floating platforms (staggered for platforming) ----
    // Lower tier
    { x: 350, y: 1250, width: 200, height: 24 },
    { x: 800, y: 1200, width: 180, height: 24 },
    { x: 1200, y: 1150, width: 220, height: 24 },

    // Middle tier
    { x: 500, y: 1000, width: 160, height: 24 },
    { x: 1000, y: 950, width: 200, height: 24 },
    { x: 1400, y: 900, width: 180, height: 24 },
    { x: 1900, y: 1000, width: 200, height: 24 },

    // Upper tier
    { x: 300, y: 750, width: 180, height: 24 },
    { x: 750, y: 700, width: 160, height: 24 },
    { x: 1200, y: 650, width: 200, height: 24 },
    { x: 1800, y: 700, width: 180, height: 24 },
    { x: 2350, y: 750, width: 200, height: 24 },

    // High platforms
    { x: 550, y: 500, width: 140, height: 24 },
    { x: 1000, y: 450, width: 160, height: 24 },
    { x: 1500, y: 400, width: 180, height: 24 },
    { x: 2000, y: 500, width: 160, height: 24 },
  ],

  spawnPoints: [
    { x: 800, y: 1170, type: 'enemy-walker' },
    { x: 1400, y: 870, type: 'enemy-walker' },
    { x: 1200, y: 600, type: 'enemy-flyer' },
    { x: 2000, y: 470, type: 'enemy-turret' },
    { x: 750, y: 680, type: 'enemy-sentry' },
    { x: 1800, y: 480, type: 'enemy-sentry' },
  ],
};
