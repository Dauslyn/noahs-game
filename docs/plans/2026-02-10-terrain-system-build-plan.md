# Terrain System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace rectangle-based levels with a heightmap-driven tile-grid terrain system that renders with PixelLab tilesets and generates efficient physics colliders.

**Architecture:** Heightmap (or simplex noise) fills a 2D grid of solid/air cells. A Wang-tile auto-tiler picks PixelLab tileset sprites for each cell based on corner neighbours. Greedy meshing merges solid cells into minimal Rapier cuboid colliders. The existing `buildLevel()` API is preserved — `LevelData` gains an optional `terrain` field that triggers the new pipeline.

**Tech Stack:** TypeScript (strict), PixiJS 8, Rapier2D, simplex-noise v4.0.3, PixelLab sidescroller tilesets (Wang tile format)

**Key design doc:** `docs/plans/2026-02-10-terrain-system-design.md`

**Key patterns to follow:**
- ECS: Entity=number, Components=plain objects, World=`Map<ComponentType, Map<Entity, Component>>`
- Physics: `PIXELS_PER_METER = 50`, Y-down coordinate system
- Static bodies: `RAPIER.RigidBodyDesc.fixed()`, cuboid colliders, register via `registerCollider()`
- Visuals: PixiJS `Container` + `Sprite`, added to `worldContainer`
- Max 250 lines per file. No placeholders.

**No test framework exists** — verify with `npx tsc --noEmit` and manual browser testing (`npm run dev`, port 3001).

---

## Task 1: Download & Register PixelLab Tilesets as Assets

**Files:**
- Create: `assets/tiles/haven-grass.png` (download from PixelLab API)
- Create: `assets/tiles/haven-grass.json` (download metadata)
- Create: `assets/tiles/haven-stone.png` (download from PixelLab API)
- Create: `assets/tiles/haven-stone.json` (download metadata)
- Modify: `src/core/asset-loader.ts` — add tileset entries to `TEXTURE_MANIFEST`

**Step 1: Download tileset images and metadata**

```bash
# Grass/dirt tileset
curl --fail -o assets/tiles/haven-grass.png \
  -H "Authorization: Bearer 0d4aaf4a-745c-4092-86ad-3d622f4d1b5c" \
  "https://api.pixellab.ai/mcp/sidescroller-tilesets/f6c6271d-3567-4042-a141-9fb8413763cd/image"

curl --fail -o assets/tiles/haven-grass.json \
  -H "Authorization: Bearer 0d4aaf4a-745c-4092-86ad-3d622f4d1b5c" \
  "https://api.pixellab.ai/mcp/sidescroller-tilesets/f6c6271d-3567-4042-a141-9fb8413763cd/metadata"

# Stone/moss tileset
curl --fail -o assets/tiles/haven-stone.png \
  -H "Authorization: Bearer 0d4aaf4a-745c-4092-86ad-3d622f4d1b5c" \
  "https://api.pixellab.ai/mcp/sidescroller-tilesets/4215b744-e9e1-437b-be20-4eb1df2c2423/image"

curl --fail -o assets/tiles/haven-stone.json \
  -H "Authorization: Bearer 0d4aaf4a-745c-4092-86ad-3d622f4d1b5c" \
  "https://api.pixellab.ai/mcp/sidescroller-tilesets/4215b744-e9e1-437b-be20-4eb1df2c2423/metadata"
```

**Step 2: Register tilesets in asset loader**

In `src/core/asset-loader.ts`, add to `TEXTURE_MANIFEST`:

```typescript
// PixelLab terrain tilesets (Haven)
'terrain-haven-grass': '/assets/tiles/haven-grass.png',
'terrain-haven-stone': '/assets/tiles/haven-stone.png',
```

**Step 3: Verify build**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add assets/tiles/haven-grass.png assets/tiles/haven-grass.json \
        assets/tiles/haven-stone.png assets/tiles/haven-stone.json \
        src/core/asset-loader.ts
git commit -m "feat: download and register PixelLab terrain tilesets for Haven"
```

---

## Task 2: Terrain Type Definitions

**Files:**
- Create: `src/level/terrain/terrain-types.ts`

**Step 1: Create the terrain types module**

Create `src/level/terrain/terrain-types.ts` with these interfaces:

```typescript
/**
 * Terrain system type definitions.
 *
 * TerrainDef configures how a level's terrain is generated and rendered.
 * TileGrid is the intermediate 2D array produced from the heightmap.
 */

/** A rectangular region in pixel coordinates. */
export interface RegionDef {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A fixed feature the terrain generator must preserve. */
export interface AnchorDef extends RegionDef {
  type: 'cave' | 'flat-zone' | 'item-room' | 'boss-arena';
  /** Force these cells to solid or air. */
  fill: 'solid' | 'air';
}

/** Switch tileset for a range of columns. */
export interface TilesetZoneDef {
  startCol: number;
  endCol: number;
  tilesetId: string;
}

/** Complete terrain definition for a level. */
export interface TerrainDef {
  /** Grid cell size in pixels (e.g. 32). */
  cellSize: number;
  /**
   * Height profile — array of ground Y-values in pixels (one per cell column),
   * OR 'procedural' to generate from simplex noise.
   */
  heightMap: number[] | 'procedural';
  /** Seed for reproducible procedural generation. */
  seed?: number;
  /** Carved-out regions (caves, tunnels). Pixel coordinates. */
  caves?: RegionDef[];
  /** Fixed features the generator must preserve. */
  anchors?: AnchorDef[];
  /** Primary tileset alias (registered in asset-loader). */
  tilesetId: string;
  /** Switch tileset in certain column ranges. */
  tilesetZones?: TilesetZoneDef[];
}

/** Cell state in the tile grid. */
export const CELL_AIR = 0;
export const CELL_SOLID = 1;

/** 2D tile grid: grid[row][col] = CELL_AIR or CELL_SOLID. */
export type TileGrid = number[][];

/** Merged rectangle from greedy meshing (pixel coordinates). */
export interface MergedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

**Step 2: Verify build**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/level/terrain/terrain-types.ts
git commit -m "feat: add terrain system type definitions"
```

---

## Task 3: Heightmap → Grid Conversion

**Files:**
- Create: `src/level/terrain/heightmap.ts`

**Step 1: Implement heightmap-to-grid conversion**

Create `src/level/terrain/heightmap.ts`:

```typescript
/**
 * Heightmap → tile grid conversion.
 *
 * Takes a height profile (Y value per column) and fills a 2D grid:
 * cells below the height line are solid, above are air.
 * Then carves out cave regions and applies anchors.
 */

import {
  CELL_AIR, CELL_SOLID,
  type TileGrid, type RegionDef, type AnchorDef,
} from './terrain-types.js';

/**
 * Create an empty tile grid (all air).
 *
 * @param cols - number of columns
 * @param rows - number of rows
 */
export function createEmptyGrid(cols: number, rows: number): TileGrid {
  const grid: TileGrid = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(CELL_AIR));
  }
  return grid;
}

/**
 * Fill a tile grid from a heightmap array.
 *
 * For each column, every cell at or below the height value becomes solid.
 * Heights are in pixels; cellSize converts to grid rows.
 *
 * @param heightMap - array of Y values (pixels from top), one per column
 * @param cellSize  - size of each grid cell in pixels
 * @param totalRows - total rows in the grid
 */
export function fillGridFromHeightmap(
  heightMap: number[],
  cellSize: number,
  totalRows: number,
): TileGrid {
  const cols = heightMap.length;
  const grid = createEmptyGrid(cols, totalRows);

  for (let col = 0; col < cols; col++) {
    // Row where the surface starts (Y-down: lower Y = higher on screen)
    const surfaceRow = Math.floor(heightMap[col] / cellSize);
    for (let row = surfaceRow; row < totalRows; row++) {
      grid[row][col] = CELL_SOLID;
    }
  }

  return grid;
}

/**
 * Carve cave regions out of a filled grid (set cells to air).
 *
 * @param grid     - the tile grid to modify in place
 * @param caves    - array of rectangular regions in pixel coordinates
 * @param cellSize - size of each grid cell in pixels
 */
export function carveCaves(
  grid: TileGrid,
  caves: RegionDef[],
  cellSize: number,
): void {
  const totalRows = grid.length;
  const totalCols = grid[0]?.length ?? 0;

  for (const cave of caves) {
    const startCol = Math.max(0, Math.floor(cave.x / cellSize));
    const endCol = Math.min(totalCols, Math.ceil((cave.x + cave.width) / cellSize));
    const startRow = Math.max(0, Math.floor(cave.y / cellSize));
    const endRow = Math.min(totalRows, Math.ceil((cave.y + cave.height) / cellSize));

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        grid[row][col] = CELL_AIR;
      }
    }
  }
}

/**
 * Apply anchors — force cells in anchor regions to solid or air.
 *
 * @param grid     - the tile grid to modify in place
 * @param anchors  - array of anchor definitions
 * @param cellSize - size of each grid cell in pixels
 */
export function applyAnchors(
  grid: TileGrid,
  anchors: AnchorDef[],
  cellSize: number,
): void {
  const totalRows = grid.length;
  const totalCols = grid[0]?.length ?? 0;

  for (const anchor of anchors) {
    const value = anchor.fill === 'solid' ? CELL_SOLID : CELL_AIR;
    const startCol = Math.max(0, Math.floor(anchor.x / cellSize));
    const endCol = Math.min(totalCols, Math.ceil((anchor.x + anchor.width) / cellSize));
    const startRow = Math.max(0, Math.floor(anchor.y / cellSize));
    const endRow = Math.min(totalRows, Math.ceil((anchor.y + anchor.height) / cellSize));

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        grid[row][col] = value;
      }
    }
  }
}
```

**Step 2: Verify build**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/level/terrain/heightmap.ts
git commit -m "feat: heightmap to tile grid conversion with cave carving and anchors"
```

---

## Task 4: Procedural Terrain Generation

**Files:**
- Create: `src/level/terrain/terrain-gen.ts`

**Step 1: Implement procedural heightmap generator**

Create `src/level/terrain/terrain-gen.ts`. Uses `simplex-noise` (already a project dependency).

```typescript
/**
 * Procedural terrain generation using simplex noise.
 *
 * Generates a heightmap array from noise, then converts to a tile grid.
 * Respects anchors (fixed landmarks) and carves caves using 2D noise.
 */

import { createNoise2D } from 'simplex-noise';
import type { TerrainDef, TileGrid } from './terrain-types.js';
import {
  fillGridFromHeightmap, carveCaves, applyAnchors,
} from './heightmap.js';

/**
 * Simple seeded PRNG (mulberry32) for reproducible noise.
 * Returns a function that produces values in [0, 1).
 */
function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a complete tile grid from a TerrainDef with procedural heightmap.
 *
 * @param terrain    - terrain definition (must have heightMap: 'procedural')
 * @param levelWidth - total level width in pixels
 * @param levelHeight - total level height in pixels
 * @returns filled and carved tile grid
 */
export function generateProceduralGrid(
  terrain: TerrainDef,
  levelWidth: number,
  levelHeight: number,
): TileGrid {
  const { cellSize, seed = 12345 } = terrain;
  const cols = Math.ceil(levelWidth / cellSize);
  const rows = Math.ceil(levelHeight / cellSize);
  const rng = seededRng(seed);
  const noise = createNoise2D(rng);

  // Base ground level at ~65% of level height
  const baseY = levelHeight * 0.65;

  // Generate heightmap from layered noise
  const heightMap: number[] = [];
  for (let col = 0; col < cols; col++) {
    const x = col / cols;
    // Large rolling hills (low freq, high amplitude)
    const hills = noise(x * 3, 0) * (levelHeight * 0.15);
    // Small bumps (high freq, low amplitude)
    const bumps = noise(x * 12, 100) * (levelHeight * 0.03);
    heightMap.push(baseY + hills + bumps);
  }

  // Flatten anchor zones in the heightmap
  if (terrain.anchors) {
    for (const anchor of terrain.anchors) {
      if (anchor.fill === 'solid' || anchor.type === 'flat-zone') {
        const startCol = Math.max(0, Math.floor(anchor.x / cellSize));
        const endCol = Math.min(cols, Math.ceil((anchor.x + anchor.width) / cellSize));
        const flatY = anchor.y;
        for (let c = startCol; c < endCol; c++) {
          heightMap[c] = flatY;
        }
      }
    }
  }

  // Fill grid from heightmap
  const grid = fillGridFromHeightmap(heightMap, cellSize, rows);

  // Carve caves from terrain def
  if (terrain.caves) {
    carveCaves(grid, terrain.caves, cellSize);
  }

  // Apply anchors (force solid/air regions)
  if (terrain.anchors) {
    applyAnchors(grid, terrain.anchors, cellSize);
  }

  return grid;
}
```

**Step 2: Verify build**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/level/terrain/terrain-gen.ts
git commit -m "feat: procedural terrain generation with simplex noise and anchor support"
```

---

## Task 5: Wang Tile Auto-Tiler

**Files:**
- Create: `src/level/terrain/auto-tiler.ts`

**Step 1: Implement the auto-tiler**

The PixelLab sidescroller tilesets use a Wang tile corner system. Each tile has 4 corners (NW, NE, SW, SE) that are "upper" (surface) or "lower" (fill/air). The metadata JSON contains a `pattern_4x4` for each tile with `row_1`/`row_2` inner values: `0 = lower, 1 = upper`.

The auto-tiler checks 4 corner values around each solid cell and looks up the matching tile.

Create `src/level/terrain/auto-tiler.ts`:

```typescript
/**
 * Wang-tile auto-tiler for PixelLab sidescroller tilesets.
 *
 * Each tile has 4 corners (NW, NE, SW, SE) = "upper" or "lower".
 * For each solid cell in the grid, sample the 4 corners from the
 * surrounding cells and find the matching tile in the tileset.
 */

import { Texture, Rectangle, Sprite, Container } from 'pixi.js';
import { getTexture, hasTexture } from '../../core/asset-loader.js';
import { CELL_SOLID, type TileGrid } from './terrain-types.js';

/** Parsed tile entry from PixelLab metadata. */
interface WangTile {
  /** Corner values: 0 = lower/solid, 1 = upper/surface */
  nw: number; ne: number; sw: number; se: number;
  /** Position in the spritesheet */
  bx: number; by: number; bw: number; bh: number;
}

/** Lookup table: cornerKey → WangTile */
type TileLookup = Map<string, WangTile>;

/**
 * Build a corner-key lookup from PixelLab tileset metadata JSON.
 *
 * @param metadata - parsed JSON from the .json metadata file
 * @returns lookup map keyed by "NW,NE,SW,SE" corner values
 */
export function buildTileLookup(metadata: Record<string, unknown>): TileLookup {
  const lookup: TileLookup = new Map();
  const data = metadata as { tileset_data: { tiles: Array<{
    pattern_4x4: { row_1: number[]; row_2: number[] };
    bounding_box: { x: number; y: number; width: number; height: number };
  }> } };

  for (const tile of data.tileset_data.tiles) {
    const p = tile.pattern_4x4;
    // Inner 2x2 of the 4x4 pattern = corners
    // row_1[1]=NW, row_1[2]=NE, row_2[1]=SW, row_2[2]=SE
    const nw = p.row_1[1];
    const ne = p.row_1[2];
    const sw = p.row_2[1];
    const se = p.row_2[2];
    const bb = tile.bounding_box;
    const key = `${nw},${ne},${sw},${se}`;
    lookup.set(key, { nw, ne, sw, se, bx: bb.x, by: bb.y, bw: bb.width, bh: bb.height });
  }

  return lookup;
}

/** Check if a cell is solid (with bounds checking). */
function isSolid(grid: TileGrid, row: number, col: number): boolean {
  if (row < 0 || row >= grid.length) return false;
  if (col < 0 || col >= (grid[0]?.length ?? 0)) return false;
  return grid[row][col] === CELL_SOLID;
}

/**
 * Determine the 4 corner values for a cell.
 *
 * Each corner is shared between 4 cells. A corner is "upper" (1) if
 * ANY of the 4 cells sharing that corner is air. Otherwise "lower" (0).
 * This creates smooth transitions at terrain boundaries.
 */
function getCorners(
  grid: TileGrid, row: number, col: number,
): { nw: number; ne: number; sw: number; se: number } {
  // A corner is "lower" (0 = solid/fill) if all 4 cells around it are solid.
  // Otherwise it's "upper" (1 = surface/transition).
  const s = isSolid;
  const nw = (s(grid, row-1, col-1) && s(grid, row-1, col) && s(grid, row, col-1) && s(grid, row, col)) ? 0 : 1;
  const ne = (s(grid, row-1, col) && s(grid, row-1, col+1) && s(grid, row, col) && s(grid, row, col+1)) ? 0 : 1;
  const sw = (s(grid, row, col-1) && s(grid, row, col) && s(grid, row+1, col-1) && s(grid, row+1, col)) ? 0 : 1;
  const se = (s(grid, row, col) && s(grid, row, col+1) && s(grid, row+1, col) && s(grid, row+1, col+1)) ? 0 : 1;
  return { nw, ne, sw, se };
}

/** Texture cache to avoid creating duplicate textures. */
const texCache = new Map<string, Texture>();

function getTileTexture(
  base: Texture, bx: number, by: number, bw: number, bh: number,
): Texture {
  const key = `${bx},${by}`;
  const cached = texCache.get(key);
  if (cached) return cached;
  const tex = new Texture({
    source: base.source,
    frame: new Rectangle(bx, by, bw, bh),
  });
  texCache.set(key, tex);
  return tex;
}

/**
 * Render terrain grid using Wang-tile auto-tiling.
 *
 * @param grid       - the filled tile grid
 * @param cellSize   - cell size in pixels
 * @param tilesetId  - asset alias for the tileset PNG
 * @param lookup     - Wang tile lookup table from metadata
 * @param container  - PixiJS container to add sprites to
 * @param zones      - optional tileset zone overrides (col ranges)
 */
export function renderTerrainTiles(
  grid: TileGrid,
  cellSize: number,
  tilesetId: string,
  lookup: TileLookup,
  container: Container,
  zones?: Array<{ startCol: number; endCol: number; tilesetId: string; lookup: TileLookup }>,
): void {
  if (!hasTexture(tilesetId)) return;
  const baseTexture = getTexture(tilesetId);
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col] !== CELL_SOLID) continue;

      // Pick tileset for this column (check zones)
      let activeLookup = lookup;
      let activeTexture = baseTexture;
      if (zones) {
        for (const zone of zones) {
          if (col >= zone.startCol && col < zone.endCol) {
            activeLookup = zone.lookup;
            if (hasTexture(zone.tilesetId)) {
              activeTexture = getTexture(zone.tilesetId);
            }
            break;
          }
        }
      }

      const corners = getCorners(grid, row, col);
      const key = `${corners.nw},${corners.ne},${corners.sw},${corners.se}`;
      const tile = activeLookup.get(key);
      if (!tile) continue; // No matching tile (shouldn't happen with 16 tiles)

      const tex = getTileTexture(activeTexture, tile.bx, tile.by, tile.bw, tile.bh);
      const sprite = new Sprite(tex);
      sprite.x = col * cellSize;
      sprite.y = row * cellSize;
      container.addChild(sprite);
    }
  }
}
```

**Step 2: Verify build**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/level/terrain/auto-tiler.ts
git commit -m "feat: Wang-tile auto-tiler for PixelLab sidescroller tilesets"
```

---

## Task 6: Greedy Meshing for Physics Colliders

**Files:**
- Create: `src/level/terrain/collider-mesh.ts`

**Step 1: Implement greedy meshing**

Create `src/level/terrain/collider-mesh.ts`:

```typescript
/**
 * Greedy meshing — merge adjacent solid cells into minimal rectangles
 * for efficient Rapier physics colliders.
 *
 * Scans the grid left-to-right, top-to-bottom. For each unvisited
 * solid cell, expands right then down to find the largest rectangle.
 * Typical compression: ~3000 cells → 30-80 colliders.
 */

import { CELL_SOLID, type TileGrid, type MergedRect } from './terrain-types.js';

/**
 * Merge solid cells in a tile grid into minimal rectangles.
 *
 * @param grid     - the tile grid (CELL_SOLID / CELL_AIR)
 * @param cellSize - size of each cell in pixels
 * @returns array of merged rectangles in pixel coordinates
 */
export function greedyMesh(grid: TileGrid, cellSize: number): MergedRect[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const rects: MergedRect[] = [];

  // Track which cells have been consumed by a rectangle
  const visited: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    visited.push(new Array(cols).fill(false));
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (visited[row][col] || grid[row][col] !== CELL_SOLID) continue;

      // Expand right as far as possible
      let w = 1;
      while (
        col + w < cols &&
        grid[row][col + w] === CELL_SOLID &&
        !visited[row][col + w]
      ) {
        w++;
      }

      // Expand down as far as all columns in the run remain solid
      let h = 1;
      let canExpand = true;
      while (canExpand && row + h < rows) {
        for (let c = col; c < col + w; c++) {
          if (grid[row + h][c] !== CELL_SOLID || visited[row + h][c]) {
            canExpand = false;
            break;
          }
        }
        if (canExpand) h++;
      }

      // Mark cells as visited
      for (let r = row; r < row + h; r++) {
        for (let c = col; c < col + w; c++) {
          visited[r][c] = true;
        }
      }

      // Store merged rectangle in pixel coordinates
      // x,y = centre position (to match Rapier body convention)
      rects.push({
        x: (col * cellSize) + (w * cellSize) / 2,
        y: (row * cellSize) + (h * cellSize) / 2,
        width: w * cellSize,
        height: h * cellSize,
      });
    }
  }

  return rects;
}
```

**Step 2: Verify build**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/level/terrain/collider-mesh.ts
git commit -m "feat: greedy meshing algorithm for terrain physics colliders"
```

---

## Task 7: Terrain Builder Integration

**Files:**
- Create: `src/level/terrain/terrain-builder.ts`
- Modify: `src/level/level-data.ts` — add `terrain?: TerrainDef` to `LevelData`
- Modify: `src/level/level-builder.ts` — branch to terrain pipeline when `terrain` exists

**Step 1: Create the terrain builder**

This is the orchestrator that ties heightmap → grid → tiles → colliders together.

Create `src/level/terrain/terrain-builder.ts`:

```typescript
/**
 * Terrain builder — orchestrates the full terrain pipeline.
 *
 * 1. Generate tile grid (from heightmap array or procedural noise)
 * 2. Render tiles using Wang-tile auto-tiler
 * 3. Generate physics colliders via greedy meshing
 */

import RAPIER from '@dimforge/rapier2d-compat';
import type { Container } from 'pixi.js';
import type { World } from '../../core/world.js';
import type { PhysicsContext } from '../../core/physics.js';
import { toPhysicsPos, pixelsToMeters } from '../../core/physics.js';
import { registerCollider } from '../../core/collision-utils.js';
import { createTransform, createPhysicsBody, createSprite } from '../../components/index.js';
import type { TerrainDef, TileGrid } from './terrain-types.js';
import { fillGridFromHeightmap, carveCaves, applyAnchors } from './heightmap.js';
import { generateProceduralGrid } from './terrain-gen.js';
import { buildTileLookup, renderTerrainTiles } from './auto-tiler.js';
import { greedyMesh } from './collider-mesh.js';

/**
 * Build terrain from a TerrainDef.
 *
 * @param terrain        - terrain definition from level data
 * @param levelWidth     - total level width in pixels
 * @param levelHeight    - total level height in pixels
 * @param world          - ECS world
 * @param physicsCtx     - Rapier physics context
 * @param worldContainer - PixiJS container for visuals
 */
export async function buildTerrain(
  terrain: TerrainDef,
  levelWidth: number,
  levelHeight: number,
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
): Promise<void> {
  const { cellSize } = terrain;

  // --- Step 1: Generate tile grid ---
  let grid: TileGrid;
  if (terrain.heightMap === 'procedural') {
    grid = generateProceduralGrid(terrain, levelWidth, levelHeight);
  } else {
    const rows = Math.ceil(levelHeight / cellSize);
    grid = fillGridFromHeightmap(terrain.heightMap, cellSize, rows);
    if (terrain.caves) carveCaves(grid, terrain.caves, cellSize);
    if (terrain.anchors) applyAnchors(grid, terrain.anchors, cellSize);
  }

  // --- Step 2: Load tileset metadata and render tiles ---
  const metadata = await loadTilesetMetadata(terrain.tilesetId);
  if (!metadata) return;
  const lookup = buildTileLookup(metadata);

  // Load zone metadata if needed
  let zones: Array<{
    startCol: number; endCol: number; tilesetId: string; lookup: ReturnType<typeof buildTileLookup>;
  }> | undefined;
  if (terrain.tilesetZones) {
    zones = [];
    for (const zone of terrain.tilesetZones) {
      const zoneMeta = await loadTilesetMetadata(zone.tilesetId);
      if (zoneMeta) {
        zones.push({
          ...zone,
          lookup: buildTileLookup(zoneMeta),
        });
      }
    }
  }

  const tileContainer = new Container();
  renderTerrainTiles(grid, cellSize, terrain.tilesetId, lookup, tileContainer, zones);
  worldContainer.addChild(tileContainer);

  // --- Step 3: Generate physics colliders ---
  const mergedRects = greedyMesh(grid, cellSize);
  for (const rect of mergedRects) {
    createTerrainCollider(rect.x, rect.y, rect.width, rect.height, world, physicsCtx);
  }
}

/** Create a static Rapier body + collider for a merged terrain rectangle. */
function createTerrainCollider(
  cx: number, cy: number, w: number, h: number,
  world: World, physicsCtx: PhysicsContext,
): void {
  const entity = world.createEntity();
  const physPos = toPhysicsPos(cx, cy);
  const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(physPos.x, physPos.y);
  const body = physicsCtx.world.createRigidBody(bodyDesc);
  const halfW = pixelsToMeters(w / 2);
  const halfH = pixelsToMeters(h / 2);
  const colliderDesc = RAPIER.ColliderDesc.cuboid(halfW, halfH);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  world.addComponent(entity, createTransform(cx, cy));
  world.addComponent(entity, createPhysicsBody(body.handle, 'static'));
  registerCollider(physicsCtx, collider.handle, entity);
}

/**
 * Load tileset metadata JSON from assets directory.
 * The JSON filename matches the tileset alias with a .json extension.
 */
async function loadTilesetMetadata(
  tilesetId: string,
): Promise<Record<string, unknown> | null> {
  // Map tileset alias to JSON path (e.g. 'terrain-haven-grass' → '/assets/tiles/haven-grass.json')
  const jsonPath = `/assets/tiles/${tilesetId.replace('terrain-', '')}.json`;
  try {
    const resp = await fetch(jsonPath);
    if (!resp.ok) return null;
    return await resp.json() as Record<string, unknown>;
  } catch {
    console.warn(`[TerrainBuilder] Failed to load metadata: ${jsonPath}`);
    return null;
  }
}
```

**Step 2: Add TerrainDef to LevelData**

In `src/level/level-data.ts`, add the import and optional field:

```typescript
// Add at top:
import type { TerrainDef } from './terrain/terrain-types.js';

// Add to LevelData interface, after bossArena:
  /** Tile-grid terrain system. If present, used instead of platforms[]. */
  terrain?: TerrainDef;
```

**Step 3: Update level-builder.ts to branch on terrain**

In `src/level/level-builder.ts`, modify `buildLevel()` to check for terrain:

```typescript
// Add import at top:
import { buildTerrain } from './terrain/terrain-builder.js';

// Replace the buildLevel function body:
export async function buildLevel(
  levelData: LevelData,
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
): Promise<void> {
  const biome = getBiomeConfig(levelData.environmentTheme);

  if (levelData.terrain) {
    // New terrain pipeline
    await buildTerrain(
      levelData.terrain,
      levelData.width,
      levelData.height,
      world,
      physicsCtx,
      worldContainer,
    );
  } else {
    // Legacy rectangle pipeline
    for (const platform of levelData.platforms) {
      buildPlatform(platform, world, physicsCtx, worldContainer, biome.platformTint);
    }
  }
}
```

**NOTE:** `buildLevel` changes from sync to async. The caller in `game.ts` will need `await`. Check `game.ts:loadLevel()` — it calls `buildLevel()`. Add `await` and make `loadLevel` async if not already. Propagate the async up as needed.

**Step 4: Verify build**

```bash
npx tsc --noEmit
```

Fix any async propagation issues (game.ts `loadLevel` may need to become async).

**Step 5: Commit**

```bash
git add src/level/terrain/terrain-builder.ts \
        src/level/level-data.ts \
        src/level/level-builder.ts \
        src/core/game.ts
git commit -m "feat: terrain builder integration — heightmap → tiles → colliders pipeline"
```

---

## Task 8: Haven Level Definition + Browser Test

**Files:**
- Create: `src/level/haven.ts`
- Modify: `src/level/extra-levels.ts` — add Haven to ALL_LEVELS
- Modify: `src/scenes/star-map-data.ts` — add Haven as a star system

**Step 1: Create Haven level definition**

Create `src/level/haven.ts`:

```typescript
/**
 * Haven — the first planet. Earth-like, easy difficulty.
 * Uses the terrain system for natural hills, a shallow cave, and a valley.
 */

import type { LevelData } from './level-data.js';

export const HAVEN: LevelData = {
  name: 'Haven',
  difficulty: 'Easy',
  environmentTheme: 'alien', // green/earth-like biome
  width: 4000,
  height: 1200,
  playerSpawn: { x: 200, y: 500 },

  terrain: {
    cellSize: 32,
    heightMap: 'procedural',
    seed: 42,
    tilesetId: 'terrain-haven-grass',
    tilesetZones: [
      // Cave section uses stone tileset
      { startCol: 50, endCol: 65, tilesetId: 'terrain-haven-stone' },
    ],
    anchors: [
      // Landing zone — always flat at the start
      { x: 0, y: 700, width: 400, height: 300, type: 'flat-zone', fill: 'solid' },
      // Shallow cave — carved out of a hillside
      { x: 1600, y: 650, width: 300, height: 180, type: 'cave', fill: 'air' },
    ],
    caves: [
      { x: 1600, y: 650, width: 300, height: 180 },
    ],
  },

  platforms: [], // terrain handles all ground
  spawnPoints: [
    { x: 800, y: 500, type: 'enemy-walker' },
    { x: 1400, y: 500, type: 'enemy-walker' },
    { x: 2200, y: 500, type: 'enemy-walker' },
    { x: 3000, y: 500, type: 'enemy-walker' },
  ],
};
```

**Step 2: Add Haven to ALL_LEVELS**

In `src/level/extra-levels.ts`, import and add Haven:

```typescript
import { HAVEN } from './haven.js';

// Update ALL_LEVELS:
export const ALL_LEVELS: LevelData[] = [
  HAVEN,         // New first planet
  PROTOTYPE_LEVEL,
  CRYSTAL_CAVERNS,
  NEON_OUTPOST,
];
```

**Step 3: Add Haven to star map**

In `src/scenes/star-map-data.ts`, add Haven as the first star system (tier 1, easy). Read the file first to see current structure, then add Haven as the first entry.

**Step 4: Verify build and test in browser**

```bash
npx tsc --noEmit
npm run dev
```

Open `http://localhost:3001` in browser. Navigate to star map, select Haven, deploy. Verify:
- Terrain renders with PixelLab tiles (grass surface, dirt fill)
- Hills/valleys appear (not flat)
- Cave section is carved out
- Player spawns and can walk on terrain
- Player doesn't fall through ground
- Landing zone is flat at the start

**Step 5: Commit**

```bash
git add src/level/haven.ts src/level/extra-levels.ts src/scenes/star-map-data.ts
git commit -m "feat: Haven level definition with procedural terrain — first playable terrain level"
```

---

## Task 9: Polish & Tune

**Files:**
- Possibly modify: `src/level/terrain/terrain-gen.ts` (tune noise params)
- Possibly modify: `src/level/haven.ts` (adjust anchors, spawn positions)
- Possibly modify: `src/level/terrain/auto-tiler.ts` (fix tile mapping edge cases)

**Step 1: Play-test and tune**

After Task 8, play-test Haven in the browser. Common issues to fix:
- **Terrain too steep**: Reduce noise amplitude in `terrain-gen.ts` (lower the `0.15` multiplier)
- **Terrain too flat**: Increase noise amplitude
- **Enemies spawning inside terrain**: Adjust spawn Y values in `haven.ts` to be above the terrain surface. May need a helper function `getTerrainSurfaceY(x, grid, cellSize)` that returns the Y of the topmost solid cell at column X.
- **Cave too small/big**: Adjust cave dimensions in `haven.ts`
- **Tile mapping wrong**: Check corner logic in `auto-tiler.ts` — the PixelLab Wang tile pattern may need adjustment based on actual rendering results

**Step 2: Add surface Y helper (if needed)**

If enemies spawn inside terrain, add a helper to `heightmap.ts`:

```typescript
/**
 * Get the Y position of the terrain surface at a given X coordinate.
 * Useful for placing entities on top of terrain.
 */
export function getSurfaceY(
  grid: TileGrid, x: number, cellSize: number,
): number {
  const col = Math.floor(x / cellSize);
  if (col < 0 || col >= (grid[0]?.length ?? 0)) return 0;
  for (let row = 0; row < grid.length; row++) {
    if (grid[row][col] === CELL_SOLID) {
      return row * cellSize;
    }
  }
  return grid.length * cellSize;
}
```

**Step 3: Verify build and re-test**

```bash
npx tsc --noEmit
```

Play-test again in browser.

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: tune Haven terrain generation and enemy spawn positions"
```

---

## Summary

| Task | What | New Files | ~Lines |
|------|------|-----------|--------|
| 1 | Download PixelLab tilesets, register assets | 4 asset files | ~2 |
| 2 | Terrain type definitions | terrain-types.ts | ~60 |
| 3 | Heightmap → grid conversion | heightmap.ts | ~110 |
| 4 | Procedural generation (simplex noise) | terrain-gen.ts | ~90 |
| 5 | Wang-tile auto-tiler | auto-tiler.ts | ~160 |
| 6 | Greedy meshing for colliders | collider-mesh.ts | ~70 |
| 7 | Terrain builder integration | terrain-builder.ts + mods | ~120 |
| 8 | Haven level + browser test | haven.ts + mods | ~50 |
| 9 | Polish & tune | tweaks | ~20 |

**Total: ~9 tasks, ~680 new lines across 6 new files + 3 modified files.**
**No file exceeds 250 lines.**
