# Phase 2e-5: Polish & Juice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 polish features — screen shake, boss phase indicator, phantom warp particles, minion spawn flash, and victory stats screen — to make the game feel more responsive and satisfying.

**Architecture:** Each feature is a new module or small edit to an existing file. Screen shake lives in CameraSystem (add shake offset after clamping). Boss phase indicator extends BossHealthBar. Phantom warp particles are a new module called from the existing AI handlers. Minion spawn flash is a new standalone function. Victory screen is a new UI module that intercepts the existing `returnToHubVictory()` flow.

**Tech Stack:** PixiJS v8 (Graphics, Text, Container), TypeScript strict mode, ECS pattern.

**Constraint Note:** `game.ts` (250 lines), `damage-system.ts` (247), and `enemy-ai-behaviours-4.ts` (245) are at capacity — all new code goes in separate modules with minimal glue edits.

---

## Task 1: Screen Shake — Add shake method to CameraSystem

**Files:**
- Modify: `src/systems/camera-system.ts` (145 lines → ~175 lines)

**Step 1: Add shake state and public method to CameraSystem**

Add private fields and a public `shake()` method. Apply shake offset after bounds clamping in `update()`.

```typescript
// New private fields (after line 49):
private shakeAmplitude = 0;
private shakeDuration = 0;
private shakeElapsed = 0;

// New public method (after setBounds):
/**
 * Trigger a screen shake effect.
 * @param amplitude - max pixel offset
 * @param duration  - shake duration in seconds
 */
shake(amplitude: number, duration: number): void {
  this.shakeAmplitude = amplitude;
  this.shakeDuration = duration;
  this.shakeElapsed = 0;
}

// In update(), replace lines 100-101 with:
this.worldContainer.x = this.clampX(newX);
this.worldContainer.y = this.clampY(newY);

// Apply screen shake offset
if (this.shakeElapsed < this.shakeDuration) {
  this.shakeElapsed += dt;
  // Decay: amplitude decreases linearly over duration
  const decay = 1 - this.shakeElapsed / this.shakeDuration;
  const amp = this.shakeAmplitude * decay;
  this.worldContainer.x += (Math.random() * 2 - 1) * amp;
  this.worldContainer.y += (Math.random() * 2 - 1) * amp;
}
```

**Step 2: Verify build**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`
Expected: No type errors.

**Step 3: Commit**

```bash
git add src/systems/camera-system.ts
git commit -m "feat: add screen shake method to CameraSystem"
```

---

## Task 2: Wire Screen Shake Into Boss Charge

**Files:**
- Modify: `src/systems/boss-ai-behaviours.ts` (needs reading first to find exact integration point)
- Modify: `src/systems/boss-ai-system.ts:40-48` (pass camera ref to constructor)
- Modify: `src/core/game.ts:233` (pass camera instance to BossAISystem)

The plan: BossAISystem receives a `CameraSystem` reference. When boss enters 'charging' or transitions to Phase 2/3, call `camera.shake()`. This requires:

1. `game.ts` must create `CameraSystem` BEFORE `BossAISystem` so it can pass the reference. Currently CameraSystem is created at line 233 (after BossAISystem at line 205). **Reorder**: create CameraSystem earlier, still `addSystem()` at line 233 for priority ordering.

**Step 1: Refactor game.ts — create CameraSystem earlier**

In `loadLevel()`, create `cameraSystem` as a local variable before the system-add block. Then pass it to BossAISystem. Only ~3 lines change.

```typescript
// Line 194 area (after this.systems = []):
const cameraSystem = new CameraSystem(this.worldContainer, bounds);

// Line 205: pass cameraSystem to BossAISystem
this.addSystem(new BossAISystem(this.physicsCtx, this.worldContainer, this.soundManager, cameraSystem));

// Line 233: use the pre-created instance
this.addSystem(cameraSystem);
```

**Step 2: Update BossAISystem constructor to accept CameraSystem**

```typescript
// In boss-ai-system.ts, add import and field:
import type { CameraSystem } from './camera-system.js';

private readonly camera: CameraSystem;

// Update constructor:
constructor(
  physicsCtx: PhysicsContext,
  worldContainer: Container,
  soundManager: SoundManager,
  camera: CameraSystem,
) {
  // ...existing...
  this.camera = camera;
}

// In updatePhase(), after phase transition sound:
if (boss.phase === 1 && currentHp <= PHASE2_HP) {
  boss.phase = 2;
  this.soundManager.play('boss-phase-up');
  this.camera.shake(6, 0.5);  // Medium shake on phase-up
} else if (boss.phase === 2 && currentHp <= PHASE3_HP) {
  boss.phase = 3;
  this.soundManager.play('boss-phase-up');
  this.camera.shake(10, 0.8); // Big shake on Phase 3 enrage
}
```

**Step 3: Add shake on boss charge impact (when charge hits arena wall)**

In `boss-ai-behaviours.ts`, the `handleCharge()` function detects when boss reaches arena edge and transitions to cooldown. We need to pass camera in. The simplest approach: export a `lastChargeImpact` flag on BossComponent or use a callback. **Simpler**: have BossAISystem check if state just transitioned from 'charging' → 'cooldown' and fire shake there.

In `boss-ai-system.ts`, after the switch statement for state handlers:

```typescript
// After switch block (around line 97):
// Shake on charge wall impact (charging → cooldown transition)
if (prevState === 'charging' && boss.attackState === 'cooldown') {
  this.camera.shake(8, 0.3);
}
```

Capture `prevState` before the switch:
```typescript
const prevState = boss.attackState;
```

**Step 4: Verify build**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`
Expected: No type errors.

**Step 5: Commit**

```bash
git add src/systems/boss-ai-system.ts src/systems/boss-ai-behaviours.ts src/core/game.ts
git commit -m "feat: wire screen shake into boss charge and phase transitions"
```

---

## Task 3: Boss Health Bar Phase Indicator

**Files:**
- Modify: `src/ui/boss-health-bar.ts` (89 lines → ~115 lines)
- Modify: `src/systems/hud-system.ts` (pass boss phase to health bar update)

**Step 1: Add phase label to BossHealthBar**

Add a second Text element showing "PHASE 1", "PHASE 2", "PHASE 3" to the right of the boss name.

```typescript
// New field:
private readonly phaseLabel: Text;

// In constructor, after nameLabel setup:
const PHASE_STYLE = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 14,
  fill: 0xffaa44,
});
this.phaseLabel = new Text({ text: 'PHASE 1', style: PHASE_STYLE });
this.phaseLabel.anchor.set(0.5, 1);
this.phaseLabel.y = -6;
this.phaseLabel.x = BAR_WIDTH / 2 - 40; // Right side of bar

// Add to container:
this.container.addChild(..., this.phaseLabel);
```

**Step 2: Update the `update()` signature to accept phase**

```typescript
update(current: number, max: number, phase: 1 | 2 | 3 = 1): void {
  // ...existing bar fill code...

  // Update phase label
  this.phaseLabel.text = `PHASE ${phase}`;
  // Color by phase: white → orange → red
  if (phase === 3) this.phaseLabel.style.fill = 0xff2222;
  else if (phase === 2) this.phaseLabel.style.fill = 0xffaa44;
  else this.phaseLabel.style.fill = 0xcccccc;
}
```

**Step 3: Pass boss phase from HudSystem**

In `hud-system.ts`, find where `bossHealthBar.update(current, max)` is called and add `boss.phase`:

```typescript
this.bossHealthBar.update(health.current, health.max, boss.phase);
```

This requires reading hud-system.ts to find the exact call site.

**Step 4: Verify build**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`
Expected: No type errors.

**Step 5: Commit**

```bash
git add src/ui/boss-health-bar.ts src/systems/hud-system.ts
git commit -m "feat: add phase indicator to boss health bar"
```

---

## Task 4: Phantom Warp Particles

**Files:**
- Create: `src/effects/warp-particles.ts` (~60 lines)
- Modify: `src/systems/enemy-ai-behaviours-4.ts` (minimal — add 2 function calls, ~4 lines)

**Step 1: Create warp particle effect module**

Simple approach: spawn 6-8 small purple circles that scatter outward from the warp point and fade out. Self-cleaning via requestAnimationFrame (same pattern as float-text.ts).

```typescript
// src/effects/warp-particles.ts

import { Graphics, Container } from 'pixi.js';

const PARTICLE_COUNT = 8;
const PARTICLE_DURATION = 0.5; // seconds
const SCATTER_SPEED = 80;      // pixels per second
const PARTICLE_SIZE = 3;

/**
 * Spawn a burst of purple warp particles at the given position.
 * Self-destructs after PARTICLE_DURATION seconds.
 */
export function spawnWarpParticles(
  container: Container,
  x: number,
  y: number,
): void {
  const particles: { gfx: Graphics; vx: number; vy: number }[] = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
    const gfx = new Graphics();
    gfx.circle(0, 0, PARTICLE_SIZE);
    gfx.fill(0xcc44ff);
    gfx.x = x;
    gfx.y = y;
    container.addChild(gfx);
    particles.push({
      gfx,
      vx: Math.cos(angle) * SCATTER_SPEED,
      vy: Math.sin(angle) * SCATTER_SPEED,
    });
  }

  const startTime = performance.now();

  function animate(): void {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = elapsed / PARTICLE_DURATION;

    if (t >= 1) {
      for (const p of particles) {
        container.removeChild(p.gfx);
        p.gfx.destroy();
      }
      return;
    }

    for (const p of particles) {
      p.gfx.x += p.vx * (1 / 60); // approximate frame delta
      p.gfx.y += p.vy * (1 / 60);
      p.gfx.alpha = 1 - t;
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
```

**Step 2: Wire into phantom AI — warp-in and warp-out**

In `enemy-ai-behaviours-4.ts`, the phantom AI file is at 245 lines. We have 5 lines of headroom. We need to:
- Import `spawnWarpParticles` (1 line)
- The `updatePhantom` function receives a `worldContainer` parameter... but it doesn't currently. We need to thread it through.

**Alternative approach**: Instead of modifying the packed AI file, we can fire particles from `EnemyAISystem` which already has access to `worldContainer`. When the phantom state transitions to 'chasing' (warp-in) or 'patrolling' (warp-out), spawn particles. This keeps the AI behaviour file untouched.

In `src/systems/enemy-ai-system.ts`, after calling `updatePhantom()`, check if state changed and spawn particles. Need to read this file first.

**Step 3: Verify build**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/effects/warp-particles.ts src/systems/enemy-ai-system.ts
git commit -m "feat: add purple warp particles on phantom teleport"
```

---

## Task 5: Minion Spawn Flash Effect

**Files:**
- Create: `src/effects/spawn-flash.ts` (~45 lines)
- Modify: `src/systems/boss-phase3.ts:88-95` (call flash after spawning minions)

**Step 1: Create spawn flash effect**

A bright white circle that expands and fades at the spawn position. Same self-cleaning pattern.

```typescript
// src/effects/spawn-flash.ts

import { Graphics, Container } from 'pixi.js';

const FLASH_DURATION = 0.4;
const FLASH_MAX_RADIUS = 30;

/**
 * Spawn a white expanding circle flash at the given position.
 * Self-destructs after FLASH_DURATION seconds.
 */
export function spawnFlash(
  container: Container,
  x: number,
  y: number,
  color = 0xffffff,
): void {
  const gfx = new Graphics();
  gfx.x = x;
  gfx.y = y;
  container.addChild(gfx);

  const startTime = performance.now();

  function animate(): void {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = elapsed / FLASH_DURATION;

    if (t >= 1) {
      container.removeChild(gfx);
      gfx.destroy();
      return;
    }

    const radius = t * FLASH_MAX_RADIUS;
    gfx.clear();
    gfx.circle(0, 0, radius);
    gfx.fill({ color, alpha: 1 - t });
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
```

**Step 2: Call from boss-phase3.ts after minion spawn**

```typescript
// Add import at top:
import { spawnFlash } from '../effects/spawn-flash.js';

// After the spawn loop (around line 95), before soundManager.play:
for (let i = 0; i < WALKERS_PER_WAVE; i++) {
  const offsetX = i === 0 ? -SPAWN_OFFSET_X : SPAWN_OFFSET_X;
  createWalkerEnemy(
    world, physicsCtx, worldContainer,
    transform.x + offsetX, transform.y,
  );
  spawnFlash(worldContainer, transform.x + offsetX, transform.y);
}
```

**Step 3: Verify build**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/effects/spawn-flash.ts src/systems/boss-phase3.ts
git commit -m "feat: add spawn flash effect when boss summons minions"
```

---

## Task 6: Victory Stats Screen

**Files:**
- Create: `src/ui/victory-screen.ts` (~120 lines)
- Modify: `src/core/game.ts` (2-3 lines — intercept `returnToHubVictory()`)
- Modify: `src/systems/level-complete-system.ts` (pass stats to callback)

**Step 1: Design the victory screen**

A dark overlay with stats: level name, enemies killed, scrap earned, time elapsed. "PRESS ANY KEY" to continue to hub.

```typescript
// src/ui/victory-screen.ts

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../core/constants.js';

const TITLE_STYLE = new TextStyle({
  fontFamily: 'monospace', fontSize: 32, fill: 0x00ffcc, fontWeight: 'bold',
});
const STAT_STYLE = new TextStyle({
  fontFamily: 'monospace', fontSize: 18, fill: 0xcccccc,
});
const PROMPT_STYLE = new TextStyle({
  fontFamily: 'monospace', fontSize: 16, fill: 0x888888,
});

export interface VictoryStats {
  levelName: string;
  enemiesKilled: number;
  scrapEarned: number;
  timeSeconds: number;
}

/**
 * Full-screen victory overlay showing level stats.
 * Calls onDismiss when user presses any key.
 */
export class VictoryScreen {
  readonly container: Container;
  private readonly onDismiss: () => void;
  private readonly keyHandler: (e: KeyboardEvent) => void;

  constructor(stats: VictoryStats, onDismiss: () => void) {
    this.onDismiss = onDismiss;
    this.container = new Container();

    // Semi-transparent dark backdrop
    const bg = new Graphics();
    bg.rect(0, 0, SCREEN_WIDTH * 2, SCREEN_HEIGHT * 2);
    bg.fill({ color: 0x000000, alpha: 0.75 });
    bg.x = -SCREEN_WIDTH / 2;
    bg.y = -SCREEN_HEIGHT / 2;
    this.container.addChild(bg);

    const cx = SCREEN_WIDTH / 2;
    let y = SCREEN_HEIGHT / 2 - 100;

    // Title
    const title = new Text({ text: 'MISSION COMPLETE', style: TITLE_STYLE });
    title.anchor.set(0.5, 0.5);
    title.x = cx;
    title.y = y;
    this.container.addChild(title);
    y += 50;

    // Level name
    const level = new Text({ text: stats.levelName, style: STAT_STYLE });
    level.anchor.set(0.5, 0.5);
    level.x = cx;
    level.y = y;
    this.container.addChild(level);
    y += 40;

    // Stats
    const mins = Math.floor(stats.timeSeconds / 60);
    const secs = Math.floor(stats.timeSeconds % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    const lines = [
      `Enemies Defeated: ${stats.enemiesKilled}`,
      `Scrap Collected: ${stats.scrapEarned}`,
      `Time: ${timeStr}`,
    ];

    for (const line of lines) {
      const t = new Text({ text: line, style: STAT_STYLE });
      t.anchor.set(0.5, 0.5);
      t.x = cx;
      t.y = y;
      this.container.addChild(t);
      y += 30;
    }

    // Prompt
    y += 20;
    const prompt = new Text({ text: 'PRESS ANY KEY TO CONTINUE', style: PROMPT_STYLE });
    prompt.anchor.set(0.5, 0.5);
    prompt.x = cx;
    prompt.y = y;
    this.container.addChild(prompt);

    // Key handler (delayed slightly to avoid instant dismiss)
    this.keyHandler = () => this.dismiss();
    setTimeout(() => {
      window.addEventListener('keydown', this.keyHandler, { once: true });
    }, 500);
  }

  private dismiss(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.container.destroy({ children: true });
    this.onDismiss();
  }
}
```

**Step 2: Track stats in LevelCompleteSystem**

LevelCompleteSystem needs to track enemies killed and time elapsed, then pass to the callback.

In `level-complete-system.ts`:
- Add `enemiesKilled` counter (increment when enemies die — or count at victory time by checking total spawned vs alive)
- Simpler: count all enemy entities with `health.isDead === true` at victory trigger time
- `elapsed` already tracks time since level start
- Pass stats to `onLevelComplete` callback

Change `onLevelComplete` callback signature:
```typescript
private readonly onLevelComplete: (stats: { enemiesKilled: number; timeSeconds: number }) => void;
```

At victory trigger (line 86-88):
```typescript
const enemiesKilled = this.countDeadEnemies(world);
// ... existing code ...
// In the timer callback:
this.onLevelComplete({ enemiesKilled: this.killCount, timeSeconds: this.elapsed });
```

**Step 3: Intercept in game.ts**

In `game.ts`, `returnToHubVictory()` needs to show VictoryScreen before returning to hub. Since game.ts is at 250 lines, keep the victory screen creation minimal:

```typescript
// In returnToHubVictory, change from:
returnToHubVictory(): void {
  this.unloadLevel();
  this.showHub();
}

// To:
returnToHubVictory(stats: { enemiesKilled: number; timeSeconds: number }): void {
  // ... show victory screen, then on dismiss → unloadLevel + showHub
}
```

Since game.ts is at the limit, the cleanest approach: move the VictoryScreen creation into the callback. Replace the body of `returnToHubVictory` (3 lines → 3 lines) — show victory screen, and on dismiss call the existing cleanup.

```typescript
returnToHubVictory(stats?: { enemiesKilled: number; timeSeconds: number }): void {
  const vs = new VictoryScreen(
    { levelName: 'Level', enemiesKilled: stats?.enemiesKilled ?? 0,
      scrapEarned: this.gameState.scrap, timeSeconds: stats?.timeSeconds ?? 0 },
    () => { this.unloadLevel(); this.showHub(); },
  );
  this.app.stage.addChild(vs.container);
}
```

Need to store current level name — can capture it in `startLevel()` as a field.

**Step 4: Verify build**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/ui/victory-screen.ts src/systems/level-complete-system.ts src/core/game.ts
git commit -m "feat: add victory stats screen with enemies, scrap, and time"
```

---

## Task 7: Manual Playtest Verification

**Step 1: Start dev server**

Run: `cd "/Users/home/Documents/Vibe Coding/Noahs Game" && npm run dev`

**Step 2: Test each polish feature**

1. **Screen shake**: Play Neon Outpost, reach boss → verify shake on charge impact, phase transitions
2. **Boss phase indicator**: Watch health bar → verify "PHASE 1" → "PHASE 2" → "PHASE 3" labels appear
3. **Phantom warp particles**: Play Crystal Caverns → find phantom → verify purple particle burst on warp-in/out
4. **Minion spawn flash**: In Neon Outpost boss fight Phase 3 → verify white flash when minions appear
5. **Victory screen**: Clear Zeta Station → verify stats overlay with correct enemy count and time

**Step 3: Final commit if any fixes needed**

---

## Summary

| Task | Feature | New Files | Modified Files | ~Lines |
|------|---------|-----------|----------------|--------|
| 1 | Screen shake | — | camera-system.ts | +30 |
| 2 | Wire shake to boss | — | boss-ai-system.ts, game.ts | +15 |
| 3 | Boss phase indicator | — | boss-health-bar.ts, hud-system.ts | +25 |
| 4 | Phantom warp particles | effects/warp-particles.ts | enemy-ai-system.ts | +65 |
| 5 | Minion spawn flash | effects/spawn-flash.ts | boss-phase3.ts | +50 |
| 6 | Victory stats screen | ui/victory-screen.ts | level-complete-system.ts, game.ts | +130 |
| 7 | Playtest verification | — | — | — |
