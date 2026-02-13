/**
 * Heightmap → tile grid converter.
 *
 * Converts a height profile (array of Y-values per column) into a 2D
 * tile grid of CELL_AIR / CELL_SOLID values. Optionally carves caves
 * and respects anchor zones.
 */

import { createNoise2D } from 'simplex-noise';
import { CELL_AIR, CELL_SOLID } from './terrain-types.js';
import type { TileGrid, TerrainDef, RegionDef, AnchorDef } from './terrain-types.js';

// ---------------------------------------------------------------------------
// Heightmap generation
// ---------------------------------------------------------------------------

/**
 * Generate a procedural heightmap using simplex noise.
 *
 * @param cols     - number of columns in the grid
 * @param cellSize - cell size in pixels
 * @param baseY    - base ground level in pixels from top
 * @param seed     - seed for reproducible noise
 * @returns array of ground heights (pixels from top), one per column
 */
export function generateHeightmap(
  cols: number,
  cellSize: number,
  baseY: number,
  seed: number = 42,
): number[] {
  // Seeded PRNG (mulberry32) — simplex-noise v4 takes a () => number
  let s = seed | 0;
  const seededRandom = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const noise = createNoise2D(seededRandom);
  const heights: number[] = [];

  for (let c = 0; c < cols; c++) {
    const x = c * cellSize;
    // Base terrain: gentle rolling hills
    // noise2D returns -1..1, scale to pixel amplitude
    const h1 = noise(x * 0.003, 0) * 120; // broad hills
    const h2 = noise(x * 0.01, 100) * 40;  // medium bumps
    const h3 = noise(x * 0.03, 200) * 15;  // fine detail
    heights.push(baseY + h1 + h2 + h3);
  }

  return heights;
}

// ---------------------------------------------------------------------------
// Grid filling
// ---------------------------------------------------------------------------

/**
 * Fill a tile grid from a heightmap.
 *
 * For each column, every cell at or below the height value becomes CELL_SOLID.
 * Everything above is CELL_AIR.
 *
 * @param heightMap - ground heights in pixels from top, one per column
 * @param cellSize  - size of each cell in pixels
 * @param totalRows - total rows in the grid
 * @returns 2D tile grid [row][col]
 */
export function fillGridFromHeightmap(
  heightMap: number[],
  cellSize: number,
  totalRows: number,
): TileGrid {
  const cols = heightMap.length;
  const grid: TileGrid = [];

  for (let r = 0; r < totalRows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      // Row in pixels = r * cellSize (top of cell)
      const cellTopY = r * cellSize;
      // Cell is solid if its top is at or below the ground height
      row.push(cellTopY >= heightMap[c] ? CELL_SOLID : CELL_AIR);
    }
    grid.push(row);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Cave carving & anchors
// ---------------------------------------------------------------------------

/**
 * Carve rectangular regions out of the grid (set cells to AIR).
 */
export function carveCaves(
  grid: TileGrid,
  caves: RegionDef[],
  cellSize: number,
): void {
  for (const cave of caves) {
    const startCol = Math.floor(cave.x / cellSize);
    const endCol = Math.ceil((cave.x + cave.width) / cellSize);
    const startRow = Math.floor(cave.y / cellSize);
    const endRow = Math.ceil((cave.y + cave.height) / cellSize);

    for (let r = startRow; r < endRow && r < grid.length; r++) {
      for (let c = startCol; c < endCol && c < grid[0].length; c++) {
        if (r >= 0 && c >= 0) grid[r][c] = CELL_AIR;
      }
    }
  }
}

/**
 * Apply anchor zones — force cells to solid or air as specified.
 */
export function applyAnchors(
  grid: TileGrid,
  anchors: AnchorDef[],
  cellSize: number,
): void {
  for (const anchor of anchors) {
    const startCol = Math.floor(anchor.x / cellSize);
    const endCol = Math.ceil((anchor.x + anchor.width) / cellSize);
    const startRow = Math.floor(anchor.y / cellSize);
    const endRow = Math.ceil((anchor.y + anchor.height) / cellSize);
    const value = anchor.fill === 'solid' ? CELL_SOLID : CELL_AIR;

    for (let r = startRow; r < endRow && r < grid.length; r++) {
      for (let c = startCol; c < endCol && c < grid[0].length; c++) {
        if (r >= 0 && c >= 0) grid[r][c] = value;
      }
    }
  }
}

/**
 * Build a complete tile grid from a TerrainDef.
 *
 * @param terrain    - terrain definition
 * @param levelWidth - total level width in pixels
 * @param levelHeight - total level height in pixels
 */
export function buildTileGrid(
  terrain: TerrainDef,
  levelWidth: number,
  levelHeight: number,
): TileGrid {
  const { cellSize } = terrain;
  const cols = Math.ceil(levelWidth / cellSize);
  const rows = Math.ceil(levelHeight / cellSize);

  // Generate or use provided heightmap
  let heightMap: number[];
  if (terrain.heightMap === 'procedural') {
    // Base ground at ~60% of level height
    const baseY = levelHeight * 0.6;
    heightMap = generateHeightmap(cols, cellSize, baseY, terrain.seed);
  } else {
    heightMap = terrain.heightMap;
  }

  // Fill grid from heightmap
  const grid = fillGridFromHeightmap(heightMap, cellSize, rows);

  // Carve caves
  if (terrain.caves) {
    carveCaves(grid, terrain.caves, cellSize);
  }

  // Apply anchors
  if (terrain.anchors) {
    applyAnchors(grid, terrain.anchors, cellSize);
  }

  return grid;
}
