// Genome system for creatures

import { Genome } from '../types'
import { randomInRange } from '../utils/Vector2'

// Gene ranges define min/max values when expressed as phenotype
export const GENE_RANGES = {
    // Morphology
    shape: { min: 3, max: 8 },           // Number of sides
    size: { min: 8, max: 25 },           // Radius in pixels
    hue: { min: 0, max: 360 },           // Color hue
    luminosity: { min: 0.3, max: 1 },    // Glow intensity
    pattern: { min: 0, max: 3 },         // Pattern type (0=solid, 1=pulse, 2=stripes, 3=gradient)

    // Behavior
    speed: { min: 30, max: 120 },        // Max speed in px/s
    agility: { min: 1, max: 5 },         // Turn rate in rad/s
    perception: { min: 50, max: 200 },   // Detection radius in px
    aggression: { min: 0, max: 1 },      // 0=flee, 1=attack
    sociability: { min: -1, max: 1 },    // -1=repel, 0=neutral, 1=attract

    // Metabolism
    metabolism: { min: 0.5, max: 2 },    // Energy consumption multiplier
    efficiency: { min: 0.5, max: 1.5 },  // Energy extraction multiplier
    fertility: { min: 0.1, max: 1 },     // Reproduction readiness rate
    longevity: { min: 30, max: 120 },    // Max age in seconds
}

/**
 * Create a random genome with all genes between 0 and 1
 */
export function createRandomGenome(): Genome {
    return {
        shape: Math.random(),
        size: Math.random(),
        hue: Math.random(),
        luminosity: Math.random(),
        pattern: Math.random(),
        speed: Math.random(),
        agility: Math.random(),
        perception: Math.random(),
        aggression: Math.random(),
        sociability: Math.random(),
        metabolism: Math.random(),
        efficiency: Math.random(),
        fertility: Math.random(),
        longevity: Math.random(),
    }
}

/**
 * Create a genome with specific tendencies for a creature type
 */
export function createGenomeForType(type: 'herbivore' | 'predator'): Genome {
    const base = createRandomGenome()

    if (type === 'herbivore') {
        // Herbivores: smaller, faster turn, lower aggression, more social
        return {
            ...base,
            size: randomInRange(0.2, 0.5),
            agility: randomInRange(0.5, 0.9),
            aggression: randomInRange(0, 0.3),
            sociability: randomInRange(0.3, 0.8),
            perception: randomInRange(0.4, 0.8),
        }
    } else {
        // Predators: larger, faster, higher aggression, less social
        return {
            ...base,
            size: randomInRange(0.5, 0.9),
            speed: randomInRange(0.5, 0.9),
            aggression: randomInRange(0.6, 1),
            sociability: randomInRange(-0.3, 0.3),
            perception: randomInRange(0.5, 0.9),
        }
    }
}

/**
 * Express a gene value (0-1) to its phenotype range
 */
export function expressGene(gene: keyof typeof GENE_RANGES, value: number): number {
    const range = GENE_RANGES[gene]
    return range.min + value * (range.max - range.min)
}

/**
 * Crossover two genomes to create offspring
 */
export function crossover(parent1: Genome, parent2: Genome): Genome {
    const child: Partial<Genome> = {}
    const genes = Object.keys(parent1) as (keyof Genome)[]

    for (const gene of genes) {
        // 50% chance from each parent, with slight blending
        if (Math.random() < 0.5) {
            // Take from parent 1 with small blend from parent 2
            child[gene] = parent1[gene] * 0.8 + parent2[gene] * 0.2
        } else {
            // Take from parent 2 with small blend from parent 1
            child[gene] = parent2[gene] * 0.8 + parent1[gene] * 0.2
        }
    }

    return child as Genome
}

/**
 * Mutate a genome with given mutation rate and strength
 */
export function mutate(genome: Genome, rate: number = 0.1, strength: number = 0.2): Genome {
    const mutated = { ...genome }
    const genes = Object.keys(genome) as (keyof Genome)[]

    for (const gene of genes) {
        if (Math.random() < rate) {
            // Apply mutation
            const mutation = (Math.random() - 0.5) * 2 * strength
            mutated[gene] = Math.max(0, Math.min(1, mutated[gene] + mutation))
        }
    }

    return mutated
}

/**
 * Calculate genetic distance between two genomes
 */
export function geneticDistance(g1: Genome, g2: Genome): number {
    const genes = Object.keys(g1) as (keyof Genome)[]
    let sum = 0

    for (const gene of genes) {
        const diff = g1[gene] - g2[gene]
        sum += diff * diff
    }

    return Math.sqrt(sum / genes.length)
}

/**
 * Create a child from two parents with crossover and mutation
 */
export function reproduce(parent1: Genome, parent2: Genome, mutationRate: number = 0.1): Genome {
    const child = crossover(parent1, parent2)
    return mutate(child, mutationRate)
}
