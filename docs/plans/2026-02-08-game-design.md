# Noah's Game - Design Document

**Date:** 2026-02-08 (Updated 2026-02-12)
**Status:** Approved — Revised for Godot + Isometric
**Authors:** Noah & Dad (with Claude)

---

## 1. Game Overview

**Working Title:** Noah's Game (TBD)
**Genre:** Isometric Sci-Fi Space Roguelite with Exploration and Trading
**Engine:** Godot 4.6 (GDScript)
**Platform:** Desktop (PC/Mac), potentially web + mobile later
**Art Style:** "Octopath Pixel" — HD pixel art with cinematic lighting, smooth gradients, bloom, atmospheric depth. NOT retro 16-bit. See `docs/art-style-bible.md` for full spec.
**Perspective:** Isometric top-down (8-directional character movement)

**Art Pipeline:** AI-generated sprites (Gemini API + Scenario AI) → chroma key processing → Godot import

**Elevator Pitch:** You're a young explorer named Noah with a scrappy homemade space suit and a floating robot companion called B3ANS. Explore an open universe of alien planets — trade with friendly aliens, fight through hostile worlds, and upgrade your gear into an unstoppable loadout. The further you push into the universe, the better the rewards and the deadlier the threats. Death is not the end — your ship and unlocks persist, but your consumables reset, encouraging experimentation and new strategies each run.

---

## 2. Core Loop

1. **Deploy** to a planet from your ship (isometric exploration + combat)
2. **Explore** — fight enemies, discover secrets, collect scrap and alien tech
3. **Survive** — clear all enemies or reach the extraction point
4. **Return** to ship — spend scrap at the shop, change loadout, upgrade
5. **Push further** — unlock new star systems with harder planets and better loot
6. **Hit a wall** — planet too hostile, enemies too strong
7. **Grind & prepare** — trade, upgrade, try different weapon builds
8. **Return stronger** and conquer

**Death Loop:**
1. Die on planet
2. Wake up on ship (keep unlocked weapons, ship tier, synergy codex)
3. Lose equipped consumables (shield charge, repair kit)
4. Lose 50% of collected scrap
5. Re-equip at loadout station, try again (maybe with a different build)

---

## 3. Progression Systems

### Layer 1: Ship (Permanent, Never Lost)

The ship determines WHERE you can go in the universe.

- **Ship Tier** — unlocks access to new star systems
- **Engine upgrade** — travel range, speed between planets
- **Navigation** — reveal more of the universe map

Upgraded through: spending scrap at the ship shop.

**Ship gates access to universe zones:**
| Zone | Ship Tier Required |
|---|---|
| Inner Systems | Tier 1 (starter) |
| Mid-Range Systems | Tier 2 |
| Outer Rim | Tier 3 |
| Deep Space | Tier 4 |

### Layer 2: Weapons (Permanent Unlocks)

Once bought, a weapon is unlocked forever. Equip one per mission.

| Weapon | Cost | Behavior |
|---|---|---|
| Laser | Free (starter) | Rapid-fire, low damage, cyan bolts |
| Rockets | 150 scrap | Slow, high damage, explosive, orange trails |
| Plasma | 120 scrap | Medium speed, piercing, purple bolts |

More weapons added as universe expands.

### Layer 3: Consumables (Lost on Death)

Single-use items bought before each mission.

| Consumable | Cost | Effect |
|---|---|---|
| Shield Charge | 40 scrap | Absorbs one hit of contact damage |
| Repair Kit | 50 scrap | Auto-heals when HP drops below 25% |

### Synergy System (Future — Phase 4+)

Equipping compatible components triggers synergy discovery.

- **Discovery-driven** — no recipe list, players discover combos by experimenting
- **Codex** — discovered synergies logged permanently, knowledge persists through death
- **Alien tech wildcards** — hostile planet components synergize with human tech unexpectedly

---

## 4. Universe & Planet Design

### Universe Structure

- Star map viewed from ship cockpit (point-and-click navigation)
- Star systems organized by tier, gated by ship upgrades
- Each system contains planets to land on

### Zone Progression

| Zone | Ship Tier | Difficulty | Flavor |
|---|---|---|---|
| **Inner Systems** | Tier 1 (starter) | Easy | Human outposts, tutorial planets, basic resources |
| **Mid-Range Systems** | Tier 2 | Medium | Mixed factions, neutral aliens, better loot |
| **Outer Rim** | Tier 3 | Hard | Mostly hostile, rare alien tech, valuable trade goods |
| **Deep Space** | Tier 4 | Very Hard | Extreme environments, endgame enemies, legendary gear |

### Planet Types

| Type | Gameplay Challenge | What You Find |
|---|---|---|
| **Friendly / Trade Hub** | Exploration, NPCs, puzzles | Shops, alien traders, intel, side quests |
| **Neutral / Wild** | Wildlife, terrain hazards | Resources, hidden caches, upgrades |
| **Hostile / Contested** | Enemies + hazards + bosses | Rare weapons, alien blueprints, ship parts |
| **Extreme / Endgame** | Everything at once | Legendary components, synergy pieces, story |

### Planet Variety

- Isometric tile-based levels with Godot's built-in tilemap system
- Biomes: jungle, ice, volcanic, toxic, crystal, void, desert, ocean, cyberpunk, sci-fi interior
- Biome affects tileset, enemy types, environmental hazards, and lighting/atmosphere
- Each planet has a unique level layout

### Current Planets (3 Playable)

1. **Zeta Station** (Easy) — Sci-fi interior, open layout, introductory enemies
2. **Crystal Caverns** (Medium) — Alien underground, vertical exploration, phantom enemies
3. **Neon Outpost** (Hard) — Cyberpunk city, large arena with Boss Warden encounter

---

## 5. Player & Companion Gameplay

### Player Character: Noah

- **Appearance:** Young explorer in a white & orange astronaut suit, compact round helmet with visor up, brown hair, brown eyes
- **Movement:** 8-directional isometric movement (WASD)
- **Actions:** Move, dash (with invincibility frames), interact with objects/NPCs
- **No direct combat** — B3ANS handles all offense
- **Can interact with:** NPCs, shops, terminals, objects, stations on the ship

### Mech Companion: B3ANS

- Floating orb robot with big expressive screen-eyes, cyan glow
- Follows/orbits Noah during exploration
- **Operates autonomously** based on equipped weapon
- Auto-fires at nearest enemy when in range
- Visual personality: homemade but advanced, retractable utility arms

### Combat Feel (Isometric)

- Noah dodges and dashes through danger in 8 directions
- B3ANS auto-targets and fires in the direction of nearest threat
- Projectiles travel in isometric space
- Visual spectacle: colored projectile trails, particle explosions, screen shake
- Difficulty = movement skill (dodging) + loadout power (weapon choice + consumables)

---

## 6. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Engine** | Godot 4.6 | Full game engine with built-in physics, tilemaps, animation, particles, audio, UI |
| **Language** | GDScript | Python-like scripting, native to Godot |
| **Art Generation** | Gemini API | Character sprites, environment art, props |
| **Art Rotation** | Scenario AI | 8-direction sprite sheets from single reference |
| **Art Processing** | Python (art_pipeline.py) | Chroma key removal, trim, slice, mirror |
| **Tilemap** | Godot TileMap (isometric) | Level layout with isometric tile rendering |
| **Audio** | Godot AudioStreamPlayer | Sound effects and music |
| **Particles** | Godot GPUParticles2D | Visual effects (projectile trails, explosions, ambient) |

### Architecture

- **Scene-based:** Godot scenes for player, companion, enemies, levels, UI
- **Autoload singletons:** GameState (scrap, weapons, unlocks), SpriteLoader
- **Signal-driven:** Godot signals for decoupled game events
- **Isometric rendering:** Godot's built-in isometric tilemap mode with Y-sort

### Art Pipeline

| Asset | Source | Tool |
|---|---|---|
| Character sprites (8-dir) | AI-generated | Gemini API → Scenario 8-Direction workflow |
| Enemy sprites (8-dir) | AI-generated | Gemini API → Scenario 8-Direction workflow |
| Walk/run animations | AI-generated | Gemini API (frame sheets) |
| Tilesets | AI-generated | Gemini API → Godot TileMap import |
| Props & decorations | AI-generated | Gemini API |
| Visual effects | Code | Godot GPUParticles2D + shaders |
| Backgrounds | AI-generated + code | Gemini API + Godot parallax layers |
| UI | Code | Godot Control nodes |
| Sound effects | Free CC0 packs | Kenney Digital SFX |

---

## 7. Build Order

### Phase 1: Foundation (Godot Setup) — IN PROGRESS
- [x] Godot project setup (4.6, GDScript, isometric viewport)
- [x] Player movement (8-directional isometric)
- [x] B3ANS companion (follow + auto-fire)
- [x] Basic enemy (walker)
- [x] Test room level
- [x] GameState autoload (scrap, weapons, consumables)
- [x] Art pipeline (Gemini API + chroma key processing)
- [x] Art style bible and generation workflow
- [ ] Integrate approved Noah astronaut sprites (8-direction idle)
- [ ] Integrate Noah walk cycle animations
- [ ] Proper isometric tilemap for test room
- [ ] B3ANS sprites
- [ ] Enemy sprites (walker)
- [ ] Sound effects integration
- [ ] HUD (health, scrap counter)

### Phase 2: Core Game Loop
- [ ] Ship interior scene (walkable room with stations)
- [ ] Loadout station (weapon selection)
- [ ] Shop station (buy weapons, consumables)
- [ ] Star map scene (planet selection)
- [ ] Scene transitions (ship → star map → planet → ship)
- [ ] 3 planet levels with unique tilesets and biomes
- [ ] Death/respawn loop (die → ship → re-equip)
- [ ] Victory condition per level (clear all enemies)
- [ ] Scrap collection from defeated enemies

### Phase 3: Combat Depth
- [ ] Multiple enemy types (walker, flyer, turret, crawler, shielder, phantom)
- [ ] Boss encounter (Warden — 3 phases)
- [ ] 3 weapon types with unique projectile behavior
- [ ] Consumable effects (shield charge, repair kit)
- [ ] Screen shake, particles, visual polish
- [ ] Boss health bar and phase indicators

### Phase 4: Economy & Progression
- [ ] Ship tier upgrades (unlock new star systems)
- [ ] Weapon unlock persistence
- [ ] Economy balancing (scrap rewards, shop prices)
- [ ] Planet tier gating
- [ ] Death penalty (lose 50% scrap, lose consumables)

### Phase 5: Content & Polish
- [ ] More planets and biomes
- [ ] More enemy types per biome
- [ ] More weapons
- [ ] Synergy/combo system
- [ ] NPC interactions on friendly planets
- [ ] Ambient audio per biome
- [ ] Save system
- [ ] Gamepad support

---

## 8. Characters

### Noah (Player)
- 12-year-old explorer, messy brown hair, big brown eyes
- White & orange astronaut suit — slim, lightweight, clean design
- Compact round helmet with visor up (face visible)
- Orange stripe on helmet, orange accent panels on suit
- Utility belt, chunky boots, gloves
- **Canonical sprite:** `assets/characters/noah/_raw/noah-astro-idle-s-v8.png`

### B3ANS (Companion)
- Floating orb robot, big expressive screen-eyes
- Homemade but advanced — cobbled together with love
- Cyan glow, retractable utility arms
- Personality: loyal, enthusiastic, slightly glitchy

### Ship Interior
- Warm, cozy, messy-but-loved
- Kid's bedroom + workshop + camper van in space
- Stations: loadout, shop, cockpit (star map)

---

## 9. Open Questions (For Later)

- Game name?
- Story/narrative beyond "explore the universe"?
- Multiplayer/co-op potential?
- How many total planets at launch?
- Endgame content after all zones are unlocked?
- Mobile/web export?
