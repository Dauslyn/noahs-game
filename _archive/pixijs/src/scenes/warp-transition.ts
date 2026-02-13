/**
 * WarpTransition — star-stretch lines radiating from centre,
 * followed by fade to black. Calls onComplete when done.
 */

import { Container, Graphics } from 'pixi.js';

const NUM_LINES = 60;
const DURATION = 1.5;
const STRETCH_PHASE = 0.8;
const FADE_PHASE = 0.7;

interface WarpLine {
  angle: number;
  speed: number;
  length: number;
  brightness: number;
}

export class WarpTransition {
  readonly container: Container;
  private lines: WarpLine[] = [];
  private elapsed = 0;
  private gfx: Graphics;
  private fadeGfx: Graphics;
  private cx: number;
  private cy: number;
  private onComplete: () => void;
  private done = false;

  constructor(onComplete: () => void) {
    this.onComplete = onComplete;
    this.container = new Container();
    this.cx = window.innerWidth / 2;
    this.cy = window.innerHeight / 2;

    const bg = new Graphics();
    bg.rect(0, 0, window.innerWidth, window.innerHeight);
    bg.fill(0x000000);
    this.container.addChild(bg);

    this.gfx = new Graphics();
    this.container.addChild(this.gfx);

    this.fadeGfx = new Graphics();
    this.container.addChild(this.fadeGfx);

    for (let i = 0; i < NUM_LINES; i++) {
      this.lines.push({
        angle: Math.random() * Math.PI * 2,
        speed: 300 + Math.random() * 600,
        length: 0,
        brightness: 0.4 + Math.random() * 0.6,
      });
    }
  }

  /** Call each frame. Returns true when transition is complete. */
  update(dt: number): boolean {
    if (this.done) return true;
    this.elapsed += dt;

    if (this.elapsed < STRETCH_PHASE) {
      const t = this.elapsed / STRETCH_PHASE;
      this.gfx.clear();
      for (const line of this.lines) {
        line.length += line.speed * dt * (1 + t * 3);
        const x1 = this.cx + Math.cos(line.angle) * 20;
        const y1 = this.cy + Math.sin(line.angle) * 20;
        const x2 = this.cx + Math.cos(line.angle) * (20 + line.length);
        const y2 = this.cy + Math.sin(line.angle) * (20 + line.length);
        this.gfx.moveTo(x1, y1);
        this.gfx.lineTo(x2, y2);
        this.gfx.stroke({
          color: 0xffffff, width: 1.5,
          alpha: line.brightness * (0.5 + t * 0.5),
        });
      }
    }

    const fadeStart = DURATION - FADE_PHASE;
    if (this.elapsed > fadeStart) {
      const fadeT = Math.min(1, (this.elapsed - fadeStart) / FADE_PHASE);
      this.fadeGfx.clear();
      this.fadeGfx.rect(0, 0, window.innerWidth, window.innerHeight);
      this.fadeGfx.fill({ color: 0x000000, alpha: fadeT });
    }

    if (this.elapsed >= DURATION) {
      this.done = true;
      this.onComplete();
      return true;
    }
    return false;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
