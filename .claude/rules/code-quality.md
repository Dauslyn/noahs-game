---
trigger: always_on
---

# Code Quality Standards

## Type Safety (GDScript)

### Every function must have explicit type hints

```gdscript
# Good
func calculate_damage(attacker: Entity, defender: Entity) -> int:
    return maxi(0, attacker.attack - defender.defense)

# Bad - no type hints
func calculate_damage(attacker, defender):
    return max(0, attacker.attack - defender.defense)
```

### Use classes and typed variables for game entities

```gdscript
class_name GameEntity
extends Node2D

var health: int = 100
var velocity: Vector2 = Vector2.ZERO
var damage: int = 10
```

## Documentation

### Every public function needs documentation

```gdscript
## Calculate damage dealt from attacker to defender.
## Returns damage value, minimum 0.
func calculate_damage(attacker: Entity, defender: Entity) -> int:
    return maxi(0, attacker.attack - defender.defense)
```

### Complex game math requires inline comments

```gdscript
# Apply gravity: v = v0 + g*dt (Euler integration)
velocity.y += GRAVITY * delta

# Normalize direction vector to unit length for consistent movement speed
var direction := (target - position).normalized()
```

## Performance

### Game loop must stay under 16ms per frame (60fps target)

- Profile expensive operations
- Use object pooling for frequently created/destroyed objects
- Use Godot's built-in systems (TileMap, GPUParticles2D) over manual alternatives

### Cache frequently accessed data

- Pre-compute lookup tables for expensive math
- Cache collision shapes rather than recalculating

## File Size Limits

- No file should exceed 250 lines
- Break large systems into logical modules
- Keep scenes focused (one scene = one entity/system)
