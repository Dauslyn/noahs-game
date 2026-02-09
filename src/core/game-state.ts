/**
 * GameState -- persistent player state that survives across levels.
 * Tracks scrap currency, equipped weapon, permanent unlocks, and
 * per-run consumables. Reset partially on death.
 */

import type { WeaponId } from '../combat/weapon-defs.js';

export interface GameState {
  scrap: number;
  equippedWeapon: WeaponId | null;

  /** Permanently unlocked weapons (never lost on death). */
  unlockedWeapons: Set<WeaponId>;
  /** Ship tier determines which planets are accessible. */
  shipTier: number;

  /** Per-run: absorbs the next hit, then consumed. Lost on death. */
  shieldCharge: boolean;
  /** Per-run: auto-heals to full at <25% HP, then consumed. Lost on death. */
  repairKit: boolean;
}

/** Fraction of scrap lost on death (0.5 = lose half). */
const DEATH_SCRAP_PENALTY = 0.5;

/** Create a fresh GameState with laser unlocked and ship tier 1. */
export function createGameState(): GameState {
  return {
    scrap: 0,
    equippedWeapon: null,
    unlockedWeapons: new Set<WeaponId>(['laser']),
    shipTier: 1,
    shieldCharge: false,
    repairKit: false,
  };
}

/**
 * Apply the death penalty: lose equipped weapon, consumables, and
 * half of scrap. Permanent unlocks (weapons, ship tier) are kept.
 */
export function applyDeathPenalty(state: GameState): void {
  state.equippedWeapon = null;
  state.shieldCharge = false;
  state.repairKit = false;
  state.scrap = Math.floor(state.scrap * (1 - DEATH_SCRAP_PENALTY));
}

/** Add scrap currency to the player's state. */
export function addScrap(state: GameState, amount: number): void {
  state.scrap += amount;
}
