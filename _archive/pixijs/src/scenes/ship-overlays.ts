/**
 * ShipOverlays -- manages weapon loadout and shop panels as modal overlays
 * on top of the ship interior scene.
 */

import { Container, Graphics, TextStyle } from 'pixi.js';
import { WeaponPanel } from '../ui/weapon-panel.js';
import { ShopPanel } from '../ui/shop-panel.js';
import { centeredText, MONO } from '../ui/ui-helpers.js';
import type { GameState } from '../core/game-state.js';

export type OverlayType = 'loadout' | 'shop' | null;

export class ShipOverlays {
  readonly container: Container;
  private weaponPanel: WeaponPanel | null = null;
  private shopPanel: ShopPanel | null = null;
  private currentOverlay: OverlayType = null;
  private gameState: GameState;
  private handleKey: (e: KeyboardEvent) => void;

  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.container = new Container();
    this.container.visible = false;

    this.handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && this.currentOverlay) {
        this.close();
      }
    };
    window.addEventListener('keydown', this.handleKey);
  }

  /** Open a loadout or shop overlay panel. */
  open(type: 'loadout' | 'shop'): void {
    this.close();
    this.currentOverlay = type;
    this.container.visible = true;

    // Semi-transparent dark backdrop
    const bg = new Graphics();
    bg.rect(0, 0, window.innerWidth, window.innerHeight);
    bg.fill({ color: 0x000000, alpha: 0.7 });
    this.container.addChild(bg);

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    if (type === 'loadout') {
      centeredText(this.container, '── LOADOUT ──', new TextStyle({
        fontFamily: MONO, fontSize: 18, fill: 0xff8844,
      }), cx, cy - 80);

      this.weaponPanel = new WeaponPanel(this.gameState, () => {
        this.weaponPanel?.refresh();
      });
      this.weaponPanel.container.x = cx;
      this.weaponPanel.container.y = cy - 40;
      this.container.addChild(this.weaponPanel.container);
      if (this.gameState.equippedWeapon) {
        this.weaponPanel.select(this.gameState.equippedWeapon);
      }

      centeredText(this.container, 'ESC to close', new TextStyle({
        fontFamily: MONO, fontSize: 11, fill: 0x446688,
      }), cx, cy + 70);
    } else {
      centeredText(this.container, '── SHOP ──', new TextStyle({
        fontFamily: MONO, fontSize: 18, fill: 0x44cc44,
      }), cx, cy - 140);

      this.shopPanel = new ShopPanel(this.gameState, () => {
        this.shopPanel?.refresh();
      });
      this.shopPanel.container.x = cx;
      this.shopPanel.container.y = cy - 100;
      this.container.addChild(this.shopPanel.container);

      centeredText(this.container, 'ESC to close', new TextStyle({
        fontFamily: MONO, fontSize: 11, fill: 0x446688,
      }), cx, cy + 110);
    }
  }

  /** Close whatever overlay is currently showing. */
  close(): void {
    if (this.shopPanel) {
      this.shopPanel.destroy();
      this.shopPanel = null;
    }
    this.weaponPanel = null;
    this.container.removeChildren();
    this.container.visible = false;
    this.currentOverlay = null;
  }

  /** True when an overlay panel is showing. */
  get isOpen(): boolean {
    return this.currentOverlay !== null;
  }

  /** Clean up event listeners and display objects. */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKey);
    this.close();
    this.container.destroy({ children: true });
  }
}
