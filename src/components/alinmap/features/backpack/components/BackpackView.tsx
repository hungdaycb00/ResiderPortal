import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Package, Swords, Coins, Heart, Zap, Wind, Skull, Anchor, ShieldCheck } from 'lucide-react';
import { useLooterGame, isLooterAtFortress } from '../../../looter-game/LooterGameContext';
import { getBagBonuses, MAX_GRID_W, InventoryGrid, BAG_DEFAULTS } from '../../../looter-game/backpack';
import type { LooterItem, BagItem } from '../../../looter-game/backpack';

const TIER_LABELS = [
  { tier: 0, cost: 0, label: '0' },
  { tier: 1, cost: 10, label: '10' },
  { tier: 2, cost: 100, label: '100' },
  { tier: 3, cost: 1000, label: '1K' },
  { tier: 4, cost: 10000, label: '10K' },
  { tier: 5, cost: 100000, label: '100K' },
];

const TIER_MULTIPLIERS = [0.5, 1, 3, 8, 20, 50];

const BAG_SLOT_RARITY: Record<string, string> = {
  common: 'border-sky-500/40 bg-sky-950/20 text-sky-200',
  uncommon: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200',
  rare: 'border-amber-500/40 bg-amber-950/20 text-amber-200',
  legendary: 'border-fuchsia-500/40 bg-fuchsia-950/20 text-fuchsia-200',
};

const formatBagTooltip = (bag: any) =>
  `${bag?.name || 'Balo'}\n⚔ ${bag?.weight || 0} DMG | ❤ +${bag?.hpBonus || 0} HP\n⚡ +${bag?.energyMax || 0} EN | ✦ +${bag?.energyRegen || 0} Regen\n💰 ${bag?.price || 0} vang | ${(bag?.width || 3)}x${(bag?.height || 3)} | ${Math.max(9, bag?.cells || 9)} o`;

interface BackpackViewProps {
  onEnterWorld?: () => void;
}

const BackpackView: React.FC<BackpackViewProps> = ({ onEnterWorld }) => {
  const { state, saveInventory, openFortressStorage, isChallengeActive, draggingItem, acceptBagSwap, showNotification, draggingMapItem, setDraggingMapItem, pickupItem } = useLooterGame();
  const [isHoveringBagSlot, setIsHoveringBagSlot] = useState(false);
  const [externalHoverCell, setExternalHoverCell] = useState<{ x: number, y: number } | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0, clientX: 0, clientY: 0 });

  const activeBag = Array.isArray(state.bags) ? state.bags[0] : undefined;
  const bagStats = getBagBonuses(activeBag);

  const cellSize = Math.min(42, (window.innerWidth - 64) / MAX_GRID_W);

  useEffect(() => {
    if (!draggingMapItem) return;

    const handlePointerMove = (e: PointerEvent) => {
      setDragPos({ x: 0, y: 0, clientX: e.clientX, clientY: e.clientY });
    };

    const handlePointerUp = async (e: PointerEvent) => {
      if (externalHoverCell) {
        const success = await pickupItem(draggingMapItem.spawnId, externalHoverCell.x, externalHoverCell.y);
        if (success) {
           // Animation or sound here if needed
        }
      }
      setDraggingMapItem(null);
      setExternalHoverCell(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingMapItem, externalHoverCell, pickupItem, setDraggingMapItem]);

  const memoizedSaveInventory = React.useCallback((newItems: LooterItem[]) => {
    saveInventory(newItems);
  }, [saveInventory]);

  const totalStats = state.inventory.filter((item) => item.gridX >= 0).reduce(
    (acc, item) => ({
      hp: acc.hp + (item.hpBonus || 0),
      weight: acc.weight + (item.weight || 0),
      energyMax: acc.energyMax + (item.energyMax || 0),
      regen: acc.regen + (item.energyRegen || 0),
    }),
    { hp: bagStats.hp, weight: bagStats.weight, energyMax: bagStats.energyMax, regen: bagStats.regen }
  );

  const isAtFortress = isLooterAtFortress(state);

  return (
    <div className="flex h-full flex-col overflow-visible text-white relative">
      {/* Floating Stats Row: Outside/Top of the tab */}
      <div className="absolute -top-10 left-0 right-0 flex items-center justify-around px-2 py-1 pointer-events-none">
        <div className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5 text-red-500 drop-shadow-md" />
          <span className="text-[11px] font-black drop-shadow-md">{state.currentHp}</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-blue-500 drop-shadow-md" />
          <span className="text-[11px] font-black drop-shadow-md">{state.energyMax + totalStats.energyMax}</span>
        </div>
        <div className="flex items-center gap-1">
          <Wind className="h-3.5 w-3.5 text-emerald-500 drop-shadow-md" />
          <span className="text-[11px] font-black drop-shadow-md">{state.moveSpeed}x</span>
        </div>
        <div className="flex items-center gap-1">
          <Swords className="h-3.5 w-3.5 text-orange-500 drop-shadow-md" />
          <span className="text-[11px] font-black drop-shadow-md">{totalStats.weight}</span>
        </div>
        <div className="flex items-center gap-1">
          <Skull className="h-3.5 w-3.5 text-purple-500 drop-shadow-md" />
          <span className="text-[11px] font-black drop-shadow-md">{Math.round(state.cursePercent)}%</span>
        </div>
      </div>

      {/* Header with Gold & Bag */}
      <div className="px-4 py-2 bg-black/60 backdrop-blur-lg border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between">
          {/* Bag Slot (Now on the Left) */}
          <div className={`relative h-9 w-9 rounded-xl border-2 flex items-center justify-center shadow-xl transition-all hover:scale-110 ${BAG_SLOT_RARITY[activeBag?.rarity || 'common'] || BAG_SLOT_RARITY.common}`}>
             <span className="text-2xl leading-none">{activeBag?.icon || '🎒'}</span>
             <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-cyan-500 rounded-full border-2 border-black flex items-center justify-center">
                <Anchor className="w-2 h-2 text-white" />
             </div>
          </div>

          {/* Gold (Now on the Right) */}
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 shadow-lg">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-black text-amber-400 leading-none">{state.looterGold.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1 subtle-scrollbar">
        <div className="flex flex-col items-center gap-2">
          {/* Main Grid: Transparent background, minimal padding */}
          <div className="w-full">
            <InventoryGrid
              items={state.inventory}
              bags={state.bags}
              onItemLayoutChange={memoizedSaveInventory}
              onItemDoubleClick={(item) => {
                if ((item as any).type === 'bag') {
                  acceptBagSwap(item as any);
                  showNotification(`Đã đổi sang ${item.name}`, 'success');
                }
              }}
              cellSize={cellSize}
              externalDragItem={draggingMapItem ? { ...draggingMapItem.item, uid: draggingMapItem.spawnId } as any : null}
              externalDragOffset={{ x: cellSize / 2, y: cellSize / 2 }}
              externalHoverCell={externalHoverCell}
              onHoverCellChange={setExternalHoverCell}
            />
          </div>
        </div>
      </div>

      {/* Action Area (Optional) */}
      {isChallengeActive && (
        <div className="px-5 py-3 bg-amber-500/5 border-t border-amber-500/10 flex items-center justify-center gap-2">
           <Swords className="w-3 h-3 text-amber-500" />
           <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Dang trong thu thach Tier {state.worldTier}</p>
        </div>
      )}
      {draggingMapItem && createPortal(
        <div 
          className="fixed pointer-events-none z-[999999] opacity-90 scale-110 shadow-2xl" 
          style={{ 
            left: dragPos.clientX - cellSize / 2, 
            top: dragPos.clientY - cellSize / 2, 
            width: (draggingMapItem.item.gridW || 1) * cellSize, 
            height: (draggingMapItem.item.gridH || 1) * cellSize 
          }}
        >
          {Array.from({ length: draggingMapItem.item.gridH || 1 }).map((_, r) => Array.from({ length: draggingMapItem.item.gridW || 1 }).map((_, c) => (
            <div 
              key={`${r}-${c}`} 
              className="absolute border-2 rounded-lg flex items-center justify-center bg-cyan-500/10 border-cyan-500/30 text-cyan-400" 
              style={{ left: c * cellSize + 1, top: r * cellSize + 1, width: cellSize - 2, height: cellSize - 2 }}
            >
              {r === 0 && c === 0 && (
                <span className="text-3xl drop-shadow-2xl">{draggingMapItem.item.icon}</span>
              )}
            </div>
          )))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default BackpackView;
