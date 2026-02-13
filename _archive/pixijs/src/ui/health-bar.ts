/**
 * HealthBar -- a PixiJS-based health bar UI element.
 *
 * Displays a horizontal bar that scales and changes color based on
 * the player's current health relative to their maximum:
 *   - Green  (> 60% HP)
 *   - Yellow (30% - 60% HP)
 *   - Red    (< 30% HP)
 *
 * Positioned in the top-left corner of the screen (UI space).
 */

import { Container, Graphics, Text } from 'pixi.js';

/** Color thresholds for health bar fill. */
const COLOR_GREEN = 0x44ff44;
const COLOR_YELLOW = 0xffff44;
const COLOR_RED = 0xff4444;

/** Threshold ratios for color transitions. */
const THRESHOLD_GREEN = 0.6;
const THRESHOLD_YELLOW = 0.3;

export class HealthBar {
  /** Top-level container; add to uiContainer for screen-fixed positioning. */
  readonly container: Container;

  private readonly background: Graphics;
  private readonly foreground: Graphics;
  private readonly border: Graphics;
  private readonly label: Text;

  private readonly maxWidth = 200;
  private readonly height = 20;

  constructor() {
    this.container = new Container();
    this.container.x = 20;
    this.container.y = 20;

    // Background (dark gray fill behind the health fill)
    this.background = new Graphics();
    this.background.rect(0, 0, this.maxWidth, this.height);
    this.background.fill(0x333333);

    // Foreground (colored fill that scales with health ratio)
    this.foreground = new Graphics();

    // Border (white outline around the full bar area)
    this.border = new Graphics();
    this.border.rect(0, 0, this.maxWidth, this.height);
    this.border.stroke({ color: 0xffffff, width: 2 });

    // Label showing "HP current/max" to the right of the bar
    this.label = new Text({
      text: 'HP',
      style: {
        fontSize: 14,
        fill: 0xffffff,
        fontFamily: 'monospace',
      },
    });
    this.label.x = this.maxWidth + 10;
    this.label.y = 2;

    this.container.addChild(
      this.background,
      this.foreground,
      this.border,
      this.label,
    );
  }

  /**
   * Redraw the health bar to reflect current HP.
   *
   * @param current - current hit points
   * @param max     - maximum hit points
   */
  update(current: number, max: number): void {
    // Clamp ratio to [0, 1]
    const ratio = Math.max(0, Math.min(1, current / max));
    const width = ratio * this.maxWidth;

    // Determine fill color based on health ratio
    let color: number;
    if (ratio > THRESHOLD_GREEN) {
      color = COLOR_GREEN;
    } else if (ratio > THRESHOLD_YELLOW) {
      color = COLOR_YELLOW;
    } else {
      color = COLOR_RED;
    }

    // Redraw the foreground bar at the new width and color
    this.foreground.clear();
    this.foreground.rect(0, 0, width, this.height);
    this.foreground.fill(color);

    this.label.text = `HP ${Math.ceil(current)}/${max}`;
  }
}
