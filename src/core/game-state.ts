/**
 * GameState -- persistent player state that survives across levels.
 * Tracks scrap currency and equipped weapon. Reset partially on death.
 */

import type { WeaponId } from '../combat/weapon-defs.js';

export interface GameState {
  scrap: number;
  equippedWeapon: WeaponId | null;
}

/** Fraction of scrap lost on death (0.5 = lose half). */
const DEATH_SCRAP_PENALTY = 0.5;

/** Create a fresh GameState with zero scrap and no weapon. */
export function createGameState(): GameState {
  return { scrap: 0, equippedWeapon: null };
}

/**
 * Apply the death penalty: lose equipped weapon and half of scrap.
 * Called when the player dies and returns to planet select.
 */
export function applyDeathPenalty(state: GameState): void {
  state.equippedWeapon = null;
  state.scrap = Math.floor(state.scrap * (1 - DEATH_SCRAP_PENALTY));
}

/** Add scrap currency to the player's state. */
export function addScrap(state: GameState, amount: number): void {
  state.scrap += amount;
}
