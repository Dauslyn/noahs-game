# Phase 3a: Ship Interior + Star Map — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the menu hub with a walkable ship interior and a visual point-and-click star map.

**Architecture:** Two new scenes (ship interior, star map) managed by a scene router extracted from game.ts. Ship interior reuses existing weapon/shop panels as overlays. Star map replaces planet panel with a visual node graph. Warp transition animation bridges star map → level.

**Tech Stack:** PixiJS 8 (Graphics, Text, Container), TypeScript strict, existing InputManager for keyboard input.

---

## Task 1: Extract Scene Router from game.ts

game.ts is at 249/250 lines and needs space for new scene types. Extract scene transition logic into a dedicated module.

**Files:**
- Create: `src/core/scene-router.ts`
- Modify: `src/core/game.ts`

**Step 1: Create scene-router.ts**

```typescript
// src/core/scene-router.ts
/**
 * SceneRouter — manages scene lifecycle and transitions.
 * Extracted from Game class to keep game.ts under 250 lines.
 */

export type SceneId = 'ship' | 'star-map' | 'gameplay';

export interface SceneCallbacks {
  onShowShip: () => void;
  onShowStarMap: () => void;
  onStartLevel: (levelIndex: number) => void;
  onUnloadLevel: () => void;
}

/**
 * Minimal scene state tracker. The actual scene lifecycle
 * (creating/destroying containers) stays in Game, but this
 * module tracks which scene is active and handles valid transitions.
 */
export class SceneRouter {
  private current: SceneId = 'ship';

  get activeScene(): SceneId {
    return this.current;
  }

  transitionTo(target: SceneId): void {
    this.current = target;
  }

  /** True when the ECS game loop should tick. */
  get gameplayActive(): boolean {
    return this.current === 'gameplay';
  }
}
```

**Step 2: Update game.ts to use SceneRouter**

Replace `private currentScene: Scene = 'planet-select'` with the SceneRouter.
- Import `SceneRouter` and `SceneId` from `./scene-router.js`
- Replace `type Scene = 'planet-select' | 'gameplay'` → remove
- Replace `private currentScene: Scene = 'planet-select'` → `private sceneRouter = new SceneRouter()`
- Replace all `this.currentScene === 'gameplay'` → `this.sceneRouter.gameplayActive`
- Replace all `this.currentScene = 'planet-select'` → `this.sceneRouter.transitionTo('ship')`
- Replace `this.currentScene = 'gameplay'` → `this.sceneRouter.transitionTo('gameplay')`
- The `showHub()` method will be renamed to `showShip()` in Task 4 (leave as-is for now)

**Step 3: Verify the game compiles and runs**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`
Expected: No errors.

Run: Dev server at localhost:3001 — game should work identically to before (hub screen → level → death → hub).

**Step 4: Commit**

```bash
git add src/core/scene-router.ts src/core/game.ts
git commit -m "refactor: extract SceneRouter from game.ts for scene management"
```

---

## Task 2: Star Map Data Layer

Define the star system data that powers the star map UI.

**Files:**
- Create: `src/scenes/star-map-data.ts`

**Step 1: Create star-map-data.ts**

```typescript
// src/scenes/star-map-data.ts
/**
 * Star system definitions for the star map.
 * Each star has a position on the map, connected neighbors, and planets.
 */

import type { LevelData } from '../level/level-data.js';
import { ALL_LEVELS } from '../level/extra-levels.js';

export interface StarSystem {
  /** Unique id for this star. */
  id: string;
  /** Display name on the map. */
  name: string;
  /** Position on the star map (0-1 normalised, mapped to screen). */
  x: number;
  y: number;
  /** Colour tint for the star dot. */
  color: number;
  /** IDs of connected stars (travel lanes). */
  connections: string[];
  /** Minimum ship tier to travel here. */
  tierRequired: number;
  /** Index into ALL_LEVELS for the planet at this star. */
  levelIndex: number;
}

/** All star systems in the game. */
export const STAR_SYSTEMS: StarSystem[] = [
  {
    id: 'sol-station',
    name: 'Sol Station',
    x: 0.2, y: 0.5,
    color: 0xffffff,
    connections: ['crystallis'],
    tierRequired: 1,
    levelIndex: 0,
  },
  {
    id: 'crystallis',
    name: 'Crystallis',
    x: 0.5, y: 0.3,
    color: 0xcccc44,
    connections: ['sol-station', 'neon-prime'],
    tierRequired: 2,
    levelIndex: 1,
  },
  {
    id: 'neon-prime',
    name: 'Neon Prime',
    x: 0.8, y: 0.55,
    color: 0xcc4444,
    connections: ['crystallis'],
    tierRequired: 2,
    levelIndex: 2,
  },
];

/** Look up the LevelData for a star system. */
export function getLevelForStar(star: StarSystem): LevelData {
  return ALL_LEVELS[star.levelIndex];
}
```

**Step 2: Verify it compiles**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/scenes/star-map-data.ts
git commit -m "feat: add star system data layer for star map"
```

---

## Task 3: Ship Interior Scene

Create the walkable ship interior with three interactive stations.

**Files:**
- Create: `src/scenes/ship-interior.ts`
- Create: `src/ui/interact-prompt.ts`

**Step 1: Create interact-prompt.ts**

A reusable "Press E" floating prompt that shows when player is near a station.

```typescript
// src/ui/interact-prompt.ts
/**
 * InteractPrompt — floating "Press E" text that appears near stations.
 */

import { Container, Text, TextStyle } from 'pixi.js';
import { MONO } from './ui-helpers.js';

export class InteractPrompt {
  readonly container: Container;
  private text: Text;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    this.text = new Text({
      text: 'Press E',
      style: new TextStyle({
        fontFamily: MONO, fontSize: 14, fill: 0x00ccff,
        fontWeight: 'bold',
      }),
    });
    this.text.anchor.set(0.5, 1);
    this.container.addChild(this.text);
  }

  /** Show prompt at position (screen coords). */
  show(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
```

**Step 2: Create ship-interior.ts**

The main ship scene. Player walks left/right, interacts with stations.

Key design decisions:
- No Rapier physics — use simple AABB for floor/walls
- Player sprite same as gameplay (re-create a simple animated sprite)
- Room is 800px wide, 400px tall, centred on screen
- Three stations at fixed positions
- Keyboard: arrow keys / WASD to move, E to interact, hotkeys M/C/L/S

```typescript
// src/scenes/ship-interior.ts
/**
 * ShipInterior — walkable ship room with interactive stations.
 * Stations: Workbench (loadout), Terminal (shop), Cockpit (star map).
 */

import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MONO } from '../ui/ui-helpers.js';
import { InteractPrompt } from '../ui/interact-prompt.js';

const ROOM_W = 800;
const ROOM_H = 400;
const FLOOR_Y = 340;       // Y of floor surface within room
const PLAYER_W = 24;
const PLAYER_H = 40;
const MOVE_SPEED = 200;    // px/s
const WALL_PAD = 30;       // room wall inset

interface Station {
  id: 'loadout' | 'shop' | 'cockpit';
  label: string;
  x: number;             // position within room (relative to room left)
  color: number;
  hotkey: string;         // KeyboardEvent.code
}

const STATIONS: Station[] = [
  { id: 'loadout', label: 'LOADOUT', x: 150, color: 0xff8844, hotkey: 'KeyL' },
  { id: 'shop', label: 'SHOP', x: 350, color: 0x44cc44, hotkey: 'KeyS' },
  { id: 'cockpit', label: 'COCKPIT', x: 600, color: 0x4488ff, hotkey: 'KeyC' },
];

const INTERACT_RANGE = 60; // px distance to trigger prompt

export type ShipAction = 'loadout' | 'shop' | 'cockpit';

export class ShipInterior {
  readonly container: Container;
  private roomContainer: Container;
  private playerGfx: Graphics;
  private playerX: number;
  private prompt: InteractPrompt;
  private nearStation: Station | null = null;
  private onAction: (action: ShipAction) => void;
  private roomOffsetX: number;
  private roomOffsetY: number;

  // Keyboard state (we listen directly; ship scene is outside ECS)
  private keysDown = new Set<string>();
  private keysJustPressed = new Set<string>();
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;

  constructor(app: Application, onAction: (action: ShipAction) => void) {
    this.onAction = onAction;
    this.container = new Container();

    // Centre room on screen
    this.roomOffsetX = (window.innerWidth - ROOM_W) / 2;
    this.roomOffsetY = (window.innerHeight - ROOM_H) / 2;

    // Full-screen dark background
    const bg = new Graphics();
    bg.rect(0, 0, window.innerWidth, window.innerHeight);
    bg.fill(0x050510);
    this.container.addChild(bg);

    // Room container (positioned at centre)
    this.roomContainer = new Container();
    this.roomContainer.x = this.roomOffsetX;
    this.roomContainer.y = this.roomOffsetY;
    this.container.addChild(this.roomContainer);

    // Draw room background
    this.drawRoom();

    // Draw stations
    for (const st of STATIONS) {
      this.drawStation(st);
    }

    // Player sprite (simple rectangle for now)
    this.playerGfx = new Graphics();
    this.drawPlayerSprite();
    this.playerX = ROOM_W / 2; // start in centre
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

    // Scrap display — will be updated externally
    // (kept in game.ts since GameState lives there)

    // Hotkey hint
    const hint = new Text({
      text: 'M: Star Map  |  L: Loadout  |  S: Shop',
      style: new TextStyle({ fontFamily: MONO, fontSize: 11, fill: 0x446688 }),
    });
    hint.anchor.set(0.5, 0);
    hint.x = ROOM_W / 2;
    hint.y = ROOM_H + 20;
    this.roomContainer.addChild(hint);

    // Keyboard listeners
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

  /** Call each frame from the game loop. */
  update(dt: number): void {
    // Movement
    let dx = 0;
    if (this.keysDown.has('ArrowLeft') || this.keysDown.has('KeyA')) dx -= 1;
    if (this.keysDown.has('ArrowRight') || this.keysDown.has('KeyD')) dx += 1;
    this.playerX += dx * MOVE_SPEED * dt;
    this.playerX = Math.max(WALL_PAD + PLAYER_W / 2,
      Math.min(ROOM_W - WALL_PAD - PLAYER_W / 2, this.playerX));

    this.playerGfx.x = this.playerX - PLAYER_W / 2;
    this.playerGfx.y = FLOOR_Y - PLAYER_H;

    // Check station proximity
    this.nearStation = null;
    for (const st of STATIONS) {
      if (Math.abs(this.playerX - st.x) < INTERACT_RANGE) {
        this.nearStation = st;
        break;
      }
    }

    if (this.nearStation) {
      this.prompt.show(this.nearStation.x, FLOOR_Y - PLAYER_H - 16);
    } else {
      this.prompt.hide();
    }

    // Interact (E key or station hotkey)
    if (this.nearStation && this.keysJustPressed.has('KeyE')) {
      this.onAction(this.nearStation.id);
    }

    // Global hotkeys (work from anywhere)
    for (const st of STATIONS) {
      if (this.keysJustPressed.has(st.hotkey)) {
        this.onAction(st.id);
      }
    }
    // M also opens cockpit (star map)
    if (this.keysJustPressed.has('KeyM')) {
      this.onAction('cockpit');
    }

    // Clear per-frame input
    this.keysJustPressed.clear();
  }

  /** Clean up listeners and display objects. */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.prompt.destroy();
    this.container.destroy({ children: true });
  }

  private drawRoom(): void {
    const g = new Graphics();

    // Floor
    g.rect(0, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
    g.fill(0x1a1a2e);

    // Back wall
    g.rect(0, 0, ROOM_W, FLOOR_Y);
    g.fill(0x0d0d1f);

    // Wall borders
    g.rect(0, 0, 4, ROOM_H); // left wall
    g.fill(0x2a2a4a);
    g.rect(ROOM_W - 4, 0, 4, ROOM_H); // right wall
    g.fill(0x2a2a4a);
    g.rect(0, 0, ROOM_W, 4); // ceiling
    g.fill(0x2a2a4a);
    g.rect(0, ROOM_H - 4, ROOM_W, 4); // floor border
    g.fill(0x2a2a4a);

    // Panel lines on back wall (horizontal)
    for (let y = 60; y < FLOOR_Y; y += 80) {
      g.rect(20, y, ROOM_W - 40, 1);
      g.fill(0x1a1a3a);
    }

    this.roomContainer.addChild(g);
  }

  private drawStation(st: Station): void {
    const g = new Graphics();

    // Station base (tall rectangle)
    g.roundRect(st.x - 25, FLOOR_Y - 80, 50, 80, 4);
    g.fill(0x111128);
    g.stroke({ color: st.color, width: 1.5, alpha: 0.6 });

    // Accent light (small glow circle)
    g.circle(st.x, FLOOR_Y - 90, 8);
    g.fill({ color: st.color, alpha: 0.3 });
    g.circle(st.x, FLOOR_Y - 90, 4);
    g.fill(st.color);

    this.roomContainer.addChild(g);

    // Label above station
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

  private drawPlayerSprite(): void {
    // Simple coloured rectangle — matches player sprite proportions
    this.playerGfx.rect(0, 0, PLAYER_W, PLAYER_H);
    this.playerGfx.fill(0x44ccff);
    // Head
    this.playerGfx.rect(4, 0, 16, 12);
    this.playerGfx.fill(0x66ddff);
  }
}
```

**Step 3: Verify compilation**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`
Expected: No errors (files aren't imported by game.ts yet, but should compile standalone).

**Step 4: Commit**

```bash
git add src/scenes/ship-interior.ts src/ui/interact-prompt.ts
git commit -m "feat: add ship interior scene with walkable stations"
```

---

## Task 4: Star Map Scene

Create the point-and-click star map with star nodes, connections, and planet info.

**Files:**
- Create: `src/scenes/star-map.ts`
- Create: `src/ui/planet-info-panel.ts`

**Step 1: Create planet-info-panel.ts**

Sidebar panel showing planet details when a star is selected.

```typescript
// src/ui/planet-info-panel.ts
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

    // Background
    const bg = new Graphics();
    bg.roundRect(0, 0, PANEL_W, PANEL_H, 8);
    bg.fill({ color: 0x0a0a20, alpha: 0.9 });
    bg.stroke({ color: 0x2244aa, width: 1.5 });
    this.container.addChild(bg);

    const style = (size: number, color: number): TextStyle =>
      new TextStyle({ fontFamily: MONO, fontSize: size, fill: color });

    this.nameText = new Text({ text: '', style: style(20, 0xffffff) });
    this.nameText.x = PAD;
    this.nameText.y = PAD;
    this.container.addChild(this.nameText);

    this.diffText = new Text({ text: '', style: style(14, 0xaaaaaa) });
    this.diffText.x = PAD;
    this.diffText.y = PAD + 30;
    this.container.addChild(this.diffText);

    this.biomeText = new Text({ text: '', style: style(12, 0x6688aa) });
    this.biomeText.x = PAD;
    this.biomeText.y = PAD + 54;
    this.container.addChild(this.biomeText);

    this.tierText = new Text({ text: '', style: style(12, 0xcc8844) });
    this.tierText.x = PAD;
    this.tierText.y = PAD + 80;
    this.container.addChild(this.tierText);

    this.deployText = new Text({ text: '', style: style(14, 0x00ccff) });
    this.deployText.x = PAD;
    this.deployText.y = PANEL_H - PAD - 40;
    this.container.addChild(this.deployText);
  }

  /** Show panel for the given star system. */
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
      this.tierText.text = `Ship Tier ${star.tierRequired} ✓`;
      this.tierText.style.fill = 0x44cc44;
      this.deployText.text = 'Equip a weapon first';
      this.deployText.style.fill = 0xcc8844;
    } else {
      this.tierText.text = `Ship Tier ${star.tierRequired} ✓`;
      this.tierText.style.fill = 0x44cc44;
      this.deployText.text = 'ENTER to deploy';
      this.deployText.style.fill = 0x00ccff;
    }

    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
```

**Step 2: Create star-map.ts**

The star map scene with navigable star nodes.

```typescript
// src/scenes/star-map.ts
/**
 * StarMap — top-down point-and-click star system navigator.
 * Arrow keys or click to select stars. Enter to deploy. ESC to return to ship.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MONO } from '../ui/ui-helpers.js';
import { PlanetInfoPanel } from '../ui/planet-info-panel.js';
import { STAR_SYSTEMS } from './star-map-data.js';
import type { StarSystem } from './star-map-data.js';

const STAR_RADIUS = 12;
const SELECTED_RADIUS = 18;
const CONNECTION_ALPHA = 0.2;

export type StarMapResult =
  | { action: 'deploy'; starId: string }
  | { action: 'back' };

export class StarMap {
  readonly container: Container;
  private selectedIdx = 0;
  private starGraphics: Graphics[] = [];
  private infoPanel: PlanetInfoPanel;
  private shipTier: number;
  private hasWeapon: boolean;
  private onResult: (result: StarMapResult) => void;
  private pulseTime = 0;

  // Keyboard
  private keysJustPressed = new Set<string>();
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;

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

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, w, h);
    bg.fill(0x020210);
    this.container.addChild(bg);

    // Draw subtle nebula blobs
    this.drawNebula(w, h);

    // Draw connections first (behind stars)
    this.drawConnections(w, h);

    // Draw stars
    for (let i = 0; i < STAR_SYSTEMS.length; i++) {
      const gfx = this.drawStar(STAR_SYSTEMS[i], w, h, i === this.selectedIdx);
      this.starGraphics.push(gfx);
      this.container.addChild(gfx);
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

    // Info panel (right side)
    this.infoPanel = new PlanetInfoPanel();
    this.infoPanel.container.x = w - 280;
    this.infoPanel.container.y = (h - 280) / 2;
    this.container.addChild(this.infoPanel.container);
    this.updateSelection();

    // Keyboard
    this.handleKeyDown = (e: KeyboardEvent) => {
      if (!e.repeat) this.keysJustPressed.add(e.code);
    };
    this.handleKeyUp = () => { /* no-op */ };
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  /** Call each frame. */
  update(dt: number): void {
    this.pulseTime += dt;

    // Navigation
    if (this.keysJustPressed.has('ArrowRight') || this.keysJustPressed.has('KeyD')) {
      this.selectedIdx = Math.min(STAR_SYSTEMS.length - 1, this.selectedIdx + 1);
      this.updateSelection();
    }
    if (this.keysJustPressed.has('ArrowLeft') || this.keysJustPressed.has('KeyA')) {
      this.selectedIdx = Math.max(0, this.selectedIdx - 1);
      this.updateSelection();
    }

    // Deploy
    if (this.keysJustPressed.has('Enter')) {
      const star = STAR_SYSTEMS[this.selectedIdx];
      if (this.shipTier >= star.tierRequired && this.hasWeapon) {
        this.onResult({ action: 'deploy', starId: star.id });
      }
    }

    // Back
    if (this.keysJustPressed.has('Escape')) {
      this.onResult({ action: 'back' });
    }

    // Pulse selected star
    const sel = this.starGraphics[this.selectedIdx];
    if (sel) {
      sel.scale.set(1 + Math.sin(this.pulseTime * 3) * 0.08);
    }

    this.keysJustPressed.clear();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.infoPanel.destroy();
    this.container.destroy({ children: true });
  }

  private updateSelection(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Redraw all stars
    for (let i = 0; i < STAR_SYSTEMS.length; i++) {
      const gfx = this.starGraphics[i];
      gfx.clear();
      this.renderStarGfx(gfx, STAR_SYSTEMS[i], w, h, i === this.selectedIdx);
      gfx.scale.set(1); // reset pulse
    }

    // Update info panel
    const star = STAR_SYSTEMS[this.selectedIdx];
    this.infoPanel.show(star, this.shipTier, this.hasWeapon);
  }

  private drawStar(star: StarSystem, w: number, h: number, selected: boolean): Graphics {
    const gfx = new Graphics();
    this.renderStarGfx(gfx, star, w, h, selected);
    return gfx;
  }

  private renderStarGfx(
    gfx: Graphics, star: StarSystem,
    w: number, h: number, selected: boolean,
  ): void {
    const sx = star.x * w * 0.7 + w * 0.1;  // map 0-1 to 10%-80% of screen
    const sy = star.y * h * 0.6 + h * 0.15;
    const locked = this.shipTier < star.tierRequired;
    const r = selected ? SELECTED_RADIUS : STAR_RADIUS;
    const alpha = locked ? 0.3 : 1.0;

    // Glow
    if (selected && !locked) {
      gfx.circle(sx, sy, r + 8);
      gfx.fill({ color: star.color, alpha: 0.15 });
    }

    // Selection ring
    if (selected) {
      gfx.circle(sx, sy, r + 3);
      gfx.stroke({ color: 0x00ccff, width: 2, alpha });
    }

    // Star dot
    gfx.circle(sx, sy, r);
    gfx.fill({ color: locked ? 0x333355 : star.color, alpha });

    // Inner bright core
    gfx.circle(sx, sy, r * 0.4);
    gfx.fill({ color: 0xffffff, alpha: alpha * 0.8 });

    // Name label
    const label = new Text({
      text: star.name,
      style: new TextStyle({
        fontFamily: MONO, fontSize: 12,
        fill: locked ? 0x444466 : 0xaaccdd,
      }),
    });
    label.anchor.set(0.5, 0);
    label.x = sx;
    label.y = sy + r + 8;
    gfx.addChild(label);

    // Lock icon for locked stars
    if (locked) {
      const lock = new Text({
        text: '🔒',
        style: new TextStyle({ fontSize: 14 }),
      });
      lock.anchor.set(0.5, 0.5);
      lock.x = sx;
      lock.y = sy;
      gfx.addChild(lock);
    }
  }

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
        gfx.stroke({ color: 0x2244aa, width: 1.5, alpha: CONNECTION_ALPHA });
      }
    }

    this.container.addChild(gfx);
  }

  private drawNebula(w: number, h: number): void {
    const gfx = new Graphics();
    // A few soft coloured blobs
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
```

**Step 3: Verify compilation**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/scenes/star-map.ts src/ui/planet-info-panel.ts
git commit -m "feat: add star map scene with navigable star nodes and planet info"
```

---

## Task 5: Warp Transition Effect

Create the star-stretch warp animation that plays when deploying from the star map.

**Files:**
- Create: `src/scenes/warp-transition.ts`

**Step 1: Create warp-transition.ts**

```typescript
// src/scenes/warp-transition.ts
/**
 * WarpTransition — star-stretch lines radiating from centre,
 * followed by fade to black. Calls onComplete when done.
 */

import { Container, Graphics } from 'pixi.js';

const NUM_LINES = 60;
const DURATION = 1.5;     // total seconds
const STRETCH_PHASE = 0.8; // seconds of star stretching
const FADE_PHASE = 0.7;    // seconds of fade to black (overlaps)

interface WarpLine {
  angle: number;    // radians
  speed: number;    // px/s
  length: number;   // current length
  brightness: number; // 0-1
}

export class WarpTransition {
  readonly container: Container;
  private lines: WarpLine[] = [];
  private elapsed = 0;
  private gfx: Graphics;
  private fadeGfx: Graphics;
  private cx: number;
  private cy: number;
  private onComplete: () => void;
  private done = false;

  constructor(onComplete: () => void) {
    this.onComplete = onComplete;
    this.container = new Container();
    this.cx = window.innerWidth / 2;
    this.cy = window.innerHeight / 2;

    // Black background
    const bg = new Graphics();
    bg.rect(0, 0, window.innerWidth, window.innerHeight);
    bg.fill(0x000000);
    this.container.addChild(bg);

    // Lines layer
    this.gfx = new Graphics();
    this.container.addChild(this.gfx);

    // Fade overlay
    this.fadeGfx = new Graphics();
    this.container.addChild(this.fadeGfx);

    // Generate random lines
    for (let i = 0; i < NUM_LINES; i++) {
      this.lines.push({
        angle: Math.random() * Math.PI * 2,
        speed: 300 + Math.random() * 600,
        length: 0,
        brightness: 0.4 + Math.random() * 0.6,
      });
    }
  }

  /** Call each frame. Returns true when transition is complete. */
  update(dt: number): boolean {
    if (this.done) return true;
    this.elapsed += dt;

    // Star stretch phase
    if (this.elapsed < STRETCH_PHASE) {
      const t = this.elapsed / STRETCH_PHASE; // 0→1
      this.gfx.clear();
      for (const line of this.lines) {
        line.length += line.speed * dt * (1 + t * 3); // accelerate
        const x1 = this.cx + Math.cos(line.angle) * 20;
        const y1 = this.cy + Math.sin(line.angle) * 20;
        const x2 = this.cx + Math.cos(line.angle) * (20 + line.length);
        const y2 = this.cy + Math.sin(line.angle) * (20 + line.length);
        this.gfx.moveTo(x1, y1);
        this.gfx.lineTo(x2, y2);
        this.gfx.stroke({
          color: 0xffffff, width: 1.5,
          alpha: line.brightness * (0.5 + t * 0.5),
        });
      }
    }

    // Fade to black phase
    const fadeStart = DURATION - FADE_PHASE;
    if (this.elapsed > fadeStart) {
      const fadeT = Math.min(1, (this.elapsed - fadeStart) / FADE_PHASE);
      this.fadeGfx.clear();
      this.fadeGfx.rect(0, 0, window.innerWidth, window.innerHeight);
      this.fadeGfx.fill({ color: 0x000000, alpha: fadeT });
    }

    // Complete
    if (this.elapsed >= DURATION) {
      this.done = true;
      this.onComplete();
      return true;
    }
    return false;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
```

**Step 2: Verify compilation**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/scenes/warp-transition.ts
git commit -m "feat: add warp transition star-stretch effect"
```

---

## Task 6: Wire Everything Together in game.ts

Connect the ship interior, star map, and warp transition to the main game loop. This is the critical integration task.

**Files:**
- Modify: `src/core/game.ts` (significant rewrite)

**Step 1: Rewrite game.ts**

Key changes:
- Add scene state for ship, star-map, and warp (alongside gameplay)
- `showShip()` replaces `showHub()` — creates ShipInterior
- Ship action callbacks open overlays (loadout, shop) or transition to star map
- Star map deploy triggers warp → level
- Death/victory return to ship
- Ticker now also ticks ship scene and star map scene when active
- Existing HubScreen is NO LONGER used as the entry scene (can keep import for overlay panels)
- WeaponPanel and ShopPanel are reused as overlays in ship scene

The final game.ts must stay under 250 lines. The scene routing is already extracted.
The existing `loadLevel()`, `unloadLevel()`, and `addSystem()` methods stay the same.
`returnToPlanetSelect()` → `returnToShip()`.
`returnToHubVictory()` stays similar but returns to ship.

We need to handle overlay panels (weapon/shop) as popup containers on the ship scene.
For simplicity, create a small helper in a new file.

**Additional file needed:**
- Create: `src/scenes/ship-overlays.ts`

```typescript
// src/scenes/ship-overlays.ts
/**
 * ShipOverlays — manages weapon loadout and shop panels as modal overlays
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
  private bg: Graphics | null = null;
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

  /** Show a specific overlay panel. */
  open(type: 'loadout' | 'shop'): void {
    this.close(); // close any existing

    this.currentOverlay = type;
    this.container.visible = true;

    // Semi-transparent backdrop
    this.bg = new Graphics();
    this.bg.rect(0, 0, window.innerWidth, window.innerHeight);
    this.bg.fill({ color: 0x000000, alpha: 0.7 });
    this.container.addChild(this.bg);

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    if (type === 'loadout') {
      const title = centeredText(this.container, '── LOADOUT ──', new TextStyle({
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

  /** Close the current overlay. */
  close(): void {
    if (this.weaponPanel) {
      this.weaponPanel = null;
    }
    if (this.shopPanel) {
      this.shopPanel.destroy();
      this.shopPanel = null;
    }
    this.container.removeChildren();
    this.container.visible = false;
    this.currentOverlay = null;
  }

  /** Whether an overlay is currently open (blocks ship movement). */
  get isOpen(): boolean {
    return this.currentOverlay !== null;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKey);
    this.close();
    this.container.destroy({ children: true });
  }
}
```

**Step 2: Rewrite game.ts**

The new game.ts needs to:
- Import ShipInterior, StarMap, WarpTransition, ShipOverlays
- Replace showHub/HubScreen with ship/star-map scene management
- Ticker ticks ship.update() or starMap.update() when those scenes are active
- Handle warp transition ticking

Since game.ts is at 249 lines, the rewrite will stay close to the same size because we removed HubScreen logic and added ship/star-map routing.

The implementation should:
1. Remove HubScreen import and usage
2. Add imports for ShipInterior, StarMap, WarpTransition, ShipOverlays
3. In init(): call `this.showShip()` instead of `this.showHub()`
4. Ticker: add branches for 'ship' and 'star-map' scenes
5. `showShip()`: create ShipInterior + ShipOverlays, handle actions
6. `showStarMap()`: create StarMap
7. `deployToLevel(starId)`: play warp → startLevel
8. `returnToShip()`: replaces returnToPlanetSelect
9. Victory flow unchanged except returns to ship

**This step requires careful implementation. The implementing agent should:**
- Read the current game.ts first
- Keep all existing level loading / system building code
- Only change the scene routing and hub/menu code
- Ensure the file stays under 250 lines

**Step 3: Verify compilation + manual test**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`
Expected: No errors.

Manual test in browser at localhost:3001:
- Game starts → ship interior visible, player can walk
- Walk to station → "Press E" prompt appears
- Press E at cockpit → star map opens
- Arrow keys navigate stars → info panel updates
- Press Enter on accessible star → warp animation → level loads
- Die → return to ship
- Victory → return to ship
- Hotkeys M/L/S work from ship

**Step 4: Commit**

```bash
git add src/scenes/ship-overlays.ts src/core/game.ts
git commit -m "feat: wire ship interior, star map, and warp transition into game loop"
```

---

## Task 7: Clean Up and Polish

Final pass — remove unused code, update memory docs, verify everything works.

**Files:**
- Modify: `src/core/game.ts` (minor cleanup if needed)
- Possibly remove: `src/ui/hub-screen.ts` (if fully replaced — but keep if overlay code still references it)
- Possibly remove: `src/ui/planet-panel.ts` (replaced by star map)

**Step 1: Determine what's unused**

- `HubScreen` — no longer the entry point. If ShipOverlays fully replaces its panel hosting, this file can be deleted.
- `PlanetPanel` — fully replaced by StarMap. Can be deleted.
- Both should be checked for any imports before removal.

**Step 2: Remove unused files if safe**

Only delete if no other file imports them. Use grep to verify.

**Step 3: Manual playtest checklist**

- [ ] Game boots to ship interior
- [ ] Player walks left/right in ship
- [ ] "Press E" appears near stations
- [ ] E at workbench → loadout overlay → ESC closes
- [ ] E at terminal → shop overlay → ESC closes
- [ ] E at cockpit → star map
- [ ] L/S/M hotkeys work from ship
- [ ] Star map shows 3 stars with connections
- [ ] Arrow keys navigate between stars
- [ ] Locked stars show lock + "Requires Ship Tier"
- [ ] Accessible star + weapon → Enter deploys
- [ ] Warp animation plays before level loads
- [ ] Gameplay works normally (combat, enemies, boss)
- [ ] Death → back to ship interior
- [ ] Victory → stats screen → back to ship
- [ ] No TypeScript errors, no console errors

**Step 4: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove unused hub-screen and planet-panel, polish ship + star map"
```

---

## Summary

| Task | Files | What |
|------|-------|------|
| 1 | scene-router.ts, game.ts | Extract scene routing |
| 2 | star-map-data.ts | Star system data |
| 3 | ship-interior.ts, interact-prompt.ts | Ship scene |
| 4 | star-map.ts, planet-info-panel.ts | Star map scene |
| 5 | warp-transition.ts | Warp effect |
| 6 | ship-overlays.ts, game.ts | Wire everything together |
| 7 | cleanup | Remove old hub, polish |

**Total new files:** 7
**Modified files:** 1 (game.ts)
**Deleted files:** 2 (hub-screen.ts, planet-panel.ts — if unused)
**Estimated new code:** ~1200 lines across 7 files
