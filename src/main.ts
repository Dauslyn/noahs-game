import { Application } from 'pixi.js';

/** Dark blue background color for the space theme */
const BACKGROUND_COLOR = 0x0a0a2e;

/**
 * Bootstrap the game application.
 * Initializes PixiJS, appends the canvas to the DOM,
 * and will eventually start the game loop.
 */
(async (): Promise<void> => {
  const app = new Application();

  await app.init({
    background: BACKGROUND_COLOR,
    resizeTo: window,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  const container = document.getElementById('game-container');

  if (!container) {
    throw new Error('Could not find #game-container element in the DOM');
  }

  container.appendChild(app.canvas);

  console.log(
    `[Noah's Game] PixiJS ${app.renderer.type} renderer initialized ` +
    `(${app.screen.width}x${app.screen.height})`
  );
})();
