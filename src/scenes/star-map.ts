/**
 * StarMap — top-down star system navigator.
 * Arrow keys to select stars. Enter to deploy. ESC to return to ship.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MONO } from '../ui/ui-helpers.js';
import { PlanetInfoPanel } from '../ui/planet-info-panel.js';
import { STAR_SYSTEMS } from './star-map-data.js';
import type { StarSystem } from './star-map-data.js';

const STAR_R = 12;
const SEL_R = 18;

export type StarMapResult =
  | { action: 'deploy'; starId: string }
  | { action: 'back' };

export class StarMap {
  readonly container: Container;
  private selectedIdx = 0;
  private starContainers: Container[] = [];
  private infoPanel: PlanetInfoPanel;
  private shipTier: number;
  private hasWeapon: boolean;
  private onResult: (result: StarMapResult) => void;
  private pulseTime = 0;

  private keysJustPressed = new Set<string>();
  private handleKeyDown: (e: KeyboardEvent) => void;

  constructor(
    shipTier: number,
    hasWeapon: boolean,
    onResult: (result: StarMapResult) => void,
  ) {
    this.shipTier = shipTier;
    this.hasWeapon = hasWeapon;
    this.onResult = onResult;
    this.container = new Container();

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Dark background
    const bg = new Graphics();
    bg.rect(0, 0, w, h);
    bg.fill(0x020210);
    this.container.addChild(bg);

    this.drawNebula(w, h);
    this.drawConnections(w, h);

    // Draw stars as separate containers (for pulse scaling)
    for (let i = 0; i < STAR_SYSTEMS.length; i++) {
      const sc = new Container();
      const star = STAR_SYSTEMS[i];
      sc.x = star.x * w * 0.7 + w * 0.1;
      sc.y = star.y * h * 0.6 + h * 0.15;
      this.drawStarInto(sc, star, i === this.selectedIdx);
      this.container.addChild(sc);
      this.starContainers.push(sc);
    }

    // Title
    const title = new Text({
      text: 'STAR MAP',
      style: new TextStyle({
        fontFamily: MONO, fontSize: 24, fill: 0x4488cc, fontWeight: 'bold',
        dropShadow: { color: 0x001122, blur: 6, distance: 0 },
      }),
    });
    title.anchor.set(0.5, 0);
    title.x = w / 2;
    title.y = 16;
    this.container.addChild(title);

    // ESC hint
    const esc = new Text({
      text: 'ESC: Back to ship',
      style: new TextStyle({ fontFamily: MONO, fontSize: 11, fill: 0x446688 }),
    });
    esc.anchor.set(0.5, 1);
    esc.x = w / 2;
    esc.y = h - 16;
    this.container.addChild(esc);

    // Info panel positioned right side
    this.infoPanel = new PlanetInfoPanel();
    this.infoPanel.container.x = w - 280;
    this.infoPanel.container.y = (h - 280) / 2;
    this.container.addChild(this.infoPanel.container);
    this.updateSelection();

    this.handleKeyDown = (e: KeyboardEvent) => {
      if (!e.repeat) this.keysJustPressed.add(e.code);
    };
    window.addEventListener('keydown', this.handleKeyDown);
  }

  /** Called each frame from the game loop. */
  update(dt: number): void {
    this.pulseTime += dt;

    if (this.keysJustPressed.has('ArrowRight') || this.keysJustPressed.has('KeyD')) {
      this.selectedIdx = Math.min(STAR_SYSTEMS.length - 1, this.selectedIdx + 1);
      this.updateSelection();
    }
    if (this.keysJustPressed.has('ArrowLeft') || this.keysJustPressed.has('KeyA')) {
      this.selectedIdx = Math.max(0, this.selectedIdx - 1);
      this.updateSelection();
    }

    if (this.keysJustPressed.has('Enter')) {
      const star = STAR_SYSTEMS[this.selectedIdx];
      if (this.shipTier >= star.tierRequired && this.hasWeapon) {
        this.onResult({ action: 'deploy', starId: star.id });
      }
    }

    if (this.keysJustPressed.has('Escape')) {
      this.onResult({ action: 'back' });
    }

    // Pulse selected star
    const sel = this.starContainers[this.selectedIdx];
    if (sel) sel.scale.set(1 + Math.sin(this.pulseTime * 3) * 0.08);

    this.keysJustPressed.clear();
  }

  /** Clean up keyboard listener and display objects. */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.infoPanel.destroy();
    this.container.destroy({ children: true });
  }

  /** Redraw all star nodes and refresh the info panel. */
  private updateSelection(): void {
    for (let i = 0; i < STAR_SYSTEMS.length; i++) {
      const sc = this.starContainers[i];
      sc.removeChildren();
      sc.scale.set(1);
      this.drawStarInto(sc, STAR_SYSTEMS[i], i === this.selectedIdx);
    }
    this.infoPanel.show(
      STAR_SYSTEMS[this.selectedIdx], this.shipTier, this.hasWeapon,
    );
  }

  /** Render a single star node (circle + label + lock text). */
  private drawStarInto(
    sc: Container, star: StarSystem, selected: boolean,
  ): void {
    const locked = this.shipTier < star.tierRequired;
    const r = selected ? SEL_R : STAR_R;
    const alpha = locked ? 0.3 : 1.0;
    const gfx = new Graphics();

    // Selection glow ring
    if (selected && !locked) {
      gfx.circle(0, 0, r + 8);
      gfx.fill({ color: star.color, alpha: 0.15 });
    }
    // Selection outline
    if (selected) {
      gfx.circle(0, 0, r + 3);
      gfx.stroke({ color: 0x00ccff, width: 2, alpha });
    }
    // Star body
    gfx.circle(0, 0, r);
    gfx.fill({ color: locked ? 0x333355 : star.color, alpha });
    // Bright centre
    gfx.circle(0, 0, r * 0.4);
    gfx.fill({ color: 0xffffff, alpha: alpha * 0.8 });
    sc.addChild(gfx);

    // Name label below star
    const label = new Text({
      text: star.name,
      style: new TextStyle({
        fontFamily: MONO, fontSize: 12, fill: locked ? 0x444466 : 0xaaccdd,
      }),
    });
    label.anchor.set(0.5, 0);
    label.y = r + 8;
    sc.addChild(label);

    // Show LOCKED text on locked stars
    if (locked) {
      const lk = new Text({
        text: 'LOCKED',
        style: new TextStyle({ fontFamily: MONO, fontSize: 8, fill: 0x666688 }),
      });
      lk.anchor.set(0.5, 0.5);
      sc.addChild(lk);
    }
  }

  /** Draw travel lane lines between connected stars. */
  private drawConnections(w: number, h: number): void {
    const gfx = new Graphics();
    const drawn = new Set<string>();
    for (const star of STAR_SYSTEMS) {
      for (const connId of star.connections) {
        const key = [star.id, connId].sort().join('-');
        if (drawn.has(key)) continue;
        drawn.add(key);
        const other = STAR_SYSTEMS.find(s => s.id === connId);
        if (!other) continue;
        const x1 = star.x * w * 0.7 + w * 0.1;
        const y1 = star.y * h * 0.6 + h * 0.15;
        const x2 = other.x * w * 0.7 + w * 0.1;
        const y2 = other.y * h * 0.6 + h * 0.15;
        gfx.moveTo(x1, y1);
        gfx.lineTo(x2, y2);
        gfx.stroke({ color: 0x2244aa, width: 1.5, alpha: 0.2 });
      }
    }
    this.container.addChild(gfx);
  }

  /** Draw subtle nebula blobs in the background. */
  private drawNebula(w: number, h: number): void {
    const gfx = new Graphics();
    const blobs = [
      { x: w * 0.3, y: h * 0.4, r: 200, color: 0x110022, a: 0.3 },
      { x: w * 0.7, y: h * 0.6, r: 180, color: 0x001122, a: 0.25 },
      { x: w * 0.5, y: h * 0.2, r: 150, color: 0x0a0a22, a: 0.2 },
    ];
    for (const b of blobs) {
      gfx.circle(b.x, b.y, b.r);
      gfx.fill({ color: b.color, alpha: b.a });
    }
    this.container.addChild(gfx);
  }
}
