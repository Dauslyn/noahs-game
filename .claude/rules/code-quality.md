---
trigger: always_on
---

# Code Quality Standards

## Type Safety

### Every function must have explicit types

```typescript
// Good
function calculateDamage(attacker: Entity, defender: Entity): number {
  return Math.max(0, attacker.attack - defender.defense)
}

// Bad - implicit any
function calculateDamage(attacker, defender) {
  return Math.max(0, attacker.attack - defender.defense)
}
```

### Use interfaces for game entities and systems

```typescript
interface GameEntity {
  id: string
  position: Vector2
  velocity: Vector2
  health: number
}
```

## Documentation

### Every exported function needs documentation

```typescript
/**
 * Calculate damage dealt from attacker to defender
 * @param attacker - The attacking entity
 * @param defender - The defending entity
 * @returns Damage value, minimum 0
 */
export function calculateDamage(attacker: Entity, defender: Entity): number {
  // ...
}
```

### Complex game math requires inline comments

```typescript
// Apply gravity: v = v0 + g*dt (Euler integration)
entity.velocity.y += GRAVITY * deltaTime

// Normalize direction vector to unit length for consistent movement speed
const direction = vector.normalize(target.sub(position))
```

## Performance

### Game loop must stay under 16ms per frame (60fps target)

- Profile expensive operations
- Use object pooling for frequently created/destroyed objects
- Batch draw calls where possible

### Cache frequently accessed data

- Pre-compute lookup tables for expensive math
- Cache collision shapes rather than recalculating

## File Size Limits

- No file should exceed 250 lines
- Break large systems into logical modules
- Use barrel files (`index.ts`) for clean imports
