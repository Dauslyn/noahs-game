/**
 * CameraSystem -- smoothly follows the player entity by moving the
 * world container. UI elements are unaffected because they live in
 * a separate uiContainer.
 *
 * Priority 90: runs after gameplay / physics but before the render
 * system (100) so that display-object positions are offset correctly.
 *
 * Camera logic:
 *   - Lerp towards the player position with a configurable smoothing factor.
 *   - Clamp to level bounds so the camera never shows beyond the edges.
 *   - The target position centres the player on screen:
 *       targetX = SCREEN_WIDTH / 2 - playerX
 *       targetY = SCREEN_HEIGHT / 2 - playerY
 */

import type { Container } from 'pixi.js';
import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../core/constants.js';

/** Rectangular bounds for the level (in pixels). */
export interface LevelBounds {
  /** Left edge of the level (pixels). */
  x: number;
  /** Top edge of the level (pixels). */
  y: number;
  /** Total level width (pixels). */
  width: number;
  /** Total level height (pixels). */
  height: number;
}

export class CameraSystem implements System {
  /** Runs just before the render system. */
  readonly priority = 90;

  /** The world container that the camera moves. */
  private readonly worldContainer: Container;

  /** Pixel bounds of the current level. */
  private bounds: LevelBounds;

  /**
   * Smoothing factor for the camera lerp.
   * Higher = more responsive, lower = smoother.
   * Multiplied by dt so the result is frame-rate independent.
   */
  private readonly smoothing: number;

  /**
   * @param worldContainer - the PixiJS Container representing the game world
   * @param bounds         - the level bounds in pixels
   * @param smoothing      - lerp speed factor (default 6)
   */
  constructor(
    worldContainer: Container,
    bounds: LevelBounds,
    smoothing = 6,
  ) {
    this.worldContainer = worldContainer;
    this.bounds = bounds;
    this.smoothing = smoothing;
  }

  /**
   * Update level bounds (e.g. when loading a new level).
   * @param bounds - new level bounds in pixels
   */
  setBounds(bounds: LevelBounds): void {
    this.bounds = bounds;
  }

  /**
   * Called once per frame. Finds the player entity, computes the
   * desired camera position, lerps towards it, and clamps to bounds.
   *
   * @param world - the ECS world to query
   * @param dt    - delta time in seconds
   */
  update(world: World, dt: number): void {
    const players = world.query('transform', 'player');
    if (players.length === 0) return;

    const playerEntity = players[0];
    const transform = world.getComponent(playerEntity, 'transform');
    if (!transform) return;

    // Target: centre the player on screen
    const targetX = SCREEN_WIDTH / 2 - transform.x;
    const targetY = SCREEN_HEIGHT / 2 - transform.y;

    // Lerp: move a fraction of the distance each frame (frame-rate independent)
    // t = 1 - e^(-smoothing * dt) gives a smooth, frame-rate-independent lerp
    const t = 1 - Math.exp(-this.smoothing * dt);
    const newX = this.worldContainer.x + (targetX - this.worldContainer.x) * t;
    const newY = this.worldContainer.y + (targetY - this.worldContainer.y) * t;

    // Clamp to level bounds so the camera doesn't show beyond edges
    this.worldContainer.x = this.clampX(newX);
    this.worldContainer.y = this.clampY(newY);
  }

  // -----------------------------------------------------------------------
  // Bounds clamping
  // -----------------------------------------------------------------------

  /**
   * Clamp horizontal camera offset so the viewport stays within level bounds.
   * Container position is negative (world moves left when camera moves right).
   *
   * When the level is narrower than the screen, centre it.
   */
  private clampX(x: number): number {
    if (this.bounds.width <= SCREEN_WIDTH) {
      // Level fits on screen; centre it
      return (SCREEN_WIDTH - this.bounds.width) / 2 - this.bounds.x;
    }

    // Maximum offset: left edge of level at left edge of screen
    const maxX = -this.bounds.x;
    // Minimum offset: right edge of level at right edge of screen
    const minX = SCREEN_WIDTH - (this.bounds.x + this.bounds.width);

    return Math.min(maxX, Math.max(minX, x));
  }

  /**
   * Clamp vertical camera offset so the viewport stays within level bounds.
   * Same logic as clampX but for the Y axis.
   */
  private clampY(y: number): number {
    if (this.bounds.height <= SCREEN_HEIGHT) {
      // Level fits on screen; centre it
      return (SCREEN_HEIGHT - this.bounds.height) / 2 - this.bounds.y;
    }

    // Maximum offset: top edge of level at top edge of screen
    const maxY = -this.bounds.y;
    // Minimum offset: bottom edge of level at bottom edge of screen
    const minY = SCREEN_HEIGHT - (this.bounds.y + this.bounds.height);

    return Math.min(maxY, Math.max(minY, y));
  }
}
