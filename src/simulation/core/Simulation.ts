// Main Simulation Engine for Geometric Life

import { Creature } from '../entities/Creature'
import { Herbivore, spawnHerbivore } from '../entities/Herbivore'
import { Plankton, spawnPlankton } from '../entities/Plankton'
import { Predator, spawnPredator } from '../entities/Predator'
import { RenderSystem } from '../systems/RenderSystem'
import {
    Camera,
    COLORS,
    GraphicsQuality,
    SIMULATION_CONFIG,
    SimulationState
} from '../types'

export class Simulation {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private renderSystem: RenderSystem

    // Simulation state
    private state: SimulationState = 'running'
    private timeScale: number = 1

    // Camera / viewport
    private camera: Camera

    // Animation loop
    private animationFrameId: number | null = null
    private lastTime: number = 0

    // FPS tracking
    private fps: number = 0
    private frameCount: number = 0
    private fpsUpdateTime: number = 0

    // === ECOSYSTEM ===
    private plankton: Plankton[] = []
    private creatures: Creature[] = []
    private planktonSpawnTimer: number = 0

    // World bounds
    private worldBounds: { x: number; y: number; width: number; height: number }

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            throw new Error('Could not get 2D context from canvas')
        }
        this.ctx = ctx

        // World bounds = screen size (fullscreen adaptive)
        this.worldBounds = {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height,
        }

        // Initialize camera centered on world
        this.camera = {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height,
            zoom: 1,
        }

        // Initialize render system
        this.renderSystem = new RenderSystem(ctx, canvas.width, canvas.height)

        // Initialize ecosystem
        this.initEcosystem()
    }

    private initEcosystem(): void {
        // Spawn initial plankton
        for (let i = 0; i < 50; i++) {
            this.plankton.push(spawnPlankton(this.worldBounds))
        }

        // Spawn initial herbivores
        for (let i = 0; i < 15; i++) {
            const herbivore = spawnHerbivore(this.worldBounds)
            herbivore.setWorldBounds(this.worldBounds)
            this.creatures.push(herbivore)
        }

        // Spawn initial predators
        for (let i = 0; i < 3; i++) {
            const predator = spawnPredator(this.worldBounds)
            predator.setWorldBounds(this.worldBounds)
            this.creatures.push(predator)
        }
    }

    // === LIFECYCLE ===

    async start(): Promise<void> {
        this.lastTime = performance.now()
        this.state = 'running'
        this.loop()
    }

    stop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId)
            this.animationFrameId = null
        }
    }

    pause(): void {
        this.state = 'paused'
    }

    resume(): void {
        this.state = 'running'
    }

    togglePause(): void {
        if (this.state === 'paused') {
            this.resume()
        } else {
            this.pause()
        }
    }

    resize(width: number, height: number): void {
        this.canvas.width = width
        this.canvas.height = height
        this.camera.width = width
        this.camera.height = height
        this.worldBounds.width = width
        this.worldBounds.height = height
        this.renderSystem.resize(width, height)

        // Update creature bounds
        for (const creature of this.creatures) {
            creature.setWorldBounds(this.worldBounds)
        }
    }

    // === MAIN LOOP ===

    private loop = (): void => {
        const currentTime = performance.now()
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1) // Cap at 100ms
        this.lastTime = currentTime

        // FPS calculation
        this.frameCount++
        this.fpsUpdateTime += deltaTime
        if (this.fpsUpdateTime >= 1) {
            this.fps = this.frameCount
            this.frameCount = 0
            this.fpsUpdateTime = 0
        }

        // Update (only if running)
        if (this.state === 'running') {
            this.update(deltaTime * this.timeScale)
        }

        // Always render
        this.render()

        // Continue loop
        this.animationFrameId = requestAnimationFrame(this.loop)
    }

    private update(deltaTime: number): void {
        // Update render system (ambient particles, caustics)
        this.renderSystem.update(deltaTime)

        // Spawn plankton
        this.planktonSpawnTimer += deltaTime
        const spawnInterval = 1 / SIMULATION_CONFIG.PLANKTON_SPAWN_RATE
        while (this.planktonSpawnTimer >= spawnInterval) {
            this.planktonSpawnTimer -= spawnInterval
            if (this.plankton.length < SIMULATION_CONFIG.MAX_PLANKTON) {
                this.plankton.push(spawnPlankton(this.worldBounds))
            }
        }

        // Update plankton
        for (const p of this.plankton) {
            p.update(deltaTime, this.worldBounds)
        }

        // Get plankton positions for creature AI
        const planktonPositions = this.plankton
            .filter(p => p.isAlive)
            .map(p => p.position)

        // Update creatures
        for (const creature of this.creatures) {
            creature.update(deltaTime, this.creatures, planktonPositions)

            // Handle eating
            if (creature.type === 'herbivore') {
                const herbivore = creature as Herbivore
                herbivore.tryEat(this.plankton)
            } else if (creature.type === 'predator') {
                const predator = creature as Predator
                predator.tryEat(this.creatures)
            }
        }

        // Remove dead entities
        this.plankton = this.plankton.filter(p => p.isAlive)
        this.creatures = this.creatures.filter(c => c.isAlive)
    }

    private render(): void {
        // Clear with gradient background
        this.renderSystem.clear()

        // Draw caustic light rays (background effect)
        this.renderSystem.drawCaustics()

        // Draw grid
        this.renderSystem.drawGrid(this.camera)

        // Draw ambient floating particles
        this.renderSystem.drawAmbientParticles()

        // Draw plankton
        for (const p of this.plankton) {
            p.render(this.renderSystem, this.camera)
        }

        // Draw creatures
        for (const creature of this.creatures) {
            creature.render(this.renderSystem, this.camera)
        }

        // Draw UI overlay
        this.renderUI()
    }

    private renderUI(): void {
        const ctx = this.ctx

        // FPS counter (top right)
        this.renderSystem.drawNeonText(
            `FPS: ${this.fps}`,
            this.canvas.width - 100,
            30,
            COLORS.UI_TEXT,
            14
        )

        // Population counts
        const herbivoreCount = this.creatures.filter(c => c.type === 'herbivore').length
        const predatorCount = this.creatures.filter(c => c.type === 'predator').length
        const planktonCount = this.plankton.length

        this.renderSystem.drawNeonText(
            `Plankton: ${planktonCount}`,
            20,
            30,
            COLORS.PLANKTON,
            14
        )
        this.renderSystem.drawNeonText(
            `Herbivores: ${herbivoreCount}`,
            20,
            50,
            COLORS.HERBIVORE_MAX,
            14
        )
        this.renderSystem.drawNeonText(
            `Predators: ${predatorCount}`,
            20,
            70,
            COLORS.PREDATOR_MAX,
            14
        )

        // Simulation state indicator
        if (this.state === 'paused') {
            ctx.save()
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

            this.renderSystem.drawNeonText(
                'PAUSED',
                this.canvas.width / 2 - 50,
                this.canvas.height / 2,
                COLORS.UI_ACCENT,
                32
            )
            ctx.restore()
        }

        // Time scale indicator (if not 1x)
        if (this.timeScale !== 1) {
            this.renderSystem.drawNeonText(
                `x${this.timeScale}`,
                this.canvas.width - 100,
                50,
                COLORS.UI_ACCENT,
                14
            )
        }
    }

    // === CONTROLS ===

    setTimeScale(scale: number): void {
        this.timeScale = Math.max(0.1, Math.min(10, scale))
    }

    getTimeScale(): number {
        return this.timeScale
    }

    setGraphicsQuality(quality: GraphicsQuality): void {
        this.renderSystem.setGraphicsQuality(quality)
    }

    getGraphicsQuality(): GraphicsQuality {
        return this.renderSystem.getCurrentQuality()
    }

    // === CAMERA CONTROLS ===

    pan(dx: number, dy: number): void {
        this.camera.x += dx / this.camera.zoom
        this.camera.y += dy / this.camera.zoom
    }

    zoom(factor: number, centerX: number, centerY: number): void {
        const oldZoom = this.camera.zoom
        this.camera.zoom = Math.max(0.5, Math.min(3, this.camera.zoom * factor))

        // Zoom toward mouse position
        const zoomDelta = this.camera.zoom - oldZoom
        this.camera.x -= (centerX / this.camera.zoom) * zoomDelta
        this.camera.y -= (centerY / this.camera.zoom) * zoomDelta
    }

    resetCamera(): void {
        this.camera.x = 0
        this.camera.y = 0
        this.camera.zoom = 1
    }

    // === INTERACTION ===

    handleClick(screenX: number, screenY: number): void {
        const worldPos = this.renderSystem.screenToWorld(
            { x: screenX, y: screenY },
            this.camera
        )

        // Spawn plankton at click position
        const newPlankton = new Plankton(worldPos)
        this.plankton.push(newPlankton)
    }

    // === GETTERS ===

    getState(): SimulationState {
        return this.state
    }

    getFPS(): number {
        return this.fps
    }

    getCamera(): Camera {
        return { ...this.camera }
    }

    getPopulationStats() {
        return {
            plankton: this.plankton.length,
            herbivores: this.creatures.filter(c => c.type === 'herbivore').length,
            predators: this.creatures.filter(c => c.type === 'predator').length,
        }
    }
}
