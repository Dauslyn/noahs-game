/**
 * PhysicsContext – owns the Rapier2D world and provides coordinate helpers.
 *
 * Rapier operates in SI metres; the renderer uses pixels.
 * All conversion between the two systems goes through the helpers exported
 * from this module.
 *
 * Usage:
 *   const ctx = await PhysicsContext.create();
 *   // ... later in the game loop
 *   physicsSystem.update(world, dt);
 */

import RAPIER from '@dimforge/rapier2d-compat';
import { GRAVITY, PIXELS_PER_METER } from './constants.js';
import type { Entity } from './types.js';

// ---------------------------------------------------------------------------
// Coordinate conversion helpers
// ---------------------------------------------------------------------------

/**
 * Convert a pixel measurement to metres.
 * @param px - value in pixels
 * @returns value in metres
 */
export function pixelsToMeters(px: number): number {
  return px / PIXELS_PER_METER;
}

/**
 * Convert a metre measurement to pixels.
 * @param m - value in metres
 * @returns value in pixels
 */
export function metersToPixels(m: number): number {
  return m * PIXELS_PER_METER;
}

/**
 * Convert screen-space pixel coordinates to physics-space metres.
 * @param screenX - horizontal position in pixels
 * @param screenY - vertical position in pixels
 * @returns position in metres { x, y }
 */
export function toPhysicsPos(
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  return {
    x: pixelsToMeters(screenX),
    y: pixelsToMeters(screenY),
  };
}

/**
 * Convert physics-space metre coordinates to screen-space pixels.
 * @param physX - horizontal position in metres
 * @param physY - vertical position in metres
 * @returns position in pixels { x, y }
 */
export function toScreenPos(
  physX: number,
  physY: number,
): { x: number; y: number } {
  return {
    x: metersToPixels(physX),
    y: metersToPixels(physY),
  };
}

// ---------------------------------------------------------------------------
// PhysicsContext
// ---------------------------------------------------------------------------

/**
 * Central container for the Rapier2D physics simulation.
 *
 * Created asynchronously via `PhysicsContext.create()` because Rapier's
 * WASM module must be initialised before any API calls.
 */
export class PhysicsContext {
  /** The initialised Rapier module reference (needed for body/collider descs). */
  readonly rapier: typeof RAPIER;

  /** The Rapier physics world. Gravity defaults to Y-down at 9.81 m/s^2. */
  readonly world: RAPIER.World;

  /** Fixed-timestep accumulator (seconds). Fed by the game loop's variable dt. */
  accumulator: number;

  /**
   * Maps Rapier collider handles to ECS entity IDs.
   * Used for collision callbacks / queries that return collider handles.
   */
  readonly colliderToEntity: Map<number, Entity>;

  // -----------------------------------------------------------------------
  // Private constructor – use PhysicsContext.create()
  // -----------------------------------------------------------------------

  private constructor(rapier: typeof RAPIER, world: RAPIER.World) {
    this.rapier = rapier;
    this.world = world;
    this.accumulator = 0;
    this.colliderToEntity = new Map<number, Entity>();
  }

  /**
   * Drop the current Rapier world and create a fresh one.
   * WASM stays initialised — only the simulation state resets.
   *
   * @returns a new PhysicsContext sharing the same RAPIER module
   */
  static resetWorld(existing: PhysicsContext): PhysicsContext {
    existing.world.free();
    const world = new RAPIER.World({ x: 0.0, y: GRAVITY });
    return new PhysicsContext(existing.rapier, world);
  }

  // -----------------------------------------------------------------------
  // Factory
  // -----------------------------------------------------------------------

  /**
   * Initialise Rapier WASM and create a new PhysicsContext.
   *
   * Must be awaited before any physics operations.
   *
   * @returns a fully-initialised PhysicsContext
   */
  static async create(): Promise<PhysicsContext> {
    await RAPIER.init();

    // Y-down gravity matching the screen coordinate system
    const world = new RAPIER.World({ x: 0.0, y: GRAVITY });

    return new PhysicsContext(RAPIER, world);
  }
}
