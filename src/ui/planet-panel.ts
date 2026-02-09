/**
 * PlanetPanel — vertical list of planet deploy buttons for the hub screen.
 * Handles tier gating (locked planets) and weapon-equipped requirement.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { LevelData } from '../level/level-data.js';
import type { GameState } from '../core/game-state.js';
import { drawRect, MONO } from './ui-helpers.js';

const W = 320;
const H = 60;
const GAP = 16;
const COLOR = 0x1a1a3a;
const HOVER = 0x2a2a5a;
const BORDER = 0x00ccff;
const LOCKED_COLOR = 0x111122;
const LOCKED_BORDER = 0x444466;
const R = 8;
const DIFF_COLORS: Record<string, number> = {
  Easy: 0x44cc44, Medium: 0xcccc44, Hard: 0xcc4444,
};

/** Minimum ship tier for each level index (0-based). */
const LEVEL_TIER_REQS = [1, 2, 2];

interface PlnBtn { ctr: Container; bg: Graphics; idx: number }

export class PlanetPanel {
  readonly container: Container;
  private gameState: GameState;
  private buttons: PlnBtn[] = [];
  private onDeploy: (level: LevelData) => void;
  private levels: LevelData[];

  constructor(
    levels: LevelData[],
    gameState: GameState,
    onDeploy: (level: LevelData) => void,
  ) {
    this.gameState = gameState;
    this.onDeploy = onDeploy;
    this.levels = levels;
    this.container = new Container();

    for (let i = 0; i < levels.length; i++) {
      const btn = this.createBtn(levels[i], i);
      btn.ctr.x = -W / 2;
      btn.ctr.y = i * (H + GAP);
      this.container.addChild(btn.ctr);
      this.buttons.push(btn);
    }
    this.refresh();
  }

  /** Total height of the panel (for layout below). */
  get totalHeight(): number {
    return this.levels.length * (H + GAP);
  }

  /** Refresh all buttons based on weapon + tier state. */
  refresh(): void {
    const armed = this.gameState.equippedWeapon !== null;

    for (const pb of this.buttons) {
      const tierReq = LEVEL_TIER_REQS[pb.idx] ?? 1;
      const tierMet = this.gameState.shipTier >= tierReq;
      const accessible = armed && tierMet;

      pb.ctr.eventMode = accessible ? 'static' : 'none';
      pb.ctr.cursor = accessible ? 'pointer' : 'default';
      pb.ctr.alpha = tierMet ? (armed ? 1.0 : 0.4) : 0.35;

      if (!tierMet) {
        drawRect(pb.bg, W, H, R, LOCKED_COLOR, LOCKED_BORDER, 1);
      } else {
        drawRect(pb.bg, W, H, R, COLOR, BORDER, 1);
      }

      const lock = pb.ctr.getChildByName('lockLabel') as Text | null;
      if (lock) lock.visible = !tierMet;

      const arrow = pb.ctr.getChildByName('arrow') as Text | null;
      if (arrow) arrow.visible = tierMet;
    }
  }

  private createBtn(level: LevelData, idx: number): PlnBtn {
    const btn = new Container();
    const bg = new Graphics();
    drawRect(bg, W, H, R, COLOR, BORDER, 1);
    btn.addChild(bg);

    const nameText = new Text({
      text: level.name,
      style: new TextStyle({
        fontFamily: MONO, fontSize: 18, fill: 0xffffff, fontWeight: 'bold',
      }),
    });
    nameText.x = 16;
    nameText.y = 12;
    btn.addChild(nameText);

    const diffColor = DIFF_COLORS[level.difficulty] ?? 0xaaaaaa;
    const diffText = new Text({
      text: level.difficulty,
      style: new TextStyle({ fontFamily: MONO, fontSize: 12, fill: diffColor }),
    });
    diffText.x = 16;
    diffText.y = 36;
    btn.addChild(diffText);

    const tierReq = LEVEL_TIER_REQS[idx] ?? 1;
    if (tierReq > 1) {
      const lockText = new Text({
        text: 'REQUIRES SHIP TIER 2',
        style: new TextStyle({
          fontFamily: MONO, fontSize: 9, fill: 0xcc4444, fontWeight: 'bold',
        }),
      });
      lockText.x = W - 16;
      lockText.anchor.set(1, 0);
      lockText.y = 40;
      lockText.name = 'lockLabel';
      btn.addChild(lockText);
    }

    const arrow = new Text({
      text: '>',
      style: new TextStyle({ fontFamily: MONO, fontSize: 22, fill: 0x00ccff }),
    });
    arrow.x = W - 30;
    arrow.y = 16;
    arrow.name = 'arrow';
    btn.addChild(arrow);

    btn.on('pointerover', () => {
      const req = LEVEL_TIER_REQS[idx] ?? 1;
      if (this.gameState.shipTier >= req) {
        drawRect(bg, W, H, R, HOVER, BORDER, 2);
      }
    });
    btn.on('pointerout', () => {
      const req = LEVEL_TIER_REQS[idx] ?? 1;
      const met = this.gameState.shipTier >= req;
      drawRect(bg, W, H, R, met ? COLOR : LOCKED_COLOR, met ? BORDER : LOCKED_BORDER, 1);
    });
    btn.on('pointertap', () => this.onDeploy(level));

    return { ctr: btn, bg, idx };
  }
}
