import React, { useState } from 'react';
import { X, Package, Swords, Coins, Heart, Zap, Wind, Skull, Anchor, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeaGame, MAX_GRID_W } from './SeaGameProvider';
import InventoryGridV2 from './InventoryGridV2';

const TIER_LABELS = [
  { tier: 0, cost: 0, label: '0' },
  { tier: 1, cost: 10, label: '10' },
  { tier: 2, cost: 100, label: '100' },
  { tier: 3, cost: 1000, label: '1K' },
  { tier: 4, cost: 10000, label: '10K' },
  { tier: 5, cost: 100000, label: '100K' },
];

const BackpackPanel: React.FC = () => {
  const { 
    state, isBackpackOpen, setIsBackpackOpen, stagingItem, setStagingItem, pendingBagSwap, setPendingBagSwap, acceptBagSwap,
    saveInventory, saveBags, setWorldTier, sellItems, showDiscardModal, setShowDiscardModal, confirmDiscard 
  } = useSeaGame();
  const [tab, setTab] = useState<'inventory' | 'challenge'>('inventory');
  const [selectedTier, setSelectedTier] = useState(state.worldTier);
  const [sellMode, setSellMode] = useState(false);
  const [selectedSell, setSelectedSell] = useState<string[]>([]);

  const hasFloatingItems = state.inventory.some(i => i.gridX < 0) || !!stagingItem;

  const handleClose = () => {
    if (hasFloatingItems) {
      setShowDiscardModal(true);
    } else {
      setIsBackpackOpen(false);
    }
  };

  if (!isBackpackOpen) return null;

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
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-0 z-[300] flex flex-col bg-[#0a1929] text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d2137] border-b border-cyan-800/30">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-black tracking-tight">Hòm Đồ</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-amber-900/40 px-3 py-1 rounded-full">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-300">{state.seaGold}</span>
            </div>
            <button onClick={handleClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#0d2137]/50 border-b border-cyan-800/20 overflow-x-auto">
          <div className="flex items-center gap-1 shrink-0"><Heart className="w-3.5 h-3.5 text-red-400" /><span className="text-xs font-bold">{state.currentHp}/{state.baseMaxHp + totalStats.hp}</span></div>
          <div className="flex items-center gap-1 shrink-0"><Zap className="w-3.5 h-3.5 text-blue-400" /><span className="text-xs font-bold">{state.energyMax + totalStats.energyMax}</span></div>
          <div className="flex items-center gap-1 shrink-0"><Wind className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs font-bold">{state.moveSpeed}x</span></div>
          <div className="flex items-center gap-1 shrink-0"><Swords className="w-3.5 h-3.5 text-orange-400" /><span className="text-xs font-bold">{totalStats.weight} DMG</span></div>
          <div className="flex items-center gap-1 shrink-0"><Skull className="w-3.5 h-3.5 text-purple-400" /><span className="text-xs font-bold">{Math.round(state.cursePercent)}%</span></div>
          {isAtFortress && <div className="flex items-center gap-1 shrink-0"><Anchor className="w-3.5 h-3.5 text-cyan-400" /><span className="text-[10px] font-bold text-cyan-300">Thành Trì</span></div>}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cyan-800/30">
          <button onClick={() => setTab('inventory')} className={`flex-1 py-2.5 text-sm font-bold transition-colors ${tab === 'inventory' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-900/20' : 'text-gray-500 hover:text-gray-300'}`}>
            <Package className="w-4 h-4 inline mr-1.5" />Inventory
          </button>
          <button onClick={() => setTab('challenge')} className={`flex-1 py-2.5 text-sm font-bold transition-colors ${tab === 'challenge' ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-900/20' : 'text-gray-500 hover:text-gray-300'}`}>
            <Swords className="w-4 h-4 inline mr-1.5" />Thử Thách
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {tab === 'inventory' && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-[10px] text-cyan-500/60 font-bold uppercase tracking-widest">
                Grid 7×6 • {state.bags[0]?.cells || 0} ô • {state.inventory.filter(i => i.gridX >= 0).length} items
              </div>

              <InventoryGridV2
                items={state.inventory}
                bags={state.bags}
                onItemLayoutChange={(newItems) => saveInventory(newItems)}
                cellSize={Math.min(44, (window.innerWidth - 48) / MAX_GRID_W)}
              />

              {/* Actions at fortress */}
              {false && (
                <div className="w-full flex gap-2 mt-2">
                  <button
                    onClick={() => setSellMode(!sellMode)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                      sellMode ? 'bg-amber-600 text-white' : 'bg-amber-900/30 text-amber-300 hover:bg-amber-900/50'
                    }`}
                  >
                    💰 Bán Đồ
                  </button>
                  <button className="flex-1 py-2 rounded-lg text-sm font-bold bg-cyan-900/30 text-cyan-300 hover:bg-cyan-900/50 transition-colors">
                    📦 Cất Kho
                  </button>
                </div>
              )}

              {false && (
                <div className="w-full bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
                  <p className="text-xs text-amber-300 mb-2">Chọn items để bán:</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {state.inventory.filter(i => i.gridX >= 0).map(item => (
                      <button
                        key={item.uid}
                        onClick={() => setSelectedSell(prev => prev.includes(item.uid) ? prev.filter(u => u !== item.uid) : [...prev, item.uid])}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold transition-all ${
                          selectedSell.includes(item.uid) ? 'bg-amber-600/40 border-amber-400 text-amber-200' : 'bg-gray-800/50 border-gray-700 text-gray-400'
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                        <span className="text-amber-400">{item.price}g</span>
                      </button>
                    ))}
                  </div>
                  {selectedSell.length > 0 && (
                    <button
                      onClick={() => { sellItems(selectedSell); setSelectedSell([]); setSellMode(false); }}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors"
                    >
                      Bán {selectedSell.length} món ({state.inventory.filter(i => selectedSell.includes(i.uid)).reduce((s, i) => s + i.price, 0)}g)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'challenge' && (
            <div className="flex flex-col items-center gap-6">
              <div className="w-full">
                <h3 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Chọn Thế Giới
                </h3>
                <p className="text-[11px] text-gray-400 mb-4">Vàng càng cao → item buff càng mạnh. Gặp user cùng thế giới.</p>

                {/* Tier Slider */}
                <div className="relative">
                  <input
                    type="range" min={state.seaGold > 0 ? 1 : 0} max={5} step={1} value={selectedTier}
                    onChange={(e) => setSelectedTier(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between mt-2">
                    {TIER_LABELS.map(t => (
                      <div key={t.tier} className={`flex flex-col items-center ${selectedTier === t.tier ? 'text-amber-400' : 'text-gray-500'}`}>
                        <span className="text-xs font-black">{t.label}</span>
                        <span className="text-[9px]">vàng</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 bg-amber-900/20 border border-amber-700/30 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-amber-300">{TIER_LABELS.find(t => t.tier === selectedTier)?.label || '0'} <span className="text-lg">Vàng</span></p>
                  <p className="text-xs text-gray-400 mt-1">Chi phí vào thế giới Tier {selectedTier}</p>
                  <p className="text-xs text-amber-400/70 mt-1">Multiplier: ×{[0.5, 1, 3, 8, 20, 50][selectedTier]}</p>
                </div>

                <button
                  onClick={() => setWorldTier(selectedTier)}
                  disabled={state.seaGold < (TIER_LABELS.find(t => t.tier === selectedTier)?.cost || 0)}
                  className={`w-full mt-4 py-3 rounded-xl font-black text-lg transition-all ${
                    state.seaGold >= (TIER_LABELS.find(t => t.tier === selectedTier)?.cost || 0)
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-600/30 active:scale-95'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  ⚔️ Thử Thách
                </button>
                {state.seaGold < (TIER_LABELS.find(t => t.tier === selectedTier)?.cost || 0) && (
                  <p className="text-[10px] text-red-400 text-center mt-2">
                    Cần thêm {(TIER_LABELS.find(t => t.tier === selectedTier)?.cost || 0) - state.seaGold} vàng
                  </p>
                )}
              </div>
            </div>
          )}
          {/* Pending Bag Swap Modal */}
          {pendingBagSwap && (
            <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
              <div className="bg-[#0a1929] border border-cyan-500/50 rounded-2xl p-6 w-full max-w-sm flex flex-col items-center text-center shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <div className="w-16 h-16 rounded-full bg-cyan-900/40 border border-cyan-400/50 flex items-center justify-center text-4xl mb-4 shadow-inner">
                  {pendingBagSwap.icon}
                </div>
                <h3 className="text-xl font-black text-cyan-400 tracking-tight mb-2">Đổi Balo Mới?</h3>
                <p className="text-sm text-cyan-100/80 mb-6 font-medium">
                  Bạn nhặt được <span className="text-white font-bold">{pendingBagSwap.name}</span> ({pendingBagSwap.width}x{pendingBagSwap.height} ô).<br/>
                  <span className="text-[11px] text-amber-400/80 mt-2 block">Các item nằm ngoài balo mới sẽ rơi vào Khu Vực Chờ.</span>
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setPendingBagSwap(null)}
                    className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-colors border border-gray-600/50"
                  >
                    Bỏ qua
                  </button>
                  <button
                    onClick={() => acceptBagSwap(pendingBagSwap)}
                    className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl transition-all shadow-lg shadow-cyan-900/50"
                  >
                    Đồng ý
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BackpackPanel;
