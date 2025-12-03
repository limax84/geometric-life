// Gestionnaire d'entrées - Clavier ZQSD + Souris

import { InputState, Vector2 } from '../types';

export class InputManager {
  private keys: Set<string> = new Set();
  private justPressedKeys: Set<string> = new Set();
  private mousePosition: Vector2 = { x: 0, y: 0 };
  private mouseDown: boolean = false;
  private canvas: HTMLCanvasElement | null = null;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mouseup', this.handleMouseUp);

    // Empêcher le menu contextuel sur clic droit
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (!this.keys.has(key)) {
      this.justPressedKeys.add(key);
    }
    this.keys.add(key);
    
    // Empêcher le comportement par défaut pour Tab
    if (e.key === 'Tab') {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  // Appeler à chaque frame pour nettoyer les touches "just pressed"
  clearJustPressed(): void {
    this.justPressedKeys.clear();
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 0) { // Clic gauche
      this.mouseDown = true;
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.mouseDown = false;
    }
  }

  // Getters pour les contrôles ZQSD
  isMovingForward(): boolean {
    return this.keys.has('z') || this.keys.has('w');
  }

  isMovingBackward(): boolean {
    return this.keys.has('s');
  }

  isRotatingLeft(): boolean {
    return this.keys.has('q') || this.keys.has('a');
  }

  isRotatingRight(): boolean {
    return this.keys.has('d');
  }

  isFiring(): boolean {
    return this.mouseDown;
  }

  getMousePosition(): Vector2 {
    return { ...this.mousePosition };
  }

  // Convertir position souris écran -> monde
  getMouseWorldPosition(cameraX: number, cameraY: number): Vector2 {
    return {
      x: this.mousePosition.x + cameraX,
      y: this.mousePosition.y + cameraY,
    };
  }

  getState(): InputState {
    return {
      keys: new Set(this.keys),
      mouseX: this.mousePosition.x,
      mouseY: this.mousePosition.y,
      mouseDown: this.mouseDown,
    };
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  // Retourne true seulement au moment où la touche est appuyée (pas maintenue)
  isKeyJustPressed(key: string): boolean {
    return this.justPressedKeys.has(key.toLowerCase());
  }
}
