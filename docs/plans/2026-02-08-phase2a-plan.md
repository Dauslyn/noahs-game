# Phase 2a: Visual & Audio Upgrade — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all procedural PixiJS Graphics with real sprite assets and add sound effects, making the game look and sound like a real game.

**Architecture:** Add an asset preloading layer (PixiJS Assets API) with a loading screen. Create a sprite animation helper to manage spritesheet frame extraction and animation state switching. Swap entity factories to use Sprite/AnimatedSprite instead of Graphics. Add parallax background system for planet surfaces. Wire sound files to existing SoundManager.

**Tech Stack:** PixiJS 8 Assets API, AnimatedSprite, Spritesheet, TilingSprite for parallax. Howler.js (already integrated). All free CC0 assets from OpenGameArt/itch.io.

---

## Asset Packs to Download (User Action Required)

The user must download these packs and place files in the correct directories:

### 1. Ansimuz Sideview Sci-Fi Collection (Player, Enemies, Backgrounds)
- **URL:** https://opengameart.org/content/sideview-sci-fi-patreon-collection
- **Also at:** https://ansimuz.itch.io/sideview-sci-fi
- **License:** CC0
- **Place files in:** `assets/sprites/ansimuz/`
- **We need:** Space-marine, Alien-walking-enemy, Alien-flying-enemy, Mech-unit (for companion), Explosion
- **Also need:** Alien-environment or Another-world (parallax backgrounds)

### 2. Eris Sci-Fi Platform Tiles
- **URL:** https://opengameart.org/content/sci-fi-platform-tiles
- **License:** CC0
- **Place files in:** `assets/tiles/`
- **We need:** `scifi_platformTiles_32x32.png`

### 3. Kenney 63 Digital Sound Effects
- **URL:** https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc
- **License:** CC0
- **Place files in:** `assets/sounds/`
- **We need:** Laser shots, zaps, power-ups for jump/hit/death sounds

### 4. Wenrexa Laser Bullets Pack
- **URL:** https://opengameart.org/content/assets-free-laser-bullets-pack-2020
- **License:** CC0
- **Place files in:** `assets/sprites/projectiles/`
- **We need:** A few laser bolt sprites

### 5. (Optional) Pixel Robot Companion
- **URL:** https://opengameart.org/content/pixel-robot
- **License:** CC0
- **Place files in:** `assets/sprites/mech/`
- **Alternative:** Use Mech-unit from Ansimuz pack

---

## Task 1: Asset Directory Setup & Loading Screen

**Files:**
- Create: `src/core/asset-loader.ts`
- Create: `src/ui/loading-screen.ts`
- Modify: `src/core/game.ts`
- Modify: `src/core/types.ts`

**Step 1: Create the asset manifest and loader**

Create `src/core/asset-loader.ts` — a thin wrapper around PixiJS Assets that:
- Defines a manifest of all game assets (sprites, tiles, backgrounds, sounds)
- Exposes `loadAllAssets()` that returns a Promise
- Emits progress (0-1) for the loading screen
- Exports typed accessor functions: `getTexture(name)`, `getSpritesheet(name)`

```typescript
// src/core/asset-loader.ts
import { Assets, Texture, Spritesheet } from 'pixi.js';

/** Asset bundle manifest — all game assets */
const ASSET_MANIFEST = {
  bundles: [
    {
      name: 'sprites',
      assets: [
        { alias: 'player-sheet', src: '/assets/sprites/ansimuz/space-marine.png' },
        { alias: 'walker-sheet', src: '/assets/sprites/ansimuz/alien-walking-enemy.png' },
        { alias: 'flyer-sheet', src: '/assets/sprites/ansimuz/alien-flying-enemy.png' },
        { alias: 'mech-sheet', src: '/assets/sprites/ansimuz/mech-unit.png' },
        { alias: 'explosion-sheet', src: '/assets/sprites/ansimuz/explosion.png' },
        { alias: 'tileset', src: '/assets/tiles/scifi_platformTiles_32x32.png' },
      ],
    },
    {
      name: 'backgrounds',
      assets: [
        { alias: 'bg-layer-1', src: '/assets/backgrounds/alien-sky.png' },
        { alias: 'bg-layer-2', src: '/assets/backgrounds/alien-mid.png' },
        { alias: 'bg-layer-3', src: '/assets/backgrounds/alien-near.png' },
      ],
    },
  ],
};

// NOTE: Exact file names will be adjusted after user downloads packs
// and we see actual file names in the ZIP archives.
```

**Step 2: Create loading screen UI**

Create `src/ui/loading-screen.ts`:
- Full-screen overlay with dark background
- Game title text ("Noah's Game")
- Progress bar that fills as assets load
- Fades out when loading completes

**Step 3: Wire loader into game.ts init sequence**

Modify `src/core/game.ts`:
- After PixiJS init, before physics/ECS setup, show loading screen
- Call `loadAllAssets()` with progress callback to update bar
- After load completes, fade out loading screen, then continue init
- This ensures no entity factories run until textures are available

**Step 4: Run dev server and verify loading screen appears**

Run: `npm run dev`
Expected: Loading screen shows, progress bar fills, game starts after

**Step 5: Commit**

```bash
git add src/core/asset-loader.ts src/ui/loading-screen.ts src/core/game.ts
git commit -m "feat: add asset loader with loading screen"
```

---

## Task 2: Sprite Animation Helper

**Files:**
- Create: `src/core/sprite-utils.ts`

**Step 1: Create sprite utility functions**

Create `src/core/sprite-utils.ts` that provides:

- `extractFrames(texture, frameWidth, frameHeight, row?, count?)` — slice a spritesheet texture into an array of Texture frames
- `createAnimatedEntity(frames, animationSpeed)` — create an AnimatedSprite from frames
- `AnimationSet` type — maps state names to frame arrays: `{ idle: Texture[], run: Texture[], jump: Texture[], fall: Texture[] }`
- `createAnimationSet(texture, config)` — build an AnimationSet from a spritesheet with row/column layout config

```typescript
interface FrameConfig {
  /** Name of this animation state */
  name: string;
  /** Row index in spritesheet (0-based) */
  row: number;
  /** Number of frames in this animation */
  frameCount: number;
  /** Playback speed (frames per second) */
  fps: number;
  /** Whether animation should loop */
  loop: boolean;
}

interface SpritesheetConfig {
  /** Width of a single frame in pixels */
  frameWidth: number;
  /** Height of a single frame in pixels */
  frameHeight: number;
  /** Animation definitions */
  animations: FrameConfig[];
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/core/sprite-utils.ts
git commit -m "feat: add sprite animation utility helpers"
```

---

## Task 3: Animation State Component

**Files:**
- Create: `src/components/animation-state.ts`
- Modify: `src/components/index.ts`
- Modify: `src/core/types.ts`

**Step 1: Create animation state component**

Create `src/components/animation-state.ts`:

```typescript
interface AnimationStateComponent extends Component {
  readonly type: 'animationState';
  /** Current animation name (e.g., 'idle', 'run', 'jump', 'fall') */
  currentAnimation: string;
  /** Map of animation name → Texture frames */
  animations: Map<string, { frames: Texture[]; fps: number; loop: boolean }>;
  /** Whether the sprite is flipped horizontally (facing left) */
  flipX: boolean;
}
```

**Step 2: Add 'animationState' to ComponentType union in types.ts**

**Step 3: Export from components/index.ts barrel**

**Step 4: Commit**

```bash
git add src/components/animation-state.ts src/components/index.ts src/core/types.ts
git commit -m "feat: add animation state component"
```

---

## Task 4: Animation System

**Files:**
- Create: `src/systems/animation-system.ts`
- Modify: `src/core/game.ts` (register system)

**Step 1: Create the animation system**

Create `src/systems/animation-system.ts`:
- Priority: **92** (after Camera at 90, before Effects at 95)
- Queries entities with `['sprite', 'animationState']`
- Each frame:
  1. Check if `animationState.currentAnimation` changed since last frame
  2. If changed: swap the AnimatedSprite's textures to the new animation's frames, reset frame counter
  3. Update flipX: `sprite.displayObject.scale.x = flipX ? -1 : 1`
  4. Ensure AnimatedSprite is playing if it should be

**Step 2: Register in game.ts**

Add `AnimationSystem` at priority 92 in the system registration block.

**Step 3: Run dev server, verify no errors**

**Step 4: Commit**

```bash
git add src/systems/animation-system.ts src/core/game.ts
git commit -m "feat: add animation system for sprite state switching"
```

---

## Task 5: Replace Player Visuals with Sprites

**Files:**
- Modify: `src/entities/create-player.ts`
- Modify: `src/systems/player-movement-system.ts`

**Step 1: Update create-player.ts**

Replace the procedural Graphics drawing code with:
1. Get player spritesheet texture from asset loader
2. Use sprite-utils to extract animation frames (idle, run, jump, fall)
3. Create an AnimatedSprite with idle frames
4. Add to worldContainer (same as before)
5. Create SpriteComponent with the AnimatedSprite
6. Create AnimationStateComponent with all animation sets
7. Set appropriate anchor point (0.5, 0.5 for center)

Keep everything else the same: physics body, player component, health, transform.

**Step 2: Update player-movement-system.ts**

At the end of the update loop (after determining player state), set the animation state:
- `idle` → 'idle' animation
- `running` → 'run' animation, set flipX based on velocity direction
- `jumping` → 'jump' animation
- `falling` → 'fall' animation
- `wallSliding` → 'fall' animation (or dedicated if available)

```typescript
// At end of per-entity update:
const animState = world.getComponent<AnimationStateComponent>(entity, 'animationState');
if (animState) {
  const newAnim = playerStateToAnimation(player.state);
  animState.currentAnimation = newAnim;
  animState.flipX = velocity.x < -0.1; // face left if moving left
}
```

**Step 3: Run dev server, verify player has animated sprite**

Expected: Player shows sprite art, animations change with movement state

**Step 4: Commit**

```bash
git add src/entities/create-player.ts src/systems/player-movement-system.ts
git commit -m "feat: replace player procedural graphics with animated sprite"
```

---

## Task 6: Replace Mech Companion Visuals

**Files:**
- Modify: `src/entities/create-mech.ts`

**Step 1: Update create-mech.ts**

Replace Graphics with sprite from mech-unit or pixel-robot sheet:
1. Get mech texture from asset loader
2. Extract idle + firing animation frames
3. Create AnimatedSprite
4. Create AnimationStateComponent with idle/firing states
5. Keep orbit/follow behavior the same

**Step 2: Run dev server, verify mech shows sprite**

**Step 3: Commit**

```bash
git add src/entities/create-mech.ts
git commit -m "feat: replace mech companion with animated sprite"
```

---

## Task 7: Replace Enemy Visuals

**Files:**
- Modify: `src/entities/create-walker.ts`
- Modify: `src/entities/create-flyer.ts`
- Modify: `src/entities/create-turret.ts`

**Step 1: Update create-walker.ts**

Replace Graphics with Ansimuz alien-walking-enemy sprite:
- Walk animation, idle, attack if available
- Add AnimationStateComponent
- Keep physics and enemy component the same

**Step 2: Update create-flyer.ts**

Replace Graphics with Ansimuz alien-flying-enemy sprite:
- Hover/fly animation
- Add AnimationStateComponent

**Step 3: Update create-turret.ts**

Replace Graphics with a turret sprite (may need to use a static frame from the tileset or mech-unit pack, or keep procedural if no good match):
- Idle + firing states
- Keep fixed physics body

**Step 4: Update enemy-ai-system.ts** (if needed)

Set animation state based on AI state (patrolling → walk anim, chasing → run anim, etc.)

**Step 5: Run dev server, verify all enemies show sprites**

**Step 6: Commit**

```bash
git add src/entities/create-walker.ts src/entities/create-flyer.ts src/entities/create-turret.ts
git commit -m "feat: replace enemy procedural graphics with sprites"
```

---

## Task 8: Replace Platform/Tile Visuals

**Files:**
- Modify: `src/level/level-builder.ts`
- Create: `src/level/tile-renderer.ts`

**Step 1: Create tile renderer utility**

Create `src/level/tile-renderer.ts`:
- Load the 32x32 tileset texture
- Define tile types (floor-top, floor-mid, wall-left, wall-right, corner-TL, etc.)
- Map tile indices to spritesheet positions
- `renderPlatform(width, height)` → returns a Container filled with tiled sprites
- Auto-tile: top edge gets floor-top tiles, interior gets floor-mid, etc.

**Step 2: Update level-builder.ts**

Replace the procedural Graphics platform drawing with:
1. Use tile-renderer to create a tiled Container for each platform
2. Add to worldContainer
3. Keep physics body creation the same

**Step 3: Run dev server, verify platforms use tileset art**

**Step 4: Commit**

```bash
git add src/level/tile-renderer.ts src/level/level-builder.ts
git commit -m "feat: replace procedural platforms with tileset sprites"
```

---

## Task 9: Add Parallax Planet Background

**Files:**
- Create: `src/systems/parallax-bg-system.ts`
- Modify: `src/systems/starfield-system.ts` (disable on planet levels)
- Modify: `src/core/game.ts`

**Step 1: Create parallax background system**

Create `src/systems/parallax-bg-system.ts`:
- Priority: **-10** (same as starfield, replaces it on planets)
- Load 3 parallax layers from background assets
- Use PixiJS TilingSprite for each layer (seamless horizontal scrolling)
- Each frame: offset each layer's tilePosition.x by camera.x × parallaxFactor
  - Far layer: 0.05
  - Mid layer: 0.15
  - Near layer: 0.3

**Step 2: Update starfield system**

Add a flag or condition: only run starfield if current scene is "space". For planet levels, the parallax background system runs instead. For now, just disable starfield and use parallax.

**Step 3: Register parallax system in game.ts**

**Step 4: Run dev server, verify parallax background scrolls behind platforms**

**Step 5: Commit**

```bash
git add src/systems/parallax-bg-system.ts src/systems/starfield-system.ts src/core/game.ts
git commit -m "feat: add parallax planet background, disable starfield on planets"
```

---

## Task 10: Wire Up Sound Effects

**Files:**
- Modify: `src/audio/sound-manager.ts`

**Step 1: Map downloaded sound files to game actions**

After user places Kenney sound files in `assets/sounds/`, update SoundManager:
- Map actual filenames to existing sound names (jump, laser, hit, death, enemy-death)
- Add new sounds: land, wall-slide (if good matches exist)
- Update file paths in the preload list
- Adjust volumes per sound

**Step 2: Run dev server, verify sounds play on actions**

Expected: Jump makes a sound, laser fires make a sound, hits make a sound

**Step 3: Commit**

```bash
git add src/audio/sound-manager.ts
git commit -m "feat: wire up real sound effects from Kenney CC0 pack"
```

---

## Task 11: Update Effects System for Sprites

**Files:**
- Modify: `src/systems/effects-system.ts`

**Step 1: Verify glow/bloom filters work on Sprites**

PixiJS filters should work the same on Sprite as on Graphics. Verify:
- Mech still has cyan glow
- Projectiles still have yellow glow
- Bloom filter still applied to worldContainer
- Damage flash (tint) works on Sprite objects

If any adjustments needed (tint API differences between Graphics and Sprite), fix them.

**Step 2: Run dev server, verify visual effects still look good**

**Step 3: Commit**

```bash
git add src/systems/effects-system.ts
git commit -m "fix: ensure glow/bloom effects work with sprite-based entities"
```

---

## Task 12: Update Projectile Visuals

**Files:**
- Modify: `src/entities/create-projectile.ts`

**Step 1: Update projectile creation**

Either:
- **A)** Use a laser bolt sprite from Wenrexa pack
- **B)** Keep the procedural glow effect (it already looks good)

Recommendation: Try the sprite first. If the glow effect on procedural looks better, keep procedural but improve it slightly. Laser bolts with the GlowFilter already look great.

**Step 2: Run dev server, compare both options**

**Step 3: Commit whichever looks better**

```bash
git add src/entities/create-projectile.ts
git commit -m "feat: update projectile visuals"
```

---

## Task 13: Final Polish & Review

**Files:**
- Various adjustments

**Step 1: Adjust sprite scales if needed**

The Ansimuz sprites may not be exactly 32x32 — they could be 48-wide or similar. Adjust entity factory dimensions and physics body sizes to match actual sprite dimensions.

**Step 2: Verify all collider sizes match sprite sizes**

Walk through each entity and ensure the Rapier physics body dimensions match the visible sprite dimensions reasonably.

**Step 3: Test the full game loop**

- Player movement feels the same (run, jump, wall-jump, wall-slide)
- Mech follows and fires correctly
- Enemies patrol, chase, and take damage
- Projectiles hit and deal damage
- Death and respawn work
- Effects (glow, bloom, flash) look good with sprites
- Sounds play at appropriate times
- Loading screen appears on startup

**Step 4: Add attribution file**

Create `assets/CREDITS.md` listing all asset packs used with their licenses.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Phase 2a complete — visual and audio upgrade"
```

---

## Important Notes for Implementation

### Asset File Names
The exact filenames in the downloaded packs may differ from what's listed in the manifest. After the user downloads and extracts the packs, the implementer should:
1. List the actual files with `ls assets/sprites/ansimuz/`
2. Update the asset manifest aliases to match real filenames
3. Examine each spritesheet to determine frame dimensions and layout

### Spritesheet Layout Discovery
Each spritesheet needs its layout mapped (frame width, height, rows, columns). The implementer should:
1. Open each PNG and measure frame dimensions
2. Count frames per animation row
3. Update the SpritesheetConfig for each entity accordingly

### Graceful Fallback
If any sprite fails to load, the entity factories should fall back to the existing procedural Graphics. This ensures the game always works even if an asset is missing.

### File Size Limit
Remember: max 250 lines per file. The tile-renderer and asset-loader may need to be split if they grow too large.
