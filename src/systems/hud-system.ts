/**
 * HudSystem -- manages the heads-up display overlay.
 *
 * Priority 98: runs after gameplay systems have updated health values
 * but before the RenderSystem (100), so the HUD reflects the current
 * frame's state.
 *
 * Displays:
 *   - Player health bar (top-left corner)
 *   - Scrap counter (below health bar)
 *   - Active consumable icons ([SH] shield, [MED] medkit)
 */

import { Text, TextStyle } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { System } from '../core/types.js';
import type { World } from '../core/world.js';
import type { GameState } from '../core/game-state.js';
import { HealthBar } from '../ui/health-bar.js';
import { BossHealthBar } from '../ui/boss-health-bar.js';

const SCRAP_STYLE = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 16,
  fill: 0xffcc00,
  fontWeight: 'bold',
});

const CONSUMABLE_STYLE = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 12,
  fill: 0x44ffff,
  fontWeight: 'bold',
});

export class HudSystem implements System {
  /** Runs just before rendering so health values are up-to-date. */
  readonly priority = 98;

  private readonly healthBar: HealthBar;
  private readonly bossHealthBar: BossHealthBar;
  private readonly scrapText: Text;
  private readonly shieldIcon: Text;
  private readonly medkitIcon: Text;
  private readonly gameState: GameState;

  /**
   * @param uiContainer - screen-fixed PixiJS container for HUD elements
   * @param gameState   - persistent player state (scrap total)
   */
  constructor(uiContainer: Container, gameState: GameState) {
    this.gameState = gameState;

    this.healthBar = new HealthBar();
    uiContainer.addChild(this.healthBar.container);

    this.bossHealthBar = new BossHealthBar();
    this.bossHealthBar.reposition(window.innerWidth, window.innerHeight);
    uiContainer.addChild(this.bossHealthBar.container);

    this.scrapText = new Text({ text: 'SCRAP: 0', style: SCRAP_STYLE });
    this.scrapText.x = 16;
    this.scrapText.y = 50;
    uiContainer.addChild(this.scrapText);

    // Consumable indicators (hidden when inactive)
    this.shieldIcon = new Text({ text: '[SH]', style: CONSUMABLE_STYLE });
    this.shieldIcon.x = 16;
    this.shieldIcon.y = 72;
    this.shieldIcon.visible = false;
    uiContainer.addChild(this.shieldIcon);

    this.medkitIcon = new Text({
      text: '[MED]',
      style: new TextStyle({
        fontFamily: 'monospace', fontSize: 12,
        fill: 0x44ff44, fontWeight: 'bold',
      }),
    });
    this.medkitIcon.x = 56;
    this.medkitIcon.y = 72;
    this.medkitIcon.visible = false;
    uiContainer.addChild(this.medkitIcon);
  }

  /**
   * Find the player entity and update the HUD each frame.
   *
   * @param world - the ECS world to query
   * @param _dt   - delta time (unused)
   */
  update(world: World, _dt: number): void {
    const players = world.query('player', 'health');
    if (players.length === 0) return;

    const playerEntity = players[0];
    const health = world.getComponent(playerEntity, 'health');
    if (!health) return;

    this.healthBar.update(health.current, health.max);
    this.scrapText.text = `SCRAP: ${this.gameState.scrap}`;

    // Show/hide consumable icons based on current state
    this.shieldIcon.visible = this.gameState.shieldCharge;
    this.medkitIcon.visible = this.gameState.repairKit;

    // Boss health bar: show only when an activated, living boss exists
    this.updateBossHealthBar(world);
  }

  /** Show/hide boss health bar based on boss entity state. */
  private updateBossHealthBar(world: World): void {
    const bossEntities = world.query('boss', 'health');
    let bossVisible = false;

    for (const bossEntity of bossEntities) {
      const bossComp = world.getComponent(bossEntity, 'boss');
      const bossHealth = world.getComponent(bossEntity, 'health');

      if (bossComp?.activated && bossHealth && !bossHealth.isDead) {
        this.bossHealthBar.reposition(window.innerWidth, window.innerHeight);
        this.bossHealthBar.update(bossHealth.current, bossHealth.max);
        bossVisible = true;
        break;
      }
    }

    if (!bossVisible) this.bossHealthBar.hide();
  }
}
