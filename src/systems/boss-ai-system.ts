/**
 * BossAISystem — drives the Warden boss through patrol, charge,
 * and laser sweep attack patterns based on HP-driven phases.
 *
 * Priority 14: runs before EnemyAISystem (15) so boss entities
 * are handled here and skipped by EnemyAI.
 *
 * State handler logic is in boss-ai-behaviours.ts to stay under 250 lines.
 */

import type { System, Entity } from '../core/types.js';
import type { World } from '../core/world.js';
import type { PhysicsContext } from '../core/physics.js';
import type { Container } from 'pixi.js';
import type { BossComponent } from '../components/boss.js';
import type { TransformComponent } from '../components/index.js';
import {
  handlePatrol,
  handleWindup,
  handleCharge,
  handleLaser,
  handleCooldown,
} from './boss-ai-behaviours.js';
import type { SoundManager } from '../audio/sound-manager.js';
import { trySpawnMinions } from './boss-phase3.js';

/** Phase 2 HP threshold (60% of 300). */
const PHASE2_HP = 180;

/** Phase 3 HP threshold (25% of 300). */
const PHASE3_HP = 75;

export class BossAISystem implements System {
  readonly priority = 14;

  private readonly physicsCtx: PhysicsContext;
  private readonly worldContainer: Container;
  private readonly soundManager: SoundManager;

  constructor(
    physicsCtx: PhysicsContext,
    worldContainer: Container,
    soundManager: SoundManager,
  ) {
    this.physicsCtx = physicsCtx;
    this.worldContainer = worldContainer;
    this.soundManager = soundManager;
  }

  update(world: World, dt: number): void {
    const playerTransform = this.getPlayerTransform(world);
    if (!playerTransform) return;

    const bosses = world.query(
      'boss', 'enemy', 'transform', 'physicsBody', 'health',
    );

    for (const entity of bosses) {
      const boss = world.getComponent(entity, 'boss');
      const enemy = world.getComponent(entity, 'enemy');
      const transform = world.getComponent(entity, 'transform');
      const pb = world.getComponent(entity, 'physicsBody');
      const health = world.getComponent(entity, 'health');
      if (!boss || !enemy || !transform || !pb || !health) continue;

      if (health.isDead || !boss.activated) continue;

      // Update phase based on HP thresholds
      this.updatePhase(boss, health.current);

      const body = this.physicsCtx.world.getRigidBody(pb.bodyHandle);
      if (!body) continue;

      // Delegate to state handlers
      switch (boss.attackState) {
        case 'patrol':
          handlePatrol(
            boss, enemy, body, transform, playerTransform, dt,
            this.soundManager,
          );
          break;
        case 'windup':
          handleWindup(boss, body, dt, this.soundManager);
          break;
        case 'charging':
          handleCharge(boss, body, transform, dt);
          break;
        case 'laser':
          handleLaser(
            boss, world, this.physicsCtx, this.worldContainer,
            transform, body, dt, entity, this.soundManager,
          );
          break;
        case 'cooldown':
          handleCooldown(boss, body, dt);
          break;
      }

      // Phase 3: attempt minion spawning each frame
      trySpawnMinions(
        boss, transform, world, this.physicsCtx,
        this.worldContainer, this.soundManager, dt,
      );

      // Visual: flash during windup, tint during charge/enrage
      this.updateVisual(world, entity, boss);
    }
  }

  /** Transition to new phase when HP drops below thresholds. */
  private updatePhase(boss: BossComponent, currentHp: number): void {
    if (boss.phase === 1 && currentHp <= PHASE2_HP) {
      boss.phase = 2;
      this.soundManager.play('boss-phase-up');
    } else if (boss.phase === 2 && currentHp <= PHASE3_HP) {
      boss.phase = 3;
      this.soundManager.play('boss-phase-up');
    }
  }

  /** Flash during windup, orange/red tint during charge, permanent red in Phase 3. */
  private updateVisual(
    world: World,
    entity: Entity,
    boss: BossComponent,
  ): void {
    const sprite = world.getComponent(entity, 'sprite');
    if (!sprite) return;

    const gfx = sprite.displayObject;

    if (boss.phase >= 3) {
      // Phase 3 enrage: permanent red base tint with faster flashing
      if (boss.attackState === 'windup') {
        const flash = Math.sin(boss.stateTimer * 25) > 0;
        gfx.tint = flash ? 0xff0000 : 0xaa0000;
      } else if (boss.attackState === 'charging') {
        gfx.tint = 0xff2222;
      } else if (boss.attackState === 'laser') {
        gfx.tint = 0xff2222;
      } else {
        // Permanent red tint during patrol/cooldown in Phase 3
        gfx.tint = 0xff2222;
      }
    } else {
      // Phases 1-2: existing behaviour
      if (boss.attackState === 'windup') {
        const flash = Math.sin(boss.stateTimer * 20) > 0;
        gfx.tint = flash ? 0xff4444 : 0xffffff;
      } else if (boss.attackState === 'charging') {
        gfx.tint = 0xff6644;
      } else if (boss.attackState === 'laser') {
        gfx.tint = 0xff8844;
      } else {
        gfx.tint = 0xffffff;
      }
    }
  }

  /** Find the player entity's transform. */
  private getPlayerTransform(world: World): TransformComponent | undefined {
    const players = world.query('player', 'transform');
    if (players.length === 0) return undefined;
    return world.getComponent(players[0], 'transform');
  }
}
