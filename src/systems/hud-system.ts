/**
 * HudSystem -- manages the heads-up display overlay.
 *
 * Priority 98: runs after gameplay systems have updated health values
 * but before the RenderSystem (100), so the HUD reflects the current
 * frame's state.
 *
 * Currently displays:
 *   - Player health bar (top-left corner)
 */

import type { Container } from 'pixi.js';
import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import { HealthBar } from '../ui/health-bar.js';

export class HudSystem implements System {
  /** Runs just before rendering so health values are up-to-date. */
  readonly priority = 98;

  private readonly healthBar: HealthBar;

  /**
   * @param uiContainer - screen-fixed PixiJS container for HUD elements
   */
  constructor(uiContainer: Container) {
    this.healthBar = new HealthBar();
    uiContainer.addChild(this.healthBar.container);
  }

  /**
   * Find the player entity and update the health bar each frame.
   *
   * @param world - the ECS world to query
   * @param _dt   - delta time (unused)
   */
  update(world: World, _dt: number): void {
    // Find the player entity (has both 'player' and 'health' components)
    const players = world.query('player', 'health');
    if (players.length === 0) return;

    const playerEntity = players[0];
    const health = world.getComponent(playerEntity, 'health');
    if (!health) return;

    this.healthBar.update(health.current, health.max);
  }
}
