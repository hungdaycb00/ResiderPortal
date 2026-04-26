import React, { useEffect, useState } from 'react';
import { Package, Swords, Coins, Heart, Zap, Wind, Skull, Anchor, ShieldCheck, Sparkles } from 'lucide-react';
import { useSeaGame } from '../sea-game/SeaGameProvider';
import { MAX_GRID_W } from '../sea-game/SeaGameProvider';
import InventoryGridV2 from '../sea-game/InventoryGridV2';

const TIER_LABELS = [
  { tier: 0, cost: 0, label: '0' },
  { tier: 1, cost: 10, label: '10' },
  { tier: 2, cost: 100, label: '100' },
  { tier: 3, cost: 1000, label: '1K' },
  { tier: 4, cost: 10000, label: '10K' },
  { tier: 5, cost: 100000, label: '100K' },
];

const TIER_MULTIPLIERS = [0.5, 1, 3, 8, 20, 50];

const BackpackView: React.FC = () => {
  const { state, saveInventory, setWorldTier, upgradeBag, openFortressStorage } = useSeaGame();
  const [tab, setTab] = useState<'inventory' | 'challenge'>('inventory');
  const [selectedTier, setSelectedTier] = useState(state.worldTier);

  useEffect(() => {
    setSelectedTier(state.worldTier);
  }, [state.worldTier]);

  const totalStats = state.inventory.filter((item) => item.gridX >= 0).reduce(
    (acc, item) => ({
      hp: acc.hp + (item.hpBonus || 0),
      weight: acc.weight + (item.weight || 0),
      energyMax: acc.energyMax + (item.energyMax || 0),
      regen: acc.regen + (item.energyRegen || 0),
    }),
    { hp: 0, weight: 0, energyMax: 0, regen: 0 }
  );

  const isAtFortress = state.fortressLat != null && state.currentLat != null &&
    Math.abs(state.currentLat - state.fortressLat) * 111000 < 200 &&
    Math.abs((state.currentLng || 0) - (state.fortressLng || 0)) * 111000 < 200;

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

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#0a1929] to-[#040b12] px-4 py-6">
        {tab === 'inventory' && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex w-full items-center justify-between rounded-xl border border-cyan-900/30 bg-cyan-950/30 px-4 py-2">
              <span className="flex items-center text-xs font-bold uppercase tracking-widest text-cyan-500">
                {(() => {
                  const bag = state.bags[0];
                  const bagCells = bag?.cells || 9;
                  const upgradeCost = bag ? 50 + Math.max(0, bagCells - 9) * 50 : 0;
                  return (
                    <button
                      onClick={() => upgradeBag()}
                      disabled={!bag || bagCells >= 42 || state.seaGold < upgradeCost}
                      className="flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Nang cap ({upgradeCost} <Coins className="inline h-3 w-3" />)
                    </button>
                  );
                })()}
              </span>
              <span className="rounded-md bg-cyan-900/50 px-2 py-0.5 text-xs font-bold text-cyan-300">{state.inventory.filter((item) => item.gridX >= 0).length} items</span>
            </div>

            <div className="grid w-full gap-3">
              {isAtFortress ? (
                <button
                  onClick={() => openFortressStorage('fortress')}
                  className="w-full rounded-2xl border border-cyan-700/40 bg-gradient-to-r from-cyan-900/40 to-sky-900/20 px-4 py-3 text-left transition-all hover:border-cyan-500/60 hover:bg-cyan-900/40"
                >
                  <div className="flex items-center gap-3">
                    <Anchor className="h-5 w-5 text-cyan-300" />
                    <div>
                      <p className="text-sm font-black text-cyan-200">Mo kho thanh tri</p>
                      <p className="text-[11px] text-cyan-100/70">Kho co tong so o gap 4 lan balo hien tai, giu nguyen chieu ngang va tang chieu doc de cuon.</p>
                    </div>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => openFortressStorage('portal')}
                  className="w-full rounded-2xl border border-violet-700/40 bg-gradient-to-r from-violet-950/50 to-fuchsia-950/20 px-4 py-3 text-left transition-all hover:border-violet-500/60 hover:bg-violet-900/40"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-violet-300" />
                    <div>
                      <p className="text-sm font-black text-violet-200">Ket noi portal kho do</p>
                      <p className="text-[11px] text-violet-100/70">Gui do tu thuyen ve kho voi phi 5% gia mon do, lam tron len tung mon.</p>
                    </div>
                  </div>
                </button>
              )}
            </div>

            <div className="rounded-xl border border-cyan-900/20 bg-[#06111a] p-2 shadow-inner">
              <InventoryGridV2
                items={state.inventory}
                bags={state.bags}
                onItemLayoutChange={(newItems) => saveInventory(newItems)}
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
                onClick={() => setWorldTier(selectedTier)}
                disabled={state.seaGold < (TIER_LABELS.find((tier) => tier.tier === selectedTier)?.cost || 0)}
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-black transition-all ${
                  state.seaGold >= (TIER_LABELS.find((tier) => tier.tier === selectedTier)?.cost || 0)
                    ? 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 text-white shadow-[0_0_20px_rgba(217,119,6,0.4)] hover:from-amber-500 hover:via-orange-400 hover:to-amber-500 active:scale-[0.98]'
                    : 'cursor-not-allowed border border-gray-800 bg-[#1a2332] text-gray-600'
                }`}
                style={state.seaGold >= (TIER_LABELS.find((tier) => tier.tier === selectedTier)?.cost || 0) ? { backgroundSize: '200% auto', animation: 'shine 3s linear infinite' } : {}}
              >
                <Swords className="h-5 w-5" />
                VAO THE GIOI
              </button>
              {state.seaGold < (TIER_LABELS.find((tier) => tier.tier === selectedTier)?.cost || 0) && (
                <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs font-medium text-red-400/80">
                  <span className="text-base">!</span> Ban can them {(TIER_LABELS.find((tier) => tier.tier === selectedTier)?.cost || 0) - state.seaGold} vang
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
