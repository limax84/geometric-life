// Plankton - simple food particles for herbivores

import { RenderSystem } from '../systems/RenderSystem'
import { Camera, COLORS, Vector2 } from '../types'
import { addVectors, multiplyVector, randomInRange } from '../utils/Vector2'

let planktonIdCounter = 0

export class Plankton {
    id: string
    position: Vector2
    velocity: Vector2
    isAlive: boolean = true
    energy: number = 20

    // Visual
    size: number
    pulsePhase: number
    brightness: number

    constructor(position: Vector2) {
        this.id = `plankton-${++planktonIdCounter}`
        this.position = { ...position }

        // Slow drift velocity
        this.velocity = {
            x: randomInRange(-5, 5),
            y: randomInRange(-8, -2), // Slight upward drift
        }

        this.size = randomInRange(2, 5)
        this.pulsePhase = Math.random() * Math.PI * 2
        this.brightness = randomInRange(0.6, 1)
    }

    update(deltaTime: number, worldBounds: { width: number; height: number }): void {
        if (!this.isAlive) return

        // Update pulse animation
        this.pulsePhase += deltaTime * 3

        // Slow drift
        this.position = addVectors(this.position, multiplyVector(this.velocity, deltaTime))

        // Wrap around screen edges (plankton loops)
        if (this.position.x < 0) this.position.x = worldBounds.width
        if (this.position.x > worldBounds.width) this.position.x = 0
        if (this.position.y < 0) this.position.y = worldBounds.height
        if (this.position.y > worldBounds.height) this.position.y = 0
    }

    consume(): number {
        this.isAlive = false
        return this.energy
    }

    render(renderSystem: RenderSystem, camera: Camera): void {
        if (!this.isAlive) return

        const ctx = renderSystem.getContext()
        const screenPos = renderSystem.worldToScreen(this.position, camera)

        // Pulsing effect
        const pulse = 0.7 + 0.3 * Math.sin(this.pulsePhase)
        const currentSize = this.size * pulse * camera.zoom

        // Glow
        const settings = renderSystem.getGraphicsSettings()
        if (settings.entityGlow) {
            ctx.shadowBlur = 10 * settings.entityGlowIntensity
            ctx.shadowColor = COLORS.PLANKTON
        }

        // Draw plankton as small glowing circle
        ctx.fillStyle = COLORS.PLANKTON
        ctx.globalAlpha = this.brightness * pulse

        ctx.beginPath()
        ctx.arc(screenPos.x, screenPos.y, currentSize, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = 1
        ctx.shadowBlur = 0
    }
}

/**
 * Spawn plankton at random position
 */
export function spawnPlankton(worldBounds: { width: number; height: number }): Plankton {
    const position = {
        x: randomInRange(50, worldBounds.width - 50),
        y: randomInRange(50, worldBounds.height - 50),
    }
    return new Plankton(position)
}
