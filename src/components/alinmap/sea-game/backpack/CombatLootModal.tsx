import React, { useState } from 'react';
import { X, Sparkles, Package } from 'lucide-react';
import InventoryGrid from './InventoryGrid';
import { useSeaGame } from '../SeaGameProvider';
import type { SeaItem } from './types';

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-sky-100 border-sky-300',
  uncommon: 'bg-emerald-100 border-emerald-300',
  rare: 'bg-amber-100 border-amber-400',
  legendary: 'bg-purple-100 border-purple-400',
};

export default function CombatLootModal() {
  const { state, combatResult, setCombatResult, saveInventory, showNotification } = useSeaGame();
  
  // Local state for loot left on the ground
  const [lootLeft, setLootLeft] = useState<SeaItem[]>([]);

  // Sync lootLeft when combatResult changes
  React.useEffect(() => {
    if (combatResult?.loot) {
      setLootLeft(combatResult.loot);
    }
  }, [combatResult]);
  const [draggingLoot, setDraggingLoot] = useState<SeaItem | null>(null);

  if (!combatResult || combatResult.result !== 'win' || !combatResult.loot || combatResult.loot.length === 0) return null;

  const handleClose = () => {
    // Items left in lootLeft are permanently discarded
    setCombatResult(null);
  };

  const handleLootItem = async (item: SeaItem) => {
    // Auto place logic
    const activeBag = Array.isArray(state.bags) ? state.bags[0] : undefined;
    if (!activeBag || activeBag.gridX < 0) return;

    // 1. Build occupancy grid
    const gridH = 10, gridW = 10; // MAX_GRID from constants, assuming 10x10 is enough, or we can use activeBag.height/width
    const grid: boolean[][] = Array.from({ length: 15 }, () => Array(15).fill(false)); // Safe bound
    
    // Mark bag shape
    const shape = activeBag.shape || [];
    for (let r = 0; r < activeBag.height; r++) {
      for (let c = 0; c < activeBag.width; c++) {
        if (!shape[r] || !shape[r][c]) {
          grid[activeBag.gridY + r][activeBag.gridX + c] = true; // Mark as occupied (not in bag)
        }
      }
    }
    // Mark outside bag as occupied
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (r < activeBag.gridY || r >= activeBag.gridY + activeBag.height || 
            c < activeBag.gridX || c >= activeBag.gridX + activeBag.width) {
          grid[r][c] = true;
        }
      }
    }

    // Mark current items
    for (const invItem of state.inventory) {
      if (invItem.gridX < 0) continue;
      for (let r = invItem.gridY; r < invItem.gridY + invItem.gridH; r++) {
        for (let c = invItem.gridX; c < invItem.gridX + invItem.gridW; c++) {
          if (r < 15 && c < 15) grid[r][c] = true;
        }
      }
    }

    // 2. Find first spot
    let foundSpot = null;
    for (let r = activeBag.gridY; r < activeBag.gridY + activeBag.height; r++) {
      for (let c = activeBag.gridX; c < activeBag.gridX + activeBag.width; c++) {
        let canPlace = true;
        for (let ir = 0; ir < item.gridH; ir++) {
          for (let ic = 0; ic < item.gridW; ic++) {
            if (r + ir >= 15 || c + ic >= 15 || grid[r + ir][c + ic]) {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) break;
        }
        if (canPlace) {
          foundSpot = { x: c, y: r };
          break;
        }
      }
      if (foundSpot) break;
    }

    if (!foundSpot) {
      showNotification("Balo đã đầy, không thể nhặt thêm!", "error");
      return;
    }

    const newItem = { ...item, gridX: foundSpot.x, gridY: foundSpot.y };
    const newInventory = [...state.inventory, newItem];
    
    // Optimistic update
    state.inventory = newInventory;
    setLootLeft(prev => prev.filter(i => i.uid !== item.uid));
    
    // Save to backend
    await saveInventory(newInventory);
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-[#050b14]/90 backdrop-blur-sm p-2 pt-safe md:p-6 pb-[env(safe-area-inset-bottom)] pointer-events-auto">
      <div className="flex h-full w-full flex-col md:flex-row max-w-7xl mx-auto gap-2 md:gap-6 bg-[#0a1526]/80 rounded-3xl p-4 shadow-2xl border border-cyan-800/40 relative overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-cyan-900/30 to-transparent flex items-center justify-between px-4 z-10 border-b border-cyan-800/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-black tracking-wider text-cyan-50">Chiến Lợi Phẩm</h2>
          </div>
          <button onClick={handleClose} className="rounded-full bg-red-500/20 p-2 text-red-400 transition-colors hover:bg-red-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-full w-full flex-col md:flex-row gap-4 mt-12 overflow-hidden">
          {/* Top/Left: Loot Items */}
          <div className="flex flex-col h-[40%] md:h-full md:w-1/3 rounded-2xl border border-cyan-900/50 bg-[#08131d] p-3 overflow-hidden">
            <div className="mb-2 text-sm font-black uppercase tracking-wide text-cyan-300 flex justify-between items-center">
              <span>Đồ rơi ra</span>
              <span className="text-[10px] text-cyan-500">{lootLeft.length} món</span>
            </div>
            
            <div className="flex-1 overflow-y-auto content-start">
              {lootLeft.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-cyan-700/50">
                  <Package className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-xs font-bold">Không còn vật phẩm</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2">
                  {lootLeft.map((item) => (
                    <div
                      key={item.uid}
                      onClick={() => handleLootItem(item)}
                      className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform ${RARITY_COLORS[item.rarity] || 'bg-gray-800 border-gray-600'}`}
                      title={`Bấm để nhặt: ${item.name} (${item.gridW}x${item.gridH})`}
                    >
                      <span className="text-2xl drop-shadow-md pointer-events-none">{item.icon}</span>
                      <div className="absolute bottom-1 right-1 text-[9px] font-black bg-black/60 px-1 rounded pointer-events-none text-white">
                        {item.gridW}x{item.gridH}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={handleClose}
              className="mt-2 w-full py-3 bg-red-600/80 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95"
            >
              Đóng & Bỏ Lại ({lootLeft.length})
            </button>
          </div>

          {/* Bottom/Right: Inventory Grid */}
          <div className="flex flex-col h-[60%] md:h-full md:w-2/3 rounded-2xl border border-cyan-900/50 bg-[#08131d] p-3 overflow-hidden relative">
            <div className="mb-2 text-sm font-black uppercase tracking-wide text-cyan-300 flex justify-between items-center">
              <span>Balo Của Bạn</span>
              <span className="text-xs text-gray-400 capitalize normal-case">Bấm vào đồ rớt để nhặt</span>
            </div>
            <div className="flex-1 min-h-0 relative overflow-hidden rounded-xl border border-cyan-900/30 bg-[#0a1a2a]">
              <InventoryGrid
                items={state.inventory}
                bags={state.bags}
                onItemLayoutChange={(newItems) => saveInventory(newItems)}
                readOnly={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
