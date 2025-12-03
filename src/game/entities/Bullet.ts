// Entité projectile

import { Vector2, COLORS, GAME_CONFIG } from '../types';
import { Camera } from '../engine/Camera';
import { RenderSystem } from '../systems/RenderSystem';
import {
  createVector,
  addVectors,
  multiplyVector,
  vectorFromAngle,
} from '../utils/Vector2';

export class Bullet {
  id: string;
  position: Vector2;
  velocity: Vector2;
  rotation: number;
  isAlive: boolean = true;

  private lifetime: number;
  private age: number = 0;
  private size: number = 4;
  private trailPositions: Vector2[] = [];
  private maxTrailLength: number = 8;
  private hitBorder: boolean = false;

  constructor(x: number, y: number, angle: number, id: string) {
    this.id = id;
    this.position = createVector(x, y);
    this.rotation = angle;
    this.velocity = vectorFromAngle(angle, GAME_CONFIG.BULLET_SPEED);
    this.lifetime = GAME_CONFIG.BULLET_LIFETIME;
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

  render(renderer: RenderSystem, camera: Camera, isPiercing: boolean = false): void {
    if (!this.isAlive) return;

    // Couleur selon le mode piercing
    const color = isPiercing ? '#ff00ff' : COLORS.BULLET;
    const trailColor = isPiercing ? '#ff66ff' : COLORS.BULLET;

    // Dessiner le trail
    const ctx = renderer.getContext();
    for (let i = 0; i < this.trailPositions.length; i++) {
      const pos = this.trailPositions[i];
      const screenPos = camera.worldToScreen(pos);
      const alpha = 1 - i / this.trailPositions.length;
      const size = this.size * (1 - i / this.trailPositions.length * 0.5);

      ctx.globalAlpha = alpha * (isPiercing ? 0.7 : 0.5);
      ctx.shadowBlur = isPiercing ? 15 : 10;
      ctx.shadowColor = trailColor;
      ctx.fillStyle = trailColor;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Dessiner le projectile principal (plus gros si piercing)
    const mainSize = isPiercing ? this.size * 1.3 : this.size;
    renderer.drawNeonCircle(this.position, mainSize, camera, color, true);
    
    // Anneau externe pour le piercing
    if (isPiercing) {
      ctx.save();
      const screenPos = camera.worldToScreen(this.position);
      ctx.strokeStyle = '#ff00ff';
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, mainSize * 1.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
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
