/**
 * Shop item definitions — everything the player can buy at the hub.
 *
 * Three categories:
 *   weapon-unlock  — permanently unlock a weapon (one-time purchase)
 *   consumable     — per-run item, lost on death (repeatable)
 *   ship-upgrade   — permanently raise ship tier (one-time purchase)
 */

import type { WeaponId } from '../combat/weapon-defs.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Unique identifiers for every shop item. */
export type ShopItemId =
  | 'unlock-rockets'
  | 'unlock-plasma'
  | 'shield-charge'
  | 'repair-kit'
  | 'ship-tier-2';

/** Item category determines purchase rules and persistence. */
export type ShopCategory = 'weapon-unlock' | 'consumable' | 'ship-upgrade';

/** Full definition for a single shop item. */
export interface ShopItem {
  /** Unique identifier. */
  id: ShopItemId;
  /** Display name shown in the shop UI. */
  name: string;
  /** Short description shown on hover or below the name. */
  description: string;
  /** Scrap cost to purchase. */
  cost: number;
  /** Category — determines purchase rules. */
  category: ShopCategory;
  /** Can this item be purchased more than once? */
  repeatable: boolean;
  /** For weapon-unlock items, which weapon does it unlock? */
  unlocksWeapon?: WeaponId;
  /** For ship-upgrade items, what tier does it grant? */
  grantsShipTier?: number;
}

// ---------------------------------------------------------------------------
// Item registry
// ---------------------------------------------------------------------------

/** All shop items in display order. */
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'shield-charge',
    name: 'Shield Charge',
    description: 'Absorbs the next hit you take.',
    cost: 40,
    category: 'consumable',
    repeatable: true,
  },
  {
    id: 'repair-kit',
    name: 'Repair Kit',
    description: 'Auto-heals to full at low HP.',
    cost: 50,
    category: 'consumable',
    repeatable: true,
  },
  {
    id: 'unlock-rockets',
    name: 'Rocket Launcher',
    description: 'Permanently unlock rockets.',
    cost: 150,
    category: 'weapon-unlock',
    repeatable: false,
    unlocksWeapon: 'rockets',
  },
  {
    id: 'unlock-plasma',
    name: 'Plasma Repeater',
    description: 'Permanently unlock plasma.',
    cost: 120,
    category: 'weapon-unlock',
    repeatable: false,
    unlocksWeapon: 'plasma',
  },
  {
    id: 'ship-tier-2',
    name: 'Ship Tier 2',
    description: 'Unlocks Crystal Caverns & Neon Outpost.',
    cost: 300,
    category: 'ship-upgrade',
    repeatable: false,
    grantsShipTier: 2,
  },
];

/** Look up a shop item by its id. */
export function getShopItem(id: ShopItemId): ShopItem {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown shop item: ${id}`);
  return item;
}
