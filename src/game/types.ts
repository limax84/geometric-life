// Types de base pour Geometry Wars Max

export interface Vector2 {
  x: number;
  y: number;
}

// Niveaux de qualité graphique
export type GraphicsQuality = 'potato' | 'low' | 'medium' | 'high' | 'ultra'

// Configuration graphique par niveau
export interface GraphicsSettings {
  // Effets visuels
  shadowBlurEnabled: boolean
  shadowBlurIntensity: number // 0-1 multiplicateur
  
  // Particules
  maxParticles: number
  particleGlow: boolean
  
  // Étoiles de fond
  starCount: number // Nombre total d'étoiles
  starGlow: boolean
  
  // Grille
  gridDistortion: boolean
  gridOpacity: number // 0-1
  
  // Entités
  entityGlow: boolean
  entityGlowIntensity: number // 0-1
  
  // HUD
  hudGlow: boolean
  
  // Performance
  targetFPS: number
}

export const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsSettings> = {
  potato: {
    shadowBlurEnabled: false,
    shadowBlurIntensity: 0,
    maxParticles: 30,
    particleGlow: false,
    starCount: 30,
    starGlow: false,
    gridDistortion: false,
    gridOpacity: 0.2,
    entityGlow: false,
    entityGlowIntensity: 0,
    hudGlow: false,
    targetFPS: 30,
  },
  low: {
    shadowBlurEnabled: false,
    shadowBlurIntensity: 0,
    maxParticles: 50,
    particleGlow: false,
    starCount: 50,
    starGlow: false,
    gridDistortion: false,
    gridOpacity: 0.25,
    entityGlow: false,
    entityGlowIntensity: 0,
    hudGlow: false,
    targetFPS: 60,
  },
  medium: {
    shadowBlurEnabled: true,
    shadowBlurIntensity: 0.3,
    maxParticles: 100,
    particleGlow: true,
    starCount: 100,
    starGlow: false,
    gridDistortion: false,
    gridOpacity: 0.3,
    entityGlow: true,
    entityGlowIntensity: 0.4,
    hudGlow: false,
    targetFPS: 60,
  },
  high: {
    shadowBlurEnabled: true,
    shadowBlurIntensity: 0.7,
    maxParticles: 300,
    particleGlow: true,
    starCount: 200,
    starGlow: true,
    gridDistortion: true,
    gridOpacity: 0.35,
    entityGlow: true,
    entityGlowIntensity: 0.8,
    hudGlow: true,
    targetFPS: 60,
  },
  ultra: {
    shadowBlurEnabled: true,
    shadowBlurIntensity: 1,
    maxParticles: 500,
    particleGlow: true,
    starCount: 270,
    starGlow: true,
    gridDistortion: true,
    gridOpacity: 0.4,
    entityGlow: true,
    entityGlowIntensity: 1,
    hudGlow: true,
    targetFPS: 60,
  },
}

// Qualité par défaut
export const DEFAULT_GRAPHICS_QUALITY: GraphicsQuality = 'high'

export interface GameConfig {
  // Arène
  ARENA_WIDTH: number;
  ARENA_HEIGHT: number;

  // Joueur
  PLAYER_SPEED: number;
  PLAYER_ROTATION_SPEED: number;
  FIRE_RATE: number;

  // Bullets
  BULLET_SPEED: number;
  BULLET_LIFETIME: number;

  // Ennemis
  ENEMY_SPAWN_RATE: number;
  ENEMY_SPEED: number;

  // Caméra
  CAMERA_LERP: number;
}

export const GAME_CONFIG: GameConfig = {
  // Arène (réduite pour effet dézoom - encore plus compact)
  ARENA_WIDTH: 2000,
  ARENA_HEIGHT: 1400,

  // Joueur
  PLAYER_SPEED: 280,
  PLAYER_ROTATION_SPEED: 5,
  FIRE_RATE: 0.1,

  // Bullets
  BULLET_SPEED: 800,
  BULLET_LIFETIME: 2,

  // Ennemis
  ENEMY_SPAWN_RATE: 2,
  ENEMY_SPEED: 100,

  // Caméra
  CAMERA_LERP: 0.1,
};

// Couleurs néon
export const COLORS = {
  PLAYER: '#00ffff',      // Cyan
  BULLET: '#ffff00',      // Jaune
  ENEMY_WANDERER: '#ff00ff', // Magenta
  GRID: '#1a1a2e',        // Bleu sombre
  GRID_LINE: '#0f3460',   // Bleu grid
  BACKGROUND: '#0a0a0f',  // Noir profond
};

// États du jeu
export type GameState = 'menu' | 'playing' | 'paused' | 'gameover' | 'options';

// Préférences de gameplay (personnalisables)
export interface GameplayPreferences {
  // Joueur
  playerSpeed: number;          // 100-500, défaut 280
  playerRotationSpeed: number;  // 1-10, défaut 5
  
  // Ennemis
  enemySpawnRate: number;       // 0.5-5, défaut 2 (secondes entre spawns)
  enemySpeed: number;           // 50-200, défaut 100
  enemiesPerWave: number;       // 5-30, défaut 10
  
  // Vagues
  waveDelay: number;            // 1-10, défaut 3 (secondes entre vagues)
  difficultyScaling: number;    // 0.5-2, défaut 1 (multiplicateur)
  
  // Power-ups
  powerupChance: number;        // 0-100, défaut 20 (%)
  shieldDuration: number;       // 1-15, défaut 5
  rapidFireDuration: number;    // 1-15, défaut 8
  spreadShotDuration: number;   // 1-15, défaut 6
}

export const DEFAULT_GAMEPLAY_PREFS: GameplayPreferences = {
  playerSpeed: 280,
  playerRotationSpeed: 5,
  enemySpawnRate: 2,
  enemySpeed: 100,
  enemiesPerWave: 10,
  waveDelay: 3,
  difficultyScaling: 1,
  powerupChance: 20,
  shieldDuration: 5,
  rapidFireDuration: 8,
  spreadShotDuration: 6,
};

// Interface pour les entités
export interface Entity {
  id: string;
  position: Vector2;
  velocity: Vector2;
  rotation: number;
  isAlive: boolean;
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D, camera: Camera): void;
}

// Interface pour la caméra
export interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
}

// État des inputs
export interface InputState {
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
}

// Données de sauvegarde
export interface GameSave {
  highScore: number;
  settings: {
    volume: number;
  };
}

// Spawn de projectile (position + angle)
export interface BulletSpawn {
  x: number;
  y: number;
  angle: number;
}
