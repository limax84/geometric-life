// Système de power-ups avec versions perpétuelles

import { Vector2, GAME_CONFIG } from '../types';
import { Camera } from '../engine/Camera';
import { RenderSystem } from '../systems/RenderSystem';
import { createVector, addVectors, multiplyVector } from '../utils/Vector2';

export type PowerUpType = 'shield' | 'rapidFire' | 'spreadShot' | 'speedBoost' | 'piercing' | 'doubleShot' | 'extraLife' | 'bomb';

interface PowerUpConfig {
  color: string;
  duration: number;
  symbol: string;
  canBePerpetual: boolean; // Peut avoir une version perpétuelle
}

export const POWERUP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  shield: { color: '#00ffff', duration: 10, symbol: 'S', canBePerpetual: false },
  rapidFire: { color: '#ffff00', duration: 8, symbol: 'R', canBePerpetual: true },
  spreadShot: { color: '#ff8800', duration: 6, symbol: 'W', canBePerpetual: true },
  speedBoost: { color: '#00ff44', duration: 7, symbol: 'V', canBePerpetual: true },
  piercing: { color: '#ff00ff', duration: 10, symbol: '>', canBePerpetual: true },
  doubleShot: { color: '#88ffff', duration: 8, symbol: 'D', canBePerpetual: true }, // Tir doublé
  extraLife: { color: '#ff00ff', duration: 0, symbol: '+', canBePerpetual: false },
  bomb: { color: '#ff0066', duration: 0, symbol: 'B', canBePerpetual: false },
};

export class PowerUp {
  id: string;
  position: Vector2;
  velocity: Vector2;
  type: PowerUpType;
  isPerpetual: boolean;
  isAlive: boolean = true;

  private size: number = 12;
  private rotation: number = 0;
  private rotationSpeed: number = 2;
  private lifetime: number = 15;
  private age: number = 0;
  private pulsePhase: number = 0;
  private bobPhase: number = 0;

  constructor(x: number, y: number, type: PowerUpType, id: string, isPerpetual: boolean = false) {
    this.id = id;
    this.position = createVector(x, y);
    this.type = type;
    this.isPerpetual = isPerpetual && POWERUP_CONFIGS[type].canBePerpetual;
    
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 30;
    this.velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
    this.bobPhase = Math.random() * Math.PI * 2;
    
    // Les perpétuels sont plus gros
    if (this.isPerpetual) {
      this.size = 16;
      this.lifetime = 20;
    }
  }

  update(deltaTime: number): void {
    if (!this.isAlive) return;
    this.rotation += this.rotationSpeed * deltaTime;
    this.pulsePhase += deltaTime * 4;
    this.bobPhase += deltaTime * 2;
    this.velocity = multiplyVector(this.velocity, 0.98);
    this.position = addVectors(this.position, multiplyVector(this.velocity, deltaTime));
    this.bounceOffWalls();
    this.age += deltaTime;
    if (this.age >= this.lifetime) this.isAlive = false;
  }

  private bounceOffWalls(): void {
    const margin = this.size;
    if (this.position.x < margin) { this.position.x = margin; this.velocity.x = Math.abs(this.velocity.x); }
    else if (this.position.x > GAME_CONFIG.ARENA_WIDTH - margin) { this.position.x = GAME_CONFIG.ARENA_WIDTH - margin; this.velocity.x = -Math.abs(this.velocity.x); }
    if (this.position.y < margin) { this.position.y = margin; this.velocity.y = Math.abs(this.velocity.y); }
    else if (this.position.y > GAME_CONFIG.ARENA_HEIGHT - margin) { this.position.y = GAME_CONFIG.ARENA_HEIGHT - margin; this.velocity.y = -Math.abs(this.velocity.y); }
  }

  render(renderer: RenderSystem, camera: Camera): void {
    if (!this.isAlive) return;
    const config = POWERUP_CONFIGS[this.type];
    const ctx = renderer.getContext();
    
    const bobOffset = Math.sin(this.bobPhase) * 3;
    const renderPos = { x: this.position.x, y: this.position.y + bobOffset };
    const screenPos = camera.worldToScreen(renderPos);
    
    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.15;
    const currentSize = this.size * pulseScale;
    
    const fadeStart = this.lifetime - 3;
    let alpha = 1;
    if (this.age > fadeStart) {
      const fadeProgress = (this.age - fadeStart) / 3;
      alpha = Math.sin(fadeProgress * Math.PI * 8) > 0 ? 1 : 0.3;
    }
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Cercle extérieur
    ctx.shadowBlur = this.isPerpetual ? 25 : 15;
    ctx.shadowColor = config.color;
    ctx.strokeStyle = config.color;
    ctx.lineWidth = this.isPerpetual ? 3 : 2;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, currentSize, 0, Math.PI * 2);
    ctx.stroke();
    
    // Deuxième cercle pour les perpétuels (effet doré)
    if (this.isPerpetual) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, currentSize + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Symbole
    ctx.fillStyle = config.color;
    ctx.font = `bold ${currentSize}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.symbol, screenPos.x, screenPos.y);
    
    // Indicateur perpétuel (∞)
    if (this.isPerpetual) {
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold 10px "Courier New", monospace`;
      ctx.fillText('∞', screenPos.x, screenPos.y - currentSize - 5);
    }
    
    // Particules orbitales
    const numParticles = this.isPerpetual ? 5 : 3;
    for (let i = 0; i < numParticles; i++) {
      const particleAngle = this.rotation + (i * Math.PI * 2) / numParticles;
      const particleX = screenPos.x + Math.cos(particleAngle) * (currentSize + 5);
      const particleY = screenPos.y + Math.sin(particleAngle) * (currentSize + 5);
      ctx.beginPath();
      ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  getPosition(): Vector2 { return { ...this.position }; }
  getSize(): number { return this.size; }
  getType(): PowerUpType { return this.type; }
  getDuration(): number { return POWERUP_CONFIGS[this.type].duration; }
  collect(): void { this.isAlive = false; }
}

// Gestionnaire des effets actifs
export interface ActivePowerUp {
  type: PowerUpType;
  remainingTime: number;
  isPerpetual: boolean;
}

export class PlayerPowerUpState {
  private activePowerUps: Map<PowerUpType, { time: number; isPerpetual: boolean }> = new Map();
  private perpetualPowerUps: Set<PowerUpType> = new Set();

  addPowerUp(type: PowerUpType, duration: number, isPerpetual: boolean = false): void {
    if (duration === 0 && !isPerpetual) return;
    
    if (isPerpetual) {
      this.perpetualPowerUps.add(type);
      this.activePowerUps.set(type, { time: Infinity, isPerpetual: true });
    } else {
      // Si déjà perpétuel, ne pas écraser
      if (this.perpetualPowerUps.has(type)) return;
      
      const current = this.activePowerUps.get(type);
      const currentTime = current?.time || 0;
      this.activePowerUps.set(type, { time: currentTime + duration, isPerpetual: false });
    }
  }

  update(deltaTime: number): void {
    for (const [type, data] of this.activePowerUps) {
      if (data.isPerpetual) continue;
      const newTime = data.time - deltaTime;
      if (newTime <= 0) {
        this.activePowerUps.delete(type);
      } else {
        this.activePowerUps.set(type, { time: newTime, isPerpetual: false });
      }
    }
  }

  isActive(type: PowerUpType): boolean {
    return this.activePowerUps.has(type) || this.perpetualPowerUps.has(type);
  }

  getRemainingTime(type: PowerUpType): number {
    const data = this.activePowerUps.get(type);
    return data?.time || 0;
  }
  
  isPerpetual(type: PowerUpType): boolean {
    return this.perpetualPowerUps.has(type);
  }

  getActivePowerUps(): ActivePowerUp[] {
    const result: ActivePowerUp[] = [];
    for (const [type, data] of this.activePowerUps) {
      result.push({ type, remainingTime: data.time, isPerpetual: data.isPerpetual });
    }
    return result;
  }

  hasShield(): boolean { return this.isActive('shield'); }
  hasRapidFire(): boolean { return this.isActive('rapidFire'); }
  hasSpreadShot(): boolean { return this.isActive('spreadShot'); }
  hasSpeedBoost(): boolean { return this.isActive('speedBoost'); }
  hasPiercing(): boolean { return this.isActive('piercing'); }
  hasDoubleShot(): boolean { return this.isActive('doubleShot'); }
  
  getFireRateMultiplier(): number { return this.hasRapidFire() ? 0.4 : 1; }
  getSpeedMultiplier(): number { return this.hasSpeedBoost() ? 1.5 : 1; }

  // Clear seulement les temporaires (garder les perpétuels)
  clearTemporary(): void {
    for (const [type, data] of this.activePowerUps) {
      if (!data.isPerpetual) {
        this.activePowerUps.delete(type);
      }
    }
  }
  
  // Clear tout (à la fin de la partie)
  clear(): void {
    this.activePowerUps.clear();
    this.perpetualPowerUps.clear();
  }
}

// Fonction pour choisir un power-up aléatoire
export function getRandomPowerUpType(allowPerpetual: boolean = true): { type: PowerUpType; isPerpetual: boolean } {
  const types: PowerUpType[] = ['shield', 'rapidFire', 'spreadShot', 'speedBoost', 'piercing', 'doubleShot', 'extraLife', 'bomb'];
  const weights = [25, 25, 20, 20, 15, 18, 8, 15];
  
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  let selectedType: PowerUpType = types[0];
  for (let i = 0; i < types.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      selectedType = types[i];
      break;
    }
  }
  
  // 10% de chance d'être perpétuel (si autorisé et si le type peut l'être)
  const isPerpetual = allowPerpetual && 
    POWERUP_CONFIGS[selectedType].canBePerpetual && 
    Math.random() < 0.1;
  
  return { type: selectedType, isPerpetual };
}
