/**
 * Asset loader – preloads all game assets (sprites, backgrounds) using
 * the PixiJS Assets API, with progress reporting for the loading screen.
 *
 * Sound files are loaded separately by SoundManager (Howler.js).
 */

import { Assets, Texture, ImageSource } from 'pixi.js';

// ---------------------------------------------------------------------------
// Asset paths – mapped to actual file locations in /assets
// ---------------------------------------------------------------------------

const ANSIMUZ_BASE =
  '/assets/sprites/ansimuz/Sideview Sci-Fi - Patreon Collection';

/** All game textures to preload. */
const TEXTURE_MANIFEST: Record<string, string> = {
  // Player (space marine)
  'player-idle': `${ANSIMUZ_BASE}/Sprites/space-marine/PNG/space-marine-idle.png`,
  'player-run': `${ANSIMUZ_BASE}/Sprites/space-marine/PNG/space-marine-run.png`,
  'player-jump': `${ANSIMUZ_BASE}/Sprites/space-marine/PNG/space-marine-jump.png`,
  'player-die': `${ANSIMUZ_BASE}/Sprites/space-marine/PNG/space-marine-die.png`,
  'player-shoot': `${ANSIMUZ_BASE}/Sprites/space-marine/PNG/space-marine-shoot.png`,
  'player-bullet': `${ANSIMUZ_BASE}/Sprites/space-marine/PNG/bullet.png`,

  // Walker enemy
  'walker-idle': `${ANSIMUZ_BASE}/Sprites/alien-walking-enemy/PNG/alien-enemy-idle.png`,
  'walker-walk': `${ANSIMUZ_BASE}/Sprites/alien-walking-enemy/PNG/alien-enemy-walk.png`,

  // Flyer enemy (individual frames)
  'flyer-1': `${ANSIMUZ_BASE}/Sprites/alien-flying-enemy/sprites/alien-enemy-flying1.png`,
  'flyer-2': `${ANSIMUZ_BASE}/Sprites/alien-flying-enemy/sprites/alien-enemy-flying2.png`,
  'flyer-3': `${ANSIMUZ_BASE}/Sprites/alien-flying-enemy/sprites/alien-enemy-flying3.png`,
  'flyer-4': `${ANSIMUZ_BASE}/Sprites/alien-flying-enemy/sprites/alien-enemy-flying4.png`,
  'flyer-5': `${ANSIMUZ_BASE}/Sprites/alien-flying-enemy/sprites/alien-enemy-flying5.png`,
  'flyer-6': `${ANSIMUZ_BASE}/Sprites/alien-flying-enemy/sprites/alien-enemy-flying6.png`,
  'flyer-7': `${ANSIMUZ_BASE}/Sprites/alien-flying-enemy/sprites/alien-enemy-flying7.png`,
  'flyer-8': `${ANSIMUZ_BASE}/Sprites/alien-flying-enemy/sprites/alien-enemy-flying8.png`,

  // Tank / turret
  'tank-unit': `${ANSIMUZ_BASE}/Sprites/tank-unit/PNG/tank-unit.png`,

  // Explosion
  'explosion': `${ANSIMUZ_BASE}/Sprites/Explosion/spritesheet/explosion-animation.png`,

  // Mech companion (pixel robot)
  'mech-robot': '/assets/sprites/mech/robot-spritesheet.png',

  // Tileset
  'tileset': '/assets/tiles/scifi_platformTiles_32x32.png',

  // Backgrounds (parallax layers)
  'bg-sky': `${ANSIMUZ_BASE}/Environments/alien-environment/PNG/layers/background.png`,
  'bg-structures': `${ANSIMUZ_BASE}/Environments/alien-environment/PNG/layers/back-structures.png`,

  // Another-world biome backgrounds
  'bg-another-world-sky': `${ANSIMUZ_BASE}/Environments/another-world/PNG/layered/sky.png`,
  'bg-another-world-towers': `${ANSIMUZ_BASE}/Environments/another-world/PNG/layered/back-towers.png`,

  // Cyberpunk biome background
  'bg-cyberpunk-back': `${ANSIMUZ_BASE}/Environments/cyberpunk-corridor-files/PNG/layers/back.png`,

  // Sci-fi interior biome background
  'bg-interior': `${ANSIMUZ_BASE}/Environments/sci-fi-interior-paltform/PNG/background.png`,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Whether assets have been loaded. */
let loaded = false;

/**
 * Load all game assets. Reports progress via optional callback.
 *
 * @param onProgress - callback invoked with progress 0-1
 */
export async function loadAllAssets(
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (loaded) return;

  const entries = Object.entries(TEXTURE_MANIFEST);
  const total = entries.length;
  let completed = 0;

  for (const [alias, src] of entries) {
    try {
      Assets.add({ alias, src });
    } catch {
      // Alias may already exist on hot-reload; ignore
    }
  }

  // Load all assets, tracking progress per-texture
  for (const [alias] of entries) {
    try {
      await Assets.load(alias);
    } catch (e) {
      console.warn(`[AssetLoader] Failed to load '${alias}':`, e);
    }
    completed++;
    onProgress?.(completed / total);
  }

  // Post-process: strip purple background from mech spritesheet
  await stripColorKey('mech-robot', 118, 66, 138);

  loaded = true;
  console.log(`[AssetLoader] Loaded ${completed}/${total} textures`);
}

// ---------------------------------------------------------------------------
// Color key removal (for sprites with opaque backgrounds)
// ---------------------------------------------------------------------------

/** Tolerance for color matching (0-255). */
const COLOR_KEY_TOLERANCE = 15;

/**
 * Replace a specific background color with transparency in a loaded texture.
 * Modifies the texture in-place using a canvas.
 *
 * PixiJS 8 stores the resource as ImageBitmap (not HTMLImageElement),
 * so we use CanvasRenderingContext2D.drawImage() which accepts both.
 *
 * @param alias - texture alias to process
 * @param r     - red component of the key color (0-255)
 * @param g     - green component of the key color (0-255)
 * @param b     - blue component of the key color (0-255)
 */
async function stripColorKey(
  alias: string,
  r: number,
  g: number,
  b: number,
): Promise<void> {
  const tex = Assets.get<Texture>(alias);
  if (!tex) return;

  const src = tex.source;
  const resource = src.resource as CanvasImageSource | undefined;

  // PixiJS 8 uses ImageBitmap; older versions use HTMLImageElement.
  // Both are valid CanvasImageSource for drawImage().
  if (
    !resource ||
    (!(resource instanceof HTMLImageElement) &&
     !(resource instanceof ImageBitmap))
  ) {
    console.warn(`[stripColorKey] Unsupported resource type for '${alias}'`);
    return;
  }

  const w = resource instanceof HTMLImageElement
    ? resource.naturalWidth : resource.width;
  const h = resource instanceof HTMLImageElement
    ? resource.naturalHeight : resource.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(resource, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const dr = Math.abs(data[i] - r);
    const dg = Math.abs(data[i + 1] - g);
    const db = Math.abs(data[i + 2] - b);
    if (dr <= COLOR_KEY_TOLERANCE && dg <= COLOR_KEY_TOLERANCE && db <= COLOR_KEY_TOLERANCE) {
      data[i + 3] = 0; // Set alpha to transparent
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Replace the texture source with the processed canvas
  const newSource = new ImageSource({ resource: canvas });
  tex.source = newSource;
  tex.update();
}

/**
 * Get a loaded texture by alias. Returns a fallback 1x1 white texture
 * if the alias was not loaded (prevents crashes).
 *
 * @param alias - the texture alias from the manifest
 */
export function getTexture(alias: string): Texture {
  const tex = Assets.get<Texture>(alias);
  if (!tex) {
    console.warn(`[AssetLoader] Texture '${alias}' not found, using fallback`);
    return Texture.WHITE;
  }
  return tex;
}

/**
 * Check if a specific texture was loaded successfully.
 *
 * @param alias - the texture alias to check
 */
export function hasTexture(alias: string): boolean {
  return Assets.get<Texture>(alias) != null;
}
