# Geometric Life 🐟

Simulation d'aquarium cyberpunk avec évolution génétique.

![Geometric Life](screenshot.png)

## Concept

Un **aquarium vivant** où des créatures géométriques néon nagent, chassent, se reproduisent et évoluent. Observez l'écosystème depuis une vue "dieu" et influencez l'environnement sans contrôler directement les créatures.

## Fonctionnalités

### Écosystème
- 🌿 **Plankton** - Nourriture verte pulsante qui spawn automatiquement
- 🐠 **Herbivores** - Créatures cyan qui mangent le plancton et fuient les prédateurs
- 🦈 **Prédateurs** - Créatures magenta qui chassent les herbivores

### Système Génétique
Chaque créature possède un génome unique qui définit :
- **Morphologie** : forme (3-8 côtés), taille, couleur, luminosité
- **Comportement** : vitesse, agilité, perception, agressivité, sociabilité
- **Métabolisme** : consommation d'énergie, efficacité, fertilité, longévité

### Contrôles
| Action | Interaction |
|--------|-------------|
| Placer nourriture | Clic gauche |
| Pan (déplacer vue) | Clic droit + drag |
| Zoom | Molette souris |
| Pause | ESPACE |
| Vitesse x1/x2/x5 | 1 / 2 / 3 |
| Reset vue | R |

## Stack Technique

- **Framework** : Next.js 16 (App Router)
- **Langage** : TypeScript
- **Rendu** : Canvas 2D avec effets néon/glow
- **Style** : Cyberpunk aquarium, fullscreen adaptatif

## Installation

```bash
# Cloner le repo
git clone https://github.com/limax84/geometric-life.git
cd geometric-life

# Installer les dépendances
npm install

# Lancer en dev
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Roadmap

- [x] **Phase 1** : Rendu visuel aquarium cyberpunk
- [x] **Phase 2** : Créatures avec génome et comportements IA
- [ ] **Phase 3** : Interface de monitoring et contrôles avancés
- [ ] **Phase 4** : Reproduction et évolution génétique

## Licence

MIT
