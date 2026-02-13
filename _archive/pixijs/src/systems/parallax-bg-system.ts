/**
 * ParallaxBgSystem -- renders a tiling parallax background for planet levels.
 *
 * Creates two layers from preloaded background textures:
 *   - Far layer (bg-sky): slow scrolling, fills entire screen
 *   - Near layer (bg-structures): faster scrolling, at the horizon
 *
 * Each layer scrolls horizontally based on the player's world position
 * multiplied by a parallax factor, creating a sense of depth.
 *
 * The sky texture is scaled to fill the screen height exactly once —
 * it only tiles horizontally (not vertically) to prevent visible seams.
 *
 * Priority -10: runs at the same tier as StarfieldSystem so background
 * positions are ready before rendering.
 */

import { TilingSprite, Container } from 'pixi.js';
import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import type { BiomeConfig } from '../level/biome-config.js';
import { getTexture, hasTexture } from '../core/asset-loader.js';

// Use window dimensions since the app uses resizeTo: window
const screenW = (): number => window.innerWidth;
const screenH = (): number => window.innerHeight;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Parallax scroll factor for the far sky layer (very slow). */
const SKY_PARALLAX = 0.05;

/** Parallax scroll factor for the near structures layer (moderate). */
const STRUCTURES_PARALLAX = 0.2;

// ---------------------------------------------------------------------------
// ParallaxLayer helper
// ---------------------------------------------------------------------------

/** Internal record for a single parallax layer. */
interface ParallaxLayer {
  sprite: TilingSprite;
  parallaxFactor: number;
}

// ---------------------------------------------------------------------------
// ParallaxBgSystem
// ---------------------------------------------------------------------------

export class ParallaxBgSystem implements System {
  readonly priority = -10;

  /** Active parallax layers (0-2 depending on loaded textures). */
  private readonly layers: ParallaxLayer[] = [];

  /**
   * Build tiling sprite layers and insert them at the back of the stage.
   *
   * @param stage - the PixiJS Application stage
   * @param biome - biome config with texture aliases
   */
  constructor(stage: Container, biome: BiomeConfig) {
    let insertIndex = 0;

    // Far layer: sky background (fills entire screen, tiles only horizontally)
    if (hasTexture(biome.skyAlias)) {
      const skyTexture = getTexture(biome.skyAlias);
      const texH = skyTexture.source.height;

      // Round UP to nearest integer so each source pixel maps to a whole
      // number of screen pixels — fractional scales cause visible line
      // artifacts with nearest-neighbor filtering.
      const scale = Math.ceil(screenH() / texH);

      const skySprite = new TilingSprite({
        texture: skyTexture,
        // Width covers screen (tiles horizontally for parallax)
        width: screenW(),
        // Height = one texture repeat only — prevents vertical seam
        height: screenH(),
      });
      skySprite.tileScale.set(scale, scale);
      // Lock vertical tile position — only scroll horizontally
      skySprite.tilePosition.y = 0;

      stage.addChildAt(skySprite, insertIndex);
      insertIndex++;

      this.layers.push({ sprite: skySprite, parallaxFactor: SKY_PARALLAX });
    } else {
      console.warn(
        `[ParallaxBg] ${biome.skyAlias} texture not loaded, skipping`,
      );
    }

    // Near layer: structures at the horizon
    if (biome.structuresAlias && hasTexture(biome.structuresAlias)) {
      const structTexture = getTexture(biome.structuresAlias);
      const texH = structTexture.source.height;

      // Scale structures so they're about 30% of screen height.
      // Round to nearest integer to avoid sub-pixel seam artifacts.
      const targetH = screenH() * 0.30;
      const scale = Math.max(1, Math.round(targetH / texH));

      const structSprite = new TilingSprite({
        texture: structTexture,
        width: screenW(),
        height: targetH,
      });
      structSprite.tileScale.set(scale, scale);
      // Position at horizon (~45% from top — just above midscreen)
      structSprite.y = screenH() * 0.45;
      // Semi-transparent so it blends with sky
      structSprite.alpha = 0.5;

      stage.addChildAt(structSprite, insertIndex);

      this.layers.push({
        sprite: structSprite,
        parallaxFactor: STRUCTURES_PARALLAX,
      });
    } else if (biome.structuresAlias) {
      console.warn(
        `[ParallaxBg] ${biome.structuresAlias} texture not loaded, skipping`,
      );
    }

    // (warnings for missing textures are logged above)
  }

  /** Show or hide all parallax layer sprites. */
  setVisible(visible: boolean): void {
    for (const layer of this.layers) {
      layer.sprite.visible = visible;
    }
  }

  /** Remove all parallax sprites from the stage and clean up. */
  destroy(stage: Container): void {
    for (const layer of this.layers) {
      stage.removeChild(layer.sprite);
      layer.sprite.destroy();
    }
    this.layers.length = 0;
  }

  /**
   * Offset each layer's tile position based on the player's world-space
   * position, creating the parallax scrolling effect.
   * Only scrolls horizontally — vertical tilePosition stays at 0.
   */
  update(world: World, _dt: number): void {
    if (this.layers.length === 0) return;

    const players = world.query('transform', 'player');
    if (players.length === 0) return;

    const transform = world.getComponent(players[0], 'transform');
    if (!transform) return;

    // Scroll each layer horizontally only (negative = bg moves left as player moves right)
    for (const layer of this.layers) {
      layer.sprite.tilePosition.x = -transform.x * layer.parallaxFactor;
      // Never scroll vertically — prevents seam lines
      layer.sprite.tilePosition.y = 0;
    }
  }
}
