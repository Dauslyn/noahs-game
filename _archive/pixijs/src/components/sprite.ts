/**
 * SpriteComponent – links an entity to a PixiJS display object.
 *
 * The `displayObject` is a PixiJS Container (or any subclass such as
 * Sprite, AnimatedSprite, Graphics, etc.) managed by the render system.
 */

import type { Container } from 'pixi.js';
import type { Component } from '../core/types.js';

export interface SpriteComponent extends Component {
  readonly type: 'sprite';
  /** The PixiJS display object rendered on screen. */
  displayObject: Container;
  /** Logical width for collision / layout (pixels). */
  width: number;
  /** Logical height for collision / layout (pixels). */
  height: number;
}

/**
 * Create a SpriteComponent.
 * @param displayObject – PixiJS Container to render
 * @param width         – logical width in pixels
 * @param height        – logical height in pixels
 */
export function createSprite(
  displayObject: Container,
  width: number,
  height: number,
): SpriteComponent {
  return { type: 'sprite', displayObject, width, height };
}
