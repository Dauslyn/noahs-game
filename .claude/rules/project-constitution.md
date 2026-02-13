---
trigger: always_on
---

# Project Rules & Best Practices (The Constitution)

IMPORTANT: You must read and follow these rules for every single task.

## 1. Core Philosophy: "Junior Engineer, Senior Standards"

- **No Placeholders**: Never leave comments like `# implementation goes here`. Write the full, working code.
- **Small Files**: No file should exceed 250 lines. If a file gets too big, refactor it into smaller, logical modules.
- **Single Responsibility**: One function should do one thing. One module should handle one concern.

## 2. Security & Stability (Zero Tolerance)

- **Secrets Management**: NEVER hardcode API keys, passwords, or tokens.
  - Bad: `var api_key = "sk-12345"`
  - Good: Load from `.env` or Godot project settings
- **Input Validation**: Always validate user input. Assume the user is trying to break the app.
- **Defensive Coding**: Check if variables exist before accessing their properties.

## 3. File Structure

- **Colocation**: Keep related files together. A scene and its script should be in the same folder.
- **Scene Organization**: scenes/ mirrors scripts/ — player/, companion/, enemies/, levels/
- **Asset Organization**: Keep assets (sprites, sounds, shaders) in `/assets` with subdirectories by type.

## 4. The Planning Protocol (Prevent Hallucinations)

- **Step-by-Step Execution**: Do not try to generate the entire game in one turn. Break complex tasks into steps:
  1. Define the types/classes
  2. Implement the game logic
  3. Add the rendering/visuals
  4. Test in editor
- **Pseudo-code First**: For complex game logic (physics, AI, shaders), write pseudo-code for approval before generating actual code.

## 5. Self-Correction & Debugging

- **Read the Error**: If a command fails, do not blindly retry. Read the error message, analyze why it failed, and explain the fix before applying it.
- **Verify Preloads**: Always double-check that the scene/resource you are preloading actually exists.

## 6. Testing

- **Test in Editor**: When you write a new system, verify it works in the Godot editor.
- **Test Edge Cases**: Don't just test the "happy path." Test boundary conditions and failure cases.

## 7. Game-Specific Standards

- **Performance**: Keep the game loop lean. Profile if frame rate drops below 60fps.
- **Use Godot's Built-ins**: Prefer TileMap, GPUParticles2D, AnimationPlayer, AudioStreamPlayer over custom solutions.
- **Shaders**: Keep shader code in separate `.gdshader` files for readability and reuse.
- **Math Comments**: Always comment non-obvious math (vector operations, isometric transforms, physics formulas).
- **Asset Loading**: Use `preload()` for small assets, `load()` or ResourceLoader for large/dynamic assets.

## 8. Art Generation Rules

- **NEVER overwrite generated art files** — always use versioned filenames (v1, v2, v3)
- **Save to project directory** — never save just to /tmp/
- **Commit good generations to git** before iterating on new versions
