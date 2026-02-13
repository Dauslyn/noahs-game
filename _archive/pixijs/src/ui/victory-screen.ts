/**
 * VictoryScreen -- full-screen overlay showing level completion stats.
 * Dismissable via any key press after a short delay (prevents instant dismiss).
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';

const TITLE_STYLE = new TextStyle({
  fontFamily: 'monospace', fontSize: 32, fill: 0x00ffcc, fontWeight: 'bold',
});
const STAT_STYLE = new TextStyle({
  fontFamily: 'monospace', fontSize: 18, fill: 0xcccccc,
});
const PROMPT_STYLE = new TextStyle({
  fontFamily: 'monospace', fontSize: 16, fill: 0x888888,
});

/** Milliseconds before key input is accepted (prevents accidental dismiss). */
const INPUT_DELAY_MS = 500;

export interface VictoryStats {
  levelName: string;
  enemiesKilled: number;
  scrapEarned: number;
  timeSeconds: number;
}

/**
 * Full-screen victory overlay showing level completion stats.
 * Automatically listens for any keypress; calls onDismiss and self-destructs.
 */
export class VictoryScreen {
  readonly container: Container;
  private readonly keyHandler: (e: KeyboardEvent) => void;

  constructor(stats: VictoryStats, onDismiss: () => void) {
    this.container = new Container();

    // Semi-transparent dark backdrop (oversized to cover any viewport)
    const bg = new Graphics();
    bg.rect(0, 0, 4000, 3000);
    bg.fill({ color: 0x000000, alpha: 0.75 });
    this.container.addChild(bg);

    // Centre based on actual viewport
    const cx = window.innerWidth / 2;
    let y = window.innerHeight / 2 - 100;

    // Title
    const title = new Text({ text: 'MISSION COMPLETE', style: TITLE_STYLE });
    title.anchor.set(0.5, 0.5);
    title.x = cx;
    title.y = y;
    this.container.addChild(title);
    y += 50;

    // Level name
    const levelText = new Text({ text: stats.levelName, style: STAT_STYLE });
    levelText.anchor.set(0.5, 0.5);
    levelText.x = cx;
    levelText.y = y;
    this.container.addChild(levelText);
    y += 40;

    // Format time as M:SS
    const mins = Math.floor(stats.timeSeconds / 60);
    const secs = Math.floor(stats.timeSeconds % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    const lines = [
      `Enemies Defeated: ${stats.enemiesKilled}`,
      `Scrap Collected: ${stats.scrapEarned}`,
      `Time: ${timeStr}`,
    ];

    for (const line of lines) {
      const t = new Text({ text: line, style: STAT_STYLE });
      t.anchor.set(0.5, 0.5);
      t.x = cx;
      t.y = y;
      this.container.addChild(t);
      y += 30;
    }

    // Dismiss prompt
    y += 20;
    const prompt = new Text({
      text: 'PRESS ANY KEY TO CONTINUE', style: PROMPT_STYLE,
    });
    prompt.anchor.set(0.5, 0.5);
    prompt.x = cx;
    prompt.y = y;
    this.container.addChild(prompt);

    // Key handler -- delayed to avoid accidental instant dismiss
    this.keyHandler = () => {
      window.removeEventListener('keydown', this.keyHandler);
      this.container.destroy({ children: true });
      onDismiss();
    };
    setTimeout(() => {
      window.addEventListener('keydown', this.keyHandler, { once: true });
    }, INPUT_DELAY_MS);
  }

  /** Remove listener if screen is destroyed externally. */
  destroy(): void {
    window.removeEventListener('keydown', this.keyHandler);
    if (!this.container.destroyed) {
      this.container.destroy({ children: true });
    }
  }
}
