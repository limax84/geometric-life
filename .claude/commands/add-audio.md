Ajoute le son "$ARGUMENTS" au jeu.

1. Crée `src/game/systems/AudioManager.ts` si inexistant
2. Utilise HTMLAudioElement (simple, pas de lib externe)
3. Précharge les sons au démarrage
4. Ajoute le déclenchement dans GameEngine

Sons à implémenter:
- shoot: tir du joueur
- explosion: mort d'ennemi
- playerHit: joueur touché
- powerup: ramassage power-up
- gameOver: fin de partie

Format recommandé: .mp3 ou .ogg dans /public/sounds/
