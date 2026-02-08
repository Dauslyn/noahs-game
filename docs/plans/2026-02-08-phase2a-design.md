# Phase 2a: Visual & Audio Upgrade — Design Document

**Date:** 2026-02-08
**Status:** Approved

---

## Goals

Replace all procedural PixiJS Graphics with real 32x32 sprite assets and add sound effects. No new game systems — same gameplay, dramatically better presentation.

---

## Sprites Needed

| Entity | Current Look | Sprite Needed |
|--------|-------------|---------------|
| Player | Procedural armored figure | Sci-fi soldier/explorer: idle, run, jump, fall animations |
| Mech | Diamond drone shape | Small expressive robot/drone: idle + firing animation |
| Walker Enemy | Alien trooper shape | Hostile alien ground unit: walk + attack |
| Flyer Enemy | Angular drone shape | Flying alien enemy: hover/fly animation |
| Turret Enemy | Gun emplacement shape | Mounted gun: idle + firing |
| Projectiles | Layered glow dots | Laser bolt / energy blast (sprite or keep as glow) |
| Platforms/Tiles | Metal panels with rivets | Sci-fi tileset: floors, walls, edges, corners |

## Backgrounds

| Context | Background |
|---------|-----------|
| Planet surface (current game) | Parallax layers: alien sky, distant terrain, atmospheric effects |
| Ship/space view (Phase 2b+) | Keep existing procedural starfield |

Need: free parallax background pack with sci-fi / alien planet theme (3-4 layers).

## Sound Effects

| Action | Sound Type |
|--------|-----------|
| Jump | Short upward synth sweep |
| Land | Soft thud/impact |
| Laser fire | Quick zap/pew |
| Enemy hit | Impact crunch |
| Player hit | Damage thud + warning tone |
| Player death | Explosion/power-down |
| Enemy death | Small explosion |
| Wall slide | Friction/scrape loop |

Source: free sci-fi sound effect pack from itch.io or OpenGameArt.

---

## Implementation Steps

### Step 1: Find & Download Assets
- Search itch.io for free 32x32 sci-fi platformer sprite packs
- Search for free robot/drone companion sprite
- Search for free parallax alien planet backgrounds
- Search for free sci-fi sound effects pack
- Organize into `assets/sprites/`, `assets/backgrounds/`, `assets/sounds/`

### Step 2: Asset Loading Infrastructure
- Set up PixiJS Assets loader with a preload manifest
- Create sprite/animation helper (spritesheet → AnimatedSprite)
- Add a loading screen so game doesn't flash blank

### Step 3: Replace Entity Visuals
- Player: swap Graphics for animated sprite (idle, run, jump, fall)
- Mech: swap Graphics for animated drone sprite
- Enemies: swap each type (walker, flyer, turret)
- Projectiles: swap or keep as glow effect
- Platforms: swap for tileset sprites

### Step 4: Add Parallax Background
- Replace starfield with parallax planet background on planet levels
- Keep starfield system code for future ship view

### Step 5: Wire Up Sounds
- Drop sound files into `assets/sounds/`
- Map to existing SoundManager calls (already wired up from Phase 1)

---

## Key Architectural Changes

- **Asset loader + loading screen** — new infrastructure, needed for all future phases
- **SpriteComponent updates** — currently stores a PixiJS Graphics reference; needs to support Sprite/AnimatedSprite too
- **Animation state** — need a way to switch between idle/run/jump animations based on player state
- **Tilemap rendering** — platforms currently drawn as single Graphics; need to render tileset sprites in a grid

## What We're NOT Doing

- No new game systems or mechanics
- No new enemies or levels
- No UI changes beyond a loading screen
- No LDtk integration yet (still hardcoded level layout)
