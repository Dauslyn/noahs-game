/**
 * PlayerMovementSystem -- ground/wall detection, movement, jumping,
 * wall-sliding, and player state updates.
 *
 * Priority 10: runs after PhysicsSystem (0), before camera (90).
 * Uses Rapier ray casts for ground/wall sensing and sets rigid-body
 * velocity directly for a responsive platformer feel.
 */

import RAPIER from '@dimforge/rapier2d-compat';
import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { InputManager } from '../input/input-manager.js';
import { Action, isActionDown, isActionJustPressed } from '../input/actions.js';
import {
  PLAYER_SPEED, PLAYER_JUMP_IMPULSE,
  WALL_JUMP_IMPULSE_X, WALL_JUMP_IMPULSE_Y, WALL_SLIDE_SPEED,
} from '../core/constants.js';
import type { PlayerComponent, AnimationStateComponent } from '../components/index.js';
import type { SoundManager } from '../audio/sound-manager.js';

// Capsule geometry (metres) -- must match create-player.ts
const CAPSULE_HALF_HEIGHT = 0.4;
const CAPSULE_RADIUS = 0.25;

// Ray-cast reach beyond the capsule surface (metres)
const GROUND_RAY_LENGTH = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS + 0.15;
const WALL_RAY_LENGTH = CAPSULE_RADIUS + 0.15;

/** Reduced horizontal authority while airborne. */
const AIR_CONTROL = 0.7;

export class PlayerMovementSystem implements System {
  readonly priority = 10;

  private readonly physics: PhysicsContext;
  private readonly input: InputManager;
  private readonly soundManager: SoundManager;

  constructor(physicsCtx: PhysicsContext, inputManager: InputManager, soundManager: SoundManager) {
    this.physics = physicsCtx;
    this.input = inputManager;
    this.soundManager = soundManager;
  }

  update(world: World, _dt: number): void {
    const entities = world.query('player', 'physicsBody');

    for (const entity of entities) {
      const player = world.getComponent(entity, 'player');
      const pb = world.getComponent(entity, 'physicsBody');
      if (!player || !pb) continue;

      const body = this.physics.world.getRigidBody(pb.bodyHandle);
      if (!body) continue;

      const selfCollider = this.getEntityCollider(entity);

      this.detectGround(body, player, selfCollider);
      this.detectWalls(body, player, selfCollider);
      this.applyHorizontalMovement(body, player);
      this.applyJump(body, player);
      this.applyWallSlide(body, player);
      this.updateState(body, player);
      this.syncAnimationState(world, entity, player, body);
    }
  }

  /** Ray-cast downward; if hit (excluding self) -> grounded. */
  private detectGround(
    body: RAPIER.RigidBody,
    player: PlayerComponent,
    selfCollider: RAPIER.Collider | null,
  ): void {
    const pos = body.translation();
    // Cast down (Y-positive = downward in screen-space)
    const ray = new RAPIER.Ray({ x: pos.x, y: pos.y }, { x: 0, y: 1 });
    const hit = this.physics.world.castRay(
      ray, GROUND_RAY_LENGTH, true,
      undefined, undefined, selfCollider ?? undefined,
    );

    if (hit) {
      player.isGrounded = true;
      player.jumpCount = 0;
    } else {
      player.isGrounded = false;
    }
  }

  /** Ray-cast left + right; sets wallDirection when airborne and falling. */
  private detectWalls(
    body: RAPIER.RigidBody,
    player: PlayerComponent,
    selfCollider: RAPIER.Collider | null,
  ): void {
    const vel = body.linvel();
    // Only detect walls when airborne and falling (vy > 0 in Y-down)
    if (player.isGrounded || vel.y < 0) {
      player.wallDirection = 0;
      return;
    }

    const pos = body.translation();
    const exclude = selfCollider ?? undefined;

    const rayL = new RAPIER.Ray({ x: pos.x, y: pos.y }, { x: -1, y: 0 });
    if (this.physics.world.castRay(rayL, WALL_RAY_LENGTH, true, undefined, undefined, exclude)) {
      player.wallDirection = -1;
      return;
    }

    const rayR = new RAPIER.Ray({ x: pos.x, y: pos.y }, { x: 1, y: 0 });
    if (this.physics.world.castRay(rayR, WALL_RAY_LENGTH, true, undefined, undefined, exclude)) {
      player.wallDirection = 1;
      return;
    }

    player.wallDirection = 0;
  }

  /** Read left/right input -> set horizontal velocity (reduced in air). */
  private applyHorizontalMovement(
    body: RAPIER.RigidBody,
    player: PlayerComponent,
  ): void {
    let dirX = 0;
    if (isActionDown(Action.MoveLeft, this.input)) dirX -= 1;
    if (isActionDown(Action.MoveRight, this.input)) dirX += 1;

    const control = player.isGrounded ? 1.0 : AIR_CONTROL;
    const targetVx = dirX * PLAYER_SPEED * control;
    body.setLinvel({ x: targetVx, y: body.linvel().y }, true);

    if (dirX !== 0) {
      player.facingDirection = dirX > 0 ? 1 : -1;
    }
  }

  /** Jump: grounded, wall-jump, or double-jump (max 2). */
  private applyJump(body: RAPIER.RigidBody, player: PlayerComponent): void {
    if (!isActionJustPressed(Action.Jump, this.input)) return;

    const vel = body.linvel();

    // Wall jump: touching wall + airborne
    if (player.wallDirection !== 0 && !player.isGrounded) {
      const awayX = -player.wallDirection * WALL_JUMP_IMPULSE_X;
      body.setLinvel({ x: awayX, y: WALL_JUMP_IMPULSE_Y }, true);
      player.jumpCount = 1;
      this.soundManager.play('jump');
      return;
    }

    // Grounded jump
    if (player.isGrounded) {
      body.setLinvel({ x: vel.x, y: PLAYER_JUMP_IMPULSE }, true);
      player.jumpCount = 1;
      this.soundManager.play('jump');
      return;
    }

    // Air (double) jump
    if (player.jumpCount < 2) {
      body.setLinvel({ x: vel.x, y: PLAYER_JUMP_IMPULSE }, true);
      player.jumpCount += 1;
      this.soundManager.play('jump');
    }
  }

  /** Clamp fall speed when touching wall, falling, and holding toward it. */
  private applyWallSlide(body: RAPIER.RigidBody, player: PlayerComponent): void {
    if (player.wallDirection === 0 || player.isGrounded) return;
    const vel = body.linvel();
    if (vel.y <= 0) return; // only when falling

    const holdingToward =
      (player.wallDirection === -1 && isActionDown(Action.MoveLeft, this.input)) ||
      (player.wallDirection === 1 && isActionDown(Action.MoveRight, this.input));
    if (!holdingToward) return;

    // Clamp downward velocity to wall-slide max
    if (vel.y > WALL_SLIDE_SPEED) {
      body.setLinvel({ x: vel.x, y: WALL_SLIDE_SPEED }, true);
    }
  }

  /** Derive high-level state from velocity and ground/wall contact. */
  private updateState(body: RAPIER.RigidBody, player: PlayerComponent): void {
    const vel = body.linvel();
    if (player.wallDirection !== 0 && !player.isGrounded && vel.y > 0) {
      player.state = 'wallSliding';
    } else if (player.isGrounded) {
      player.state = Math.abs(vel.x) > 0.5 ? 'running' : 'idle';
    } else if (vel.y < 0) {
      player.state = 'jumping';
    } else {
      player.state = 'falling';
    }
  }

  /** Map player state to animation name and set flipX from velocity. */
  private syncAnimationState(
    world: World,
    entity: number,
    player: PlayerComponent,
    body: RAPIER.RigidBody,
  ): void {
    const animState = world.getComponent(entity, 'animationState') as
      | AnimationStateComponent
      | undefined;
    if (!animState) {
      // Noah (static Sprite) has no animationState — flip via transform
      // scaleX so the sprite faces the movement direction.
      const transform = world.getComponent(entity, 'transform');
      if (transform) {
        const mag = Math.abs(transform.scaleX) || 1;
        transform.scaleX = player.facingDirection * mag;
      }
      return;
    }

    const stateMap: Record<string, string> = {
      idle: 'idle',
      running: 'run',
      jumping: 'jump',
      falling: 'fall',
      wallSliding: 'fall',
      dead: 'die',
    };
    const newAnim = stateMap[player.state] ?? 'idle';
    animState.currentAnimation = newAnim;

    // Flip sprite based on velocity direction (threshold avoids flicker)
    const vel = body.linvel();
    if (vel.x < -0.5) animState.flipX = true;
    else if (vel.x > 0.5) animState.flipX = false;
  }

  /** Look up the Rapier Collider object for an ECS entity. */
  private getEntityCollider(entityId: number): RAPIER.Collider | null {
    for (const [handle, eid] of this.physics.colliderToEntity) {
      if (eid === entityId) {
        return this.physics.world.getCollider(handle) ?? null;
      }
    }
    return null;
  }
}
