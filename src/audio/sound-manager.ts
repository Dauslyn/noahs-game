/**
 * SoundManager -- centralised audio playback using Howler.js.
 *
 * Loads all game sound effects once during initialisation and provides
 * a simple `play(name)` API for systems to trigger sounds.
 *
 * Gracefully handles missing sounds and load failures so the game
 * never crashes due to audio issues.
 */

import { Howl, Howler } from 'howler';

/** Definition for a single sound effect to be preloaded. */
interface SoundDef {
  name: string;
  src: string[];
  volume: number;
}

export class SoundManager {
  /** Map of sound name -> loaded Howl instance. */
  private sounds: Map<string, Howl> = new Map();

  /** Whether loadAll() has been called. */
  private initialized = false;

  /**
   * Load all game sound effects. Call once during game init.
   * Uses Kenney Digital SFX pack (CC0 MP3 files).
   * Individual load failures are caught and logged without crashing.
   */
  loadAll(): void {
    const soundDefs: SoundDef[] = [
      { name: 'jump', src: ['/assets/sounds/phaseJump1.mp3'], volume: 0.4 },
      { name: 'laser', src: ['/assets/sounds/laser5.mp3'], volume: 0.25 },
      { name: 'hit', src: ['/assets/sounds/spaceTrash2.mp3'], volume: 0.5 },
      { name: 'death', src: ['/assets/sounds/phaserDown2.mp3'], volume: 0.6 },
      { name: 'enemy-death', src: ['/assets/sounds/zapThreeToneDown.mp3'], volume: 0.35 },
      { name: 'powerup', src: ['/assets/sounds/powerUp3.mp3'], volume: 0.4 },
      { name: 'land', src: ['/assets/sounds/pepSound1.mp3'], volume: 0.15 },
    ];

    for (const def of soundDefs) {
      try {
        this.sounds.set(
          def.name,
          new Howl({ src: def.src, volume: def.volume }),
        );
      } catch (e) {
        console.warn(`[SoundManager] Failed to load sound: ${def.name}`, e);
      }
    }

    this.initialized = true;
    console.log(
      `[SoundManager] Loaded ${this.sounds.size} sounds (initialized=${this.initialized})`,
    );
  }

  /**
   * Play a sound effect by name.
   * Silently ignores unknown names so callers don't need to guard.
   *
   * @param name - the registered sound name (e.g. 'jump', 'laser')
   */
  play(name: string): void {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.play();
    }
  }

  /**
   * Set the volume for a specific sound effect.
   *
   * @param name - the registered sound name
   * @param vol  - volume level, clamped to 0-1
   */
  setVolume(name: string, vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    const sound = this.sounds.get(name);
    if (sound) {
      sound.volume(clamped);
    }
  }

  /**
   * Set the global master volume for all sounds.
   *
   * @param vol - master volume level, clamped to 0-1
   */
  setMasterVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    Howler.volume(clamped);
  }
}
