// Moteur de jeu principal

import { Bullet } from '../entities/Bullet';
import { Enemy, EnemyType } from '../entities/Enemy';
import { EnemyBullet } from '../entities/EnemyBullet';
import { ParticleSystem } from '../entities/Particle';
import { Player } from '../entities/Player';
import { getRandomPowerUpType, PowerUp, POWERUP_CONFIGS } from '../entities/PowerUp';
import { AudioManager } from '../systems/AudioManager';
import { CollisionSystem } from '../systems/CollisionSystem';
import { InputManager } from '../systems/InputManager';
import { RenderSystem } from '../systems/RenderSystem';
import { StorageManager } from '../systems/StorageManager';
import { WaveManager } from '../systems/WaveManager';
import { COLORS, GAME_CONFIG, GameplayPreferences, GameState, GRAPHICS_PRESETS, GraphicsQuality } from '../types';
import { Camera } from './Camera';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private input: InputManager;
  private renderer: RenderSystem;
  private collisionSystem: CollisionSystem;
  private particleSystem: ParticleSystem;
  private audioManager: AudioManager;
  private storageManager: StorageManager;
  private waveManager: WaveManager;

  private player: Player;
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private powerUps: PowerUp[] = [];

  private gameState: GameState = 'menu'; // Commence en menu
  private score: number = 0;
  private lives: number = 3;
  private highScore: number = 0;
  private isNewHighScore: boolean = false;

  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  private bulletIdCounter: number = 0;
  private enemyIdCounter: number = 0;
  private enemyBulletIdCounter: number = 0;
  private powerUpIdCounter: number = 0;
  private invincibilityTimer: number = 0;
  private readonly INVINCIBILITY_DURATION: number = 2;
  
  // FPS tracking
  private fpsHistory: number[] = [];
  private currentFPS: number = 60;
  private showFPS: boolean = true;
  private fpsUpdateTimer: number = 0;
  
  // Graphics quality
  private graphicsQuality: GraphicsQuality = 'high';
  private autoDetectQuality: boolean = true;
  private performanceTestDone: boolean = false;
  
  private gameTime: number = 0; // Temps de jeu en secondes
  private enemiesKilledThisGame: number = 0;
  
  // Système de multiplicateur de score
  private scoreMultiplier: number = 1;
  private maxMultiplier: number = 100;
  private multiplierDecayTimer: number = 0;
  private readonly MULTIPLIER_DECAY_TIME: number = 3; // Secondes avant de perdre le multiplicateur
  
  // Bombe - rayon couvrant toute l'arène
  private readonly BOMB_RADIUS: number = 2500;
  
  // Top scores
  private topScores: number[] = [];
  
  // Préférences de gameplay
  private gameplayPrefs: GameplayPreferences;
  
  // Menu options
  private optionsMenuIndex: number = 0;
  private previousState: GameState = 'menu';
  
  // Game over menu
  private gameOverMenuIndex: number = 0;
  private readonly GAMEOVER_MENU_OPTIONS = ['RETRY', 'MAIN MENU'];
  
  // Cachette secrète (zone invisible sur le mur en bas à gauche)
  private secretCacheFound: boolean = false;
  private readonly SECRET_CACHE_START_X = 0;
  private readonly SECRET_CACHE_END_X = 150;
  private readonly SECRET_CACHE_Y = GAME_CONFIG.ARENA_HEIGHT;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;

    // Initialiser les systèmes
    this.camera = new Camera(canvas.width, canvas.height);
    this.input = new InputManager();
    this.renderer = new RenderSystem(ctx, canvas.width, canvas.height);
    this.collisionSystem = new CollisionSystem();
    this.particleSystem = new ParticleSystem();
    this.audioManager = new AudioManager();
    this.storageManager = new StorageManager();
    this.waveManager = new WaveManager();

    // Charger les données sauvegardées
    this.highScore = this.storageManager.getHighScore();
    const audioSettings = this.storageManager.getAudioSettings();
    this.audioManager.loadSettings(audioSettings);
    this.topScores = this.storageManager.getTopScores();
    this.gameplayPrefs = this.storageManager.getGameplayPrefs();
    
    // Charger les paramètres graphiques
    this.graphicsQuality = this.storageManager.getGraphicsQuality();
    this.autoDetectQuality = this.storageManager.getAutoDetectQuality();
    this.applyGraphicsQuality(this.graphicsQuality);

    // Initialiser le joueur au centre de l'arène
    this.player = new Player(
      GAME_CONFIG.ARENA_WIDTH / 2,
      GAME_CONFIG.ARENA_HEIGHT / 2
    );

    // Centrer la caméra sur le joueur
    this.camera.setTarget(this.player.getPosition());
    this.camera.x = this.player.position.x - canvas.width / 2;
    this.camera.y = this.player.position.y - canvas.height / 2;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.input.init(this.canvas);
    
    // Initialiser l'audio (nécessite une interaction utilisateur)
    await this.audioManager.init();
    
    // Ne pas démarrer la musique avant le jeu
    // La musique démarre quand on clique Start
    
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
    
    // Auto-detect graphics quality after a short delay
    if (this.autoDetectQuality && !this.performanceTestDone) {
      setTimeout(() => this.autoDetectGraphicsQuality(), 1000);
    }
  }
  
  // Apply graphics quality settings to all systems
  private applyGraphicsQuality(quality: GraphicsQuality): void {
    this.graphicsQuality = quality;
    const settings = GRAPHICS_PRESETS[quality];
    
    this.renderer.setGraphicsQuality(quality);
    this.particleSystem.setGraphicsSettings(settings);
  }
  
  // Auto-detect best graphics quality based on FPS
  private autoDetectGraphicsQuality(): void {
    if (this.performanceTestDone) return;
    
    // Check current FPS after initial frames
    if (this.fpsHistory.length < 30) {
      // Not enough data yet, try again later
      setTimeout(() => this.autoDetectGraphicsQuality(), 500);
      return;
    }
    
    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    let recommendedQuality: GraphicsQuality;
    
    if (avgFPS >= 55) {
      recommendedQuality = 'ultra';
    } else if (avgFPS >= 45) {
      recommendedQuality = 'high';
    } else if (avgFPS >= 35) {
      recommendedQuality = 'medium';
    } else if (avgFPS >= 25) {
      recommendedQuality = 'low';
    } else {
      recommendedQuality = 'potato';
    }
    
    // Only downgrade, never upgrade automatically
    const qualityOrder: GraphicsQuality[] = ['potato', 'low', 'medium', 'high', 'ultra'];
    const currentIndex = qualityOrder.indexOf(this.graphicsQuality);
    const recommendedIndex = qualityOrder.indexOf(recommendedQuality);
    
    if (recommendedIndex < currentIndex) {
      console.log(`Performance auto-detection: FPS=${avgFPS.toFixed(1)}, switching from ${this.graphicsQuality} to ${recommendedQuality}`);
      this.setGraphicsQuality(recommendedQuality);
    } else {
      console.log(`Performance auto-detection: FPS=${avgFPS.toFixed(1)}, keeping ${this.graphicsQuality}`);
    }
    
    this.performanceTestDone = true;
  }
  
  // Set graphics quality
  setGraphicsQuality(quality: GraphicsQuality): void {
    this.applyGraphicsQuality(quality);
    this.storageManager.setGraphicsQuality(quality);
  }
  
  getGraphicsQuality(): GraphicsQuality {
    return this.graphicsQuality;
  }
  
  setAutoDetectQuality(enabled: boolean): void {
    this.autoDetectQuality = enabled;
    this.storageManager.setAutoDetectQuality(enabled);
    if (enabled) {
      this.performanceTestDone = false;
      setTimeout(() => this.autoDetectGraphicsQuality(), 500);
    }
  }
  
  getAutoDetectQuality(): boolean {
    return this.autoDetectQuality;
  }
  
  toggleFPSDisplay(): void {
    this.showFPS = !this.showFPS;
  }
  
  getFPS(): number {
    return this.currentFPS;
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.input.destroy();
    
    // Arrêter la musique
    this.audioManager.stopMusic();
    
    // Sauvegarder les statistiques
    this.storageManager.addTimePlayed(this.gameTime);
    this.storageManager.addEnemiesKilled(this.enemiesKilledThisGame);
  }

  private gameLoop = (currentTime: number): void => {
    if (!this.isRunning) return;

    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;
    
    // Track FPS
    if (deltaTime > 0) {
      const instantFPS = 1 / deltaTime;
      this.fpsHistory.push(instantFPS);
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
      
      // Update displayed FPS every 0.5 seconds
      this.fpsUpdateTimer += deltaTime;
      if (this.fpsUpdateTimer >= 0.5) {
        this.currentFPS = Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);
        this.fpsUpdateTimer = 0;
      }
    }

    this.update(deltaTime, currentTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number, currentTime: number): void {
    // Gestion des inputs globaux
    
    // Touche M pour mute/unmute
    if (this.input.isKeyJustPressed('m')) {
      this.toggleMute();
    }
    
    // Touche Escape ou P pour pause
    if (this.input.isKeyJustPressed('escape') || this.input.isKeyJustPressed('p')) {
      if (this.gameState === 'playing') {
        this.gameState = 'paused';
        this.audioManager.pauseMusic();
      } else if (this.gameState === 'paused') {
        this.gameState = 'playing';
        this.audioManager.resumeMusic();
      } else if (this.gameState === 'options') {
        // Retourner à l'état précédent
        this.gameState = this.previousState;
        if (this.previousState === 'playing') {
          this.audioManager.resumeMusic();
        }
      }
    }
    
    // Gérer la navigation des menus pause et options
    if (this.gameState === 'paused') {
      this.updatePauseMenu();
    }
    if (this.gameState === 'options') {
      this.updateOptionsMenu();
    }
    if (this.gameState === 'menu') {
      this.updateMainMenu();
    }
    if (this.gameState === 'gameover') {
      this.updateGameOverMenu();
    }
    
    // Si en pause ou menu ou options ou gameover, ne pas mettre à jour le jeu
    if (this.gameState !== 'playing') {
      this.input.clearJustPressed();
      return;
    }

    this.gameTime += deltaTime;

    // Mettre à jour le timer d'invincibilité
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= deltaTime;
    }

    // Mettre à jour le timer du multiplicateur
    this.multiplierDecayTimer -= deltaTime;
    if (this.multiplierDecayTimer <= 0 && this.scoreMultiplier > 1) {
      this.scoreMultiplier = Math.max(1, this.scoreMultiplier - 1);
      this.multiplierDecayTimer = this.MULTIPLIER_DECAY_TIME;
    }

    // Gérer le switch de mode de contrôle (touche Tab)
    if (this.input.isKeyJustPressed('tab')) {
      this.player.toggleControlMode();
    }
    
    // Gérer la bombe (Space)
    if (this.input.isKeyJustPressed(' ')) {
      this.useBomb();
    }
    
    // Nettoyer les touches "just pressed" à la fin du frame
    this.input.clearJustPressed();

    // Mettre à jour le joueur
    this.player.update(deltaTime, this.input, this.camera);

    // Ajouter un point de distorsion si le joueur bouge vite
    const velocity = this.player.getVelocityMagnitude();
    if (velocity > 2 && this.player.getIsThrusting()) {
      const pos = this.player.getPosition();
      this.renderer.addDistortionPoint(pos.x, pos.y, velocity * 0.5, 60 + velocity * 0.5);
    }

    // Gérer le tir
    if (this.input.isFiring()) {
      const bulletSpawns = this.player.fire(currentTime);
      if (bulletSpawns) {
        for (const spawn of bulletSpawns) {
          this.spawnBullet(spawn.x, spawn.y, spawn.angle);
        }
        this.audioManager.playShoot();
      }
    }

    // Mettre à jour les projectiles
    for (const bullet of this.bullets) {
      bullet.update(deltaTime);
      
      // Si le bullet a touché une bordure, ajouter un effet de grille et une explosion
      if (!bullet.isAlive && bullet.didHitBorder()) {
        const pos = bullet.getPosition();
        this.renderer.addDistortionPoint(pos.x, pos.y, 8, 50);
        this.particleSystem.createExplosion(pos.x, pos.y, COLORS.BULLET, 8);
      }
    }
    this.bullets = this.bullets.filter((b) => b.isAlive);

    // Mettre à jour les projectiles ennemis
    for (const bullet of this.enemyBullets) {
      bullet.update(deltaTime);
      
      // Si le bullet ennemi a touché une bordure, ajouter un effet de grille et une explosion
      if (!bullet.isAlive && bullet.didHitBorder()) {
        const pos = bullet.getPosition();
        this.renderer.addDistortionPoint(pos.x, pos.y, 8, 50);
        this.particleSystem.createExplosion(pos.x, pos.y, '#ff3333', 8);
      }
    }
    this.enemyBullets = this.enemyBullets.filter((b) => b.isAlive);

    // Mettre à jour les ennemis
    const playerPos = this.player.getPosition();
    // Collecter les positions des bullets pour les ennemis Dodger
    const bulletPositions = this.bullets.map(b => b.getPosition());
    for (const enemy of this.enemies) {
      enemy.update(deltaTime, playerPos, bulletPositions);
      
      // Récupérer les projectiles des Shooters
      const pendingBullet = enemy.getPendingBullet();
      if (pendingBullet) {
        this.spawnEnemyBullet(
          pendingBullet.position.x,
          pendingBullet.position.y,
          pendingBullet.velocity.x,
          pendingBullet.velocity.y
        );
        this.audioManager.playEnemyShoot();
      }
    }
    this.enemies = this.enemies.filter((e) => e.isAlive);

    // Mettre à jour les power-ups
    for (const powerUp of this.powerUps) {
      powerUp.update(deltaTime);
    }
    this.powerUps = this.powerUps.filter((p) => p.isAlive);

    // Système de vagues
    const enemyToSpawn = this.waveManager.update(deltaTime, this.enemies.length);
    if (enemyToSpawn) {
      this.spawnEnemy(enemyToSpawn);
      
      // Son de début de vague si c'est le premier ennemi de la vague
      if (this.waveManager.getEnemiesRemaining() === 0) {
        this.audioManager.playWaveStart();
      }
    }

    // Vérifier les collisions
    this.handleCollisions();

    // Mettre à jour les particules
    this.particleSystem.update(deltaTime);

    // Mettre à jour la caméra pour suivre le joueur
    this.camera.setTarget(this.player.getPosition());
    this.camera.update(deltaTime);
    
    // Mettre à jour les effets de distorsion de la grille
    this.renderer.updateDistortion(deltaTime);
    
    // Vérifier la cachette secrète
    this.checkSecretCache();
  }
  
  private checkSecretCache(): void {
    // N'activer que si le joueur a 0 bombe
    if (this.player.getBombCount() > 0) {
      this.secretCacheFound = false; // Réactiver la zone quand on n'a plus de bombes
      return;
    }
    
    // Éviter de donner plusieurs fois les bombes tant qu'on reste dans la zone
    if (this.secretCacheFound) return;
    
    const playerPos = this.player.getPosition();
    
    // Vérifier si le joueur touche le mur du bas dans la zone secrète
    const touchingBottomWall = playerPos.y >= this.SECRET_CACHE_Y - 30;
    const inSecretZone = playerPos.x >= this.SECRET_CACHE_START_X && playerPos.x <= this.SECRET_CACHE_END_X;
    
    if (touchingBottomWall && inSecretZone) {
      this.secretCacheFound = true;
      // Donner 3 bombes au joueur
      this.player.addBomb();
      this.player.addBomb();
      this.player.addBomb();
      // Effet visuel et sonore
      this.particleSystem.createExplosion(playerPos.x, this.SECRET_CACHE_Y - 20, '#ffd700', 30);
      this.audioManager.playPowerup();
    }
  }
  
  private renderSecretCache(): void {
    // Zone invisible - ne rien dessiner
  }

  private spawnBullet(x: number, y: number, angle: number): void {
    const id = `bullet_${this.bulletIdCounter++}`;
    this.bullets.push(new Bullet(x, y, angle, id));
  }

  private spawnEnemyBullet(x: number, y: number, vx: number, vy: number): void {
    const id = `enemy_bullet_${this.enemyBulletIdCounter++}`;
    this.enemyBullets.push(new EnemyBullet(x, y, vx, vy, id));
  }

  private spawnEnemy(type: EnemyType = 'wanderer'): void {
    // Spawn à une position aléatoire sur les bords de l'arène
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;
    const margin = 50;

    switch (side) {
      case 0: // Haut
        x = Math.random() * GAME_CONFIG.ARENA_WIDTH;
        y = margin;
        break;
      case 1: // Droite
        x = GAME_CONFIG.ARENA_WIDTH - margin;
        y = Math.random() * GAME_CONFIG.ARENA_HEIGHT;
        break;
      case 2: // Bas
        x = Math.random() * GAME_CONFIG.ARENA_WIDTH;
        y = GAME_CONFIG.ARENA_HEIGHT - margin;
        break;
      default: // Gauche
        x = margin;
        y = Math.random() * GAME_CONFIG.ARENA_HEIGHT;
    }

    // Vérifier que ce n'est pas trop proche du joueur
    const playerPos = this.player.getPosition();
    const dx = x - playerPos.x;
    const dy = y - playerPos.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);

    if (distToPlayer < 300) {
      // Trop proche, réessayer plus tard
      return;
    }

    const id = `enemy_${this.enemyIdCounter++}`;
    const speedMultiplier = this.waveManager.getSpeedMultiplier();
    this.enemies.push(new Enemy(x, y, type, id, speedMultiplier));
  }

  private spawnPowerUp(x: number, y: number): void {
    const { type, isPerpetual } = getRandomPowerUpType();
    const id = `powerup_${this.powerUpIdCounter++}`;
    this.powerUps.push(new PowerUp(x, y, type, id, isPerpetual));
  }

  private increaseMultiplier(): void {
    this.scoreMultiplier = Math.min(this.maxMultiplier, this.scoreMultiplier + 1);
    this.multiplierDecayTimer = this.MULTIPLIER_DECAY_TIME;
  }

  private resetMultiplier(): void {
    this.scoreMultiplier = 1;
    this.multiplierDecayTimer = this.MULTIPLIER_DECAY_TIME;
  }

  private handleCollisions(): void {
    const collisions = this.collisionSystem.checkCollisions(
      this.player,
      this.bullets,
      this.enemies,
      this.powerUps,
      this.enemyBullets
    );

    // Vérifier si le joueur a le powerup piercing
    const hasPiercing = this.player.powerUpState.hasPiercing();
    
    // Bullets vs Enemies
    for (const { bullet, enemy } of collisions.bulletEnemyCollisions) {
      // Gestion spéciale pour le Snake (toutes les boules sont destructibles)
      if (enemy.type === 'snake') {
        const segmentHit = enemy.checkSegmentCollision(bullet.getPosition(), 5);
        
        if (segmentHit >= 0) {
          // Touche un segment - détruire cette boule
          if (!hasPiercing) bullet.kill();
          enemy.destroySegment(segmentHit);
          const bulletPos = bullet.getPosition();
          const isHead = segmentHit === 0;
          this.particleSystem.createExplosion(bulletPos.x, bulletPos.y, isHead ? '#ff4444' : '#44ff88', 15);
          this.audioManager.playExplosion();
          this.score += (isHead ? 50 : 30) * this.scoreMultiplier;
          this.increaseMultiplier();
          continue;
        }
        
        // La tête du snake n'est pas une cible directe, seules les boules comptent
        continue;
      }
      
      // Piercing: le bullet ne meurt pas s'il a le powerup
      if (!hasPiercing) bullet.kill();
      const killed = enemy.takeDamage(1);
      
      if (killed) {
        // Gérer les splits pour le Splitter
        const pendingSplits = enemy.getPendingSplits();
        for (const split of pendingSplits) {
          const id = `enemy_${this.enemyIdCounter++}`;
          const speedMultiplier = this.waveManager.getSpeedMultiplier();
          this.enemies.push(new Enemy(split.x, split.y, 'splitter_mini', id, speedMultiplier));
        }
        
        this.score += enemy.getPoints() * this.scoreMultiplier;
        this.enemiesKilledThisGame++;
        this.waveManager.onEnemyKilled();
        this.increaseMultiplier();

        // Effet de particules et distorsion de grille
        const pos = enemy.getPosition();
        this.particleSystem.createExplosion(pos.x, pos.y, enemy.getColor(), 25);
        this.renderer.addDistortionPoint(pos.x, pos.y, 15, 70);
        this.audioManager.playExplosion();

        // Chance de drop de power-up (inversement proportionnelle à la densité d'ennemis)
        // Pas de drop pour les mini-splitters
        if (enemy.type !== 'splitter_mini') {
          const baseChance = this.waveManager.getPowerupChance();
          // Plus il y a d'ennemis, moins la chance est élevée
          const densityFactor = Math.max(0.3, 1 - (this.enemies.length / 50));
          const adjustedChance = baseChance * densityFactor;
          if (Math.random() < adjustedChance) {
            this.spawnPowerUp(pos.x, pos.y);
          }
        }

        // Vérifier high score
        if (this.score > this.highScore) {
          this.highScore = this.score;
          this.isNewHighScore = true;
          this.storageManager.updateHighScore(this.score);
        }
      }
    }

    // Player vs Power-ups
    for (const { powerUp } of collisions.playerPowerUpCollisions) {
      this.collectPowerUp(powerUp);
    }

    // Player vs Enemy Bullets (si pas invincible et pas de bouclier)
    if (this.invincibilityTimer <= 0 && !this.player.hasShield()) {
      for (const { bullet } of collisions.playerEnemyBulletCollisions) {
        bullet.kill();
        this.handlePlayerHit();
        break;
      }
    }

    // Player vs Enemies (si pas invincible)
    if (this.invincibilityTimer <= 0) {
      for (const { enemy } of collisions.playerEnemyCollisions) {
        // Si le joueur a un bouclier, détruire l'ennemi sans perdre de vie
        if (this.player.hasShield()) {
          enemy.kill();
          this.score += enemy.getPoints() * this.scoreMultiplier;
          this.enemiesKilledThisGame++;
          this.increaseMultiplier();
          
          const pos = enemy.getPosition();
          this.particleSystem.createExplosion(pos.x, pos.y, enemy.getColor(), 20);
          this.renderer.addDistortionPoint(pos.x, pos.y, 12, 60);
          this.audioManager.playExplosion();
        } else {
          enemy.kill();
          this.handlePlayerHit();
          break;
        }
      }
    }
  }

  private collectPowerUp(powerUp: PowerUp): void {
    powerUp.collect();
    this.audioManager.playPowerup();

    const type = powerUp.getType();
    const duration = powerUp.getDuration();
    const isPerpetual = powerUp.isPerpetual;

    // Effet instantané ou temporaire
    if (type === 'extraLife') {
      this.lives = Math.min(this.lives + 1, 5);
    } else if (type === 'bomb') {
      this.player.addBomb();
    } else {
      this.player.powerUpState.addPowerUp(type, duration, isPerpetual);
    }

    // Effet visuel (plus gros pour les perpétuels)
    const pos = powerUp.getPosition();
    const color = isPerpetual ? '#ffd700' : POWERUP_CONFIGS[type].color;
    this.particleSystem.createExplosion(pos.x, pos.y, color, isPerpetual ? 25 : 15);
  }

  private useBomb(): void {
    if (!this.player.useBomb()) return;

    this.audioManager.playBomb();

    const playerPos = this.player.getPosition();

    // Détruire tous les ennemis dans le rayon
    for (const enemy of this.enemies) {
      const pos = enemy.getPosition();
      const dx = pos.x - playerPos.x;
      const dy = pos.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= this.BOMB_RADIUS) {
        enemy.kill();
        this.score += enemy.getPoints() * this.scoreMultiplier;
        this.enemiesKilledThisGame++;
        this.increaseMultiplier();
        this.particleSystem.createExplosion(pos.x, pos.y, enemy.getColor(), 30);
        this.renderer.addDistortionPoint(pos.x, pos.y, 20, 80);
      }
    }

    // Détruire tous les projectiles ennemis dans le rayon
    for (const bullet of this.enemyBullets) {
      const pos = bullet.getPosition();
      const dx = pos.x - playerPos.x;
      const dy = pos.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= this.BOMB_RADIUS) {
        bullet.kill();
      }
    }

    // Effet visuel de l'onde de choc
    this.particleSystem.createBombWave(playerPos.x, playerPos.y, this.BOMB_RADIUS);
    
    // Ajouter une grosse distorsion
    this.renderer.addDistortionPoint(playerPos.x, playerPos.y, 50, this.BOMB_RADIUS);
  }

  private handlePlayerHit(): void {
    this.lives--;
    this.audioManager.playPlayerDeath(); // Son de mort stylé

    // Effet de particules (explosion du vaisseau)
    const pos = this.player.getPosition();
    this.particleSystem.createPlayerDeath(pos.x, pos.y, COLORS.PLAYER);

    // Le joueur perd ses power-ups temporaires (garde les perpétuels) et son multiplicateur
    this.resetMultiplier();
    this.player.powerUpState.clearTemporary();
    this.player.respawn(
      GAME_CONFIG.ARENA_WIDTH / 2,
      GAME_CONFIG.ARENA_HEIGHT / 2
    );

    // Rendre invincible temporairement
    this.invincibilityTimer = this.INVINCIBILITY_DURATION;

    // Game over?
    if (this.lives <= 0) {
      this.gameState = 'gameover';
      this.audioManager.playGameOver();
      this.audioManager.stopMusic();
      
      // Sauvegarder le score
      this.storageManager.addScore(this.score);
      this.storageManager.updateHighScore(this.score);
      this.storageManager.updateBestWave(this.waveManager.getCurrentWave());
      this.topScores = this.storageManager.getTopScores();
    }
  }

  private render(): void {
    // Effacer l'écran
    this.renderer.clear();

    // Dessiner les étoiles en fond avec effet parallaxe
    this.renderer.drawStarfield(this.camera);

    // Dessiner la grille de fond
    this.renderer.drawGrid(this.camera);

    // Dessiner les bordures de l'arène
    this.renderer.drawArenaBounds(this.camera);
    
    // Dessiner la cachette secrète (si pas encore trouvée)
    this.renderSecretCache();

    // Dessiner les particules (derrière les entités)
    this.particleSystem.render(this.renderer, this.camera);

    // Dessiner les power-ups
    for (const powerUp of this.powerUps) {
      powerUp.render(this.renderer, this.camera);
    }

    // Dessiner les projectiles
    const hasPiercingForRender = this.player.powerUpState.hasPiercing();
    for (const bullet of this.bullets) {
      bullet.render(this.renderer, this.camera, hasPiercingForRender);
    }

    // Dessiner les projectiles ennemis
    for (const bullet of this.enemyBullets) {
      bullet.render(this.renderer, this.camera);
    }

    // Dessiner les ennemis
    for (const enemy of this.enemies) {
      enemy.render(this.renderer, this.camera);
    }

    // Dessiner le joueur (avec clignotement si invincible)
    if (this.invincibilityTimer <= 0 || Math.floor(this.invincibilityTimer * 10) % 2 === 0) {
      this.player.render(this.renderer, this.camera);
    }

    // Dessiner le HUD
    this.renderHUD();

    // Overlay entre les vagues
    if (this.waveManager.isBetweenWaves() && this.gameState === 'playing') {
      this.renderWaveAnnouncement();
    }

    // Menu overlay
    if (this.gameState === 'menu') {
      this.renderMenu();
    }
    
    // Pause overlay
    if (this.gameState === 'paused') {
      this.renderPause();
    }

    // Options overlay
    if (this.gameState === 'options') {
      this.renderOptions();
    }

    // Game over overlay
    if (this.gameState === 'gameover') {
      this.renderGameOver();
    }
  }

  private readonly OPTIONS_ITEMS = [
    { key: 'playerSpeed', label: 'Player Speed', min: 100, max: 500, step: 20 },
    { key: 'enemySpeed', label: 'Enemy Speed', min: 50, max: 200, step: 10 },
    { key: 'enemiesPerWave', label: 'Enemies/Wave', min: 5, max: 30, step: 5 },
    { key: 'powerupChance', label: 'Powerup Chance %', min: 0, max: 100, step: 5 },
    { key: 'shieldDuration', label: 'Shield Duration', min: 1, max: 15, step: 1 },
    { key: 'rapidFireDuration', label: 'Rapid Fire Duration', min: 1, max: 15, step: 1 },
    { key: 'spreadShotDuration', label: 'Spread Shot Duration', min: 1, max: 15, step: 1 },
  ];
  
  private readonly GRAPHICS_QUALITY_OPTIONS: GraphicsQuality[] = ['potato', 'low', 'medium', 'high', 'ultra'];

  private renderOptions(): void {
    const ctx = this.renderer.getContext();

    // Overlay sombre
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    let y = 60;

    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff00ff';
    ctx.fillStyle = '#ff00ff';
    ctx.font = '32px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('OPTIONS', centerX, y);
    
    // Graphics section
    y += 40;
    ctx.font = '14px "Courier New", monospace';
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#00ffff';
    ctx.fillText('─── GRAPHICS ───', centerX, y);
    
    y += 25;
    
    // Graphics quality option (index 0)
    const graphicsIdx = 0;
    const isGraphicsSelected = this.optionsMenuIndex === graphicsIdx;
    ctx.shadowColor = isGraphicsSelected ? '#00ff00' : '#444444';
    ctx.fillStyle = isGraphicsSelected ? '#00ff00' : '#888888';
    const qualityLabel = this.graphicsQuality.toUpperCase();
    const graphicsText = isGraphicsSelected ? `> Graphics: ${qualityLabel} <` : `Graphics: ${qualityLabel}`;
    ctx.fillText(graphicsText, centerX, y);
    
    // Show FPS option (index 1)
    y += 25;
    const showFpsIdx = 1;
    const isShowFpsSelected = this.optionsMenuIndex === showFpsIdx;
    ctx.shadowColor = isShowFpsSelected ? '#00ff00' : '#444444';
    ctx.fillStyle = isShowFpsSelected ? '#00ff00' : '#888888';
    const fpsText = isShowFpsSelected ? `> Show FPS: ${this.showFPS ? 'ON' : 'OFF'} <` : `Show FPS: ${this.showFPS ? 'ON' : 'OFF'}`;
    ctx.fillText(fpsText, centerX, y);
    
    // Auto-detect option (index 2)
    y += 25;
    const autoDetectIdx = 2;
    const isAutoDetectSelected = this.optionsMenuIndex === autoDetectIdx;
    ctx.shadowColor = isAutoDetectSelected ? '#00ff00' : '#444444';
    ctx.fillStyle = isAutoDetectSelected ? '#00ff00' : '#888888';
    const autoText = isAutoDetectSelected ? `> Auto Quality: ${this.autoDetectQuality ? 'ON' : 'OFF'} <` : `Auto Quality: ${this.autoDetectQuality ? 'ON' : 'OFF'}`;
    ctx.fillText(autoText, centerX, y);
    
    // Gameplay section
    y += 35;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#00ffff';
    ctx.fillText('─── GAMEPLAY ───', centerX, y);
    
    y += 25;
    const gameplayStartIdx = 3;
    
    // Afficher les options de gameplay
    for (let i = 0; i < this.OPTIONS_ITEMS.length; i++) {
      const item = this.OPTIONS_ITEMS[i];
      const value = this.gameplayPrefs[item.key as keyof GameplayPreferences];
      const menuIdx = gameplayStartIdx + i;
      const isSelected = menuIdx === this.optionsMenuIndex;
      
      ctx.shadowColor = isSelected ? '#00ff00' : '#444444';
      ctx.fillStyle = isSelected ? '#00ff00' : '#888888';
      
      const text = isSelected ? `> ${item.label}: ${value} <` : `${item.label}: ${value}`;
      ctx.fillText(text, centerX, y + i * 22);
    }
    
    // Option Reset et Back
    const resetIdx = gameplayStartIdx + this.OPTIONS_ITEMS.length;
    const backIdx = resetIdx + 1;
    const yOffset = y + this.OPTIONS_ITEMS.length * 22;
    
    ctx.shadowColor = this.optionsMenuIndex === resetIdx ? '#ffff00' : '#444444';
    ctx.fillStyle = this.optionsMenuIndex === resetIdx ? '#ffff00' : '#888888';
    ctx.fillText(this.optionsMenuIndex === resetIdx ? '> RESET DEFAULTS <' : 'RESET DEFAULTS', centerX, yOffset + 25);
    
    ctx.shadowColor = this.optionsMenuIndex === backIdx ? '#00ffff' : '#444444';
    ctx.fillStyle = this.optionsMenuIndex === backIdx ? '#00ffff' : '#888888';
    ctx.fillText(this.optionsMenuIndex === backIdx ? '> BACK <' : 'BACK', centerX, yOffset + 50);
    
    // Current FPS display
    const fpsColor = this.currentFPS >= 50 ? '#00ff00' : this.currentFPS >= 30 ? '#ffff00' : '#ff0000';
    ctx.font = '12px "Courier New", monospace';
    ctx.shadowColor = fpsColor;
    ctx.fillStyle = fpsColor;
    ctx.fillText(`Current FPS: ${this.currentFPS}`, centerX, this.canvas.height - 50);
    
    // Instructions
    ctx.shadowColor = '#666666';
    ctx.fillStyle = '#666666';
    ctx.fillText('↑↓ Navigate | ←→ Adjust Value | Enter/Esc to go back', centerX, this.canvas.height - 30);
    
    ctx.restore();
  }

  private renderHUD(): void {
    if (this.gameState === 'menu') return;
    
    // Score avec multiplicateur
    this.renderer.drawNeonText(`SCORE: ${this.score}`, 20, 40, '#00ffff', 24);
    
    // Multiplicateur - toujours affiché (même x1)
    const multColor = this.scoreMultiplier >= this.maxMultiplier ? '#ff00ff' : 
                      this.scoreMultiplier > 1 ? '#ffff00' : '#666666';
    const scoreText = `SCORE: ${this.score}`;
    const scoreWidth = scoreText.length * 14;
    this.renderer.drawNeonText(`x${this.scoreMultiplier}`, 20 + scoreWidth + 15, 40, multColor, 24);

    // High Score
    const highScoreColor = this.isNewHighScore ? '#ffff00' : '#888888';
    this.renderer.drawNeonText(`HI: ${this.highScore}`, 20, 65, highScoreColor, 16);

    // Vies et Bombes sur la même ligne
    this.renderer.drawNeonText(`LIVES: ${this.lives}`, 20, 95, '#ff00ff', 20);
    const bombs = this.player.getBombCount();
    this.renderer.drawNeonText(`BOMBS: ${bombs}`, 150, 95, '#ff0066', 20);
    this.renderer.drawNeonText('[SPACE]', 250, 95, '#666666', 10);

    // Zone d'informations de vague (en haut à droite)
    this.renderWaveInfo();

    // Mode de contrôle (en bas à gauche pour éviter la superposition)
    const controlMode = this.player.getControlMode();
    const modeText = controlMode === 'relative' ? 'REL' : 'ABS';
    const modeColor = controlMode === 'relative' ? '#00ffff' : '#ff8800';
    this.renderer.drawNeonText(`[TAB] ${modeText}`, 20, this.canvas.height - 20, modeColor, 14);
    
    // Mute indication (en bas à droite, au-dessus de pause)
    const audioSettings = this.audioManager.getSettings();
    const muteText = audioSettings.muted ? '[M] Unmute' : '[M] Mute';
    const muteColor = audioSettings.muted ? '#ff4444' : '#666666';
    this.renderer.drawNeonText(muteText, this.canvas.width - 100, this.canvas.height - 38, muteColor, 12);
    
    // Pause indication
    this.renderer.drawNeonText('[P] Pause', this.canvas.width - 100, this.canvas.height - 20, '#666666', 12);
    
    // FPS Counter (top right, small)
    if (this.showFPS) {
      const fpsColor = this.currentFPS >= 50 ? '#00ff00' : this.currentFPS >= 30 ? '#ffff00' : '#ff0000';
      this.renderer.drawNeonText(`FPS: ${this.currentFPS}`, this.canvas.width - 80, 20, fpsColor, 12);
      // Also show quality level
      const qualityColors: Record<GraphicsQuality, string> = {
        potato: '#ff4444',
        low: '#ff8844',
        medium: '#ffff44',
        high: '#44ff44',
        ultra: '#44ffff'
      };
      this.renderer.drawNeonText(`[${this.graphicsQuality.toUpperCase()}]`, this.canvas.width - 80, 35, qualityColors[this.graphicsQuality], 10);
    }

    // Power-ups actifs
    const activePowerUps = this.player.powerUpState.getActivePowerUps();
    let powerUpY = 130;
    for (const { type, remainingTime, isPerpetual } of activePowerUps) {
      const config = POWERUP_CONFIGS[type];
      const text = isPerpetual ? `${config.symbol}: ∞` : `${config.symbol}: ${remainingTime.toFixed(1)}s`;
      const color = isPerpetual ? '#ffd700' : config.color;
      this.renderer.drawNeonText(text, 20, powerUpY, color, 14);
      powerUpY += 20;
    }
  }

  private renderWaveInfo(): void {
    const ctx = this.renderer.getContext();
    const rightX = this.canvas.width - 60;
    
    // Numéro de vague (en haut à droite)
    const wave = this.waveManager.getCurrentWave();
    // Position dynamique selon le nombre de chiffres
    const waveText = `WAVE ${wave}`;
    const waveTextWidth = waveText.length * 12;
    this.renderer.drawNeonText(waveText, rightX - waveTextWidth, 40, '#00ff00', 20);
    
    // Barre d'avancement de la vague (centrée verticalement, grande)
    const waveConfig = this.waveManager.getCurrentConfig();
    if (waveConfig && this.waveManager.isWaveActive()) {
      const barWidth = 12;
      const margin = 30;
      const barHeight = this.canvas.height - 2 * margin - 100; // Presque toute la hauteur, avec marges
      const barX = rightX - barWidth / 2;
      const barY = (this.canvas.height - barHeight) / 2; // Centré verticalement
      
      // Calcul de la progression
      const totalEnemies = waveConfig.enemyCount;
      const enemiesKilled = totalEnemies - this.waveManager.getEnemiesRemaining() - this.enemies.length;
      const progress = Math.max(0, Math.min(1, enemiesKilled / totalEnemies));
      
      ctx.save();
      
      // Fond de la barre
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(barX - barWidth / 2, barY, barWidth, barHeight);
      
      // Bordure néon
      ctx.strokeStyle = '#00ff00';
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.strokeRect(barX - barWidth / 2, barY, barWidth, barHeight);
      
      // Progression (du bas vers le haut)
      const fillHeight = progress * barHeight;
      if (fillHeight > 0) {
        const gradient = ctx.createLinearGradient(barX, barY + barHeight, barX, barY + barHeight - fillHeight);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(0.5, '#44ff44');
        gradient.addColorStop(1, '#88ff88');
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.fillRect(barX - barWidth / 2 + 2, barY + barHeight - fillHeight, barWidth - 4, fillHeight);
      }
      
      // Stats de la vague: X / Y (tués / total) - sous la barre
      ctx.shadowBlur = 5;
      ctx.font = '12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00ff00';
      ctx.fillText(`${enemiesKilled}/${totalEnemies}`, barX, barY + barHeight + 20);
      
      ctx.restore();
    }
  }

  private renderWaveAnnouncement(): void {
    const ctx = this.renderer.getContext();
    const nextWave = this.waveManager.getCurrentWave() + 1;
    const timeLeft = this.waveManager.getNextWaveTime();

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ff00';
    ctx.fillStyle = '#00ff00';
    ctx.font = '36px "Courier New", monospace';
    ctx.textAlign = 'center';
    
    if (nextWave === 1) {
      ctx.fillText('GET READY!', centerX, centerY);
    } else {
      ctx.fillText(`WAVE ${nextWave}`, centerX, centerY);
    }
    
    ctx.font = '20px "Courier New", monospace';
    ctx.fillText(`Starting in ${timeLeft.toFixed(1)}s`, centerX, centerY + 40);
    
    ctx.restore();
  }

  private renderMenu(): void {
    const ctx = this.renderer.getContext();

    // Overlay sombre
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Titre
    ctx.save();
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 56px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GEOMETRY WARS', centerX, centerY - 120);
    
    ctx.shadowColor = '#ff00ff';
    ctx.fillStyle = '#ff00ff';
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillText('MAX', centerX + 180, centerY - 100);

    // Bouton Start
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ff00';
    ctx.fillStyle = '#00ff00';
    ctx.font = '28px "Courier New", monospace';
    ctx.fillText('[ CLICK TO START ]', centerX, centerY);

    // High Score
    ctx.shadowColor = '#ffff00';
    ctx.fillStyle = '#ffff00';
    ctx.font = '20px "Courier New", monospace';
    ctx.fillText(`HIGH SCORE: ${this.highScore}`, centerX, centerY + 50);

    // Tableau des scores (commencent à 2 car high score est le #1)
    if (this.topScores.length > 1) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff00ff';
      ctx.fillStyle = '#ff00ff';
      ctx.font = '18px "Courier New", monospace';
      ctx.fillText('─── TOP SCORES ───', centerX, centerY + 100);
      
      ctx.font = '14px "Courier New", monospace';
      const displayScores = this.topScores.slice(1, 5); // Skip le #1 (déjà affiché comme high score)
      for (let i = 0; i < displayScores.length; i++) {
        ctx.shadowColor = '#00ffff';
        ctx.fillStyle = '#00ffff';
        ctx.fillText(`${i + 2}. ${displayScores[i]}`, centerX, centerY + 130 + i * 22);
      }
    }

    // Options
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#888888';
    ctx.fillStyle = '#888888';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('[O] OPTIONS', centerX, this.canvas.height - 60);

    // Contrôles
    ctx.shadowBlur = 5;
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText('ZQSD: Move | Mouse: Aim | Click: Fire | Space: Bomb | Tab: Mode | P: Pause', centerX, this.canvas.height - 30);
    
    ctx.restore();
  }

  private updateMainMenu(): void {
    // Touche O pour options
    if (this.input.isKeyJustPressed('o')) {
      this.previousState = 'menu';
      this.gameState = 'options';
      this.optionsMenuIndex = 0;
    }
    
    // Clic pour démarrer
    if (this.input.isFiring()) {
      this.startGame();
    }
  }

  private updatePauseMenu(): void {
    // Navigation clavier
    if (this.input.isKeyJustPressed('arrowup') || this.input.isKeyJustPressed('w') || this.input.isKeyJustPressed('z')) {
      this.pauseMenuIndex = (this.pauseMenuIndex - 1 + this.PAUSE_MENU_OPTIONS.length) % this.PAUSE_MENU_OPTIONS.length;
    }
    if (this.input.isKeyJustPressed('arrowdown') || this.input.isKeyJustPressed('s')) {
      this.pauseMenuIndex = (this.pauseMenuIndex + 1) % this.PAUSE_MENU_OPTIONS.length;
    }
    
    // Sélection
    if (this.input.isKeyJustPressed('enter') || this.input.isFiring()) {
      this.handlePauseMenuSelection();
    }
  }

  private updateOptionsMenu(): void {
    // Index constants
    const graphicsIdx = 0;
    const showFpsIdx = 1;
    const autoDetectIdx = 2;
    const gameplayStartIdx = 3;
    const resetIdx = gameplayStartIdx + this.OPTIONS_ITEMS.length;
    const backIdx = resetIdx + 1;
    const totalOptions = backIdx + 1;
    
    // Navigation
    if (this.input.isKeyJustPressed('arrowup') || this.input.isKeyJustPressed('w') || this.input.isKeyJustPressed('z')) {
      this.optionsMenuIndex = (this.optionsMenuIndex - 1 + totalOptions) % totalOptions;
    }
    if (this.input.isKeyJustPressed('arrowdown') || this.input.isKeyJustPressed('s')) {
      this.optionsMenuIndex = (this.optionsMenuIndex + 1) % totalOptions;
    }
    
    // Ajuster valeur selon l'option sélectionnée
    const leftPressed = this.input.isKeyJustPressed('arrowleft') || this.input.isKeyJustPressed('a') || this.input.isKeyJustPressed('q');
    const rightPressed = this.input.isKeyJustPressed('arrowright') || this.input.isKeyJustPressed('d');
    
    if (this.optionsMenuIndex === graphicsIdx) {
      // Graphics quality
      const currentIdx = this.GRAPHICS_QUALITY_OPTIONS.indexOf(this.graphicsQuality);
      if (leftPressed && currentIdx > 0) {
        this.setGraphicsQuality(this.GRAPHICS_QUALITY_OPTIONS[currentIdx - 1]);
      }
      if (rightPressed && currentIdx < this.GRAPHICS_QUALITY_OPTIONS.length - 1) {
        this.setGraphicsQuality(this.GRAPHICS_QUALITY_OPTIONS[currentIdx + 1]);
      }
    } else if (this.optionsMenuIndex === showFpsIdx) {
      // Show FPS toggle
      if (leftPressed || rightPressed) {
        this.showFPS = !this.showFPS;
      }
    } else if (this.optionsMenuIndex === autoDetectIdx) {
      // Auto-detect toggle
      if (leftPressed || rightPressed) {
        this.setAutoDetectQuality(!this.autoDetectQuality);
      }
    } else if (this.optionsMenuIndex >= gameplayStartIdx && this.optionsMenuIndex < resetIdx) {
      // Gameplay options
      const itemIdx = this.optionsMenuIndex - gameplayStartIdx;
      const item = this.OPTIONS_ITEMS[itemIdx];
      const key = item.key as keyof GameplayPreferences;
      
      if (leftPressed) {
        const newVal = Math.max(item.min, (this.gameplayPrefs[key] as number) - item.step);
        this.gameplayPrefs[key] = newVal as never;
        this.storageManager.updateGameplayPrefs({ [key]: newVal });
      }
      if (rightPressed) {
        const newVal = Math.min(item.max, (this.gameplayPrefs[key] as number) + item.step);
        this.gameplayPrefs[key] = newVal as never;
        this.storageManager.updateGameplayPrefs({ [key]: newVal });
      }
    }
    
    // Sélection
    if (this.input.isKeyJustPressed('enter') || (this.optionsMenuIndex >= resetIdx && this.input.isFiring())) {
      if (this.optionsMenuIndex === resetIdx) {
        this.storageManager.resetGameplayPrefs();
        this.gameplayPrefs = this.storageManager.getGameplayPrefs();
        // Also reset graphics to high
        this.setGraphicsQuality('high');
        this.setAutoDetectQuality(true);
      } else if (this.optionsMenuIndex === backIdx) {
        this.gameState = this.previousState;
        if (this.previousState === 'playing') {
          this.audioManager.resumeMusic();
        }
      }
    }
  }

  private startGame(): void {
    this.score = 0;
    this.lives = 3;
    this.gameState = 'playing';
    this.bullets = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.powerUps = [];
    this.particleSystem.clear();
    this.waveManager.reset();
    this.invincibilityTimer = this.INVINCIBILITY_DURATION;
    this.isNewHighScore = false;
    this.gameTime = 0;
    this.enemiesKilledThisGame = 0;
    this.secretCacheFound = false;
    this.resetMultiplier();
    
    this.player.reset(
      GAME_CONFIG.ARENA_WIDTH / 2,
      GAME_CONFIG.ARENA_HEIGHT / 2
    );
    
    this.storageManager.addGamePlayed();
    this.audioManager.startMusic();
  }

  private pauseMenuIndex: number = 0;
  private readonly PAUSE_MENU_OPTIONS = ['RESUME', 'OPTIONS', 'MAIN MENU'];

  private renderPause(): void {
    const ctx = this.renderer.getContext();

    // Overlay semi-transparent
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffff00';
    ctx.fillStyle = '#ffff00';
    ctx.font = '48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', centerX, centerY - 80);
    
    // Menu options - centré verticalement
    ctx.font = '24px "Courier New", monospace';
    const menuStartY = centerY - 20;
    for (let i = 0; i < this.PAUSE_MENU_OPTIONS.length; i++) {
      const isSelected = i === this.pauseMenuIndex;
      ctx.shadowColor = isSelected ? '#00ff00' : '#666666';
      ctx.fillStyle = isSelected ? '#00ff00' : '#888888';
      const text = isSelected ? `> ${this.PAUSE_MENU_OPTIONS[i]} <` : this.PAUSE_MENU_OPTIONS[i];
      ctx.fillText(text, centerX, menuStartY + i * 40);
    }
    
    ctx.font = '14px "Courier New", monospace';
    ctx.shadowColor = '#666666';
    ctx.fillStyle = '#666666';
    ctx.fillText('↑↓ or W/S to select | Enter or Click to confirm | M to mute', centerX, centerY + 150);
    
    ctx.restore();

    // Navigation clavier
    if (this.input.isKeyJustPressed('arrowup') || this.input.isKeyJustPressed('w') || this.input.isKeyJustPressed('z')) {
      this.pauseMenuIndex = (this.pauseMenuIndex - 1 + this.PAUSE_MENU_OPTIONS.length) % this.PAUSE_MENU_OPTIONS.length;
    }
    if (this.input.isKeyJustPressed('arrowdown') || this.input.isKeyJustPressed('s')) {
      this.pauseMenuIndex = (this.pauseMenuIndex + 1) % this.PAUSE_MENU_OPTIONS.length;
    }
    
    // Sélection
    if (this.input.isKeyJustPressed('enter') || this.input.isFiring()) {
      this.handlePauseMenuSelection();
    }
  }

  private handlePauseMenuSelection(): void {
    switch (this.pauseMenuIndex) {
      case 0: // Resume
        this.gameState = 'playing';
        this.audioManager.resumeMusic();
        break;
      case 1: // Options
        this.previousState = 'paused';
        this.gameState = 'options';
        this.optionsMenuIndex = 0;
        break;
      case 2: // Main Menu
        this.audioManager.stopMusic();
        this.gameState = 'menu';
        // Sauvegarder la partie en cours
        this.storageManager.addTimePlayed(this.gameTime);
        this.storageManager.addEnemiesKilled(this.enemiesKilledThisGame);
        if (this.score > 0) {
          this.storageManager.addScore(this.score);
          this.topScores = this.storageManager.getTopScores();
        }
        break;
    }
    this.pauseMenuIndex = 0;
  }

  private updateGameOverMenu(): void {
    // Navigation clavier
    if (this.input.isKeyJustPressed('arrowup') || this.input.isKeyJustPressed('w') || this.input.isKeyJustPressed('z')) {
      this.gameOverMenuIndex = (this.gameOverMenuIndex - 1 + this.GAMEOVER_MENU_OPTIONS.length) % this.GAMEOVER_MENU_OPTIONS.length;
    }
    if (this.input.isKeyJustPressed('arrowdown') || this.input.isKeyJustPressed('s')) {
      this.gameOverMenuIndex = (this.gameOverMenuIndex + 1) % this.GAMEOVER_MENU_OPTIONS.length;
    }
    
    // Sélection avec Enter uniquement (pas de clic pour éviter le restart accidentel)
    if (this.input.isKeyJustPressed('enter')) {
      this.handleGameOverSelection();
    }
  }

  private handleGameOverSelection(): void {
    switch (this.gameOverMenuIndex) {
      case 0: // Retry
        this.reset();
        break;
      case 1: // Main Menu
        this.gameState = 'menu';
        this.topScores = this.storageManager.getTopScores();
        break;
    }
    this.gameOverMenuIndex = 0;
  }

  private renderGameOver(): void {
    const ctx = this.renderer.getContext();

    // Overlay sombre
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Texte Game Over
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff0000';
    ctx.fillStyle = '#ff0000';
    ctx.font = '48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', centerX, centerY - 80);

    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#00ffff';
    ctx.font = '24px "Courier New", monospace';
    ctx.fillText(`Final Score: ${this.score}`, centerX, centerY - 30);

    // Nouveau high score?
    if (this.isNewHighScore) {
      ctx.shadowColor = '#ffff00';
      ctx.fillStyle = '#ffff00';
      ctx.fillText('NEW HIGH SCORE!', centerX, centerY);
    }

    ctx.shadowColor = '#00ff00';
    ctx.fillStyle = '#00ff00';
    ctx.font = '18px "Courier New", monospace';
    ctx.fillText(`Wave Reached: ${this.waveManager.getCurrentWave()}`, centerX, centerY + 35);
    
    // Menu options
    ctx.font = '24px "Courier New", monospace';
    const menuStartY = centerY + 80;
    for (let i = 0; i < this.GAMEOVER_MENU_OPTIONS.length; i++) {
      const isSelected = i === this.gameOverMenuIndex;
      ctx.shadowColor = isSelected ? '#00ff00' : '#666666';
      ctx.fillStyle = isSelected ? '#00ff00' : '#888888';
      const text = isSelected ? `> ${this.GAMEOVER_MENU_OPTIONS[i]} <` : this.GAMEOVER_MENU_OPTIONS[i];
      ctx.fillText(text, centerX, menuStartY + i * 35);
    }
    
    // Instructions
    ctx.font = '12px "Courier New", monospace';
    ctx.shadowColor = '#666666';
    ctx.fillStyle = '#666666';
    ctx.fillText('↑↓ to select | Enter to confirm', centerX, menuStartY + 100);

    ctx.restore();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.resize(width, height);
    this.renderer.resize(width, height);
  }

  // Getters pour l'état du jeu
  getScore(): number {
    return this.score;
  }

  getLives(): number {
    return this.lives;
  }

  getGameState(): GameState {
    return this.gameState;
  }

  getHighScore(): number {
    return this.highScore;
  }

  getCurrentWave(): number {
    return this.waveManager.getCurrentWave();
  }

  // Contrôle du jeu
  pause(): void {
    this.gameState = 'paused';
  }

  // Pause automatique (quand l'onglet perd le focus)
  autoPause(): void {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.audioManager.pauseMusic();
    }
  }

  resume(): void {
    this.gameState = 'playing';
    this.audioManager.resume();
  }

  reset(): void {
    // Sauvegarder les stats de la partie terminée
    this.storageManager.addTimePlayed(this.gameTime);
    this.storageManager.addEnemiesKilled(this.enemiesKilledThisGame);
    
    this.score = 0;
    this.lives = 3;
    this.gameState = 'playing';
    this.bullets = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.powerUps = [];
    this.particleSystem.clear();
    this.waveManager.reset();
    this.invincibilityTimer = this.INVINCIBILITY_DURATION;
    this.isNewHighScore = false;
    this.gameTime = 0;
    this.enemiesKilledThisGame = 0;
    this.secretCacheFound = false;
    this.resetMultiplier();
    
    this.player.reset(
      GAME_CONFIG.ARENA_WIDTH / 2,
      GAME_CONFIG.ARENA_HEIGHT / 2
    );
    
    this.storageManager.addGamePlayed();
    this.audioManager.startMusic();
  }

  // Audio controls
  toggleMute(): boolean {
    const muted = this.audioManager.toggleMute();
    this.storageManager.updateAudioSettings({ muted });
    return muted;
  }

  setVolume(volume: number): void {
    this.audioManager.setMasterVolume(volume);
    this.storageManager.updateAudioSettings({ masterVolume: volume });
  }
}
