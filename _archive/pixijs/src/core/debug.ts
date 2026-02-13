/**
 * DebugRenderer -- draws Rapier2D collider outlines over the game world.
 *
 * Toggle with the F1 key. Off by default.
 *
 * Colour coding:
 *   - Green  (#00ff00) = static bodies (platforms, walls)
 *   - Yellow (#ffff00) = dynamic bodies (player, projectiles, enemies)
 *
 * Uses a single PixiJS Graphics object that is cleared and redrawn
 * each frame. The Graphics object is added to / removed from the
 * worldContainer when toggled on / off.
 */

import { Graphics, Container } from 'pixi.js';
import type { PhysicsContext } from './physics.js';
import { metersToPixels } from './physics.js';
import RAPIER from '@dimforge/rapier2d-compat';

/** Colour for static-body collider outlines (green). */
const STATIC_COLOUR = 0x00ff00;

/** Colour for dynamic/kinematic-body collider outlines (yellow). */
const DYNAMIC_COLOUR = 0xffff00;

/** Line width for debug outlines (pixels). */
const LINE_WIDTH = 1;

export class DebugRenderer {
  /** Whether debug drawing is currently visible. */
  private visible = false;

  /** The PixiJS Graphics object used for all debug drawing. */
  private readonly graphics: Graphics;

  /** The container the debug graphics are added to. */
  private readonly worldContainer: Container;

  /** Bound handler reference for cleanup. */
  private readonly handleKeyDown: (e: KeyboardEvent) => void;

  /**
   * @param worldContainer - the PixiJS world container to draw into
   */
  constructor(worldContainer: Container) {
    this.worldContainer = worldContainer;
    this.graphics = new Graphics();

    this.handleKeyDown = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Toggle debug rendering on or off.
   */
  toggle(): void {
    this.visible = !this.visible;

    if (this.visible) {
      this.worldContainer.addChild(this.graphics);
    } else {
      this.graphics.clear();
      if (this.graphics.parent) {
        this.worldContainer.removeChild(this.graphics);
      }
    }
  }

  /**
   * Draw collider outlines for all bodies in the physics world.
   * Should be called once per frame (after physics step).
   *
   * @param physicsCtx     - the PhysicsContext with the Rapier world
   */
  update(physicsCtx: PhysicsContext): void {
    if (!this.visible) return;

    this.graphics.clear();

    // Iterate over all colliders in the Rapier world
    physicsCtx.world.forEachCollider((collider) => {
      this.drawCollider(physicsCtx, collider);
    });
  }

  /**
   * Clean up event listeners and graphics. Call on shutdown.
   */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.graphics.clear();
    if (this.graphics.parent) {
      this.worldContainer.removeChild(this.graphics);
    }
  }

  // -----------------------------------------------------------------------
  // Internal drawing
  // -----------------------------------------------------------------------

  /**
   * Draw the outline of a single Rapier collider.
   * Determines colour from the parent body type.
   */
  private drawCollider(
    physicsCtx: PhysicsContext,
    collider: RAPIER.Collider,
  ): void {
    const bodyHandle = collider.parent()?.handle;
    if (bodyHandle === undefined || bodyHandle === null) return;

    const body = physicsCtx.world.getRigidBody(bodyHandle);
    if (!body) return;

    // Pick colour based on body type
    const isStatic = body.bodyType() === RAPIER.RigidBodyType.Fixed;
    const colour = isStatic ? STATIC_COLOUR : DYNAMIC_COLOUR;

    // Get collider world-space position and rotation
    const pos = collider.translation();
    const rot = collider.rotation();
    const screenX = metersToPixels(pos.x);
    const screenY = metersToPixels(pos.y);

    const shape = collider.shape;
    const shapeType = shape.type;

    if (shapeType === RAPIER.ShapeType.Cuboid) {
      this.drawCuboid(screenX, screenY, rot, shape, colour);
    } else if (shapeType === RAPIER.ShapeType.Ball) {
      this.drawBall(screenX, screenY, shape, colour);
    }
  }

  /**
   * Draw a box (cuboid) collider outline.
   * Rapier cuboid half-extents are in metres; convert to pixels.
   */
  private drawCuboid(
    cx: number,
    cy: number,
    rotation: number,
    shape: RAPIER.Shape,
    colour: number,
  ): void {
    // halfExtents returns { x, y } in metres
    const he = (shape as RAPIER.Cuboid).halfExtents;
    const hw = metersToPixels(he.x);
    const hh = metersToPixels(he.y);

    this.graphics
      .setStrokeStyle({ width: LINE_WIDTH, color: colour, alpha: 0.8 })
      .beginPath();

    // Compute the four corners with rotation applied
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    // Corners relative to centre: (-hw,-hh), (hw,-hh), (hw,hh), (-hw,hh)
    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];

    for (let i = 0; i < corners.length; i++) {
      const c = corners[i];
      // Rotate corner around centre
      const rx = cx + c.x * cos - c.y * sin;
      const ry = cy + c.x * sin + c.y * cos;

      if (i === 0) {
        this.graphics.moveTo(rx, ry);
      } else {
        this.graphics.lineTo(rx, ry);
      }
    }

    this.graphics.closePath().stroke();
  }

  /**
   * Draw a circle (ball) collider outline.
   * Rapier ball radius is in metres; convert to pixels.
   */
  private drawBall(
    cx: number,
    cy: number,
    shape: RAPIER.Shape,
    colour: number,
  ): void {
    const radius = metersToPixels((shape as RAPIER.Ball).radius);

    this.graphics
      .setStrokeStyle({ width: LINE_WIDTH, color: colour, alpha: 0.8 })
      .circle(cx, cy, radius)
      .stroke();
  }

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  /**
   * Toggle debug rendering when F1 is pressed.
   */
  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'F1') {
      e.preventDefault();
      this.toggle();
    }
  }
}
