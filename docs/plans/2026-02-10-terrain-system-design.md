# Terrain System Design

## Status: APPROVED
**Date:** 2026-02-10
**Phase:** Phase 4 — Visual Overhaul & Terrain

## Overview

Replace the current rectangle-based level system (`PlatformDef[]`) with a tile-grid terrain system that produces continuous, natural-looking landscapes — hills, valleys, caves, cliffs — while keeping the side-scrolling platformer gameplay unchanged.

## Goals

- **Natural terrain** — levels feel like real planets, not floating Tetris blocks
- **Heightmap authoring** — define terrain as a height profile + carved regions
- **Procedural generation** — simplex noise generates varied terrain per run
- **Static anchors** — key landmarks (landing zones, treasure rooms, boss arenas) are fixed
- **PixelLab tilesets** — AI-generated sidescroller tilesets for rendering
- **Efficient physics** — greedy meshing merges cells into minimal colliders
- **Backward compatible** — old levels with `platforms[]` still work

## Pipeline

```
Heightmap (or procedural noise)
    ↓
Fill 2D tile grid (solid/air)
    ↓
Carve caves + respect anchors
    ↓
Auto-tile: pick sprite per cell from PixelLab tileset (16-entry neighbour lookup)
    ↓
Greedy mesh: merge solid cells into minimal Rapier colliders
    ↓
Done — player, enemies, items spawn on top
```

## Data Model

### TerrainDef

```typescript
interface TerrainDef {
  /** Grid cell size in pixels (32 = each cell is 32x32). */
  cellSize: number;

  /**
   * Height profile — array of ground heights in pixels from top.
   * One value per column of cells across the level width.
   * OR 'procedural' to generate from noise.
   */
  heightMap: number[] | 'procedural';

  /** Seed for reproducible procedural generation. */
  seed?: number;

  /**
   * Carved-out regions — rectangles of empty space within solid terrain.
   * Used for caves, tunnels, overhangs. Coordinates in pixels.
   */
  caves?: { x: number; y: number; width: number; height: number }[];

  /**
   * Fixed features the generator must preserve.
   * Terrain is generated around these, never overwriting them.
   */
  anchors?: AnchorDef[];

  /** Primary tileset for rendering. */
  tilesetId: string;

  /**
   * Switch tileset in certain column ranges.
   * Example: columns 50-65 use cave tileset instead of grass.
   */
  tilesetZones?: { startCol: number; endCol: number; tilesetId: string }[];
}
```

### AnchorDef

```typescript
interface AnchorDef {
  /** Region in pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** What this anchor represents. */
  type: 'cave' | 'flat-zone' | 'item-room' | 'boss-arena';
  /** Force these cells to solid or air. */
  fill: 'solid' | 'air';
}
```

### LevelData changes

```typescript
interface LevelData {
  // ... existing fields unchanged ...

  /** New terrain system. If present, used instead of platforms[]. */
  terrain?: TerrainDef;
}
```

## Heightmap → Grid Conversion

For each column in the heightmap:
1. Calculate which row the height falls in: `row = Math.floor(height / cellSize)`
2. Fill every cell from that row to the bottom of the grid as solid (1)
3. Everything above is air (0)
4. Carve out cave regions (set those cells back to 0)
5. Apply anchors (force cells to solid or air as specified)

## Procedural Generation

Using `simplex-noise` (already in project):

1. **Base terrain**: `height = baseY + noise1D(x * 0.01) * 150`
2. **Detail bumps**: `height += noise1D(x * 0.05) * 30`
3. **Cave carving**: where `noise2D(x * 0.03, y * 0.03) > 0.6`, carve air
4. **Constraints**:
   - Flatten anchor zones
   - Ensure minimum ground thickness (3+ cells)
   - Guarantee walkable path left-to-right

Seed is stored in `TerrainDef.seed` for reproducibility.

## Auto-Tiling (16-entry neighbour lookup)

Each solid cell checks 4 neighbours (up, right, down, left) → 4 bits → 16 tile variants:

```
Bit 0 = solid above    (1 = yes, 0 = air)
Bit 1 = solid right
Bit 2 = solid below
Bit 3 = solid left

Examples:
0b1111 (all solid)           → interior fill tile
0b0110 (right + below)       → top-left corner
0b1100 (left + below)        → top-right corner
0b0100 (only below)          → standalone surface block
0b0101 (above + below)       → vertical column
```

Lookup table maps each 4-bit value to a tile position in the PixelLab spritesheet. Tileset metadata JSON provides bounding boxes for each tile.

## Physics: Greedy Meshing

Merge adjacent solid cells into minimal rectangles:

1. Scan left-to-right, top-to-bottom
2. For each unvisited solid cell, expand right as far as possible
3. Expand downward as far as all columns remain solid
4. Mark covered cells as visited
5. Create one Rapier static cuboid collider for the merged rectangle
6. Repeat until all solid cells are covered

Typical compression: ~3000 cells → 30-80 colliders. Same performance as current system.

## Surface Decoration (Bonus layer)

After auto-tiling, randomly place cosmetic sprites on surface tiles:
- Flowers, small rocks, alien plants
- No physics, purely visual
- Breaks up tile repetition
- Seeded random for consistency

## File Structure

```
src/level/
  level-data.ts          ← MODIFY: add optional terrain field
  level-builder.ts       ← MODIFY: branch to terrain pipeline if terrain exists
  tile-renderer.ts       ← REPLACE: new auto-tiler using PixelLab tilesets

  terrain/
    terrain-types.ts     ← NEW: TerrainDef, AnchorDef, TileGrid interfaces
    heightmap.ts         ← NEW: heightmap → grid conversion + cave carving
    terrain-gen.ts       ← NEW: procedural generation with simplex noise
    auto-tiler.ts        ← NEW: neighbour lookup → tile selection
    collider-mesh.ts     ← NEW: greedy meshing → merged Rapier colliders
    tileset-loader.ts    ← NEW: load PixelLab tileset PNG + metadata JSON

assets/tiles/
  haven-grass.png        ← PixelLab grass/dirt sidescroller tileset
  haven-grass.json       ← tileset metadata
  haven-stone.png        ← PixelLab stone/moss sidescroller tileset
  haven-stone.json       ← tileset metadata
```

## Integration

- `game.ts` — **no changes**. Still calls `buildLevel(levelData, ...)`
- `level-builder.ts` — one branch: if `terrain` exists, use new pipeline; else rectangle fallback
- Enemy spawns, player spawn, boss trigger — **unchanged** (pixel coordinates on terrain)
- Camera, parallax, HUD — **unchanged**
- Old levels (Zeta Station, Crystal Caverns, Neon Outpost) — **unchanged** until redesigned

## Haven Level Example

```typescript
export const HAVEN: LevelData = {
  name: 'Haven',
  difficulty: 'Easy',
  environmentTheme: 'alien',
  width: 4000,
  height: 1200,
  playerSpawn: { x: 200, y: 500 },

  terrain: {
    cellSize: 32,
    heightMap: 'procedural',
    seed: 42,
    tilesetId: 'haven-grass',
    tilesetZones: [
      { startCol: 50, endCol: 65, tilesetId: 'haven-stone' },
    ],
    anchors: [
      { x: 0, y: 600, width: 400, height: 200, type: 'flat-zone', fill: 'solid' },
      { x: 1600, y: 500, width: 300, height: 200, type: 'item-room', fill: 'air' },
      { x: 3400, y: 600, width: 500, height: 300, type: 'boss-arena', fill: 'air' },
    ],
    caves: [
      { x: 1600, y: 500, width: 300, height: 200 },
    ],
  },

  platforms: [],
  spawnPoints: [
    { x: 600, y: 400, type: 'enemy-walker' },
    { x: 1200, y: 350, type: 'enemy-walker' },
    { x: 2000, y: 400, type: 'enemy-walker' },
  ],
};
```

## Future Enhancements (not in v1)

- **Smooth slopes**: polyline colliders + curved rendering from same heightmap
- **Destructible terrain**: mark cells as breakable, update grid on damage
- **Biome blending**: gradual transition between tilesets (not hard zone boundaries)
- **One-way platforms**: jump up through, land on top (surface cells flagged)
- **Water/liquid**: fill low areas below a water line with animated fluid
