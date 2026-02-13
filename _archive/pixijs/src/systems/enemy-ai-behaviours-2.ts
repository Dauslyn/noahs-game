/**
 * Enemy AI behaviours for Phase 2e enemies: sentry drone and crawler.
 * Separated from enemy-ai-behaviours.ts to stay under 250 lines.
 */

import type { PhysicsContext } from '../core/physics.js';
import type { TransformComponent, EnemyComponent } from '../components/index.js';
import { pixelsToMeters } from '../core/physics.js';

// ---------------------------------------------------------------------------
// Sentry Drone constants
// ---------------------------------------------------------------------------

/** Orbit radius in pixels around the spawn point. */
const SENTRY_ORBIT_RADIUS_PX = 60;

/** Orbit speed in radians per second. */
const SENTRY_ORBIT_SPEED = 2;

/** Time between dashes (seconds). */
const SENTRY_DASH_INTERVAL = 3.0;

/** Duration of the dash (seconds). */
const SENTRY_DASH_DURATION = 0.4;

/** Dash speed in m/s. */
const SENTRY_DASH_SPEED = 8;

/** Time to return to orbit after a dash (seconds). */
const SENTRY_RETURN_SPEED = 4;

// ---------------------------------------------------------------------------
// Crawler constants
// ---------------------------------------------------------------------------

/** How close (pixels) the player must be horizontally to trigger a drop. */
const CRAWLER_DROP_RANGE_X = 80;

/** Downward velocity when dropping (m/s). */
const CRAWLER_DROP_SPEED = 6;

/** Horizontal scurry speed after landing (m/s). */
const CRAWLER_SCURRY_SPEED = 3;

/** Duration of scurry before leaping back to ceiling (seconds). */
const CRAWLER_SCURRY_DURATION = 1.5;

/** Upward velocity when leaping back to ceiling (m/s). */
const CRAWLER_LEAP_SPEED = -8;

// ---------------------------------------------------------------------------
// Sentry Drone
// ---------------------------------------------------------------------------

/**
 * Sentry drone AI: orbits spawn point, periodically dashes at player.
 *
 * States:
 * - 'patrolling': orbiting spawn point, counting down to next dash
 * - 'attacking': dashing toward player's last-known position
 * - 'chasing': returning to orbit centre after a dash
 *
 * @param time - running time accumulator for orbit phase
 */
export function updateSentry(
  physicsCtx: PhysicsContext,
  enemy: EnemyComponent,
  bodyHandle: number,
  transform: TransformComponent,
  playerTransform: TransformComponent,
  inRange: boolean,
  time: number,
  dt: number,
): void {
  const body = physicsCtx.world.getRigidBody(bodyHandle);
  if (!body) return;

  if (enemy.state === 'attacking') {
    // Dash in progress — count down timer
    enemy.actionTimer -= dt;
    if (enemy.actionTimer <= 0) {
      // Dash finished, return to orbit
      enemy.state = 'chasing';
    }
    return; // Velocity was set when dash started
  }

  if (enemy.state === 'chasing') {
    // Return to orbit centre
    const originMX = pixelsToMeters(enemy.patrolOriginX);
    const originMY = pixelsToMeters(enemy.patrolOriginY);
    const pos = body.translation();
    const dx = originMX - pos.x;
    const dy = originMY - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.2) {
      // Close enough — resume orbiting
      enemy.state = 'patrolling';
      enemy.actionTimer = SENTRY_DASH_INTERVAL;
    } else {
      // Move toward origin
      body.setLinvel({
        x: (dx / dist) * SENTRY_RETURN_SPEED,
        y: (dy / dist) * SENTRY_RETURN_SPEED,
      }, true);
    }
    return;
  }

  // Patrolling: orbit around spawn point
  const orbitRadiusM = pixelsToMeters(SENTRY_ORBIT_RADIUS_PX);
  const angle = SENTRY_ORBIT_SPEED * time;

  // Target position on orbit circle (in metres)
  const originMX = pixelsToMeters(enemy.patrolOriginX);
  const originMY = pixelsToMeters(enemy.patrolOriginY);
  const targetX = originMX + Math.cos(angle) * orbitRadiusM;
  const targetY = originMY + Math.sin(angle) * orbitRadiusM;

  // Velocity = derivative of position = tangent to circle
  // v = radius * speed * (-sin(angle), cos(angle))
  const vx = -Math.sin(angle) * orbitRadiusM * SENTRY_ORBIT_SPEED;
  const vy = Math.cos(angle) * orbitRadiusM * SENTRY_ORBIT_SPEED;

  // Blend orbit velocity with correction toward target to prevent drift
  const pos = body.translation();
  const corrX = (targetX - pos.x) * 5;
  const corrY = (targetY - pos.y) * 5;

  body.setLinvel({ x: vx + corrX, y: vy + corrY }, true);

  // Count down to next dash
  enemy.actionTimer -= dt;
  if (enemy.actionTimer <= 0 && inRange) {
    // Start dash toward player
    enemy.state = 'attacking';
    enemy.actionTimer = SENTRY_DASH_DURATION;

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    body.setLinvel({
      x: (dx / dist) * SENTRY_DASH_SPEED,
      y: (dy / dist) * SENTRY_DASH_SPEED,
    }, true);
  } else if (enemy.actionTimer <= 0) {
    // Reset timer if player not in range
    enemy.actionTimer = SENTRY_DASH_INTERVAL;
  }
}

// ---------------------------------------------------------------------------
// Crawler
// ---------------------------------------------------------------------------

/**
 * Crawler AI: clings to ceiling, drops when player is below, scurries,
 * then leaps back up.
 *
 * States:
 * - 'patrolling': on ceiling, waiting for player to pass below
 * - 'attacking': dropping down
 * - 'chasing': scurrying toward player on ground
 * - 'idle': leaping back to ceiling
 */
export function updateCrawler(
  physicsCtx: PhysicsContext,
  enemy: EnemyComponent,
  bodyHandle: number,
  transform: TransformComponent,
  playerTransform: TransformComponent,
  _inRange: boolean,
  dt: number,
): void {
  const body = physicsCtx.world.getRigidBody(bodyHandle);
  if (!body) return;

  switch (enemy.state) {
    case 'patrolling': {
      // Hold position on ceiling (zero velocity, gravity disabled)
      body.setLinvel({ x: 0, y: 0 }, true);
      body.setGravityScale(0, true);

      // Check if player is directly below and close enough
      const dx = Math.abs(playerTransform.x - transform.x);
      const playerBelow = playerTransform.y > transform.y;

      if (dx < CRAWLER_DROP_RANGE_X && playerBelow) {
        enemy.state = 'attacking';
        body.setGravityScale(1, true);
        body.setLinvel({ x: 0, y: CRAWLER_DROP_SPEED }, true);
      }
      break;
    }

    case 'attacking': {
      // Dropping — check if we've landed (velocity near zero or moving up)
      const vel = body.linvel();
      // If Y velocity slowed significantly, we've hit ground
      if (vel.y < 0.5 && transform.y > enemy.patrolOriginY + 20) {
        enemy.state = 'chasing';
        enemy.actionTimer = CRAWLER_SCURRY_DURATION;
      }
      break;
    }

    case 'chasing': {
      // Scurry toward player on ground
      const dirX = playerTransform.x > transform.x ? 1 : -1;
      const currentVel = body.linvel();
      body.setLinvel({
        x: dirX * CRAWLER_SCURRY_SPEED,
        y: currentVel.y,
      }, true);

      enemy.actionTimer -= dt;
      if (enemy.actionTimer <= 0) {
        // Leap back toward ceiling
        enemy.state = 'idle';
        body.setGravityScale(0, true);
        body.setLinvel({ x: 0, y: CRAWLER_LEAP_SPEED }, true);
      }
      break;
    }

    case 'idle': {
      // Rising back to ceiling — check if close to origin Y
      const distToOrigin = Math.abs(transform.y - enemy.patrolOriginY);
      if (distToOrigin < 15 || transform.y < enemy.patrolOriginY) {
        // Back at ceiling, resume waiting
        enemy.state = 'patrolling';
        body.setLinvel({ x: 0, y: 0 }, true);

        // Snap to original Y to prevent drift
        const pos = body.translation();
        body.setTranslation({
          x: pos.x,
          y: pixelsToMeters(enemy.patrolOriginY),
        }, true);
      }
      break;
    }
  }
}
