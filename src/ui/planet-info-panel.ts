/**
 * PlanetInfoPanel — sidebar showing planet info on the star map.
 * Displays name, difficulty, biome, tier req, and deploy prompt.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MONO } from './ui-helpers.js';
import type { StarSystem } from '../scenes/star-map-data.js';
import { getLevelForStar } from '../scenes/star-map-data.js';

const PANEL_W = 240;
const PANEL_H = 280;
const PAD = 16;

export class PlanetInfoPanel {
  readonly container: Container;
  private nameText: Text;
  private diffText: Text;
  private biomeText: Text;
  private tierText: Text;
  private deployText: Text;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    const bg = new Graphics();
    bg.roundRect(0, 0, PANEL_W, PANEL_H, 8);
    bg.fill({ color: 0x0a0a20, alpha: 0.9 });
    bg.stroke({ color: 0x2244aa, width: 1.5 });
    this.container.addChild(bg);

    const mkStyle = (size: number, color: number): TextStyle =>
      new TextStyle({ fontFamily: MONO, fontSize: size, fill: color });

    this.nameText = new Text({ text: '', style: mkStyle(20, 0xffffff) });
    this.nameText.x = PAD;
    this.nameText.y = PAD;
    this.container.addChild(this.nameText);

    this.diffText = new Text({ text: '', style: mkStyle(14, 0xaaaaaa) });
    this.diffText.x = PAD;
    this.diffText.y = PAD + 30;
    this.container.addChild(this.diffText);

    this.biomeText = new Text({ text: '', style: mkStyle(12, 0x6688aa) });
    this.biomeText.x = PAD;
    this.biomeText.y = PAD + 54;
    this.container.addChild(this.biomeText);

    this.tierText = new Text({ text: '', style: mkStyle(12, 0xcc8844) });
    this.tierText.x = PAD;
    this.tierText.y = PAD + 80;
    this.container.addChild(this.tierText);

    this.deployText = new Text({ text: '', style: mkStyle(14, 0x00ccff) });
    this.deployText.x = PAD;
    this.deployText.y = PANEL_H - PAD - 40;
    this.container.addChild(this.deployText);
  }

  /** Show the panel with info for the given star system. */
  show(star: StarSystem, shipTier: number, hasWeapon: boolean): void {
    const level = getLevelForStar(star);
    const tierMet = shipTier >= star.tierRequired;

    this.nameText.text = level.name;
    this.diffText.text = `Difficulty: ${level.difficulty}`;
    this.biomeText.text = `Biome: ${level.environmentTheme}`;

    if (!tierMet) {
      this.tierText.text = `Requires Ship Tier ${star.tierRequired}`;
      this.tierText.style.fill = 0xcc4444;
      this.deployText.text = 'LOCKED';
      this.deployText.style.fill = 0x444466;
    } else if (!hasWeapon) {
      this.tierText.text = `Ship Tier ${star.tierRequired} OK`;
      this.tierText.style.fill = 0x44cc44;
      this.deployText.text = 'Equip a weapon first';
      this.deployText.style.fill = 0xcc8844;
    } else {
      this.tierText.text = `Ship Tier ${star.tierRequired} OK`;
      this.tierText.style.fill = 0x44cc44;
      this.deployText.text = 'ENTER to deploy';
      this.deployText.style.fill = 0x00ccff;
    }

    this.container.visible = true;
  }

  /** Hide the panel. */
  hide(): void {
    this.container.visible = false;
  }

  /** Clean up all display objects. */
  destroy(): void {
    this.container.destroy({ children: true });
  }
}
