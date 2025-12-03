// Système de rendu avec effets néon/glow

import { Camera } from '../engine/Camera';
import { COLORS, GAME_CONFIG, GRAPHICS_PRESETS, GraphicsQuality, GraphicsSettings, Vector2 } from '../types';

// Point de distorsion pour l'effet de déformation
interface DistortionPoint {
  x: number;
  y: number;
  strength: number;
  radius: number;
  decay: number;
}

// Étoile pour le fond parallaxe
interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  layer: number; // 0, 1, 2 pour 3 couches
}

export class RenderSystem {
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number
  
  // Points de distorsion actifs
  private distortionPoints: DistortionPoint[] = []
  
  // Étoiles de fond (3 couches pour parallaxe)
  private stars: Star[] = []
  
  // Paramètres graphiques
  private graphicsSettings: GraphicsSettings
  private currentQuality: GraphicsQuality = 'high'

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx
    this.width = width
    this.height = height
    this.graphicsSettings = GRAPHICS_PRESETS['high']
    this.initStars()
  }
  
  // Setter pour les paramètres graphiques
  setGraphicsQuality(quality: GraphicsQuality): void {
    this.currentQuality = quality
    this.graphicsSettings = GRAPHICS_PRESETS[quality]
    // Réinitialiser les étoiles avec le nouveau nombre
    this.initStars()
  }
  
  getGraphicsSettings(): GraphicsSettings {
    return this.graphicsSettings
  }
  
  getCurrentQuality(): GraphicsQuality {
    return this.currentQuality
  }
  
  // Initialiser les étoiles sur une zone plus grande que l'arène
  private initStars(): void {
    this.stars = []
    
    const totalStars = this.graphicsSettings.starCount
    
    const starField = {
      width: GAME_CONFIG.ARENA_WIDTH + 800,
      height: GAME_CONFIG.ARENA_HEIGHT + 800,
      offsetX: -400,
      offsetY: -400,
    }
    
    // Répartition: 55% couche lointaine, 30% moyenne, 15% proche
    const layer0Count = Math.floor(totalStars * 0.55)
    const layer1Count = Math.floor(totalStars * 0.30)
    const layer2Count = totalStars - layer0Count - layer1Count
    
    // Couche lointaine (plus d'étoiles, plus petites, moins brillantes)
    for (let i = 0; i < layer0Count; i++) {
      this.stars.push({
        x: starField.offsetX + Math.random() * starField.width,
        y: starField.offsetY + Math.random() * starField.height,
        size: 0.5 + Math.random() * 1,
        brightness: 0.2 + Math.random() * 0.3,
        layer: 0,
      })
    }
    
    // Couche moyenne
    for (let i = 0; i < layer1Count; i++) {
      this.stars.push({
        x: starField.offsetX + Math.random() * starField.width,
        y: starField.offsetY + Math.random() * starField.height,
        size: 1 + Math.random() * 1.5,
        brightness: 0.4 + Math.random() * 0.3,
        layer: 1,
      })
    }
    
    // Couche proche (moins d'étoiles, plus grandes, plus brillantes)
    for (let i = 0; i < layer2Count; i++) {
      this.stars.push({
        x: starField.offsetX + Math.random() * starField.width,
        y: starField.offsetY + Math.random() * starField.height,
        size: 1.5 + Math.random() * 2,
        brightness: 0.6 + Math.random() * 0.4,
        layer: 2,
      })
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  clear(): void {
    this.ctx.fillStyle = COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // Ajouter un point de distorsion (appelé quand le vaisseau bouge)
  addDistortionPoint(x: number, y: number, strength: number = 15, radius: number = 80): void {
    // Skip if distortion is disabled
    if (!this.graphicsSettings.gridDistortion) return
    
    this.distortionPoints.push({
      x,
      y,
      strength,
      radius,
      decay: 1.0,
    })
    
    // Limiter le nombre de points actifs
    if (this.distortionPoints.length > 30) {
      this.distortionPoints.shift()
    }
  }

  // Mettre à jour les points de distorsion
  updateDistortion(deltaTime: number): void {
    for (let i = this.distortionPoints.length - 1; i >= 0; i--) {
      const point = this.distortionPoints[i];
      point.decay -= deltaTime * 3; // Décroissance rapide
      
      if (point.decay <= 0) {
        this.distortionPoints.splice(i, 1);
      }
    }
  }

  // Calculer le déplacement de distorsion pour un point de la grille
  private getDistortionOffset(gridX: number, gridY: number): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;

    for (const point of this.distortionPoints) {
      const distX = gridX - point.x;
      const distY = gridY - point.y;
      const dist = Math.sqrt(distX * distX + distY * distY);

      if (dist < point.radius && dist > 0) {
        const factor = (1 - dist / point.radius) * point.strength * point.decay;
        // Effet de répulsion/ondulation
        dx += (distX / dist) * factor * Math.sin(dist * 0.1);
        dy += (distY / dist) * factor * Math.sin(dist * 0.1);
      }
    }

    return { dx, dy };
  }

  // Dessiner la grille de fond avec effet de distorsion
  drawGrid(camera: Camera): void {
    const gridSize = 50
    const ctx = this.ctx

    ctx.strokeStyle = COLORS.GRID_LINE
    ctx.lineWidth = 1

    // Limiter la grille aux bordures de l'arène (nombres entiers de cases)
    const arenaStartX = 0
    const arenaStartY = 0
    const arenaEndX = GAME_CONFIG.ARENA_WIDTH
    const arenaEndY = GAME_CONFIG.ARENA_HEIGHT

    // Calculer les lignes visibles dans la zone de la caméra, mais limitées à l'arène
    const startX = Math.max(arenaStartX, Math.floor(camera.x / gridSize) * gridSize)
    const startY = Math.max(arenaStartY, Math.floor(camera.y / gridSize) * gridSize)
    const endX = Math.min(arenaEndX, Math.ceil((camera.x + camera.width) / gridSize) * gridSize)
    const endY = Math.min(arenaEndY, Math.ceil((camera.y + camera.height) / gridSize) * gridSize)

    // Dessiner la grille avec distorsion (only if enabled and there are distortion points)
    if (this.graphicsSettings.gridDistortion && this.distortionPoints.length > 0) {
      // Mode distorsion: dessiner point par point
      ctx.globalAlpha = 0.4;
      
      // Lignes verticales avec distorsion
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        let firstPoint = true;
        
        for (let y = startY; y <= endY; y += gridSize / 4) {
          const offset = this.getDistortionOffset(x, y);
          const screenX = x - camera.x + offset.dx;
          const screenY = y - camera.y + offset.dy;
          
          // Couleur basée sur la distorsion
          const distortion = Math.sqrt(offset.dx * offset.dx + offset.dy * offset.dy);
          if (distortion > 2) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + distortion * 0.02})`;
          } else {
            ctx.strokeStyle = COLORS.GRID_LINE;
          }
          
          if (firstPoint) {
            ctx.moveTo(screenX, screenY);
            firstPoint = false;
          } else {
            ctx.lineTo(screenX, screenY);
          }
        }
        ctx.stroke();
      }

      // Lignes horizontales avec distorsion
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        let firstPoint = true;
        
        for (let x = startX; x <= endX; x += gridSize / 4) {
          const offset = this.getDistortionOffset(x, y);
          const screenX = x - camera.x + offset.dx;
          const screenY = y - camera.y + offset.dy;
          
          const distortion = Math.sqrt(offset.dx * offset.dx + offset.dy * offset.dy);
          if (distortion > 2) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + distortion * 0.02})`;
          } else {
            ctx.strokeStyle = COLORS.GRID_LINE;
          }
          
          if (firstPoint) {
            ctx.moveTo(screenX, screenY);
            firstPoint = false;
          } else {
            ctx.lineTo(screenX, screenY);
          }
        }
        ctx.stroke();
      }
    } else {
      // Mode normal: grille simple
      ctx.globalAlpha = this.graphicsSettings.gridOpacity
      ctx.beginPath()

      // Lignes verticales (limitées à l'arène)
      for (let x = startX; x <= endX; x += gridSize) {
        const screenX = x - camera.x;
        const screenStartY = Math.max(0, arenaStartY - camera.y);
        const screenEndY = Math.min(this.height, arenaEndY - camera.y);
        ctx.moveTo(screenX, screenStartY);
        ctx.lineTo(screenX, screenEndY);
      }

      // Lignes horizontales (limitées à l'arène)
      for (let y = startY; y <= endY; y += gridSize) {
        const screenY = y - camera.y;
        const screenStartX = Math.max(0, arenaStartX - camera.x);
        const screenEndX = Math.min(this.width, arenaEndX - camera.x);
        ctx.moveTo(screenStartX, screenY);
        ctx.lineTo(screenEndX, screenY);
      }

      ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
  }

  // Dessiner les étoiles en fond avec effet parallaxe
  drawStarfield(camera: Camera): void {
    const ctx = this.ctx
    
    // Facteurs de parallaxe pour chaque couche (plus loin = moins de mouvement)
    const parallaxFactors = [0.2, 0.5, 0.8]
    
    ctx.save()
    
    for (const star of this.stars) {
      const parallaxFactor = parallaxFactors[star.layer]
      
      // Position de l'étoile avec effet parallaxe
      const screenX = star.x - camera.x * parallaxFactor
      const screenY = star.y - camera.y * parallaxFactor
      
      // Ne dessiner que les étoiles visibles
      if (screenX < -50 || screenX > this.width + 50 || screenY < -50 || screenY > this.height + 50) {
        continue
      }
      
      // Couleur et glow selon la couche
      const alpha = star.brightness
      ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`
      
      // Glow only if enabled
      if (this.graphicsSettings.starGlow) {
        ctx.shadowBlur = star.size * 2 * this.graphicsSettings.shadowBlurIntensity
        ctx.shadowColor = `rgba(200, 220, 255, ${alpha * 0.5})`
      } else {
        ctx.shadowBlur = 0
      }
      
      // Dessiner l'étoile comme un petit cercle
      ctx.beginPath()
      ctx.arc(screenX, screenY, star.size, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
  }

  // Dessiner les bordures de l'arène avec style néon épais et double ligne
  drawArenaBounds(camera: Camera): void {
    const ctx = this.ctx
    const bounds = {
      x: -camera.x,
      y: -camera.y,
      width: GAME_CONFIG.ARENA_WIDTH,
      height: GAME_CONFIG.ARENA_HEIGHT,
    }

    ctx.save()
    
    const glowIntensity = this.graphicsSettings.entityGlowIntensity
    
    // Ligne extérieure épaisse avec glow intense
    if (this.graphicsSettings.entityGlow) {
      ctx.shadowBlur = 30 * glowIntensity
      ctx.shadowColor = COLORS.PLAYER
    } else {
      ctx.shadowBlur = 0
    }
    ctx.strokeStyle = COLORS.PLAYER
    ctx.lineWidth = 6
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
    
    // Ligne intérieure fine pour effet double
    if (this.graphicsSettings.entityGlow) {
      ctx.shadowBlur = 15 * glowIntensity
    }
    ctx.lineWidth = 2
    ctx.strokeRect(bounds.x + 8, bounds.y + 8, bounds.width - 16, bounds.height - 16)
    
    // Coins renforcés avec des petits carrés
    const cornerSize = 15
    if (this.graphicsSettings.entityGlow) {
      ctx.shadowBlur = 20 * glowIntensity
    }
    ctx.fillStyle = COLORS.PLAYER
    
    // Coin haut-gauche
    ctx.fillRect(bounds.x - 3, bounds.y - 3, cornerSize, 3);
    ctx.fillRect(bounds.x - 3, bounds.y - 3, 3, cornerSize);
    
    // Coin haut-droit
    ctx.fillRect(bounds.x + bounds.width - cornerSize + 3, bounds.y - 3, cornerSize, 3);
    ctx.fillRect(bounds.x + bounds.width, bounds.y - 3, 3, cornerSize);
    
    // Coin bas-gauche
    ctx.fillRect(bounds.x - 3, bounds.y + bounds.height, cornerSize, 3);
    ctx.fillRect(bounds.x - 3, bounds.y + bounds.height - cornerSize + 3, 3, cornerSize);
    
    // Coin bas-droit
    ctx.fillRect(bounds.x + bounds.width - cornerSize + 3, bounds.y + bounds.height, cornerSize, 3);
    ctx.fillRect(bounds.x + bounds.width, bounds.y + bounds.height - cornerSize + 3, 3, cornerSize);
    
    ctx.restore();
  }

  // Dessiner une forme avec effet néon
  drawNeonShape(
    points: Vector2[],
    camera: Camera,
    color: string,
    fill: boolean = false
  ): void {
    if (points.length < 2) return

    const ctx = this.ctx

    // Effet glow (conditional)
    if (this.graphicsSettings.entityGlow) {
      ctx.shadowBlur = 15 * this.graphicsSettings.entityGlowIntensity
      ctx.shadowColor = color
    } else {
      ctx.shadowBlur = 0
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 2

    ctx.beginPath()
    const firstPoint = camera.worldToScreen(points[0])
    ctx.moveTo(firstPoint.x, firstPoint.y)

    for (let i = 1; i < points.length; i++) {
      const point = camera.worldToScreen(points[i])
      ctx.lineTo(point.x, point.y)
    }

    ctx.closePath()
    ctx.stroke()

    if (fill) {
      ctx.fillStyle = color
      ctx.globalAlpha = 0.2
      ctx.fill()
      ctx.globalAlpha = 1
    }

    ctx.shadowBlur = 0
  }

  // Dessiner un cercle avec effet néon
  drawNeonCircle(
    center: Vector2,
    radius: number,
    camera: Camera,
    color: string,
    fill: boolean = false
  ): void {
    const ctx = this.ctx
    const screenPos = camera.worldToScreen(center)

    if (this.graphicsSettings.entityGlow) {
      ctx.shadowBlur = 15 * this.graphicsSettings.entityGlowIntensity
      ctx.shadowColor = color
    } else {
      ctx.shadowBlur = 0
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2)
    ctx.stroke()

    if (fill) {
      ctx.fillStyle = color
      ctx.globalAlpha = 0.2
      ctx.fill()
      ctx.globalAlpha = 1
    }

    ctx.shadowBlur = 0
  }

  // Dessiner une ligne avec effet néon
  drawNeonLine(
    start: Vector2,
    end: Vector2,
    camera: Camera,
    color: string,
    lineWidth: number = 2
  ): void {
    const ctx = this.ctx
    const screenStart = camera.worldToScreen(start)
    const screenEnd = camera.worldToScreen(end)

    if (this.graphicsSettings.entityGlow) {
      ctx.shadowBlur = 10 * this.graphicsSettings.entityGlowIntensity
      ctx.shadowColor = color
    } else {
      ctx.shadowBlur = 0
    }
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth

    ctx.beginPath()
    ctx.moveTo(screenStart.x, screenStart.y)
    ctx.lineTo(screenEnd.x, screenEnd.y)
    ctx.stroke()

    ctx.shadowBlur = 0
  }

  // Dessiner du texte avec effet néon
  drawNeonText(
    text: string,
    x: number,
    y: number,
    color: string,
    fontSize: number = 24
  ): void {
    const ctx = this.ctx

    if (this.graphicsSettings.hudGlow) {
      ctx.shadowBlur = 10 * this.graphicsSettings.shadowBlurIntensity
      ctx.shadowColor = color
    } else {
      ctx.shadowBlur = 0
    }
    ctx.fillStyle = color
    ctx.font = `${fontSize}px 'Courier New', monospace`
    ctx.textAlign = 'left'

    ctx.fillText(text, x, y)

    ctx.shadowBlur = 0
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
