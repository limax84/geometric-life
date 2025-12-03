// Types de base pour Geometric Life - Aquarium Simulation

export interface Vector2 {
  x: number
  y: number
}

// === CONFIGURATION GRAPHIQUE ===

export type GraphicsQuality = 'potato' | 'low' | 'medium' | 'high' | 'ultra'

export interface GraphicsSettings {
  shadowBlurEnabled: boolean
  shadowBlurIntensity: number
  maxParticles: number
  particleGlow: boolean
  ambientParticleCount: number
  gridGlow: boolean
  gridOpacity: number
  entityGlow: boolean
  entityGlowIntensity: number
  causticsEnabled: boolean
  targetFPS: number
}

export const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsSettings> = {
  potato: {
    shadowBlurEnabled: false,
    shadowBlurIntensity: 0,
    maxParticles: 30,
    particleGlow: false,
    ambientParticleCount: 20,
    gridGlow: false,
    gridOpacity: 0.15,
    entityGlow: false,
    entityGlowIntensity: 0,
    causticsEnabled: false,
    targetFPS: 30,
  },
  low: {
    shadowBlurEnabled: false,
    shadowBlurIntensity: 0,
    maxParticles: 50,
    particleGlow: false,
    ambientParticleCount: 40,
    gridGlow: false,
    gridOpacity: 0.2,
    entityGlow: false,
    entityGlowIntensity: 0,
    causticsEnabled: false,
    targetFPS: 60,
  },
  medium: {
    shadowBlurEnabled: true,
    shadowBlurIntensity: 0.3,
    maxParticles: 100,
    particleGlow: true,
    ambientParticleCount: 80,
    gridGlow: true,
    gridOpacity: 0.25,
    entityGlow: true,
    entityGlowIntensity: 0.4,
    causticsEnabled: false,
    targetFPS: 60,
  },
  high: {
    shadowBlurEnabled: true,
    shadowBlurIntensity: 0.7,
    maxParticles: 200,
    particleGlow: true,
    ambientParticleCount: 120,
    gridGlow: true,
    gridOpacity: 0.3,
    entityGlow: true,
    entityGlowIntensity: 0.8,
    causticsEnabled: true,
    targetFPS: 60,
  },
  ultra: {
    shadowBlurEnabled: true,
    shadowBlurIntensity: 1,
    maxParticles: 400,
    particleGlow: true,
    ambientParticleCount: 200,
    gridGlow: true,
    gridOpacity: 0.35,
    entityGlow: true,
    entityGlowIntensity: 1,
    causticsEnabled: true,
    targetFPS: 60,
  },
}

export const DEFAULT_GRAPHICS_QUALITY: GraphicsQuality = 'high'

// === CONFIGURATION DE LA SIMULATION ===

export interface SimulationConfig {
  // World dimensions (will be fullscreen adaptive)
  WORLD_PADDING: number        // Extra space around visible area

  // Simulation speed
  TIME_SCALE: number           // 1 = normal, 2 = 2x speed, etc.
  
  // Ecosystem
  PLANKTON_SPAWN_RATE: number  // Plankton per second
  MAX_PLANKTON: number
  MAX_CREATURES: number
  
  // Energy
  PLANKTON_ENERGY: number
  REPRODUCTION_ENERGY_COST: number
  BASE_METABOLISM: number      // Energy consumed per second
}

export const SIMULATION_CONFIG: SimulationConfig = {
  WORLD_PADDING: 100,
  TIME_SCALE: 1,
  PLANKTON_SPAWN_RATE: 2,
  MAX_PLANKTON: 100,
  MAX_CREATURES: 50,
  PLANKTON_ENERGY: 20,
  REPRODUCTION_ENERGY_COST: 50,
  BASE_METABOLISM: 1,
}

// === PALETTE DE COULEURS CYBERPUNK AQUARIUM ===

export const COLORS = {
  // Background
  BACKGROUND_DEEP: '#0a0a1a',
  BACKGROUND_GRADIENT_TOP: '#0a1628',
  BACKGROUND_GRADIENT_BOTTOM: '#050510',
  
  // Grid (Tron style)
  GRID_LINE: '#0d3d4d',
  GRID_GLOW: '#0088aa',
  
  // Creatures
  PLANKTON: '#00ff88',
  HERBIVORE_MIN: '#00aaff',   // Young/small
  HERBIVORE_MAX: '#00ffff',   // Mature/large
  PREDATOR_MIN: '#ff3366',    // Young/small
  PREDATOR_MAX: '#ff0066',    // Mature/large
  
  // Effects
  AMBIENT_PARTICLE: '#ffffff',
  CAUSTICS: '#4488ff',
  
  // UI
  UI_PANEL: 'rgba(10, 20, 30, 0.85)',
  UI_BORDER: '#0088aa',
  UI_TEXT: '#88ccff',
  UI_ACCENT: '#ffcc00',
  
  // Status
  ENERGY_HIGH: '#00ff88',
  ENERGY_MEDIUM: '#ffcc00',
  ENERGY_LOW: '#ff4444',
}

// === TYPES D'ENTITÉS ===

export type CreatureType = 'plankton' | 'herbivore' | 'predator'

export type SimulationState = 'running' | 'paused'

// === GÉNOME ===

export interface Genome {
  // Morphology (0-1 values)
  shape: number       // Maps to sides: 3-8
  size: number        // Size multiplier
  hue: number         // Color hue offset
  luminosity: number  // Glow intensity
  pattern: number     // Visual pattern type
  
  // Behavior
  speed: number       // Max speed
  agility: number     // Turn rate
  perception: number  // Detection radius
  aggression: number  // Fight vs flight tendency
  sociability: number // Attraction to same species
  
  // Metabolism
  metabolism: number  // Energy consumption rate
  efficiency: number  // Energy extraction from food
  fertility: number   // Reproduction readiness rate
  longevity: number   // Lifespan multiplier
}

// === INTERFACES D'ENTITÉS ===

export interface Entity {
  id: string
  position: Vector2
  velocity: Vector2
  rotation: number
  isAlive: boolean
}

export interface Creature extends Entity {
  type: CreatureType
  genome: Genome
  energy: number
  age: number
  maxAge: number
  size: number
  mature: boolean
}

// === CAMÉRA / VUE ===

export interface Camera {
  x: number
  y: number
  width: number
  height: number
  zoom: number
}

// === STATISTIQUES ===

export interface PopulationStats {
  plankton: number
  herbivores: number
  predators: number
  totalEnergy: number
  averageAge: number
  births: number
  deaths: number
}

// === SAUVEGARDE ===

export interface SaveSlot {
  id: string
  name: string
  timestamp: number
  stats: PopulationStats
  // Full simulation state would be added here
}

export interface SaveData {
  version: string
  slots: SaveSlot[]
  settings: {
    graphicsQuality: GraphicsQuality
    volume: number
  }
}
