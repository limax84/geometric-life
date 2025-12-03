// Projectile ennemi

import { Vector2, GAME_CONFIG } from '../types';
import { Camera } from '../engine/Camera';
import { RenderSystem } from '../systems/RenderSystem';
import {
  createVector,
  addVectors,
  multiplyVector,
} from '../utils/Vector2';

export class EnemyBullet {
  id: string;
  position: Vector2;
  velocity: Vector2;
  isAlive: boolean = true;

  private size: number = 5;
  private lifetime: number = 4;
  private age: number = 0;
  private color: string = '#ff3333'; // Rouge pour les projectiles ennemis
  private trailPositions: Vector2[] = [];
  private maxTrailLength: number = 6;
  private hitBorder: boolean = false;

  constructor(x: number, y: number, vx: number, vy: number, id: string) {
    this.id = id;
    this.position = createVector(x, y);
    this.velocity = createVector(vx, vy);
  }

  update(deltaTime: number): void {
    if (!this.isAlive) return;

    // Sauvegarder la position pour le trail
    this.trailPositions.unshift({ ...this.position });
    if (this.trailPositions.length > this.maxTrailLength) {
      this.trailPositions.pop();
    }

    // Mettre à jour la position
    this.position = addVectors(
      this.position,
      multiplyVector(this.velocity, deltaTime)
    );

    // Vérifier la durée de vie
    this.age += deltaTime;
    if (this.age >= this.lifetime) {
      this.isAlive = false;
    }

    // Vérifier les limites de l'arène
    if (
      this.position.x < 0 ||
      this.position.x > GAME_CONFIG.ARENA_WIDTH ||
      this.position.y < 0 ||
      this.position.y > GAME_CONFIG.ARENA_HEIGHT
    ) {
      this.hitBorder = true;
      this.isAlive = false;
    }
  }

  didHitBorder(): boolean {
    return this.hitBorder;
  }

  render(renderer: RenderSystem, camera: Camera): void {
    if (!this.isAlive) return;

    const ctx = renderer.getContext();
    
    // Dessiner le trail
    for (let i = 0; i < this.trailPositions.length; i++) {
      const pos = this.trailPositions[i];
      const screenPos = camera.worldToScreen(pos);
      const alpha = 1 - i / this.trailPositions.length;
      const trailSize = this.size * (1 - i / this.trailPositions.length * 0.5);

      ctx.globalAlpha = alpha * 0.4;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, trailSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Dessiner le projectile principal
    renderer.drawNeonCircle(this.position, this.size, camera, this.color, true);
  }

  getPosition(): Vector2 {
    return { ...this.position };
  }

  getSize(): number {
    return this.size;
  }

  kill(): void {
    this.isAlive = false;
  }
}
