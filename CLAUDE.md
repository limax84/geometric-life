# Geometric Life

Simulation d'aquarium cyberpunk avec évolution génétique en Next.js/Canvas 2D.

> **Instructions Claude**: À ta première réponse dans une nouvelle session, confirme: "Prêt ! Projet Geometric Life."

## Concept

Un **aquarium vivant** où des créatures géométriques néon nagent, chassent, se reproduisent et évoluent. L'utilisateur observe l'écosystème depuis une vue "dieu" et peut influencer l'environnement sans contrôler directement les créatures.

### Caractéristiques principales
- **Contemplatif** : observation et paramétrage, pas de gameplay actif
- **Évolution génétique** : créatures avec génome qui évolue sur les générations
- **Écosystème** : chaîne alimentaire plancton → herbivores → prédateurs
- **Interactions godlike** : modifier l'environnement, déclencher des événements
- **Design** : cyberpunk aquarium néon, fullscreen adaptatif

## Stack
- Next.js 16 (App Router) + TypeScript
- Canvas 2D (effets néon/glow cyberpunk)
- localStorage (sauvegarde par slots)

## Commandes
```bash
npm run dev    # Dev :3000
npm run build  # Build prod
```

## Architecture
```
src/
├── app/                      # Next.js App Router
│   ├── globals.css           # Styles + thème cyberpunk
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── AquariumCanvas.tsx    # Canvas principal
│   └── UI/                   # Panneaux de contrôle
│
├── simulation/
│   ├── types.ts              # Types + CONFIG
│   ├── core/                 # Moteur simulation
│   │   ├── Simulation.ts
│   │   ├── World.ts
│   │   └── TimeManager.ts
│   ├── entities/             # Créatures
│   │   ├── Creature.ts
│   │   ├── Plankton.ts
│   │   ├── Herbivore.ts
│   │   ├── Predator.ts
│   │   └── Egg.ts
│   ├── genetics/             # Système génétique
│   │   ├── Genome.ts
│   │   ├── GeneExpression.ts
│   │   └── Reproduction.ts
│   ├── behaviors/            # Comportements IA
│   │   ├── Steering.ts
│   │   ├── Feeding.ts
│   │   └── Mating.ts
│   ├── systems/              # Systèmes ECS
│   │   ├── RenderSystem.ts
│   │   ├── PhysicsSystem.ts
│   │   └── LifecycleSystem.ts
│   └── utils/
│       ├── Vector2.ts
│       └── Color.ts
│
└── storage/
    └── SaveManager.ts
```

## Système Génétique

Chaque créature possède un génome (valeurs 0-1) encodant :

### Morphologie
| Gène | Effet |
|------|-------|
| `shape` | Nombre de côtés (3-8) |
| `size` | Taille de la créature |
| `hue` | Couleur de base (teinte) |
| `luminosity` | Intensité du glow |
| `pattern` | Motif (uni, rayé, pulsant) |

### Comportement
| Gène | Effet |
|------|-------|
| `speed` | Vitesse de nage max |
| `agility` | Capacité à tourner |
| `perception` | Rayon de détection |
| `aggression` | Tendance à chasser/fuir |
| `sociability` | Attirance vers congénères |

### Métabolisme
| Gène | Effet |
|------|-------|
| `metabolism` | Consommation d'énergie |
| `efficiency` | Extraction d'énergie |
| `fertility` | Fréquence reproduction |
| `longevity` | Durée de vie max |

## Chaîne Alimentaire

```
Plancton (vert) → Herbivores (cyan) → Prédateurs (magenta)
     ↑                   ↑                    ↑
  Spawn auto         Mangent plancton    Mangent herbivores
```

## Interactions Godlike

### Paramétrage
- Vitesse de simulation (x1, x2, x5, pause)
- Taux de spawn de nourriture
- Taux de mutation
- Température (affecte métabolisme)

### Interventions
- Placer de la nourriture (clic)
- Déclencher événements (tempête, abondance)
- Bénir/maudire une créature
- Sélectionner et suivre une créature

### Monitoring
- Population par espèce
- Énergie moyenne
- Distribution des gènes
- Arbre généalogique

## Palette de Couleurs

| Élément | Couleur | Hex |
|---------|---------|-----|
| Fond profond | Noir-bleu | `#0a0a1a` |
| Grille Tron | Cyan sombre | `#0d3d4d` |
| Plancton | Vert néon | `#00ff88` |
| Herbivores | Cyan | `#00ffff` |
| Prédateurs | Magenta | `#ff0066` |
| UI | Gris translucide | `rgba(20,30,40,0.8)` |
| Accent | Or | `#ffcc00` |

## Roadmap

### Phase 1 : Rendu Visuel ✅ TERMINÉ
- [x] Documentation projet
- [x] Nettoyage code Geometry Wars
- [x] Fond aquarium cyberpunk (dégradé profond)
- [x] Grille Tron avec glow
- [x] Effets caustiques (rayons ondulants)
- [x] Particules ambiantes flottantes
- [x] UI de base (FPS, contrôles)

### Phase 2 : Créatures & Génome ✅ TERMINÉ
- [x] Structure génome (Genome.ts)
- [x] Expression génétique → apparence/comportement
- [x] Classe Creature de base
- [x] Comportements de nage (steering behaviors)
- [x] Plankton (nourriture verte pulsante)
- [x] Herbivores (cyan, fuient les prédateurs, mangent plancton)
- [x] Predators (magenta, chassent les herbivores)
- [x] Intégration écosystème fonctionnel

### Phase 3 : Interface & Monitoring
- [ ] Panneau de contrôle
- [ ] Statistiques temps réel
- [ ] Sélection créature
- [ ] Sauvegarde/chargement

### Phase 4 : Évolution
- [ ] Reproduction
- [ ] Crossover + mutations
- [ ] Pression de sélection

## Contrôles (à définir)

| Action | Interaction |
|--------|-------------|
| Zoom | Molette |
| Pan | Clic droit + drag |
| Placer nourriture | Clic gauche |
| Sélectionner créature | Clic sur créature |
| Pause | Espace |
| Vitesse simulation | 1/2/3 |
