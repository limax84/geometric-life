// Entité joueur - Vaisseau contrôlable

import { Vector2, COLORS, GAME_CONFIG, BulletSpawn } from '../types';
import { Camera } from '../engine/Camera';
import { InputManager } from '../systems/InputManager';
import { RenderSystem } from '../systems/RenderSystem';
import { PlayerPowerUpState } from './PowerUp';
import {
  createVector,
  addVectors,
  multiplyVector,
  vectorFromAngle,
  clamp,
} from '../utils/Vector2';

// Particule de trainée pour les gaz
interface ThrustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export type ControlMode = 'relative' | 'absolute';

export class Player {
  id: string = 'player';
  position: Vector2;
  velocity: Vector2 = createVector();
  rotation: number = 0; // Direction du vaisseau
  aimAngle: number = 0; // Direction de visée (souris)
  isAlive: boolean = true;

  private size: number = 20;
  private friction: number = 0.92; // Friction réduite pour une décélération plus douce
  private acceleration: number = 0.35; // Accélération très progressive pour contrôle précis
  private lastFireTime: number = 0;
  
  // Image SVG du vaisseau
  private shipImage: HTMLImageElement | null = null;
  private imageLoaded: boolean = false;
  
  // Power-up state
  powerUpState: PlayerPowerUpState = new PlayerPowerUpState();
  
  // Visual effects
  private shieldPulse: number = 0;
  
  // Trainée de propulsion
  private thrustParticles: ThrustParticle[] = [];
  private isThrusting: boolean = false;
  
  // Mode de contrôle (global par défaut)
  controlMode: ControlMode = 'absolute';
  
  // Bombes
  bombCount: number = 0;
  private maxBombs: number = 3;

  constructor(x: number, y: number) {
    this.position = createVector(x, y);
    this.loadShipImage();
  }
  
  private loadShipImage(): void {
    this.shipImage = new Image();
    this.shipImage.onload = () => {
      this.imageLoaded = true;
    };
    this.shipImage.src = '/ship.svg';
  }

  update(deltaTime: number, input: InputManager, camera: Camera): void {
    if (!this.isAlive) return;

    // Mettre à jour les power-ups
    this.powerUpState.update(deltaTime);
    
    // Animation du bouclier
    if (this.powerUpState.hasShield()) {
      this.shieldPulse += deltaTime * 5;
    }


    // Mettre à jour les particules de trainée
    this.updateThrustParticles(deltaTime);

    const thrust = createVector();
    this.isThrusting = false;

    if (this.controlMode === 'relative') {
      // Mode relatif (comme actuellement): ZQSD relatif au vaisseau
      // Rotation du vaisseau (Q/D)
      if (input.isRotatingLeft()) {
        this.rotation -= GAME_CONFIG.PLAYER_ROTATION_SPEED * deltaTime;
      }
      if (input.isRotatingRight()) {
        this.rotation += GAME_CONFIG.PLAYER_ROTATION_SPEED * deltaTime;
      }

      // Mouvement avant/arrière (Z/S)
      if (input.isMovingForward()) {
        const forward = vectorFromAngle(this.rotation, GAME_CONFIG.PLAYER_SPEED * deltaTime * this.acceleration);
        thrust.x += forward.x;
        thrust.y += forward.y;
        this.isThrusting = true;
      }
      if (input.isMovingBackward()) {
        const backward = vectorFromAngle(this.rotation, -GAME_CONFIG.PLAYER_SPEED * 0.5 * deltaTime * this.acceleration);
        thrust.x += backward.x;
        thrust.y += backward.y;
      }
    } else {
      // Mode absolu: ZQSD relatif au monde (haut/bas/gauche/droite)
      if (input.isMovingForward()) { // Z = haut
        thrust.y -= GAME_CONFIG.PLAYER_SPEED * deltaTime * this.acceleration;
        this.isThrusting = true;
      }
      if (input.isMovingBackward()) { // S = bas
        thrust.y += GAME_CONFIG.PLAYER_SPEED * 0.7 * deltaTime * this.acceleration;
        this.isThrusting = true;
      }
      if (input.isRotatingLeft()) { // Q = gauche
        thrust.x -= GAME_CONFIG.PLAYER_SPEED * deltaTime * this.acceleration;
        this.isThrusting = true;
      }
      if (input.isRotatingRight()) { // D = droite
        thrust.x += GAME_CONFIG.PLAYER_SPEED * deltaTime * this.acceleration;
        this.isThrusting = true;
      }
      
      // En mode absolu, le vaisseau s'oriente vers la direction du mouvement
      if (thrust.x !== 0 || thrust.y !== 0) {
        const targetRotation = Math.atan2(thrust.y, thrust.x);
        // Rotation douce vers la direction
        let diff = targetRotation - this.rotation;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.rotation += diff * 8 * deltaTime;
      }
    }

    // Générer des particules de trainée si on accélère
    if (this.isThrusting && Math.random() < 0.5) {
      this.spawnThrustParticle();
    }

    // Appliquer la poussée à la vélocité
    this.velocity = addVectors(this.velocity, thrust);

    // Appliquer la friction
    this.velocity = multiplyVector(this.velocity, this.friction);

    // Mettre à jour la position
    this.position = addVectors(this.position, multiplyVector(this.velocity, deltaTime * 60));

    // Limiter aux bords de l'arène
    this.position.x = clamp(this.position.x, this.size, GAME_CONFIG.ARENA_WIDTH - this.size);
    this.position.y = clamp(this.position.y, this.size, GAME_CONFIG.ARENA_HEIGHT - this.size);

    // Calculer l'angle de visée vers la souris
    const mouseWorld = input.getMouseWorldPosition(camera.x, camera.y);
    this.aimAngle = Math.atan2(
      mouseWorld.y - this.position.y,
      mouseWorld.x - this.position.x
    );
  }

  private updateThrustParticles(deltaTime: number): void {
    for (let i = this.thrustParticles.length - 1; i >= 0; i--) {
      const p = this.thrustParticles[i];
      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;
      p.life -= deltaTime;
      p.size *= 0.95; // Rétrécissement progressif
      
      if (p.life <= 0 || p.size < 0.5) {
        this.thrustParticles.splice(i, 1);
      }
    }
  }

  private spawnThrustParticle(): void {
    // Position à l'arrière du vaisseau
    const backAngle = this.rotation + Math.PI;
    const spread = (Math.random() - 0.5) * 0.5;
    const spawnAngle = backAngle + spread;
    
    const spawnDist = this.size * 0.6;
    const particle: ThrustParticle = {
      x: this.position.x + Math.cos(backAngle) * spawnDist,
      y: this.position.y + Math.sin(backAngle) * spawnDist,
      vx: Math.cos(spawnAngle) * (2 + Math.random() * 2) - this.velocity.x * 0.02,
      vy: Math.sin(spawnAngle) * (2 + Math.random() * 2) - this.velocity.y * 0.02,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      size: 4 + Math.random() * 3,
    };
    
    this.thrustParticles.push(particle);
    
    // Limiter le nombre de particules
    if (this.thrustParticles.length > 50) {
      this.thrustParticles.shift();
    }
  }

  toggleControlMode(): ControlMode {
    this.controlMode = this.controlMode === 'relative' ? 'absolute' : 'relative';
    return this.controlMode;
  }

  getControlMode(): ControlMode {
    return this.controlMode;
  }

  addBomb(): boolean {
    if (this.bombCount < this.maxBombs) {
      this.bombCount++;
      return true;
    }
    return false;
  }

  useBomb(): boolean {
    if (this.bombCount > 0) {
      this.bombCount--;
      return true;
    }
    return false;
  }

  getBombCount(): number {
    return this.bombCount;
  }

  canFire(currentTime: number): boolean {
    const fireRate = GAME_CONFIG.FIRE_RATE * this.powerUpState.getFireRateMultiplier();
    return currentTime - this.lastFireTime >= fireRate * 1000;
  }

  fire(currentTime: number): BulletSpawn[] | null {
    if (!this.canFire(currentTime)) return null;

    this.lastFireTime = currentTime;

    // Position de spawn du projectile (devant le canon)
    const spawnDistance = this.size + 10;
    
    // Double shot: chaque balle devient 2 balles parallèles avec micro décalage
    const hasDouble = this.powerUpState.hasDoubleShot();
    const doubleOffset = 10; // Distance perpendiculaire entre les 2 balles
    const doubleDelay = 0.03; // Micro delay (décalage en position pour simuler le délai)

    // Spread shot: tirer 3 projectiles en éventail
    if (this.powerUpState.hasSpreadShot()) {
      const spreadAngle = 0.25; // ~15 degrés
      const angles = [this.aimAngle - spreadAngle, this.aimAngle, this.aimAngle + spreadAngle];
      
      if (hasDouble) {
        // Double chaque tir du spread
        const bullets: BulletSpawn[] = [];
        for (const angle of angles) {
          const perpAngle = angle + Math.PI / 2;
          const baseX = this.position.x + Math.cos(angle) * spawnDistance;
          const baseY = this.position.y + Math.sin(angle) * spawnDistance;
          
          // Balle 1 (légèrement à gauche)
          bullets.push({
            x: baseX + Math.cos(perpAngle) * doubleOffset / 2,
            y: baseY + Math.sin(perpAngle) * doubleOffset / 2,
            angle: angle,
          });
          // Balle 2 (légèrement à droite et un peu derrière)
          bullets.push({
            x: baseX - Math.cos(perpAngle) * doubleOffset / 2 - Math.cos(angle) * doubleDelay * 100,
            y: baseY - Math.sin(perpAngle) * doubleOffset / 2 - Math.sin(angle) * doubleDelay * 100,
            angle: angle,
          });
        }
        return bullets;
      }
      
      return angles.map(angle => ({
        x: this.position.x + Math.cos(angle) * spawnDistance,
        y: this.position.y + Math.sin(angle) * spawnDistance,
        angle: angle,
      }));
    }

    // Tir normal
    const baseX = this.position.x + Math.cos(this.aimAngle) * spawnDistance;
    const baseY = this.position.y + Math.sin(this.aimAngle) * spawnDistance;
    
    if (hasDouble) {
      const perpAngle = this.aimAngle + Math.PI / 2;
      return [
        // Balle 1 (légèrement à gauche)
        {
          x: baseX + Math.cos(perpAngle) * doubleOffset / 2,
          y: baseY + Math.sin(perpAngle) * doubleOffset / 2,
          angle: this.aimAngle,
        },
        // Balle 2 (légèrement à droite et un peu derrière)
        {
          x: baseX - Math.cos(perpAngle) * doubleOffset / 2 - Math.cos(this.aimAngle) * doubleDelay * 100,
          y: baseY - Math.sin(perpAngle) * doubleOffset / 2 - Math.sin(this.aimAngle) * doubleDelay * 100,
          angle: this.aimAngle,
        }
      ];
    }

    return [{
      x: baseX,
      y: baseY,
      angle: this.aimAngle
    }];
  }

  getAimDirection(): Vector2 {
    return vectorFromAngle(this.aimAngle);
  }

  render(renderer: RenderSystem, camera: Camera): void {
    if (!this.isAlive) return;

    // Dessiner la trainée de propulsion en premier (derrière le vaisseau)
    this.renderThrustTrail(renderer, camera);

    // Dessiner le bouclier si actif
    if (this.powerUpState.hasShield()) {
      this.renderShield(renderer, camera);
    }

    const ctx = renderer.getContext();
    const screenPos = camera.worldToScreen(this.position);
    
    // Dessiner le vaisseau (SVG ou forme de secours)
    if (this.imageLoaded && this.shipImage) {
      // Dessiner l'image SVG
      ctx.save();
      
      // Effet néon
      ctx.shadowBlur = 15;
      ctx.shadowColor = COLORS.PLAYER;
      
      // Rotation et positionnement (+90° car le SVG pointe vers le haut)
      ctx.translate(screenPos.x, screenPos.y);
      ctx.rotate(this.rotation + Math.PI / 2);
      
      // Dessiner l'image centrée et à la bonne taille
      // Décalage de 5px vers le bas AVANT rotation pour aligner le centre de rotation avec le canon
      const imgSize = this.size * 2.5;
      ctx.drawImage(this.shipImage, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
      
      ctx.restore();
    } else {
      // Fallback: dessiner la forme géométrique originale si l'image n'est pas chargée
      const shipPoints = this.getShipPoints();
      renderer.drawNeonShape(shipPoints, camera, COLORS.PLAYER, false);
    }

    // Dessiner le canon (ligne vers la direction de visée)
    const cannonStart = this.position;
    const cannonEnd = {
      x: this.position.x + Math.cos(this.aimAngle) * (this.size + 15),
      y: this.position.y + Math.sin(this.aimAngle) * (this.size + 15),
    };
    
    // Couleur du canon différente si rapid fire
    let cannonColor = COLORS.BULLET;
    if (this.powerUpState.hasRapidFire()) {
      cannonColor = '#ff8800'; // Orange pour rapid fire
    }
    
    renderer.drawNeonLine(cannonStart, cannonEnd, camera, cannonColor, 3);
    
    // Rond à la base du canon (5px rayon)
    const baseScreenPos = camera.worldToScreen(cannonStart);
    ctx.save();
    ctx.fillStyle = cannonColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = cannonColor;
    ctx.beginPath();
    ctx.arc(baseScreenPos.x, baseScreenPos.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Carré à l'embouchure du canon (5px côté)
    const muzzleScreenPos = camera.worldToScreen(cannonEnd);
    ctx.save();
    ctx.fillStyle = cannonColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = cannonColor;
    ctx.translate(muzzleScreenPos.x, muzzleScreenPos.y);
    ctx.rotate(this.aimAngle); // Aligner le carré avec la direction du canon
    ctx.fillRect(-2.5, -2.5, 5, 5);
    ctx.restore();

    // Indicateurs de spread shot
    if (this.powerUpState.hasSpreadShot()) {
      const spreadAngle = 0.25;
      const cannonLength = this.size + 10;
      
      // Ligne gauche
      const leftEnd = {
        x: this.position.x + Math.cos(this.aimAngle - spreadAngle) * cannonLength,
        y: this.position.y + Math.sin(this.aimAngle - spreadAngle) * cannonLength,
      };
      renderer.drawNeonLine(this.position, leftEnd, camera, '#ff8800', 1);
      
      // Ligne droite
      const rightEnd = {
        x: this.position.x + Math.cos(this.aimAngle + spreadAngle) * cannonLength,
        y: this.position.y + Math.sin(this.aimAngle + spreadAngle) * cannonLength,
      };
      renderer.drawNeonLine(this.position, rightEnd, camera, '#ff8800', 1);
    }
  }

  private renderThrustTrail(renderer: RenderSystem, camera: Camera): void {
    const ctx = renderer.getContext();
    
    if (this.thrustParticles.length < 2) return;
    
    // Dessiner des arcs électriques entre les particules
    ctx.save();
    
    // Convertir les particules en positions écran
    const screenPositions = this.thrustParticles.map(p => ({
      pos: camera.worldToScreen({ x: p.x, y: p.y }),
      life: p.life,
      maxLife: p.maxLife
    }));
    
    // Dessiner des éclairs entre particules proches
    for (let i = 0; i < screenPositions.length; i++) {
      const p1 = screenPositions[i];
      const alpha = (p1.life / p1.maxLife) * 0.9;
      
      // Trouver les particules proches pour créer des arcs
      for (let j = i + 1; j < Math.min(i + 4, screenPositions.length); j++) {
        const p2 = screenPositions[j];
        const dx = p2.pos.x - p1.pos.x;
        const dy = p2.pos.y - p1.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 80) { // Ne connecter que les particules proches
          // Dessiner un éclair entre p1 et p2
          this.drawLightningBolt(ctx, p1.pos.x, p1.pos.y, p2.pos.x, p2.pos.y, alpha);
        }
      }
      
      // Petit point lumineux au centre de chaque particule
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00ffff';
      ctx.fillStyle = `rgba(150, 220, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p1.pos.x, p1.pos.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  private drawLightningBolt(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, alpha: number): void {
    const segments = 4 + Math.floor(Math.random() * 3);
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;
    
    // Perpendiculaire pour le zigzag
    const perpX = -dy * 0.3;
    const perpY = dx * 0.3;
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    
    for (let i = 1; i < segments; i++) {
      const offset = (Math.random() - 0.5) * 2;
      const px = x1 + dx * i + perpX * offset;
      const py = y1 + dy * i + perpY * offset;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(x2, y2);
    
    // Éclair principal (bleu électrique)
    ctx.strokeStyle = `rgba(100, 200, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00aaff';
    ctx.stroke();
    
    // Lueur blanche au centre
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private renderShield(renderer: RenderSystem, camera: Camera): void {
    const ctx = renderer.getContext();
    const screenPos = camera.worldToScreen(this.position);
    
    // Rayon du bouclier qui pulse
    const baseRadius = this.size * 1.8;
    const pulseAmount = Math.sin(this.shieldPulse) * 3;
    const shieldRadius = baseRadius + pulseAmount;
    
    // Temps restant du shield
    const remainingTime = this.powerUpState.getRemainingTime('shield');
    
    ctx.save();
    
    // Clignotement rapide si moins d'1 seconde restante
    let alpha = 0.5 + Math.sin(this.shieldPulse * 2) * 0.2;
    if (remainingTime > 0 && remainingTime <= 1) {
      // Clignotement très rapide (10Hz)
      const blink = Math.sin(remainingTime * Math.PI * 20) > 0;
      alpha = blink ? 0.8 : 0.1;
    }
    
    // Cercle de bouclier
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffff';
    ctx.globalAlpha = alpha;
    
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, shieldRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Hexagones décoratifs
    ctx.globalAlpha = 0.3;
    const numSides = 6;
    ctx.beginPath();
    for (let i = 0; i < numSides; i++) {
      const angle = (i * Math.PI * 2) / numSides + this.shieldPulse * 0.5;
      const x = screenPos.x + Math.cos(angle) * shieldRadius;
      const y = screenPos.y + Math.sin(angle) * shieldRadius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();
    
    ctx.restore();
  }

  private getShipPoints(): Vector2[] {
    // Design de vaisseau style chasseur moderne et élégant
    const s = this.size;
    const rot = this.rotation;
    
    // Points du vaisseau (forme de chasseur spatial futuriste)
    const localPoints = [
      { x: s * 1.5, y: 0 },              // Pointe avant (nez)
      { x: s * 0.8, y: -s * 0.3 },       // Cockpit gauche
      { x: s * 0.3, y: -s * 0.4 },       // Transition aile gauche
      { x: -s * 0.2, y: -s * 0.6 },      // Aile gauche milieu
      { x: -s * 0.6, y: -s * 0.8 },      // Aile gauche extrémité
      { x: -s * 0.8, y: -s * 0.5 },      // Réacteur gauche extérieur
      { x: -s * 0.6, y: -s * 0.2 },      // Réacteur gauche intérieur
      { x: -s * 0.7, y: 0 },             // Centre arrière
      { x: -s * 0.6, y: s * 0.2 },       // Réacteur droit intérieur
      { x: -s * 0.8, y: s * 0.5 },       // Réacteur droit extérieur
      { x: -s * 0.6, y: s * 0.8 },       // Aile droite extrémité
      { x: -s * 0.2, y: s * 0.6 },       // Aile droite milieu
      { x: s * 0.3, y: s * 0.4 },        // Transition aile droite
      { x: s * 0.8, y: s * 0.3 },        // Cockpit droit
    ];
    
    // Rotation et translation des points
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    
    return localPoints.map(p => ({
      x: this.position.x + p.x * cos - p.y * sin,
      y: this.position.y + p.x * sin + p.y * cos,
    }));
  }

  getPosition(): Vector2 {
    return { ...this.position };
  }

  getSize(): number {
    return this.size;
  }

  hasShield(): boolean {
    return this.powerUpState.hasShield();
  }

  reset(x: number, y: number): void {
    this.position = createVector(x, y);
    this.velocity = createVector();
    this.rotation = 0;
    this.isAlive = true;
    this.lastFireTime = 0;
    this.powerUpState.clear();
    this.shieldPulse = 0;
    this.thrustParticles = [];
    this.isThrusting = false;
    this.bombCount = 0;
  }

  // Reset partiel après une mort (garde les bombes mais perd les power-ups)
  respawn(x: number, y: number): void {
    this.position = createVector(x, y);
    this.velocity = createVector();
    this.rotation = 0;
    this.isAlive = true;
    this.lastFireTime = 0;
    this.powerUpState.clear(); // Perd les multiplicateurs et armes
    this.shieldPulse = 0;
    this.thrustParticles = [];
    this.isThrusting = false;
    // Garde bombCount
  }

  // Retourne si le joueur est en train d'accélérer (pour la distorsion de grille)
  getIsThrusting(): boolean {
    return this.isThrusting;
  }

  getVelocityMagnitude(): number {
    return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
  }
}
