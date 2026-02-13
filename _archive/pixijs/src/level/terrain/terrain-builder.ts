/**
 * Terrain builder — orchestrates the full terrain pipeline:
 *
 * 1. Build tile grid from heightmap (or procedural noise)
 * 2. Compute Wang indices for auto-tiling
 * 3. Render tile sprites into a PixiJS Container
 * 4. Greedy-mesh solid cells into Rapier colliders
 *
 * Surface tiles use Wang auto-tiling for visual variety.
 * Deep underground is a single solid-colour fill for performance
 * and to avoid the "copy-pasted tile" look.
 */

import RAPIER from '@dimforge/rapier2d-compat';
import { Container, Sprite, Graphics } from 'pixi.js';
import type { World } from '../../core/world.js';
import type { PhysicsContext } from '../../core/physics.js';
import { pixelsToMeters } from '../../core/physics.js';
import { registerCollider } from '../../core/collision-utils.js';
import {
  createTransform,
  createPhysicsBody,
} from '../../components/index.js';
import type { TerrainDef } from './terrain-types.js';
import { buildTileGrid } from './heightmap.js';
import { computeWangGrid } from './auto-tiler.js';
import { greedyMesh } from './collider-mesh.js';
import { loadTileset, clearTilesetCache } from './tileset-loader.js';
import type { ParsedTileset } from './tileset-loader.js';

// Inline metadata imports (JSON files bundled by Vite)
import grassMeta from '../../../assets/tiles/haven-grass.json';
import stoneMeta from '../../../assets/tiles/haven-stone.json';

// ---------------------------------------------------------------------------
// Metadata registry
// ---------------------------------------------------------------------------

/** Map tileset aliases to their metadata JSON. */
const METADATA_REGISTRY: Record<string, Record<string, unknown>> = {
  'terrain-haven-grass': grassMeta as unknown as Record<string, unknown>,
  'terrain-haven-stone': stoneMeta as unknown as Record<string, unknown>,
};

/** Number of extra rows of wang_0 tiles to render below the surface. */
const UNDERGROUND_TILE_DEPTH = 2;

/** Default underground fill colour (dark earthy brown). */
const UNDERGROUND_FILL = 0x3a2520;

// ---------------------------------------------------------------------------
// Surface detection
// ---------------------------------------------------------------------------

/**
 * Find the first solid row per column (surface row).
 * Returns an array of row indices, one per column. Infinity if no solid.
 */
function findSurfaceRows(
  wangGrid: number[][],
  cols: number,
  rows: number,
): number[] {
  const surface: number[] = new Array(cols).fill(Infinity);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (wangGrid[r][c] >= 0) {
        surface[c] = r;
        break;
      }
    }
  }
  return surface;
}

// ---------------------------------------------------------------------------
// Tile rendering
// ---------------------------------------------------------------------------

/**
 * Render terrain tiles — surface tiles use Wang textures, deep underground
 * is a single coloured rectangle.
 */
function renderTerrainTiles(
  wangGrid: number[][],
  tileset: ParsedTileset,
  cellSize: number,
  levelWidth: number,
  levelHeight: number,
): Container {
  const container = new Container();
  const rows = wangGrid.length;
  const cols = wangGrid[0].length;

  // Find surface row per column to determine tile/fill boundary
  const surfaceRows = findSurfaceRows(wangGrid, cols, rows);

  // Render Wang tile sprites only for surface + shallow underground
  let tileCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wangIdx = wangGrid[r][c];
      if (wangIdx < 0) continue; // air cell

      // Only render individual tiles near the surface
      const maxTileRow = surfaceRows[c] + UNDERGROUND_TILE_DEPTH;
      if (wangIdx === 0 && r > maxTileRow) continue; // deep underground — skip

      // Surface tiles (wangIdx > 0) always render regardless of depth
      // (they're near caves, edges, etc.)
      const tex = tileset.tiles.get(wangIdx);
      if (!tex) continue;

      const sprite = new Sprite(tex);
      sprite.x = c * cellSize;
      sprite.y = r * cellSize;
      sprite.width = cellSize;
      sprite.height = cellSize;
      container.addChild(sprite);
      tileCount++;
    }
  }

  // Draw solid fill for the deep underground area.
  // Merge horizontal spans per row for efficient drawing.
  const gfx = new Graphics();
  for (let r = 0; r < rows; r++) {
    let spanStart = -1;
    for (let c = 0; c <= cols; c++) {
      const maxTileRow = c < cols ? surfaceRows[c] + UNDERGROUND_TILE_DEPTH : -1;
      const wangIdx = c < cols ? wangGrid[r][c] : -1;
      const needFill = wangIdx === 0 && r > maxTileRow;

      if (needFill && spanStart < 0) {
        spanStart = c;
      } else if (!needFill && spanStart >= 0) {
        gfx.rect(
          spanStart * cellSize,
          r * cellSize,
          (c - spanStart) * cellSize,
          cellSize,
        );
        spanStart = -1;
      }
    }
  }
  gfx.fill(UNDERGROUND_FILL);

  container.addChildAt(gfx, 0); // Behind tile sprites

  // Safety floor: full-width brown rect from shallowest surface to past
  // levelHeight. Plugs all gaps so parallax sky never bleeds through.
  const minSurface = Math.min(...surfaceRows.filter(v => v < Infinity));
  if (minSurface < rows) {
    const floorY = minSurface * cellSize;
    // +720 for camera overshoot buffer (viewport height)
    const floorH = levelHeight + 720 - floorY;
    if (floorH > 0) {
      const floor = new Graphics();
      floor.rect(0, floorY, levelWidth, floorH);
      floor.fill(UNDERGROUND_FILL);
      container.addChildAt(floor, 0);
    }
  }

  return container;
}

// ---------------------------------------------------------------------------
// Physics colliders
// ---------------------------------------------------------------------------

/**
 * Create Rapier static colliders from greedy-meshed rectangles.
 */
function createTerrainColliders(
  rects: { x: number; y: number; width: number; height: number }[],
  world: World,
  physicsCtx: PhysicsContext,
): void {
  for (const rect of rects) {
    const entity = world.createEntity();
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const physX = pixelsToMeters(cx);
    const physY = pixelsToMeters(cy);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(physX, physY);
    const body = physicsCtx.world.createRigidBody(bodyDesc);

    const halfW = pixelsToMeters(rect.width / 2);
    const halfH = pixelsToMeters(rect.height / 2);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfW, halfH);
    const collider = physicsCtx.world.createCollider(colliderDesc, body);

    world.addComponent(entity, createTransform(cx, cy));
    world.addComponent(entity, createPhysicsBody(body.handle, 'static'));
    registerCollider(physicsCtx, collider.handle, entity);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build terrain from a TerrainDef — the main entry point.
 */
export function buildTerrain(
  terrain: TerrainDef,
  levelWidth: number,
  levelHeight: number,
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
): void {
  const { cellSize, tilesetId } = terrain;

  const tileGrid = buildTileGrid(terrain, levelWidth, levelHeight);
  const wangGrid = computeWangGrid(tileGrid);

  const meta = METADATA_REGISTRY[tilesetId];
  if (!meta) {
    console.error(`[Terrain] No metadata for tileset '${tilesetId}'`);
    return;
  }

  const tileset = loadTileset(tilesetId, meta);
  if (!tileset) {
    console.error(`[Terrain] Failed to load tileset '${tilesetId}'`);
    return;
  }

  const tilesContainer = renderTerrainTiles(
    wangGrid, tileset, cellSize, levelWidth, levelHeight,
  );
  worldContainer.addChild(tilesContainer);

  const mergedRects = greedyMesh(tileGrid, cellSize);
  createTerrainColliders(mergedRects, world, physicsCtx);
}

/**
 * Clean up terrain caches (call between levels).
 */
export function cleanupTerrain(): void {
  clearTilesetCache();
}
