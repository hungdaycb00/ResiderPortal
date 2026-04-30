import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Package, Swords, Coins, Heart, Zap, Wind, Skull, Anchor, ShieldCheck, ChevronDown } from 'lucide-react';
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
  const { state, saveInventory, openFortressStorage, isChallengeActive, draggingItem, equipBag, showNotification, draggingMapItem, setDraggingMapItem, pickupItem } = useLooterGame();
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
    <div className="flex h-full flex-col overflow-hidden text-white relative">
      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden subtle-scrollbar">
        {/* Collapse Button - Top Center */}
        <button 
          onClick={() => (window as any).collapseLooterTab?.()}
          className={`absolute ${isChallengeActive ? 'top-10' : 'top-1'} left-1/2 -translate-x-1/2 z-[70] p-1 text-white/40 hover:text-white transition-all pointer-events-auto`}
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        {/* Challenge Banner - Top Snap */}
        {isChallengeActive && (
          <div className="absolute top-0 left-0 right-0 z-[80] px-5 py-2.5 bg-amber-500/10 backdrop-blur-md border-b border-amber-500/20 flex items-center justify-center gap-2">
             <Swords className="w-3.5 h-3.5 text-amber-500" />
             <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Đang trong thử thách Tier {state.worldTier}</p>
          </div>
        )}

        {/* Left Floating Controls: Gold (Top), Bag (Bottom) - Transparent Style */}
        <div className="absolute inset-y-4 left-0 flex flex-col justify-between z-[60] pointer-events-none">
          {/* Gold - Icon & Text only */}
          <div className={`flex items-center gap-1.5 px-3 py-1 pointer-events-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-all ${isChallengeActive ? 'mt-8' : 'mt-0'}`}>
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-[13px] font-black text-amber-400">{(state.looterGold || 0).toLocaleString()}</span>
          </div>

          {/* Bag Slot - Floating at Bottom Left */}
          <div className="px-1.5 pb-20 pointer-events-auto">
            <div className={`relative h-12 w-12 rounded-2xl border-2 border-l-0 flex items-center justify-center shadow-[4px_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all hover:scale-110 ${BAG_SLOT_RARITY[activeBag?.rarity || 'common'] || BAG_SLOT_RARITY.common}`}>
               <span className="text-2xl leading-none">{activeBag?.icon || '🎒'}</span>
               <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-cyan-500 rounded-full border-2 border-[#121417] flex items-center justify-center">
                  <Anchor className="w-2.5 h-2.5 text-white" />
               </div>
            </div>
          </div>
        </div>

        {/* Right Floating Stats: Vertical column snapped to right edge - Transparent Style */}
        <div className={`absolute ${isChallengeActive ? 'top-12' : 'top-4'} right-0 flex flex-col gap-3 z-[60] pointer-events-none items-end pr-2 transition-all`}>
          <div className="flex items-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="text-[12px] font-black">{state.currentHp}</span>
            <Heart className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex items-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="text-[12px] font-black">{state.energyMax + totalStats.energyMax}</span>
            <Zap className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="text-[12px] font-black">{state.moveSpeed}x</span>
            <Wind className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="text-[12px] font-black">{totalStats.weight}</span>
            <Swords className="h-4 w-4 text-orange-500" />
          </div>
        </div>

        {/* Main Grid: Fills the whole space, no padding */}
        <div className="w-full h-full flex flex-col items-center justify-start">
          <div className="w-full h-full overflow-hidden">
            <InventoryGrid
              items={state.inventory}
              bags={state.bags}
              onItemLayoutChange={memoizedSaveInventory}
              onItemDoubleClick={(item) => {
                if ((item as any).type === 'bag') {
                  equipBag(item.uid);
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

      {/* Empty space to clear navigation bar */}
      <div className="h-20 shrink-0" />
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
