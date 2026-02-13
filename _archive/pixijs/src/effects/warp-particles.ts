/**
 * WarpParticles -- burst of purple circles scattering outward from a point.
 * Self-destructs after PARTICLE_DURATION seconds via requestAnimationFrame.
 * Used for Phantom enemy warp-in / warp-out visual feedback.
 */

import { Graphics, Container } from 'pixi.js';

/** Number of particles in the radial burst. */
const PARTICLE_COUNT = 8;

/** Total lifetime of particles (seconds). */
const PARTICLE_DURATION = 0.5;

/** Outward scatter speed (pixels per second). */
const SCATTER_SPEED = 80;

/** Radius of each particle circle (pixels). */
const PARTICLE_SIZE = 3;

/** Purple color matching Phantom's visual theme. */
const PARTICLE_COLOR = 0xcc44ff;

/**
 * Spawn a burst of purple warp particles at the given world position.
 * Particles scatter radially outward and fade to zero alpha.
 *
 * @param container - PixiJS world container to add particles to
 * @param x - world X position (pixels)
 * @param y - world Y position (pixels)
 */
export function spawnWarpParticles(
  container: Container,
  x: number,
  y: number,
): void {
  const particles: { gfx: Graphics; vx: number; vy: number }[] = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Distribute evenly around a full circle
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
    const gfx = new Graphics();
    gfx.circle(0, 0, PARTICLE_SIZE);
    gfx.fill(PARTICLE_COLOR);
    gfx.x = x;
    gfx.y = y;
    container.addChild(gfx);
    particles.push({
      gfx,
      vx: Math.cos(angle) * SCATTER_SPEED,
      vy: Math.sin(angle) * SCATTER_SPEED,
    });
  }

  const startTime = performance.now();
  let lastTime = startTime;

  function animate(): void {
    const now = performance.now();
    const frameDt = (now - lastTime) / 1000;
    lastTime = now;

    // Normalised progress: 0 at start, 1 at PARTICLE_DURATION
    const t = (now - startTime) / 1000 / PARTICLE_DURATION;

    if (t >= 1) {
      // Cleanup: remove and destroy all particle graphics
      for (const p of particles) {
        container.removeChild(p.gfx);
        p.gfx.destroy();
      }
      return;
    }

    for (const p of particles) {
      // Scatter outward each frame
      p.gfx.x += p.vx * frameDt;
      p.gfx.y += p.vy * frameDt;
      // Linear fade from full opacity to zero
      p.gfx.alpha = 1 - t;
    }
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
