// Steering behaviors for creature AI

import { Vector2 } from '../types'
import {
    addVectors,
    clampVector,
    distance,
    magnitude,
    multiplyVector,
    normalize,
    subtractVectors,
    randomVector,
} from '../utils/Vector2'

/**
 * Seek: Steer towards a target position
 */
export function seek(
    position: Vector2,
    target: Vector2,
    velocity: Vector2,
    maxSpeed: number,
    maxForce: number
): Vector2 {
    const desired = subtractVectors(target, position)
    const desiredNorm = normalize(desired)
    const desiredVelocity = multiplyVector(desiredNorm, maxSpeed)
    const steering = subtractVectors(desiredVelocity, velocity)
    return clampVector(steering, maxForce)
}

/**
 * Flee: Steer away from a target position
 */
export function flee(
    position: Vector2,
    target: Vector2,
    velocity: Vector2,
    maxSpeed: number,
    maxForce: number
): Vector2 {
    const steering = seek(position, target, velocity, maxSpeed, maxForce)
    return multiplyVector(steering, -1)
}

/**
 * Arrive: Seek with slowing down near target
 */
export function arrive(
    position: Vector2,
    target: Vector2,
    velocity: Vector2,
    maxSpeed: number,
    maxForce: number,
    slowRadius: number
): Vector2 {
    const desired = subtractVectors(target, position)
    const dist = magnitude(desired)

    if (dist === 0) return { x: 0, y: 0 }

    let speed = maxSpeed
    if (dist < slowRadius) {
        speed = maxSpeed * (dist / slowRadius)
    }

    const desiredVelocity = multiplyVector(normalize(desired), speed)
    const steering = subtractVectors(desiredVelocity, velocity)
    return clampVector(steering, maxForce)
}

/**
 * Wander: Random wandering behavior for natural movement
 */
export function wander(
    velocity: Vector2,
    wanderAngle: number,
    wanderRadius: number,
    wanderDistance: number,
    wanderJitter: number,
    maxForce: number
): { steering: Vector2; newAngle: number } {
    // Add small random jitter to wander angle
    const newAngle = wanderAngle + (Math.random() - 0.5) * wanderJitter

    // Calculate wander target on a circle ahead of creature
    const wanderTarget = {
        x: Math.cos(newAngle) * wanderRadius,
        y: Math.sin(newAngle) * wanderRadius,
    }

    // Project circle in front of creature
    const ahead = normalize(velocity)
    const circleCenter = multiplyVector(ahead, wanderDistance)

    // Steering is toward the wander target
    const steering = addVectors(circleCenter, wanderTarget)

    return {
        steering: clampVector(steering, maxForce),
        newAngle,
    }
}

/**
 * Separate: Avoid crowding nearby creatures
 */
export function separate(
    position: Vector2,
    neighbors: Vector2[],
    separationRadius: number,
    maxForce: number
): Vector2 {
    const steering = { x: 0, y: 0 }
    let count = 0

    for (const neighbor of neighbors) {
        const dist = distance(position, neighbor)

        if (dist > 0 && dist < separationRadius) {
            // Point away from neighbor
            const diff = subtractVectors(position, neighbor)
            const diffNorm = normalize(diff)
            // Weight by distance (closer = stronger)
            const weighted = multiplyVector(diffNorm, 1 / dist)
            steering.x += weighted.x
            steering.y += weighted.y
            count++
        }
    }

    if (count > 0) {
        steering.x /= count
        steering.y /= count
        return clampVector(normalize(steering), maxForce)
    }

    return steering
}

/**
 * Align: Match velocity with nearby creatures
 */
export function align(
    velocity: Vector2,
    neighborVelocities: Vector2[],
    maxSpeed: number,
    maxForce: number
): Vector2 {
    if (neighborVelocities.length === 0) return { x: 0, y: 0 }

    const avgVelocity = { x: 0, y: 0 }

    for (const v of neighborVelocities) {
        avgVelocity.x += v.x
        avgVelocity.y += v.y
    }

    avgVelocity.x /= neighborVelocities.length
    avgVelocity.y /= neighborVelocities.length

    const desired = multiplyVector(normalize(avgVelocity), maxSpeed)
    const steering = subtractVectors(desired, velocity)
    return clampVector(steering, maxForce)
}

/**
 * Cohesion: Steer toward average position of nearby creatures
 */
export function cohesion(
    position: Vector2,
    neighborPositions: Vector2[],
    velocity: Vector2,
    maxSpeed: number,
    maxForce: number
): Vector2 {
    if (neighborPositions.length === 0) return { x: 0, y: 0 }

    const center = { x: 0, y: 0 }

    for (const p of neighborPositions) {
        center.x += p.x
        center.y += p.y
    }

    center.x /= neighborPositions.length
    center.y /= neighborPositions.length

    return seek(position, center, velocity, maxSpeed, maxForce)
}

/**
 * Stay within bounds
 */
export function stayInBounds(
    position: Vector2,
    velocity: Vector2,
    bounds: { x: number; y: number; width: number; height: number },
    margin: number,
    maxForce: number
): Vector2 {
    const steering = { x: 0, y: 0 }
    const maxSpeed = magnitude(velocity) || 50

    // Check each boundary
    if (position.x < bounds.x + margin) {
        steering.x = maxSpeed - velocity.x
    } else if (position.x > bounds.x + bounds.width - margin) {
        steering.x = -maxSpeed - velocity.x
    }

    if (position.y < bounds.y + margin) {
        steering.y = maxSpeed - velocity.y
    } else if (position.y > bounds.y + bounds.height - margin) {
        steering.y = -maxSpeed - velocity.y
    }

    return clampVector(steering, maxForce)
}

/**
 * Pursue: Predict target's future position and seek it
 */
export function pursue(
    position: Vector2,
    velocity: Vector2,
    targetPosition: Vector2,
    targetVelocity: Vector2,
    maxSpeed: number,
    maxForce: number
): Vector2 {
    // Predict where target will be
    const dist = distance(position, targetPosition)
    const prediction = dist / maxSpeed // Time to reach

    const futurePos = {
        x: targetPosition.x + targetVelocity.x * prediction,
        y: targetPosition.y + targetVelocity.y * prediction,
    }

    return seek(position, futurePos, velocity, maxSpeed, maxForce)
}

/**
 * Evade: Flee from predicted position of pursuer
 */
export function evade(
    position: Vector2,
    velocity: Vector2,
    threatPosition: Vector2,
    threatVelocity: Vector2,
    maxSpeed: number,
    maxForce: number
): Vector2 {
    const steering = pursue(position, velocity, threatPosition, threatVelocity, maxSpeed, maxForce)
    return multiplyVector(steering, -1)
}
