/**
 * EffectsSystem -- applies visual effects (glow, bloom, damage flash)
 * to entities based on their component types.
 *
 * Priority 95: runs after gameplay systems but before RenderSystem (100)
 * so that filters are applied before the final render pass.
 *
 * Responsibilities:
 *   1. Apply cyan glow to the mech companion (pulsing "breathing" effect).
 *   2. Apply yellow glow to new projectiles.
 *   3. Flash entities white briefly when they take damage (invincibleTimer).
 */

import { GlowFilter, AdvancedBloomFilter } from 'pixi-filters';
import type { Container } from 'pixi.js';
import type { System, Entity } from '../core/types.js';
import type { World } from '../core/world.js';

/** Duration of the damage-flash in seconds. */
const DAMAGE_FLASH_DURATION = 0.12;

/** Tint applied during damage flash (bright red-white). */
const DAMAGE_FLASH_TINT = 0xff4444;

/** Base outer glow strength for the mech (the sine wave oscillates around this). */
const MECH_GLOW_BASE = 2;

/** Amplitude of the mech glow pulse. */
const MECH_GLOW_AMPLITUDE = 0.8;

/** Speed of the mech glow pulse in radians per second. */
const MECH_GLOW_PULSE_SPEED = 3;

/**
 * Create the AdvancedBloomFilter used on the world container.
 * Threshold-based bloom: only bright elements (lasers, glows, energy)
 * bloom while dark backgrounds and platforms stay clean.
 */
export function createWorldBloom(): AdvancedBloomFilter {
  return new AdvancedBloomFilter({
    threshold: 0.4,    // only things brighter than 40% bloom
    bloomScale: 0.6,   // bloom intensity
    brightness: 1.0,   // don't change base brightness
    blur: 4,           // blur kernel size
    quality: 4,        // blur quality passes
  });
}

export class EffectsSystem implements System {
  /** Runs just before the RenderSystem. */
  readonly priority = 95;

  /** Elapsed time accumulator for sine-wave pulsing. */
  private elapsed = 0;

  /** Tracks which entities already have a glow filter applied. */
  private readonly glowEntities = new Set<Entity>();

  /**
   * Tracks entities currently flashing from damage.
   * Maps entity -> remaining flash time in seconds.
   */
  private readonly flashTimers = new Map<Entity, number>();

  /**
   * Stores the original tint of entities so we can restore after flash.
   * Maps entity -> original tint number.
   */
  private readonly originalTints = new Map<Entity, number>();

  /**
   * Stores each mech entity's GlowFilter reference so we can update
   * outerStrength each frame without searching through the filter array.
   */
  private readonly mechGlows = new Map<Entity, GlowFilter>();

  /**
   * Called once per frame.
   * @param world - the ECS world to query
   * @param dt    - delta time in seconds
   */
  update(world: World, dt: number): void {
    this.elapsed += dt;

    this.updateMechGlow(world);
    this.applyProjectileGlow(world);
    this.handleDamageFlash(world, dt);
    this.cleanupDestroyedEntities(world);
  }

  /**
   * Find the mech entity, apply a cyan glow if not yet applied, and
   * pulse its outerStrength using a sine wave for a "breathing" effect.
   */
  private updateMechGlow(world: World): void {
    const mechs = world.query('mech', 'sprite');

    for (const entity of mechs) {
      const sprite = world.getComponent(entity, 'sprite');
      if (!sprite) continue;

      // Apply glow filter if this mech doesn't have one yet
      if (!this.mechGlows.has(entity)) {
        const glow = new GlowFilter({
          color: 0x00ffff,
          outerStrength: MECH_GLOW_BASE,
          distance: 15,
        });
        this.applyFilter(sprite.displayObject, glow);
        this.mechGlows.set(entity, glow);
        this.glowEntities.add(entity);
      }

      // Pulse the glow: sine wave oscillates around the base strength
      const glow = this.mechGlows.get(entity)!;
      // v = base + amplitude * sin(speed * time)
      glow.outerStrength =
        MECH_GLOW_BASE +
        MECH_GLOW_AMPLITUDE * Math.sin(MECH_GLOW_PULSE_SPEED * this.elapsed);
    }
  }

  /**
   * Apply a glow to any projectile that doesn't already have one.
   * Uses the projectile's glowColor (set from weapon style) or falls
   * back to yellow (0xffff44) for legacy/untyped projectiles.
   */
  private applyProjectileGlow(world: World): void {
    const projectiles = world.query('projectile', 'sprite');

    for (const entity of projectiles) {
      if (this.glowEntities.has(entity)) continue;

      const sprite = world.getComponent(entity, 'sprite');
      const proj = world.getComponent(entity, 'projectile');
      if (!sprite || !proj) continue;

      const color = proj.glowColor ?? 0xffff44;
      const glow = new GlowFilter({
        color,
        outerStrength: 3,
        distance: 10,
      });
      this.applyFilter(sprite.displayObject, glow);
      this.glowEntities.add(entity);
    }
  }

  /**
   * Flash entities red-white when they take damage.
   * Detects damage by checking for entities with health.invincibleTimer > 0
   * that aren't already tracked. Stores original tint, applies flash,
   * and reverts when the flash timer expires.
   */
  private handleDamageFlash(world: World, dt: number): void {
    const entities = world.query('health', 'sprite');

    for (const entity of entities) {
      const health = world.getComponent(entity, 'health');
      const sprite = world.getComponent(entity, 'sprite');
      if (!health || !sprite) continue;

      // Detect new damage: invincibleTimer > 0 and not already flashing
      if (health.invincibleTimer > 0 && !this.flashTimers.has(entity)) {
        // Store original tint so we can restore it later
        const currentTint = sprite.displayObject.tint;
        this.originalTints.set(entity, typeof currentTint === 'number'
          ? currentTint : 0xffffff);
        sprite.displayObject.tint = DAMAGE_FLASH_TINT;
        this.flashTimers.set(entity, DAMAGE_FLASH_DURATION);
      }
    }

    // Decrement flash timers and revert tint when expired
    for (const [entity, remaining] of this.flashTimers) {
      const newRemaining = remaining - dt;

      if (newRemaining <= 0) {
        const sprite = world.getComponent(entity, 'sprite');
        if (sprite) {
          // Restore original tint (0xffffff = no tint in PixiJS)
          const original = this.originalTints.get(entity) ?? 0xffffff;
          sprite.displayObject.tint = original;
        }
        this.flashTimers.delete(entity);
        this.originalTints.delete(entity);
      } else {
        this.flashTimers.set(entity, newRemaining);
      }
    }
  }

  /**
   * Remove tracking data for entities that no longer exist in the world.
   */
  private cleanupDestroyedEntities(world: World): void {
    for (const entity of this.glowEntities) {
      if (!world.hasEntity(entity)) {
        this.glowEntities.delete(entity);
        this.mechGlows.delete(entity);
      }
    }

    for (const entity of this.flashTimers.keys()) {
      if (!world.hasEntity(entity)) {
        this.flashTimers.delete(entity);
        this.originalTints.delete(entity);
      }
    }
  }

  /**
   * Safely append a filter to a display object's existing filter array.
   * @param displayObject - the PixiJS container to add the filter to
   * @param filter        - the filter instance to add
   */
  private applyFilter(displayObject: Container, filter: GlowFilter): void {
    const existing = displayObject.filters;
    if (Array.isArray(existing)) {
      displayObject.filters = [...existing, filter];
    } else {
      displayObject.filters = [filter];
    }
  }
}
