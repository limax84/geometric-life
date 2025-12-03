// Entités ennemis - Wanderer, Chaser, Shooter, Diamond, Dodger, Splitter, Snake, Boss

import { Vector2, COLORS, GAME_CONFIG } from '../types';
import { Camera } from '../engine/Camera';
import { RenderSystem } from '../systems/RenderSystem';
import {
  createVector,
  addVectors,
  multiplyVector,
  normalize,
  magnitude,
  subtractVectors,
} from '../utils/Vector2';

export type EnemyType = 'wanderer' | 'chaser' | 'shooter' | 'diamond' | 'dodger' | 'splitter' | 'splitter_mini' | 'snake' | 'boss_hexagon';

// Couleurs par type d'ennemi
export const ENEMY_COLORS: Record<EnemyType, string> = {
  wanderer: '#ff00ff',
  chaser: '#ff4400',
  shooter: '#00ff88',
  diamond: '#4488ff',
  dodger: '#ff2200',
  splitter: '#ffaa00',
  splitter_mini: '#ffcc44',
  snake: '#44ff88',
  boss_hexagon: '#ff00aa',
};

// Points par type d'ennemi
export const ENEMY_POINTS: Record<EnemyType, number> = {
  wanderer: 100,
  chaser: 150,
  shooter: 200,
  diamond: 120,
  dodger: 250,
  splitter: 180,
  splitter_mini: 60,
  snake: 300,
  boss_hexagon: 5000,
};

interface EnemyConfig {
  size: number;
  speed: number;
  health: number;
  shootInterval?: number;
  dodgeStrength?: number;
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  wanderer: { size: 15, speed: GAME_CONFIG.ENEMY_SPEED, health: 1 },
  chaser: { size: 12, speed: GAME_CONFIG.ENEMY_SPEED * 1.3, health: 1 },
  shooter: { size: 18, speed: GAME_CONFIG.ENEMY_SPEED * 0.6, health: 2 },
  diamond: { size: 14, speed: GAME_CONFIG.ENEMY_SPEED * 0.9, health: 1 },
  dodger: { size: 16, speed: GAME_CONFIG.ENEMY_SPEED * 0.9, health: 2, dodgeStrength: 0.92 },
  splitter: { size: 22, speed: GAME_CONFIG.ENEMY_SPEED * 0.7, health: 2 },
  splitter_mini: { size: 10, speed: GAME_CONFIG.ENEMY_SPEED * 1.4, health: 1 },
  snake: { size: 18, speed: GAME_CONFIG.ENEMY_SPEED * 0.8, health: 4 },
  boss_hexagon: { size: 50, speed: 0, health: 50, shootInterval: 1.5 },
};

export interface EnemyBullet {
  position: Vector2;
  velocity: Vector2;
  isAlive: boolean;
}

export class Enemy {
  id: string;
  position: Vector2;
  velocity: Vector2;
  rotation: number = 0;
  isAlive: boolean = true;
  type: EnemyType;
  points: number;
  health: number;

  private size: number;
  private baseSpeed: number;
  private speedMultiplier: number = 1;
  private rotationSpeed: number;
  
  private changeDirectionTimer: number = 0;
  private changeDirectionInterval: number = 2;
  private chaseAcceleration: number = 200;
  private maxSpeed: number;
  
  private shootTimer: number = 0;
  private shootInterval: number = 2.5;
  private pendingBullet: EnemyBullet | null = null;
  private pendingBullets: EnemyBullet[] = [];
  
  private dodgeStrength: number = 0.92;
  private glowPhase: number = 0;
  private pendingSplits: { x: number; y: number }[] = [];
  
  // Snake
  private segments: Vector2[] = [];
  private segmentCount: number = 9;
  private segmentSpacing: number = 18;
  private targetAngle: number = 0;
  
  // Boss
  private teleportTimer: number = 0;
  private teleportInterval: number = 3;
  private maxHealth: number = 1;
  private teleportFlash: number = 0;
  private chargeTimer: number = 0; // Temps de charge après téléportation
  private isCharging: boolean = false;

  constructor(x: number, y: number, type: EnemyType, id: string, speedMultiplier: number = 1) {
    this.id = id;
    this.position = createVector(x, y);
    this.type = type;
    this.speedMultiplier = speedMultiplier;

    const config = ENEMY_CONFIGS[type];
    this.size = config.size;
    this.baseSpeed = config.speed * speedMultiplier;
    this.maxSpeed = this.baseSpeed * 1.5;
    this.health = config.health;
    this.maxHealth = config.health;
    this.points = ENEMY_POINTS[type];

    if (config.shootInterval) {
      this.shootInterval = config.shootInterval;
    }
    if (type === 'dodger' && config.dodgeStrength) {
      this.dodgeStrength = config.dodgeStrength;
    }

    const angle = Math.random() * Math.PI * 2;
    this.velocity = {
      x: Math.cos(angle) * this.baseSpeed,
      y: Math.sin(angle) * this.baseSpeed,
    };
    this.rotationSpeed = (Math.random() - 0.5) * 4;
    
    if (type === 'shooter') {
      this.shootTimer = Math.random() * this.shootInterval;
    }
    
    if (type === 'snake') {
      this.segments = [];
      for (let i = 0; i < this.segmentCount; i++) {
        this.segments.push({ x: x - (i + 1) * this.segmentSpacing, y: y });
      }
      this.targetAngle = Math.random() * Math.PI * 2;
    }
    
    if (type === 'boss_hexagon') {
      this.teleportTimer = 1;
      this.rotationSpeed = 1;
      this.isCharging = true;
      this.chargeTimer = 1; // 1 seconde de charge au spawn
    }
  }

  update(deltaTime: number, playerPosition: Vector2, bulletPositions?: Vector2[]): void {
    if (!this.isAlive) return;

    this.rotation += this.rotationSpeed * deltaTime;
    
    if (this.type === 'dodger') this.glowPhase += deltaTime * 3;
    if (this.type === 'splitter' || this.type === 'splitter_mini') this.glowPhase += deltaTime * 4;
    if (this.type === 'boss_hexagon') this.glowPhase += deltaTime * 2;

    switch (this.type) {
      case 'wanderer': this.updateWanderer(deltaTime); break;
      case 'chaser': this.updateChaser(deltaTime, playerPosition); break;
      case 'shooter': this.updateShooter(deltaTime, playerPosition); break;
      case 'diamond': this.updateDiamond(deltaTime, playerPosition); break;
      case 'dodger': this.updateDodger(deltaTime, playerPosition, bulletPositions || []); break;
      case 'splitter':
      case 'splitter_mini': this.updateSplitter(deltaTime, playerPosition); break;
      case 'snake': this.updateSnake(deltaTime, playerPosition); break;
      case 'boss_hexagon': this.updateBossHexagon(deltaTime, playerPosition); break;
    }

    if (this.type !== 'boss_hexagon') {
      this.position = addVectors(this.position, multiplyVector(this.velocity, deltaTime));
      this.bounceOffWalls();
    }
  }

  private updateWanderer(deltaTime: number): void {
    this.changeDirectionTimer += deltaTime;
    if (this.changeDirectionTimer >= this.changeDirectionInterval) {
      this.changeDirectionTimer = 0;
      this.changeDirection();
    }
  }

  private updateChaser(deltaTime: number, playerPosition: Vector2): void {
    const toPlayer = subtractVectors(playerPosition, this.position);
    const distance = magnitude(toPlayer);
    if (distance > 0) {
      const direction = normalize(toPlayer);
      this.velocity.x += direction.x * this.chaseAcceleration * deltaTime;
      this.velocity.y += direction.y * this.chaseAcceleration * deltaTime;
      const speed = magnitude(this.velocity);
      if (speed > this.maxSpeed) {
        this.velocity = multiplyVector(normalize(this.velocity), this.maxSpeed);
      }
    }
    this.rotation = Math.atan2(this.velocity.y, this.velocity.x);
  }

  private updateShooter(deltaTime: number, playerPosition: Vector2): void {
    this.changeDirectionTimer += deltaTime;
    if (this.changeDirectionTimer >= this.changeDirectionInterval * 1.5) {
      this.changeDirectionTimer = 0;
      this.changeDirection();
    }
    this.shootTimer += deltaTime;
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      this.shoot(playerPosition);
    }
    const toPlayer = subtractVectors(playerPosition, this.position);
    this.rotation = Math.atan2(toPlayer.y, toPlayer.x);
  }

  private shoot(playerPosition: Vector2): void {
    const toPlayer = subtractVectors(playerPosition, this.position);
    const distance = magnitude(toPlayer);
    if (distance > 0) {
      const direction = normalize(toPlayer);
      const bulletSpeed = 250;
      this.pendingBullet = {
        position: { ...this.position },
        velocity: { x: direction.x * bulletSpeed, y: direction.y * bulletSpeed },
        isAlive: true,
      };
    }
  }

  private updateDiamond(deltaTime: number, playerPosition: Vector2): void {
    const toPlayer = subtractVectors(playerPosition, this.position);
    const distance = magnitude(toPlayer);
    if (distance > 0) {
      const direction = normalize(toPlayer);
      this.velocity.x += (direction.x * this.baseSpeed - this.velocity.x) * deltaTime * 2;
      this.velocity.y += (direction.y * this.baseSpeed - this.velocity.y) * deltaTime * 2;
    }
    this.rotation = Math.atan2(this.velocity.y, this.velocity.x) + Math.PI / 4;
  }

  private updateDodger(deltaTime: number, playerPosition: Vector2, bulletPositions: Vector2[]): void {
    const toPlayer = subtractVectors(playerPosition, this.position);
    const distToPlayer = magnitude(toPlayer);
    let targetVelocity = { x: 0, y: 0 };
    if (distToPlayer > 0) {
      const direction = normalize(toPlayer);
      targetVelocity = { x: direction.x * this.baseSpeed, y: direction.y * this.baseSpeed };
    }
    
    const dodgeRadius = 200;
    let dodgeVector = { x: 0, y: 0 };
    for (const bulletPos of bulletPositions) {
      const toBullet = subtractVectors(bulletPos, this.position);
      const distToBullet = magnitude(toBullet);
      if (distToBullet < dodgeRadius && distToBullet > 0) {
        const dodgeDirection = normalize(toBullet);
        const dodgeForce = (1 - distToBullet / dodgeRadius) * this.dodgeStrength * 500;
        const perpX = -dodgeDirection.y;
        const perpY = dodgeDirection.x;
        const cross = dodgeDirection.x * this.velocity.y - dodgeDirection.y * this.velocity.x;
        const sign = cross >= 0 ? 1 : -1;
        dodgeVector.x += perpX * dodgeForce * sign - dodgeDirection.x * dodgeForce * 0.3;
        dodgeVector.y += perpY * dodgeForce * sign - dodgeDirection.y * dodgeForce * 0.3;
      }
    }
    targetVelocity.x += dodgeVector.x;
    targetVelocity.y += dodgeVector.y;
    this.velocity.x += (targetVelocity.x - this.velocity.x) * deltaTime * 8;
    this.velocity.y += (targetVelocity.y - this.velocity.y) * deltaTime * 8;
    const currentSpeed = magnitude(this.velocity);
    if (currentSpeed > this.maxSpeed * 1.5) {
      this.velocity = multiplyVector(normalize(this.velocity), this.maxSpeed * 1.5);
    }
    const speed = magnitude(this.velocity);
    if (speed > 0) this.rotation = Math.atan2(this.velocity.y, this.velocity.x);
  }

  private updateSplitter(deltaTime: number, playerPosition: Vector2): void {
    const toPlayer = subtractVectors(playerPosition, this.position);
    const distance = magnitude(toPlayer);
    if (distance > 0) {
      const direction = normalize(toPlayer);
      this.velocity.x += (direction.x * this.baseSpeed - this.velocity.x) * deltaTime * 2;
      this.velocity.y += (direction.y * this.baseSpeed - this.velocity.y) * deltaTime * 2;
    }
    const speed = magnitude(this.velocity);
    if (speed > 0) this.rotation = Math.atan2(this.velocity.y, this.velocity.x);
  }

  private updateSnake(deltaTime: number, playerPosition: Vector2): void {
    // Si plus de segments, le snake meurt
    if (this.segments.length === 0) {
      this.kill();
      return;
    }
    
    const toPlayer = subtractVectors(playerPosition, this.position);
    const distToPlayer = magnitude(toPlayer);
    if (distToPlayer > 0) {
      const targetAngle = Math.atan2(toPlayer.y, toPlayer.x);
      const time = performance.now() / 1000;
      const sineOffset = Math.sin(time * 3) * 0.5;
      let angleDiff = targetAngle + sineOffset - this.targetAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.targetAngle += angleDiff * deltaTime * 2;
      this.velocity = {
        x: Math.cos(this.targetAngle) * this.baseSpeed,
        y: Math.sin(this.targetAngle) * this.baseSpeed,
      };
    }
    this.rotation = this.targetAngle;
    const positions = [this.position, ...this.segments];
    for (let i = 0; i < this.segments.length; i++) {
      const target = positions[i];
      const segment = this.segments[i];
      const toTarget = subtractVectors(target, segment);
      const dist = magnitude(toTarget);
      if (dist > this.segmentSpacing) {
        const direction = normalize(toTarget);
        const moveAmount = dist - this.segmentSpacing;
        segment.x += direction.x * moveAmount;
        segment.y += direction.y * moveAmount;
      }
    }
  }

  private updateBossHexagon(deltaTime: number, playerPosition: Vector2): void {
    // Téléportation
    this.teleportTimer += deltaTime;
    if (this.teleportTimer >= this.teleportInterval) {
      this.teleportTimer = 0;
      this.teleportFlash = 0.3;
      this.isCharging = true;
      this.chargeTimer = 1; // 1 seconde de charge après téléportation
      this.shootTimer = 0; // Reset le timer de tir
      // Téléporter à une position aléatoire dans l'arène
      const margin = 150;
      this.position = {
        x: margin + Math.random() * (GAME_CONFIG.ARENA_WIDTH - 2 * margin),
        y: margin + Math.random() * (GAME_CONFIG.ARENA_HEIGHT - 2 * margin),
      };
    }
    
    // Flash de téléportation
    if (this.teleportFlash > 0) {
      this.teleportFlash -= deltaTime;
    }
    
    // Phase de charge (clignotement)
    if (this.isCharging) {
      this.chargeTimer -= deltaTime;
      if (this.chargeTimer <= 0) {
        this.isCharging = false;
      }
      // Pas de tir pendant la charge
    } else {
      // Tir - 5 projectiles en éventail (seulement si pas en charge)
      this.shootTimer += deltaTime;
      if (this.shootTimer >= this.shootInterval) {
        this.shootTimer = 0;
        this.shootBossPattern(playerPosition);
      }
    }
    
    // Rotation vers le joueur
    const toPlayer = subtractVectors(playerPosition, this.position);
    this.rotation = Math.atan2(toPlayer.y, toPlayer.x);
  }

  private shootBossPattern(playerPosition: Vector2): void {
    const toPlayer = subtractVectors(playerPosition, this.position);
    const distance = magnitude(toPlayer);
    if (distance > 0) {
      const baseAngle = Math.atan2(toPlayer.y, toPlayer.x);
      const bulletSpeed = 280;
      const spreadAngle = Math.PI / 6; // 30 degrés entre chaque tir
      
      // 5 tirs en éventail
      for (let i = -2; i <= 2; i++) {
        const angle = baseAngle + i * spreadAngle;
        this.pendingBullets.push({
          position: { ...this.position },
          velocity: {
            x: Math.cos(angle) * bulletSpeed,
            y: Math.sin(angle) * bulletSpeed,
          },
          isAlive: true,
        });
      }
    }
  }

  getPendingBullet(): EnemyBullet | null {
    // Pour le boss, retourner les bullets multiples
    if (this.type === 'boss_hexagon' && this.pendingBullets.length > 0) {
      return this.pendingBullets.shift() || null;
    }
    const bullet = this.pendingBullet;
    this.pendingBullet = null;
    return bullet;
  }

  getPendingSplits(): { x: number; y: number }[] {
    const splits = [...this.pendingSplits];
    this.pendingSplits = [];
    return splits;
  }

  checkSegmentCollision(point: Vector2, radius: number): number {
    if (this.type !== 'snake') return -1;
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const dx = point.x - segment.x;
      const dy = point.y - segment.y;
      const segSize = this.size * 0.7; // Taille uniforme pour toutes les boules
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius + segSize) return i;
    }
    return -1;
  }
  
  canHeadBeDamaged(): boolean {
    // La tête du snake n'est plus une cible - seules les boules comptent
    return this.type !== 'snake';
  }
  
  // Détruit un segment spécifique (n'importe lequel)
  destroySegment(index: number): boolean {
    if (this.type !== 'snake' || index < 0 || index >= this.segments.length) return false;
    this.segments.splice(index, 1);
    return true;
  }
  
  destroyLastSegment(): boolean {
    if (this.type !== 'snake' || this.segments.length === 0) return false;
    this.segments.pop();
    return true;
  }
  
  isLastSegment(index: number): boolean {
    return index === this.segments.length - 1;
  }
  
  getSegmentCount(): number {
    return this.segments.length;
  }

  getSegments(): Vector2[] {
    return this.segments;
  }

  private changeDirection(): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = this.baseSpeed * (0.8 + Math.random() * 0.4);
    this.velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
  }

  private bounceOffWalls(): void {
    const margin = this.size;
    if (this.position.x < margin) {
      this.position.x = margin;
      this.velocity.x = Math.abs(this.velocity.x);
    } else if (this.position.x > GAME_CONFIG.ARENA_WIDTH - margin) {
      this.position.x = GAME_CONFIG.ARENA_WIDTH - margin;
      this.velocity.x = -Math.abs(this.velocity.x);
    }
    if (this.position.y < margin) {
      this.position.y = margin;
      this.velocity.y = Math.abs(this.velocity.y);
    } else if (this.position.y > GAME_CONFIG.ARENA_HEIGHT - margin) {
      this.position.y = GAME_CONFIG.ARENA_HEIGHT - margin;
      this.velocity.y = -Math.abs(this.velocity.y);
    }
  }

  render(renderer: RenderSystem, camera: Camera): void {
    if (!this.isAlive) return;

    const color = ENEMY_COLORS[this.type];
    const points = this.getShapePoints();
    
    // Flash de téléportation et clignotement de charge pour le boss
    if (this.type === 'boss_hexagon') {
      if (this.teleportFlash > 0) {
        renderer.drawNeonShape(points, camera, '#ffffff', false);
      } else if (this.isCharging) {
        // Clignotement rapide pendant la charge
        const blinkOn = Math.floor(this.chargeTimer * 10) % 2 === 0;
        renderer.drawNeonShape(points, camera, blinkOn ? '#ffff00' : color, false);
      } else {
        renderer.drawNeonShape(points, camera, color, false);
      }
    } else {
      renderer.drawNeonShape(points, camera, color, false);
    }
    
    if (this.type === 'shooter') {
      const cannonEnd = {
        x: this.position.x + Math.cos(this.rotation) * (this.size + 8),
        y: this.position.y + Math.sin(this.rotation) * (this.size + 8),
      };
      renderer.drawNeonLine(this.position, cannonEnd, camera, color, 2);
    }
    
    if (this.type === 'snake') {
      const headColor = '#ff4444'; // Tête rouge
      const bodyColor = '#44ff88'; // Corps vert
      const segSize = this.size * 0.7; // Taille uniforme
      
      for (let i = 0; i < this.segments.length; i++) {
        const segment = this.segments[i];
        const segPoints: Vector2[] = [];
        const isHead = i === 0;
        
        // Cercle pour chaque segment
        for (let j = 0; j < 10; j++) {
          const angle = (j * Math.PI * 2) / 10;
          segPoints.push({
            x: segment.x + Math.cos(angle) * segSize,
            y: segment.y + Math.sin(angle) * segSize,
          });
        }
        
        // La première boule est la tête (rouge), le reste est vert
        renderer.drawNeonShape(segPoints, camera, isHead ? headColor : bodyColor, false);
      }
    }
    
    // Barre de vie pour le boss
    if (this.type === 'boss_hexagon') {
      this.renderHealthBar(renderer, camera);
    }
  }

  private renderHealthBar(renderer: RenderSystem, camera: Camera): void {
    const ctx = renderer.getContext();
    const screenPos = camera.worldToScreen(this.position);
    
    const barWidth = 80;
    const barHeight = 8;
    const barY = screenPos.y - this.size - 20;
    
    ctx.save();
    
    // Fond de la barre
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(screenPos.x - barWidth / 2, barY, barWidth, barHeight);
    
    // Barre de vie
    const healthPercent = this.health / this.maxHealth;
    const healthColor = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
    
    ctx.fillStyle = healthColor;
    ctx.shadowColor = healthColor;
    ctx.shadowBlur = 10;
    ctx.fillRect(screenPos.x - barWidth / 2 + 2, barY + 2, (barWidth - 4) * healthPercent, barHeight - 4);
    
    // Bordure
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenPos.x - barWidth / 2, barY, barWidth, barHeight);
    
    // Texte HP
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.health}/${this.maxHealth}`, screenPos.x, barY - 3);
    
    ctx.restore();
  }

  private getShapePoints(): Vector2[] {
    const points: Vector2[] = [];
    
    switch (this.type) {
      case 'wanderer':
        for (let i = 0; i < 4; i++) {
          const angle = this.rotation + (i * Math.PI * 2) / 4;
          points.push({
            x: this.position.x + Math.cos(angle) * this.size,
            y: this.position.y + Math.sin(angle) * this.size,
          });
        }
        break;
        
      case 'chaser':
        const chaserAngles = [0, (2.5 * Math.PI) / 3, (3.5 * Math.PI) / 3];
        const chaserSizes = [this.size * 1.5, this.size, this.size];
        for (let i = 0; i < 3; i++) {
          const angle = this.rotation + chaserAngles[i];
          points.push({
            x: this.position.x + Math.cos(angle) * chaserSizes[i],
            y: this.position.y + Math.sin(angle) * chaserSizes[i],
          });
        }
        break;
        
      case 'shooter':
        for (let i = 0; i < 6; i++) {
          const angle = this.rotation + (i * Math.PI * 2) / 6;
          points.push({
            x: this.position.x + Math.cos(angle) * this.size,
            y: this.position.y + Math.sin(angle) * this.size,
          });
        }
        break;
        
      case 'diamond':
        const diamondAngles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
        const diamondSizes = [this.size * 1.4, this.size * 0.8, this.size * 1.4, this.size * 0.8];
        for (let i = 0; i < 4; i++) {
          const angle = this.rotation + diamondAngles[i];
          points.push({
            x: this.position.x + Math.cos(angle) * diamondSizes[i],
            y: this.position.y + Math.sin(angle) * diamondSizes[i],
          });
        }
        break;
        
      case 'dodger':
        const glowSize = this.size * (1 + Math.sin(this.glowPhase) * 0.1);
        for (let i = 0; i < 12; i++) {
          const angle = this.rotation + (i * Math.PI * 2) / 12;
          points.push({
            x: this.position.x + Math.cos(angle) * glowSize,
            y: this.position.y + Math.sin(angle) * glowSize,
          });
        }
        break;
        
      case 'splitter':
        for (let i = 0; i < 12; i++) {
          const angle = this.rotation + (i * Math.PI * 2) / 12;
          const radius = i % 2 === 0 ? this.size : this.size * 0.5;
          const pulseRadius = radius * (1 + Math.sin(this.glowPhase) * 0.1);
          points.push({
            x: this.position.x + Math.cos(angle) * pulseRadius,
            y: this.position.y + Math.sin(angle) * pulseRadius,
          });
        }
        break;
        
      case 'splitter_mini':
        for (let i = 0; i < 8; i++) {
          const angle = this.rotation + (i * Math.PI * 2) / 8;
          const radius = i % 2 === 0 ? this.size : this.size * 0.4;
          const pulseRadius = radius * (1 + Math.sin(this.glowPhase) * 0.15);
          points.push({
            x: this.position.x + Math.cos(angle) * pulseRadius,
            y: this.position.y + Math.sin(angle) * pulseRadius,
          });
        }
        break;
        
      case 'snake':
        // Le snake n'a pas de forme propre - c'est juste un conteneur pour les segments
        // On dessine un petit cercle invisible pour la position de référence
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI * 2) / 6;
          points.push({
            x: this.position.x + Math.cos(angle) * 5,
            y: this.position.y + Math.sin(angle) * 5,
          });
        }
        break;
        
      case 'boss_hexagon':
        // Grand hexagone avec effet pulsant
        const bossSize = this.size * (1 + Math.sin(this.glowPhase) * 0.05);
        for (let i = 0; i < 6; i++) {
          const angle = this.rotation + (i * Math.PI * 2) / 6;
          points.push({
            x: this.position.x + Math.cos(angle) * bossSize,
            y: this.position.y + Math.sin(angle) * bossSize,
          });
        }
        break;
    }

    return points;
  }

  takeDamage(amount: number = 1): boolean {
    this.health -= amount;
    if (this.health <= 0) {
      if (this.type === 'splitter') {
        const splitCount = 3;
        for (let i = 0; i < splitCount; i++) {
          const angle = (i / splitCount) * Math.PI * 2 + Math.random() * 0.5;
          const distance = 25;
          this.pendingSplits.push({
            x: this.position.x + Math.cos(angle) * distance,
            y: this.position.y + Math.sin(angle) * distance,
          });
        }
      }
      this.kill();
      return true;
    }
    return false;
  }

  getPosition(): Vector2 { return { ...this.position }; }
  getSize(): number { return this.size; }
  kill(): void { this.isAlive = false; }
  getPoints(): number { return this.points; }
  getColor(): string { return ENEMY_COLORS[this.type]; }
  isBoss(): boolean { return this.type === 'boss_hexagon'; }
  getHealthPercent(): number { return this.health / this.maxHealth; }
}
