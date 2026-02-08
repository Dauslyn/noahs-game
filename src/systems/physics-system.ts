/**
 * PhysicsSystem – steps the Rapier2D simulation with a fixed timestep
 * and syncs rigid-body positions back to ECS TransformComponents.
 *
 * Priority 0: runs before all other systems so that transforms are
 * up-to-date when rendering / gameplay systems read them.
 *
 * Fixed-timestep loop:
 *   1. Accumulate the variable frame dt into an accumulator.
 *   2. While the accumulator holds at least one PHYSICS_TIMESTEP,
 *      step the world and subtract.
 *   3. After stepping, iterate all entities with ['transform', 'physicsBody']
 *      and copy the Rapier body position (metres) -> TransformComponent
 *      (pixels), plus rotation (radians).
 */

import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import { PHYSICS_TIMESTEP } from '../core/constants.js';
import { PhysicsContext, metersToPixels } from '../core/physics.js';

export class PhysicsSystem implements System {
  /** Lowest priority – runs first in the system pipeline. */
  readonly priority = 0;

  /** Reference to the shared PhysicsContext (Rapier world + helpers). */
  private readonly physics: PhysicsContext;

  constructor(physicsContext: PhysicsContext) {
    this.physics = physicsContext;
  }

  /**
   * Called once per frame by the game loop.
   *
   * @param world - the ECS world to query / mutate
   * @param dt    - elapsed time since last frame (seconds, variable)
   */
  update(world: World, dt: number): void {
    this.stepPhysics(dt);
    this.syncBodiesToTransforms(world);
  }

  // -----------------------------------------------------------------------
  // Fixed timestep accumulator
  // -----------------------------------------------------------------------

  /**
   * Accumulate dt and step the Rapier world in fixed increments.
   *
   * Capping the accumulator at 10x the timestep prevents a "spiral of
   * death" if the game stalls for a long frame (e.g. during tab switch).
   */
  private stepPhysics(dt: number): void {
    const maxAccumulator = PHYSICS_TIMESTEP * 10;

    this.physics.accumulator += dt;

    // Clamp to prevent runaway catch-up
    if (this.physics.accumulator > maxAccumulator) {
      this.physics.accumulator = maxAccumulator;
    }

    while (this.physics.accumulator >= PHYSICS_TIMESTEP) {
      this.physics.world.step();
      this.physics.accumulator -= PHYSICS_TIMESTEP;
    }
  }

  // -----------------------------------------------------------------------
  // Position sync: Rapier -> ECS
  // -----------------------------------------------------------------------

  /**
   * For every entity with both a TransformComponent and a PhysicsBodyComponent,
   * read the Rapier body position (metres) and rotation (radians) and write
   * the converted values into the TransformComponent (pixels).
   */
  private syncBodiesToTransforms(world: World): void {
    const entities = world.query('transform', 'physicsBody');

    for (const entity of entities) {
      const transform = world.getComponent(entity, 'transform');
      const physicsBody = world.getComponent(entity, 'physicsBody');

      if (!transform || !physicsBody) continue;

      const body = this.physics.world.getRigidBody(physicsBody.bodyHandle);
      if (!body) continue;

      // translation() returns { x, y } in metres; convert to pixels
      const pos = body.translation();
      transform.x = metersToPixels(pos.x);
      transform.y = metersToPixels(pos.y);

      // rotation() returns radians (number in 2D Rapier)
      transform.rotation = body.rotation();
    }
  }
}
