// Gestionnaire de stockage local pour la sauvegarde des données

import { DEFAULT_GAMEPLAY_PREFS, DEFAULT_GRAPHICS_QUALITY, GameplayPreferences, GraphicsQuality } from '../types';
import { AudioSettings } from './AudioManager';

export interface GameStats {
  highScore: number;
  totalGamesPlayed: number;
  totalEnemiesKilled: number;
  totalTimePlayed: number; // en secondes
  bestWave: number;
  topScores: number[]; // Top 10 scores
}

export interface GameSettings {
  audio: AudioSettings
  showFPS: boolean
  showDebugInfo: boolean
  screenShake: boolean
  gameplay: GameplayPreferences
  graphicsQuality: GraphicsQuality
  autoDetectQuality: boolean
}

export interface SaveData {
  stats: GameStats;
  settings: GameSettings;
  version: number;
}

const STORAGE_KEY = 'geometry-wars-max-save'
const SAVE_VERSION = 2 // Incremented for graphics settings

export class StorageManager {
  private saveData: SaveData;

  constructor() {
    this.saveData = this.getDefaultSaveData();
    this.load();
  }

  private getDefaultSaveData(): SaveData {
    return {
      stats: {
        highScore: 0,
        totalGamesPlayed: 0,
        totalEnemiesKilled: 0,
        totalTimePlayed: 0,
        bestWave: 0,
        topScores: [],
      },
      settings: {
        audio: {
          masterVolume: 0.7,
          sfxVolume: 0.8,
          musicVolume: 0.5,
          muted: false,
        },
        showFPS: false,
        showDebugInfo: false,
        screenShake: true,
        gameplay: { ...DEFAULT_GAMEPLAY_PREFS },
        graphicsQuality: DEFAULT_GRAPHICS_QUALITY,
        autoDetectQuality: true,
      },
      version: SAVE_VERSION,
    };
  }

  load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SaveData;
        
        // Vérifier la version et migrer si nécessaire
        if (parsed.version !== SAVE_VERSION) {
          this.migrate(parsed);
        } else {
          // Fusionner avec les valeurs par défaut pour gérer les nouvelles propriétés
          this.saveData = this.mergeWithDefaults(parsed);
        }
      }
    } catch (error) {
      console.warn('StorageManager: Could not load save data', error);
      this.saveData = this.getDefaultSaveData();
    }
  }

  private mergeWithDefaults(loaded: Partial<SaveData>): SaveData {
    const defaults = this.getDefaultSaveData();
    return {
      stats: { ...defaults.stats, ...loaded.stats },
      settings: {
        ...defaults.settings,
        ...loaded.settings,
        audio: { ...defaults.settings.audio, ...loaded.settings?.audio },
      },
      version: SAVE_VERSION,
    };
  }

  private migrate(oldData: SaveData): void {
    // Pour l'instant, on réinitialise simplement
    // Dans le futur, on pourrait migrer les anciennes données
    console.log('StorageManager: Migrating save data from version', oldData.version);
    this.saveData = this.mergeWithDefaults(oldData);
    this.save();
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.saveData));
    } catch (error) {
      console.warn('StorageManager: Could not save data', error);
    }
  }

  // Stats methods
  getStats(): GameStats {
    return { ...this.saveData.stats };
  }

  getHighScore(): number {
    return this.saveData.stats.highScore;
  }

  updateHighScore(score: number): boolean {
    if (score > this.saveData.stats.highScore) {
      this.saveData.stats.highScore = score;
      this.save();
      return true;
    }
    return false;
  }

  getBestWave(): number {
    return this.saveData.stats.bestWave;
  }

  updateBestWave(wave: number): boolean {
    if (wave > this.saveData.stats.bestWave) {
      this.saveData.stats.bestWave = wave;
      this.save();
      return true;
    }
    return false;
  }

  addGamePlayed(): void {
    this.saveData.stats.totalGamesPlayed++;
    this.save();
  }

  addEnemiesKilled(count: number): void {
    this.saveData.stats.totalEnemiesKilled += count;
    this.save();
  }

  addTimePlayed(seconds: number): void {
    this.saveData.stats.totalTimePlayed += seconds;
    this.save();
  }

  // Top scores
  getTopScores(): number[] {
    return [...(this.saveData.stats.topScores || [])];
  }

  addScore(score: number): void {
    if (score <= 0) return;
    
    const scores = this.saveData.stats.topScores || [];
    scores.push(score);
    scores.sort((a, b) => b - a); // Tri décroissant
    this.saveData.stats.topScores = scores.slice(0, 10); // Garder top 10
    this.save();
  }

  // Settings methods
  getSettings(): GameSettings {
    return JSON.parse(JSON.stringify(this.saveData.settings));
  }

  getAudioSettings(): AudioSettings {
    return { ...this.saveData.settings.audio };
  }

  updateAudioSettings(audio: Partial<AudioSettings>): void {
    this.saveData.settings.audio = { ...this.saveData.settings.audio, ...audio };
    this.save();
  }

  setShowFPS(show: boolean): void {
    this.saveData.settings.showFPS = show;
    this.save();
  }

  setShowDebugInfo(show: boolean): void {
    this.saveData.settings.showDebugInfo = show;
    this.save();
  }

  setScreenShake(enabled: boolean): void {
    this.saveData.settings.screenShake = enabled;
    this.save();
  }

  // Gameplay preferences
  getGameplayPrefs(): GameplayPreferences {
    return { ...DEFAULT_GAMEPLAY_PREFS, ...this.saveData.settings.gameplay };
  }

  updateGameplayPrefs(prefs: Partial<GameplayPreferences>): void {
    this.saveData.settings.gameplay = { ...this.saveData.settings.gameplay, ...prefs };
    this.save();
  }

  resetGameplayPrefs(): void {
    this.saveData.settings.gameplay = { ...DEFAULT_GAMEPLAY_PREFS }
    this.save()
  }

  // Graphics settings
  getGraphicsQuality(): GraphicsQuality {
    return this.saveData.settings.graphicsQuality || DEFAULT_GRAPHICS_QUALITY
  }

  setGraphicsQuality(quality: GraphicsQuality): void {
    this.saveData.settings.graphicsQuality = quality
    this.save()
  }

  getAutoDetectQuality(): boolean {
    return this.saveData.settings.autoDetectQuality ?? true
  }

  setAutoDetectQuality(enabled: boolean): void {
    this.saveData.settings.autoDetectQuality = enabled
    this.save()
  }

  // Reset methods
  resetStats(): void {
    this.saveData.stats = this.getDefaultSaveData().stats;
    this.save();
  }

  resetSettings(): void {
    this.saveData.settings = this.getDefaultSaveData().settings;
    this.save();
  }

  resetAll(): void {
    this.saveData = this.getDefaultSaveData();
    this.save();
  }
}
