/**
 * Tileset loader — loads PixelLab sidescroller tileset metadata and
 * extracts individual Wang tile textures from the spritesheet.
 *
 * PixelLab sidescroller tilesets are 128x128 PNG spritesheets containing
 * 16 Wang tiles in a 4x4 grid (each tile 32x32px). Each tile is identified
 * by its Wang index (0-15), encoding 4 corners:
 *
 *   wangIndex = NW*8 + NE*4 + SW*2 + SE*1
 *
 * where upper=1 (transparent/air) and lower=0 (solid terrain).
 */

import { Texture, Rectangle } from 'pixi.js';
import { getTexture, hasTexture } from '../../core/asset-loader.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single Wang tile entry from PixelLab metadata. */
export interface WangTileEntry {
  /** Wang index 0-15. */
  wangIndex: number;
  /** Bounding box in the spritesheet (pixels). */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Parsed tileset ready for auto-tiling. */
export interface ParsedTileset {
  /** Map from wang index (0-15) to extracted PixiJS Texture. */
  tiles: Map<number, Texture>;
  /** Tile size in pixels (typically 32). */
  tileSize: number;
}

// ---------------------------------------------------------------------------
// Metadata parsing
// ---------------------------------------------------------------------------

/**
 * Parse PixelLab metadata JSON into WangTileEntry array.
 * Metadata is fetched at build time and bundled as a JSON import.
 */
export function parseMetadata(json: Record<string, unknown>): WangTileEntry[] {
  const tilesetData = json['tileset_data'] as Record<string, unknown>;
  const tiles = tilesetData['tiles'] as Record<string, unknown>[];
  const entries: WangTileEntry[] = [];

  for (const tile of tiles) {
    const name = tile['name'] as string; // e.g. "wang_13"
    const wangIndex = parseInt(name.split('_')[1], 10);
    const bb = tile['bounding_box'] as Record<string, number>;

    entries.push({
      wangIndex,
      x: bb['x'],
      y: bb['y'],
      width: bb['width'],
      height: bb['height'],
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Texture extraction
// ---------------------------------------------------------------------------

/** Cache to avoid re-extracting textures. */
const tilesetCache = new Map<string, ParsedTileset>();

/**
 * Load a PixelLab tileset from pre-loaded assets.
 *
 * @param textureAlias - alias registered in asset-loader (e.g. 'terrain-haven-grass')
 * @param metadata     - raw JSON metadata from PixelLab
 * @returns ParsedTileset with 16 Wang tile textures
 */
export function loadTileset(
  textureAlias: string,
  metadata: Record<string, unknown>,
): ParsedTileset | null {
  // Return cached if available
  const cached = tilesetCache.get(textureAlias);
  if (cached) return cached;

  if (!hasTexture(textureAlias)) {
    console.warn(`[TilesetLoader] Texture '${textureAlias}' not loaded`);
    return null;
  }

  const baseTexture = getTexture(textureAlias);
  const entries = parseMetadata(metadata);
  const tiles = new Map<number, Texture>();

  for (const entry of entries) {
    const frame = new Rectangle(entry.x, entry.y, entry.width, entry.height);
    const tex = new Texture({ source: baseTexture.source, frame });
    tiles.set(entry.wangIndex, tex);
  }

  const tileSize = entries.length > 0 ? entries[0].width : 32;
  const parsed: ParsedTileset = { tiles, tileSize };
  tilesetCache.set(textureAlias, parsed);
  return parsed;
}

/**
 * Clear tileset cache (call on level teardown).
 */
export function clearTilesetCache(): void {
  tilesetCache.clear();
}
