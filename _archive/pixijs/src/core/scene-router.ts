/**
 * SceneRouter -- manages scene lifecycle and transitions.
 * Extracted from Game class to keep game.ts under 250 lines.
 */

export type SceneId = 'ship' | 'star-map' | 'gameplay';

/**
 * Minimal scene state tracker. The actual scene lifecycle
 * (creating/destroying containers) stays in Game, but this
 * module tracks which scene is active and handles valid transitions.
 */
export class SceneRouter {
  private current: SceneId = 'ship';

  /** The currently active scene. */
  get activeScene(): SceneId {
    return this.current;
  }

  /** Transition to a new scene. */
  transitionTo(target: SceneId): void {
    this.current = target;
  }

  /** True when the ECS game loop should tick. */
  get gameplayActive(): boolean {
    return this.current === 'gameplay';
  }
}
