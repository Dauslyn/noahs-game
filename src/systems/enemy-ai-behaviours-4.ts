/**
 * Enemy AI behaviours for the Phantom enemy.
 * Separated into its own file to stay under 250 lines.
 *
 * Phantom: teleporting ambusher that warps near the player,
 * fades in, attacks briefly, then fades out and resets.
 *
 * States (using existing EnemyState values):
 *   'idle'       -> hidden phase (invisible, frozen, counting down ~3s)
 *   'chasing'    -> warp-in shimmer (alpha 0->1 over 0.4s, standing still)
 *   'attacking'  -> visible, moving toward player at 2.5 m/s for 1.8s
 *   'patrolling' -> warp-out shimmer (alpha 1->0 over 0.3s), then teleport
 */

import type { PhysicsContext } from '../core/physics.js';
import type { TransformComponent, EnemyComponent } from '../components/index.js';
import type { SpriteComponent } from '../components/sprite.js';
import { pixelsToMeters } from '../core/physics.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Time spent invisible before warping in (seconds). */
const HIDE_DURATION = 3.0;

/** Duration of the warp-in shimmer (seconds). */
const WARP_IN_DURATION = 0.4;

/** Duration of the visible attack phase (seconds). */
const ATTACK_DURATION = 1.8;

/** Duration of the warp-out shimmer (seconds). */
const WARP_OUT_DURATION = 0.3;

/** Movement speed toward player during attack phase (m/s). */
const ATTACK_SPEED = 2.5;

/** Minimum teleport distance from player (pixels). */
const TELEPORT_MIN_DIST = 80;

/** Maximum teleport distance from player (pixels). */
const TELEPORT_MAX_DIST = 150;

// ---------------------------------------------------------------------------
// Rapier body type alias (avoids importing the full Rapier type)
// ---------------------------------------------------------------------------

type RapierBody = {
  linvel(): { x: number; y: number };
  setLinvel(v: { x: number; y: number }, w: boolean): void;
  setTranslation(v: { x: number; y: number }, w: boolean): void;
};

// ---------------------------------------------------------------------------
// Phantom AI
// ---------------------------------------------------------------------------

/**
 * Phantom AI: teleporting ambusher.
 *
 * @param physicsCtx      - shared physics context for body access
 * @param enemy           - the EnemyComponent to mutate
 * @param bodyHandle      - Rapier rigid body handle
 * @param transform       - the phantom's transform
 * @param playerTransform - the player's transform
 * @param _inRange        - unused (phantom uses its own timing logic)
 * @param dt              - frame delta time (seconds)
 * @param sprite          - optional sprite for alpha transitions
 */
export function updatePhantom(
  physicsCtx: PhysicsContext,
  enemy: EnemyComponent,
  bodyHandle: number,
  transform: TransformComponent,
  playerTransform: TransformComponent,
  _inRange: boolean,
  dt: number,
  sprite?: SpriteComponent,
): void {
  const body = physicsCtx.world.getRigidBody(bodyHandle) as RapierBody | null;
  if (!body) return;

  switch (enemy.state) {
    case 'idle':
      handleHidden(enemy, body, dt, sprite);
      break;
    case 'chasing':
      handleWarpIn(enemy, body, playerTransform, dt, sprite);
      break;
    case 'attacking':
      handleAttack(enemy, body, transform, playerTransform, dt, sprite);
      break;
    case 'patrolling':
      handleWarpOut(enemy, body, dt, sprite);
      break;
  }
}

// ---------------------------------------------------------------------------
// State handlers
// ---------------------------------------------------------------------------

/** Hidden phase: invisible, frozen, counting down before teleporting in. */
function handleHidden(
  enemy: EnemyComponent,
  body: RapierBody,
  dt: number,
  sprite?: SpriteComponent,
): void {
  // Stay still and invisible
  body.setLinvel({ x: 0, y: 0 }, true);
  if (sprite) sprite.displayObject.alpha = 0;

  enemy.actionTimer -= dt;
  if (enemy.actionTimer <= 0) {
    // Transition to warp-in
    enemy.state = 'chasing';
    enemy.actionTimer = WARP_IN_DURATION;
  }
}

/**
 * Warp-in shimmer: teleport near player, fade alpha 0 -> 1 over WARP_IN_DURATION.
 * Teleport happens once at the start of this state (actionTimer == WARP_IN_DURATION).
 */
function handleWarpIn(
  enemy: EnemyComponent,
  body: RapierBody,
  playerTransform: TransformComponent,
  dt: number,
  sprite?: SpriteComponent,
): void {
  // Teleport on first frame of warp-in
  if (enemy.actionTimer >= WARP_IN_DURATION - 0.01) {
    teleportNearPlayer(body, playerTransform);
  }

  // Hold still while fading in
  body.setLinvel({ x: 0, y: 0 }, true);

  // Fade in: alpha goes from 0 to 1 over the duration
  // progress: 0 at start -> 1 at end
  const progress = 1 - enemy.actionTimer / WARP_IN_DURATION;
  if (sprite) sprite.displayObject.alpha = Math.min(1, progress);

  enemy.actionTimer -= dt;
  if (enemy.actionTimer <= 0) {
    // Fully visible -- start attacking
    enemy.state = 'attacking';
    enemy.actionTimer = ATTACK_DURATION;
    if (sprite) sprite.displayObject.alpha = 1;
  }
}

/** Attack phase: move toward player at ATTACK_SPEED for ATTACK_DURATION. */
function handleAttack(
  enemy: EnemyComponent,
  body: RapierBody,
  transform: TransformComponent,
  playerTransform: TransformComponent,
  dt: number,
  sprite?: SpriteComponent,
): void {
  // Keep fully visible
  if (sprite) sprite.displayObject.alpha = 1;

  // Move toward player
  const dx = playerTransform.x - transform.x;
  const dy = playerTransform.y - transform.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 1) {
    // Normalise direction, convert to physics velocity (m/s)
    body.setLinvel({
      x: (dx / dist) * ATTACK_SPEED,
      y: (dy / dist) * ATTACK_SPEED,
    }, true);
  } else {
    body.setLinvel({ x: 0, y: 0 }, true);
  }

  enemy.actionTimer -= dt;
  if (enemy.actionTimer <= 0) {
    // Attack over -- start warp-out
    enemy.state = 'patrolling';
    enemy.actionTimer = WARP_OUT_DURATION;
  }
}

/** Warp-out shimmer: fade alpha 1 -> 0, then teleport to origin and go idle. */
function handleWarpOut(
  enemy: EnemyComponent,
  body: RapierBody,
  dt: number,
  sprite?: SpriteComponent,
): void {
  // Hold still while fading out
  body.setLinvel({ x: 0, y: 0 }, true);

  // Fade out: alpha goes from 1 to 0 over the duration
  const progress = enemy.actionTimer / WARP_OUT_DURATION;
  if (sprite) sprite.displayObject.alpha = Math.max(0, progress);

  enemy.actionTimer -= dt;
  if (enemy.actionTimer <= 0) {
    // Fully invisible -- teleport back to origin and reset
    body.setTranslation({
      x: pixelsToMeters(enemy.patrolOriginX),
      y: pixelsToMeters(enemy.patrolOriginY),
    }, true);

    if (sprite) sprite.displayObject.alpha = 0;

    enemy.state = 'idle';
    enemy.actionTimer = HIDE_DURATION;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Teleport the phantom to a random position near the player.
 * Picks a random angle and distance between TELEPORT_MIN_DIST and
 * TELEPORT_MAX_DIST pixels from the player.
 */
function teleportNearPlayer(
  body: RapierBody,
  playerTransform: TransformComponent,
): void {
  const angle = Math.random() * Math.PI * 2;
  const dist = TELEPORT_MIN_DIST
    + Math.random() * (TELEPORT_MAX_DIST - TELEPORT_MIN_DIST);

  const targetPxX = playerTransform.x + Math.cos(angle) * dist;
  const targetPxY = playerTransform.y + Math.sin(angle) * dist;

  // Convert pixel position to physics metres
  body.setTranslation({
    x: pixelsToMeters(targetPxX),
    y: pixelsToMeters(targetPxY),
  }, true);
}
