import React, { useState } from 'react';
import { Package, Swords, Coins, Heart, Zap, Wind, Skull, Anchor, ShieldCheck } from 'lucide-react';
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

const BackpackView: React.FC = () => {
  const { state, saveInventory, saveBags, setWorldTier, sellItems, upgradeBag } = useSeaGame();
  const [tab, setTab] = useState<'inventory' | 'challenge'>('inventory');
  const [selectedTier, setSelectedTier] = useState(state.worldTier);
  const [sellMode, setSellMode] = useState(false);
  const [selectedSell, setSelectedSell] = useState<string[]>([]);

  const totalStats = state.inventory.filter(i => i.gridX >= 0).reduce(
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
    <div className="flex flex-col bg-[#0a1929] text-white rounded-3xl overflow-hidden min-h-[600px] border border-cyan-900/50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d2137] border-b border-cyan-800/30">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-black tracking-tight">Hòm Đồ Biển Cả</h2>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5 bg-amber-900/40 px-3 py-1 rounded-full border border-amber-500/20">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-300">{state.seaGold}</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0d2137]/50 border-b border-cyan-800/20 overflow-x-auto subtle-scrollbar">
        <div className="flex items-center gap-1 shrink-0"><Heart className="w-4 h-4 text-red-400" /><span className="text-sm font-bold">{state.currentHp}/{state.baseMaxHp + totalStats.hp}</span></div>
        <div className="flex items-center gap-1 shrink-0"><Zap className="w-4 h-4 text-blue-400" /><span className="text-sm font-bold">{state.energyMax + totalStats.energyMax}</span></div>
        <div className="flex items-center gap-1 shrink-0"><Wind className="w-4 h-4 text-emerald-400" /><span className="text-sm font-bold">{state.moveSpeed}x</span></div>
        <div className="flex items-center gap-1 shrink-0"><Swords className="w-4 h-4 text-orange-400" /><span className="text-sm font-bold">{totalStats.weight} DMG</span></div>
        <div className="flex items-center gap-1 shrink-0"><Skull className="w-4 h-4 text-purple-400" /><span className="text-sm font-bold">{Math.round(state.cursePercent)}%</span></div>
        {isAtFortress && <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 bg-cyan-900/40 rounded border border-cyan-500/30"><Anchor className="w-3.5 h-3.5 text-cyan-400" /><span className="text-[10px] font-bold text-cyan-300">Thành Trì</span></div>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cyan-800/30 bg-[#0a1929]">
        <button onClick={() => setTab('inventory')} className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'inventory' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-900/20' : 'text-gray-500 hover:text-gray-300'}`}>
          <Package className="w-4 h-4 inline mr-1.5" />Inventory
        </button>
        <button onClick={() => setTab('challenge')} className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'challenge' ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-900/20' : 'text-gray-500 hover:text-gray-300'}`}>
          <Swords className="w-4 h-4 inline mr-1.5" />Thử Thách
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-gradient-to-b from-[#0a1929] to-[#040b12]">
        {tab === 'inventory' && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-full flex justify-between items-center bg-cyan-950/30 px-4 py-2 rounded-xl border border-cyan-900/30">
              <span className="text-xs text-cyan-500 font-bold uppercase tracking-widest flex items-center">
                {(() => {
                  const bag = state.bags[0];
                  const upgradeCost = bag ? 50 + (bag.cells - 9) * 50 : 0;
                  return (
                    <button 
                      onClick={() => upgradeBag()} 
                      disabled={!bag || bag.cells >= 42 || state.seaGold < upgradeCost}
                      className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      Nâng cấp ({upgradeCost} <Coins className="w-3 h-3 inline"/>)
                    </button>
                  );
                })()}
              </span>
              <span className="text-xs text-cyan-300 font-bold bg-cyan-900/50 px-2 py-0.5 rounded-md">{state.inventory.filter(i => i.gridX >= 0).length} items</span>
            </div>

            <div className="p-2 bg-[#06111a] rounded-xl shadow-inner border border-cyan-900/20">
              <InventoryGridV2
                items={state.inventory}
                bags={state.bags}
                onItemLayoutChange={(newItems) => saveInventory(newItems)}
                cellSize={Math.min(44, (window.innerWidth - 64) / MAX_GRID_W)}
              />
            </div>

            {/* Actions at fortress */}
            {false && (
              <div className="w-full max-w-sm flex gap-3 mt-2">
                <button
                  onClick={() => setSellMode(!sellMode)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all shadow-md ${
                    sellMode ? 'bg-amber-600 text-white shadow-amber-600/20' : 'bg-amber-900/30 text-amber-300 hover:bg-amber-800/40 border border-amber-700/30'
                  }`}
                >
                  💰 Bán Đồ
                </button>
                <button className="flex-1 py-3 rounded-xl text-sm font-bold bg-cyan-900/30 text-cyan-300 hover:bg-cyan-800/40 border border-cyan-700/30 transition-all shadow-md">
                  📦 Cất Kho
                </button>
              </div>
            )}

            {false && (
              <div className="w-full max-w-sm bg-amber-950/40 border border-amber-700/40 rounded-xl p-4 shadow-lg">
                <p className="text-xs font-bold text-amber-300 mb-3 flex items-center gap-1.5"><Coins className="w-3.5 h-3.5"/> Chọn items để bán:</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {state.inventory.filter(i => i.gridX >= 0).map(item => (
                    <button
                      key={item.uid}
                      onClick={() => setSelectedSell(prev => prev.includes(item.uid) ? prev.filter(u => u !== item.uid) : [...prev, item.uid])}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        selectedSell.includes(item.uid) ? 'bg-amber-600/40 border-amber-400 text-amber-100 shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'bg-[#0a1929] border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="max-w-[80px] truncate">{item.name}</span>
                      <span className="text-amber-400 ml-1">{item.price}g</span>
                    </button>
                  ))}
                  {state.inventory.filter(i => i.gridX >= 0).length === 0 && (
                    <p className="text-xs text-gray-500 w-full text-center py-2">Không có item nào trong túi.</p>
                  )}
                </div>
                {selectedSell.length > 0 && (
                  <button
                    onClick={() => { sellItems(selectedSell); setSelectedSell([]); setSellMode(false); }}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-black rounded-xl transition-all shadow-lg shadow-amber-600/30 active:scale-95"
                  >
                    Bán {selectedSell.length} món (+{state.inventory.filter(i => selectedSell.includes(i.uid)).reduce((s, i) => s + i.price, 0)} Vàng)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'challenge' && (
          <div className="flex flex-col items-center gap-6 max-w-sm mx-auto">
            <div className="w-full">
              <h3 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Chọn Thế Giới
              </h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed bg-[#0d2137] p-3 rounded-lg border border-cyan-900/30">
                Chi phí vào thế giới càng cao, <strong className="text-cyan-300">trang bị nhận được</strong> và <strong className="text-red-400">chỉ số đối thủ</strong> càng lớn.
              </p>

              {/* Tier Slider */}
              <div className="relative px-2">
                <input
                  type="range" min={state.seaGold > 0 ? 1 : 0} max={5} step={1} value={selectedTier}
                  onChange={(e) => setSelectedTier(Number(e.target.value))}
                  className="w-full h-3 bg-[#0d2137] rounded-full appearance-none cursor-pointer outline-none border border-cyan-800/50
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(251,191,36,0.6)] [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110"
                />
                <div className="flex justify-between mt-4">
                  {TIER_LABELS.map(t => (
                    <div key={t.tier} className={`flex flex-col items-center transition-colors ${selectedTier === t.tier ? 'text-amber-400 scale-110' : 'text-gray-600'}`}>
                      <span className="text-sm font-black">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 relative overflow-hidden bg-gradient-to-br from-[#1a0f08] to-[#0f172a] border border-amber-900/50 rounded-2xl p-6 text-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
                <p className="text-[10px] uppercase font-black text-amber-500/60 tracking-[0.2em] mb-1">Tier {selectedTier}</p>
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 mb-2 drop-shadow-sm">
                  {TIER_LABELS.find(t => t.tier === selectedTier)?.label || '0'} <span className="text-lg">Vàng</span>
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/50 rounded-full border border-amber-700/30">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Multiplier</span>
                  <span className="text-sm font-black text-amber-400">×{[0.5, 1, 3, 8, 20, 50][selectedTier]}</span>
                </div>
              </div>

              <button
                onClick={() => setWorldTier(selectedTier)}
                disabled={state.seaGold < (TIER_LABELS.find(t => t.tier === selectedTier)?.cost || 0)}
                className={`w-full mt-6 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
                  state.seaGold >= (TIER_LABELS.find(t => t.tier === selectedTier)?.cost || 0)
                    ? 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 hover:from-amber-500 hover:via-orange-400 hover:to-amber-500 text-white shadow-[0_0_20px_rgba(217,119,6,0.4)] active:scale-[0.98]'
                    : 'bg-[#1a2332] text-gray-600 cursor-not-allowed border border-gray-800'
                }`}
                style={state.seaGold >= (TIER_LABELS.find(t => t.tier === selectedTier)?.cost || 0) ? { backgroundSize: '200% auto', animation: 'shine 3s linear infinite' } : {}}
              >
                <Swords className="w-5 h-5" />
                VÀO THẾ GIỚI
              </button>
              {state.seaGold < (TIER_LABELS.find(t => t.tier === selectedTier)?.cost || 0) && (
                <p className="text-xs text-red-400/80 text-center mt-3 font-medium flex items-center justify-center gap-1">
                  <span className="text-base">⚠️</span> Bạn cần thêm {(TIER_LABELS.find(t => t.tier === selectedTier)?.cost || 0) - state.seaGold} vàng
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
