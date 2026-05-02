import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Swords, Coins, Heart, Zap, Wind, Anchor, ChevronDown } from 'lucide-react';
import { useLooterGame, isLooterAtFortress } from '../../../looter-game/LooterGameContext';
import { getBagBonuses, MAX_GRID_W, MAX_GRID_H, InventoryGrid, BAG_DEFAULTS } from '../../../looter-game/backpack';
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
  readOnly?: boolean;
}

const BackpackView: React.FC<BackpackViewProps> = ({ onEnterWorld, readOnly = false }) => {
  const { state, saveInventory, openFortressStorage, draggingItem, equipBag, showNotification, pickupItem, dropItems } = useLooterGame();
  const [isHoveringBagSlot, setIsHoveringBagSlot] = useState(false);

  const activeBag = Array.isArray(state.bags) ? state.bags[0] : undefined;
  const bagStats = getBagBonuses(activeBag);

  const cellSize = Math.min(42, (window.innerWidth - 10) / MAX_GRID_W);



  const memoizedSaveInventory = React.useCallback((newItems: LooterItem[]) => {
    saveInventory(newItems);
  }, [saveInventory]);

  const isItemInsideBag = useCallback((item: LooterItem, bag: BagItem) => {
    const w = item.gridW || 1;
    const h = item.gridH || 1;
    const shape = item.shape;
    
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (!shape || shape[r][c]) {
          const bx = item.gridX + c - bag.gridX;
          const by = item.gridY + r - bag.gridY;
          if (bx < 0 || by < 0 || bx >= bag.width || by >= bag.height || !bag.shape[by][bx]) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  const totalStats = useMemo(() => {
    if (!activeBag) return { hp: 0, weight: 0, energyMax: 0, regen: 0 };
    
    return state.inventory.filter((item) => item.gridX >= 0 && isItemInsideBag(item, activeBag)).reduce(
      (acc, item) => ({
        hp: acc.hp + (item.hpBonus || 0),
        weight: acc.weight + (item.weight || 0),
        energyMax: acc.energyMax + (item.energyMax || 0),
        regen: acc.regen + (item.energyRegen || 0),
      }),
      { hp: bagStats.hp, weight: bagStats.weight, energyMax: bagStats.energyMax, regen: bagStats.regen }
    );
  }, [state.inventory, activeBag, bagStats, isItemInsideBag]);

  const dynamicGridH = useMemo(() => {
    const headerHeight = 48;
    const bottomNavHeight = window.innerWidth < 768 ? 96 : 0; 
    const availableHeight = window.innerHeight - headerHeight - bottomNavHeight;
    return Math.max(MAX_GRID_H, Math.floor(availableHeight / cellSize));
  }, [cellSize]);

  const lastPosRef = useRef({ lat: state.currentLat, lng: state.currentLng });

  useEffect(() => {
    if (state.currentLat === null || state.currentLng === null) return;
    
    const hasMoved = state.currentLat !== lastPosRef.current.lat || state.currentLng !== lastPosRef.current.lng;
    
    if (hasMoved && activeBag) {
      const itemsOutside = state.inventory.filter(item => 
        item.gridX >= 0 && !isItemInsideBag(item, activeBag)
      );
      
      if (itemsOutside.length > 0) {
        console.log(`[Looter] Boat moved, dropping ${itemsOutside.length} items outside bag`);
        const uids = itemsOutside.map(i => i.uid);
        dropItems(uids, state.currentLat, state.currentLng);
      }
    }
    
    lastPosRef.current = { lat: state.currentLat, lng: state.currentLng };
  }, [state.currentLat, state.currentLng, state.inventory, activeBag, dropItems, isItemInsideBag]);

  return (
    <div className="flex h-full flex-col overflow-hidden text-white relative bg-[#040911] pb-24 md:pb-0">
      {/* Header Area - Horizontal Stats */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 backdrop-blur-md border-b border-white/5 z-[100] relative">
        <div className="flex items-center gap-4">
          {/* Gold */}
          <div className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[12px] font-black text-amber-400">{(state.looterGold || 0).toLocaleString()}</span>
          </div>
          
          {/* HP */}
          <div className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-red-500" />
            <span className="text-[12px] font-black">{state.currentHp}</span>
          </div>
 
          {/* Energy */}
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[12px] font-black">{state.energyMax + totalStats.energyMax}</span>
          </div>
        </div>
 
        <div className="flex items-center gap-4">
          {/* Speed */}
          <div className="flex items-center gap-1.5">
            <Wind className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[12px] font-black">{state.moveSpeed}x</span>
          </div>
 
          {/* Weight/DMG */}
          <div className="flex items-center gap-1.5">
            <Swords className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[12px] font-black">{totalStats.weight}</span>
          </div>
 
          {/* Bag Slot - Integrated in Header */}
          <div 
            className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all hover:scale-110 ${BAG_SLOT_RARITY[activeBag?.rarity || 'common'] || BAG_SLOT_RARITY.common}`}
            title={formatBagTooltip(activeBag)}
          >
             <span className="text-lg leading-none">{activeBag?.icon || '🎒'}</span>
          </div>
        </div>
 
        {/* Collapse Button - Part of header now */}
        <button 
          onClick={() => (window as any).collapseLooterTab?.()}
          className="ml-2 p-1 text-white/40 hover:text-white transition-colors"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
 
      {/* Main Grid Area - Full Tab */}
      <div className="flex-1 relative overflow-hidden subtle-scrollbar">
        <div className="w-full h-full">
          <InventoryGrid
            items={state.inventory}
            bags={state.bags}
            readOnly={readOnly}
            onItemLayoutChange={readOnly ? undefined : memoizedSaveInventory}
            onItemDoubleClick={(item) => {
              if ((item as any).type === 'bag') {
                equipBag(item.uid);
              }
            }}
            onDropOutside={(item) => {
              if (state.currentLat && state.currentLng) {
                dropItems([item.uid], state.currentLat, state.currentLng);
              }
            }}
            cellSize={cellSize}
            gridW={MAX_GRID_W}
            gridH={dynamicGridH}
          />
        </div>
      </div>


    </div>
  );
};

export default BackpackView;
