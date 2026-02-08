/**
 * Mech companion entity factory – creates the orbiting mech companion
 * with no physics body (it floats freely around the player).
 *
 * Placeholder visual: a 16x16 cyan diamond shape.
 */

import { Graphics } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import {
  MECH_ORBIT_RADIUS,
  MECH_ORBIT_SPEED,
  LASER_DAMAGE,
  LASER_FIRE_RATE,
  LASER_RANGE,
  LASER_SPEED,
} from '../core/constants.js';
import {
  createTransform,
  createMech,
  createWeapon,
  createSprite,
} from '../components/index.js';

// ---------------------------------------------------------------------------
// Visual dimensions (pixels)
// ---------------------------------------------------------------------------

/** Diamond sprite width (pixels). */
const DIAMOND_SIZE = 16;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the mech companion entity with orbit/weapon components
 * and a cyan diamond placeholder sprite. No physics body.
 *
 * @param world          - the ECS world
 * @param worldContainer - PixiJS container for world-space visuals
 * @param ownerEntity    - entity ID of the player this mech belongs to
 * @param x              - spawn X position (pixels)
 * @param y              - spawn Y position (pixels)
 * @returns the newly created entity ID
 */
export function createMechEntity(
  world: World,
  worldContainer: Container,
  ownerEntity: Entity,
  x: number,
  y: number,
): Entity {
  const entity = world.createEntity();

  // -- ECS components --
  world.addComponent(entity, createTransform(x, y));
  world.addComponent(
    entity,
    createMech(ownerEntity, MECH_ORBIT_RADIUS, MECH_ORBIT_SPEED),
  );
  world.addComponent(
    entity,
    createWeapon(LASER_DAMAGE, LASER_FIRE_RATE, LASER_RANGE, LASER_SPEED),
  );

  // -- Sci-fi drone sprite (procedural) --
  const half = DIAMOND_SIZE / 2;
  const gfx = new Graphics();

  // Outer shell: diamond shape with metallic look
  gfx.moveTo(0, -half - 2);
  gfx.lineTo(half + 2, 0);
  gfx.lineTo(0, half + 2);
  gfx.lineTo(-half - 2, 0);
  gfx.closePath();
  gfx.fill(0x115566);

  // Inner core: smaller diamond, brighter
  gfx.moveTo(0, -half + 2);
  gfx.lineTo(half - 2, 0);
  gfx.lineTo(0, half - 2);
  gfx.lineTo(-half + 2, 0);
  gfx.closePath();
  gfx.fill(0x00ddcc);

  // Centre eye: small bright dot
  gfx.circle(0, 0, 2);
  gfx.fill(0xffffff);

  // Wing accents: tiny lines
  gfx.moveTo(-half - 2, 0);
  gfx.lineTo(-half - 5, -2);
  gfx.stroke({ width: 1, color: 0x00ffff });
  gfx.moveTo(half + 2, 0);
  gfx.lineTo(half + 5, -2);
  gfx.stroke({ width: 1, color: 0x00ffff });

  worldContainer.addChild(gfx);

  world.addComponent(
    entity,
    createSprite(gfx, DIAMOND_SIZE, DIAMOND_SIZE),
  );

  return entity;
}
