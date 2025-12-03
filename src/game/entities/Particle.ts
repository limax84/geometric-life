// Système de particules pour les effets visuels

import { Camera } from '../engine/Camera';
import { RenderSystem } from '../systems/RenderSystem';
import { GRAPHICS_PRESETS, GraphicsSettings, Vector2 } from '../types';
import {
  addVectors,
  createVector,
  multiplyVector,
} from '../utils/Vector2';

export class Particle {
  position: Vector2;
  velocity: Vector2;
  color: string;
  size: number;
  lifetime: number;
  age: number = 0;
  isAlive: boolean = true;

  private initialSize: number;
  private friction: number = 0.98;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    size: number,
    lifetime: number
  ) {
    this.position = createVector(x, y);
    this.velocity = createVector(vx, vy);
    this.color = color;
    this.size = size;
    this.initialSize = size;
    this.lifetime = lifetime;
  }

  update(deltaTime: number): void {
    if (!this.isAlive) return;

    // Mettre à jour la position
    this.position = addVectors(
      this.position,
      multiplyVector(this.velocity, deltaTime * 60)
    );

    // Appliquer la friction
    this.velocity = multiplyVector(this.velocity, this.friction);

    // Réduire la taille avec le temps
    const lifeRatio = 1 - this.age / this.lifetime;
    this.size = this.initialSize * lifeRatio;

    // Vérifier la durée de vie
    this.age += deltaTime;
    if (this.age >= this.lifetime) {
      this.isAlive = false;
    }
  }

  render(renderer: RenderSystem, camera: Camera): void {
    if (!this.isAlive || this.size <= 0) return

    const ctx = renderer.getContext()
    const screenPos = camera.worldToScreen(this.position)
    const alpha = 1 - this.age / this.lifetime
    const settings = renderer.getGraphicsSettings()

    ctx.globalAlpha = alpha
    
    // Glow only if enabled
    if (settings.particleGlow) {
      ctx.shadowBlur = 8 * settings.shadowBlurIntensity
      ctx.shadowColor = this.color
    } else {
      ctx.shadowBlur = 0
    }
    
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(screenPos.x, screenPos.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
  }
}

// Gestionnaire de particules
export class ParticleSystem {
  private particles: Particle[] = []
  private maxParticles: number = 500
  private graphicsSettings: GraphicsSettings = GRAPHICS_PRESETS['high']
  
  setGraphicsSettings(settings: GraphicsSettings): void {
    this.graphicsSettings = settings
    this.maxParticles = settings.maxParticles
    
    // Trim particles if we have too many
    if (this.particles.length > this.maxParticles) {
      this.particles = this.particles.slice(-this.maxParticles)
    }
  }
  
  getMaxParticles(): number {
    return this.maxParticles
  }

  createExplosion(x: number, y: number, color: string, count: number = 20): void {
    // Scale particle count based on max particles ratio
    const scaleFactor = Math.min(1, this.maxParticles / 500)
    const adjustedCount = Math.max(3, Math.floor(count * scaleFactor))
    
    for (let i = 0; i < adjustedCount; i++) {
      if (this.particles.length >= this.maxParticles) {
        // Supprimer les plus anciennes
        this.particles.shift()
      }

      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 5
      const vx = Math.cos(angle) * speed
      const vy = Math.sin(angle) * speed
      const size = 2 + Math.random() * 4
      const lifetime = 0.3 + Math.random() * 0.5

      this.particles.push(new Particle(x, y, vx, vy, color, size, lifetime))
    }
  }

  createBulletHit(x: number, y: number, color: string): void {
    // Scale down for low quality
    const count = this.maxParticles < 100 ? 4 : 8
    this.createExplosion(x, y, color, count)
  }

  createPlayerDeath(x: number, y: number, color: string): void {
    // Scale down for low quality
    const count = this.maxParticles < 100 ? 20 : 50
    this.createExplosion(x, y, color, count)
  }

  createBombWave(x: number, y: number, radius: number): void {
    // Scale particle counts based on quality
    const scaleFactor = Math.min(1, this.maxParticles / 500)
    const ringCount = Math.max(10, Math.floor(60 * scaleFactor))
    const sparkCount = Math.max(5, Math.floor(30 * scaleFactor))
    
    // Créer un anneau de particules qui s'étend
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2
      const speed = radius / 0.5 // Atteint le rayon en 0.5s
      const vx = Math.cos(angle) * speed * 0.02
      const vy = Math.sin(angle) * speed * 0.02
      
      // Couleur électrique cyan/magenta
      const color = i % 2 === 0 ? '#00ffff' : '#ff00ff'
      const size = 8 + Math.random() * 4
      const lifetime = 0.6

      if (this.particles.length < this.maxParticles) {
        this.particles.push(new Particle(x, y, vx, vy, color, size, lifetime))
      }
    }

    // Particules d'étincelles aléatoires
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * radius * 0.8
      const px = x + Math.cos(angle) * dist
      const py = y + Math.sin(angle) * dist
      
      const vx = (Math.random() - 0.5) * 3
      const vy = (Math.random() - 0.5) * 3
      const color = '#ffff00'
      const size = 3 + Math.random() * 3
      const lifetime = 0.3 + Math.random() * 0.3

      if (this.particles.length < this.maxParticles) {
        this.particles.push(new Particle(px, py, vx, vy, color, size, lifetime))
      }
    }
  }

  update(deltaTime: number): void {
    // Mettre à jour toutes les particules
    for (const particle of this.particles) {
      particle.update(deltaTime);
    }

    // Supprimer les particules mortes
    this.particles = this.particles.filter((p) => p.isAlive);
  }

  render(renderer: RenderSystem, camera: Camera): void {
    for (const particle of this.particles) {
      particle.render(renderer, camera);
    }
  }

  clear(): void {
    this.particles = [];
  }

  getCount(): number {
    return this.particles.length;
  }
}
