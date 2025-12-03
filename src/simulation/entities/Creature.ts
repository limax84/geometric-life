// Base Creature class with genome-driven behavior

import { stayInBounds } from '../behaviors/Steering'
import { expressGene } from '../genetics/Genome'
import { RenderSystem } from '../systems/RenderSystem'
import { Camera, CreatureType, Genome, Vector2 } from '../types'
import {
    addVectors,
    angleFromVector,
    clampVector,
    magnitude,
    multiplyVector,
    randomVector
} from '../utils/Vector2'

let creatureIdCounter = 0

export abstract class Creature {
    // Identity
    id: string
    type: CreatureType
    genome: Genome

    // Physical state
    position: Vector2
    velocity: Vector2
    acceleration: Vector2 = { x: 0, y: 0 }
    rotation: number = 0

    // Life state
    isAlive: boolean = true
    age: number = 0
    energy: number = 100
    mature: boolean = false

    // Expressed traits (from genome)
    size: number
    maxSpeed: number
    maxForce: number
    turnRate: number
    perceptionRadius: number
    metabolismRate: number

    // Visual traits
    sides: number
    hue: number
    luminosity: number
    patternType: number

    // Wander behavior state
    wanderAngle: number = Math.random() * Math.PI * 2

    // Lifecycle
    maxAge: number
    matureAge: number = 5 // Age at which creature becomes mature

    // World bounds (set by simulation)
    protected worldBounds: { x: number; y: number; width: number; height: number } = {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
    }

    constructor(type: CreatureType, genome: Genome, position: Vector2) {
        this.id = `creature-${++creatureIdCounter}`
        this.type = type
        this.genome = genome
        this.position = { ...position }
        this.velocity = randomVector(20)

        // Express genome to phenotype
        this.size = expressGene('size', genome.size)
        this.maxSpeed = expressGene('speed', genome.speed)
        this.turnRate = expressGene('agility', genome.agility)
        this.perceptionRadius = expressGene('perception', genome.perception)
        this.metabolismRate = expressGene('metabolism', genome.metabolism)
        this.maxAge = expressGene('longevity', genome.longevity)

        // Visual expression
        this.sides = Math.round(expressGene('shape', genome.shape))
        this.hue = expressGene('hue', genome.hue)
        this.luminosity = expressGene('luminosity', genome.luminosity)
        this.patternType = Math.floor(expressGene('pattern', genome.pattern))

        // Max force scales with agility
        this.maxForce = this.turnRate * 20
    }

    setWorldBounds(bounds: { x: number; y: number; width: number; height: number }): void {
        this.worldBounds = bounds
    }

    // Abstract method - each creature type implements its own behavior
    abstract calculateSteering(
        creatures: Creature[],
        plankton: Vector2[]
    ): Vector2

    update(deltaTime: number, creatures: Creature[], plankton: Vector2[]): void {
        if (!this.isAlive) return

        // Age
        this.age += deltaTime
        if (this.age > this.matureAge) {
            this.mature = true
        }

        // Metabolism - consume energy
        this.energy -= this.metabolismRate * deltaTime

        // Die if out of energy or too old
        if (this.energy <= 0 || this.age >= this.maxAge) {
            this.die()
            return
        }

        // Calculate steering forces
        const steering = this.calculateSteering(creatures, plankton)

        // Stay in bounds
        const boundsForce = stayInBounds(
            this.position,
            this.velocity,
            this.worldBounds,
            50,
            this.maxForce * 2
        )

        // Combine forces
        this.acceleration = addVectors(steering, boundsForce)

        // Apply physics
        this.velocity = addVectors(this.velocity, multiplyVector(this.acceleration, deltaTime))
        this.velocity = clampVector(this.velocity, this.maxSpeed)
        this.position = addVectors(this.position, multiplyVector(this.velocity, deltaTime))

        // Update rotation to face velocity direction
        if (magnitude(this.velocity) > 0.1) {
            this.rotation = angleFromVector(this.velocity)
        }

        // Reset acceleration
        this.acceleration = { x: 0, y: 0 }
    }

    die(): void {
        this.isAlive = false
    }

    gainEnergy(amount: number): void {
        const efficiency = expressGene('efficiency', this.genome.efficiency)
        this.energy = Math.min(150, this.energy + amount * efficiency)
    }

    canReproduce(): boolean {
        const fertilityThreshold = expressGene('fertility', this.genome.fertility) * 50 + 50
        return this.mature && this.energy > fertilityThreshold
    }

    // Get the color based on type and genome
    getColor(): string {
        let baseHue: number

        switch (this.type) {
            case 'plankton':
                baseHue = 140 // Green
                break
            case 'herbivore':
                baseHue = 180 + this.hue * 0.3 - 15 // Cyan range
                break
            case 'predator':
                baseHue = 330 + this.hue * 0.3 - 15 // Magenta/red range
                break
            default:
                baseHue = this.hue
        }

        const saturation = 100
        const lightness = 50 + this.luminosity * 20

        return `hsl(${baseHue}, ${saturation}%, ${lightness}%)`
    }

    render(renderSystem: RenderSystem, camera: Camera): void {
        if (!this.isAlive) return

        const color = this.getColor()

        // Scale size based on age (young creatures are smaller)
        const ageScale = this.mature ? 1 : 0.5 + (this.age / this.matureAge) * 0.5
        const currentSize = this.size * ageScale

        // Draw the creature shape
        renderSystem.drawNeonPolygon(
            this.position,
            currentSize,
            this.sides,
            this.rotation,
            camera,
            color,
            true
        )

        // Draw energy indicator (small bar above creature)
        this.renderEnergyBar(renderSystem, camera, currentSize)
    }

    private renderEnergyBar(renderSystem: RenderSystem, camera: Camera, size: number): void {
        const ctx = renderSystem.getContext()
        const screenPos = renderSystem.worldToScreen(this.position, camera)

        const barWidth = size * 2 * camera.zoom
        const barHeight = 3
        const barY = screenPos.y - size * camera.zoom - 8

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(screenPos.x - barWidth / 2, barY, barWidth, barHeight)

        // Energy fill
        const energyRatio = Math.max(0, Math.min(1, this.energy / 100))
        let energyColor: string

        if (energyRatio > 0.6) {
            energyColor = '#00ff88'
        } else if (energyRatio > 0.3) {
            energyColor = '#ffcc00'
        } else {
            energyColor = '#ff4444'
        }

        ctx.fillStyle = energyColor
        ctx.fillRect(screenPos.x - barWidth / 2, barY, barWidth * energyRatio, barHeight)
    }
}
