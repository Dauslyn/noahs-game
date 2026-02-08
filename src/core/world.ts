/**
 * World – the central ECS container.
 *
 * Stores entities and their components.  Provides creation, deletion,
 * component attachment/detachment, and efficient multi-component queries.
 *
 * Design decisions:
 * - Components are stored in a two-level Map:
 *     `Map<ComponentType, Map<Entity, Component>>`
 *   This allows O(1) add / get / remove per entity-component pair and
 *   makes queries fast by iterating the *smallest* map among the
 *   requested types.
 * - Systems are NOT stored here; the Game class (Task 3) owns them.
 * - Entity IDs are auto-incrementing numbers starting at 1.
 */

import type { Component, ComponentType, Entity } from './types.js';
import type { ComponentMap } from '../components/index.js';

export class World {
  // -----------------------------------------------------------------------
  // Internal state
  // -----------------------------------------------------------------------

  /** Auto-incrementing entity ID counter. Starts at 1 (0 is "no entity"). */
  private nextEntityId: Entity = 1;

  /**
   * Set of all living entity IDs.
   * Used to validate entity existence and to iterate all entities.
   */
  private readonly entities = new Set<Entity>();

  /**
   * Component storage.
   * Outer key = component type string, inner key = entity ID.
   */
  private readonly components = new Map<
    ComponentType,
    Map<Entity, Component>
  >();

  // -----------------------------------------------------------------------
  // Entity lifecycle
  // -----------------------------------------------------------------------

  /**
   * Create a new entity and return its ID.
   * The entity starts with no components.
   */
  createEntity(): Entity {
    const id = this.nextEntityId++;
    this.entities.add(id);
    return id;
  }

  /**
   * Destroy an entity and remove all of its components.
   * Silently does nothing if the entity does not exist.
   */
  removeEntity(entity: Entity): void {
    if (!this.entities.has(entity)) return;

    // Remove the entity from every component map it appears in
    for (const store of this.components.values()) {
      store.delete(entity);
    }

    this.entities.delete(entity);
  }

  /**
   * Check whether an entity is alive.
   */
  hasEntity(entity: Entity): boolean {
    return this.entities.has(entity);
  }

  /**
   * Return the total number of living entities.
   */
  get entityCount(): number {
    return this.entities.size;
  }

  // -----------------------------------------------------------------------
  // Component operations
  // -----------------------------------------------------------------------

  /**
   * Attach a component to an entity, replacing any existing component
   * of the same type on that entity.
   *
   * @param entity    – target entity (must be alive)
   * @param component – the component object (must have a `type` field)
   */
  addComponent(entity: Entity, component: Component): void {
    if (!this.entities.has(entity)) {
      throw new Error(
        `[World.addComponent] Entity ${entity} does not exist.`,
      );
    }

    let store = this.components.get(component.type);
    if (!store) {
      store = new Map<Entity, Component>();
      this.components.set(component.type, store);
    }
    store.set(entity, component);
  }

  /**
   * Get a component of the given type from an entity.
   *
   * Returns the concrete component type inferred from the ComponentMap,
   * or `undefined` if the entity doesn't own that component.
   *
   * @example
   * const t = world.getComponent(e, 'transform');
   * // t is TransformComponent | undefined
   */
  getComponent<K extends keyof ComponentMap>(
    entity: Entity,
    type: K,
  ): ComponentMap[K] | undefined {
    const store = this.components.get(type);
    if (!store) return undefined;
    return store.get(entity) as ComponentMap[K] | undefined;
  }

  /**
   * Check whether an entity owns a component of the given type.
   */
  hasComponent(entity: Entity, type: ComponentType): boolean {
    const store = this.components.get(type);
    return store !== undefined && store.has(entity);
  }

  /**
   * Remove a single component type from an entity.
   * Silently does nothing if the entity lacks that component.
   */
  removeComponent(entity: Entity, type: ComponentType): void {
    const store = this.components.get(type);
    if (store) {
      store.delete(entity);
    }
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  /**
   * Return every entity that owns **all** of the requested component types.
   *
   * **Optimisation**: iterates the component map with the fewest entries
   * and checks membership in the remaining maps, minimising the inner
   * loop iterations.
   *
   * @param types – one or more ComponentType strings
   * @returns an array of entity IDs matching all types
   *
   * @example
   * const movers = world.query('transform', 'velocity');
   */
  query(...types: ComponentType[]): Entity[] {
    if (types.length === 0) return [];

    // Gather the Maps for each requested type.
    // If any type has zero entities we can bail immediately.
    const stores: Map<Entity, Component>[] = [];
    for (const t of types) {
      const store = this.components.get(t);
      if (!store || store.size === 0) return [];
      stores.push(store);
    }

    // Find the smallest store to iterate (minimise work).
    let smallest = stores[0];
    for (let i = 1; i < stores.length; i++) {
      if (stores[i].size < smallest.size) {
        smallest = stores[i];
      }
    }

    // Iterate smallest, check presence in all others.
    const result: Entity[] = [];
    for (const entity of smallest.keys()) {
      let matchesAll = true;
      for (const store of stores) {
        if (store === smallest) continue; // already guaranteed
        if (!store.has(entity)) {
          matchesAll = false;
          break;
        }
      }
      if (matchesAll) {
        result.push(entity);
      }
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Utilities
  // -----------------------------------------------------------------------

  /**
   * Return an iterable of all living entity IDs.
   * Useful for debug tools and serialisation.
   */
  allEntities(): IterableIterator<Entity> {
    return this.entities.values();
  }

  /**
   * Remove every entity and all component data.
   * Resets the entity ID counter to 1.
   */
  clear(): void {
    this.entities.clear();
    this.components.clear();
    this.nextEntityId = 1;
  }
}
