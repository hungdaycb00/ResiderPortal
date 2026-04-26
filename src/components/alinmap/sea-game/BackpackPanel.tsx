import React, { useState } from 'react';
import { X, Package, Swords, Coins, Heart, Zap, Wind, Skull, Anchor, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBagBonuses, useSeaGame, MAX_GRID_W } from './SeaGameProvider';
import InventoryGridV2 from './InventoryGridV2';

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
  common: 'border-sky-500/40 bg-sky-950/30 text-sky-200',
  uncommon: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200',
  rare: 'border-amber-500/40 bg-amber-950/30 text-amber-200',
  legendary: 'border-fuchsia-500/40 bg-fuchsia-950/30 text-fuchsia-200',
};

const BackpackPanel: React.FC = () => {
  const {
    state,
    isBackpackOpen,
    setIsBackpackOpen,
    stagingItem,
    setStagingItem,
    pendingBagSwap,
    setPendingBagSwap,
    acceptBagSwap,
    saveInventory,
    setWorldTier,
    showDiscardModal,
    setShowDiscardModal,
    confirmDiscard,
  } = useSeaGame();
  const [tab, setTab] = useState<'inventory' | 'challenge'>('inventory');
  const [selectedTier, setSelectedTier] = useState(state.worldTier);
  const activeBag = state.bags[0];
  const bagStats = getBagBonuses(activeBag);

  const hasFloatingItems = state.inventory.some((i) => i.gridX < 0) || !!stagingItem;

  const handleClose = () => {
    if (hasFloatingItems) {
      setShowDiscardModal(true);
    } else {
      setIsBackpackOpen(false);
    }
  };

  if (!isBackpackOpen) return null;

  const totalStats = state.inventory.filter((i) => i.gridX >= 0).reduce(
    (acc, item) => ({
      hp: acc.hp + (item.hpBonus || 0),
      weight: acc.weight + (item.weight || 0),
      energyMax: acc.energyMax + (item.energyMax || 0),
      regen: acc.regen + (item.energyRegen || 0),
    }),
    { hp: bagStats.hp, weight: bagStats.weight, energyMax: bagStats.energyMax, regen: bagStats.regen }
  );

  const isAtFortress = state.fortressLat != null && state.currentLat != null &&
    Math.abs(state.currentLat - state.fortressLat) * 111000 < 200 &&
    Math.abs((state.currentLng || 0) - (state.fortressLng || 0)) * 111000 < 200;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-0 z-[300] flex flex-col bg-[#0a1929] text-white"
      >
        <div className="flex items-center justify-between border-b border-cyan-800/30 bg-[#0d2137] px-4 py-3">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-black tracking-tight">Hom do bien ca</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-900/40 px-3 py-1">
              <Coins className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-300">{state.seaGold}</span>
            </div>
            <button onClick={handleClose} className="rounded-full p-1.5 transition-colors hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto border-b border-cyan-800/20 bg-[#0d2137]/50 px-4 py-2">
          <div className="flex shrink-0 items-center gap-1"><Heart className="h-3.5 w-3.5 text-red-400" /><span className="text-xs font-bold">{state.currentHp}/{state.baseMaxHp + totalStats.hp}</span></div>
          <div className="flex shrink-0 items-center gap-1"><Zap className="h-3.5 w-3.5 text-blue-400" /><span className="text-xs font-bold">{state.energyMax + totalStats.energyMax}</span></div>
          <div className="flex shrink-0 items-center gap-1"><Wind className="h-3.5 w-3.5 text-emerald-400" /><span className="text-xs font-bold">{state.moveSpeed}x</span></div>
          <div className="flex shrink-0 items-center gap-1"><Swords className="h-3.5 w-3.5 text-orange-400" /><span className="text-xs font-bold">{totalStats.weight} DMG</span></div>
          <div className="flex shrink-0 items-center gap-1"><Skull className="h-3.5 w-3.5 text-purple-400" /><span className="text-xs font-bold">{Math.round(state.cursePercent)}%</span></div>
          {isAtFortress && <div className="flex shrink-0 items-center gap-1"><Anchor className="h-3.5 w-3.5 text-cyan-400" /><span className="text-[10px] font-bold text-cyan-300">Thanh tri</span></div>}
        </div>

        <div className="flex border-b border-cyan-800/30">
          <button onClick={() => setTab('inventory')} className={`flex-1 py-2.5 text-sm font-bold transition-colors ${tab === 'inventory' ? 'border-b-2 border-cyan-400 bg-cyan-900/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}>
            <Package className="mr-1.5 inline h-4 w-4" />Inventory
          </button>
          <button onClick={() => setTab('challenge')} className={`flex-1 py-2.5 text-sm font-bold transition-colors ${tab === 'challenge' ? 'border-b-2 border-amber-400 bg-amber-900/20 text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}>
            <Swords className="mr-1.5 inline h-4 w-4" />Thu thach
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {tab === 'inventory' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-full rounded-xl border border-cyan-900/30 bg-cyan-950/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-cyan-500/80">
                Grid 7x6 • {Math.max(9, activeBag?.cells || 9)} o • {state.inventory.filter((i) => i.gridX >= 0).length} items
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-[132px_1fr]">
                <div className={`rounded-2xl border p-3 shadow-inner ${BAG_SLOT_RARITY[activeBag?.rarity || 'common'] || BAG_SLOT_RARITY.common}`}>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300/80">Slot balo</p>
                  <div className="flex min-h-[96px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-3 py-4 text-center">
                    <div className="mb-2 text-4xl leading-none">{activeBag?.icon || '🎒'}</div>
                    <p className="text-sm font-black">{activeBag?.name || 'Balo Co Ban'}</p>
                    <p className="mt-1 text-[11px] opacity-80">{activeBag?.width || 3}x{activeBag?.height || 3} • {Math.max(9, activeBag?.cells || 9)} o</p>
                    {activeBag?.dropProtected && (
                      <p className="mt-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-200">
                        Khong roi khi danh nhau
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 rounded-2xl border border-cyan-900/30 bg-[#08131d] p-3 text-xs text-cyan-100/80 sm:grid-cols-2">
                  <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/70">Chi so</p>
                    <p className="mt-1 font-bold">+{activeBag?.hpBonus || 0} HP • +{activeBag?.energyMax || 0} EN</p>
                  </div>
                  <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/70">Ho tro</p>
                    <p className="mt-1 font-bold">+{activeBag?.weight || 0} DMG • +{activeBag?.energyRegen || 0}% regen</p>
                  </div>
                  <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/70">Gia tri</p>
                    <p className="mt-1 font-bold">{activeBag?.price || 0} vang</p>
                  </div>
                  <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/70">Trang thai</p>
                    <p className="mt-1 font-bold">{activeBag?.isStarter ? 'Balo mac dinh 3x3' : 'Balo thay the'}</p>
                  </div>
                </div>
              </div>

              <InventoryGridV2
                items={state.inventory}
                bags={state.bags}
                onItemLayoutChange={(newItems) => saveInventory(newItems)}
                cellSize={Math.min(44, (window.innerWidth - 48) / MAX_GRID_W)}
              />
            </div>
          )}

          {tab === 'challenge' && (
            <div className="flex flex-col items-center gap-6">
              <div className="w-full">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-300">
                  <ShieldCheck className="h-4 w-4" /> Chon the gioi
                </h3>
                <p className="mb-4 text-[11px] text-gray-400">Vang cang cao thi item buff va doi thu cung manh hon.</p>

                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-amber-500"
                  />
                  <div className="mt-2 flex justify-between">
                    {TIER_LABELS.map((t) => (
                      <div key={t.tier} className={`flex flex-col items-center ${selectedTier === t.tier ? 'text-amber-400' : 'text-gray-500'}`}>
                        <span className="text-xs font-black">{t.label}</span>
                        <span className="text-[9px]">vang</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-amber-700/30 bg-amber-900/20 p-4 text-center">
                  <p className="text-2xl font-black text-amber-300">{TIER_LABELS.find((t) => t.tier === selectedTier)?.label || '0'} <span className="text-lg">Vang</span></p>
                  <p className="mt-1 text-xs text-gray-400">Chi phi vao the gioi Tier {selectedTier}</p>
                  <p className="mt-1 text-xs text-amber-400/70">Multiplier: x{TIER_MULTIPLIERS[selectedTier]}</p>
                </div>

                <button
                  onClick={() => setWorldTier(selectedTier)}
                  disabled={state.seaGold < (TIER_LABELS.find((t) => t.tier === selectedTier)?.cost || 0)}
                  className={`mt-4 w-full rounded-xl py-3 text-lg font-black transition-all ${
                    state.seaGold >= (TIER_LABELS.find((t) => t.tier === selectedTier)?.cost || 0)
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30 hover:from-amber-500 hover:to-orange-500 active:scale-95'
                      : 'cursor-not-allowed bg-gray-700 text-gray-500'
                  }`}
                >
                  Thu thach
                </button>
                {state.seaGold < (TIER_LABELS.find((t) => t.tier === selectedTier)?.cost || 0) && (
                  <p className="mt-2 text-center text-[10px] text-red-400">
                    Can them {(TIER_LABELS.find((t) => t.tier === selectedTier)?.cost || 0) - state.seaGold} vang
                  </p>
                )}
              </div>
            </div>
          )}

          {pendingBagSwap && (
            <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
              <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-cyan-500/50 bg-[#0a1929] p-6 text-center shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-900/40 text-4xl shadow-inner">
                  {pendingBagSwap.icon}
                </div>
                <h3 className="mb-2 text-xl font-black tracking-tight text-cyan-400">Doi balo moi?</h3>
                <p className="mb-6 text-sm font-medium text-cyan-100/80">
                  Ban nhat duoc <span className="font-bold text-white">{pendingBagSwap.name}</span> ({pendingBagSwap.width}x{pendingBagSwap.height} o).
                  <span className="mt-2 block text-[11px] text-amber-400/80">Vat pham nam ngoai balo moi se duoc dua vao khu cho.</span>
                </p>
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setPendingBagSwap(null)}
                    className="flex-1 rounded-xl border border-gray-600/50 bg-gray-800 py-3 font-bold text-gray-300 transition-colors hover:bg-gray-700"
                  >
                    Bo qua
                  </button>
                  <button
                    onClick={() => acceptBagSwap(pendingBagSwap)}
                    className="flex-1 rounded-xl bg-cyan-600 py-3 font-black text-white shadow-lg shadow-cyan-900/50 transition-all hover:bg-cyan-500"
                  >
                    Dong y
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {showDiscardModal && (
          <div className="fixed inset-0 z-[420] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-red-500/40 bg-[#0a1929] p-6 text-center">
              <h3 className="text-lg font-black text-red-300">Bo vat pham dang cho?</h3>
              <p className="mt-2 text-sm text-gray-300">Vat pham chua dat vao balo se bi xoa neu dong cua so nay.</p>
              <div className="mt-5 flex gap-3">
                <button onClick={() => setShowDiscardModal(false)} className="flex-1 rounded-xl bg-gray-800 py-3 font-bold text-gray-300 hover:bg-gray-700">
                  Quay lai
                </button>
                <button onClick={() => { setStagingItem(null); confirmDiscard(); }} className="flex-1 rounded-xl bg-red-600 py-3 font-black text-white hover:bg-red-500">
                  Xac nhan bo
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default BackpackPanel;
