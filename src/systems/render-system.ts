/**
 * RenderSystem -- syncs ECS TransformComponent data to PixiJS display objects.
 *
 * Priority 100: runs after physics and gameplay systems so that transforms
 * are fully resolved before we apply them to the visual representation.
 *
 * Responsibilities:
 *   1. Query all entities with ['transform', 'sprite'] components.
 *   2. Copy position, rotation, and scale from TransformComponent to the
 *      SpriteComponent's PixiJS displayObject.
 *   3. Auto-add new display objects to the stage container and remove
 *      stale ones when entities are destroyed.
 */

import type { Container } from 'pixi.js';
import type { System, Entity } from '../core/types.js';
import type { World } from '../core/world.js';

export class RenderSystem implements System {
  /** Runs late so all transforms are finalised before rendering. */
  readonly priority = 100;

  /** The PixiJS container that display objects are added to (worldContainer). */
  private readonly stage: Container;

  /**
   * Maps entity ID -> its PixiJS display object.
   * Retains the reference so we can remove it from the stage even after
   * the SpriteComponent is detached or the entity is destroyed.
   */
  private readonly entityDisplayObjects = new Map<Entity, Container>();

  /**
   * @param stage - the PixiJS Container (typically worldContainer) to
   *                which sprite display objects are added
   */
  constructor(stage: Container) {
    this.stage = stage;
  }

  /**
   * Called once per frame. Syncs every renderable entity's transform
   * to its PixiJS display object, managing stage membership.
   *
   * @param world - the ECS world to query
   * @param _dt   - delta time (unused, but required by System interface)
   */
  update(world: World, _dt: number): void {
    const entities = world.query('transform', 'sprite');
    const currentEntities = new Set<Entity>(entities);

    for (const entity of entities) {
      const transform = world.getComponent(entity, 'transform');
      const sprite = world.getComponent(entity, 'sprite');

      if (!transform || !sprite) continue;

      // Add display object to stage if not already tracked
      if (!this.entityDisplayObjects.has(entity)) {
        this.stage.addChild(sprite.displayObject);
        this.entityDisplayObjects.set(entity, sprite.displayObject);
      }

      // Sync position from ECS transform -> PixiJS display object
      sprite.displayObject.x = transform.x;
      sprite.displayObject.y = transform.y;
      sprite.displayObject.rotation = transform.rotation;

      // Sync scale
      sprite.displayObject.scale.x = transform.scaleX;
      sprite.displayObject.scale.y = transform.scaleY;
    }

    // Remove display objects for entities that no longer have both components
    this.cleanupRemovedEntities(currentEntities);
  }

  /**
   * Remove display objects from the stage for entities that are no longer
   * in the query results (entity destroyed or lost a required component).
   */
  private cleanupRemovedEntities(currentEntities: Set<Entity>): void {
    for (const [entity, displayObject] of this.entityDisplayObjects) {
      if (!currentEntities.has(entity)) {
        // Entity no longer has transform + sprite; remove display object
        if (displayObject.parent) {
          this.stage.removeChild(displayObject);
        }
        this.entityDisplayObjects.delete(entity);
      }
    }
  }
}
