/**
 * ShopPanel — renders purchasable items as a row of buttons on the hub screen.
 * Each button shows name, cost, and status (buyable / owned / too expensive).
 * Calls back on purchase so the hub can refresh all displays.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { GameState } from '../core/game-state.js';
import type { ShopItem } from '../economy/shop-defs.js';
import { getShopDisplay } from '../economy/shop-logic.js';
import { buyItem } from '../economy/shop-logic.js';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const ITEM_W = 140;
const ITEM_H = 70;
const ITEM_GAP = 12;
const ITEM_R = 6;

const COL_DEFAULT = 0x1a1a3a;
const COL_HOVER = 0x2a2a5a;
const COL_OWNED = 0x0a2a0a;
const COL_BORDER = 0x00ccff;
const COL_OWNED_BORDER = 0x44cc44;
const COL_LOCKED_BORDER = 0x444466;
const MONO = 'monospace';

// ---------------------------------------------------------------------------
// ShopPanel class
// ---------------------------------------------------------------------------

interface ShopBtn {
  ctr: Container;
  bg: Graphics;
  nameText: Text;
  costText: Text;
  statusText: Text;
  item: ShopItem;
}

export class ShopPanel {
  readonly container: Container;
  private gameState: GameState;
  private buttons: ShopBtn[] = [];
  private onPurchase: () => void;

  constructor(gameState: GameState, onPurchase: () => void) {
    this.gameState = gameState;
    this.onPurchase = onPurchase;
    this.container = new Container();
    this.buildButtons();
  }

  /** Refresh all button visuals to reflect current GameState. */
  refresh(): void {
    const display = getShopDisplay(this.gameState);
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const info = display[i];
      this.updateButton(btn, info.owned, info.reason);
    }
  }

  /** Destroy the panel and all children. */
  destroy(): void {
    this.container.destroy({ children: true });
  }

  // -- Internal --

  private buildButtons(): void {
    const display = getShopDisplay(this.gameState);
    const totalW = display.length * ITEM_W + (display.length - 1) * ITEM_GAP;
    const startX = -totalW / 2; // centred around container origin

    for (let i = 0; i < display.length; i++) {
      const { item, owned, reason } = display[i];
      const btn = this.createButton(item);
      btn.ctr.x = startX + i * (ITEM_W + ITEM_GAP);
      btn.ctr.y = 0;
      this.container.addChild(btn.ctr);
      this.buttons.push(btn);
      this.updateButton(btn, owned, reason);
    }
  }

  private createButton(item: ShopItem): ShopBtn {
    const ctr = new Container();
    ctr.eventMode = 'static';
    ctr.cursor = 'pointer';

    const bg = new Graphics();
    ctr.addChild(bg);

    // Item name (top)
    const nameText = new Text({
      text: item.name,
      style: new TextStyle({
        fontFamily: MONO, fontSize: 11, fill: 0xffffff, fontWeight: 'bold',
      }),
    });
    nameText.anchor.set(0.5, 0);
    nameText.x = ITEM_W / 2;
    nameText.y = 8;
    ctr.addChild(nameText);

    // Cost (middle)
    const costText = new Text({
      text: `${item.cost} scrap`,
      style: new TextStyle({ fontFamily: MONO, fontSize: 10, fill: 0xcccc44 }),
    });
    costText.anchor.set(0.5, 0);
    costText.x = ITEM_W / 2;
    costText.y = 28;
    ctr.addChild(costText);

    // Status line (bottom)
    const statusText = new Text({
      text: '',
      style: new TextStyle({ fontFamily: MONO, fontSize: 9, fill: 0x888888 }),
    });
    statusText.anchor.set(0.5, 0);
    statusText.x = ITEM_W / 2;
    statusText.y = 48;
    ctr.addChild(statusText);

    // Click handler
    ctr.on('pointertap', () => this.handleClick(item));

    // Hover effects (set in updateButton based on state)
    ctr.on('pointerover', () => {
      if (this.canInteract(item)) {
        this.drawBg(bg, COL_HOVER, COL_BORDER, 2);
      }
    });
    ctr.on('pointerout', () => this.refreshSingleButton(item, bg));

    return { ctr, bg, nameText, costText, statusText, item };
  }

  private handleClick(item: ShopItem): void {
    try {
      buyItem(item, this.gameState);
      this.onPurchase();
      this.refresh();
    } catch {
      // canBuy check failed — button should already be disabled visually
    }
  }

  private canInteract(item: ShopItem): boolean {
    const btn = this.buttons.find((b) => b.item.id === item.id);
    if (!btn) return false;
    const display = getShopDisplay(this.gameState);
    const info = display.find((d) => d.item.id === item.id);
    return info ? !info.owned && info.reason === null : false;
  }

  private refreshSingleButton(item: ShopItem, bg: Graphics): void {
    const display = getShopDisplay(this.gameState);
    const info = display.find((d) => d.item.id === item.id);
    if (!info) return;
    const borderCol = info.owned
      ? COL_OWNED_BORDER
      : info.reason ? COL_LOCKED_BORDER : COL_BORDER;
    const fillCol = info.owned ? COL_OWNED : COL_DEFAULT;
    this.drawBg(bg, fillCol, borderCol, 1);
  }

  private updateButton(
    btn: ShopBtn, owned: boolean, reason: string | null,
  ): void {
    // Determine visual state
    const canBuy = !owned && reason === null;
    const borderCol = owned
      ? COL_OWNED_BORDER
      : canBuy ? COL_BORDER : COL_LOCKED_BORDER;
    const fillCol = owned ? COL_OWNED : COL_DEFAULT;

    this.drawBg(btn.bg, fillCol, borderCol, 1);

    // Update status text
    if (owned) {
      btn.statusText.text = 'OWNED';
      btn.statusText.style.fill = 0x44cc44;
      btn.costText.style.fill = 0x446644;
    } else if (reason) {
      btn.statusText.text = reason;
      btn.statusText.style.fill = 0xcc4444;
      btn.costText.style.fill = 0xcccc44;
    } else {
      btn.statusText.text = 'BUY';
      btn.statusText.style.fill = 0x00ccff;
      btn.costText.style.fill = 0xcccc44;
    }

    // Interactivity
    btn.ctr.eventMode = canBuy ? 'static' : 'none';
    btn.ctr.cursor = canBuy ? 'pointer' : 'default';
    btn.ctr.alpha = canBuy ? 1.0 : owned ? 0.7 : 0.5;
  }

  private drawBg(
    g: Graphics, fill: number, stroke: number, strokeW: number,
  ): void {
    g.clear();
    g.roundRect(0, 0, ITEM_W, ITEM_H, ITEM_R);
    g.fill(fill);
    g.stroke({ color: stroke, width: strokeW });
  }
}
