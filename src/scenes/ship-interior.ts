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
}

const STATIONS: Station[] = [
  { id: 'loadout', label: 'LOADOUT', x: 150, color: 0xff8844, hotkey: 'KeyL' },
  { id: 'shop', label: 'SHOP', x: 350, color: 0x44cc44, hotkey: 'KeyS' },
  { id: 'cockpit', label: 'COCKPIT', x: 600, color: 0x4488ff, hotkey: 'KeyC' },
];

const INTERACT_RANGE = 60;

export type ShipAction = 'loadout' | 'shop' | 'cockpit';

export class ShipInterior {
  readonly container: Container;
  private roomContainer: Container;
  private playerGfx: Graphics;
  private playerX: number;
  private prompt: InteractPrompt;
  private nearStation: Station | null = null;
  private onAction: (action: ShipAction) => void;

  private keysDown = new Set<string>();
  private keysJustPressed = new Set<string>();
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;

  constructor(onAction: (action: ShipAction) => void) {
    this.onAction = onAction;
    this.container = new Container();

    // Full-screen dark background
    const bg = new Graphics();
    bg.rect(0, 0, window.innerWidth, window.innerHeight);
    bg.fill(0x050510);
    this.container.addChild(bg);

    // Centred room container
    this.roomContainer = new Container();
    this.roomContainer.x = (window.innerWidth - ROOM_W) / 2;
    this.roomContainer.y = (window.innerHeight - ROOM_H) / 2;
    this.container.addChild(this.roomContainer);

    this.drawRoom();
    for (const st of STATIONS) this.drawStation(st);

    // Player avatar
    this.playerGfx = new Graphics();
    this.drawPlayerSprite();
    this.playerX = ROOM_W / 2;
    this.roomContainer.addChild(this.playerGfx);

    // Interact prompt
    this.prompt = new InteractPrompt();
    this.roomContainer.addChild(this.prompt.container);

    // Title
    const title = new Text({
      text: "NOAH'S SHIP",
      style: new TextStyle({
        fontFamily: MONO, fontSize: 28, fill: 0x00ccff, fontWeight: 'bold',
        dropShadow: { color: 0x003344, blur: 8, distance: 0 },
      }),
    });
    title.anchor.set(0.5, 0);
    title.x = ROOM_W / 2;
    title.y = -50;
    this.roomContainer.addChild(title);

    // Hotkey hint
    const hint = new Text({
      text: 'M: Star Map  |  L: Loadout  |  S: Shop',
      style: new TextStyle({ fontFamily: MONO, fontSize: 11, fill: 0x446688 }),
    });
    hint.anchor.set(0.5, 0);
    hint.x = ROOM_W / 2;
    hint.y = ROOM_H + 20;
    this.roomContainer.addChild(hint);

    // Keyboard input
    this.handleKeyDown = (e: KeyboardEvent) => {
      this.keysDown.add(e.code);
      if (!e.repeat) this.keysJustPressed.add(e.code);
    };
    this.handleKeyUp = (e: KeyboardEvent) => {
      this.keysDown.delete(e.code);
    };
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  /** Called each frame from the game loop. */
  update(dt: number): void {
    // Horizontal movement
    let dx = 0;
    if (this.keysDown.has('ArrowLeft') || this.keysDown.has('KeyA')) dx -= 1;
    if (this.keysDown.has('ArrowRight') || this.keysDown.has('KeyD')) dx += 1;
    this.playerX += dx * MOVE_SPEED * dt;
    this.playerX = Math.max(WALL_PAD + PLAYER_W / 2,
      Math.min(ROOM_W - WALL_PAD - PLAYER_W / 2, this.playerX));

    this.playerGfx.x = this.playerX - PLAYER_W / 2;
    this.playerGfx.y = FLOOR_Y - PLAYER_H;

    // Detect nearest station
    this.nearStation = null;
    for (const st of STATIONS) {
      if (Math.abs(this.playerX - st.x) < INTERACT_RANGE) {
        this.nearStation = st;
        break;
      }
    }

    // Show/hide interact prompt
    if (this.nearStation) {
      this.prompt.show(this.nearStation.x, FLOOR_Y - PLAYER_H - 16);
    } else {
      this.prompt.hide();
    }

    // E to interact with nearby station
    if (this.nearStation && this.keysJustPressed.has('KeyE')) {
      this.onAction(this.nearStation.id);
    }

    // Hotkeys work from anywhere in the ship
    for (const st of STATIONS) {
      if (this.keysJustPressed.has(st.hotkey)) {
        this.onAction(st.id);
      }
    }
    // M is an alias for cockpit (star map)
    if (this.keysJustPressed.has('KeyM')) {
      this.onAction('cockpit');
    }

    this.keysJustPressed.clear();
  }

  /** Clean up listeners and display objects. */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.prompt.destroy();
    this.container.destroy({ children: true });
  }

  /** Draw the ship room background: walls, floor, and grid lines. */
  private drawRoom(): void {
    const g = new Graphics();
    // Floor
    g.rect(0, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
    g.fill(0x1a1a2e);
    // Ceiling / back wall
    g.rect(0, 0, ROOM_W, FLOOR_Y);
    g.fill(0x0d0d1f);
    // Left wall
    g.rect(0, 0, 4, ROOM_H);
    g.fill(0x2a2a4a);
    // Right wall
    g.rect(ROOM_W - 4, 0, 4, ROOM_H);
    g.fill(0x2a2a4a);
    // Top border
    g.rect(0, 0, ROOM_W, 4);
    g.fill(0x2a2a4a);
    // Bottom border
    g.rect(0, ROOM_H - 4, ROOM_W, 4);
    g.fill(0x2a2a4a);
    // Horizontal wall detail lines
    for (let y = 60; y < FLOOR_Y; y += 80) {
      g.rect(20, y, ROOM_W - 40, 1);
      g.fill(0x1a1a3a);
    }
    this.roomContainer.addChild(g);
  }

  /** Draw a single station: pedestal, indicator light, and label. */
  private drawStation(st: Station): void {
    const g = new Graphics();
    // Station pedestal
    g.roundRect(st.x - 25, FLOOR_Y - 80, 50, 80, 4);
    g.fill(0x111128);
    g.stroke({ color: st.color, width: 1.5, alpha: 0.6 });
    // Indicator glow
    g.circle(st.x, FLOOR_Y - 90, 8);
    g.fill({ color: st.color, alpha: 0.3 });
    // Indicator dot
    g.circle(st.x, FLOOR_Y - 90, 4);
    g.fill(st.color);
    this.roomContainer.addChild(g);

    const label = new Text({
      text: st.label,
      style: new TextStyle({
        fontFamily: MONO, fontSize: 11, fill: st.color, fontWeight: 'bold',
      }),
    });
    label.anchor.set(0.5, 1);
    label.x = st.x;
    label.y = FLOOR_Y - 100;
    this.roomContainer.addChild(label);
  }

  /** Draw the simple player avatar rectangle. */
  private drawPlayerSprite(): void {
    // Body
    this.playerGfx.rect(0, 0, PLAYER_W, PLAYER_H);
    this.playerGfx.fill(0x44ccff);
    // Visor
    this.playerGfx.rect(4, 0, 16, 12);
    this.playerGfx.fill(0x66ddff);
  }
}
