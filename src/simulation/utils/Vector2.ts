// Vector2 utilities for the simulation

import { Vector2 } from '../types'

export function createVector(x: number = 0, y: number = 0): Vector2 {
  return { x, y }
}

export function addVectors(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function subtractVectors(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function multiplyVector(v: Vector2, scalar: number): Vector2 {
  return { x: v.x * scalar, y: v.y * scalar }
}

export function divideVector(v: Vector2, scalar: number): Vector2 {
  if (scalar === 0) return { x: 0, y: 0 }
  return { x: v.x / scalar, y: v.y / scalar }
}

export function magnitude(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

export function magnitudeSquared(v: Vector2): number {
  return v.x * v.x + v.y * v.y
}

export function normalize(v: Vector2): Vector2 {
  const mag = magnitude(v)
  if (mag === 0) return { x: 0, y: 0 }
  return { x: v.x / mag, y: v.y / mag }
}

export function distance(a: Vector2, b: Vector2): number {
  return magnitude(subtractVectors(a, b))
}

export function distanceSquared(a: Vector2, b: Vector2): number {
  return magnitudeSquared(subtractVectors(a, b))
}

export function dotProduct(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y
}

export function rotate(v: Vector2, angle: number): Vector2 {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  }
}

export function angleFromVector(v: Vector2): number {
  return Math.atan2(v.y, v.x)
}

export function vectorFromAngle(angle: number, length: number = 1): Vector2 {
  return {
    x: Math.cos(angle) * length,
    y: Math.sin(angle) * length,
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpVector(a: Vector2, b: Vector2, t: number): Vector2 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function clampVector(v: Vector2, maxMagnitude: number): Vector2 {
  const mag = magnitude(v)
  if (mag > maxMagnitude) {
    return multiplyVector(normalize(v), maxMagnitude)
  }
  return v
}

export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function randomVector(maxMagnitude: number = 1): Vector2 {
  const angle = Math.random() * Math.PI * 2
  const mag = Math.random() * maxMagnitude
  return vectorFromAngle(angle, mag)
}

export function randomPointInRect(x: number, y: number, width: number, height: number): Vector2 {
  return {
    x: x + Math.random() * width,
    y: y + Math.random() * height,
  }
}
