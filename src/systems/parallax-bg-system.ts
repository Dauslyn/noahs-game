/**
 * ParallaxBgSystem -- renders a tiling parallax background for planet levels.
 *
 * Creates two layers of tiling sprites from preloaded background textures:
 *   - Far layer (bg-sky): slow scrolling, fills entire screen
 *   - Near layer (bg-structures): faster scrolling, anchored to bottom
 *
 * Each layer scrolls horizontally based on the player's world position
 * multiplied by a parallax factor, creating a sense of depth.
 *
 * Priority -10: runs at the same tier as StarfieldSystem so background
 * positions are ready before rendering.
 */

import { TilingSprite, Container } from 'pixi.js';
import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import type { BiomeConfig } from '../level/biome-config.js';
// Use window dimensions since the app uses resizeTo: window
const screenW = (): number => window.innerWidth;
const screenH = (): number => window.innerHeight;
import { getTexture, hasTexture } from '../core/asset-loader.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Parallax scroll factor for the far sky layer (very slow). */
const SKY_PARALLAX = 0.05;

/** Parallax scroll factor for the near structures layer (moderate). */
const STRUCTURES_PARALLAX = 0.2;

/** Scale multiplier for the sky texture (192x176 is tiny, scale up). */
const SKY_TILE_SCALE = 4;

/** Scale multiplier for the structures texture. */
const STRUCTURES_TILE_SCALE = 3;

/** Fraction of screen height the structures layer occupies (bottom). */
const STRUCTURES_HEIGHT_FRACTION = 0.4;

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
   * If a texture failed to load, that layer is silently skipped so the
   * game never crashes due to missing background art.
   *
   * @param stage - the PixiJS Application stage
   */
  constructor(stage: Container, biome: BiomeConfig) {
    let insertIndex = 0;

    // Far layer: sky background (fills entire screen)
    if (hasTexture(biome.skyAlias)) {
      const skyTexture = getTexture(biome.skyAlias);
      const skySprite = new TilingSprite({
        texture: skyTexture,
        width: screenW(),
        height: screenH(),
      });
      // Scale the small 192x176 texture up so the repeat pattern isn't tiny
      skySprite.tileScale.set(SKY_TILE_SCALE, SKY_TILE_SCALE);

      stage.addChildAt(skySprite, insertIndex);
      insertIndex++;

      this.layers.push({
        sprite: skySprite,
        parallaxFactor: SKY_PARALLAX,
      });
    } else {
      console.warn(`[ParallaxBg] ${biome.skyAlias} texture not loaded, skipping`);
    }

    // Near layer: industrial structures (bottom portion of screen)
    if (biome.structuresAlias && hasTexture(biome.structuresAlias)) {
      const structTexture = getTexture(biome.structuresAlias);
      const structHeight = screenH() * STRUCTURES_HEIGHT_FRACTION;
      const structSprite = new TilingSprite({
        texture: structTexture,
        width: screenW(),
        height: structHeight,
      });
      // Scale up and position at the bottom of the screen
      structSprite.tileScale.set(STRUCTURES_TILE_SCALE, STRUCTURES_TILE_SCALE);
      structSprite.y = screenH() - structHeight;
      // Slight transparency so it blends with the sky behind it
      structSprite.alpha = 0.6;

      stage.addChildAt(structSprite, insertIndex);

      this.layers.push({
        sprite: structSprite,
        parallaxFactor: STRUCTURES_PARALLAX,
      });
    } else if (biome.structuresAlias) {
      console.warn(`[ParallaxBg] ${biome.structuresAlias} texture not loaded, skipping`);
    }

    if (this.layers.length > 0) {
      console.log(`[ParallaxBg] Created ${this.layers.length} parallax layers`);
    }
  }

  /** Show or hide all parallax layer sprites. */
  setVisible(visible: boolean): void {
    for (const layer of this.layers) {
      layer.sprite.visible = visible;
    }
  }

  /** Remove all parallax sprites from the stage and clean up filters. */
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
   *
   * @param world - ECS world (used to find the player)
   * @param dt    - delta time in seconds
   */
  update(world: World, _dt: number): void {
    if (this.layers.length === 0) return;

    // Find camera target from the player's transform
    const players = world.query('transform', 'player');
    if (players.length === 0) return;

    const transform = world.getComponent(players[0], 'transform');
    if (!transform) return;

    // Scroll each layer's tilePosition by player x scaled by parallax factor.
    // Negative direction so moving right in the world scrolls bg left.
    for (const layer of this.layers) {
      layer.sprite.tilePosition.x = -transform.x * layer.parallaxFactor;
    }
  }
}
