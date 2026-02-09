/**
 * HubScreen — top-level hub that composes weapon loadout, shop, and
 * planet deploy panels. Orchestrates refresh when state changes.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { LevelData } from '../level/level-data.js';
import type { GameState } from '../core/game-state.js';
import { centeredText, MONO } from './ui-helpers.js';
import { WeaponPanel } from './weapon-panel.js';
import { ShopPanel } from './shop-panel.js';
import { PlanetPanel } from './planet-panel.js';

const BG_COLOR = 0x050515;

export class HubScreen {
  readonly container: Container;
  private gameState: GameState;
  private weaponPanel: WeaponPanel;
  private shopPanel: ShopPanel;
  private planetPanel: PlanetPanel;
  private warningText: Text;
  private scrapText: Text;
  private consumableIcons: Container;

  constructor(
    levels: LevelData[],
    gameState: GameState,
    onDeploy: (level: LevelData) => void,
  ) {
    this.gameState = gameState;
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
    }), cx, 30);

    // Scrap counter
    this.scrapText = centeredText(
      this.container, `SCRAP: ${gameState.scrap}`,
      new TextStyle({ fontFamily: MONO, fontSize: 16, fill: 0xcccc44 }), cx, 72,
    );

    // Consumable icons (to the right of scrap counter)
    this.consumableIcons = new Container();
    this.consumableIcons.y = 72;
    this.container.addChild(this.consumableIcons);

    // LOADOUT section
    this.addHeader('LOADOUT', cx, 104);
    this.weaponPanel = new WeaponPanel(gameState, () => this.onStateChange());
    this.weaponPanel.container.x = cx;
    this.weaponPanel.container.y = 128;
    this.container.addChild(this.weaponPanel.container);

    // SHOP section
    this.addHeader('SHOP', cx, 224);
    this.shopPanel = new ShopPanel(gameState, () => this.onStateChange());
    this.shopPanel.container.x = cx;
    this.shopPanel.container.y = 248;
    this.container.addChild(this.shopPanel.container);

    // DEPLOY section
    this.addHeader('DEPLOY', cx, 338);
    this.planetPanel = new PlanetPanel(levels, gameState, onDeploy);
    this.planetPanel.container.x = cx;
    this.planetPanel.container.y = 362;
    this.container.addChild(this.planetPanel.container);

    // Warning text (below planets)
    const warnY = 362 + this.planetPanel.totalHeight + 8;
    this.warningText = centeredText(
      this.container, 'Select a weapon to deploy',
      new TextStyle({ fontFamily: MONO, fontSize: 14, fill: 0xcc8844 }), cx, warnY,
    );

    // Initial state sync
    this.refreshAll();
    if (gameState.equippedWeapon) {
      this.weaponPanel.select(gameState.equippedWeapon);
    }
  }

  /** Remove from parent and destroy. */
  hide(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.shopPanel.destroy();
    this.container.destroy({ children: true });
  }

  /** Called whenever weapon, shop, or consumable state changes. */
  private onStateChange(): void {
    this.refreshAll();
  }

  private refreshAll(): void {
    this.scrapText.text = `SCRAP: ${this.gameState.scrap}`;
    this.warningText.visible = this.gameState.equippedWeapon === null;
    this.weaponPanel.refresh();
    this.shopPanel.refresh();
    this.planetPanel.refresh();
    this.refreshConsumableIcons();
  }

  private refreshConsumableIcons(): void {
    this.consumableIcons.removeChildren();
    const cx = window.innerWidth / 2;
    const icons: { label: string; color: number }[] = [];

    if (this.gameState.shieldCharge) {
      icons.push({ label: 'SH', color: 0x4488ff });
    }
    if (this.gameState.repairKit) {
      icons.push({ label: 'MED', color: 0x44cc44 });
    }

    const baseX = cx + 90;
    for (let i = 0; i < icons.length; i++) {
      const icon = icons[i];
      const g = new Graphics();
      g.roundRect(0, 0, 32, 18, 4);
      g.fill(0x1a1a3a);
      g.stroke({ color: icon.color, width: 1 });
      g.x = baseX + i * 40;
      this.consumableIcons.addChild(g);

      const t = new Text({
        text: icon.label,
        style: new TextStyle({
          fontFamily: MONO, fontSize: 9, fill: icon.color, fontWeight: 'bold',
        }),
      });
      t.anchor.set(0.5, 0.5);
      t.x = baseX + i * 40 + 16;
      t.y = 9;
      this.consumableIcons.addChild(t);
    }
  }

  private addHeader(label: string, x: number, y: number): void {
    centeredText(this.container, `── ${label} ──`, new TextStyle({
      fontFamily: MONO, fontSize: 14, fill: 0x4488aa,
    }), x, y);
  }
}
