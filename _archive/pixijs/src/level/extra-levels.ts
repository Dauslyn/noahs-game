/**
 * Additional planet levels beyond the prototype station.
 *
 * Crystal Caverns: vertical-heavy, many flyers, medium difficulty.
 * Neon Outpost: tight corridors, walkers & turrets, hard difficulty.
 */

import type { LevelData } from './level-data.js';

// ---------------------------------------------------------------------------
// Crystal Caverns — Medium difficulty
// ---------------------------------------------------------------------------

export const CRYSTAL_CAVERNS: LevelData = {
  name: 'Crystal Caverns',
  difficulty: 'Medium',
  environmentTheme: 'another-world',
  width: 3200,
  height: 1600,

  playerSpawn: { x: 200, y: 1450 },

  platforms: [
    // Ground floor
    { x: 1600, y: 1560, width: 3200, height: 80 },
    // Walls
    { x: 10, y: 800, width: 20, height: 1600 },
    { x: 3190, y: 800, width: 20, height: 1600 },

    // Vertical shafts (wall-jump required)
    { x: 800, y: 1000, width: 30, height: 800 },
    { x: 1000, y: 1000, width: 30, height: 800 },
    { x: 2200, y: 900, width: 30, height: 700 },
    { x: 2400, y: 900, width: 30, height: 700 },

    // Stepping stones (tight spacing for vertical platforming)
    { x: 350, y: 1400, width: 160, height: 24 },
    { x: 550, y: 1250, width: 140, height: 24 },
    { x: 350, y: 1100, width: 160, height: 24 },
    { x: 550, y: 950, width: 140, height: 24 },
    { x: 350, y: 800, width: 160, height: 24 },

    // Centre platforms
    { x: 1300, y: 1300, width: 200, height: 24 },
    { x: 1600, y: 1100, width: 220, height: 24 },
    { x: 1300, y: 900, width: 200, height: 24 },
    { x: 1600, y: 700, width: 220, height: 24 },
    { x: 1300, y: 500, width: 200, height: 24 },

    // Right side platforms
    { x: 2700, y: 1350, width: 180, height: 24 },
    { x: 2900, y: 1150, width: 160, height: 24 },
    { x: 2700, y: 950, width: 180, height: 24 },
    { x: 2900, y: 750, width: 160, height: 24 },
    { x: 2700, y: 550, width: 180, height: 24 },

    // High bridges
    { x: 900, y: 500, width: 300, height: 24 },
    { x: 1900, y: 400, width: 250, height: 24 },
    { x: 2600, y: 350, width: 280, height: 24 },
  ],

  spawnPoints: [
    { x: 550, y: 920, type: 'enemy-flyer' },
    { x: 1300, y: 870, type: 'enemy-flyer' },
    { x: 1600, y: 670, type: 'enemy-flyer' },
    { x: 2700, y: 920, type: 'enemy-walker' },
    { x: 2900, y: 1120, type: 'enemy-walker' },
    { x: 1900, y: 370, type: 'enemy-turret' },
    // Crawlers cling to ceilings above vertical shafts
    { x: 900, y: 610, type: 'enemy-crawler' },
    { x: 2300, y: 560, type: 'enemy-crawler' },
    // Phantom ambusher in the centre platform area
    { x: 1600, y: 1070, type: 'enemy-phantom' },
  ],
};

// ---------------------------------------------------------------------------
// Neon Outpost — Hard difficulty
// ---------------------------------------------------------------------------

export const NEON_OUTPOST: LevelData = {
  name: 'Neon Outpost',
  difficulty: 'Hard',
  environmentTheme: 'cyberpunk',
  width: 3600,
  height: 1400,

  playerSpawn: { x: 200, y: 1250 },

  // Boss arena trigger + bounds
  bossTriggerX: 2850,
  bossArena: { minX: 2800, maxX: 3580, y: 1280 },

  platforms: [
    // Ground (split — gaps force jumping)
    { x: 500, y: 1360, width: 1000, height: 80 },
    { x: 1700, y: 1360, width: 800, height: 80 },
    { x: 2500, y: 1360, width: 600, height: 80 },

    // Walls
    { x: 10, y: 700, width: 20, height: 1400 },
    { x: 3590, y: 700, width: 20, height: 1400 },

    // Tight corridor walls (create hallways)
    { x: 400, y: 1050, width: 30, height: 400 },
    { x: 900, y: 1050, width: 30, height: 400 },
    { x: 1400, y: 950, width: 30, height: 500 },
    { x: 1900, y: 950, width: 30, height: 500 },
    { x: 2400, y: 1050, width: 30, height: 400 },

    // Corridor platforms (between walls)
    { x: 650, y: 1100, width: 200, height: 24 },
    { x: 650, y: 900, width: 200, height: 24 },
    { x: 1150, y: 1050, width: 200, height: 24 },
    { x: 1150, y: 850, width: 200, height: 24 },
    { x: 1650, y: 1000, width: 200, height: 24 },
    { x: 1650, y: 800, width: 200, height: 24 },
    { x: 2150, y: 950, width: 200, height: 24 },
    { x: 2150, y: 750, width: 200, height: 24 },
    { x: 2600, y: 1100, width: 200, height: 24 },

    // Upper platforms
    { x: 400, y: 650, width: 180, height: 24 },
    { x: 800, y: 550, width: 160, height: 24 },
    { x: 1200, y: 500, width: 180, height: 24 },
    { x: 1600, y: 450, width: 200, height: 24 },
    { x: 2000, y: 500, width: 180, height: 24 },
    { x: 2400, y: 550, width: 160, height: 24 },

    // Top platform (reward)
    { x: 1400, y: 300, width: 300, height: 24 },

    // ---- Boss Arena (far right) ----
    // Wide floor platform
    { x: 3200, y: 1360, width: 800, height: 80 },
    // Elevated dodge platforms
    { x: 3000, y: 1100, width: 160, height: 24 },
    { x: 3400, y: 1100, width: 160, height: 24 },
  ],

  spawnPoints: [
    { x: 650, y: 870, type: 'enemy-walker' },
    { x: 1150, y: 820, type: 'enemy-walker' },
    { x: 1650, y: 770, type: 'enemy-walker' },
    { x: 2150, y: 720, type: 'enemy-walker' },
    { x: 2600, y: 1070, type: 'enemy-turret' },
    { x: 800, y: 520, type: 'enemy-turret' },
    { x: 1600, y: 420, type: 'enemy-flyer' },
    { x: 1400, y: 270, type: 'enemy-turret' },
    // Shielders patrol tight corridors — force flanking
    { x: 1150, y: 1020, type: 'enemy-shielder' },
    { x: 2150, y: 920, type: 'enemy-shielder' },
    // Phantom ambusher in the corridor area
    { x: 1650, y: 970, type: 'enemy-phantom' },
    // Boss (spawned dynamically by BossTriggerSystem)
    { x: 3200, y: 1280, type: 'enemy-boss-warden' },
  ],
};

// ---------------------------------------------------------------------------
// All levels for the planet select screen
// ---------------------------------------------------------------------------

import { PROTOTYPE_LEVEL } from './level-data.js';
import { HAVEN_LEVEL } from './haven.js';

/** All available planet levels in display order. */
export const ALL_LEVELS: LevelData[] = [
  PROTOTYPE_LEVEL,
  CRYSTAL_CAVERNS,
  NEON_OUTPOST,
  HAVEN_LEVEL,
];
