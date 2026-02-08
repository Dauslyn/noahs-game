/**
 * InputManager -- tracks keyboard state for the game loop.
 *
 * Uses `event.code` (e.g. 'KeyW', 'ArrowUp') for layout-independent
 * key detection. Maintains three sets:
 *   - keysDown:         currently held keys
 *   - keysJustPressed:  keys pressed this frame (cleared each update)
 *   - keysJustReleased: keys released this frame (cleared each update)
 *
 * Call `update()` at the START of each frame to clear the "just" sets.
 * Call `destroy()` when tearing down to remove event listeners.
 */

/** Set of key codes that the game uses and should preventDefault on. */
const GAME_KEYS = new Set<string>([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'Space',
]);

export class InputManager {
  /** Keys currently held down. */
  private readonly keysDown = new Set<string>();

  /** Keys that were pressed this frame (cleared each update()). */
  private keysJustPressed = new Set<string>();

  /** Keys that were released this frame (cleared each update()). */
  private keysJustReleased = new Set<string>();

  /** Bound handler references so we can remove them in destroy(). */
  private readonly handleKeyDown: (e: KeyboardEvent) => void;
  private readonly handleKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleKeyUp = this.onKeyUp.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Check if a key is currently held down.
   * @param code - KeyboardEvent.code value (e.g. 'KeyW', 'ArrowLeft')
   */
  isDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  /**
   * Check if a key was pressed this frame.
   * @param code - KeyboardEvent.code value
   */
  isJustPressed(code: string): boolean {
    return this.keysJustPressed.has(code);
  }

  /**
   * Check if a key was released this frame.
   * @param code - KeyboardEvent.code value
   */
  isJustReleased(code: string): boolean {
    return this.keysJustReleased.has(code);
  }

  /**
   * Called at the START of each frame to clear per-frame state.
   * Must be invoked before any gameplay code reads input.
   */
  update(): void {
    this.keysJustPressed = new Set<string>();
    this.keysJustReleased = new Set<string>();
  }

  /**
   * Remove all event listeners. Call when shutting down the game.
   */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  /**
   * Handle keydown events.
   * Prevents default for game keys (arrow keys, WASD, space) to avoid
   * browser scrolling while playing.
   * Ignores repeat events (key held down) for justPressed tracking.
   */
  private onKeyDown(e: KeyboardEvent): void {
    if (GAME_KEYS.has(e.code)) {
      e.preventDefault();
    }

    // Ignore auto-repeat; only register the initial press
    if (e.repeat) return;

    this.keysDown.add(e.code);
    this.keysJustPressed.add(e.code);
  }

  /**
   * Handle keyup events.
   * Prevents default for game keys for consistency.
   */
  private onKeyUp(e: KeyboardEvent): void {
    if (GAME_KEYS.has(e.code)) {
      e.preventDefault();
    }

    this.keysDown.delete(e.code);
    this.keysJustReleased.add(e.code);
  }
}
