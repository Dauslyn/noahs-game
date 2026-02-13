/**
 * FloatText -- spawns a short-lived text that floats upward and fades out.
 * Used for "+5" scrap popups on enemy kill.
 */

import { Text, TextStyle, Container } from 'pixi.js';

/** Upward drift speed (pixels per second). */
const FLOAT_SPEED = 40;

/** Total duration before removal (seconds). */
const FLOAT_DURATION = 1.0;

const FLOAT_STYLE = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 14,
  fill: 0xffcc00,
  fontWeight: 'bold',
});

/**
 * Spawn a floating text at the given world position.
 * Self-destructs after FLOAT_DURATION seconds via requestAnimationFrame.
 *
 * @param container - PixiJS container to add text to (world container)
 * @param x - world X position (pixels)
 * @param y - world Y position (pixels)
 * @param message - text to display (e.g. "+5")
 */
export function spawnFloatText(
  container: Container,
  x: number,
  y: number,
  message: string,
): void {
  const text = new Text({ text: message, style: FLOAT_STYLE });
  text.anchor.set(0.5, 0.5);
  text.x = x;
  text.y = y;

  container.addChild(text);

  const startTime = performance.now();
  const startY = y;

  function animate(): void {
    const elapsed = (performance.now() - startTime) / 1000;

    // Drift upward over time: y = startY - speed * elapsed
    text.y = startY - FLOAT_SPEED * elapsed;

    // Fade from full opacity to zero over FLOAT_DURATION
    text.alpha = Math.max(0, 1 - elapsed / FLOAT_DURATION);

    if (elapsed >= FLOAT_DURATION) {
      container.removeChild(text);
      text.destroy();
      return;
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
