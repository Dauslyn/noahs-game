# Phase 2c: Loadout & Inventory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a weapon loadout system, scrap resource collection, and the roguelite death loop so players choose a weapon, earn scrap from kills, and lose their loadout on death.

**Architecture:** New `GameState` object persists across scene transitions (scrap total, equipped weapon). Weapon definitions live in a registry lookup table. The hub screen (upgraded planet-select) shows loadout + planet selection. DamageSystem awards scrap on enemy kills. Death resets equipped weapon and applies a 50% scrap penalty.

**Tech Stack:** PixiJS (UI), existing ECS + systems, TypeScript strict mode.

---

## Task 1: Weapon Registry

**Files:**
- Create: `src/combat/weapon-defs.ts`
- Modify: `src/core/constants.ts:60-75` (remove hardcoded laser constants)

**Step 1: Create weapon definitions module**

Create `src/combat/weapon-defs.ts` with:

```typescript
/**
 * Weapon definitions registry — maps weapon IDs to stats and visual style.
 * Used by the loadout screen and mech entity factory.
 */

/** Available weapon identifiers. */
export type WeaponId = 'laser' | 'rockets' | 'plasma';

/** Visual style for projectile rendering. */
export interface ProjectileStyle {
  /** Core beam colour (hex). */
  coreColor: number;
  /** Outer glow colour (hex). */
  glowColor: number;
  /** Core width in pixels. */
  width: number;
  /** Core height in pixels. */
  height: number;
}

/** Complete weapon definition: stats + visuals + display info. */
export interface WeaponDef {
  id: WeaponId;
  /** Display name shown on hub screen. */
  name: string;
  /** Short description for the loadout UI. */
  description: string;
  /** Damage per projectile hit. */
  damage: number;
  /** Shots per second. */
  fireRate: number;
  /** Maximum projectile travel distance (pixels). */
  range: number;
  /** Projectile speed (m/s). */
  projectileSpeed: number;
  /** Visual style for projectiles. */
  style: ProjectileStyle;
}

/** All weapon definitions, indexed by WeaponId. */
export const WEAPON_DEFS: Record<WeaponId, WeaponDef> = {
  laser: {
    id: 'laser',
    name: 'Laser',
    description: 'Fast, steady, reliable',
    damage: 10,
    fireRate: 3,
    range: 400,
    projectileSpeed: 15,
    style: {
      coreColor: 0xaaffff,
      glowColor: 0x00ffff,
      width: 8,
      height: 3,
    },
  },
  rockets: {
    id: 'rockets',
    name: 'Rockets',
    description: 'Slow, heavy hits',
    damage: 30,
    fireRate: 1,
    range: 500,
    projectileSpeed: 8,
    style: {
      coreColor: 0xffcc66,
      glowColor: 0xff6600,
      width: 12,
      height: 5,
    },
  },
  plasma: {
    id: 'plasma',
    name: 'Plasma',
    description: 'Short range bullet hose',
    damage: 6,
    fireRate: 6,
    range: 250,
    projectileSpeed: 20,
    style: {
      coreColor: 0xdd88ff,
      glowColor: 0x8800ff,
      width: 6,
      height: 2,
    },
  },
};

/** All weapon IDs in display order. */
export const ALL_WEAPON_IDS: WeaponId[] = ['laser', 'rockets', 'plasma'];

/** Look up a weapon definition by ID. */
export function getWeaponDef(id: WeaponId): WeaponDef {
  return WEAPON_DEFS[id];
}
```

**Step 2: Update constants.ts**

Remove the `LASER_DAMAGE`, `LASER_FIRE_RATE`, `LASER_RANGE`, `LASER_SPEED` constants from `src/core/constants.ts` (lines 64-75). These are now in the weapon registry.

Keep `MECH_ORBIT_RADIUS` and `MECH_ORBIT_SPEED` — those are mech config, not weapon config.

**Step 3: Update create-mech.ts imports**

In `src/entities/create-mech.ts`, replace the laser constant imports with a `WeaponId` parameter:

```typescript
// Old:
import { LASER_DAMAGE, LASER_FIRE_RATE, LASER_RANGE, LASER_SPEED } from '../core/constants.js';

// New:
import { getWeaponDef } from '../combat/weapon-defs.js';
import type { WeaponId } from '../combat/weapon-defs.js';
```

Update `createMechEntity` signature to accept a `weaponId` parameter:

```typescript
export function createMechEntity(
  world: World,
  worldContainer: Container,
  ownerEntity: Entity,
  x: number,
  y: number,
  weaponId: WeaponId,
): Entity {
```

And replace the hardcoded weapon creation:
```typescript
// Old:
world.addComponent(entity, createWeapon(LASER_DAMAGE, LASER_FIRE_RATE, LASER_RANGE, LASER_SPEED));

// New:
const wdef = getWeaponDef(weaponId);
world.addComponent(entity, createWeapon(wdef.damage, wdef.fireRate, wdef.range, wdef.projectileSpeed));
```

**Step 4: Update game.ts to pass weapon ID**

In `src/core/game.ts`, the `loadLevel` method calls `createMechEntity`. Update to pass the equipped weapon. For now, hardcode `'laser'` as default — we'll wire the real selection in Task 5.

```typescript
createMechEntity(
  this.world, this.worldContainer, playerEntity,
  levelData.playerSpawn.x, levelData.playerSpawn.y,
  'laser', // TODO: replace with gameState.equippedWeapon in Task 5
);
```

**Step 5: Verify it compiles and runs**

Run: `npm run dev`
Expected: Game runs exactly as before (laser weapon, same stats).

**Step 6: Commit**

```bash
git add src/combat/weapon-defs.ts src/core/constants.ts src/entities/create-mech.ts src/core/game.ts
git commit -m "feat: add weapon registry with laser/rockets/plasma definitions"
```

---

## Task 2: Game State

**Files:**
- Create: `src/core/game-state.ts`
- Modify: `src/core/game.ts` (add gameState field, death penalty logic)

**Step 1: Create GameState module**

Create `src/core/game-state.ts`:

```typescript
/**
 * GameState — persistent state that survives across level loads and deaths.
 * Lives on the Game class. Resets only on full game restart.
 */

import type { WeaponId } from '../combat/weapon-defs.js';

export interface GameState {
  /** Total scrap collected. Persists across deaths with penalty. */
  scrap: number;
  /** Currently equipped weapon. Null = none selected (must pick at hub). */
  equippedWeapon: WeaponId | null;
}

/** Fraction of scrap lost on death (0.5 = lose 50%). */
const DEATH_SCRAP_PENALTY = 0.5;

/** Create a fresh game state for a new session. */
export function createGameState(): GameState {
  return { scrap: 0, equippedWeapon: null };
}

/** Apply death penalties: lose weapon, lose % of scrap. */
export function applyDeathPenalty(state: GameState): void {
  state.equippedWeapon = null;
  state.scrap = Math.floor(state.scrap * (1 - DEATH_SCRAP_PENALTY));
}

/** Add scrap to the player's total. */
export function addScrap(state: GameState, amount: number): void {
  state.scrap += amount;
}
```

**Step 2: Add gameState to Game class**

In `src/core/game.ts`, add import and field:

```typescript
import { createGameState, applyDeathPenalty } from './game-state.js';
import type { GameState } from './game-state.js';
```

Add field to the class:
```typescript
private gameState: GameState = createGameState();
```

In `returnToPlanetSelect()`, apply death penalty before showing hub:
```typescript
returnToPlanetSelect(): void {
  applyDeathPenalty(this.gameState);
  this.unloadLevel();
  this.showPlanetSelect();
}
```

**Step 3: Verify it compiles and runs**

Run: `npm run dev`
Expected: Game runs as before. Death now silently resets weapon and halves scrap (no visible effect yet).

**Step 4: Commit**

```bash
git add src/core/game-state.ts src/core/game.ts
git commit -m "feat: add GameState with scrap tracking and death penalty"
```

---

## Task 3: Scrap Drops on Enemy Kill

**Files:**
- Modify: `src/systems/damage-system.ts` (award scrap on enemy death)
- Modify: `src/core/game.ts` (pass gameState to DamageSystem)

**Step 1: Add scrap award to DamageSystem**

Modify `DamageSystem` constructor to accept a `GameState` reference:

```typescript
import { addScrap } from '../core/game-state.js';
import type { GameState } from '../core/game-state.js';
```

Add to constructor parameters and field:
```typescript
private readonly gameState: GameState;

constructor(
  physicsCtx: PhysicsContext,
  soundManager: SoundManager,
  entityManager: EntityManager,
  gameState: GameState,
) {
  // ... existing assignments ...
  this.gameState = gameState;
}
```

**Step 2: Award scrap in queueDeadEnemies**

In the `queueDeadEnemies` method, after marking for destruction and playing sound, add scrap:

```typescript
private queueDeadEnemies(world: World): void {
  const enemies = world.query('enemy', 'health');

  for (const entity of enemies) {
    const health = world.getComponent(entity, 'health');
    if (!health) continue;

    if (health.isDead) {
      this.entityManager.markForDestruction(entity);
      this.soundManager.play('enemy-death');
      // Award scrap based on enemy type
      const enemy = world.getComponent(entity, 'enemy');
      const scrapAmount = enemy ? this.getScrapValue(enemy.aiType) : 5;
      addScrap(this.gameState, scrapAmount);
    }
  }
}

/** Scrap value by enemy type. Tougher enemies = more scrap. */
private getScrapValue(aiType: string): number {
  switch (aiType) {
    case 'walker': return 5;
    case 'flyer': return 8;
    case 'turret': return 10;
    default: return 5;
  }
}
```

**Step 3: Update game.ts to pass gameState to DamageSystem**

In `loadLevel()`, update the DamageSystem construction:

```typescript
// Old:
this.addSystem(new DamageSystem(this.physicsCtx, this.soundManager, this.entityManager));

// New:
this.addSystem(new DamageSystem(this.physicsCtx, this.soundManager, this.entityManager, this.gameState));
```

**Step 4: Verify it compiles and runs**

Run: `npm run dev`
Expected: Killing enemies now silently increases `gameState.scrap`. No visual feedback yet.

**Step 5: Commit**

```bash
git add src/systems/damage-system.ts src/core/game.ts
git commit -m "feat: award scrap on enemy kills via DamageSystem"
```

---

## Task 4: HUD Scrap Counter

**Files:**
- Modify: `src/systems/hud-system.ts` (add scrap display)
- Modify: `src/core/game.ts` (pass gameState to HudSystem)

**Step 1: Add scrap counter to HudSystem**

```typescript
import { Text, TextStyle } from 'pixi.js';
import type { GameState } from '../core/game-state.js';
```

Add to constructor:
```typescript
private readonly scrapText: Text;
private readonly gameState: GameState;

constructor(uiContainer: Container, gameState: GameState) {
  this.gameState = gameState;

  this.healthBar = new HealthBar();
  uiContainer.addChild(this.healthBar.container);

  // Scrap counter (top-right area)
  const scrapStyle = new TextStyle({
    fontFamily: 'monospace',
    fontSize: 16,
    fill: 0xffcc00,
    fontWeight: 'bold',
  });
  this.scrapText = new Text({ text: 'SCRAP: 0', style: scrapStyle });
  this.scrapText.x = 16;
  this.scrapText.y = 50; // Below health bar
  uiContainer.addChild(this.scrapText);
}
```

Update the `update` method to refresh scrap display:
```typescript
update(world: World, _dt: number): void {
  // ... existing health bar logic ...
  this.scrapText.text = `SCRAP: ${this.gameState.scrap}`;
}
```

**Step 2: Update game.ts to pass gameState to HudSystem**

```typescript
// Old:
this.addSystem(new HudSystem(this.uiContainer));

// New:
this.addSystem(new HudSystem(this.uiContainer, this.gameState));
```

**Step 3: Verify it compiles and runs**

Run: `npm run dev`
Expected: "SCRAP: 0" visible below health bar. Killing enemies increments the counter.

**Step 4: Commit**

```bash
git add src/systems/hud-system.ts src/core/game.ts
git commit -m "feat: add scrap counter to HUD"
```

---

## Task 5: Hub Screen (Loadout + Planet Select)

**Files:**
- Rewrite: `src/ui/planet-select-screen.ts` → `src/ui/hub-screen.ts`
- Modify: `src/core/game.ts` (use HubScreen, wire weapon selection)

**Step 1: Create HubScreen**

Create `src/ui/hub-screen.ts` — a combined loadout and planet selection screen. This replaces `PlanetSelectScreen`.

The screen has:
- Title + scrap display at top
- Weapon selection row (3 horizontal buttons, highlight selected)
- Planet selection list (same as before, but disabled until weapon chosen)
- Warning text if no weapon selected

Key implementation details:
- Constructor receives: `levels: LevelData[]`, `gameState: GameState`, `onDeploy: (level: LevelData) => void`
- Weapon buttons call `gameState.equippedWeapon = weaponId` on click
- Planet buttons are only clickable when `gameState.equippedWeapon !== null`
- Scrap display reads from `gameState.scrap`

Layout constants:
```typescript
const WEAPON_BTN_WIDTH = 140;
const WEAPON_BTN_HEIGHT = 80;
const WEAPON_BTN_GAP = 16;
const WEAPON_SELECTED_COLOR = 0x003344;
const WEAPON_DEFAULT_COLOR = 0x1a1a3a;
```

The weapon buttons should show: weapon name, description, and a colored indicator matching the projectile glow color.

**Step 2: Update game.ts to use HubScreen**

Replace `PlanetSelectScreen` with `HubScreen`:

```typescript
// Old:
import { PlanetSelectScreen } from '../ui/planet-select-screen.js';

// New:
import { HubScreen } from '../ui/hub-screen.js';
```

Update `showPlanetSelect` → `showHub`:
```typescript
private showHub(): void {
  this.currentScene = 'planet-select';
  this.parallaxBg?.destroy(this.app.stage);
  this.parallaxBg = null;

  this.hubScreen = new HubScreen(
    ALL_LEVELS,
    this.gameState,
    (level) => this.startLevel(level),
  );
  this.app.stage.addChild(this.hubScreen.container);
}
```

Update `loadLevel` to use equipped weapon:
```typescript
createMechEntity(
  this.world, this.worldContainer, playerEntity,
  levelData.playerSpawn.x, levelData.playerSpawn.y,
  this.gameState.equippedWeapon!, // guaranteed non-null by hub screen
);
```

Update `returnToPlanetSelect` → call `showHub`.

**Step 3: Delete old planet-select-screen.ts**

Remove `src/ui/planet-select-screen.ts` — it's fully replaced.

**Step 4: Verify it compiles and runs**

Run: `npm run dev`
Expected: Hub screen shows weapon selection + planet buttons. Must pick weapon before deploying. Scrap total shown.

**Step 5: Commit**

```bash
git add src/ui/hub-screen.ts src/core/game.ts
git rm src/ui/planet-select-screen.ts
git commit -m "feat: add hub screen with weapon loadout and planet selection"
```

---

## Task 6: Projectile Visuals Per Weapon

**Files:**
- Modify: `src/entities/create-projectile.ts` (accept ProjectileStyle)
- Modify: `src/systems/weapon-system.ts` (pass style to projectile factory)
- Modify: `src/components/weapon.ts` (add weaponId field)
- Modify: `src/systems/effects-system.ts` (use weapon glow color)

**Step 1: Add weaponId to WeaponComponent**

In `src/components/weapon.ts`, add a `weaponId` field:

```typescript
import type { WeaponId } from '../combat/weapon-defs.js';

export interface WeaponComponent extends Component {
  readonly type: 'weapon';
  weaponId: WeaponId;
  // ... existing fields ...
}
```

Update `createWeapon` to accept and store weaponId:
```typescript
export function createWeapon(
  weaponId: WeaponId,
  damage: number,
  fireRate: number,
  range: number,
  projectileSpeed: number,
): WeaponComponent {
  return { type: 'weapon', weaponId, damage, fireRate, cooldownTimer: 0, range, projectileSpeed };
}
```

**Step 2: Update create-mech.ts to pass weaponId**

```typescript
const wdef = getWeaponDef(weaponId);
world.addComponent(entity, createWeapon(weaponId, wdef.damage, wdef.fireRate, wdef.range, wdef.projectileSpeed));
```

**Step 3: Update create-projectile.ts to accept ProjectileStyle**

Add a `style` parameter to `createProjectileEntity`:

```typescript
import type { ProjectileStyle } from '../combat/weapon-defs.js';

export function createProjectileEntity(
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  x: number, y: number,
  vx: number, vy: number,
  damage: number,
  ownerEntity: Entity,
  style?: ProjectileStyle,
): Entity {
```

Use `style` values (with laser defaults as fallback) when drawing the projectile graphic:

```typescript
const w = style?.width ?? 8;
const h = style?.height ?? 3;
const core = style?.coreColor ?? 0xffffcc;
const glow = style?.glowColor ?? 0xffff00;

const gfx = new Graphics();
// Outer glow trail
gfx.rect(-w / 2 - 2, -h, w + 4, h * 2);
gfx.fill({ color: glow, alpha: 0.3 });
// Core beam
gfx.rect(-w / 2, -h / 2, w, h);
gfx.fill(core);
// Hot centre line
gfx.rect(-w / 2 + 1, -0.5, w - 2, 1);
gfx.fill(0xffffff);
```

**Step 4: Update WeaponSystem to pass style**

In `src/systems/weapon-system.ts`, when calling `createProjectileEntity`, look up the weapon's style:

```typescript
import { getWeaponDef } from '../combat/weapon-defs.js';

// In the fire logic:
const wdef = getWeaponDef(weapon.weaponId);
createProjectileEntity(
  world, this.physicsCtx, this.worldContainer,
  spawnX, spawnY, vx, vy,
  weapon.damage, mechEntity,
  wdef.style,
);
```

**Step 5: Update EffectsSystem projectile glow color**

In `src/systems/effects-system.ts`, the `applyProjectileGlow` method hardcodes yellow. Update to read the projectile's owner weapon color. For simplicity, we can read the projectile component's associated weapon style. Since projectiles don't store style, the simplest approach is to keep using a generic warm glow — the core beam color already provides visual distinction. Keep the glow filter as-is (yellow-ish warm glow works for all three weapons).

**Step 6: Verify it compiles and runs**

Run: `npm run dev`
Expected: Selecting different weapons at the hub produces different-colored projectiles in gameplay.

**Step 7: Commit**

```bash
git add src/components/weapon.ts src/entities/create-projectile.ts src/entities/create-mech.ts src/systems/weapon-system.ts
git commit -m "feat: weapon-specific projectile visuals (color, size per weapon type)"
```

---

## Task 7: Scrap Float Text on Kill

**Files:**
- Create: `src/ui/float-text.ts`
- Modify: `src/systems/damage-system.ts` (spawn float text on kill)

**Step 1: Create float text utility**

Create `src/ui/float-text.ts`:

```typescript
/**
 * FloatText — spawns a short-lived text that floats upward and fades out.
 * Used for "+5 SCRAP" popups on enemy kill.
 */

import { Text, TextStyle, Container } from 'pixi.js';

const FLOAT_SPEED = 40;   // pixels per second upward
const FLOAT_DURATION = 1.0; // seconds

const FLOAT_STYLE = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 14,
  fill: 0xffcc00,
  fontWeight: 'bold',
});

/**
 * Spawn a floating text at the given world position.
 * It self-destructs after FLOAT_DURATION seconds.
 *
 * @param container - PixiJS container to add the text to
 * @param x - world X position (pixels)
 * @param y - world Y position (pixels)
 * @param message - text to display (e.g. "+5 SCRAP")
 */
export function spawnFloatText(
  container: Container,
  x: number,
  y: number,
  message: string,
): void {
  const text = new Text({ text: message, style: FLOAT_STYLE });
  text.anchor.set(0.5, 0.5);
  text.x = x;
  text.y = y;
  container.addChild(text);

  let elapsed = 0;

  const tick = (ticker: { deltaMS: number }): void => {
    const dt = ticker.deltaMS / 1000;
    elapsed += dt;
    text.y -= FLOAT_SPEED * dt;
    text.alpha = 1 - elapsed / FLOAT_DURATION;

    if (elapsed >= FLOAT_DURATION) {
      container.removeChild(text);
      text.destroy();
      // Remove ticker callback by using the app ticker reference
      // We'll use a different approach — see below
    }
  };

  // Use a simple requestAnimationFrame loop instead of pixi ticker
  // to avoid coupling to the app ticker
  const startTime = performance.now();
  const startY = y;

  function animate(): void {
    const now = performance.now();
    const elapsed = (now - startTime) / 1000;
    text.y = startY - FLOAT_SPEED * elapsed;
    text.alpha = Math.max(0, 1 - elapsed / FLOAT_DURATION);

    if (elapsed >= FLOAT_DURATION) {
      container.removeChild(text);
      text.destroy();
      return;
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
```

Actually, using `requestAnimationFrame` directly is simpler and avoids needing a ticker reference. Remove the unused `tick` function — just use the `animate` approach.

**Step 2: Add float text to DamageSystem**

In `DamageSystem`, import and call `spawnFloatText` when awarding scrap:

```typescript
import { spawnFloatText } from '../ui/float-text.js';
```

Add `worldContainer` to constructor params:
```typescript
private readonly worldContainer: Container;

constructor(
  physicsCtx: PhysicsContext,
  soundManager: SoundManager,
  entityManager: EntityManager,
  gameState: GameState,
  worldContainer: Container,
) {
  // ... existing ...
  this.worldContainer = worldContainer;
}
```

In `queueDeadEnemies`, after awarding scrap, spawn float text at the enemy's position:
```typescript
if (health.isDead) {
  this.entityManager.markForDestruction(entity);
  this.soundManager.play('enemy-death');
  const enemy = world.getComponent(entity, 'enemy');
  const scrapAmount = enemy ? this.getScrapValue(enemy.aiType) : 5;
  addScrap(this.gameState, scrapAmount);

  // Float text at enemy position
  const transform = world.getComponent(entity, 'transform');
  if (transform) {
    spawnFloatText(this.worldContainer, transform.x, transform.y - 20, `+${scrapAmount}`);
  }
}
```

**Step 3: Update game.ts to pass worldContainer to DamageSystem**

```typescript
this.addSystem(new DamageSystem(
  this.physicsCtx, this.soundManager, this.entityManager,
  this.gameState, this.worldContainer,
));
```

**Step 4: Verify it compiles and runs**

Run: `npm run dev`
Expected: Killing an enemy shows "+5" (or "+8", "+10") floating up from the enemy's position, fading out.

**Step 5: Commit**

```bash
git add src/ui/float-text.ts src/systems/damage-system.ts src/core/game.ts
git commit -m "feat: floating scrap text on enemy kill"
```

---

## Task 8: Integration Test & Polish

**Files:**
- Possibly minor tweaks across game.ts, hub-screen.ts

**Step 1: Full playthrough test**

Test the complete loop manually:
1. Game starts → hub screen shows (scrap: 0, no weapon selected)
2. Planet buttons are disabled/grayed
3. Select "Laser" → weapon highlights
4. Click "Zeta Station" → level loads with laser weapon
5. Kill enemies → "+5" float text, HUD scrap counter increments
6. Die → 2s delay → hub screen shows (scrap halved, no weapon selected)
7. Select "Rockets" → different weapon highlights
8. Click any planet → rockets fire orange, large, slow projectiles
9. Repeat with Plasma → purple, tiny, rapid-fire

**Step 2: Edge cases to verify**

- Can't deploy without selecting weapon (planet buttons disabled)
- Scrap rounds down on death penalty (e.g., 7 scrap → die → 3 scrap)
- Weapon visuals are clearly distinct for all 3 types
- HUD scrap counter updates in real-time during gameplay
- Hub screen shows correct scrap total after death penalty

**Step 3: Fix any issues found**

Address bugs found during testing.

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: phase 2c integration polish"
```

---

## Summary

| Task | What | New Files | Modified Files |
|------|------|-----------|----------------|
| 1 | Weapon registry | `src/combat/weapon-defs.ts` | `constants.ts`, `create-mech.ts`, `game.ts` |
| 2 | Game state | `src/core/game-state.ts` | `game.ts` |
| 3 | Scrap on kill | — | `damage-system.ts`, `game.ts` |
| 4 | HUD scrap counter | — | `hud-system.ts`, `game.ts` |
| 5 | Hub screen | `src/ui/hub-screen.ts` | `game.ts`, delete `planet-select-screen.ts` |
| 6 | Projectile visuals | — | `weapon.ts`, `create-projectile.ts`, `create-mech.ts`, `weapon-system.ts` |
| 7 | Float text | `src/ui/float-text.ts` | `damage-system.ts`, `game.ts` |
| 8 | Integration test | — | minor fixes |

**Total: 4 new files, ~10 modified files, ~600 lines of new code, 7 commits.**
