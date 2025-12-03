Ajoute un nouveau type d'ennemi "$ARGUMENTS" au jeu.

1. Crée/modifie `src/game/entities/Enemy.ts` pour ajouter le nouveau type
2. Ajoute la couleur dans `COLORS` (types.ts)
3. Mets à jour le spawn dans `GameEngine.ts`
4. Documente le comportement de l'ennemi

Comportements types:
- Wanderer: mouvement aléatoire, rebondit
- Chaser: suit le joueur
- Shooter: tire des projectiles
- Splitter: se divise à la mort
