import React, { useEffect, useState } from 'react';
import { Package, Swords, Coins, Heart, Zap, Wind, Skull, Anchor, ShieldCheck } from 'lucide-react';
import { isLooterAtFortress, useLooterGame } from '../../../looter-game/LooterGameProvider';
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
  const { state, saveInventory, openFortressStorage, isChallengeActive, draggingItem, acceptBagSwap, showNotification } = useLooterGame();
  const [isHoveringBagSlot, setIsHoveringBagSlot] = useState(false);
  const activeBag = Array.isArray(state.bags) ? state.bags[0] : undefined;
  const bagStats = getBagBonuses(activeBag);

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
    <div className="flex h-full flex-col overflow-hidden rounded-[32px] border border-cyan-900/40 bg-[#060d17]/95 backdrop-blur-xl text-white shadow-2xl shadow-black/50">
      {/* Header with Stats integrated */}
      <div className="border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
              <Package className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white leading-tight uppercase tracking-widest">Kho Đồ</h2>
              <p className="text-[10px] font-bold text-gray-500">Looter Inventory</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5">
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-black text-amber-400 leading-none">{state.looterGold.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          <div className="flex flex-col items-center p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <Heart className="h-3 w-3 text-red-500 mb-1" />
            <span className="text-[10px] font-black">{state.currentHp}</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <Zap className="h-3 w-3 text-blue-500 mb-1" />
            <span className="text-[10px] font-black">{state.energyMax + totalStats.energyMax}</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <Wind className="h-3 w-3 text-emerald-500 mb-1" />
            <span className="text-[10px] font-black">{state.moveSpeed}x</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <Swords className="h-3 w-3 text-orange-500 mb-1" />
            <span className="text-[10px] font-black">{totalStats.weight}</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <Skull className="h-3 w-3 text-purple-500 mb-1" />
            <span className="text-[10px] font-black">{Math.round(state.cursePercent)}%</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 subtle-scrollbar">
        <div className="flex flex-col items-center gap-4">
          {/* Bag Slot */}
          <div 
            className={`flex w-full items-center justify-center gap-4 rounded-2xl border-2 px-4 py-3 transition-all ${isHoveringBagSlot ? 'border-cyan-400 bg-cyan-900/40 scale-[1.02]' : 'border-white/5 bg-white/[0.02]'}`}
            onPointerEnter={() => {
              if (draggingItem && (BAG_DEFAULTS[draggingItem.id] || (draggingItem as any).type === 'bag')) {
                setIsHoveringBagSlot(true);
              }
            }}
            onPointerLeave={() => setIsHoveringBagSlot(false)}
            onPointerUp={() => {
              if (isHoveringBagSlot && draggingItem) {
                const itemAsBag = draggingItem as any;
                const bagData = BAG_DEFAULTS[draggingItem.id];
                
                if (itemAsBag.type === 'bag' || bagData) {
                  const width = itemAsBag.width || bagData?.width || 3;
                  const height = itemAsBag.height || bagData?.height || 3;
                  const newBag: BagItem = {
                    uid: draggingItem.uid,
                    id: draggingItem.id,
                    name: draggingItem.name,
                    icon: draggingItem.icon,
                    rarity: draggingItem.rarity,
                    price: draggingItem.price,
                    weight: draggingItem.weight,
                    hpBonus: draggingItem.hpBonus,
                    energyMax: draggingItem.energyMax,
                    energyRegen: draggingItem.energyRegen,
                    gridX: Math.floor((MAX_GRID_W - width) / 2),
                    gridY: Math.floor((6 - height) / 2),
                    rotated: false,
                    shape: itemAsBag.shape || bagData?.shape || Array.from({ length: height }, () => Array(width).fill(true)),
                    width: width,
                    height: height,
                    type: 'bag'
                  };
                  acceptBagSwap(newBag);
                  showNotification(`Đã trang bị ${newBag.name}`, 'success');
                }
              }
              setIsHoveringBagSlot(false);
            }}
          >
            <div className={`relative h-14 w-14 rounded-2xl border-2 flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${BAG_SLOT_RARITY[activeBag?.rarity || 'common'] || BAG_SLOT_RARITY.common}`}>
               <span className="text-3xl leading-none">{activeBag?.icon || '🎒'}</span>
               <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full border-2 border-[#060d17] flex items-center justify-center">
                  <Anchor className="w-2.5 h-2.5 text-white" />
               </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-black text-white uppercase">{activeBag?.name || 'Balo Co Ban'}</h3>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{activeBag?.rarity || 'common'} | {activeBag?.cells || 9} O TRONG</p>
            </div>
          </div>

          {/* Main Grid */}
          <div className="w-full rounded-[24px] border border-white/5 bg-black/20 p-2 shadow-inner">
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
              cellSize={Math.min(42, (window.innerWidth - 64) / MAX_GRID_W)}
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
    </div>
  );
};

export default BackpackView;
