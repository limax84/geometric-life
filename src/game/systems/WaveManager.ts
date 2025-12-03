// Gestionnaire de vagues pour la difficulté progressive

import { EnemyType } from '../entities/Enemy';

export interface WaveConfig {
  waveNumber: number;
  enemyCount: number;
  enemyTypes: EnemyType[];
  spawnDelay: number; // Délai entre chaque spawn en secondes
  waveDelay: number; // Délai avant la prochaine vague
  enemySpeedMultiplier: number;
  enemyHealthMultiplier: number;
  powerupChance: number; // Chance de drop de powerup (0-1)
}

export interface WaveState {
  currentWave: number;
  enemiesRemaining: number;
  enemiesSpawned: number;
  isActive: boolean;
  waveStartTime: number;
  betweenWaves: boolean;
  nextWaveTime: number;
}

export class WaveManager {
  private state: WaveState;
  private spawnTimer: number = 0;
  private currentConfig: WaveConfig | null = null;

  constructor() {
    this.state = {
      currentWave: 0,
      enemiesRemaining: 0,
      enemiesSpawned: 0,
      isActive: false,
      waveStartTime: 0,
      betweenWaves: true,
      nextWaveTime: 2, // Délai initial avant la première vague (réduit)
    };
  }

  getWaveConfig(waveNumber: number): WaveConfig {
    // Vagues boss (10, 20, 30...) : uniquement des boss
    const isBossWave = waveNumber % 10 === 0 && waveNumber > 0;
    
    let enemyCount: number;
    let enemyTypes: EnemyType[];
    
    if (isBossWave) {
      // Nombre de boss = niveau / 10 (1 boss à 10, 2 à 20, etc.)
      enemyCount = Math.floor(waveNumber / 10);
      enemyTypes = ['boss_hexagon'];
    } else {
      // Vagues normales
      const baseEnemies = 15;
      const enemiesPerWave = 15;
      enemyCount = baseEnemies + (waveNumber - 1) * enemiesPerWave;
      
      enemyTypes = ['wanderer'];
      if (waveNumber >= 2) enemyTypes.push('chaser');
      if (waveNumber >= 3) enemyTypes.push('diamond');
      if (waveNumber >= 4) enemyTypes.push('shooter');
      if (waveNumber >= 5) enemyTypes.push('dodger');
      if (waveNumber >= 6) enemyTypes.push('splitter');
      if (waveNumber >= 7) enemyTypes.push('snake');
    }

    // Délai de spawn - plus lent pour les boss
    const spawnDelay = isBossWave ? 2 : Math.max(0.15, 0.7 - waveNumber * 0.05);

    // Multiplicateurs de difficulté
    const speedMultiplier = 1 + (waveNumber - 1) * 0.05; // +5% par vague
    const healthMultiplier = 1 + Math.floor((waveNumber - 1) / 5) * 0.5; // +50% tous les 5 niveaux

    // Chance de powerup de base (sera ajustée par la densité dans GameEngine)
    const powerupChance = Math.min(0.4, 0.15 + waveNumber * 0.02);

    return {
      waveNumber,
      enemyCount,
      enemyTypes,
      spawnDelay,
      waveDelay: 2 + Math.min(waveNumber * 0.3, 3),
      enemySpeedMultiplier: speedMultiplier,
      enemyHealthMultiplier: healthMultiplier,
      powerupChance,
    };
  }

  startNextWave(): void {
    this.state.currentWave++;
    this.currentConfig = this.getWaveConfig(this.state.currentWave);
    
    this.state.enemiesRemaining = this.currentConfig.enemyCount;
    this.state.enemiesSpawned = 0;
    this.state.isActive = true;
    this.state.waveStartTime = performance.now();
    this.state.betweenWaves = false;
    this.spawnTimer = 0;
  }

  update(deltaTime: number, currentEnemyCount: number): EnemyType | null {
    // Si entre les vagues, attendre
    if (this.state.betweenWaves) {
      this.state.nextWaveTime -= deltaTime;
      if (this.state.nextWaveTime <= 0) {
        this.startNextWave();
        return this.getNextEnemyToSpawn();
      }
      return null;
    }

    // Si la vague est active
    if (this.state.isActive && this.currentConfig) {
      // Vérifier si tous les ennemis ont été spawn
      if (this.state.enemiesSpawned >= this.currentConfig.enemyCount) {
        // Vérifier si tous les ennemis sont morts
        if (currentEnemyCount === 0) {
          this.endWave();
        }
        return null;
      }

      // Timer de spawn
      this.spawnTimer += deltaTime;
      if (this.spawnTimer >= this.currentConfig.spawnDelay) {
        this.spawnTimer = 0;
        return this.getNextEnemyToSpawn();
      }
    }

    return null;
  }

  private getNextEnemyToSpawn(): EnemyType | null {
    if (!this.currentConfig) return null;
    if (this.state.enemiesSpawned >= this.currentConfig.enemyCount) return null;

    this.state.enemiesSpawned++;
    this.state.enemiesRemaining = this.currentConfig.enemyCount - this.state.enemiesSpawned;

    // Choisir un type d'ennemi aléatoire parmi ceux disponibles
    const types = this.currentConfig.enemyTypes;
    
    // Pondération: plus de wanderers au début, plus de variété ensuite
    const weights = types.map((type) => {
      if (type === 'wanderer') return 3;
      if (type === 'chaser') return 2;
      if (type === 'diamond') return 3;
      if (type === 'shooter') return 1;
      if (type === 'dodger') return 1;
      if (type === 'splitter') return 2;
      if (type === 'snake') return 1;
      if (type === 'boss_hexagon') return 1; // Boss toujours spawn en vague boss
      return 1;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < types.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return types[i];
      }
    }

    return types[0];
  }

  private endWave(): void {
    this.state.isActive = false;
    this.state.betweenWaves = true;
    this.state.nextWaveTime = this.currentConfig?.waveDelay || 3;
    this.currentConfig = null;
  }

  onEnemyKilled(): void {
    // Cette méthode est appelée quand un ennemi est tué
    // Utile pour le tracking et potentiellement pour des bonus
  }

  // Getters
  getCurrentWave(): number {
    return this.state.currentWave;
  }

  getEnemiesRemaining(): number {
    if (!this.currentConfig) return 0;
    return this.currentConfig.enemyCount - this.state.enemiesSpawned;
  }

  isWaveActive(): boolean {
    return this.state.isActive;
  }

  isBetweenWaves(): boolean {
    return this.state.betweenWaves;
  }

  getNextWaveTime(): number {
    return Math.max(0, this.state.nextWaveTime);
  }

  getCurrentConfig(): WaveConfig | null {
    return this.currentConfig;
  }

  getSpeedMultiplier(): number {
    return this.currentConfig?.enemySpeedMultiplier || 1;
  }

  getPowerupChance(): number {
    return this.currentConfig?.powerupChance || 0.1;
  }

  // Reset pour nouvelle partie
  reset(): void {
    this.state = {
      currentWave: 0,
      enemiesRemaining: 0,
      enemiesSpawned: 0,
      isActive: false,
      waveStartTime: 0,
      betweenWaves: true,
      nextWaveTime: 3,
    };
    this.currentConfig = null;
    this.spawnTimer = 0;
  }
}
