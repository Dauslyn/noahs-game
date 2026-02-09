/**
 * SpawnFlash -- expanding circle that fades out.
 * Used as a visual indicator when enemies spawn.
 * Self-destructs after FLASH_DURATION seconds.
 */

import { Graphics, Container } from 'pixi.js';

/** Total animation time (seconds). */
const FLASH_DURATION = 0.4;

/** Maximum radius the circle expands to (pixels). */
const FLASH_MAX_RADIUS = 30;

/**
 * Spawn a flash effect (expanding, fading circle) at the given position.
 * Self-destructs via requestAnimationFrame after FLASH_DURATION.
 *
 * @param container - PixiJS container to add effect to (world container)
 * @param x - world X position (pixels)
 * @param y - world Y position (pixels)
 * @param color - fill color (default white)
 */
export function spawnFlash(
  container: Container,
  x: number,
  y: number,
  color = 0xffffff,
): void {
  const gfx = new Graphics();
  gfx.x = x;
  gfx.y = y;
  container.addChild(gfx);

  const startTime = performance.now();

  function animate(): void {
    const elapsed = (performance.now() - startTime) / 1000;
    // t goes from 0 to 1 over FLASH_DURATION
    const t = elapsed / FLASH_DURATION;

    if (t >= 1) {
      container.removeChild(gfx);
      gfx.destroy();
      return;
    }

    // Expand radius linearly, fade alpha linearly
    const radius = t * FLASH_MAX_RADIUS;
    gfx.clear();
    gfx.circle(0, 0, radius);
    gfx.fill({ color, alpha: 1 - t });
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
