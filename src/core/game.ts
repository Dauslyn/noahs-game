/** Game – top-level orchestrator. Scene transitions: hub ↔ gameplay. */

import { Application, Container } from 'pixi.js';
import type { System } from './types.js';
import { World } from './world.js';
import { PhysicsContext } from './physics.js';
import { EntityManager } from './entity-manager.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './constants.js';
import { InputManager } from '../input/input-manager.js';
import { loadAllAssets } from './asset-loader.js';
import { LoadingScreen } from '../ui/loading-screen.js';
import { HubScreen } from '../ui/hub-screen.js';
import { PhysicsSystem } from '../systems/physics-system.js';
import { PlayerMovementSystem } from '../systems/player-movement-system.js';
import { CameraSystem } from '../systems/camera-system.js';
import { RenderSystem } from '../systems/render-system.js';
import { MechFollowSystem } from '../systems/mech-follow-system.js';
import { WeaponSystem } from '../systems/weapon-system.js';
import { ProjectileSystem } from '../systems/projectile-system.js';
import { EnemyAISystem } from '../systems/enemy-ai-system.js';
import { DamageSystem } from '../systems/damage-system.js';
import { DeathRespawnSystem } from '../systems/death-respawn-system.js';
import { StarfieldSystem } from '../systems/starfield-system.js';
import { ParallaxBgSystem } from '../systems/parallax-bg-system.js';
import { getBiomeConfig } from '../level/biome-config.js';
import { createGameState, applyDeathPenalty } from './game-state.js';
import type { GameState } from './game-state.js';
import { HudSystem } from '../systems/hud-system.js';
import { SoundManager } from '../audio/sound-manager.js';
import { EffectsSystem, createWorldBloom } from '../systems/effects-system.js';
import { AnimationSystem } from '../systems/animation-system.js';
import type { LevelData } from '../level/level-data.js';
import { ALL_LEVELS } from '../level/extra-levels.js';
import { buildLevel } from '../level/level-builder.js';
import { createPlayerEntity } from '../entities/create-player.js';
import { createMechEntity } from '../entities/create-mech.js';
import { spawnEnemies } from '../level/spawn-enemies.js';
import { BossTriggerSystem } from '../systems/boss-trigger-system.js';
import { BossAISystem } from '../systems/boss-ai-system.js';
import { LevelCompleteSystem } from '../systems/level-complete-system.js';

type Scene = 'planet-select' | 'gameplay';
const BACKGROUND_COLOR = 0x0a0a2e;

export class Game {
  private app!: Application;
  private world!: World;
  private physicsCtx!: PhysicsContext;
  private entityManager!: EntityManager;
  private systems: System[] = [];
  private inputManager!: InputManager;
  private soundManager!: SoundManager;
  private currentScene: Scene = 'planet-select';
  private hubScreen: HubScreen | null = null;
  private starfield!: StarfieldSystem;
  private parallaxBg: ParallaxBgSystem | null = null;
  private gameState: GameState = createGameState();

  public worldContainer!: Container;
  public uiContainer!: Container;

  async init(): Promise<void> {
    // 1. PixiJS
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
    const el = document.getElementById('game-container');
    if (!el) throw new Error('Missing #game-container');
    el.appendChild(this.app.canvas);

    // 1b. Loading screen
    const loading = new LoadingScreen();
    this.app.stage.addChild(loading.container);
    await loadAllAssets((p) => loading.updateProgress(p));
    loading.hide();

    // 2. Physics (WASM init once)
    this.physicsCtx = await PhysicsContext.create();

    // 3. ECS world
    this.world = new World();

    // 4. Starfield (persistent across scenes; parallax created per-level)
    this.starfield = new StarfieldSystem(this.app.stage);
    this.starfield.enabled = false;
    this.starfield.setVisible(false);

    // 5. Stage containers
    this.worldContainer = new Container();
    this.uiContainer = new Container();
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.uiContainer);
    this.worldContainer.filters = [createWorldBloom()];

    // 6. Core managers
    this.entityManager = new EntityManager(
      this.physicsCtx, this.worldContainer,
    );
    this.inputManager = new InputManager();
    this.soundManager = new SoundManager();
    this.soundManager.loadAll();

    // 7. Game loop (always ticks; gameplay systems only run in gameplay)
    this.app.ticker.add((ticker) => {
      const dt = Math.min(ticker.deltaMS / 1000, 0.1);
      if (this.currentScene === 'gameplay') {
        this.entityManager.processDestroyQueue(this.world);
        for (const system of this.systems) {
          system.update(this.world, dt);
        }
        this.inputManager.update();
      }
    });

    // 8. Show hub screen (weapon loadout + planet select)
    this.showHub();
    console.log("[Noah's Game] Ready — select a weapon and deploy");
  }

  // — Scene transitions —

  private showHub(): void {
    this.currentScene = 'planet-select';

    // Clean up previous parallax layers if any
    this.parallaxBg?.destroy(this.app.stage);
    this.parallaxBg = null;

    this.hubScreen = new HubScreen(
      ALL_LEVELS, this.gameState,
      (level) => this.startLevel(level),
    );
    this.app.stage.addChild(this.hubScreen.container);
  }

  private startLevel(levelData: LevelData): void {
    this.hubScreen?.hide();
    this.hubScreen = null;
    this.loadLevel(levelData);
    this.currentScene = 'gameplay';
    console.log(`[Game] Started: ${levelData.name}`);
  }

  /** Called by DeathRespawnSystem after death delay. */
  returnToPlanetSelect(): void {
    applyDeathPenalty(this.gameState);
    this.unloadLevel();
    this.showHub();
  }

  /** Called by LevelCompleteSystem — return to hub with scrap intact. */
  returnToHubVictory(): void {
    this.unloadLevel();
    this.showHub();
    console.log('[Game] Level complete — returning to hub');
  }

  // — Level lifecycle —

  private loadLevel(levelData: LevelData): void {
    // Fresh physics world (WASM stays initialised)
    this.physicsCtx = PhysicsContext.resetWorld(this.physicsCtx);
    this.entityManager.setPhysicsContext(this.physicsCtx);

    buildLevel(levelData, this.world, this.physicsCtx, this.worldContainer);

    // Create biome-specific parallax background
    const biome = getBiomeConfig(levelData.environmentTheme);
    this.parallaxBg?.destroy(this.app.stage);
    this.parallaxBg = new ParallaxBgSystem(this.app.stage, biome);

    const playerEntity = createPlayerEntity(
      this.world, this.physicsCtx, this.worldContainer,
      levelData.playerSpawn.x, levelData.playerSpawn.y,
    );
    createMechEntity(
      this.world, this.worldContainer, playerEntity,
      levelData.playerSpawn.x, levelData.playerSpawn.y,
      this.gameState.equippedWeapon!,
    );

    spawnEnemies(
      levelData.spawnPoints, this.world, this.physicsCtx, this.worldContainer,
    );

    // Rebuild systems (they hold level-specific state)
    this.systems = [];
    const bounds = {
      x: 0, y: 0, width: levelData.width, height: levelData.height,
    };

    this.addSystem(this.starfield);
    this.addSystem(this.parallaxBg!); // non-null: created above
    this.addSystem(new PhysicsSystem(this.physicsCtx));
    this.addSystem(new BossTriggerSystem(
      this.physicsCtx, this.worldContainer, levelData,
    ));
    this.addSystem(new BossAISystem(this.physicsCtx, this.worldContainer, this.soundManager));
    this.addSystem(new EnemyAISystem(this.physicsCtx, this.worldContainer));
    this.addSystem(new PlayerMovementSystem(
      this.physicsCtx, this.inputManager, this.soundManager,
    ));
    this.addSystem(new MechFollowSystem());
    this.addSystem(new WeaponSystem(
      this.physicsCtx, this.worldContainer, this.soundManager,
    ));
    this.addSystem(new ProjectileSystem(this.entityManager, this.soundManager));
    this.addSystem(new DamageSystem(
      this.physicsCtx, this.soundManager, this.entityManager,
      this.gameState, this.worldContainer,
    ));
    this.addSystem(new DeathRespawnSystem(
      this.physicsCtx, this.worldContainer,
      levelData.playerSpawn, levelData.spawnPoints,
      this.soundManager,
      () => this.returnToPlanetSelect(),
    ));
    this.addSystem(new LevelCompleteSystem(
      this.worldContainer, this.soundManager,
      !!levelData.bossTriggerX,
      () => this.returnToHubVictory(),
    ));
    this.addSystem(new HudSystem(this.uiContainer, this.gameState));
    this.addSystem(new AnimationSystem());
    this.addSystem(new EffectsSystem());
    this.addSystem(new CameraSystem(this.worldContainer, bounds));
    this.addSystem(new RenderSystem(this.worldContainer));
  }

  private unloadLevel(): void {
    this.systems = [];
    this.entityManager.destroyAll(this.world);
    this.worldContainer.removeChildren();
    this.uiContainer.removeChildren();
    this.worldContainer.x = 0;
    this.worldContainer.y = 0;
  }

  private addSystem(system: System): void {
    this.systems.push(system);
    this.systems.sort((a, b) => a.priority - b.priority);
  }
}
