# Noah's Game

Isometric sci-fi space roguelite. Noah (astronaut explorer) + B3ANS (floating robot companion). Explore planets, fight enemies, collect scrap, upgrade gear.

**Full context in memory files** — MEMORY.md links to art-generation.md, game-design.md, ludo-api.md

## Project Rules

### Core Philosophy: "Junior Engineer, Senior Standards"
- **No Placeholders**: Never leave `# implementation goes here`. Write full, working code.
- **Small Files**: Max 250 lines. Refactor into smaller modules.
- **Single Responsibility**: One function does one thing. One module handles one concern.

### Security & Stability
- NEVER hardcode API keys, passwords, tokens. Use environment variables.
- Validate all user input defensively.
- Check if variables exist before accessing properties.

### Planning Protocol
- Break complex tasks into steps: define types → implement logic → add visuals → test
- For complex game logic (physics, AI, shaders), write pseudo-code first for approval
- If scope grows beyond what was asked, STOP and check with user

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
