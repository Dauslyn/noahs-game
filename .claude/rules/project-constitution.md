---
trigger: always_on
---

# Project Rules & Best Practices (The Constitution)

IMPORTANT: You must read and follow these rules for every single task.

## 1. Core Philosophy: "Junior Engineer, Senior Standards"

- **No Placeholders**: Never leave comments like `// implementation goes here`. Write the full, working code.
- **Small Files**: No file should exceed 250 lines. If a file gets too big, refactor it into smaller, logical modules.
- **Single Responsibility**: One function should do one thing. One module should handle one concern.

## 2. Security & Stability (Zero Tolerance)

- **Secrets Management**: NEVER hardcode API keys, passwords, or tokens.
  - Bad: `apiKey = "sk-12345"`
  - Good: `apiKey = process.env.API_KEY`
- **Input Validation**: Always validate user input. Assume the user is trying to break the app.
- **Defensive Coding**: Check if variables exist before accessing their properties.

## 3. File Structure

- **Colocation**: Keep related files together. A game system, its types, and its tests should be in the same folder.
- **Barrel Files**: Use `index.ts` to export modules cleanly.
- **Asset Organization**: Keep assets (sprites, sounds, shaders) in a dedicated `/assets` directory with subdirectories by type.

## 4. The Planning Protocol (Prevent Hallucinations)

- **Step-by-Step Execution**: Do not try to generate the entire game in one turn. Break complex tasks into steps:
  1. Define the types/interfaces
  2. Implement the game logic
  3. Add the rendering/visuals
  4. Write the test
- **Pseudo-code First**: For complex game logic (physics, AI, shaders), write pseudo-code for approval before generating actual code.

## 5. Self-Correction & Debugging

- **Read the Error**: If a command fails, do not blindly retry. Read the error message, analyze why it failed, and explain the fix before applying it.
- **Verify Imports**: Always double-check that the file you are importing actually exists.

## 6. Testing

- **Write Tests Immediately**: When you write a new game system, write a unit test for it in the same turn.
- **Test Edge Cases**: Don't just test the "happy path." Test boundary conditions and failure cases.

## 7. Game-Specific Standards

- **Performance**: Keep the game loop lean. Profile if frame rate drops below 60fps.
- **Separation of Concerns**: Game logic (ECS, state) separate from rendering.
- **Shaders**: Keep shader code in separate files for readability and reuse.
- **Math Comments**: Always comment non-obvious math (vector operations, physics formulas, matrix transforms).
- **Asset Loading**: Use preloading patterns so the game doesn't stutter during play.
