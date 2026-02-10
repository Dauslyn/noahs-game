/**
 * ShipInterior -- walkable ship room with interactive stations.
 * Stations: Workbench (loadout), Terminal (shop), Cockpit (star map).
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MONO } from '../ui/ui-helpers.js';
import { InteractPrompt } from '../ui/interact-prompt.js';

const ROOM_W = 800;
const ROOM_H = 400;
const FLOOR_Y = 340;
const PLAYER_W = 24;
const PLAYER_H = 40;
const MOVE_SPEED = 200;
const WALL_PAD = 30;

interface Station {
  id: 'loadout' | 'shop' | 'cockpit';
  label: string;
  x: number;
  color: number;
  hotkey: string;
  icon: string;
}

const STATIONS: Station[] = [
  { id: 'loadout', label: 'LOADOUT', x: 150, color: 0xff8844, hotkey: 'KeyL', icon: '[L]' },
  { id: 'shop', label: 'SHOP', x: 400, color: 0x44cc44, hotkey: 'KeyS', icon: '[S]' },
  { id: 'cockpit', label: 'COCKPIT', x: 650, color: 0x4488ff, hotkey: 'KeyC', icon: '[C]' },
];

const INTERACT_RANGE = 70;

export type ShipAction = 'loadout' | 'shop' | 'cockpit';

export class ShipInterior {
  readonly container: Container;
  private roomContainer: Container;
  private playerGfx: Graphics;
  private playerX: number;
  private prompt: InteractPrompt;
  private nearStation: Station | null = null;
  private onAction: (action: ShipAction) => void;
  private stationGlows: Graphics[] = [];
  private glowTime = 0;

  private keysDown = new Set<string>();
  private keysJustPressed = new Set<string>();
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;

  constructor(onAction: (action: ShipAction) => void) {
    this.onAction = onAction;
    this.container = new Container();

    const bg = new Graphics();
    bg.rect(0, 0, window.innerWidth, window.innerHeight);
    bg.fill(0x040410);
    this.container.addChild(bg);

    this.roomContainer = new Container();
    this.roomContainer.x = (window.innerWidth - ROOM_W) / 2;
    this.roomContainer.y = (window.innerHeight - ROOM_H) / 2;
    this.container.addChild(this.roomContainer);

    this.drawRoom();
    for (const st of STATIONS) this.drawStation(st);

    this.playerGfx = new Graphics();
    this.drawPlayerSprite();
    this.playerX = ROOM_W / 2;
    this.roomContainer.addChild(this.playerGfx);

    this.prompt = new InteractPrompt();
    this.roomContainer.addChild(this.prompt.container);

    const title = new Text({ text: "NOAH'S SHIP",
      style: new TextStyle({ fontFamily: MONO, fontSize: 28, fill: 0x00ccff,
        fontWeight: 'bold', dropShadow: { color: 0x003344, blur: 8, distance: 0 } }) });
    title.anchor.set(0.5, 0); title.x = ROOM_W / 2; title.y = -50;
    this.roomContainer.addChild(title);

    const hint = new Text({
      text: 'Arrow Keys: Move   |   E: Interact   |   L / S / C / M: Hotkeys',
      style: new TextStyle({ fontFamily: MONO, fontSize: 12, fill: 0x5588aa }),
    });
    hint.anchor.set(0.5, 0); hint.x = ROOM_W / 2; hint.y = ROOM_H + 16;
    this.roomContainer.addChild(hint);

    this.handleKeyDown = (e: KeyboardEvent) => {
      this.keysDown.add(e.code);
      if (!e.repeat) this.keysJustPressed.add(e.code);
    };
    this.handleKeyUp = (e: KeyboardEvent) => { this.keysDown.delete(e.code); };
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  update(dt: number): void {
    this.glowTime += dt;
    let dx = 0;
    if (this.keysDown.has('ArrowLeft') || this.keysDown.has('KeyA')) dx -= 1;
    if (this.keysDown.has('ArrowRight') || this.keysDown.has('KeyD')) dx += 1;
    this.playerX += dx * MOVE_SPEED * dt;
    this.playerX = Math.max(WALL_PAD + PLAYER_W / 2,
      Math.min(ROOM_W - WALL_PAD - PLAYER_W / 2, this.playerX));
    this.playerGfx.x = this.playerX - PLAYER_W / 2;
    this.playerGfx.y = FLOOR_Y - PLAYER_H;

    this.nearStation = null;
    for (const st of STATIONS) {
      if (Math.abs(this.playerX - st.x) < INTERACT_RANGE) {
        this.nearStation = st; break;
      }
    }
    if (this.nearStation) this.prompt.show(this.nearStation.x, FLOOR_Y - PLAYER_H - 20);
    else this.prompt.hide();

    if (this.nearStation && this.keysJustPressed.has('KeyE')) this.onAction(this.nearStation.id);
    for (const st of STATIONS) {
      if (this.keysJustPressed.has(st.hotkey)) this.onAction(st.id);
    }
    if (this.keysJustPressed.has('KeyM')) this.onAction('cockpit');

    // Animate station glows
    for (let i = 0; i < this.stationGlows.length; i++) {
      this.stationGlows[i].alpha = 0.15 + Math.sin(this.glowTime * 2 + i * 1.2) * 0.1;
    }
    this.keysJustPressed.clear();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.prompt.destroy();
    this.container.destroy({ children: true });
  }

  private drawRoom(): void {
    const g = new Graphics();
    // Back wall
    g.rect(0, 0, ROOM_W, FLOOR_Y); g.fill(0x0c0c1e);
    // Floor
    g.rect(0, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y); g.fill(0x141428);
    // Floor grating lines
    for (let x = 0; x < ROOM_W; x += 40) {
      g.rect(x, FLOOR_Y + 2, 1, ROOM_H - FLOOR_Y - 4);
      g.fill({ color: 0x222244, alpha: 0.5 });
    }
    // Metallic borders
    g.rect(0, 0, 6, ROOM_H); g.fill(0x2a2a4a);
    g.rect(ROOM_W - 6, 0, 6, ROOM_H); g.fill(0x2a2a4a);
    g.rect(0, 0, ROOM_W, 6); g.fill(0x2a2a4a);
    g.rect(0, ROOM_H - 4, ROOM_W, 4); g.fill(0x2a2a4a);
    // Wall panel seams
    for (let y = 50; y < FLOOR_Y; y += 70) {
      g.rect(20, y, ROOM_W - 40, 1); g.fill({ color: 0x1a1a3a, alpha: 0.6 });
    }
    // Ambient ceiling lights
    for (const lx of [0.15, 0.5, 0.85]) {
      g.circle(ROOM_W * lx, 20, 4); g.fill({ color: 0x00ccff, alpha: 0.4 });
      g.circle(ROOM_W * lx, 20, 14); g.fill({ color: 0x00ccff, alpha: 0.05 });
    }
    // Floor highlight strip
    g.rect(0, FLOOR_Y, ROOM_W, 2); g.fill({ color: 0x4488ff, alpha: 0.15 });
    this.roomContainer.addChild(g);
  }

  private drawStation(st: Station): void {
    const g = new Graphics();
    // Pedestal
    g.roundRect(st.x - 30, FLOOR_Y - 90, 60, 90, 4);
    g.fill(0x111128); g.stroke({ color: st.color, width: 1, alpha: 0.4 });
    // Screen face
    g.roundRect(st.x - 22, FLOOR_Y - 82, 44, 36, 3);
    g.fill({ color: st.color, alpha: 0.08 });
    g.stroke({ color: st.color, width: 1, alpha: 0.6 });
    // Scan lines
    for (let sy = FLOOR_Y - 78; sy < FLOOR_Y - 50; sy += 4) {
      g.rect(st.x - 18, sy, 36, 1); g.fill({ color: st.color, alpha: 0.05 });
    }
    this.roomContainer.addChild(g);

    // Glow orb (animated via update)
    const glow = new Graphics();
    glow.circle(st.x, FLOOR_Y - 100, 20);
    glow.fill({ color: st.color, alpha: 0.15 });
    glow.circle(st.x, FLOOR_Y - 100, 6);
    glow.fill({ color: st.color, alpha: 0.7 });
    this.roomContainer.addChild(glow);
    this.stationGlows.push(glow);

    const label = new Text({ text: `${st.label}  ${st.icon}`,
      style: new TextStyle({ fontFamily: MONO, fontSize: 11, fill: st.color, fontWeight: 'bold' }) });
    label.anchor.set(0.5, 1); label.x = st.x; label.y = FLOOR_Y - 106;
    this.roomContainer.addChild(label);
  }

  private drawPlayerSprite(): void {
    const g = this.playerGfx;
    // Body
    g.roundRect(2, 10, 20, 22, 3); g.fill(0x2288cc);
    g.stroke({ color: 0x44ccff, width: 1, alpha: 0.5 });
    // Head / helmet
    g.roundRect(4, 0, 16, 14, 4); g.fill(0x336699);
    // Visor
    g.roundRect(6, 2, 12, 8, 2); g.fill(0x66ddff);
    g.roundRect(8, 4, 8, 4, 1); g.fill({ color: 0xffffff, alpha: 0.3 });
    // Legs
    g.rect(5, 32, 5, 8); g.fill(0x1a6699);
    g.rect(14, 32, 5, 8); g.fill(0x1a6699);
  }
}
