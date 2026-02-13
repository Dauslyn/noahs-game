/**
 * Shop purchase logic — pure functions that read/modify GameState.
 *
 * All functions are side-effect-free except `buyItem()` which mutates
 * the provided GameState (consistent with the existing pattern in
 * game-state.ts where `applyDeathPenalty` and `addScrap` mutate state).
 */

import type { GameState } from '../core/game-state.js';
import type { ShopItem, ShopItemId } from './shop-defs.js';
import { SHOP_ITEMS, getShopItem } from './shop-defs.js';

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Check whether the player already owns a non-repeatable item.
 * - weapon-unlock: owned if weapon is in unlockedWeapons
 * - ship-upgrade: owned if shipTier >= granted tier
 * - consumable: "owned" if already active this run
 */
export function isOwned(item: ShopItem, state: GameState): boolean {
  switch (item.category) {
    case 'weapon-unlock':
      return item.unlocksWeapon
        ? state.unlockedWeapons.has(item.unlocksWeapon)
        : false;
    case 'ship-upgrade':
      return item.grantsShipTier
        ? state.shipTier >= item.grantsShipTier
        : false;
    case 'consumable':
      return isConsumableActive(item.id, state);
    default:
      return false;
  }
}

/** Check if a consumable is currently active (already bought this run). */
function isConsumableActive(id: ShopItemId, state: GameState): boolean {
  if (id === 'shield-charge') return state.shieldCharge;
  if (id === 'repair-kit') return state.repairKit;
  return false;
}

/**
 * Determine whether the player can buy a specific item right now.
 * Returns a reason string if they can't, or null if purchase is valid.
 */
export function canBuy(
  item: ShopItem, state: GameState,
): string | null {
  if (state.scrap < item.cost) return 'Not enough scrap';
  if (!item.repeatable && isOwned(item, state)) return 'Already owned';
  if (item.repeatable && isOwned(item, state)) return 'Already active';
  return null;
}

/**
 * Purchase an item: deduct scrap and apply the effect.
 * Caller should check `canBuy()` first — this will throw if invalid.
 */
export function buyItem(item: ShopItem, state: GameState): void {
  const reason = canBuy(item, state);
  if (reason) throw new Error(`Cannot buy ${item.name}: ${reason}`);

  state.scrap -= item.cost;

  switch (item.category) {
    case 'weapon-unlock':
      if (item.unlocksWeapon) {
        state.unlockedWeapons.add(item.unlocksWeapon);
      }
      break;
    case 'ship-upgrade':
      if (item.grantsShipTier && item.grantsShipTier > state.shipTier) {
        state.shipTier = item.grantsShipTier;
      }
      break;
    case 'consumable':
      applyConsumable(item.id, state);
      break;
  }
}

/** Activate a consumable on the current run. */
function applyConsumable(id: ShopItemId, state: GameState): void {
  if (id === 'shield-charge') state.shieldCharge = true;
  if (id === 'repair-kit') state.repairKit = true;
}

/**
 * Return all shop items with their current buyability status.
 * Useful for the shop UI to render enabled/disabled/owned states.
 */
export function getShopDisplay(state: GameState): Array<{
  item: ShopItem;
  owned: boolean;
  reason: string | null;
}> {
  return SHOP_ITEMS.map((item) => ({
    item,
    owned: isOwned(item, state),
    reason: canBuy(item, state),
  }));
}
