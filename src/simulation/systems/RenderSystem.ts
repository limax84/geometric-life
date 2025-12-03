// Aquarium Render System - Cyberpunk neon aesthetic

import {
    Camera,
    COLORS,
    GRAPHICS_PRESETS,
    GraphicsQuality,
    GraphicsSettings,
    Vector2,
} from '../types'

// Ambient floating particle
interface AmbientParticle {
  x: number
  y: number
  size: number
  alpha: number
  speedX: number
  speedY: number
  pulse: number
  pulseSpeed: number
}

// Caustic light ray
interface CausticRay {
  x: number
  width: number
  alpha: number
  speed: number
  offset: number
}

export class RenderSystem {
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number
  
  // Graphics settings
  private graphicsSettings: GraphicsSettings
  private currentQuality: GraphicsQuality = 'high'
  
  // Ambient particles (floating dust/plankton)
  private ambientParticles: AmbientParticle[] = []
  
  // Caustic light effects
  private causticRays: CausticRay[] = []
  
  // Animation time
  private time: number = 0

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx
    this.width = width
    this.height = height
    this.graphicsSettings = GRAPHICS_PRESETS['high']
    this.initAmbientParticles()
    this.initCaustics()
  }

  // === SETUP ===
  
  setGraphicsQuality(quality: GraphicsQuality): void {
    this.currentQuality = quality
    this.graphicsSettings = GRAPHICS_PRESETS[quality]
    this.initAmbientParticles()
    this.initCaustics()
  }

  getGraphicsSettings(): GraphicsSettings {
    return this.graphicsSettings
  }

  getCurrentQuality(): GraphicsQuality {
    return this.currentQuality
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.initAmbientParticles()
    this.initCaustics()
  }

  private initAmbientParticles(): void {
    this.ambientParticles = []
    const count = this.graphicsSettings.ambientParticleCount
    
    for (let i = 0; i < count; i++) {
      this.ambientParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 3,
        alpha: 0.1 + Math.random() * 0.3,
        speedX: (Math.random() - 0.5) * 10,
        speedY: -5 - Math.random() * 15, // Floating upward
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 1 + Math.random() * 2,
      })
    }
  }

  private initCaustics(): void {
    this.causticRays = []
    if (!this.graphicsSettings.causticsEnabled) return
    
    const rayCount = 8
    for (let i = 0; i < rayCount; i++) {
      this.causticRays.push({
        x: Math.random() * this.width,
        width: 30 + Math.random() * 60,
        alpha: 0.02 + Math.random() * 0.03,
        speed: 20 + Math.random() * 30,
        offset: Math.random() * Math.PI * 2,
      })
    }
  }

  // === UPDATE ===
  
  update(deltaTime: number): void {
    this.time += deltaTime
    this.updateAmbientParticles(deltaTime)
    this.updateCaustics(deltaTime)
  }

  private updateAmbientParticles(deltaTime: number): void {
    for (const particle of this.ambientParticles) {
      particle.x += particle.speedX * deltaTime
      particle.y += particle.speedY * deltaTime
      particle.pulse += particle.pulseSpeed * deltaTime
      
      // Wrap around screen
      if (particle.y < -10) {
        particle.y = this.height + 10
        particle.x = Math.random() * this.width
      }
      if (particle.x < -10) particle.x = this.width + 10
      if (particle.x > this.width + 10) particle.x = -10
    }
  }

  private updateCaustics(deltaTime: number): void {
    for (const ray of this.causticRays) {
      ray.x += ray.speed * deltaTime
      if (ray.x > this.width + ray.width) {
        ray.x = -ray.width
      }
    }
  }

  // === RENDER ===

  clear(): void {
    // Deep water gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, COLORS.BACKGROUND_GRADIENT_TOP)
    gradient.addColorStop(1, COLORS.BACKGROUND_GRADIENT_BOTTOM)
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  drawCaustics(): void {
    if (!this.graphicsSettings.causticsEnabled) return
    
    const ctx = this.ctx
    ctx.save()
    
    for (const ray of this.causticRays) {
      // Create a vertical gradient for each ray
      const gradient = ctx.createLinearGradient(ray.x, 0, ray.x + ray.width, 0)
      gradient.addColorStop(0, 'transparent')
      gradient.addColorStop(0.5, `rgba(68, 136, 255, ${ray.alpha})`)
      gradient.addColorStop(1, 'transparent')
      
      ctx.fillStyle = gradient
      
      // Wavy ray shape
      ctx.beginPath()
      const waveAmplitude = 20
      const waveFrequency = 0.01
      
      ctx.moveTo(ray.x, 0)
      for (let y = 0; y <= this.height; y += 10) {
        const waveOffset = Math.sin(y * waveFrequency + this.time + ray.offset) * waveAmplitude
        ctx.lineTo(ray.x + waveOffset, y)
      }
      for (let y = this.height; y >= 0; y -= 10) {
        const waveOffset = Math.sin(y * waveFrequency + this.time + ray.offset) * waveAmplitude
        ctx.lineTo(ray.x + ray.width + waveOffset, y)
      }
      ctx.closePath()
      ctx.fill()
    }
    
    ctx.restore()
  }

  drawGrid(camera: Camera): void {
    const ctx = this.ctx
    const gridSize = 60
    
    // Calculate visible grid area
    const startX = Math.floor(camera.x / gridSize) * gridSize
    const startY = Math.floor(camera.y / gridSize) * gridSize
    const endX = camera.x + camera.width + gridSize
    const endY = camera.y + camera.height + gridSize
    
    ctx.save()
    ctx.strokeStyle = COLORS.GRID_LINE
    ctx.lineWidth = 1
    ctx.globalAlpha = this.graphicsSettings.gridOpacity
    
    // Glow effect for grid
    if (this.graphicsSettings.gridGlow) {
      ctx.shadowBlur = 5 * this.graphicsSettings.shadowBlurIntensity
      ctx.shadowColor = COLORS.GRID_GLOW
    }
    
    ctx.beginPath()
    
    // Vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      const screenX = x - camera.x
      ctx.moveTo(screenX, 0)
      ctx.lineTo(screenX, this.height)
    }
    
    // Horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      const screenY = y - camera.y
      ctx.moveTo(0, screenY)
      ctx.lineTo(this.width, screenY)
    }
    
    ctx.stroke()
    ctx.restore()
  }

  drawAmbientParticles(): void {
    const ctx = this.ctx
    ctx.save()
    
    for (const particle of this.ambientParticles) {
      const pulseAlpha = particle.alpha * (0.5 + 0.5 * Math.sin(particle.pulse))
      
      ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`
      
      if (this.graphicsSettings.particleGlow) {
        ctx.shadowBlur = particle.size * 3 * this.graphicsSettings.shadowBlurIntensity
        ctx.shadowColor = COLORS.AMBIENT_PARTICLE
      }
      
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
  }

  // === ENTITY RENDERING ===

  drawNeonShape(
    points: Vector2[],
    camera: Camera,
    color: string,
    fill: boolean = false
  ): void {
    if (points.length < 2) return
    
    const ctx = this.ctx
    ctx.save()
    
    if (this.graphicsSettings.entityGlow) {
      ctx.shadowBlur = 15 * this.graphicsSettings.entityGlowIntensity
      ctx.shadowColor = color
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    
    ctx.beginPath()
    const first = this.worldToScreen(points[0], camera)
    ctx.moveTo(first.x, first.y)
    
    for (let i = 1; i < points.length; i++) {
      const point = this.worldToScreen(points[i], camera)
      ctx.lineTo(point.x, point.y)
    }
    
    ctx.closePath()
    ctx.stroke()
    
    if (fill) {
      ctx.fillStyle = color
      ctx.globalAlpha = 0.2
      ctx.fill()
    }
    
    ctx.restore()
  }

  drawNeonCircle(
    center: Vector2,
    radius: number,
    camera: Camera,
    color: string,
    fill: boolean = false
  ): void {
    const ctx = this.ctx
    const screenPos = this.worldToScreen(center, camera)
    
    ctx.save()
    
    if (this.graphicsSettings.entityGlow) {
      ctx.shadowBlur = 15 * this.graphicsSettings.entityGlowIntensity
      ctx.shadowColor = color
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    
    ctx.beginPath()
    ctx.arc(screenPos.x, screenPos.y, radius * camera.zoom, 0, Math.PI * 2)
    ctx.stroke()
    
    if (fill) {
      ctx.fillStyle = color
      ctx.globalAlpha = 0.2
      ctx.fill()
    }
    
    ctx.restore()
  }

  drawNeonPolygon(
    center: Vector2,
    radius: number,
    sides: number,
    rotation: number,
    camera: Camera,
    color: string,
    fill: boolean = true
  ): void {
    const points: Vector2[] = []
    const angleStep = (Math.PI * 2) / sides
    
    for (let i = 0; i < sides; i++) {
      const angle = rotation + i * angleStep
      points.push({
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      })
    }
    
    this.drawNeonShape(points, camera, color, fill)
  }

  drawNeonText(
    text: string,
    x: number,
    y: number,
    color: string,
    fontSize: number = 16
  ): void {
    const ctx = this.ctx
    ctx.save()
    
    if (this.graphicsSettings.entityGlow) {
      ctx.shadowBlur = 8 * this.graphicsSettings.shadowBlurIntensity
      ctx.shadowColor = color
    }
    ctx.fillStyle = color
    ctx.font = `${fontSize}px 'Courier New', monospace`
    ctx.textAlign = 'left'
    ctx.fillText(text, x, y)
    
    ctx.restore()
  }

  // === UTILITY ===

  worldToScreen(pos: Vector2, camera: Camera): Vector2 {
    return {
      x: (pos.x - camera.x) * camera.zoom,
      y: (pos.y - camera.y) * camera.zoom,
    }
  }

  screenToWorld(pos: Vector2, camera: Camera): Vector2 {
    return {
      x: pos.x / camera.zoom + camera.x,
      y: pos.y / camera.zoom + camera.y,
    }
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx
  }

  getWidth(): number {
    return this.width
  }

  getHeight(): number {
    return this.height
  }
}
