/**
 * Core ECS type definitions for Noah's Game.
 *
 * Entity  – a plain numeric ID (no class overhead)
 * Component – any object with a `type` discriminant string
 * System  – update callback driven each frame by the game loop
 * Vector2 – simple 2D vector for positions, velocities, etc.
 */

// ---------------------------------------------------------------------------
// Entity
// ---------------------------------------------------------------------------

/** An entity is just a unique numeric identifier. */
export type Entity = number;

// ---------------------------------------------------------------------------
// Vector2
// ---------------------------------------------------------------------------

/** Lightweight 2D vector used throughout physics and rendering. */
export interface Vector2 {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Union of every component type string.
 * Kept in sync with the concrete component interfaces defined in
 * `src/components/`.  Adding a new component means adding its type
 * literal here AND its interface to the ComponentMap in
 * `src/components/index.ts`.
 */
export type ComponentType =
  | 'transform'
  | 'velocity'
  | 'sprite'
  | 'physicsBody'
  | 'player'
  | 'mech'
  | 'health'
  | 'weapon'
  | 'enemy'
  | 'projectile'
  | 'animationState'
  | 'boss';

/** Base shape every component must satisfy. */
export interface Component {
  readonly type: ComponentType;
}

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

/** Forward-import avoided: World is imported where Systems are used. */
import type { World } from './world.js';

/**
 * A System processes entities that own a specific set of components.
 *
 * `priority` controls execution order (lower = earlier).
 * The game loop calls `update` once per frame with the current World
 * and the delta-time in seconds.
 */
export interface System {
  /** Lower priority systems run first. */
  readonly priority: number;

  /**
   * Called once per frame.
   * @param world  - the ECS world to query / mutate
   * @param dt     - elapsed time since last frame (seconds)
   */
  update(world: World, dt: number): void;
}
