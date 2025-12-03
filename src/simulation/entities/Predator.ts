// Predator - hunts and eats herbivores

import {
    pursue,
    separate,
    wander
} from '../behaviors/Steering'
import { createGenomeForType } from '../genetics/Genome'
import { Genome, Vector2 } from '../types'
import {
    distance,
    magnitude,
    randomInRange
} from '../utils/Vector2'
import { Creature } from './Creature'

export class Predator extends Creature {
    // Hunting state
    private target: Creature | null = null
    private huntCooldown: number = 0

    constructor(genome: Genome, position: Vector2) {
        super('predator', genome, position)
        // Predators start with more energy but burn it faster
        this.energy = 100
        this.matureAge = 8 // Predators mature slower
    }

    calculateSteering(creatures: Creature[], _planktonList: Vector2[]): Vector2 {
        const steering = { x: 0, y: 0 }

        // Find nearby creatures
        const nearbyHerbivores: Creature[] = []
        const nearbyPredators: Creature[] = []

        for (const creature of creatures) {
            if (creature.id === this.id || !creature.isAlive) continue

            const dist = distance(this.position, creature.position)
            if (dist < this.perceptionRadius) {
                if (creature.type === 'herbivore') {
                    nearbyHerbivores.push(creature)
                } else if (creature.type === 'predator') {
                    nearbyPredators.push(creature)
                }
            }
        }

        // Update hunt cooldown
        if (this.huntCooldown > 0) {
            this.huntCooldown -= 0.016 // Approximate delta time
        }

        // PRIORITY 1: Hunt herbivores if hungry
        const isHungry = this.energy < 80

        if (isHungry && nearbyHerbivores.length > 0 && this.huntCooldown <= 0) {
            // Find best target (nearest or weakest)
            let bestTarget: Creature | null = null
            let bestScore = -Infinity

            for (const herbivore of nearbyHerbivores) {
                const dist = distance(this.position, herbivore.position)
                // Score based on proximity and prey's low energy
                const proximityScore = 1 - dist / this.perceptionRadius
                const weaknessScore = 1 - herbivore.energy / 100
                const score = proximityScore * 2 + weaknessScore

                if (score > bestScore) {
                    bestScore = score
                    bestTarget = herbivore
                }
            }

            if (bestTarget) {
                this.target = bestTarget

                // Pursue the target (predict where it will be)
                const pursueForce = pursue(
                    this.position,
                    this.velocity,
                    bestTarget.position,
                    bestTarget.velocity,
                    this.maxSpeed * 1.2, // Hunt faster
                    this.maxForce * 1.5
                )

                const aggression = this.genome.aggression
                steering.x += pursueForce.x * (1 + aggression)
                steering.y += pursueForce.y * (1 + aggression)
            }
        } else {
            this.target = null
        }

        // PRIORITY 2: Separation from other predators (avoid competition)
        if (nearbyPredators.length > 0) {
            const predatorPositions = nearbyPredators.map(p => p.position)

            const separationForce = separate(
                this.position,
                predatorPositions,
                this.size * 4, // Predators need more space
                this.maxForce
            )

            steering.x += separationForce.x * 2
            steering.y += separationForce.y * 2
        }

        // PRIORITY 3: Wander when not hunting
        if (magnitude(steering) < 0.1) {
            const wanderResult = wander(
                this.velocity,
                this.wanderAngle,
                25, // radius (larger wander for predators)
                50, // distance
                0.3, // jitter (smoother movement)
                this.maxForce
            )
            steering.x += wanderResult.steering.x
            steering.y += wanderResult.steering.y
            this.wanderAngle = wanderResult.newAngle
        }

        return steering
    }

    // Try to eat a nearby herbivore
    tryEat(creatures: Creature[]): Creature | null {
        if (this.huntCooldown > 0) return null

        for (const creature of creatures) {
            if (creature.type !== 'herbivore' || !creature.isAlive) continue

            const dist = distance(this.position, creature.position)
            const eatRange = this.size + creature.size

            if (dist < eatRange) {
                // Catch and eat!
                creature.die()
                // Gain energy based on prey's remaining energy
                const energyGain = 30 + creature.energy * 0.5
                this.gainEnergy(energyGain)

                // Cooldown before next hunt
                this.huntCooldown = 2

                return creature
            }
        }
        return null
    }

    // Override to show hunting indicator
    getColor(): string {
        // Base color from parent
        const baseHue = 330 + this.hue * 0.3 - 15 // Magenta/red range

        // Flash brighter when actively hunting
        if (this.target && this.huntCooldown <= 0) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5
            const lightness = 50 + this.luminosity * 20 + pulse * 20
            return `hsl(${baseHue}, 100%, ${lightness}%)`
        }

        const lightness = 50 + this.luminosity * 20
        return `hsl(${baseHue}, 100%, ${lightness}%)`
    }
}

/**
 * Create a new predator with random genome at position
 */
export function createPredator(position: Vector2): Predator {
    const genome = createGenomeForType('predator')
    return new Predator(genome, position)
}

/**
 * Spawn predator at random position
 */
export function spawnPredator(worldBounds: { width: number; height: number }): Predator {
    const position = {
        x: randomInRange(100, worldBounds.width - 100),
        y: randomInRange(100, worldBounds.height - 100),
    }
    return createPredator(position)
}
