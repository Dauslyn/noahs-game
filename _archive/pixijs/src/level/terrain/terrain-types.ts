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
