/**
 * Biome configuration — maps environment themes to texture aliases
 * and platform tint colors for visual variety per planet.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Available environment themes. */
export type EnvironmentTheme =
  | 'alien'
  | 'another-world'
  | 'cyberpunk'
  | 'sci-fi-interior';

/** Visual config for a single biome. */
export interface BiomeConfig {
  /** Texture alias for the far parallax layer (sky). */
  skyAlias: string;
  /** Texture alias for the near parallax layer (structures). Null = single-layer biome. */
  structuresAlias: string | null;
  /** Hex tint applied to platform tiles (0xRRGGBB). 0xffffff = no tint. */
  platformTint: number;
  /** Godray filter intensity (0-1). Higher = more visible light beams. Default 0.25. */
  godrayAlpha?: number;
  /** Godray light angle in degrees. 0 = vertical, positive = tilted right. Default 30. */
  godrayAngle?: number;
}

// ---------------------------------------------------------------------------
// Biome lookup
// ---------------------------------------------------------------------------

/** Config for every environment theme. */
const BIOME_CONFIGS: Record<EnvironmentTheme, BiomeConfig> = {
  'alien': {
    skyAlias: 'bg-sky',
    structuresAlias: 'bg-structures',
    platformTint: 0xffffff,
    godrayAlpha: 0.25,
    godrayAngle: 30,
  },
  'another-world': {
    skyAlias: 'bg-another-world-sky',
    structuresAlias: 'bg-another-world-towers',
    platformTint: 0x55aa88,
    godrayAlpha: 0.3,
    godrayAngle: 30,
  },
  'cyberpunk': {
    skyAlias: 'bg-cyberpunk-back',
    structuresAlias: null,
    platformTint: 0x88ccff,
    godrayAlpha: 0.2,
    godrayAngle: -20,
  },
  'sci-fi-interior': {
    skyAlias: 'bg-interior',
    structuresAlias: null,
    platformTint: 0x4488aa,
    godrayAlpha: 0.15,
    godrayAngle: 20,
  },
};

/**
 * Get the biome configuration for a given theme.
 * Falls back to 'alien' if theme is unknown.
 */
export function getBiomeConfig(theme: EnvironmentTheme): BiomeConfig {
  return BIOME_CONFIGS[theme] ?? BIOME_CONFIGS['alien'];
}
