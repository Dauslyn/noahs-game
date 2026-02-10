/**
 * ShockwaveManager -- triggers and animates ShockwaveFilter ripple effects
 * on the world container. Self-manages filter array lifecycle.
 *
 * Singleton pattern: create via constructor, access via ShockwaveManager.instance.
 */

import { ShockwaveFilter } from 'pixi-filters';
import type { Container, Filter } from 'pixi.js';

/** An in-flight shockwave with its own filter and lifetime. */
interface ActiveShockwave {
  filter: ShockwaveFilter;
  elapsed: number;
  duration: number;
}

/** Maximum concurrent shockwaves (prevents filter stack overflow). */
const MAX_CONCURRENT = 3;

export class ShockwaveManager {
  /** Singleton for easy access from any system. */
  static instance: ShockwaveManager | null = null;

  private active: ActiveShockwave[] = [];
  private readonly container: Container;

  constructor(container: Container) {
    this.container = container;
    ShockwaveManager.instance = this;
  }

  /**
   * Trigger a shockwave centered at screen-space (x, y).
   * @param x         - screen X coordinate of the shockwave center
   * @param y         - screen Y coordinate of the shockwave center
   * @param amplitude - distortion strength (default 10)
   * @param wavelength - distance between wave crests in px (default 80)
   * @param speed     - expansion speed in px/s (default 400)
   * @param duration  - total lifetime in seconds (default 0.6)
   */
  trigger(
    x: number,
    y: number,
    amplitude = 10,
    wavelength = 80,
    speed = 400,
    duration = 0.6,
  ): void {
    if (this.active.length >= MAX_CONCURRENT) return;

    const filter = new ShockwaveFilter({
      center: { x, y },
      amplitude,
      wavelength,
      speed,
      radius: -1,
    });

    this.active.push({ filter, elapsed: 0, duration });
    this.syncFilters();
  }

  /**
   * Advance all active shockwaves by dt seconds. Remove completed ones.
   * @param dt - delta time in seconds
   */
  update(dt: number): void {
    if (this.active.length === 0) return;

    let changed = false;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const sw = this.active[i];
      sw.elapsed += dt;
      // ShockwaveFilter.time drives the expansion radius
      sw.filter.time = sw.elapsed;
      if (sw.elapsed >= sw.duration) {
        this.active.splice(i, 1);
        changed = true;
      }
    }

    if (changed) this.syncFilters();
  }

  /** Clear all active shockwaves and null the singleton. Call on level unload. */
  destroy(): void {
    this.active.length = 0;
    this.syncFilters();
    ShockwaveManager.instance = null;
  }

  /**
   * Rebuild the container's filter array: keep non-shockwave filters
   * and append active shockwave filters.
   */
  private syncFilters(): void {
    const existing = (this.container.filters ?? []) as Filter[];
    const base = existing.filter(f => !(f instanceof ShockwaveFilter));
    this.container.filters = [...base, ...this.active.map(s => s.filter)];
  }
}
