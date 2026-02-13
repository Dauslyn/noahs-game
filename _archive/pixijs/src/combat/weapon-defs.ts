/**
 * Weapon registry — defines all weapon types the mech can equip.
 *
 * Each WeaponDef carries the stats used by the combat systems plus
 * a ProjectileStyle that renderers use for visual differentiation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All weapon identifiers available in the game. */
export type WeaponId = 'laser' | 'rockets' | 'plasma';

/** Visual parameters for rendering a projectile. */
export interface ProjectileStyle {
  /** Bright inner colour (hex). */
  coreColor: number;
  /** Softer outer glow colour (hex). */
  glowColor: number;
  /** Projectile width in pixels. */
  width: number;
  /** Projectile height in pixels. */
  height: number;
}

/** Complete weapon definition — stats + visuals. */
export interface WeaponDef {
  /** Unique identifier. */
  id: WeaponId;
  /** Human-readable display name. */
  name: string;
  /** Short flavour text for loadout UI. */
  description: string;
  /** Damage dealt per projectile hit. */
  damage: number;
  /** Shots per second. */
  fireRate: number;
  /** Maximum projectile travel distance (pixels). */
  range: number;
  /** Projectile speed (m/s). */
  projectileSpeed: number;
  /** Visual style for projectile rendering. */
  style: ProjectileStyle;
}

// ---------------------------------------------------------------------------
// Weapon definitions
// ---------------------------------------------------------------------------

/**
 * Master registry of all weapons, keyed by WeaponId.
 *
 * Laser  — balanced default; cyan projectiles.
 * Rockets — slow, heavy hitters; orange/red projectiles.
 * Plasma — rapid-fire, short-range; purple projectiles.
 */
export const WEAPON_DEFS: Record<WeaponId, WeaponDef> = {
  laser: {
    id: 'laser',
    name: 'Laser Blaster',
    description: 'Standard-issue energy weapon. Reliable and accurate.',
    damage: 10,
    fireRate: 3,
    range: 400,
    projectileSpeed: 15,
    style: {
      coreColor: 0x00ffff,
      glowColor: 0x00aaff,
      width: 12,
      height: 4,
    },
  },
  rockets: {
    id: 'rockets',
    name: 'Rocket Launcher',
    description: 'Slow-firing ordnance that packs a serious punch.',
    damage: 30,
    fireRate: 1,
    range: 500,
    projectileSpeed: 8,
    style: {
      coreColor: 0xff6600,
      glowColor: 0xff3300,
      width: 16,
      height: 8,
    },
  },
  plasma: {
    id: 'plasma',
    name: 'Plasma Repeater',
    description: 'Rapid-fire bursts of superheated plasma. Short range.',
    damage: 6,
    fireRate: 6,
    range: 250,
    projectileSpeed: 20,
    style: {
      coreColor: 0xcc44ff,
      glowColor: 0x8800cc,
      width: 10,
      height: 6,
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ordered list of all weapon ids (useful for UI iteration). */
export const ALL_WEAPON_IDS: WeaponId[] = ['laser', 'rockets', 'plasma'];

/**
 * Look up a weapon definition by id.
 * @param id - The weapon identifier to retrieve.
 * @returns The matching WeaponDef.
 */
export function getWeaponDef(id: WeaponId): WeaponDef {
  return WEAPON_DEFS[id];
}
