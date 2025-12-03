// Système de détection des collisions

import { Vector2 } from '../types';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { Enemy } from '../entities/Enemy';
import { EnemyBullet } from '../entities/EnemyBullet';
import { PowerUp } from '../entities/PowerUp';
import { distance } from '../utils/Vector2';

export interface CollisionResult {
  bulletEnemyCollisions: Array<{ bullet: Bullet; enemy: Enemy }>;
  playerEnemyCollisions: Array<{ player: Player; enemy: Enemy }>;
  playerPowerUpCollisions: Array<{ player: Player; powerUp: PowerUp }>;
  playerEnemyBulletCollisions: Array<{ player: Player; bullet: EnemyBullet }>;
}

export class CollisionSystem {
  // Détection de collision cercle-cercle
  private checkCircleCollision(
    pos1: Vector2,
    radius1: number,
    pos2: Vector2,
    radius2: number
  ): boolean {
    const dist = distance(pos1, pos2);
    return dist < radius1 + radius2;
  }

  // Vérifier toutes les collisions
  checkCollisions(
    player: Player,
    bullets: Bullet[],
    enemies: Enemy[],
    powerUps: PowerUp[] = [],
    enemyBullets: EnemyBullet[] = []
  ): CollisionResult {
    const result: CollisionResult = {
      bulletEnemyCollisions: [],
      playerEnemyCollisions: [],
      playerPowerUpCollisions: [],
      playerEnemyBulletCollisions: [],
    };

    // Bullets vs Enemies
    for (const bullet of bullets) {
      if (!bullet.isAlive) continue;

      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;

        if (
          this.checkCircleCollision(
            bullet.getPosition(),
            bullet.getSize(),
            enemy.getPosition(),
            enemy.getSize()
          )
        ) {
          result.bulletEnemyCollisions.push({ bullet, enemy });
        }
      }
    }

    // Player vs Enemies
    if (player.isAlive) {
      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;

        if (
          this.checkCircleCollision(
            player.getPosition(),
            player.getSize() * 0.7, // Hitbox légèrement plus petite pour le joueur
            enemy.getPosition(),
            enemy.getSize()
          )
        ) {
          result.playerEnemyCollisions.push({ player, enemy });
        }
      }
    }

    // Player vs Power-ups
    if (player.isAlive) {
      for (const powerUp of powerUps) {
        if (!powerUp.isAlive) continue;

        if (
          this.checkCircleCollision(
            player.getPosition(),
            player.getSize(),
            powerUp.getPosition(),
            powerUp.getSize()
          )
        ) {
          result.playerPowerUpCollisions.push({ player, powerUp });
        }
      }
    }

    // Player vs Enemy Bullets
    if (player.isAlive) {
      for (const bullet of enemyBullets) {
        if (!bullet.isAlive) continue;

        if (
          this.checkCircleCollision(
            player.getPosition(),
            player.getSize() * 0.6, // Hitbox encore plus petite pour les projectiles
            bullet.getPosition(),
            bullet.getSize()
          )
        ) {
          result.playerEnemyBulletCollisions.push({ player, bullet });
        }
      }
    }

    return result;
  }

  // Méthode utilitaire pour vérifier une collision unique
  checkSingleCollision(
    pos1: Vector2,
    radius1: number,
    pos2: Vector2,
    radius2: number
  ): boolean {
    return this.checkCircleCollision(pos1, radius1, pos2, radius2);
  }
}
