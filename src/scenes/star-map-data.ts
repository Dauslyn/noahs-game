/**
 * Star system definitions for the star map.
 * Each star has a position on the map, connected neighbors, and planets.
 */

import type { LevelData } from '../level/level-data.js';
import { ALL_LEVELS } from '../level/extra-levels.js';

export interface StarSystem {
  /** Unique id for this star. */
  id: string;
  /** Display name on the map. */
  name: string;
  /** Position on the star map (0-1 normalised, mapped to screen). */
  x: number;
  y: number;
  /** Colour tint for the star dot. */
  color: number;
  /** IDs of connected stars (travel lanes). */
  connections: string[];
  /** Minimum ship tier to travel here. */
  tierRequired: number;
  /** Index into ALL_LEVELS for the planet at this star. */
  levelIndex: number;
}

/** All star systems in the game. */
export const STAR_SYSTEMS: StarSystem[] = [
  {
    id: 'sol-station',
    name: 'Sol Station',
    x: 0.2, y: 0.5,
    color: 0xffffff,
    connections: ['crystallis'],
    tierRequired: 1,
    levelIndex: 0,
  },
  {
    id: 'crystallis',
    name: 'Crystallis',
    x: 0.5, y: 0.3,
    color: 0xcccc44,
    connections: ['sol-station', 'neon-prime'],
    tierRequired: 2,
    levelIndex: 1,
  },
  {
    id: 'neon-prime',
    name: 'Neon Prime',
    x: 0.8, y: 0.55,
    color: 0xcc4444,
    connections: ['crystallis'],
    tierRequired: 2,
    levelIndex: 2,
  },
];

/** Look up the LevelData for a star system. */
export function getLevelForStar(star: StarSystem): LevelData {
  return ALL_LEVELS[star.levelIndex];
}
