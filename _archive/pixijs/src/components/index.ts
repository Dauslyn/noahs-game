/**
 * Barrel file for all ECS components.
 *
 * Re-exports every component interface and factory, and defines the
 * central ComponentMap that powers type-safe `World.getComponent<K>()`.
 */

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { type TransformComponent, createTransform } from './transform.js';
export { type VelocityComponent, createVelocity } from './velocity.js';
export { type SpriteComponent, createSprite } from './sprite.js';
export {
  type PhysicsBodyComponent,
  type PhysicsBodyType,
  createPhysicsBody,
} from './physics-body.js';
export {
  type PlayerComponent,
  type PlayerState,
  type WallDirection,
  type FacingDirection,
  createPlayer,
} from './player.js';
export {
  type MechComponent,
  type MechMode,
  createMech,
} from './mech.js';
export { type HealthComponent, createHealth } from './health.js';
export { type WeaponComponent, createWeapon } from './weapon.js';
export {
  type EnemyComponent,
  type EnemyType,
  type EnemyState,
  type PatrolDirection,
  createEnemy,
} from './enemy.js';
export { type ProjectileComponent, createProjectile } from './projectile.js';
export {
  type AnimationStateComponent,
  type AnimationData,
  createAnimationState,
} from './animation-state.js';
export {
  type BossComponent,
  type BossPhase,
  type BossAttackState,
  createBoss,
} from './boss.js';

// ---------------------------------------------------------------------------
// ComponentMap – type-safe mapping from component type string to interface
// ---------------------------------------------------------------------------

import type { TransformComponent } from './transform.js';
import type { VelocityComponent } from './velocity.js';
import type { SpriteComponent } from './sprite.js';
import type { PhysicsBodyComponent } from './physics-body.js';
import type { PlayerComponent } from './player.js';
import type { MechComponent } from './mech.js';
import type { HealthComponent } from './health.js';
import type { WeaponComponent } from './weapon.js';
import type { EnemyComponent } from './enemy.js';
import type { ProjectileComponent } from './projectile.js';
import type { AnimationStateComponent } from './animation-state.js';
import type { BossComponent } from './boss.js';

/**
 * Maps each ComponentType string literal to its concrete interface.
 *
 * Used by `World.getComponent<K>()` so that callers get the correct
 * narrowed type without manual casting.
 *
 * When adding a new component:
 *   1. Add its type literal to `ComponentType` in `core/types.ts`
 *   2. Create the interface file in `src/components/`
 *   3. Add the mapping here
 */
export interface ComponentMap {
  transform: TransformComponent;
  velocity: VelocityComponent;
  sprite: SpriteComponent;
  physicsBody: PhysicsBodyComponent;
  player: PlayerComponent;
  mech: MechComponent;
  health: HealthComponent;
  weapon: WeaponComponent;
  enemy: EnemyComponent;
  projectile: ProjectileComponent;
  animationState: AnimationStateComponent;
  boss: BossComponent;
}
