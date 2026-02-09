/**
 * Tile renderer -- renders platforms using tiles from a tileset spritesheet.
 *
 * Uses a 9-slice approach: corners, edges, and fill tiles are arranged
 * in a grid to cover any arbitrary pixel width/height. Falls back to
 * a solid coloured Graphics rectangle if the tileset is unavailable.
 */

import { Texture, Rectangle, Sprite, Container, Graphics } from 'pixi.js';
import { getTexture, hasTexture } from '../core/asset-loader.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Size of each tile in pixels. */
const TILE_SIZE = 32;

/** Tileset alias registered in the asset loader. */
const TILESET_ALIAS = 'tileset';

/** Fallback colour when tileset is not loaded. */
const FALLBACK_FILL = 0x1a2a3a;

// ---------------------------------------------------------------------------
// Tile indices (col, row) into the 35x23 tileset grid
// ---------------------------------------------------------------------------

interface TileCoord {
  col: number;
  row: number;
}

const TILE_TOP_LEFT: TileCoord = { col: 0, row: 14 };
const TILE_TOP: TileCoord = { col: 1, row: 14 };
const TILE_TOP_RIGHT: TileCoord = { col: 2, row: 14 };
const TILE_LEFT: TileCoord = { col: 0, row: 15 };
const TILE_FILL: TileCoord = { col: 1, row: 15 };
const TILE_RIGHT: TileCoord = { col: 2, row: 15 };
const TILE_BOTTOM_LEFT: TileCoord = { col: 0, row: 16 };
const TILE_BOTTOM: TileCoord = { col: 1, row: 16 };
const TILE_BOTTOM_RIGHT: TileCoord = { col: 2, row: 16 };

// ---------------------------------------------------------------------------
// Tile texture cache
// ---------------------------------------------------------------------------

const tileCache = new Map<string, Texture>();

/**
 * Extract a single 32x32 tile texture from the tileset at (col, row).
 *
 * @param baseTexture - the full tileset texture
 * @param col         - column index (0-based)
 * @param row         - row index (0-based)
 * @returns the extracted tile Texture
 */
function getTileTexture(
  baseTexture: Texture,
  col: number,
  row: number,
): Texture {
  const key = `${col}_${row}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const rect = new Rectangle(
    col * TILE_SIZE,
    row * TILE_SIZE,
    TILE_SIZE,
    TILE_SIZE,
  );
  const tex = new Texture({ source: baseTexture.source, frame: rect });
  tileCache.set(key, tex);
  return tex;
}

/**
 * Pick the correct tile coordinate for a grid position using 9-slice.
 *
 * @param gx   - grid column index (0-based)
 * @param gy   - grid row index (0-based)
 * @param cols - total columns in the platform grid
 * @param rows - total rows in the platform grid
 * @returns the TileCoord to sample from the tileset
 */
function pickTile(
  gx: number,
  gy: number,
  cols: number,
  rows: number,
): TileCoord {
  const isLeft = gx === 0;
  const isRight = gx === cols - 1;
  const isTop = gy === 0;
  const isBottom = gy === rows - 1;

  // Single column: use left-edge tiles for the whole column
  if (cols === 1) {
    if (isTop) return TILE_TOP_LEFT;
    if (isBottom) return TILE_BOTTOM_LEFT;
    return TILE_LEFT;
  }

  // Single row: use top-row tiles for the whole row
  if (rows === 1) {
    if (isLeft) return TILE_TOP_LEFT;
    if (isRight) return TILE_TOP_RIGHT;
    return TILE_TOP;
  }

  if (isTop) {
    if (isLeft) return TILE_TOP_LEFT;
    if (isRight) return TILE_TOP_RIGHT;
    return TILE_TOP;
  }

  if (isBottom) {
    if (isLeft) return TILE_BOTTOM_LEFT;
    if (isRight) return TILE_BOTTOM_RIGHT;
    return TILE_BOTTOM;
  }

  if (isLeft) return TILE_LEFT;
  if (isRight) return TILE_RIGHT;
  return TILE_FILL;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a platform using tileset sprites in a 9-slice grid.
 *
 * Container is centred at (0,0), matching physics body alignment.
 * Falls back to a plain rectangle if the tileset is not loaded.
 *
 * @param width  - platform width in pixels
 * @param height - platform height in pixels
 * @returns a Container filled with tile Sprites
 */
export function renderPlatformTiled(
  width: number,
  height: number,
): Container {
  const container = new Container();

  // Fallback: plain coloured rectangle if tileset unavailable
  if (!hasTexture(TILESET_ALIAS)) {
    const gfx = new Graphics();
    gfx.rect(-width / 2, -height / 2, width, height);
    gfx.fill(FALLBACK_FILL);
    container.addChild(gfx);
    return container;
  }

  const baseTexture = getTexture(TILESET_ALIAS);

  // How many tiles are needed in each direction
  const cols = Math.max(1, Math.ceil(width / TILE_SIZE));
  const rows = Math.max(1, Math.ceil(height / TILE_SIZE));

  // Offset so the platform is centred at (0, 0)
  const offsetX = -width / 2;
  const offsetY = -height / 2;

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const tileCoord = pickTile(gx, gy, cols, rows);
      const tex = getTileTexture(
        baseTexture,
        tileCoord.col,
        tileCoord.row,
      );
      const sprite = new Sprite(tex);

      // Position tile in the grid
      sprite.x = offsetX + gx * TILE_SIZE;
      sprite.y = offsetY + gy * TILE_SIZE;

      // Clip edge tiles that overshoot the platform bounds
      const remainW = width - gx * TILE_SIZE;
      const remainH = height - gy * TILE_SIZE;
      if (remainW < TILE_SIZE) sprite.width = remainW;
      if (remainH < TILE_SIZE) sprite.height = remainH;

      container.addChild(sprite);
    }
  }

  return container;
}
