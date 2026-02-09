/**
 * LoadingScreen – full-screen overlay shown while assets preload.
 *
 * Displays the game title, a progress bar, and fades out when loading
 * completes. Attach to the PixiJS stage, then call updateProgress()
 * from the asset loader callback, and hide() when done.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../core/constants.js';

/** Progress bar visual dimensions (pixels). */
const BAR_WIDTH = 300;
const BAR_HEIGHT = 16;
const BAR_Y_OFFSET = 60;
const BAR_BORDER_RADIUS = 8;

/** Background colour (dark space). */
const BG_COLOR = 0x050515;

/** Bar track colour (dim). */
const BAR_TRACK_COLOR = 0x1a1a3a;

/** Bar fill colour (bright cyan). */
const BAR_FILL_COLOR = 0x00ccff;

export class LoadingScreen {
  /** Root container – add to stage. */
  readonly container: Container;

  private readonly barFill: Graphics;
  private progress = 0;

  constructor() {
    this.container = new Container();

    // Full-screen dark background
    const bg = new Graphics();
    bg.rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    bg.fill(BG_COLOR);
    this.container.addChild(bg);

    // Title text
    const titleStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 36,
      fill: 0x00ccff,
      fontWeight: 'bold',
      dropShadow: {
        color: 0x003344,
        blur: 8,
        distance: 0,
      },
    });
    const title = new Text({ text: "NOAH'S GAME", style: titleStyle });
    title.anchor.set(0.5);
    title.x = SCREEN_WIDTH / 2;
    title.y = SCREEN_HEIGHT / 2 - 40;
    this.container.addChild(title);

    // Subtitle
    const subStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: 0x4488aa,
    });
    const sub = new Text({ text: 'Loading assets...', style: subStyle });
    sub.anchor.set(0.5);
    sub.x = SCREEN_WIDTH / 2;
    sub.y = SCREEN_HEIGHT / 2 + 10;
    this.container.addChild(sub);

    // Progress bar track (background)
    const barX = (SCREEN_WIDTH - BAR_WIDTH) / 2;
    const barY = SCREEN_HEIGHT / 2 + BAR_Y_OFFSET;
    const track = new Graphics();
    track.roundRect(barX, barY, BAR_WIDTH, BAR_HEIGHT, BAR_BORDER_RADIUS);
    track.fill(BAR_TRACK_COLOR);
    this.container.addChild(track);

    // Progress bar fill (foreground)
    this.barFill = new Graphics();
    this.container.addChild(this.barFill);

    this.drawBar(0);
  }

  /**
   * Update the progress bar fill.
   * @param progress - value between 0 and 1
   */
  updateProgress(progress: number): void {
    this.progress = Math.max(0, Math.min(1, progress));
    this.drawBar(this.progress);
  }

  /** Remove the loading screen from its parent. */
  hide(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }

  /** Redraw the fill bar at a given progress (0-1). */
  private drawBar(pct: number): void {
    const barX = (SCREEN_WIDTH - BAR_WIDTH) / 2;
    const barY = SCREEN_HEIGHT / 2 + BAR_Y_OFFSET;
    const fillWidth = Math.max(0, BAR_WIDTH * pct);

    this.barFill.clear();
    if (fillWidth > 0) {
      this.barFill.roundRect(barX, barY, fillWidth, BAR_HEIGHT, BAR_BORDER_RADIUS);
      this.barFill.fill(BAR_FILL_COLOR);
    }
  }
}
