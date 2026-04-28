import React, { useEffect, useState } from 'react';
import { Package, Swords, Coins, Heart, Zap, Wind, Skull, Anchor, ShieldCheck } from 'lucide-react';
import { isSeaAtFortress, useSeaGame } from '../../../sea-game/SeaGameProvider';
import { getBagBonuses, MAX_GRID_W, InventoryGrid, BAG_DEFAULTS } from '../../../sea-game/backpack';
import type { SeaItem, BagItem } from '../../../sea-game/backpack';

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
  const { state, saveInventory, setWorldTier, openFortressStorage, isChallengeActive, draggingItem, acceptBagSwap, showNotification } = useSeaGame();
  const [tab, setTab] = useState<'inventory' | 'challenge'>('inventory');
  const [selectedTier, setSelectedTier] = useState(state.worldTier);
  const [isHoveringBagSlot, setIsHoveringBagSlot] = useState(false);
  const activeBag = Array.isArray(state.bags) ? state.bags[0] : undefined;
  const bagStats = getBagBonuses(activeBag);

  useEffect(() => {
    setSelectedTier(state.worldTier);
  }, [state.worldTier]);

  const memoizedSaveInventory = React.useCallback((newItems: SeaItem[]) => {
    saveInventory(newItems);
  }, [saveInventory]);

  useEffect(() => {
    // Chỉ tự động chuyển sang tab inventory nếu đang có item "lơ lửng" (chưa xếp vào grid)
    // và người dùng đang ở tab challenge (để họ thấy item mới nhặt)
    if (tab === 'challenge' && state.inventory.some(i => i.gridX < 0)) {
      setTab('inventory');
    }
  }, [state.inventory, tab]);

  const totalStats = state.inventory.filter((item) => item.gridX >= 0).reduce(
    (acc, item) => ({
      hp: acc.hp + (item.hpBonus || 0),
      weight: acc.weight + (item.weight || 0),
      energyMax: acc.energyMax + (item.energyMax || 0),
      regen: acc.regen + (item.energyRegen || 0),
    }),
    { hp: bagStats.hp, weight: bagStats.weight, energyMax: bagStats.energyMax, regen: bagStats.regen }
  );

  const isAtFortress = isSeaAtFortress(state);
  const selectedTierCost = TIER_LABELS.find((tier) => tier.tier === selectedTier)?.cost || 0;
  const hasEnoughGold = state.seaGold >= selectedTierCost;
  const isWorldEntryLocked = isChallengeActive || !isAtFortress;
  const canEnterWorld = !isWorldEntryLocked && hasEnoughGold;

  return (
    <div className="flex min-h-[600px] flex-col overflow-hidden rounded-3xl border border-cyan-900/50 bg-[#0a1929] text-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-cyan-800/30 bg-[#0d2137] px-4 py-3">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-black tracking-tight">Hom Do Bien Ca</h2>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-900/40 px-3 py-1">
            <Coins className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-300">{state.seaGold}</span>
          </div>
        </div>
      </div>

      <div className="subtle-scrollbar flex items-center gap-3 overflow-x-auto border-b border-cyan-800/20 bg-[#0d2137]/50 px-4 py-3">
        <div className="flex shrink-0 items-center gap-1"><Heart className="h-4 w-4 text-red-400" /><span className="text-sm font-bold">{state.currentHp}/{state.baseMaxHp + totalStats.hp}</span></div>
        <div className="flex shrink-0 items-center gap-1"><Zap className="h-4 w-4 text-blue-400" /><span className="text-sm font-bold">{state.energyMax + totalStats.energyMax}</span></div>
        <div className="flex shrink-0 items-center gap-1"><Wind className="h-4 w-4 text-emerald-400" /><span className="text-sm font-bold">{state.moveSpeed}x</span></div>
        <div className="flex shrink-0 items-center gap-1"><Swords className="h-4 w-4 text-orange-400" /><span className="text-sm font-bold">{totalStats.weight} DMG</span></div>
        <div className="flex shrink-0 items-center gap-1"><Skull className="h-4 w-4 text-purple-400" /><span className="text-sm font-bold">{Math.round(state.cursePercent)}%</span></div>
        {isAtFortress && (
          <div className="flex shrink-0 items-center gap-1 rounded border border-cyan-500/30 bg-cyan-900/40 px-2 py-0.5">
            <Anchor className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[10px] font-bold text-cyan-300">Thanh Tri</span>
          </div>
        )}
      </div>

      <div className="flex border-b border-cyan-800/30 bg-[#0a1929]">
        <button onClick={() => setTab('inventory')} className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'inventory' ? 'border-b-2 border-cyan-400 bg-cyan-900/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}>
          <Package className="mr-1.5 inline h-4 w-4" />Inventory
        </button>
        <button onClick={() => setTab('challenge')} className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'challenge' ? 'border-b-2 border-amber-400 bg-amber-900/20 text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}>
          <Swords className="mr-1.5 inline h-4 w-4" />Thu Thach
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#0a1929] to-[#040b12] px-4 py-4">
        {tab === 'inventory' && (
          <div className="flex flex-col items-center gap-1">
            <div 
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 px-4 py-1.5 transition-all ${isHoveringBagSlot ? 'border-cyan-400 bg-cyan-900/40 scale-[1.02]' : 'border-cyan-900/30 bg-[#08131d]'}`}
              onPointerEnter={() => {
                if (draggingItem && (BAG_DEFAULTS[draggingItem.id] || (draggingItem as any).type === 'bag')) {
                  setIsHoveringBagSlot(true);
                }
              }}
              onPointerLeave={() => setIsHoveringBagSlot(false)}
              onPointerUp={() => {
                if (isHoveringBagSlot && draggingItem) {
                  const bagData = BAG_DEFAULTS[draggingItem.id];
                  if (bagData) {
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
                      gridX: Math.floor((MAX_GRID_W - (bagData.width || 3)) / 2),
                      gridY: Math.floor((6 - (bagData.height || 3)) / 2), // Assuming MAX_GRID_H is 6
                      rotated: false,
                      shape: bagData.shape || Array.from({ length: bagData.height || 3 }, () => Array(bagData.width || 3).fill(true)),
                      width: bagData.width || 3,
                      height: bagData.height || 3,
                      type: 'bag'
                    };
                    acceptBagSwap(newBag);
                    showNotification(`Đã trang bị ${newBag.name}`, 'success');
                  }
                }
                setIsHoveringBagSlot(false);
              }}
            >
              <button
                type="button"
                title={formatBagTooltip(activeBag)}
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 shadow-inner transition-transform hover:scale-[1.04] ${BAG_SLOT_RARITY[activeBag?.rarity || 'common'] || BAG_SLOT_RARITY.common}`}
              >
                <span className="text-4xl leading-none">{activeBag?.icon || '🎒'}</span>
              </button>
            </div>

            <div className="grid w-full gap-3">
            {isAtFortress && (
              <button
                onClick={() => openFortressStorage('fortress')}
                className="w-full rounded-2xl border border-cyan-700/40 bg-gradient-to-r from-cyan-900/40 to-sky-900/20 px-3 py-2 text-left transition-all hover:border-cyan-500/60 hover:bg-cyan-900/40"
              >
                <div className="flex items-center gap-2">
                  <Anchor className="h-4 w-4 text-cyan-300" />
                  <div>
                    <p className="text-[11px] font-black text-cyan-200">Mở kho thành trì</p>
                    <p className="text-[9px] text-cyan-100/70">Kho có dung lượng gấp 4 lần balo.</p>
                  </div>
                </div>
              </button>
            )}
            </div>

            <div className="rounded-xl border border-cyan-900/20 bg-[#06111a] p-2 shadow-inner">
              <InventoryGrid
                items={state.inventory}
                bags={state.bags}
                onItemLayoutChange={memoizedSaveInventory}
                cellSize={Math.min(44, (window.innerWidth - 64) / MAX_GRID_W)}
              />
            </div>
          </div>
        )}

        {tab === 'challenge' && (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
            <div className="w-full">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-300">
                <ShieldCheck className="h-5 w-5" /> Chon The Gioi
              </h3>
              <p className="mb-6 rounded-lg border border-cyan-900/30 bg-[#0d2137] p-3 text-xs leading-relaxed text-gray-400">
                Chi phi vao the gioi cang cao, <strong className="text-cyan-300">trang bi nhan duoc</strong> va <strong className="text-red-400">chi so doi thu</strong> cang lon.
              </p>

              <div className="relative px-2">
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(Number(e.target.value))}
                  className="w-full cursor-pointer appearance-none rounded-full border border-cyan-800/50 bg-[#0d2137] outline-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(251,191,36,0.6)] [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110"
                  style={{
                    height: '12px',
                    background: `linear-gradient(90deg, rgba(251,191,36,0.95) 0%, rgba(251,191,36,0.95) ${(selectedTier / 5) * 100}%, rgba(13,33,55,1) ${(selectedTier / 5) * 100}%, rgba(13,33,55,1) 100%)`,
                  }}
                />
                <div className="mt-4 flex justify-between">
                  {TIER_LABELS.map((tier) => (
                    <div key={tier.tier} className={`flex flex-col items-center transition-colors ${selectedTier === tier.tier ? 'scale-110 text-amber-400' : 'text-gray-600'}`}>
                      <span className="text-sm font-black">{tier.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mt-8 overflow-hidden rounded-2xl border border-amber-900/50 bg-gradient-to-br from-[#1a0f08] to-[#0f172a] p-6 text-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60">Tier {selectedTier}</p>
                <p className="mb-2 text-3xl font-black text-transparent drop-shadow-sm bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text">
                  {TIER_LABELS.find((tier) => tier.tier === selectedTier)?.label || '0'} <span className="text-lg">Vang</span>
                </p>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/30 bg-amber-950/50 px-3 py-1">
                  <span className="text-[10px] font-bold uppercase text-gray-400">Multiplier</span>
                  <span className="text-sm font-black text-amber-400">x{TIER_MULTIPLIERS[selectedTier]}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!canEnterWorld) return;
                  setWorldTier(selectedTier);
                  onEnterWorld?.();
                }}
                disabled={!canEnterWorld}
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-black transition-all ${
                  canEnterWorld
                    ? 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 text-white shadow-[0_0_20px_rgba(217,119,6,0.4)] hover:from-amber-500 hover:via-orange-400 hover:to-amber-500 active:scale-[0.98]'
                    : 'cursor-not-allowed border border-gray-800 bg-[#1a2332] text-gray-600'
                }`}
                style={canEnterWorld ? { backgroundSize: '200% auto', animation: 'shine 3s linear infinite' } : {}}
              >
                <Swords className="h-5 w-5" />
                {isWorldEntryLocked ? 'DANG TRONG THE GIOI' : 'VAO THE GIOI'}
              </button>
              {isWorldEntryLocked && (
                <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs font-medium text-amber-300/80">
                  <Anchor className="h-4 w-4" /> Ve Thanh Tri de mo lai nut vao the gioi.
                </p>
              )}
              {!isWorldEntryLocked && !hasEnoughGold && (
                <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs font-medium text-red-400/80">
                  <span className="text-base">!</span> Ban can them {selectedTierCost - state.seaGold} vang
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackpackView;
