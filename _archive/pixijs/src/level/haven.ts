/**
 * Haven — first terrain-based level using PixelLab tilesets.
 *
 * A lush alien grassland with rolling hills and a few caves.
 * Easy difficulty, designed for exploring the new terrain system.
 *
 * Spawn Y positions are pre-computed from the heightmap so entities
 * land on the terrain surface rather than floating or buried.
 */

import type { LevelData } from './level-data.js';
import { generateHeightmap } from './terrain/heightmap.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL_WIDTH = 4000;
const LEVEL_HEIGHT = 1200;
const CELL_SIZE = 32;
const SEED = 42;
const COLS = Math.ceil(LEVEL_WIDTH / CELL_SIZE);
const BASE_Y = LEVEL_HEIGHT * 0.6; // matches terrain-builder baseY

// Pre-compute heightmap (same seed + params as terrain-builder)
const heightMap = generateHeightmap(COLS, CELL_SIZE, BASE_Y, SEED);

// ---------------------------------------------------------------------------
// Spawn helper
// ---------------------------------------------------------------------------

/**
 * Get spawn Y so an entity stands on the terrain surface.
 *
 * @param x          - world X position in pixels
 * @param halfHeight - half the entity's height in pixels
 * @returns Y position (centre of entity, above ground)
 */
function spawnAbove(x: number, halfHeight: number): number {
  // Flat anchor zone: x < 400 → solid ground starts at y=640
  if (x < 400) return 640 - halfHeight;

  const col = Math.min(Math.floor(x / CELL_SIZE), heightMap.length - 1);
  // Snap height to cell boundary (same as fillGridFromHeightmap)
  const groundRow = Math.floor(heightMap[col] / CELL_SIZE);
  const groundY = groundRow * CELL_SIZE;
  return groundY - halfHeight;
}

// ---------------------------------------------------------------------------
// Level definition
// ---------------------------------------------------------------------------

/** Haven level definition — procedural terrain with grass tileset. */
export const HAVEN_LEVEL: LevelData = {
  name: 'Haven',
  difficulty: 'Easy',
  environmentTheme: 'haven',
  width: LEVEL_WIDTH,
  height: LEVEL_HEIGHT,

  playerSpawn: { x: 200, y: spawnAbove(200, 33) },

  terrain: {
    cellSize: CELL_SIZE,
    heightMap: 'procedural',
    seed: SEED,
    tilesetId: 'terrain-haven-grass',
    anchors: [
      // Flat landing zone at start
      {
        x: 0, y: 640, width: 400, height: 560,
        type: 'flat-zone', fill: 'solid',
      },
      // Clear air above landing zone so player spawns in open space
      {
        x: 0, y: 0, width: 400, height: 640,
        type: 'flat-zone', fill: 'air',
      },
    ],
    caves: [
      // Small cave system in the middle of the map
      { x: 1600, y: 800, width: 300, height: 150 },
    ],
  },

  // Empty platforms — terrain provides all ground
  platforms: [],

  spawnPoints: [
    { x: 800,  y: spawnAbove(800, 30),  type: 'enemy-walker' },
    { x: 1500, y: spawnAbove(1500, 30), type: 'enemy-walker' },
    { x: 2500, y: spawnAbove(2500, 40), type: 'enemy-flyer' },
    { x: 3200, y: spawnAbove(3200, 30), type: 'enemy-walker' },
  ],
};
