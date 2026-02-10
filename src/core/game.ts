/** Game -- top-level orchestrator. Ship <-> star-map <-> gameplay. */
import { Application, Container } from 'pixi.js';
import type { System } from './types.js';
import { World } from './world.js';
import { PhysicsContext } from './physics.js';
import { EntityManager } from './entity-manager.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './constants.js';
import { InputManager } from '../input/input-manager.js';
import { loadAllAssets } from './asset-loader.js';
import { LoadingScreen } from '../ui/loading-screen.js';
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
import { buildLevel } from '../level/level-builder.js';
import { createPlayerEntity } from '../entities/create-player.js';
import { createMechEntity } from '../entities/create-mech.js';
import { spawnEnemies } from '../level/spawn-enemies.js';
import { BossTriggerSystem } from '../systems/boss-trigger-system.js';
import { BossAISystem } from '../systems/boss-ai-system.js';
import { LevelCompleteSystem } from '../systems/level-complete-system.js';
import { VictoryScreen } from '../ui/victory-screen.js';
import { SceneRouter } from './scene-router.js';
import { ShipInterior } from '../scenes/ship-interior.js';
import { StarMap } from '../scenes/star-map.js';
import { STAR_SYSTEMS, getLevelForStar } from '../scenes/star-map-data.js';
import { WarpTransition } from '../scenes/warp-transition.js';
import { ShipOverlays } from '../scenes/ship-overlays.js';

const BG = 0x0a0a2e;

export class Game {
  private app!: Application;
  private world!: World;
  private physicsCtx!: PhysicsContext;
  private entityManager!: EntityManager;
  private systems: System[] = [];
  private inputManager!: InputManager;
  private soundManager!: SoundManager;
  private sceneRouter = new SceneRouter();
  private starfield!: StarfieldSystem;
  private parallaxBg: ParallaxBgSystem | null = null;
  private gameState: GameState = createGameState();
  private levelName = '';
  private shipInterior: ShipInterior | null = null;
  private shipOverlays: ShipOverlays | null = null;
  private starMap: StarMap | null = null;
  private warpTransition: WarpTransition | null = null;
  public worldContainer!: Container;
  public uiContainer!: Container;

  async init(): Promise<void> {
    this.app = new Application();
    await this.app.init({
      width: SCREEN_WIDTH, height: SCREEN_HEIGHT,
      backgroundColor: BG, resizeTo: window,
      antialias: true, resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    const el = document.getElementById('game-container');
    if (!el) throw new Error('Missing #game-container');
    el.appendChild(this.app.canvas);
    // Loading screen
    const loading = new LoadingScreen();
    this.app.stage.addChild(loading.container);
    await loadAllAssets((p) => loading.updateProgress(p));
    loading.hide();
    // Physics (WASM init once)
    this.physicsCtx = await PhysicsContext.create();
    this.world = new World();
    // Starfield (persistent; parallax is per-level)
    this.starfield = new StarfieldSystem(this.app.stage);
    this.starfield.enabled = false;
    this.starfield.setVisible(false);
    // Stage containers
    this.worldContainer = new Container();
    this.uiContainer = new Container();
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.uiContainer);
    this.worldContainer.filters = [createWorldBloom()];
    // Core managers
    this.entityManager = new EntityManager(this.physicsCtx, this.worldContainer);
    this.inputManager = new InputManager();
    this.soundManager = new SoundManager();
    this.soundManager.loadAll();
    // Game loop
    this.app.ticker.add((ticker) => {
      const dt = Math.min(ticker.deltaMS / 1000, 0.1);
      const scene = this.sceneRouter.activeScene;
      if (scene === 'ship' && this.shipInterior && !this.shipOverlays?.isOpen) {
        this.shipInterior.update(dt);
      }
      if (scene === 'star-map' && this.starMap) this.starMap.update(dt);
      if (this.warpTransition) this.warpTransition.update(dt);
      if (scene === 'gameplay') {
        this.entityManager.processDestroyQueue(this.world);
        for (const sys of this.systems) sys.update(this.world, dt);
        this.inputManager.update();
      }
    });
    this.showShip();
  }

  private showShip(): void {
    this.sceneRouter.transitionTo('ship');
    this.parallaxBg?.destroy(this.app.stage);
    this.parallaxBg = null;
    this.shipOverlays = new ShipOverlays(this.gameState);
    this.shipInterior = new ShipInterior((action) => {
      if (action === 'cockpit') this.showStarMap();
      else this.shipOverlays!.open(action);
    });
    this.app.stage.addChild(this.shipInterior.container);
    this.app.stage.addChild(this.shipOverlays.container);
  }

  private hideShip(): void {
    this.shipOverlays?.destroy(); this.shipOverlays = null;
    this.shipInterior?.destroy(); this.shipInterior = null;
  }

  private showStarMap(): void {
    this.hideShip();
    this.sceneRouter.transitionTo('star-map');
    const hasWpn = this.gameState.equippedWeapon !== null;
    this.starMap = new StarMap(this.gameState.shipTier, hasWpn, (r) => {
      if (r.action === 'back') { this.hideStarMap(); this.showShip(); }
      else this.deployToLevel(r.starId);
    });
    this.app.stage.addChild(this.starMap.container);
  }

  private hideStarMap(): void { this.starMap?.destroy(); this.starMap = null; }
  private deployToLevel(starId: string): void {
    this.hideStarMap();
    const star = STAR_SYSTEMS.find(s => s.id === starId);
    if (!star) return;
    const ld = getLevelForStar(star);
    this.warpTransition = new WarpTransition(() => {
      this.warpTransition?.destroy(); this.warpTransition = null;
      this.levelName = ld.name;
      this.loadLevel(ld);
      this.sceneRouter.transitionTo('gameplay');
    });
    this.app.stage.addChild(this.warpTransition.container);
  }

  /** Called by DeathRespawnSystem after death delay. */
  returnToShip(): void {
    applyDeathPenalty(this.gameState);
    this.unloadLevel();
    this.showShip();
  }

  /** Called by LevelCompleteSystem -- show victory screen, then ship. */
  returnToHubVictory(stats: { enemiesKilled: number; timeSeconds: number }): void {
    this.sceneRouter.transitionTo('ship');
    const s = { levelName: this.levelName, ...stats, scrapEarned: this.gameState.scrap };
    const vs = new VictoryScreen(s, () => { this.unloadLevel(); this.showShip(); });
    this.app.stage.addChild(vs.container);
  }

  private loadLevel(levelData: LevelData): void {
    this.physicsCtx = PhysicsContext.resetWorld(this.physicsCtx);
    this.entityManager.setPhysicsContext(this.physicsCtx);
    buildLevel(levelData, this.world, this.physicsCtx, this.worldContainer);
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
    this.systems = [];
    const bounds = { x: 0, y: 0, width: levelData.width, height: levelData.height };
    const cam = new CameraSystem(this.worldContainer, bounds);
    this.addSystem(this.starfield);
    this.addSystem(this.parallaxBg!);
    this.addSystem(new PhysicsSystem(this.physicsCtx));
    this.addSystem(new BossTriggerSystem(
      this.physicsCtx, this.worldContainer, levelData, this.soundManager,
    ));
    this.addSystem(new BossAISystem(
      this.physicsCtx, this.worldContainer, this.soundManager, cam,
    ));
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
      this.soundManager, () => this.returnToShip(),
    ));
    this.addSystem(new LevelCompleteSystem(
      this.worldContainer, this.soundManager,
      !!levelData.bossTriggerX, (stats) => this.returnToHubVictory(stats),
    ));
    this.addSystem(new HudSystem(this.uiContainer, this.gameState));
    this.addSystem(new AnimationSystem());
    this.addSystem(new EffectsSystem());
    this.addSystem(cam);
    this.addSystem(new RenderSystem(this.worldContainer));
  }

  private unloadLevel(): void {
    this.systems = [];
    this.entityManager.destroyAll(this.world);
    this.worldContainer.removeChildren();
    this.uiContainer.removeChildren();
    this.worldContainer.x = 0; this.worldContainer.y = 0;
  }

  private addSystem(s: System): void {
    this.systems.push(s); this.systems.sort((a, b) => a.priority - b.priority);
  }
}
