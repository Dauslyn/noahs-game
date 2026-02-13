/**
 * Game actions and key bindings.
 *
 * Defines the logical actions the player can perform and maps them to
 * physical key codes. Helper functions query the InputManager using
 * the binding table so gameplay code never deals with raw key codes.
 */

import type { InputManager } from './input-manager.js';

// ---------------------------------------------------------------------------
// Action enum
// ---------------------------------------------------------------------------

/** Logical player actions. */
export enum Action {
  MoveLeft = 'move-left',
  MoveRight = 'move-right',
  Jump = 'jump',
  Down = 'down',
}

// ---------------------------------------------------------------------------
// Key bindings
// ---------------------------------------------------------------------------

/**
 * Maps each action to one or more KeyboardEvent.code values.
 * Players can use either arrow keys or WASD.
 */
export const KEY_BINDINGS: Record<Action, string[]> = {
  [Action.MoveLeft]: ['ArrowLeft', 'KeyA'],
  [Action.MoveRight]: ['ArrowRight', 'KeyD'],
  [Action.Jump]: ['ArrowUp', 'KeyW', 'Space'],
  [Action.Down]: ['ArrowDown', 'KeyS'],
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Check if any key bound to the given action is currently held down.
 *
 * @param action - the logical game action
 * @param input  - the InputManager instance
 * @returns true if at least one bound key is down
 */
export function isActionDown(action: Action, input: InputManager): boolean {
  const keys = KEY_BINDINGS[action];
  for (const code of keys) {
    if (input.isDown(code)) return true;
  }
  return false;
}

/**
 * Check if any key bound to the given action was just pressed this frame.
 *
 * @param action - the logical game action
 * @param input  - the InputManager instance
 * @returns true if at least one bound key was pressed this frame
 */
export function isActionJustPressed(
  action: Action,
  input: InputManager,
): boolean {
  const keys = KEY_BINDINGS[action];
  for (const code of keys) {
    if (input.isJustPressed(code)) return true;
  }
  return false;
}
