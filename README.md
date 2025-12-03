# Geometry Wars Max

Clone du jeu Geometry Wars - Next.js + Canvas 2D, déployé sur Vercel.

![Status](https://img.shields.io/badge/status-playable-green)

## 🎮 Jouer

```bash
npm install
npm run dev
# Ouvrir http://localhost:3000
```

## 🕹️ Contrôles

| Touche | Action |
|--------|--------|
| ZQSD | Se déplacer |
| Souris | Viser |
| Clic | Tirer |
| SPACE | Utiliser une bombe |
| TAB | Changer mode de contrôle (ABS/REL) |
| P | Pause |

## ✨ Fonctionnalités

- **3 types d'ennemis** : Wanderer, Chaser, Shooter
- **6 power-ups** : Shield, Rapid Fire, Spread Shot, Speed Boost, Extra Life, Bomb
- **Système de vagues** avec difficulté progressive
- **Musique électro** générée procéduralement
- **Effets visuels** : néon, distorsion de grille, particules
- **Sauvegarde locale** : high scores, statistiques
- **2 modes de contrôle** : absolu (défaut) et relatif

## 🛠️ Stack

- Next.js 16 + TypeScript
- Canvas 2D (effets néon/glow)
- Web Audio API (sons et musique procéduraux)
- localStorage (persistance)
- Tailwind CSS
- Vercel (déploiement)

## 📁 Structure

```
src/
├── app/              # Next.js App Router
├── components/       # React (GameCanvas)
└── game/
    ├── engine/       # GameEngine, Camera
    ├── entities/     # Player, Bullet, Enemy, PowerUp, Particle
    ├── systems/      # Input, Render, Collision, Audio, Storage, Wave
    └── types.ts      # Config & types
```

## 📋 Roadmap

- [x] Phase 1: Fondations (moteur, caméra, inputs)
- [x] Phase 2: Gameplay (tir, ennemis, collisions, score)
- [x] Phase 3: Audio & polish (sons, musique, effets visuels)
- [x] Phase 4: Power-ups, menu, pause, bombes, scores
- [ ] Phase 5: Boss, nouveaux ennemis, effets avancés

## Licence

MIT
