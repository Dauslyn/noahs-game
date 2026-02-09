# Phase 2b-2: Visual Biomes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give each planet level a distinct visual identity by swapping parallax backgrounds and tinting platforms per biome.

**Architecture:** Add an `EnvironmentTheme` type to `LevelData`. Create a `BiomeConfig` lookup that maps each theme to background texture aliases and a platform tint color. The `ParallaxBgSystem` and `tile-renderer` accept biome config instead of hardcoded aliases. `game.ts` wires everything together at level-load time.

**Tech Stack:** TypeScript, PixiJS v8.16.0 (TilingSprite, Sprite.tint)

---

## Biome Assignments

| Level | Theme | Sky Texture | Structures Texture | Platform Tint |
|---|---|---|---|---|
| Zeta Station (Easy) | `sci-fi-interior` | `background.png` (single full-screen layer) | *(none — single layer biome)* | `0x4488aa` (cool blue-steel) |
| Crystal Caverns (Medium) | `another-world` | `sky.png` | `back-towers.png` | `0x55aa88` (teal-green) |
| Neon Outpost (Hard) | `cyberpunk` | `back.png` | *(none — single layer biome)* | `0x88ccff` (cyan neon) |

Note: The existing `alien` biome (bg-sky + bg-structures) stays as the default/fallback.

---

### Task 1: Add Biome Config Module

**Files:**
- Create: `src/level/biome-config.ts`

**Step 1: Create `biome-config.ts` with types and config map**

```typescript
/**
 * Biome configuration — maps environment themes to texture aliases
 * and platform tint colors for visual variety per planet.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Available environment themes. */
export type EnvironmentTheme =
  | 'alien'
  | 'another-world'
  | 'cyberpunk'
  | 'sci-fi-interior';

/** Visual config for a single biome. */
export interface BiomeConfig {
  /** Texture alias for the far parallax layer (sky). */
  skyAlias: string;
  /** Texture alias for the near parallax layer (structures). Null = single-layer biome. */
  structuresAlias: string | null;
  /** Hex tint applied to platform tiles (0xRRGGBB). 0xffffff = no tint. */
  platformTint: number;
}

// ---------------------------------------------------------------------------
// Biome lookup
// ---------------------------------------------------------------------------

/** Config for every environment theme. */
const BIOME_CONFIGS: Record<EnvironmentTheme, BiomeConfig> = {
  'alien': {
    skyAlias: 'bg-sky',
    structuresAlias: 'bg-structures',
    platformTint: 0xffffff,
  },
  'another-world': {
    skyAlias: 'bg-another-world-sky',
    structuresAlias: 'bg-another-world-towers',
    platformTint: 0x55aa88,
  },
  'cyberpunk': {
    skyAlias: 'bg-cyberpunk-back',
    structuresAlias: null,
    platformTint: 0x88ccff,
  },
  'sci-fi-interior': {
    skyAlias: 'bg-interior',
    structuresAlias: null,
    platformTint: 0x4488aa,
  },
};

/**
 * Get the biome configuration for a given theme.
 * Falls back to 'alien' if theme is unknown.
 */
export function getBiomeConfig(theme: EnvironmentTheme): BiomeConfig {
  return BIOME_CONFIGS[theme] ?? BIOME_CONFIGS['alien'];
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to biome-config.ts

**Step 3: Commit**

```bash
git add src/level/biome-config.ts
git commit -m "feat: add biome config module with theme→visual mappings"
```

---

### Task 2: Add `environmentTheme` to LevelData

**Files:**
- Modify: `src/level/level-data.ts` (add field to LevelData interface)
- Modify: `src/level/extra-levels.ts` (set theme on each level)

**Step 1: Add the field to `LevelData` interface**

In `src/level/level-data.ts`, add the import and field:

```typescript
// At the top, add import:
import type { EnvironmentTheme } from './biome-config.js';

// In the LevelData interface, add after `difficulty`:
  /** Visual biome theme for backgrounds and platform tinting. */
  environmentTheme: EnvironmentTheme;
```

**Step 2: Set theme on PROTOTYPE_LEVEL in `level-data.ts`**

In the `PROTOTYPE_LEVEL` const, add after `difficulty: 'Easy'`:

```typescript
  environmentTheme: 'sci-fi-interior',
```

**Step 3: Set themes on extra levels in `extra-levels.ts`**

In `CRYSTAL_CAVERNS`, add after `difficulty: 'Medium'`:

```typescript
  environmentTheme: 'another-world',
```

In `NEON_OUTPOST`, add after `difficulty: 'Hard'`:

```typescript
  environmentTheme: 'cyberpunk',
```

**Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors (all LevelData objects now have the required field)

**Step 5: Commit**

```bash
git add src/level/level-data.ts src/level/extra-levels.ts
git commit -m "feat: add environmentTheme field to LevelData and all levels"
```

---

### Task 3: Register Biome Textures in Asset Loader

**Files:**
- Modify: `src/core/asset-loader.ts` (add 4 new texture entries to TEXTURE_MANIFEST)

**Step 1: Add new background texture aliases**

In `TEXTURE_MANIFEST`, after the existing `'bg-structures'` entry, add:

```typescript
  // Another-world biome backgrounds
  'bg-another-world-sky': `${ANSIMUZ_BASE}/Environments/another-world/PNG/layered/sky.png`,
  'bg-another-world-towers': `${ANSIMUZ_BASE}/Environments/another-world/PNG/layered/back-towers.png`,

  // Cyberpunk biome background
  'bg-cyberpunk-back': `${ANSIMUZ_BASE}/Environments/cyberpunk-corridor-files/PNG/layers/back.png`,

  // Sci-fi interior biome background
  'bg-interior': `${ANSIMUZ_BASE}/Environments/sci-fi-interior-paltform/PNG/background.png`,
```

Note: The `sci-fi-interior-paltform` directory has a typo in the asset pack ("paltform") — this is the actual directory name, do NOT correct it.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Verify assets load (manual test)**

Run: `npm run dev`
Open browser console. Confirm no new "Failed to load" warnings for the 4 new aliases.

**Step 4: Commit**

```bash
git add src/core/asset-loader.ts
git commit -m "feat: register biome background textures in asset loader"
```

---

### Task 4: Make ParallaxBgSystem Accept BiomeConfig

**Files:**
- Modify: `src/systems/parallax-bg-system.ts`

This is the biggest change. The system currently hardcodes `'bg-sky'` and `'bg-structures'`. We need it to accept dynamic aliases and handle single-layer biomes.

**Step 1: Add BiomeConfig import and constructor parameter**

Replace the constructor to accept a `BiomeConfig`:

```typescript
import type { BiomeConfig } from '../level/biome-config.js';
```

**Step 2: Rewrite constructor to use BiomeConfig**

The constructor should accept `(stage: Container, biome: BiomeConfig)` instead of just `(stage: Container)`. Use `biome.skyAlias` and `biome.structuresAlias` instead of hardcoded aliases.

Full updated constructor:

```typescript
  constructor(stage: Container, biome: BiomeConfig) {
    let insertIndex = 0;

    // Far layer: sky background (fills entire screen)
    if (hasTexture(biome.skyAlias)) {
      const skyTexture = getTexture(biome.skyAlias);
      const skySprite = new TilingSprite({
        texture: skyTexture,
        width: screenW(),
        height: screenH(),
      });
      skySprite.tileScale.set(SKY_TILE_SCALE, SKY_TILE_SCALE);
      stage.addChildAt(skySprite, insertIndex);
      insertIndex++;
      this.layers.push({ sprite: skySprite, parallaxFactor: SKY_PARALLAX });
    } else {
      console.warn(`[ParallaxBg] ${biome.skyAlias} texture not loaded, skipping`);
    }

    // Near layer: structures (bottom portion), only if biome has two layers
    if (biome.structuresAlias && hasTexture(biome.structuresAlias)) {
      const structTexture = getTexture(biome.structuresAlias);
      const structHeight = screenH() * STRUCTURES_HEIGHT_FRACTION;
      const structSprite = new TilingSprite({
        texture: structTexture,
        width: screenW(),
        height: structHeight,
      });
      structSprite.tileScale.set(STRUCTURES_TILE_SCALE, STRUCTURES_TILE_SCALE);
      structSprite.y = screenH() - structHeight;
      structSprite.alpha = 0.6;
      stage.addChildAt(structSprite, insertIndex);
      this.layers.push({ sprite: structSprite, parallaxFactor: STRUCTURES_PARALLAX });
    } else if (biome.structuresAlias) {
      console.warn(`[ParallaxBg] ${biome.structuresAlias} texture not loaded, skipping`);
    }

    if (this.layers.length > 0) {
      console.log(`[ParallaxBg] Created ${this.layers.length} parallax layers`);
    }
  }
```

**Step 3: Add a `destroy()` method to clean up layers**

Since the system is now recreated per level (with different biome config), it needs to remove its sprites from the stage:

```typescript
  /** Remove all parallax sprites from the stage. */
  destroy(stage: Container): void {
    for (const layer of this.layers) {
      stage.removeChild(layer.sprite);
      layer.sprite.destroy();
    }
    this.layers.length = 0;
  }
```

**Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: Errors in `game.ts` because the constructor signature changed — that's expected, we fix it in Task 6.

**Step 5: Commit**

```bash
git add src/systems/parallax-bg-system.ts
git commit -m "feat: make ParallaxBgSystem accept BiomeConfig for dynamic backgrounds"
```

---

### Task 5: Add Platform Tinting to Tile Renderer

**Files:**
- Modify: `src/level/tile-renderer.ts`
- Modify: `src/level/level-builder.ts`

**Step 1: Add `tint` parameter to `renderPlatformTiled`**

Change the function signature:

```typescript
export function renderPlatformTiled(
  width: number,
  height: number,
  tint: number = 0xffffff,
): Container {
```

Then inside the loop where sprites are created, add tint to each sprite after it's positioned:

```typescript
      // Apply biome tint to the tile
      sprite.tint = tint;
```

Add this line right before the `container.addChild(sprite)` call at the end of the inner loop.

**Step 2: Update level-builder to pass tint**

In `src/level/level-builder.ts`:

Add import:
```typescript
import type { EnvironmentTheme } from './biome-config.js';
import { getBiomeConfig } from './biome-config.js';
```

Update `buildLevel` signature to accept `environmentTheme`:

```typescript
export function buildLevel(
  levelData: LevelData,
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
): void {
  const biome = getBiomeConfig(levelData.environmentTheme);
  for (const platform of levelData.platforms) {
    buildPlatform(platform, world, physicsCtx, worldContainer, biome.platformTint);
  }
}
```

Update `buildPlatform` to accept and pass tint:

```typescript
function buildPlatform(
  def: PlatformDef,
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  tint: number,
): void {
```

And where it calls `renderPlatformTiled`:

```typescript
  const visual = renderPlatformTiled(def.width, def.height, tint);
```

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors (buildLevel's external signature is unchanged, tint flows through internally)

**Step 4: Commit**

```bash
git add src/level/tile-renderer.ts src/level/level-builder.ts
git commit -m "feat: add platform tinting support to tile renderer and level builder"
```

---

### Task 6: Wire Biome Config Through game.ts

**Files:**
- Modify: `src/core/game.ts`

This is the integration task. The parallax system can no longer be persistent across scenes — it needs to be recreated per level with the correct biome config.

**Step 1: Import BiomeConfig**

Add import:
```typescript
import { getBiomeConfig } from '../level/biome-config.js';
```

**Step 2: Change parallaxBg from persistent to per-level**

In the class, change the field type to allow null:

```typescript
  private parallaxBg: ParallaxBgSystem | null = null;
```

**Step 3: Remove parallaxBg creation from `init()`**

Delete these two lines from `init()`:
```typescript
    this.parallaxBg = new ParallaxBgSystem(this.app.stage);
    this.parallaxBg.setVisible(false);
```

**Step 4: Update `showPlanetSelect()`**

Replace `this.parallaxBg.setVisible(false)` with:

```typescript
    // Clean up previous parallax layers if any
    if (this.parallaxBg) {
      this.parallaxBg.destroy(this.app.stage);
      this.parallaxBg = null;
    }
```

**Step 5: Update `loadLevel()` to create parallaxBg per level**

After the `buildLevel()` call and before system registration, create the biome-specific parallax:

```typescript
    // Create biome-specific parallax background
    const biome = getBiomeConfig(levelData.environmentTheme);
    if (this.parallaxBg) {
      this.parallaxBg.destroy(this.app.stage);
    }
    this.parallaxBg = new ParallaxBgSystem(this.app.stage, biome);
```

**Step 6: Update system registration**

The `this.addSystem(this.parallaxBg)` line in `loadLevel()` should still work since `this.parallaxBg` is set just above. No change needed here.

**Step 7: Update `startLevel()` — remove `parallaxBg.setVisible(true)`**

The parallax is now created visible by default in `loadLevel()`, so remove:
```typescript
    this.parallaxBg.setVisible(true);
```

**Step 8: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 9: Commit**

```bash
git add src/core/game.ts
git commit -m "feat: wire biome config through game.ts for per-level parallax backgrounds"
```

---

### Task 7: Manual Playtest & Polish

**No code changes — verification only.**

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test each level**

1. Select **Zeta Station** → Verify: dark blue-teal interior background, blue-steel tinted platforms
2. Die or restart → back to planet select
3. Select **Crystal Caverns** → Verify: green sky with tower silhouettes, teal-green tinted platforms
4. Die or restart → back to planet select
5. Select **Neon Outpost** → Verify: dark cyberpunk cityscape background, cyan-tinted platforms

**Step 3: Check for visual issues**

- Parallax scrolling still works on all 3 levels
- No texture loading warnings in console
- Single-layer biomes (interior, cyberpunk) don't show a ghost second layer
- Platform tint is visible but not overpowering
- Transitioning between levels doesn't leave stale parallax sprites

**Step 4: Adjust tint values if needed**

If a tint is too strong or too subtle, tweak the hex values in `biome-config.ts`:
- `0xffffff` = no tint (white)
- Lower values = stronger tint
- Current values are starting points, adjust to taste

**Step 5: Final commit (if any polish was done)**

```bash
git add -A
git commit -m "polish: adjust biome tint values after playtest"
```

---

## File Change Summary

| File | Action | Lines Changed (est.) |
|---|---|---|
| `src/level/biome-config.ts` | **CREATE** | ~55 |
| `src/level/level-data.ts` | Modify | +3 (import + field) |
| `src/level/extra-levels.ts` | Modify | +2 (theme per level) |
| `src/core/asset-loader.ts` | Modify | +8 (4 new texture entries) |
| `src/systems/parallax-bg-system.ts` | Modify | ~20 (constructor param + destroy) |
| `src/level/tile-renderer.ts` | Modify | +3 (tint param + apply) |
| `src/level/level-builder.ts` | Modify | +5 (import + pass tint) |
| `src/core/game.ts` | Modify | ~15 (per-level parallax lifecycle) |

**Total: ~8 files, ~110 lines changed. No new systems, no breaking changes.**
