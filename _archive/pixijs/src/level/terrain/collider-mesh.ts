/**
 * Greedy meshing — merges adjacent solid cells into minimal rectangles
 * for efficient Rapier physics colliders.
 *
 * Scans left-to-right, top-to-bottom. For each unvisited solid cell,
 * expands right then down to form the largest possible rectangle.
 * Typical compression: ~3000 cells → 30-80 colliders.
 */

import { CELL_SOLID } from './terrain-types.js';
import type { TileGrid, MergedRect } from './terrain-types.js';

// ---------------------------------------------------------------------------
// Greedy meshing algorithm
// ---------------------------------------------------------------------------

/**
 * Merge solid cells into minimal rectangular regions.
 *
 * @param grid     - 2D tile grid (CELL_AIR / CELL_SOLID)
 * @param cellSize - size of each cell in pixels
 * @returns array of MergedRect in pixel coordinates (top-left origin)
 */
export function greedyMesh(grid: TileGrid, cellSize: number): MergedRect[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited: boolean[][] = [];

  // Initialize visited flags
  for (let r = 0; r < rows; r++) {
    visited.push(new Array(cols).fill(false));
  }

  const rects: MergedRect[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (visited[r][c] || grid[r][c] !== CELL_SOLID) continue;

      // Expand right as far as possible
      let width = 1;
      while (
        c + width < cols &&
        grid[r][c + width] === CELL_SOLID &&
        !visited[r][c + width]
      ) {
        width++;
      }

      // Expand downward as far as all columns in the row remain solid
      let height = 1;
      let canExpand = true;
      while (canExpand && r + height < rows) {
        for (let dc = 0; dc < width; dc++) {
          if (
            grid[r + height][c + dc] !== CELL_SOLID ||
            visited[r + height][c + dc]
          ) {
            canExpand = false;
            break;
          }
        }
        if (canExpand) height++;
      }

      // Mark all cells in this rectangle as visited
      for (let dr = 0; dr < height; dr++) {
        for (let dc = 0; dc < width; dc++) {
          visited[r + dr][c + dc] = true;
        }
      }

      // Convert to pixel coordinates (top-left origin)
      rects.push({
        x: c * cellSize,
        y: r * cellSize,
        width: width * cellSize,
        height: height * cellSize,
      });
    }
  }

  return rects;
}
