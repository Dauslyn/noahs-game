# Noah's Game

## Project Overview
A 2D sci-fi space platformer with roguelite progression, built by Noah and his dad through vibe coding. You play as a human explorer with a mech companion, exploring an open universe of alien planets.

Full design document: `docs/plans/2026-02-08-game-design.md`

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Renderer | PixiJS | v8.16.0 |
| Language | TypeScript | 5.9 (strict mode) |
| Bundler | Vite | 7.3.x |
| Physics | Rapier2D (WASM) | v0.19.3 |
| Audio | Howler.js | 2.2.4 |
| Level Editor | LDtk | Latest |
| Procgen | simplex-noise | v4.0.3 |

## Architecture
- Entity Component System (ECS) pattern
- Game logic separated from rendering
- Shaders in separate files
- Max 250 lines per file
- Assets in `/assets` directory with subdirectories by type

## Current Phase
**Phase 1: COMPLETE** - Playable prototype with ECS, physics, combat, enemies, death/respawn, effects, HUD.
**Next: Phase 2: Core Loop** - Ship view, multiple planets, mech loadout, inventory, trading, death loop.

See `docs/plans/2026-02-08-game-design.md` for full roadmap, `docs/plans/2026-02-08-phase1-completion.md` for what was built.

## Architecture Details
- 13 systems running in priority order (lower = first): Starfield(-10) → Physics(0) → EnemyAI(15) → PlayerMovement(16) → ... → Render(100)
- 47 TypeScript source files across core, components, systems, entities, input, level, audio, ui
- All visuals are procedural PixiJS Graphics (no sprite assets yet)
- EntityManager handles deferred entity destruction (prevents mid-iteration issues)
- `inputManager.update()` MUST be called AFTER systems loop in game.ts (clears per-frame input state)

## Project Rules

### Core Philosophy: "Junior Engineer, Senior Standards"
- **No Placeholders**: Never leave comments like `// implementation goes here`. Write the full, working code.
- **Small Files**: No file should exceed 250 lines. Refactor into smaller modules.
- **Single Responsibility**: One function does one thing. One module handles one concern.

### Security & Stability
- NEVER hardcode API keys, passwords, or tokens. Use environment variables.
- Validate all user input defensively.
- Check if variables exist before accessing their properties.

### Planning Protocol
- Break complex tasks into steps: define types -> implement logic -> add visuals -> test
- For complex game logic (physics, AI, shaders), write pseudo-code first for approval
- If scope grows beyond what was asked, STOP and check with the user

### Code Quality
- TypeScript strict mode (once stack is chosen)
- Type hints on all functions
- Max 250 lines per file
- Verify imports are valid before using them

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
- Test in browser after UI changes
- Test edge cases, not just the happy path

### Game-Specific Rules
- Keep game loop performant - profile if frame rate drops
- Separate game logic from rendering
- Use asset loading/preloading patterns
- Keep shaders in separate files for readability
- Comment complex math (vectors, matrices, physics formulas)
