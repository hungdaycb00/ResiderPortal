import { useState, useEffect } from 'react';
import { generateSolvableGrid } from '../minigames/FruitGameLogic';
import { FRUITS } from '../minigames/FruitGame';

/**
 * Hook: Pre-generate minigame grids in background để giảm delay khi mở minigame.
 */
export function useLooterMinigamePregen(params: {
  isLooterGameMode: boolean;
  worldTier: number;
}) {
  const { isLooterGameMode, worldTier } = params;
  const [pregeneratedMinigames, setPregeneratedMinigames] = useState<{ fruit?: any }>({});

  const clearPregeneratedFruit = () => {
    setPregeneratedMinigames(prev => ({ ...prev, fruit: null }));
  };

  useEffect(() => {
    if (!isLooterGameMode) return;

    if (!pregeneratedMinigames.fruit) {
      const baseSize = 3 + worldTier;
      const rows = baseSize;
      const cols = (rows * rows) % 2 === 0 ? rows : rows + 1;
      const fruitCount = Math.min(16, 8 + worldTier);

      // Chạy ngầm để không block UI chính
      setTimeout(() => {
        const grid = generateSolvableGrid(rows, cols, fruitCount, FRUITS);
        if (grid && grid.length > 0) {
          setPregeneratedMinigames(prev => ({ ...prev, fruit: grid }));
        }
      }, 100);
    }
  }, [isLooterGameMode, worldTier, !!pregeneratedMinigames.fruit]);

  return { pregeneratedMinigames, clearPregeneratedFruit };
}
