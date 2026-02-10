/**
 * BossHealthBar — large health bar at bottom-centre of screen.
 * Shows boss name "THE WARDEN" above the bar.
 * Only visible when a boss entity is alive and activated.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';

/** Bar dimensions (pixels). */
const BAR_WIDTH = 400;
const BAR_HEIGHT = 24;
const MARGIN_BOTTOM = 60;

const NAME_STYLE = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 18,
  fill: 0xff4444,
  fontWeight: 'bold',
});

const PHASE_STYLE = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 14,
  fill: 0xcccccc,
});

export class BossHealthBar {
  /** Top-level container; add to uiContainer for screen-fixed positioning. */
  readonly container: Container;

  private readonly background: Graphics;
  private readonly foreground: Graphics;
  private readonly border: Graphics;
  private readonly nameLabel: Text;
  private readonly phaseLabel: Text;
  private enrageGlow: GlowFilter | null = null;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    // Background (dark fill behind health)
    this.background = new Graphics();
    this.background.rect(-BAR_WIDTH / 2, 0, BAR_WIDTH, BAR_HEIGHT);
    this.background.fill(0x222222);

    // Foreground (health fill — redrawn each frame)
    this.foreground = new Graphics();

    // Border (red outline)
    this.border = new Graphics();
    this.border.rect(-BAR_WIDTH / 2, 0, BAR_WIDTH, BAR_HEIGHT);
    this.border.stroke({ color: 0xff4444, width: 2 });

    // Boss name label centred above bar
    this.nameLabel = new Text({ text: 'THE WARDEN', style: NAME_STYLE });
    this.nameLabel.anchor.set(0.5, 1);
    this.nameLabel.y = -6;

    // Phase indicator label (right side of bar, above)
    this.phaseLabel = new Text({ text: 'PHASE 1', style: PHASE_STYLE });
    this.phaseLabel.anchor.set(0.5, 1);
    this.phaseLabel.y = -6;
    this.phaseLabel.x = BAR_WIDTH / 2 - 40;

    this.container.addChild(
      this.background, this.foreground, this.border, this.nameLabel,
      this.phaseLabel,
    );
  }

  /** Reposition based on current screen size. */
  reposition(screenWidth: number, screenHeight: number): void {
    this.container.x = screenWidth / 2;
    this.container.y = screenHeight - MARGIN_BOTTOM;
  }

  /**
   * Update bar fill and phase indicator. Makes container visible.
   *
   * @param current - current boss HP
   * @param max     - max boss HP
   * @param phase   - current boss phase (1, 2, or 3)
   */
  update(current: number, max: number, phase: 1 | 2 | 3 = 1): void {
    this.container.visible = true;
    const ratio = Math.max(0, Math.min(1, current / max));
    const width = ratio * BAR_WIDTH;

    // Color: red/orange gradient based on remaining HP
    let color: number;
    if (ratio > 0.6) color = 0xff4444;
    else if (ratio > 0.3) color = 0xff6622;
    else color = 0xff2200;

    this.foreground.clear();
    this.foreground.rect(-BAR_WIDTH / 2, 0, width, BAR_HEIGHT);
    this.foreground.fill(color);

    // Update phase label text and color
    this.phaseLabel.text = `PHASE ${phase}`;
    if (phase === 3) this.phaseLabel.style.fill = 0xff2222;
    else if (phase === 2) this.phaseLabel.style.fill = 0xffaa44;
    else this.phaseLabel.style.fill = 0xcccccc;

    // Red glow on entire health bar during Phase 3 enrage
    if (phase >= 3 && !this.enrageGlow) {
      this.enrageGlow = new GlowFilter({
        color: 0xff0000,
        outerStrength: 3,
        distance: 10,
      });
      this.container.filters = [this.enrageGlow];
    }
  }

  /** Hide the boss health bar and reset enrage glow. */
  hide(): void {
    this.container.visible = false;
    this.enrageGlow = null;
    this.container.filters = [];
  }
}
