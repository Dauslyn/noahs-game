/**
 * Entry point for Noah's Game.
 *
 * Creates the Game instance, initialises all subsystems (PixiJS,
 * Rapier, ECS, input), and starts the game loop.
 */

import { Game } from './core/game.js';

(async (): Promise<void> => {
  const game = new Game();
  await game.init();
  console.log('[Noah\'s Game] Game started!');
})();
