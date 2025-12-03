// Herbivore - eats plankton, flees from predators

import {
    align,
    cohesion,
    flee,
    seek,
    separate,
    wander,
} from '../behaviors/Steering'
import { createGenomeForType } from '../genetics/Genome'
import { Genome, Vector2 } from '../types'
import {
    distance,
    magnitude,
    randomInRange
} from '../utils/Vector2'
import { Creature } from './Creature'
import { Plankton } from './Plankton'

export class Herbivore extends Creature {
    // Reference to plankton for eating
    private nearestPlankton: Plankton | null = null
    private nearestPredator: Creature | null = null

    constructor(genome: Genome, position: Vector2) {
        super('herbivore', genome, position)
        // Herbivores start with less energy
        this.energy = 80
    }

    calculateSteering(creatures: Creature[], planktonList: Vector2[]): Vector2 {
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

        // PRIORITY 1: Flee from predators (highest priority)
        if (nearbyPredators.length > 0) {
            let closestPredator: Creature | null = null
            let closestDist = Infinity

            for (const predator of nearbyPredators) {
                const dist = distance(this.position, predator.position)
                if (dist < closestDist) {
                    closestDist = dist
                    closestPredator = predator
                }
            }

            if (closestPredator && closestDist < this.perceptionRadius * 0.8) {
                const fleeForce = flee(
                    this.position,
                    closestPredator.position,
                    this.velocity,
                    this.maxSpeed * 1.3, // Flee faster
                    this.maxForce * 2
                )
                steering.x += fleeForce.x * 3 // High weight for survival
                steering.y += fleeForce.y * 3
            }
        }

        // PRIORITY 2: Seek food if hungry
        const isHungry = this.energy < 70

        if (isHungry && planktonList.length > 0) {
            // Find nearest plankton
            let nearestDist = Infinity
            let nearestPos: Vector2 | null = null

            for (const pos of planktonList) {
                const dist = distance(this.position, pos)
                if (dist < nearestDist && dist < this.perceptionRadius) {
                    nearestDist = dist
                    nearestPos = pos
                }
            }

            if (nearestPos) {
                const seekForce = seek(
                    this.position,
                    nearestPos,
                    this.velocity,
                    this.maxSpeed,
                    this.maxForce
                )
                const hunger = 1 - this.energy / 100 // More hungry = stronger seek
                steering.x += seekForce.x * (1 + hunger)
                steering.y += seekForce.y * (1 + hunger)
            }
        }

        // PRIORITY 3: Flocking behavior with other herbivores
        if (nearbyHerbivores.length > 0) {
            const neighborPositions = nearbyHerbivores.map(h => h.position)
            const neighborVelocities = nearbyHerbivores.map(h => h.velocity)

            // Separation - avoid crowding
            const separationForce = separate(
                this.position,
                neighborPositions,
                this.size * 3,
                this.maxForce
            )

            // Cohesion - stay close to group
            const cohesionForce = cohesion(
                this.position,
                neighborPositions,
                this.velocity,
                this.maxSpeed,
                this.maxForce
            )

            // Alignment - match direction
            const alignForce = align(
                this.velocity,
                neighborVelocities,
                this.maxSpeed,
                this.maxForce
            )

            // Use sociability gene to weight flocking
            const sociability = this.genome.sociability

            steering.x += separationForce.x * 1.5
            steering.y += separationForce.y * 1.5
            steering.x += cohesionForce.x * sociability * 0.5
            steering.y += cohesionForce.y * sociability * 0.5
            steering.x += alignForce.x * sociability * 0.3
            steering.y += alignForce.y * sociability * 0.3
        }

        // PRIORITY 4: Wander if nothing else to do
        if (magnitude(steering) < 0.1) {
            const wanderResult = wander(
                this.velocity,
                this.wanderAngle,
                20, // radius
                40, // distance
                0.5, // jitter
                this.maxForce
            )
            steering.x += wanderResult.steering.x
            steering.y += wanderResult.steering.y
            this.wanderAngle = wanderResult.newAngle
        }

        return steering
    }

    // Check if can eat nearby plankton
    tryEat(planktonList: Plankton[]): Plankton | null {
        for (const plankton of planktonList) {
            if (!plankton.isAlive) continue

            const dist = distance(this.position, plankton.position)
            if (dist < this.size + plankton.size) {
                // Eat it!
                const energy = plankton.consume()
                this.gainEnergy(energy)
                return plankton
            }
        }
        return null
    }
}

/**
 * Create a new herbivore with random genome at position
 */
export function createHerbivore(position: Vector2): Herbivore {
    const genome = createGenomeForType('herbivore')
    return new Herbivore(genome, position)
}

/**
 * Spawn herbivore at random position
 */
export function spawnHerbivore(worldBounds: { width: number; height: number }): Herbivore {
    const position = {
        x: randomInRange(100, worldBounds.width - 100),
        y: randomInRange(100, worldBounds.height - 100),
    }
    return createHerbivore(position)
}
