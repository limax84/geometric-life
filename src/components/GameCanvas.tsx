'use client';

import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/game/engine/GameEngine';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Définir la taille du canvas
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (engineRef.current) {
        engineRef.current.resize(canvas.width, canvas.height);
      }
    };

    updateSize();

    // Créer et démarrer le moteur de jeu
    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.start().then(() => {
      setIsLoaded(true);
    });

    // Gérer le redimensionnement
    window.addEventListener('resize', updateSize);

    // Mettre en pause quand l'onglet perd le focus
    const handleVisibilityChange = () => {
      if (document.hidden && engineRef.current) {
        engineRef.current.autoPause();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateSize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="block cursor-crosshair"
        style={{ touchAction: 'none' }}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-cyan-400 text-2xl font-mono">
          Loading...
        </div>
      )}
    </div>
  );
}
