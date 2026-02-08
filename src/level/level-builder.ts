/**
 * Level builder – turns a LevelData definition into ECS entities
 * with static Rapier bodies and PixiJS visual rectangles.
 *
 * Each platform becomes an entity with:
 *   - TransformComponent (centre position in pixels)
 *   - PhysicsBodyComponent (static Rapier body)
 *   - SpriteComponent (dark gray rectangle)
 */

import RAPIER from '@dimforge/rapier2d-compat';
import { Graphics } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import { toPhysicsPos, pixelsToMeters } from '../core/physics.js';
import { registerCollider } from '../core/collision-utils.js';
import {
  createTransform,
  createPhysicsBody,
  createSprite,
} from '../components/index.js';
import type { LevelData, PlatformDef } from './level-data.js';

// ---------------------------------------------------------------------------
// Default colours
// ---------------------------------------------------------------------------

/** Default platform fill colour (dark gray-blue). */
const DEFAULT_FILL = 0x333344;

/** Platform outline colour (lighter gray-blue). */
const OUTLINE_COLOR = 0x555566;

/** Outline thickness in pixels. */
const OUTLINE_WIDTH = 2;

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Build all platform entities for a level.
 *
 * For each PlatformDef in the level data:
 *   1. Creates an ECS entity
 *   2. Creates a Rapier fixed (static) rigid body
 *   3. Attaches a cuboid collider sized to the platform
 *   4. Draws a PixiJS rectangle as the visual
 *   5. Registers the collider for collision lookups
 *
 * @param levelData      - the level definition to build
 * @param world          - the ECS world
 * @param physicsCtx     - shared physics context
 * @param worldContainer - PixiJS container for world-space visuals
 */
export function buildLevel(
  levelData: LevelData,
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
): void {
  for (const platform of levelData.platforms) {
    buildPlatform(platform, world, physicsCtx, worldContainer);
  }
}

/**
 * Create a single platform entity with physics body and visual.
 *
 * @param def            - platform definition (position, size, optional colour)
 * @param world          - the ECS world
 * @param physicsCtx     - shared physics context
 * @param worldContainer - PixiJS container for world-space visuals
 */
function buildPlatform(
  def: PlatformDef,
  world: World,
  physicsCtx: PhysicsContext,
  worldContainer: Container,
): void {
  const entity = world.createEntity();

  // -- Static Rapier body at platform centre --
  const physPos = toPhysicsPos(def.x, def.y);
  const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
    physPos.x,
    physPos.y,
  );
  const body = physicsCtx.world.createRigidBody(bodyDesc);

  // Cuboid collider: half-extents in metres
  const halfW = pixelsToMeters(def.width / 2);
  const halfH = pixelsToMeters(def.height / 2);
  const colliderDesc = RAPIER.ColliderDesc.cuboid(halfW, halfH);
  const collider = physicsCtx.world.createCollider(colliderDesc, body);

  // -- ECS components --
  world.addComponent(entity, createTransform(def.x, def.y));
  world.addComponent(entity, createPhysicsBody(body.handle, 'static'));

  // -- Visual: filled rectangle with outline, anchored at centre --
  const fillColor = def.color ?? DEFAULT_FILL;
  const gfx = new Graphics();
  gfx.rect(-def.width / 2, -def.height / 2, def.width, def.height);
  gfx.fill(fillColor);
  gfx.stroke({ color: OUTLINE_COLOR, width: OUTLINE_WIDTH });
  worldContainer.addChild(gfx);

  world.addComponent(entity, createSprite(gfx, def.width, def.height));

  // -- Register collider handle -> entity --
  registerCollider(physicsCtx, collider.handle, entity);
}
