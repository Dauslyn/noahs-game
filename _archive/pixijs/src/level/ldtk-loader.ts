/**
 * LDtk level loader – stub for future implementation.
 *
 * LDtk (Level Designer Toolkit) will be used for hand-crafted levels
 * once the prototype is proven out. For now this module defines the
 * expected types and throws if called.
 */

import type { LevelData } from './level-data.js';

/** Raw JSON structure exported by LDtk (subset we care about). */
export interface LdtkProject {
  /** Array of level definitions from the LDtk file. */
  levels: LdtkLevel[];
}

/** A single level inside an LDtk project. */
export interface LdtkLevel {
  /** Unique identifier string set in LDtk. */
  identifier: string;
  /** Level width in pixels. */
  pxWid: number;
  /** Level height in pixels. */
  pxHei: number;
  /** Array of layer instances containing tile / entity data. */
  layerInstances: LdtkLayerInstance[];
}

/** A single layer within an LDtk level. */
export interface LdtkLayerInstance {
  /** Layer identifier string. */
  __identifier: string;
  /** Layer type: IntGrid, Tiles, Entities, AutoLayer. */
  __type: string;
}

/**
 * Load and parse an LDtk project file into our LevelData format.
 *
 * @param _path - path to the .ldtk JSON file
 * @throws always – not yet implemented
 */
export function loadLdtkLevel(_path: string): LevelData {
  throw new Error('LDtk loading not yet implemented');
}
