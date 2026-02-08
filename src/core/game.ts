/**
 * Game – top-level orchestrator that wires together PixiJS, Rapier,
 * the ECS world, input, systems, level, and player.
 *
 * Usage:
 *   const game = new Game();
 *   await game.init();
 */

import { Application, Container } from 'pixi.js';
import type { System } from './types.js';
import { World } from './world.js';
import { PhysicsContext } from './physics.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './constants.js';
import { InputManager } from '../input/input-manager.js';
import { PhysicsSystem } from '../systems/physics-system.js';
import { PlayerMovementSystem } from '../systems/player-movement-system.js';
import { CameraSystem } from '../systems/camera-system.js';
import { RenderSystem } from '../systems/render-system.js';
import { MechFollowSystem } from '../systems/mech-follow-system.js';
import { WeaponSystem } from '../systems/weapon-system.js';
import { ProjectileSystem } from '../systems/projectile-system.js';
import { PROTOTYPE_LEVEL } from '../level/level-data.js';
import { buildLevel } from '../level/level-builder.js';
import { createPlayerEntity } from '../entities/create-player.js';
import { createMechEntity } from '../entities/create-mech.js';

/** Dark blue background color for the space theme. */
const BACKGROUND_COLOR = 0x0a0a2e;

export class Game {
  private app!: Application;
  private world!: World;
  private physicsCtx!: PhysicsContext;
  private systems: System[] = [];
  private inputManager!: InputManager;

  /** World-space container (moves with the camera). */
  public worldContainer!: Container;

  /** UI-space container (fixed on screen). */
  public uiContainer!: Container;

  /**
   * Initialise all subsystems and start the game loop.
   *
   * Must be awaited because PixiJS and Rapier WASM both require
   * asynchronous initialisation.
   */
  async init(): Promise<void> {
    // 1. Init PixiJS
    this.app = new Application();
    await this.app.init({
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      backgroundColor: BACKGROUND_COLOR,
      resizeTo: window,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    const container = document.getElementById('game-container');
    if (!container) {
      throw new Error('Could not find #game-container element in the DOM');
    }
    container.appendChild(this.app.canvas);

    // 2. Init Rapier2D (WASM)
    this.physicsCtx = await PhysicsContext.create();

    // 3. Create ECS world
    this.world = new World();

    // 4. Stage hierarchy: worldContainer (camera-affected) + uiContainer (fixed)
    this.worldContainer = new Container();
    this.uiContainer = new Container();
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.uiContainer);

    // 5. Input
    this.inputManager = new InputManager();

    // 6. Build level
    const levelData = PROTOTYPE_LEVEL;
    buildLevel(levelData, this.world, this.physicsCtx, this.worldContainer);

    // 7. Create player at the level's spawn point
    const playerEntity = createPlayerEntity(
      this.world,
      this.physicsCtx,
      this.worldContainer,
      levelData.playerSpawn.x,
      levelData.playerSpawn.y,
    );

    // 7b. Create mech companion orbiting the player
    createMechEntity(
      this.world,
      this.worldContainer,
      playerEntity,
      levelData.playerSpawn.x,
      levelData.playerSpawn.y,
    );

    // 8. Register systems (sorted by priority after each add)
    const levelBounds = {
      x: 0,
      y: 0,
      width: levelData.width,
      height: levelData.height,
    };

    this.addSystem(new PhysicsSystem(this.physicsCtx));
    this.addSystem(new PlayerMovementSystem(this.physicsCtx, this.inputManager));
    this.addSystem(new MechFollowSystem());
    this.addSystem(new WeaponSystem(this.physicsCtx, this.worldContainer));
    this.addSystem(new ProjectileSystem(this.physicsCtx, this.worldContainer));
    this.addSystem(new CameraSystem(this.worldContainer, levelBounds));
    this.addSystem(new RenderSystem(this.worldContainer));

    // 9. Start the game loop
    this.app.ticker.add((ticker) => {
      // Cap dt to prevent physics explosion after tab-away
      const dt = Math.min(ticker.deltaMS / 1000, 0.1);
      this.inputManager.update();

      for (const system of this.systems) {
        system.update(this.world, dt);
      }
    });

    console.log(
      `[Noah's Game] Initialized – ` +
        `${this.world.entityCount} entities, ` +
        `${this.systems.length} systems`,
    );
  }

  /**
   * Register a system and keep the array sorted by priority (low first).
   *
   * @param system - the system to add
   */
  addSystem(system: System): void {
    this.systems.push(system);
    this.systems.sort((a, b) => a.priority - b.priority);
  }
}
