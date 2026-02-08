# Noah's Game - Design Document

**Date:** 2026-02-08
**Status:** Approved
**Authors:** Noah & Dad (with Claude)

---

## 1. Game Overview

**Working Title:** Noah's Game (TBD)
**Genre:** 2D Sci-Fi Space Platformer with Roguelite Progression and Trading
**Platform:** Web browser (PC, keyboard + optional gamepad)
**Art Style:** Pixel art (16-bit) with modern shader effects (glow, bloom, particles)

**Elevator Pitch:** You're a human explorer starting on Earth with a basic mech companion. Explore an open universe of alien planets - trade with friendly aliens, fight through hostile worlds, and upgrade your mech into an unstoppable swiss army knife. The further you push into the universe, the better the rewards and the deadlier the threats. Death is not the end - your ship and mech core persist, but your loadout resets, encouraging experimentation and new strategies each run.

---

## 2. Core Loop

1. **Explore** a planet (platforming + mech utility/combat)
2. **Collect** resources, loot, alien tech, mech parts
3. **Return** to trade hubs - sell resources, buy upgrades, establish trade routes
4. **Upgrade** your mech loadout and ship
5. **Push further** into the universe to harder, more rewarding planets
6. **Hit a wall** - planet too hostile, enemies too strong
7. **Grind & prepare** - trade, upgrade, try different mech builds
8. **Return stronger** and conquer

**Death Loop:**
1. Die on planet
2. Wake up on ship (keep ship upgrades, mech core stats, synergy codex)
3. Lose mech loadout (equipped weapons, consumables, modifiers)
4. Lose 50-75% of collected resources
5. Fly to trade hub, re-equip mech
6. Try again (maybe with a different build)

---

## 3. Progression Systems

### Layer 1: Ship (Permanent, Never Lost)

The ship determines WHERE you can go in the universe.

- **Engine tier** - travel range, speed between planets
- **Fuel capacity** - how far you can go per trip
- **Hull armor** - survive harsher space environments (radiation, asteroids)
- **Navigation** - reveal more of the universe map
- **Life support** - survive extreme planet atmospheres

Upgraded through: trading resources, rare alien blueprints (found on hostile planets), spending credits.

**Ship gates access to universe zones:**
| Zone | Ship Tier Required |
|---|---|
| Inner Systems | Tier 1 (starter) |
| Mid-Range Systems | Tier 2 |
| Outer Rim | Tier 3 (warp drive) |
| Deep Space | Tier 4 |

### Layer 2: Mech Core (Permanent, Never Lost)

The mech's permanent identity - only goes up, never reset.

- **Chassis tier** - base frame, determines max slot count
- **Core stats** - base attack, base shield, base speed
- **Unlocked ability slots** - expand what the mech CAN equip
- **Learned abilities** - grapple, drill, hover, scan, etc. (permanent once learned)
- **Cosmetic upgrades** - paint jobs, visual mods

### Layer 3: Mech Loadout (Temporary, Lost on Death)

What you bolt onto the mech for a specific mission.

- **Equipped weapons** - lasers, rockets, bombs, plasma, EMP
- **Consumables** - ammo, repair kits, temporary boosts
- **Modifiers/buffs** - temporary alien tech enhancements
- **Planet-specific gear** - environmental adaptations

### Synergy System (Mech Combos)

Equipping compatible components triggers synergy discovery.

- **Discovery-driven** - no recipe list, players discover combos by experimenting
- **Two-part combos** - common, solid power boost (e.g., laser + bombs = explosive beam)
- **Three-part combos** - rare, significant power
- **Four-part combos** - legendary, one per universe region, takes many runs to discover
- **Codex** - discovered synergies logged permanently, knowledge persists through death
- **Slot efficiency** - synergized combo occupies fewer slots than individual components
- **Alien tech wildcards** - hostile planet components synergize with human tech unexpectedly

---

## 4. Universe & Planet Design

### Universe Structure

- Open map viewed from ship (top-down/strategic view)
- Zones radiate outward from Earth, gated by ship tier
- Each zone contains multiple star systems with planets to land on

### Zone Progression

| Zone | Ship Tier | Difficulty | Flavor |
|---|---|---|---|
| **Inner Systems** | Tier 1 (starter) | Easy | Human colonies, friendly aliens, tutorials, basic resources |
| **Mid-Range Systems** | Tier 2 | Medium | Mixed factions, neutral aliens, some hostile planets, better loot |
| **Outer Rim** | Tier 3 (warp drive) | Hard | Mostly hostile, rare alien tech, valuable trade goods |
| **Deep Space** | Tier 4 | Very Hard | Extreme environments, endgame enemies, legendary synergy components |

### Planet Types

| Type | Platforming Challenge | What You Find |
|---|---|---|
| **Friendly / Trade Hub** | Environmental traversal, puzzles | Shops, alien traders, intel, side quests |
| **Neutral / Wild** | Wildlife, terrain hazards, exploration | Resources, hidden caches, mech utility upgrades |
| **Hostile / Contested** | Enemies + terrain + bosses | Rare weapons, alien blueprints, ship upgrade parts |
| **Extreme / Endgame** | Everything at once | Legendary components, synergy pieces, story |

### Planet Variety

- Procedurally influenced terrain (simplex noise) so planets feel different
- Biomes: jungle, ice, volcanic, toxic, crystal, void, desert, ocean, etc.
- Biome affects hazards, enemy types, and available resources
- Friendly alien visual styles tied to their planet biome

### Trading & Economy

- Resources have different values on different planets (buy low, sell high)
- Establishing trade routes generates passive income
- Alien faction reputation unlocks better shop inventory and prices
- Rare materials only found on hostile planets (risk/reward for traders)

---

## 5. Player & Mech Gameplay

### Player Character (Human Explorer)

- **Controls:** run, jump, wall-jump, dash, crouch, climb
- Agile and nimble - movement skill matters
- No direct combat abilities - the mech handles all offense/defense
- Can interact with NPCs, shops, terminals, objects
- Unlocks traversal abilities through mech utility modules

### Mech Companion

- Follows/orbits the player during platforming
- Operates autonomously based on loadout and context
- Two primary modes:

| Mode | When | Behavior |
|---|---|---|
| **Combat** | Hostile enemies detected | Auto-fires weapons, deploys shields, targets threats |
| **Utility** | Exploration/traversal | Grapple, drill, hover, scan, environmental shield |

### Mech Loadout Slots

| Slot Type | Starting | Max | Examples |
|---|---|---|---|
| **Weapon** | 1 | 4 | Laser, rockets, bombs, plasma, EMP |
| **Defense** | 1 | 3 | Energy shield, armor plating, decoy drone |
| **Utility** | 1 | 3 | Grapple, drill, hover, scanner, translator |
| **Passive** | 0 | 2 | Auto-repair, resource magnet, XP boost |

### Combat Feel

- Player dodges, jumps, platforms through danger
- Mech fires, shields, and reacts alongside you
- Visual spectacle: laser beams, particle explosions, energy shields
- Difficulty = platforming skill + mech power level (both matter)

---

## 6. Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Renderer** | PixiJS | v8.16.0 | 2D rendering, WebGPU-ready, shader/filter system |
| **Language** | TypeScript | 5.9 | Strict mode, type safety |
| **Bundler** | Vite | 7.3.x | Fast dev server, Rolldown, WASM support |
| **Physics** | Rapier2D | v0.19.3 (WASM) | Platformer physics, collision detection |
| **Audio** | Howler.js | 2.2.4 | Sound effects, music |
| **Level Editor** | LDtk | Latest | Tilemap level design |
| **Noise/Procgen** | simplex-noise | v4.0.3 | Procedural terrain, planet variation |

### Architecture: Entity Component System (ECS)

- **Entities:** player, mech, enemies, items, projectiles, NPCs
- **Components:** position, velocity, health, sprite, weapon, AI behavior
- **Systems:** physics, rendering, combat, input, AI, particles
- Clean separation of game logic from rendering

### Art Pipeline

| Asset | Source | Tool |
|---|---|---|
| Player & mech sprites | AI-generated + asset packs | PixelLab, Aseprite |
| Enemy & alien sprites | AI-generated + asset packs | PixelLab, itch.io |
| Tilesets | Asset packs | LDtk for level assembly |
| Visual effects | Code | PixiJS filters + particle emitters |
| Backgrounds | Code | Procedural generation, parallax |
| UI | Code | PixiJS graphics + text |
| Sound effects | Synth + free packs | ZzFX, jsfxr |
| Music | Free/licensed tracks | OpenGameArt, itch.io |

### Key Visual Effects (PixiJS Filters)

- **GlowFilter** - mech energy, alien tech, lasers
- **BloomFilter** - explosions, power-ups, synergy discoveries
- **ShockwaveFilter** - impacts, boss attacks, planet landings
- **CRTFilter** - ship computer UI (optional retro feel)
- **GodrayFilter** - atmospheric planet lighting
- **ChromaticAberrationFilter** - damage feedback, warp effects

---

## 7. Build Order

### Phase 1: Playable Prototype ✅ COMPLETE (2026-02-08)
- [x] Project setup (Vite + TypeScript + PixiJS + Rapier2D)
- [x] Single planet level with platforming (run, jump, wall-jump)
- [x] Player character with basic movement and animation
- [x] Mech companion that follows the player
- [x] Mech auto-attacks with one weapon (laser)
- [x] A few enemy types that can hurt you (walker, flyer, turret)
- [x] Death and respawn
- [ ] Basic tilemap level built in LDtk *(deferred — using procedural level builder for now)*
- [x] Starfield background (procedural)
- [x] Glow/bloom shader effects on mech and lasers
- [x] Sound effects (jump, laser, hit, death) *(SoundManager ready, user needs to generate .wav files via sfxr.me)*

**Gate: Phase 1 must be fun before moving on.**
**Status:** Core prototype works. Procedural sci-fi visuals in place. LDtk integration deferred to Phase 2. Sound files not yet generated.

### Phase 2a: Visual & Audio Upgrade
- [ ] Integrate free 32x32 sprite packs (player, mech, enemies, tileset)
- [ ] Add parallax planet backgrounds
- [ ] Add sound effects (free CC0 packs)
- [ ] Asset loading screen

### Phase 2b: Multiple Planets
- [ ] Scene/state manager (menu → planet → death → planet)
- [ ] 2-3 planet levels with different biomes
- [ ] Planet selection screen

### Phase 2c: Loadout & Inventory
- [ ] Mech loadout screen (equip/swap weapons)
- [ ] Basic inventory and resource collection
- [ ] Death loop (die → ship → re-equip → retry)

### Phase 2d: Economy & NPCs
- [ ] One friendly planet with shop/trader NPC
- [ ] Buy/sell weapons and items
- [ ] Ship upgrade tier 1 → tier 2

### Phase 2e: Combat Depth
- [ ] More enemy variety per biome
- [ ] One boss fight
- [ ] Mech utility mode (grapple or drill)

### Phase 3: Depth
- [ ] Synergy/combo system
- [ ] Trading economy between planets
- [ ] Alien factions and reputation
- [ ] More mech upgrade slots and abilities
- [ ] Procedural planet variation
- [ ] Mech chassis tier upgrades
- [ ] Codex/journal for discovered synergies
- [ ] More biomes, enemies, bosses

### Phase 4: Polish & Expand
- [ ] Full universe with all four zones
- [ ] Complete synergy tree
- [ ] Music and ambient audio per biome
- [ ] Ship interior customization
- [ ] Side quests from friendly aliens
- [ ] Rare/legendary loot tables
- [ ] Gamepad support
- [ ] Save system

---

## 8. Open Questions (For Later)

- Game name?
- Story/narrative beyond "explore the universe"?
- Multiplayer/co-op potential?
- Specific boss designs?
- How many total planets?
- Endgame content after all zones are unlocked?
