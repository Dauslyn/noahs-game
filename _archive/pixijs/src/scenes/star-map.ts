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
  private fired = false;
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

    // Draw stars as separate containers (for pulse scaling + click)
    for (let i = 0; i < STAR_SYSTEMS.length; i++) {
      const sc = new Container();
      sc.eventMode = 'static'; sc.cursor = 'pointer';
      const star = STAR_SYSTEMS[i];
      sc.x = star.x * w * 0.7 + w * 0.1;
      sc.y = star.y * h * 0.6 + h * 0.15;
      this.drawStarInto(sc, star, i === this.selectedIdx);
      sc.on('pointertap', () => {
        if (this.selectedIdx === i) this.tryDeploy();
        else { this.selectedIdx = i; this.updateSelection(); }
      });
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

    // Clickable back button
    const backBtn = new Container();
    backBtn.eventMode = 'static'; backBtn.cursor = 'pointer';
    const bbg = new Graphics();
    bbg.roundRect(0, 0, 160, 34, 6);
    bbg.fill({ color: 0x0a0a2e, alpha: 0.8 });
    bbg.stroke({ color: 0x446688, width: 1 });
    backBtn.addChild(bbg);
    const bt = new Text({ text: 'ESC  Back to Ship',
      style: new TextStyle({ fontFamily: MONO, fontSize: 12, fill: 0x6688aa }) });
    bt.anchor.set(0.5, 0.5); bt.x = 80; bt.y = 17;
    backBtn.addChild(bt);
    backBtn.x = w / 2 - 80; backBtn.y = h - 50;
    backBtn.on('pointertap', () => this.fireResult({ action: 'back' }));
    this.container.addChild(backBtn);

    // Info panel positioned right side
    this.infoPanel = new PlanetInfoPanel();
    this.infoPanel.container.x = w - 280;
    this.infoPanel.container.y = (h - 280) / 2;
    this.container.addChild(this.infoPanel.container);
    this.updateSelection();

    this.handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || this.fired) return;
      const code = e.code;
      if (code === 'ArrowRight' || code === 'KeyD') {
        this.selectedIdx = Math.min(STAR_SYSTEMS.length - 1, this.selectedIdx + 1);
        this.updateSelection();
      } else if (code === 'ArrowLeft' || code === 'KeyA') {
        this.selectedIdx = Math.max(0, this.selectedIdx - 1);
        this.updateSelection();
      } else if (code === 'Enter') {
        this.tryDeploy();
      } else if (code === 'Escape' || code === 'Backspace') {
        this.fireResult({ action: 'back' });
      }
    };
    window.addEventListener('keydown', this.handleKeyDown);
  }

  /** Called each frame from the game loop. */
  update(dt: number): void {
    this.pulseTime += dt;
    const sel = this.starContainers[this.selectedIdx];
    if (sel) sel.scale.set(1 + Math.sin(this.pulseTime * 3) * 0.08);
  }

  /** Clean up keyboard listener and display objects. */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.infoPanel.destroy();
    this.container.destroy({ children: true });
  }

  /** Attempt to deploy to the currently selected star. */
  private tryDeploy(): void {
    const star = STAR_SYSTEMS[this.selectedIdx];
    if (this.shipTier >= star.tierRequired && this.hasWeapon) {
      this.fireResult({ action: 'deploy', starId: star.id });
    }
  }

  /** Fire a result exactly once (guards against double-fire). */
  private fireResult(r: StarMapResult): void {
    if (this.fired) return;
    this.fired = true;
    this.onResult(r);
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

    const label = new Text({ text: star.name,
      style: new TextStyle({ fontFamily: MONO, fontSize: 12, fill: locked ? 0x444466 : 0xaaccdd }) });
    label.anchor.set(0.5, 0); label.y = r + 8; sc.addChild(label);

    if (locked) {
      const lk = new Text({ text: 'LOCKED',
        style: new TextStyle({ fontFamily: MONO, fontSize: 8, fill: 0x666688 }) });
      lk.anchor.set(0.5, 0.5); sc.addChild(lk);
    }
  }

  /** Draw travel lane lines between connected stars. */
  private drawConnections(w: number, h: number): void {
    const gfx = new Graphics();
    const drawn = new Set<string>();
    const pos = (s: StarSystem) => ({ x: s.x * w * 0.7 + w * 0.1, y: s.y * h * 0.6 + h * 0.15 });
    for (const star of STAR_SYSTEMS) {
      for (const cid of star.connections) {
        const key = [star.id, cid].sort().join('-');
        if (drawn.has(key)) continue;
        drawn.add(key);
        const other = STAR_SYSTEMS.find(s => s.id === cid);
        if (!other) continue;
        const a = pos(star), b = pos(other);
        gfx.moveTo(a.x, a.y); gfx.lineTo(b.x, b.y);
        gfx.stroke({ color: 0x2244aa, width: 1.5, alpha: 0.25 });
      }
    }
    this.container.addChild(gfx);
  }

  /** Draw background stars and nebula blobs. */
  private drawNebula(w: number, h: number): void {
    const gfx = new Graphics();
    // Scattered background stars
    const rng = (s: number) => { let x = Math.sin(s) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < 120; i++) {
      const sx = rng(i * 3.7) * w;
      const sy = rng(i * 7.3 + 1) * h;
      const sr = 0.5 + rng(i * 11.1) * 1.5;
      const sa = 0.2 + rng(i * 13.7) * 0.5;
      gfx.circle(sx, sy, sr);
      gfx.fill({ color: 0xaabbcc, alpha: sa });
    }
    // Nebula blobs
    const blobs = [
      { x: w * 0.25, y: h * 0.35, r: 220, color: 0x110033, a: 0.25 },
      { x: w * 0.75, y: h * 0.55, r: 180, color: 0x001133, a: 0.2 },
      { x: w * 0.5, y: h * 0.2, r: 160, color: 0x0a0a22, a: 0.15 },
      { x: w * 0.15, y: h * 0.7, r: 140, color: 0x0a001a, a: 0.2 },
    ];
    for (const b of blobs) {
      gfx.circle(b.x, b.y, b.r);
      gfx.fill({ color: b.color, alpha: b.a });
    }
    this.container.addChild(gfx);
  }
}
