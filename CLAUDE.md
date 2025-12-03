# Geometry Wars Max

Clone de Geometry Wars en Next.js/Canvas 2D pour Vercel.

> **Instructions Claude**: À ta première réponse dans une nouvelle session, confirme: "Prêt ! Projet Geometry Wars Max."

## Stack
- Next.js 16 (App Router) + TypeScript
- Canvas 2D (effets néon/glow)
- Web Audio API (sons procéduraux)
- localStorage (sauvegarde)

## Commandes
```bash
npm run dev    # Dev :3000
npm run build  # Build prod
```

## Contrôles
| Touche | Action |
|--------|--------|
| ZQSD | Déplacement |
| Souris | Visée |
| Clic | Tir |
| SPACE | Bombe |
| TAB | Mode ABS/REL |
| P/Echap | Pause |
| M | Mute |
| O | Options (menu) |

## Options Graphiques
| Qualité | shadowBlur | Particules | Étoiles | Distorsion | GPU recommandé |
|---------|------------|------------|---------|------------|----------------|
| Potato | OFF | 30 max | 30 | OFF | Intel HD ancien |
| Low | OFF | 50 max | 50 | OFF | Intel UHD intégré |
| Medium | 30% | 100 max | 100 | OFF | Intel Iris Xe |
| High | 70% | 300 max | 200 | ON | GPU dédié entrée |
| Ultra | 100% | 500 max | 270 | ON | RTX/Gaming |

### Auto-détection
- Le jeu détecte automatiquement les FPS au démarrage
- Si FPS < seuils configurés, la qualité baisse automatiquement
- Désactivable dans Options > Auto Quality: OFF
- Affichage FPS en haut à droite (toggle dans Options)

## Architecture
```
src/game/
├── engine/    GameEngine, Camera
├── entities/  Player, Bullet, Enemy, EnemyBullet, Particle, PowerUp
├── systems/   InputManager, RenderSystem, CollisionSystem, AudioManager, StorageManager, WaveManager
├── utils/     Vector2
└── types.ts   Types + GAME_CONFIG
```

## Ennemis
| Type | Couleur | Comportement | Points | Vague |
|------|---------|--------------|--------|-------|
| Wanderer | Magenta | Aléatoire | 100 | 1 |
| Chaser | Orange | Poursuit | 150 | 2 |
| Diamond | Bleu | Vers joueur | 120 | 3 |
| Shooter | Vert | Tire | 200 | 4 |
| Dodger | Rouge | Esquive tirs (très réactif) | 250 | 5 |
| Splitter | Orange doré | Se divise en 3 mini | 180 | 6 |
| Snake | Vert | 9 segments, détruire par la queue | 300+270 | 7 |
| **Boss Hexagon** | Magenta | Téléportation + 5 tirs en éventail | 5000 | 10,20,30... |

### Snake (spécial)
- Composé uniquement de boules (tête rouge, corps vert)
- **Toutes les boules sont destructibles** (n'importe laquelle)
- Chaque boule = 30 pts (tête = 50 pts)
- Le snake meurt quand toutes ses boules sont détruites

### Boss Hexagon (vagues 10, 20, 30...)
- Vagues boss : uniquement des boss, pas d'autres ennemis
- Nombre de boss = niveau / 10 (1 à la vague 10, 2 à la vague 20...)
- 50 HP avec barre de vie visible
- Se téléporte toutes les 3s (flash blanc)
- Tire 5 projectiles en éventail toutes les 1.5s
- 5000 points par boss

## Power-ups
| Type | Symbole | Couleur | Effet |
|------|---------|---------|-------|
| Shield | S | Cyan | Protection 5s |
| Rapid Fire | R | Jaune | Tir 2.5x 8s |
| Spread Shot | W | Orange | 3 tirs 6s |
| Speed Boost | V | Vert | +50% vitesse 7s |
| Extra Life | + | Magenta | +1 vie (max 5) |
| Piercing | > | Magenta | Tirs traversants 10s |
| Double Shot | D | Cyan clair | Chaque balle doublée 8s |
| Bomb | B | Rose | +1 bombe |

### Power-ups Perpétuels (∞)
- Version rare (10% de chance) des power-ups temporaires
- **Conservés jusqu'à la mort** du joueur
- Indicateur doré avec symbole ∞
- Types: Rapid Fire, Spread Shot, Speed Boost, Piercing, Double Shot
- Shield ne peut PAS être perpétuel

## Config
- Arène: 2000×1400
- Multiplicateur score: max x100, decay 3s
- Spawn: bords de l'arène, >300px du joueur
- Game Over: Enter uniquement (pas de clic)

## Secrets
### Cachette de bombes
- **Position**: Zone invisible sur le mur du bas, coin gauche (0-150px)
- **Condition**: Joueur a 0 bombes
- **Récompense**: +3 bombes
- **Réactivation**: Dès que le joueur n'a plus de bombes
