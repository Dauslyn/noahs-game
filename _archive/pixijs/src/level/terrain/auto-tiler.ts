/**
 * Auto-tiler — selects the correct Wang tile for each solid cell
 * based on its 4 corner values.
 *
 * Wang corner encoding:
 *   Each cell's 4 corners are shared with adjacent cells.
 *   A corner is "lower" (0 = solid terrain) when ALL 4 cells
 *   touching that corner are solid. Otherwise it's "upper" (1 = air/surface).
 *
 *   wangIndex = NW*8 + NE*4 + SW*2 + SE*1
 *
 * This produces the correct tile for every edge, corner, and interior
 * configuration in the terrain grid.
 */

import { CELL_SOLID } from './terrain-types.js';
import type { TileGrid } from './terrain-types.js';

// ---------------------------------------------------------------------------
// Core algorithm
// ---------------------------------------------------------------------------

/**
 * Check if a cell is solid.
 *
 * Out-of-bounds handling:
 *   - Above grid (row < 0): air — terrain doesn't extend upward
 *   - Below grid (row >= rows): solid — terrain fills to level bottom
 *   - Left/right of grid: solid — avoids surface edges at boundaries
 */
function isSolid(grid: TileGrid, row: number, col: number): boolean {
  if (row < 0) return false;                       // above = air
  if (row >= grid.length) return true;              // below = solid
  if (col < 0 || col >= grid[0].length) return true; // sides = solid
  return grid[row][col] === CELL_SOLID;
}

/**
 * Compute the Wang index for a solid cell at (row, col).
 *
 * Each corner of the cell is shared with 3 neighbouring cells.
 * A corner is "lower" (0) when all 4 cells sharing that corner are solid.
 * Otherwise it's "upper" (1) — meaning there's a surface/edge there.
 *
 * @returns Wang index 0-15, or -1 if the cell is air
 */
export function computeWangIndex(
  grid: TileGrid,
  row: number,
  col: number,
): number {
  if (!isSolid(grid, row, col)) return -1;

  // NW corner: shared by (row-1,col-1), (row-1,col), (row,col-1), (row,col)
  // Corner is "lower" (solid=0) when all 4 cells are solid
  const nwSolid =
    isSolid(grid, row - 1, col - 1) &&
    isSolid(grid, row - 1, col) &&
    isSolid(grid, row, col - 1) &&
    isSolid(grid, row, col);

  // NE corner: shared by (row-1,col), (row-1,col+1), (row,col), (row,col+1)
  const neSolid =
    isSolid(grid, row - 1, col) &&
    isSolid(grid, row - 1, col + 1) &&
    isSolid(grid, row, col) &&
    isSolid(grid, row, col + 1);

  // SW corner: shared by (row,col-1), (row,col), (row+1,col-1), (row+1,col)
  const swSolid =
    isSolid(grid, row, col - 1) &&
    isSolid(grid, row, col) &&
    isSolid(grid, row + 1, col - 1) &&
    isSolid(grid, row + 1, col);

  // SE corner: shared by (row,col), (row,col+1), (row+1,col), (row+1,col+1)
  const seSolid =
    isSolid(grid, row, col) &&
    isSolid(grid, row, col + 1) &&
    isSolid(grid, row + 1, col) &&
    isSolid(grid, row + 1, col + 1);

  // upper=1 (air/surface), lower=0 (solid interior)
  const nw = nwSolid ? 0 : 1;
  const ne = neSolid ? 0 : 1;
  const sw = swSolid ? 0 : 1;
  const se = seSolid ? 0 : 1;

  return nw * 8 + ne * 4 + sw * 2 + se * 1;
}

/**
 * Compute Wang indices for the entire tile grid.
 *
 * @returns 2D array same dimensions as input, with Wang index per cell.
 *          Air cells get -1.
 */
export function computeWangGrid(grid: TileGrid): number[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const result: number[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(computeWangIndex(grid, r, c));
    }
    result.push(row);
  }

  return result;
}
