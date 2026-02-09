/**
 * HubScreen — combined weapon loadout + planet selection screen.
 * Players choose a weapon first, then pick a planet to deploy to.
 * Planet buttons stay grayed out until a weapon is selected.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { LevelData } from '../level/level-data.js';
import type { GameState } from '../core/game-state.js';
import { ALL_WEAPON_IDS, getWeaponDef } from '../combat/weapon-defs.js';
import type { WeaponId } from '../combat/weapon-defs.js';

const BG_COLOR = 0x050515;
const WPN_W = 140;
const WPN_H = 80;
const WPN_GAP = 16;
const WPN_DEFAULT = 0x1a1a3a;
const WPN_SELECTED = 0x003344;
const WPN_BORDER = 0x00ccff;
const PLN_W = 320;
const PLN_H = 60;
const PLN_GAP = 16;
const PLN_COLOR = 0x1a1a3a;
const PLN_HOVER = 0x2a2a5a;
const PLN_BORDER = 0x00ccff;
const PLN_R = 8;
const DIFF_COLORS: Record<string, number> = {
  Easy: 0x44cc44, Medium: 0xcccc44, Hard: 0xcc4444,
};
const MONO = 'monospace';

/** Helper: create a centered text and add it to a parent container. */
function centeredText(
  parent: Container, txt: string, style: TextStyle, x: number, y: number,
): Text {
  const t = new Text({ text: txt, style });
  t.anchor.set(0.5, 0);
  t.x = x;
  t.y = y;
  parent.addChild(t);
  return t;
}

/** Draw a rounded rect button background. */
function drawRect(
  g: Graphics, w: number, h: number, r: number,
  fill: number, stroke: number, strokeW: number,
): void {
  g.clear();
  g.roundRect(0, 0, w, h, r);
  g.fill(fill);
  g.stroke({ color: stroke, width: strokeW });
}

export class HubScreen {
  readonly container: Container;
  private gameState: GameState;
  private onDeploy: (level: LevelData) => void;
  private weaponBtns: { id: WeaponId; ctr: Container; bg: Graphics }[] = [];
  private planetBtns: Container[] = [];
  private warningText: Text;
  private scrapText: Text;

  constructor(
    levels: LevelData[],
    gameState: GameState,
    onDeploy: (level: LevelData) => void,
  ) {
    this.gameState = gameState;
    this.onDeploy = onDeploy;
    this.container = new Container();
    const cx = window.innerWidth / 2;

    // Full-screen background
    const bg = new Graphics();
    bg.rect(0, 0, window.innerWidth, window.innerHeight);
    bg.fill(BG_COLOR);
    this.container.addChild(bg);

    // Title
    centeredText(this.container, "NOAH'S GAME", new TextStyle({
      fontFamily: MONO, fontSize: 36, fill: 0x00ccff, fontWeight: 'bold',
      dropShadow: { color: 0x003344, blur: 8, distance: 0 },
    }), cx, 40);

    // Scrap counter
    this.scrapText = centeredText(
      this.container, `SCRAP: ${gameState.scrap}`,
      new TextStyle({ fontFamily: MONO, fontSize: 16, fill: 0xcccc44 }), cx, 88,
    );

    // LOADOUT header + weapon buttons
    this.addHeader('LOADOUT', cx, 126);
    const totalW = ALL_WEAPON_IDS.length * WPN_W + (ALL_WEAPON_IDS.length - 1) * WPN_GAP;
    const startX = cx - totalW / 2;
    for (let i = 0; i < ALL_WEAPON_IDS.length; i++) {
      const wb = this.createWeaponBtn(ALL_WEAPON_IDS[i]);
      wb.ctr.x = startX + i * (WPN_W + WPN_GAP);
      wb.ctr.y = 154;
      this.container.addChild(wb.ctr);
      this.weaponBtns.push(wb);
    }

    // DEPLOY header + planet buttons
    this.addHeader('DEPLOY', cx, 256);
    const plnY0 = 284;
    for (let i = 0; i < levels.length; i++) {
      const btn = this.createPlanetBtn(levels[i]);
      btn.x = cx - PLN_W / 2;
      btn.y = plnY0 + i * (PLN_H + PLN_GAP);
      this.container.addChild(btn);
      this.planetBtns.push(btn);
    }

    // Warning text
    const warnY = plnY0 + levels.length * (PLN_H + PLN_GAP) + 8;
    this.warningText = centeredText(
      this.container, 'Select a weapon to deploy',
      new TextStyle({ fontFamily: MONO, fontSize: 14, fill: 0xcc8844 }), cx, warnY,
    );

    this.refreshPlanetState();
    if (gameState.equippedWeapon) this.selectWeapon(gameState.equippedWeapon);
  }

  /** Remove from parent and destroy. */
  hide(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  // -- Weapon buttons --

  private createWeaponBtn(wid: WeaponId): { id: WeaponId; ctr: Container; bg: Graphics } {
    const def = getWeaponDef(wid);
    const ctr = new Container();
    ctr.eventMode = 'static';
    ctr.cursor = 'pointer';

    const bg = new Graphics();
    drawRect(bg, WPN_W, WPN_H, 6, WPN_DEFAULT, WPN_BORDER, 1);
    ctr.addChild(bg);

    // Colored dot matching projectile glow
    const dot = new Graphics();
    dot.circle(WPN_W / 2, 18, 6);
    dot.fill(def.style.glowColor);
    ctr.addChild(dot);

    // Weapon name (first word)
    centeredText(ctr, def.name.split(' ')[0], new TextStyle({
      fontFamily: MONO, fontSize: 14, fill: 0xffffff, fontWeight: 'bold',
    }), WPN_W / 2, 32);

    // Short description
    centeredText(ctr, def.description.slice(0, 22), new TextStyle({
      fontFamily: MONO, fontSize: 9, fill: 0x6688aa,
    }), WPN_W / 2, 54);

    ctr.on('pointertap', () => this.selectWeapon(wid));
    return { id: wid, ctr, bg };
  }

  private selectWeapon(wid: WeaponId): void {
    this.gameState.equippedWeapon = wid;
    for (const wb of this.weaponBtns) {
      const sel = wb.id === wid;
      drawRect(wb.bg, WPN_W, WPN_H, 6, sel ? WPN_SELECTED : WPN_DEFAULT, WPN_BORDER, sel ? 2 : 1);
    }
    this.refreshPlanetState();
  }

  // -- Planet buttons --

  private createPlanetBtn(level: LevelData): Container {
    const btn = new Container();

    const bg = new Graphics();
    drawRect(bg, PLN_W, PLN_H, PLN_R, PLN_COLOR, PLN_BORDER, 1);
    btn.addChild(bg);

    const nameText = new Text({
      text: level.name,
      style: new TextStyle({ fontFamily: MONO, fontSize: 18, fill: 0xffffff, fontWeight: 'bold' }),
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

    const arrow = new Text({
      text: '>',
      style: new TextStyle({ fontFamily: MONO, fontSize: 22, fill: 0x00ccff }),
    });
    arrow.x = PLN_W - 30;
    arrow.y = 16;
    btn.addChild(arrow);

    btn.on('pointerover', () => drawRect(bg, PLN_W, PLN_H, PLN_R, PLN_HOVER, PLN_BORDER, 2));
    btn.on('pointerout', () => drawRect(bg, PLN_W, PLN_H, PLN_R, PLN_COLOR, PLN_BORDER, 1));
    btn.on('pointertap', () => this.onDeploy(level));
    return btn;
  }

  /** Enable/disable planet buttons based on whether a weapon is equipped. */
  private refreshPlanetState(): void {
    const armed = this.gameState.equippedWeapon !== null;
    for (const btn of this.planetBtns) {
      btn.eventMode = armed ? 'static' : 'none';
      btn.cursor = armed ? 'pointer' : 'default';
      btn.alpha = armed ? 1.0 : 0.4;
    }
    this.warningText.visible = !armed;
    this.scrapText.text = `SCRAP: ${this.gameState.scrap}`;
  }

  private addHeader(label: string, x: number, y: number): void {
    centeredText(this.container, `── ${label} ──`, new TextStyle({
      fontFamily: MONO, fontSize: 14, fill: 0x4488aa,
    }), x, y);
  }
}
