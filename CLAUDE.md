# Noah's Game

## Project Overview
An isometric sci-fi space roguelite with exploration and trading, built by Noah and his dad through vibe coding. You play as Noah, a young explorer in a scrappy astronaut suit, with a floating robot companion called B3ANS. Explore alien planets, fight enemies, collect scrap, and upgrade your gear.

Full design document: `docs/plans/2026-02-08-game-design.md`

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Engine | Godot 4.6 | Full game engine (physics, tilemaps, animation, particles, audio, UI) |
| Language | GDScript | Python-like scripting, native to Godot |
| Art Generation | Gemini API | Initial canonical sprite generation (1024×1024) |
| Art Poses & Animation | Ludo.ai (MCP) | Directional poses, walk cycles, attack animations |
| Art Processing | Python (art_pipeline.py) | Chroma key removal, trim, slice, mirror |
| Audio | Godot AudioStreamPlayer | Sound effects and music |

## Project Structure

```
noahs-game-godot/           ← ACTIVE GAME PROJECT (Godot)
├── scenes/                  ← Godot scene files (.tscn)
│   ├── player/player.tscn
│   ├── companion/beans.tscn, projectile.tscn
│   ├── enemies/walker_enemy.tscn
│   └── levels/test_room.tscn
├── scripts/                 ← GDScript files (.gd)
│   ├── autoload/game_state.gd, sprite_loader.gd
│   ├── player/player.gd, player_effects.gd
│   ├── companion/beans.gd, projectile.gd
│   ├── enemies/walker_enemy.gd
│   └── levels/test_room.gd, room_builder.gd, hud_updater.gd
├── assets/                  ← Game assets
│   ├── characters/{noah,beans,npcs}/  ← Character sprites
│   ├── enemies/{walker,phantom,warden}/ ← Enemy sprites
│   ├── tilesets/            ← Isometric tile art
│   ├── effects/             ← VFX sprites
│   ├── ui/                  ← HUD and menu art
│   ├── environments/        ← Parallax backgrounds, props
│   └── sounds/              ← Audio files (Kenney CC0)
├── tools/                   ← Art pipeline scripts
│   └── art_pipeline.py      ← Chroma key, trim, slice, mirror
├── docs/                    ← Art style bible
└── .env                     ← API keys (gitignored)

_archive/pixijs/             ← ARCHIVED PixiJS prototype (reference only)
docs/plans/                  ← Game design docs & phase plans
```

## Architecture (Godot)

- **Scene-based**: Godot scenes for player, companion, enemies, levels, UI
- **Autoload singletons**: GameState (scrap, weapons, unlocks), SpriteLoader
- **Signal-driven**: Godot signals for decoupled game events
- **Isometric rendering**: Godot's built-in isometric tilemap mode with Y-sort
- **8-directional movement**: WASD input mapped to isometric directions

## Current Phase

**Phase 1: Foundation (Godot Setup) — IN PROGRESS**
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

See `docs/plans/2026-02-08-game-design.md` for full roadmap.

## Art Pipeline

### Generation Workflow
1. **Gemini API** generates front-facing canonical sprite (1024×1024, magenta #FF00FF bg)
2. **Ludo.ai MCP** generates directional poses (`generatePose`) and animations (`animateSprite`)
3. **art_pipeline.py** processes: chroma key → trim → slice → mirror

### Art Style: "Octopath Pixel"
- HD pixel art with cinematic lighting, smooth gradients, bloom, atmospheric depth
- NOT retro 16-bit, NOT flat shading
- **CRITICAL PROMPT RULE**: Always include "NOT chunky retro 16-bit pixels, smooth color gradients, anti-aliased edges"
- Generate at 1024×1024, use high-res in Godot
- See `noahs-game-godot/docs/art-style-bible.md` for full spec

### Art Generation Safety Rules
- **NEVER overwrite generated art files** — use versioned filenames (v1, v2, v3)
- **Commit good generations to git BEFORE iterating**
- **Save immediately** to project directory, NEVER just to /tmp/

### Character Consistency Rules
- Generate south-facing idle FIRST → get approval → use as reference for all directions
- **Ludo.ai MCP** for all poses and animations — `generatePose` + `animateSprite`
- Pipeline: canonical → Ludo Change Pose (5 directions: S, SW, W, NW, N) → mirror 3 → animate each
- Noah canonical idle: `assets/characters/noah/_raw/noah-astro-idle-s-v8.png`

### Character Descriptions
- **Noah**: Brown hair/eyes, WHITE & ORANGE astronaut suit, compact round helmet with visor up, utility belt, chunky boots
- **B3ANS**: Floating orb robot, big expressive screen-eyes, homemade but advanced, cyan glow, retractable utility arms
- **Ship interior**: Warm, cozy, messy-but-loved. Kid's bedroom + workshop + camper van in space

### API Keys
- Stored in `noahs-game-godot/.env` (gitignored)
- `GEMINI_API_KEY` — Google Gemini API
- `LUDO_API_KEY` — Ludo.ai (Pro plan, MCP at `https://mcp.ludo.ai/mcp`)

## Project Rules

### Core Philosophy: "Junior Engineer, Senior Standards"
- **No Placeholders**: Never leave comments like `# implementation goes here`. Write the full, working code.
- **Small Files**: No file should exceed 250 lines. Refactor into smaller modules.
- **Single Responsibility**: One function does one thing. One module handles one concern.

### Security & Stability
- NEVER hardcode API keys, passwords, or tokens. Use environment variables.
- Validate all user input defensively.
- Check if variables exist before accessing their properties.

### Planning Protocol
- Break complex tasks into steps: define types → implement logic → add visuals → test
- For complex game logic (physics, AI, shaders), write pseudo-code first for approval
- If scope grows beyond what was asked, STOP and check with the user

### Code Quality (GDScript)
- Type hints on all functions (`func foo(bar: int) -> String:`)
- Max 250 lines per file
- Verify imports/preloads are valid before using them
- Use static typing where possible

### Error Handling
- READ the full error message before attempting fixes
- IDENTIFY root cause, not just symptoms
- Max 3 retries before asking the user
- Don't retry failed commands blindly

### Efficiency
- Make parallel tool calls when operations are independent
- Check if files exist before creating
- Reuse existing patterns and components
- If stuck in a loop (3+ retries), STOP and report

### Verification
- Never mark a task "Done" until verified working
- Test in Godot editor after changes
- Test edge cases, not just the happy path

### Game-Specific Rules
- Keep game loop performant — profile if frame rate drops
- Separate game logic from rendering where appropriate
- Use Godot's built-in systems (tilemap, particles, audio) over custom solutions
- Comment complex math (vectors, isometric transforms, physics formulas)
- Use asset preloading patterns so the game doesn't stutter during play
