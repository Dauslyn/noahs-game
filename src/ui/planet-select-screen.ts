/**
 * PlanetSelectScreen – simple menu for choosing a planet to play.
 *
 * Displays the game title, a list of planet buttons, and calls back
 * when the player selects one. Built with PixiJS primitives.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { LevelData } from '../level/level-data.js';

// ---------------------------------------------------------------------------
// Styling constants
// ---------------------------------------------------------------------------

const BG_COLOR = 0x050515;
const BUTTON_WIDTH = 320;
const BUTTON_HEIGHT = 60;
const BUTTON_GAP = 16;
const BUTTON_COLOR = 0x1a1a3a;
const BUTTON_HOVER_COLOR = 0x2a2a5a;
const BUTTON_BORDER_COLOR = 0x00ccff;
const BUTTON_RADIUS = 8;

const DIFFICULTY_COLORS: Record<string, number> = {
  Easy: 0x44cc44,
  Medium: 0xcccc44,
  Hard: 0xcc4444,
};

// ---------------------------------------------------------------------------
// PlanetSelectScreen
// ---------------------------------------------------------------------------

export class PlanetSelectScreen {
  /** Root container – add to stage. */
  readonly container: Container;

  /** Callback fired when a planet is chosen. */
  private onSelect: ((level: LevelData) => void) | null = null;

  private bg: Graphics;

  constructor(levels: LevelData[], onSelect: (level: LevelData) => void) {
    this.onSelect = onSelect;
    this.container = new Container();

    // Full-screen dark background
    this.bg = new Graphics();
    this.drawBg();
    this.container.addChild(this.bg);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 36,
      fill: 0x00ccff,
      fontWeight: 'bold',
      dropShadow: { color: 0x003344, blur: 8, distance: 0 },
    });
    const title = new Text({ text: 'SELECT PLANET', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.x = window.innerWidth / 2;
    title.y = 80;
    this.container.addChild(title);

    // Subtitle
    const subStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: 0x4488aa,
    });
    const sub = new Text({
      text: 'Choose your destination',
      style: subStyle,
    });
    sub.anchor.set(0.5, 0);
    sub.x = window.innerWidth / 2;
    sub.y = 130;
    this.container.addChild(sub);

    // Planet buttons
    const startY = 180;
    for (let i = 0; i < levels.length; i++) {
      const btn = this.createButton(levels[i], i);
      btn.x = window.innerWidth / 2 - BUTTON_WIDTH / 2;
      btn.y = startY + i * (BUTTON_HEIGHT + BUTTON_GAP);
      this.container.addChild(btn);
    }
  }

  /** Remove from parent and clean up. */
  hide(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private drawBg(): void {
    this.bg.clear();
    this.bg.rect(0, 0, window.innerWidth, window.innerHeight);
    this.bg.fill(BG_COLOR);
  }

  private createButton(level: LevelData, _index: number): Container {
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    // Background rect
    const bg = new Graphics();
    bg.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS);
    bg.fill(BUTTON_COLOR);
    bg.stroke({ color: BUTTON_BORDER_COLOR, width: 1 });
    btn.addChild(bg);

    // Planet name
    const nameStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 18,
      fill: 0xffffff,
      fontWeight: 'bold',
    });
    const nameText = new Text({ text: level.name, style: nameStyle });
    nameText.x = 16;
    nameText.y = 12;
    btn.addChild(nameText);

    // Difficulty tag
    const diffColor = DIFFICULTY_COLORS[level.difficulty] ?? 0xaaaaaa;
    const diffStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: diffColor,
    });
    const diffText = new Text({
      text: level.difficulty,
      style: diffStyle,
    });
    diffText.x = 16;
    diffText.y = 36;
    btn.addChild(diffText);

    // Arrow indicator on right side
    const arrowStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 22,
      fill: 0x00ccff,
    });
    const arrow = new Text({ text: '>', style: arrowStyle });
    arrow.x = BUTTON_WIDTH - 30;
    arrow.y = 16;
    btn.addChild(arrow);

    // Hover effect
    btn.on('pointerover', () => {
      bg.clear();
      bg.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS);
      bg.fill(BUTTON_HOVER_COLOR);
      bg.stroke({ color: BUTTON_BORDER_COLOR, width: 2 });
    });
    btn.on('pointerout', () => {
      bg.clear();
      bg.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS);
      bg.fill(BUTTON_COLOR);
      bg.stroke({ color: BUTTON_BORDER_COLOR, width: 1 });
    });

    // Click → select planet
    btn.on('pointertap', () => {
      this.onSelect?.(level);
    });

    return btn;
  }
}
