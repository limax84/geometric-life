// Système de caméra avec smooth follow

import { Vector2, GAME_CONFIG, Camera as CameraInterface } from '../types';
import { lerp, clamp } from '../utils/Vector2';

export class Camera implements CameraInterface {
  x: number = 0;
  y: number = 0;
  width: number;
  height: number;

  private targetX: number = 0;
  private targetY: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  setTarget(target: Vector2): void {
    this.targetX = target.x - this.width / 2;
    this.targetY = target.y - this.height / 2;
  }

  update(deltaTime: number): void {
    // Smooth follow avec lerp
    const lerpFactor = 1 - Math.pow(1 - GAME_CONFIG.CAMERA_LERP, deltaTime * 60);

    this.x = lerp(this.x, this.targetX, lerpFactor);
    this.y = lerp(this.y, this.targetY, lerpFactor);

    // Autoriser un débordement de la caméra au-delà de l'arène (200px de marge)
    const margin = 200;
    this.x = clamp(this.x, -margin, GAME_CONFIG.ARENA_WIDTH - this.width + margin);
    this.y = clamp(this.y, -margin, GAME_CONFIG.ARENA_HEIGHT - this.height + margin);
  }

  // Convertir coordonnées monde -> écran
  worldToScreen(worldPos: Vector2): Vector2 {
    return {
      x: worldPos.x - this.x,
      y: worldPos.y - this.y,
    };
  }

  // Convertir coordonnées écran -> monde
  screenToWorld(screenPos: Vector2): Vector2 {
    return {
      x: screenPos.x + this.x,
      y: screenPos.y + this.y,
    };
  }

  // Vérifier si un point est visible
  isVisible(worldPos: Vector2, margin: number = 50): boolean {
    const screenPos = this.worldToScreen(worldPos);
    return (
      screenPos.x >= -margin &&
      screenPos.x <= this.width + margin &&
      screenPos.y >= -margin &&
      screenPos.y <= this.height + margin
    );
  }

  // Obtenir les limites visibles dans le monde
  getVisibleBounds(): { left: number; right: number; top: number; bottom: number } {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height,
    };
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }
}
