import React, { useState } from 'react';
import { X, Sparkles, Package } from 'lucide-react';
import InventoryGrid from './InventoryGrid';
import { useLooterGame } from '../LooterGameContext';
import type { LooterItem } from './types';

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-sky-100 border-sky-300',
  uncommon: 'bg-emerald-100 border-emerald-300',
  rare: 'bg-amber-100 border-amber-400',
  legendary: 'bg-purple-100 border-purple-400',
};

export default function CombatLootModal() {
  const { state, combatResult, setCombatResult, saveInventory, showNotification } = useLooterGame();
  const [lootLeft, setLootLeft] = useState<LooterItem[]>([]);

  React.useEffect(() => {
    if (combatResult?.loot) {
      setLootLeft(combatResult.loot);
    }
  }, [combatResult]);

  if (!combatResult || combatResult.result !== 'win' || !combatResult.loot || combatResult.loot.length === 0) return null;

  const handleClose = () => {
    setCombatResult(null);
  };

  const handleLootItem = async (item: LooterItem) => {
    const activeBag = Array.isArray(state.bags) ? state.bags[0] : undefined;
    if (!activeBag || activeBag.gridX < 0) return;

    const grid: boolean[][] = Array.from({ length: 15 }, () => Array(15).fill(false));
    const shape = activeBag.shape || [];

    for (let r = 0; r < activeBag.height; r += 1) {
      for (let c = 0; c < activeBag.width; c += 1) {
        if (!shape[r] || !shape[r][c]) {
          grid[activeBag.gridY + r][activeBag.gridX + c] = true;
        }
      }
    }

    for (let r = 0; r < 15; r += 1) {
      for (let c = 0; c < 15; c += 1) {
        if (
          r < activeBag.gridY ||
          r >= activeBag.gridY + activeBag.height ||
          c < activeBag.gridX ||
          c >= activeBag.gridX + activeBag.width
        ) {
          grid[r][c] = true;
        }
      }
    }

    for (const invItem of state.inventory) {
      if (invItem.gridX < 0) continue;
      for (let r = invItem.gridY; r < invItem.gridY + invItem.gridH; r += 1) {
        for (let c = invItem.gridX; c < invItem.gridX + invItem.gridW; c += 1) {
          if (r < 15 && c < 15) grid[r][c] = true;
        }
      }
    }

    let foundSpot: { x: number; y: number } | null = null;
    for (let r = activeBag.gridY; r < activeBag.gridY + activeBag.height; r += 1) {
      for (let c = activeBag.gridX; c < activeBag.gridX + activeBag.width; c += 1) {
        let canPlace = true;
        for (let ir = 0; ir < item.gridH; ir += 1) {
          for (let ic = 0; ic < item.gridW; ic += 1) {
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
      showNotification('Balo đã đầy, không thể nhặt thêm!', 'error');
      return;
    }

    const newItem = { ...item, gridX: foundSpot.x, gridY: foundSpot.y };
    const newInventory = [...state.inventory, newItem];

    state.inventory = newInventory;
    setLootLeft((prev) => prev.filter((currentItem) => currentItem.uid !== item.uid));
    await saveInventory(newInventory);
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-[300] flex flex-col bg-[#050b14]/90 p-2 pb-[env(safe-area-inset-bottom)] pt-safe backdrop-blur-sm md:p-6">
      <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col gap-2 overflow-hidden rounded-3xl border border-cyan-800/40 bg-[#0a1526]/80 p-4 shadow-2xl md:flex-row md:gap-6">
        <div className="absolute left-0 top-0 z-10 flex h-12 w-full items-center justify-between border-b border-cyan-800/30 bg-gradient-to-b from-cyan-900/30 to-transparent px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            <h2 className="text-lg font-black tracking-wider text-cyan-50">Chiến Lợi Phẩm</h2>
          </div>
          <button onClick={handleClose} className="rounded-full bg-red-500/20 p-2 text-red-400 transition-colors hover:bg-red-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-12 flex h-full w-full flex-col gap-4 overflow-hidden md:flex-row">
          <div className="flex h-[40%] flex-col overflow-hidden rounded-2xl border border-cyan-900/50 bg-[#08131d] p-3 md:h-full md:w-1/3">
            <div className="mb-2 flex items-center justify-between text-sm font-black uppercase tracking-wide text-cyan-300">
              <span>Đồ Rơi Ra</span>
              <span className="text-[10px] text-cyan-500">{lootLeft.length} món</span>
            </div>

            <div className="content-start flex-1 overflow-y-auto">
              {lootLeft.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-cyan-700/50">
                  <Package className="mb-2 h-12 w-12 opacity-50" />
                  <p className="text-xs font-bold">Không còn vật phẩm</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-4">
                  {lootLeft.map((item) => (
                    <div
                      key={item.uid}
                      onClick={() => handleLootItem(item)}
                      className={`relative aspect-square cursor-pointer rounded-xl border-2 transition-transform hover:scale-105 ${RARITY_COLORS[item.rarity] || 'border-gray-600 bg-gray-800'} flex flex-col items-center justify-center`}
                      title={`Bấm để nhặt: ${item.name} (${item.gridW}x${item.gridH})`}
                    >
                      <span className="pointer-events-none text-2xl drop-shadow-md">{item.icon}</span>
                      <div className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] font-black text-white">
                        {item.gridW}x{item.gridH}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleClose}
              className="mt-2 w-full rounded-xl bg-red-600/80 py-3 font-bold text-white shadow-lg transition-all hover:bg-red-500 active:scale-95"
            >
              Đóng & Bỏ Lại ({lootLeft.length})
            </button>
          </div>

          <div className="relative flex h-[60%] flex-col overflow-hidden rounded-2xl border border-cyan-900/50 bg-[#08131d] p-3 md:h-full md:w-2/3">
            <div className="mb-2 flex items-center justify-between text-sm font-black uppercase tracking-wide text-cyan-300">
              <span>Balo Của Bạn</span>
              <span className="normal-case text-xs capitalize text-gray-400">Bấm vào đồ rớt để nhặt</span>
            </div>
            <div className="relative flex-1 overflow-hidden rounded-xl border border-cyan-900/30 bg-[#0a1a2a]">
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
