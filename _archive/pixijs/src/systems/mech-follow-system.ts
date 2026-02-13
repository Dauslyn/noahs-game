/**
 * MechFollowSystem – controls the mech companion's movement around
 * the player: orbiting when idle, trailing behind when moving.
 *
 * Priority 20: runs after PlayerMovementSystem (10) so the player's
 * position and state are up-to-date when the mech tracks them.
 */

import type { System } from '../core/types.js';
import type { World } from '../core/world.js';

/** How quickly the mech lerps toward its target (higher = snappier). */
const LERP_SPEED = 8;

/** Horizontal offset behind the player when following (pixels). */
const FOLLOW_OFFSET_X = 30;

/** Vertical offset above the player when following (pixels). */
const FOLLOW_OFFSET_Y = -20;

export class MechFollowSystem implements System {
  readonly priority = 20;

  /**
   * Each frame, move every mech toward its target position relative
   * to its owner (player).
   *
   * @param world - the ECS world to query / mutate
   * @param dt    - elapsed time since last frame (seconds)
   */
  update(world: World, dt: number): void {
    const mechs = world.query('mech', 'transform');

    for (const entity of mechs) {
      const mech = world.getComponent(entity, 'mech');
      const mechTransform = world.getComponent(entity, 'transform');
      if (!mech || !mechTransform) continue;

      // Get owner (player) transform and player component
      const ownerTransform = world.getComponent(mech.ownerEntity, 'transform');
      const ownerPlayer = world.getComponent(mech.ownerEntity, 'player');
      if (!ownerTransform) continue;

      // Determine if the player is moving based on their state
      const isMoving =
        ownerPlayer !== undefined &&
        (ownerPlayer.state === 'running' ||
          ownerPlayer.state === 'jumping' ||
          ownerPlayer.state === 'falling' ||
          ownerPlayer.state === 'wallSliding');

      let targetX: number;
      let targetY: number;

      if (isMoving && ownerPlayer) {
        // Follow behavior: trail behind the player
        // Position opposite to facing direction + slightly above
        targetX =
          ownerTransform.x + -ownerPlayer.facingDirection * FOLLOW_OFFSET_X;
        targetY = ownerTransform.y + FOLLOW_OFFSET_Y;
      } else {
        // Orbit behavior: elliptical path around the player
        // Increment orbit angle
        mech.orbitAngle += mech.orbitSpeed * dt;

        // Elliptical orbit: full radius horizontally, half vertically
        targetX =
          ownerTransform.x + Math.cos(mech.orbitAngle) * mech.orbitRadius;
        targetY =
          ownerTransform.y +
          Math.sin(mech.orbitAngle) * mech.orbitRadius * 0.5;
      }

      // Lerp mech position toward the target for smooth movement
      const lerpFactor = LERP_SPEED * dt;
      mechTransform.x += (targetX - mechTransform.x) * lerpFactor;
      mechTransform.y += (targetY - mechTransform.y) * lerpFactor;

      // Flip the mech horizontally while preserving scale magnitude
      if (ownerPlayer) {
        const mag = Math.abs(mechTransform.scaleX) || 1;
        mechTransform.scaleX = ownerPlayer.facingDirection * mag;
      }
    }
  }
}
