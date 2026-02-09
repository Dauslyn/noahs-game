/**
 * StarfieldSystem -- renders a procedural parallax star background.
 *
 * Creates three layers of stars (back, mid, front) using simplex noise
 * for placement. Each layer scrolls at a different parallax factor
 * relative to the camera, producing a depth effect.
 *
 * Priority -10: runs before all other systems so positions are ready
 * for rendering.
 */

import { Container, Graphics } from 'pixi.js';
import { createNoise2D } from 'simplex-noise';
import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../core/constants.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Configuration for a single parallax layer. */
interface LayerConfig {
  parallaxFactor: number;
  starCount: number;
  minSize: number;
  maxSize: number;
  minAlpha: number;
  maxAlpha: number;
  gridSpacing: number;
}

/** Data stored per-star for the twinkle effect. */
interface TwinkleStar {
  graphics: Graphics;
  baseAlpha: number;
  phase: number;
  speed: number;
}

const LAYER_CONFIGS: LayerConfig[] = [
  { parallaxFactor: 0.1, starCount: 200, minSize: 1, maxSize: 1, minAlpha: 0.2, maxAlpha: 0.5, gridSpacing: 15 },
  { parallaxFactor: 0.3, starCount: 100, minSize: 1, maxSize: 2, minAlpha: 0.4, maxAlpha: 0.7, gridSpacing: 25 },
  { parallaxFactor: 0.6, starCount: 50,  minSize: 2, maxSize: 3, minAlpha: 0.6, maxAlpha: 1.0, gridSpacing: 40 },
];

/** Noise threshold: values above this spawn a star. */
const NOISE_THRESHOLD = 0.3;

/** Star colours and their relative probabilities (cumulative). */
const STAR_COLORS: Array<{ threshold: number; color: number }> = [
  { threshold: 0.85, color: 0xffffff },  // 85% white
  { threshold: 0.93, color: 0xaaccff },  // 8% blue-white
  { threshold: 1.00, color: 0xffffcc },  // 7% warm yellow
];

/** Fraction of stars that get the twinkle effect. */
const TWINKLE_FRACTION = 0.2;

// ---------------------------------------------------------------------------
// StarfieldSystem
// ---------------------------------------------------------------------------

export class StarfieldSystem implements System {
  readonly priority = -10;

  /** Whether the starfield update logic runs each frame. */
  public enabled = true;

  /** PixiJS containers, one per parallax layer (back, mid, front). */
  private readonly layers: Container[] = [];

  /** Parallax factors matching each layer. */
  private readonly parallaxFactors: number[] = [];

  /** Stars that oscillate in brightness. */
  private readonly twinkleStars: TwinkleStar[] = [];

  /** Accumulated time for twinkle animation (seconds). */
  private elapsedTime = 0;

  /**
   * Build the starfield and insert containers into the stage.
   *
   * Containers are added at the very back of the stage (indices 0, 1, 2)
   * so every other display object renders on top.
   *
   * @param stage - the PixiJS Application stage
   */
  constructor(stage: Container) {
    const noise2D = createNoise2D();

    for (let i = 0; i < LAYER_CONFIGS.length; i++) {
      const cfg = LAYER_CONFIGS[i];
      const container = new Container();
      this.layers.push(container);
      this.parallaxFactors.push(cfg.parallaxFactor);

      this.populateLayer(container, cfg, noise2D);

      // Insert at the back of the stage (index i keeps order back -> front)
      stage.addChildAt(container, i);
    }
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  /**
   * Offset layers by camera position and animate twinkle.
   *
   * @param world - ECS world (used to find the player/camera target)
   * @param dt    - delta time in seconds
   */
  update(world: World, dt: number): void {
    if (!this.enabled) return;

    this.elapsedTime += dt;

    // Find camera target from the player's transform
    const players = world.query('transform', 'player');
    if (players.length === 0) return;

    const transform = world.getComponent(players[0], 'transform');
    if (!transform) return;

    // Offset each layer by camera position scaled by parallax factor
    for (let i = 0; i < this.layers.length; i++) {
      this.layers[i].x = -transform.x * this.parallaxFactors[i];
      this.layers[i].y = -transform.y * this.parallaxFactors[i];
    }

    // Animate twinkle stars: alpha = baseAlpha + sin(time * speed + phase) * 0.15
    for (const ts of this.twinkleStars) {
      ts.graphics.alpha = ts.baseAlpha + Math.sin(this.elapsedTime * ts.speed + ts.phase) * 0.15;
    }
  }

  /**
   * Show or hide all star layer containers.
   *
   * @param visible - whether the star layers should be visible
   */
  setVisible(visible: boolean): void {
    for (const layer of this.layers) {
      layer.visible = visible;
    }
  }

  // -----------------------------------------------------------------------
  // Star generation (private)
  // -----------------------------------------------------------------------

  /**
   * Procedurally place stars in a layer using simplex noise.
   *
   * A grid of candidate positions is evaluated; where noise exceeds the
   * threshold a star is drawn. A small random jitter prevents a visible
   * grid pattern.
   */
  private populateLayer(
    container: Container,
    cfg: LayerConfig,
    noise2D: (x: number, y: number) => number,
  ): void {
    // Cover an area larger than the screen to allow for parallax scrolling
    const margin = 1200;
    const startX = -margin;
    const startY = -margin;
    const endX = SCREEN_WIDTH + margin;
    const endY = SCREEN_HEIGHT + margin;

    let placed = 0;

    for (let gx = startX; gx < endX; gx += cfg.gridSpacing) {
      for (let gy = startY; gy < endY; gy += cfg.gridSpacing) {
        if (placed >= cfg.starCount) break;

        // Sample noise at scaled coordinates
        const n = noise2D(gx / 100, gy / 100);
        if (n <= NOISE_THRESHOLD) continue;

        // Normalise noise value from (NOISE_THRESHOLD, 1] to [0, 1]
        const t = (n - NOISE_THRESHOLD) / (1 - NOISE_THRESHOLD);

        // Size and alpha interpolated from layer config
        const size = cfg.minSize + t * (cfg.maxSize - cfg.minSize);
        const alpha = cfg.minAlpha + t * (cfg.maxAlpha - cfg.minAlpha);

        // Small random jitter so the grid isn't visible
        const jitterX = (Math.random() - 0.5) * cfg.gridSpacing * 0.6;
        const jitterY = (Math.random() - 0.5) * cfg.gridSpacing * 0.6;

        const color = pickStarColor(Math.random());

        const star = new Graphics();
        star.circle(0, 0, size);
        star.fill({ color });
        star.x = gx + jitterX;
        star.y = gy + jitterY;
        star.alpha = alpha;

        container.addChild(star);
        placed++;

        // Mark ~20% of stars for twinkle animation
        if (Math.random() < TWINKLE_FRACTION) {
          this.twinkleStars.push({
            graphics: star,
            baseAlpha: alpha,
            phase: Math.random() * Math.PI * 2,
            speed: 1.5 + Math.random() * 2.5,
          });
        }
      }
      if (placed >= cfg.starCount) break;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pick a star colour based on a random roll [0, 1).
 * Mostly white, occasionally blue-white or warm yellow.
 */
function pickStarColor(roll: number): number {
  for (const entry of STAR_COLORS) {
    if (roll < entry.threshold) return entry.color;
  }
  return 0xffffff;
}
