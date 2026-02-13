# Visual Polish: Post-Processing Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the game look dramatically better by adding GPU post-processing filters using the already-installed pixi-filters library (v6.1.5, 38 filter classes available, currently only GlowFilter + BloomFilter used).

**Architecture:** The game has a clear container hierarchy: `app.stage` → `worldContainer` (game world) + `uiContainer` (HUD). Parallax backgrounds are direct children of `app.stage`. EffectsSystem (priority 95) already manages per-entity filters. We'll enhance EffectsSystem with new filter types and add scene-level filters to containers.

**Tech Stack:** pixi-filters v6.1.5 (already installed), PixiJS v8.16.0

---

## Current State

- `worldContainer.filters = [BloomFilter({ strength: 0.3 })]` — subtle world bloom ✅
- Mech: `GlowFilter({ color: 0x00ffff, outerStrength: 2, distance: 15 })` — pulsing cyan ✅
- Projectiles: `GlowFilter({ color: 0xffff44, outerStrength: 3, distance: 10 })` — yellow ✅
- Damage flash: tint to `0xff4444` for 0.12s ✅
- Everything else: **no filters at all**

## Key Files

| File | Lines | Role |
|---|---|---|
| `src/systems/effects-system.ts` | 215 | Filter application logic — primary modification target |
| `src/core/game.ts` | 250 (AT LIMIT) | World container setup — minimal changes only |
| `src/systems/parallax-bg-system.ts` | 172 | Background layers — add godray filter |
| `src/systems/camera-system.ts` | 173 | Screen shake — add shockwave on boss impacts |
| `src/entities/create-projectile.ts` | 133 | Projectile visuals — per-weapon glow colors |
| `src/scenes/ship-interior.ts` | 235 | Ship room — add CRT filter to terminals |
| `src/ui/boss-health-bar.ts` | ~113 | Boss HUD — add glow effect |
| `src/combat/weapon-defs.ts` | 121 | Weapon definitions — add glow color to style |

---

### Task 1: Per-Weapon Projectile Glow Colors

Currently all projectiles get the same yellow glow (`0xffff44`) regardless of weapon type. Laser should glow cyan, rockets orange, plasma purple — matching their `ProjectileStyle.glowColor`.

**Files:**
- Modify: `src/systems/effects-system.ts` (lines 119-135, `applyProjectileGlow`)
- Modify: `src/components/index.ts` (only if projectile component needs weapon reference)

**Step 1: Update `applyProjectileGlow` to read weapon color from projectile**

In `src/systems/effects-system.ts`, replace the `applyProjectileGlow` method. The projectile component's ownerEntity has a mech component with weapon info, but that's indirect. Instead, read the projectile's sprite glow color from its Graphics tint. Simpler approach: store the glow color on the ProjectileComponent.

Actually, even simpler: the projectile's Graphics object already has the `glowColor` baked in (line 112 of create-projectile.ts). We can read the SpriteComponent's displayObject to check its existing tint. BUT the cleanest approach: pass the glow color through the projectile component.

Add a `glowColor` field to the projectile component:

In `src/components/projectile.ts` (or wherever `createProjectile` is defined), add:
```typescript
glowColor?: number;
```

In `src/entities/create-projectile.ts`, pass `style?.glowColor` when creating the component:
```typescript
const proj = createProjectile(damage, ownerEntity, DEFAULT_LIFETIME, speed);
proj.glowColor = style?.glowColor;
world.addComponent(entity, proj);
```

Then in `effects-system.ts`, read it:
```typescript
private applyProjectileGlow(world: World): void {
  const projectiles = world.query('projectile', 'sprite');
  for (const entity of projectiles) {
    if (this.glowEntities.has(entity)) continue;
    const sprite = world.getComponent(entity, 'sprite');
    const proj = world.getComponent(entity, 'projectile');
    if (!sprite || !proj) continue;
    const color = proj.glowColor ?? 0xffff44;
    const glow = new GlowFilter({
      color,
      outerStrength: 3,
      distance: 10,
    });
    this.applyFilter(sprite.displayObject, glow);
    this.glowEntities.add(entity);
  }
}
```

**Step 2: Verify each weapon type spawns projectiles with correct glow color**

Run dev server (`npm run dev` on port 3001), equip each weapon via the ship loadout screen, fire on a level, visually confirm:
- Laser: cyan glow (`0x00aaff`)
- Rockets: red-orange glow (`0xff3300`)
- Plasma: purple glow (`0x8800cc`)

**Step 3: Commit**

```bash
git add src/systems/effects-system.ts src/entities/create-projectile.ts src/components/
git commit -m "feat: per-weapon projectile glow colors (cyan/orange/purple)"
```

---

### Task 2: Godray Filter on Parallax Backgrounds

Add atmospheric light beams to planet backgrounds. The `GodrayFilter` creates volumetric light ray effects — perfect for alien planet atmospheres.

**Files:**
- Modify: `src/systems/parallax-bg-system.ts` (constructor + update)
- Reference: `src/level/biome-config.ts` (for per-biome godray settings)

**Step 1: Add GodrayFilter to the sky layer**

In `src/systems/parallax-bg-system.ts`:

```typescript
import { GodrayFilter } from 'pixi-filters';
```

After creating the sky sprite (line 85 area), apply a GodrayFilter:

```typescript
const godray = new GodrayFilter({
  gain: 0.4,
  lacunarity: 2.5,
  alpha: 0.25,
  parallel: true,
  angle: 30,
});
skySprite.filters = [godray];
```

Store the filter and animate it in `update()`:
```typescript
if (this.godray) {
  this.godray.time += dt * 0.5; // slow drift
}
```

**Step 2: Tune per-biome**

Different biomes should have different godray intensity:
- Sci-fi interior: `alpha: 0.15` (subtle interior lighting)
- Another-world: `alpha: 0.3` (alien sun)
- Cyberpunk: `alpha: 0.2, angle: -20` (neon city light)

Add a `godrayAlpha` and `godrayAngle` to `BiomeConfig` in `src/level/biome-config.ts`.

**Step 3: Run dev server, check each level**

Visit each of the 3 levels and confirm godrays look atmospheric, not overwhelming. Alpha should be subtle (0.15-0.3).

**Step 4: Commit**

```bash
git add src/systems/parallax-bg-system.ts src/level/biome-config.ts
git commit -m "feat: atmospheric godray lighting on planet backgrounds"
```

---

### Task 3: Enhanced World Bloom + AdvancedBloom

Replace the basic `BloomFilter({ strength: 0.3 })` with `AdvancedBloomFilter` for much better looking bloom with threshold control (only bright things bloom, not everything).

**Files:**
- Modify: `src/systems/effects-system.ts` (line 38, `createWorldBloom`)

**Step 1: Replace BloomFilter with AdvancedBloomFilter**

```typescript
import { GlowFilter, AdvancedBloomFilter } from 'pixi-filters';

export function createWorldBloom(): AdvancedBloomFilter {
  return new AdvancedBloomFilter({
    threshold: 0.4,    // only things brighter than 40% bloom
    bloomScale: 0.6,   // bloom intensity
    brightness: 1.0,   // don't change base brightness
    blur: 4,           // blur kernel size
    quality: 4,        // blur quality passes
  });
}
```

The `threshold` is key — it means platforms and dark things DON'T bloom, but lasers, glows, and energy effects DO. This is how Dead Cells/Katana ZERO make bright things pop.

**Step 2: Test on each level**

Run dev server, confirm:
- Lasers and glowing projectiles bloom beautifully
- Dark platforms and backgrounds do NOT bloom
- Performance stays smooth (check for frame drops)

**Step 3: Commit**

```bash
git add src/systems/effects-system.ts
git commit -m "feat: advanced bloom filter with brightness threshold"
```

---

### Task 4: Drop Shadow Under Characters

Add subtle drop shadows under the player and enemies to visually ground them to platforms. Without shadows, characters float.

**Files:**
- Modify: `src/systems/effects-system.ts` (new method + update call)

**Step 1: Add `applyDropShadow` method to EffectsSystem**

```typescript
import { GlowFilter, AdvancedBloomFilter, DropShadowFilter } from 'pixi-filters';
```

Add a Set to track shadow entities: `private readonly shadowEntities = new Set<Entity>();`

```typescript
private applyDropShadow(world: World): void {
  const entities = world.query('sprite', 'health'); // player + enemies have health
  for (const entity of entities) {
    if (this.shadowEntities.has(entity)) continue;
    const sprite = world.getComponent(entity, 'sprite');
    if (!sprite) continue;
    const shadow = new DropShadowFilter({
      offset: { x: 0, y: 4 },
      color: 0x000000,
      alpha: 0.3,
      blur: 2,
    });
    this.applyFilter(sprite.displayObject, shadow);
    this.shadowEntities.add(entity);
  }
}
```

Call in `update()`:
```typescript
this.applyDropShadow(world);
```

Add cleanup in `cleanupDestroyedEntities`:
```typescript
for (const entity of this.shadowEntities) {
  if (!world.hasEntity(entity)) this.shadowEntities.delete(entity);
}
```

**Step 2: Verify shadows appear under player and enemies**

Run dev server, enter a level. Confirm:
- Subtle shadow below player
- Subtle shadow below enemies
- Shadow does NOT appear on projectiles (they have `projectile` component, not `health`)
- Mech has shadow too (it has health? — check; if not, add mech to query)

**Step 3: Commit**

```bash
git add src/systems/effects-system.ts
git commit -m "feat: drop shadows under characters for visual grounding"
```

---

### Task 5: Shockwave Effect on Boss Impacts

Replace the camera-shake-only boss impacts with a visible `ShockwaveFilter` ripple effect on the world container. This is a circular wave distortion that expands outward — extremely satisfying visual feedback.

**Files:**
- Create: `src/effects/shockwave-manager.ts` (new file, manages active shockwaves)
- Modify: `src/systems/effects-system.ts` (integrate shockwave manager)
- Modify: `src/systems/boss-ai-behaviours.ts` or `src/systems/boss-ai-system.ts` (trigger shockwave)

**Step 1: Create shockwave manager**

`src/effects/shockwave-manager.ts`:

```typescript
import { ShockwaveFilter } from 'pixi-filters';
import type { Container } from 'pixi.js';

interface ActiveShockwave {
  filter: ShockwaveFilter;
  elapsed: number;
  duration: number;
}

const MAX_CONCURRENT = 3;

export class ShockwaveManager {
  private active: ActiveShockwave[] = [];
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  /**
   * Trigger a shockwave centered at (x, y) in screen space.
   * @param x - screen X (0-1 normalized or pixel)
   * @param y - screen Y
   * @param amplitude - wave amplitude (default 10)
   * @param wavelength - ripple wavelength (default 80)
   * @param speed - expansion speed (default 400)
   * @param duration - total lifetime seconds (default 0.6)
   */
  trigger(
    x: number, y: number,
    amplitude = 10, wavelength = 80,
    speed = 400, duration = 0.6,
  ): void {
    if (this.active.length >= MAX_CONCURRENT) return;
    const filter = new ShockwaveFilter({
      center: { x, y },
      amplitude,
      wavelength,
      speed,
      radius: -1, // starts at center
    });
    this.active.push({ filter, elapsed: 0, duration });
    this.syncFilters();
  }

  /** Advance all active shockwaves. Remove completed ones. */
  update(dt: number): void {
    let changed = false;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const sw = this.active[i];
      sw.elapsed += dt;
      sw.filter.time = sw.elapsed;
      if (sw.elapsed >= sw.duration) {
        this.active.splice(i, 1);
        changed = true;
      }
    }
    if (changed) this.syncFilters();
  }

  /** Rebuild the container's filter array with active shockwaves. */
  private syncFilters(): void {
    const existing = (this.container.filters ?? []) as import('pixi.js').Filter[];
    // Keep non-shockwave filters, append active shockwaves
    const base = existing.filter(f => !(f instanceof ShockwaveFilter));
    this.container.filters = [
      ...base,
      ...this.active.map(s => s.filter),
    ];
  }
}
```

**Step 2: Integrate into EffectsSystem**

In EffectsSystem constructor, accept `worldContainer` parameter and create a ShockwaveManager. Expose a `triggerShockwave(x, y, ...)` method.

Actually — EffectsSystem has no constructor params currently. The cleanest approach: make ShockwaveManager a standalone module that EffectsSystem creates, OR pass worldContainer to EffectsSystem.

Modify EffectsSystem constructor:
```typescript
private shockwaveManager: ShockwaveManager | null = null;

setWorldContainer(container: Container): void {
  this.shockwaveManager = new ShockwaveManager(container);
}
```

In `game.ts` line 234, after creating EffectsSystem:
```typescript
const effects = new EffectsSystem();
effects.setWorldContainer(this.worldContainer);
this.addSystem(effects);
```

In EffectsSystem.update, add:
```typescript
this.shockwaveManager?.update(dt);
```

**Step 3: Trigger shockwave from BossAISystem**

In boss charge impact / phase transition moments (boss-ai-system.ts), call the shockwave. This requires EffectsSystem to be accessible. Options:
- Pass a callback `onShockwave` to BossAISystem
- Or use a simple event emitter pattern
- Simplest: static method on ShockwaveManager

Make ShockwaveManager a singleton with `ShockwaveManager.instance`:
```typescript
static instance: ShockwaveManager | null = null;
constructor(container: Container) {
  this.container = container;
  ShockwaveManager.instance = this;
}
```

Then in boss-ai-system.ts or boss-ai-behaviours.ts:
```typescript
import { ShockwaveManager } from '../effects/shockwave-manager.js';
// On boss charge impact:
ShockwaveManager.instance?.trigger(screenX, screenY, 12, 100, 500, 0.5);
```

**Step 4: Test boss fight shockwaves**

Play Neon Outpost, trigger the boss, watch for shockwave ripple on:
- Boss charge impact
- Phase 2 transition
- Phase 3 transition

**Step 5: Commit**

```bash
git add src/effects/shockwave-manager.ts src/systems/effects-system.ts src/systems/boss-ai-system.ts
git commit -m "feat: shockwave ripple effect on boss impacts"
```

---

### Task 6: CRT Filter on Ship Terminal Panels

Add a subtle CRT scanline effect to the ship's terminal/shop panels for retro-future atmosphere. This only applies in the ship interior scene.

**Files:**
- Modify: `src/scenes/ship-interior.ts` (apply CRT to station graphics)

**Step 1: Add CRT filter to station glow graphics**

In `ship-interior.ts`, import `CRTFilter`:
```typescript
import { CRTFilter } from 'pixi-filters';
```

When drawing the station containers (the glowing rectangles), apply a CRT filter to each station graphic:
```typescript
const crt = new CRTFilter({
  curvature: 0,       // no screen curve (flat panel)
  lineWidth: 1,       // thin scanlines
  lineContrast: 0.15, // very subtle
  noise: 0.05,        // slight static
  vignetting: 0,      // no edge darkening
});
stationGfx.filters = [crt];
```

Animate `crt.time += dt` in the ship update loop for moving scanlines.

**Step 2: Test ship interior**

Open the game, confirm:
- Station panels have subtle scanline effect
- Scanlines animate (move slowly)
- Rest of ship room is unaffected
- Performance is fine

**Step 3: Commit**

```bash
git add src/scenes/ship-interior.ts
git commit -m "feat: CRT scanline effect on ship terminal panels"
```

---

### Task 7: Scrap Pickup Glow + Boss Health Bar Glow

Add visual polish to collectibles and the boss health bar.

**Files:**
- Modify: `src/systems/effects-system.ts` (scrap/collectible glow)
- Modify: `src/ui/boss-health-bar.ts` (red glow on boss bar during phase 3)

**Step 1: Glow on scrap pickups**

If scrap pickups are entities with a specific component, add a golden glow. Check how scrap is awarded — if it's just `float-text.ts` (text popup on enemy death), there may not be a collectible entity. In that case, skip this and instead add glow to the float text.

In `src/ui/float-text.ts`, when creating the scrap text popup:
```typescript
import { GlowFilter } from 'pixi-filters';

// After creating the text object:
text.filters = [new GlowFilter({
  color: 0xffcc00,
  outerStrength: 2,
  distance: 8,
})];
```

**Step 2: Boss health bar glow during Phase 3**

In `src/ui/boss-health-bar.ts`, when phase is 3 (enrage), add a red glow to the bar container:

```typescript
import { GlowFilter } from 'pixi-filters';

// In update(), when phase === 3:
if (phase >= 3 && !this.enrageGlow) {
  this.enrageGlow = new GlowFilter({
    color: 0xff0000,
    outerStrength: 3,
    distance: 10,
  });
  this.container.filters = [this.enrageGlow];
}
```

**Step 3: Test both effects**

- Kill an enemy, confirm scrap text has golden glow
- Fight boss to phase 3, confirm health bar gets red glow

**Step 4: Commit**

```bash
git add src/ui/float-text.ts src/ui/boss-health-bar.ts
git commit -m "feat: golden glow on scrap pickups, red glow on boss enrage bar"
```

---

## Performance Notes

- AdvancedBloomFilter on worldContainer is the most expensive (full-screen GPU pass). If frame rate drops below 60fps, reduce `quality` from 4 to 2, or `blur` from 4 to 2.
- GodrayFilter animates per-frame. If slow, reduce it to updating every 2nd frame.
- ShockwaveFilter is temporary (0.5-0.6s) so cost is brief.
- DropShadowFilter per-entity is cheap but watch entity count. Cap at ~20 shadowed entities if needed.
- CRTFilter on small station panels is negligible.
- All filters use WebGPU/WebGL — no CPU overhead beyond setting uniforms.

## Total Scope

7 tasks, estimated 2-3 sessions. Each task is independent and can be tested in isolation. No changes to game logic, physics, or ECS architecture.

## Files Modified (summary)

| File | Change |
|---|---|
| `src/systems/effects-system.ts` | Per-weapon glow, drop shadows, advanced bloom, shockwave integration |
| `src/systems/parallax-bg-system.ts` | Godray filter on sky layer |
| `src/level/biome-config.ts` | Godray settings per biome |
| `src/entities/create-projectile.ts` | Pass glowColor to projectile component |
| `src/components/projectile.ts` (or index) | Add glowColor field |
| `src/effects/shockwave-manager.ts` | NEW — shockwave ripple manager |
| `src/scenes/ship-interior.ts` | CRT filter on station panels |
| `src/ui/float-text.ts` | Golden glow on scrap text |
| `src/ui/boss-health-bar.ts` | Red glow during phase 3 |
| `src/core/game.ts` | Minimal: pass worldContainer to EffectsSystem |
