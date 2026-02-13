/**
 * Sprite animation utilities – extract frames from spritesheets and
 * create AnimatedSprite instances.
 *
 * All Ansimuz assets use horizontal strip format (one row per sheet).
 * The pixel robot uses a 2-row layout (idle top, run bottom).
 */

import { Texture, Rectangle, AnimatedSprite } from 'pixi.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for one animation within a spritesheet. */
export interface FrameConfig {
  /** Name of this animation state (e.g. 'idle', 'run'). */
  name: string;
  /** Row index in the spritesheet (0-based). */
  row: number;
  /** Number of frames in this animation. */
  frameCount: number;
  /** Playback speed in frames per second. */
  fps: number;
  /** Whether this animation loops. */
  loop: boolean;
}

/** Full spritesheet layout description. */
export interface SpritesheetConfig {
  /** Width of a single frame in pixels. */
  frameWidth: number;
  /** Height of a single frame in pixels. */
  frameHeight: number;
  /** Animation definitions. */
  animations: FrameConfig[];
}

/** A named set of animations ready for use. */
export interface AnimationSet {
  [animName: string]: {
    frames: Texture[];
    fps: number;
    loop: boolean;
  };
}

// ---------------------------------------------------------------------------
// Frame Extraction
// ---------------------------------------------------------------------------

/**
 * Extract a horizontal strip of frames from a texture.
 *
 * @param baseTexture - the full spritesheet texture
 * @param frameWidth  - width of each frame in pixels
 * @param frameHeight - height of each frame in pixels
 * @param row         - row index (0-based, for multi-row sheets)
 * @param count       - number of frames to extract
 * @param offsetX     - horizontal pixel offset for the first frame (default 0)
 * @param strideX     - horizontal stride between frames (defaults to frameWidth)
 * @returns array of Texture frames
 */
export function extractFrames(
  baseTexture: Texture,
  frameWidth: number,
  frameHeight: number,
  row: number = 0,
  count: number = 1,
  offsetX: number = 0,
  strideX?: number,
): Texture[] {
  const stride = strideX ?? frameWidth;
  const frames: Texture[] = [];
  for (let i = 0; i < count; i++) {
    const rect = new Rectangle(
      offsetX + i * stride,
      row * frameHeight,
      frameWidth,
      frameHeight,
    );
    frames.push(new Texture({ source: baseTexture.source, frame: rect }));
  }
  return frames;
}

/**
 * Build a complete AnimationSet from a spritesheet texture and config.
 *
 * @param baseTexture - the full spritesheet texture
 * @param config      - layout and animation definitions
 * @returns a map of animation name → frames + playback info
 */
export function createAnimationSet(
  baseTexture: Texture,
  config: SpritesheetConfig,
): AnimationSet {
  const result: AnimationSet = {};
  for (const anim of config.animations) {
    result[anim.name] = {
      frames: extractFrames(
        baseTexture,
        config.frameWidth,
        config.frameHeight,
        anim.row,
        anim.frameCount,
      ),
      fps: anim.fps,
      loop: anim.loop,
    };
  }
  return result;
}

/**
 * Create an AnimatedSprite from an array of frame textures.
 *
 * @param frames         - texture frames for the animation
 * @param animationSpeed - PixiJS animation speed (default 0.15)
 * @returns a configured AnimatedSprite
 */
export function createAnimatedEntity(
  frames: Texture[],
  animationSpeed: number = 0.15,
): AnimatedSprite {
  const sprite = new AnimatedSprite(frames);
  sprite.animationSpeed = animationSpeed;
  sprite.anchor.set(0.5, 0.5);
  sprite.play();
  return sprite;
}
