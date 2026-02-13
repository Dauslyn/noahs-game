/**
 * WeaponPanel — row of weapon buttons for the hub LOADOUT section.
 * Handles selection, locked state, and visual refresh.
 */

import { Container, Graphics, TextStyle } from 'pixi.js';
import type { Text } from 'pixi.js';
import type { GameState } from '../core/game-state.js';
import { ALL_WEAPON_IDS, getWeaponDef } from '../combat/weapon-defs.js';
import type { WeaponId } from '../combat/weapon-defs.js';
import { centeredText, drawRect, MONO } from './ui-helpers.js';

const W = 140;
const H = 80;
const GAP = 16;
const DEFAULT = 0x1a1a3a;
const SELECTED = 0x003344;
const LOCKED = 0x111122;
const BORDER = 0x00ccff;
const LOCKED_BORDER = 0x444466;

interface WpnBtn {
  id: WeaponId;
  ctr: Container;
  bg: Graphics;
}

export class WeaponPanel {
  readonly container: Container;
  private gameState: GameState;
  private buttons: WpnBtn[] = [];
  private onChange: () => void;

  constructor(gameState: GameState, onChange: () => void) {
    this.gameState = gameState;
    this.onChange = onChange;
    this.container = new Container();

    const totalW = ALL_WEAPON_IDS.length * W + (ALL_WEAPON_IDS.length - 1) * GAP;
    const startX = -totalW / 2;

    for (let i = 0; i < ALL_WEAPON_IDS.length; i++) {
      const wb = this.createBtn(ALL_WEAPON_IDS[i]);
      wb.ctr.x = startX + i * (W + GAP);
      this.container.addChild(wb.ctr);
      this.buttons.push(wb);
    }
    this.refresh();
  }

  /** Refresh all button visuals based on current GameState. */
  refresh(): void {
    for (const wb of this.buttons) {
      const unlocked = this.gameState.unlockedWeapons.has(wb.id);
      const selected = wb.id === this.gameState.equippedWeapon;

      if (!unlocked) {
        drawRect(wb.bg, W, H, 6, LOCKED, LOCKED_BORDER, 1);
        wb.ctr.alpha = 0.5;
        wb.ctr.eventMode = 'none';
        wb.ctr.cursor = 'default';
      } else {
        drawRect(wb.bg, W, H, 6, selected ? SELECTED : DEFAULT, BORDER, selected ? 2 : 1);
        wb.ctr.alpha = 1.0;
        wb.ctr.eventMode = 'static';
        wb.ctr.cursor = 'pointer';
      }

      const sub = wb.ctr.getChildByName('sublabel') as Text | null;
      if (sub) {
        const def = getWeaponDef(wb.id);
        sub.text = unlocked ? def.description.slice(0, 22) : 'LOCKED';
        sub.style.fill = unlocked ? 0x6688aa : 0xcc4444;
      }
    }

    // Safety: clear equipped weapon if it got re-locked
    if (
      this.gameState.equippedWeapon
      && !this.gameState.unlockedWeapons.has(this.gameState.equippedWeapon)
    ) {
      this.gameState.equippedWeapon = null;
    }
  }

  /** Select a specific weapon (used on constructor for pre-equipped). */
  select(wid: WeaponId): void {
    if (this.gameState.unlockedWeapons.has(wid)) {
      this.gameState.equippedWeapon = wid;
      this.refresh();
      this.onChange();
    }
  }

  private createBtn(wid: WeaponId): WpnBtn {
    const def = getWeaponDef(wid);
    const ctr = new Container();
    ctr.eventMode = 'static';
    ctr.cursor = 'pointer';

    const bg = new Graphics();
    drawRect(bg, W, H, 6, DEFAULT, BORDER, 1);
    ctr.addChild(bg);

    const dot = new Graphics();
    dot.circle(W / 2, 18, 6);
    dot.fill(def.style.glowColor);
    ctr.addChild(dot);

    centeredText(ctr, def.name.split(' ')[0], new TextStyle({
      fontFamily: MONO, fontSize: 14, fill: 0xffffff, fontWeight: 'bold',
    }), W / 2, 32);

    const unlocked = this.gameState.unlockedWeapons.has(wid);
    const sub = centeredText(
      ctr, unlocked ? def.description.slice(0, 22) : 'LOCKED',
      new TextStyle({
        fontFamily: MONO, fontSize: 9,
        fill: unlocked ? 0x6688aa : 0xcc4444,
      }), W / 2, 54,
    );
    sub.name = 'sublabel';

    ctr.on('pointertap', () => this.select(wid));
    return { id: wid, ctr, bg };
  }
}
