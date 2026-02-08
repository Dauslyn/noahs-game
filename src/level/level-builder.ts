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

/** Default platform fill colour (dark metallic blue). */
const DEFAULT_FILL = 0x1a2a3a;

/** Platform surface highlight colour (lighter top edge). */
const SURFACE_COLOR = 0x3a5a7a;

/** Platform outline colour (subtle border). */
const OUTLINE_COLOR = 0x4a6a8a;

/** Outline thickness in pixels. */
const OUTLINE_WIDTH = 1;

/** Panel line colour for surface detail. */
const PANEL_LINE_COLOR = 0x2a3a4a;

/** Panel line spacing in pixels. */
const PANEL_SPACING = 24;

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

  // -- Sci-fi platform visual with surface detail --
  const fillColor = def.color ?? DEFAULT_FILL;
  const hw = def.width / 2;
  const hh = def.height / 2;
  const gfx = new Graphics();

  // Main body: dark metallic fill
  gfx.rect(-hw, -hh, def.width, def.height);
  gfx.fill(fillColor);

  // Top surface highlight: bright strip along the top edge
  gfx.rect(-hw, -hh, def.width, 3);
  gfx.fill(SURFACE_COLOR);

  // Bottom edge shadow: darker strip
  gfx.rect(-hw, hh - 2, def.width, 2);
  gfx.fill(0x0a1520);

  // Vertical panel lines: evenly spaced across the surface
  const panelCount = Math.floor(def.width / PANEL_SPACING);
  for (let i = 1; i < panelCount; i++) {
    const px = -hw + i * PANEL_SPACING;
    gfx.moveTo(px, -hh + 3);
    gfx.lineTo(px, hh - 2);
    gfx.stroke({ width: 1, color: PANEL_LINE_COLOR });
  }

  // Corner rivets: small dots at platform corners
  if (def.width >= 40 && def.height >= 16) {
    const rivetInset = 4;
    const rivetColor = 0x5a7a9a;
    gfx.circle(-hw + rivetInset, -hh + rivetInset, 1.5);
    gfx.fill(rivetColor);
    gfx.circle(hw - rivetInset, -hh + rivetInset, 1.5);
    gfx.fill(rivetColor);
    gfx.circle(-hw + rivetInset, hh - rivetInset, 1.5);
    gfx.fill(rivetColor);
    gfx.circle(hw - rivetInset, hh - rivetInset, 1.5);
    gfx.fill(rivetColor);
  }

  // Outer border
  gfx.rect(-hw, -hh, def.width, def.height);
  gfx.stroke({ color: OUTLINE_COLOR, width: OUTLINE_WIDTH });

  worldContainer.addChild(gfx);

  world.addComponent(entity, createSprite(gfx, def.width, def.height));

  // -- Register collider handle -> entity --
  registerCollider(physicsCtx, collider.handle, entity);
}
