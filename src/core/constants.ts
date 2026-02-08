/**
 * Game-wide constants for Noah's Game.
 *
 * All physics values use SI units (metres, seconds) unless noted.
 * Pixel values are explicitly labelled.
 */

// ---------------------------------------------------------------------------
// Rendering / Viewport
// ---------------------------------------------------------------------------

/** Logical game width in pixels. */
export const SCREEN_WIDTH = 1280;

/** Logical game height in pixels. */
export const SCREEN_HEIGHT = 720;

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------

/** Conversion factor: 1 metre = 50 pixels. */
export const PIXELS_PER_METER = 50;

/** Fixed timestep for the physics simulation (seconds). */
export const PHYSICS_TIMESTEP = 1 / 60;

/** Gravitational acceleration (m/s^2, positive = downward in Y-down). */
export const GRAVITY = 9.81;

// ---------------------------------------------------------------------------
// Player Movement
// ---------------------------------------------------------------------------

/** Horizontal run speed (m/s). */
export const PLAYER_SPEED = 6;

/** Vertical impulse applied on jump (m/s, negative = upward in Y-down). */
export const PLAYER_JUMP_IMPULSE = -8;

/** Horizontal impulse when wall-jumping (m/s, away from wall). */
export const WALL_JUMP_IMPULSE_X = 5;

/** Vertical impulse when wall-jumping (m/s, negative = upward). */
export const WALL_JUMP_IMPULSE_Y = -7;

/** Max fall speed while sliding down a wall (m/s). */
export const WALL_SLIDE_SPEED = 2;

// ---------------------------------------------------------------------------
// Mech Companion
// ---------------------------------------------------------------------------

/** Distance from player centre to orbiting mech (pixels). */
export const MECH_ORBIT_RADIUS = 40;

/** Angular speed of mech orbit (radians / second). */
export const MECH_ORBIT_SPEED = 2;

// ---------------------------------------------------------------------------
// Weapons – Laser (default)
// ---------------------------------------------------------------------------

/** Projectile travel speed (m/s). */
export const LASER_SPEED = 15;

/** Damage per laser hit. */
export const LASER_DAMAGE = 10;

/** Shots per second. */
export const LASER_FIRE_RATE = 3;

/** Maximum travel distance before despawn (pixels). */
export const LASER_RANGE = 300;

// ---------------------------------------------------------------------------
// Health & Combat
// ---------------------------------------------------------------------------

/** Starting / max player health. */
export const PLAYER_MAX_HEALTH = 100;

/** Duration of post-hit invincibility (seconds). */
export const INVINCIBILITY_DURATION = 1.0;

/** Delay before player respawns after death (seconds). */
export const RESPAWN_DELAY = 2.0;
