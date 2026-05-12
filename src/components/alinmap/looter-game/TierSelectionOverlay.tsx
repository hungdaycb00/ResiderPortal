import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, TrendingUp, Coins } from 'lucide-react';
import { GAME_CONFIG } from './gameConfig';
import AlinMapLoadingIcon from '../components/AlinMapLoadingIcon';

interface TierSelectionOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentGold: number;
  onSelectTier: (tier: number) => void;
}

const TIER_MULTIPLIERS = [1, 2, 5, 10, 25, 100];
const TIER_ICONS   = ['🌊', '⚓', '🐚', '🔱', '🔥', '💎'];
const TIER_COLORS  = ['from-gray-400 to-gray-600', 'from-sky-400 to-blue-600', 'from-emerald-400 to-teal-600', 'from-amber-400 to-orange-600', 'from-rose-400 to-red-600', 'from-purple-400 to-indigo-600'];

const formatCost = (n: number) => n >= 1000 ? `${(n / 1000)}k` : `${n}`;

const buildTierLabels = () => {
  const costs = GAME_CONFIG.TIER_COSTS || [0, 50, 150, 450, 1000, 2500];
  return costs.map((cost, i) => ({
    tier: i,
    label: formatCost(cost),
    cost,
    mult: TIER_MULTIPLIERS[i] || 1,
    color: TIER_COLORS[i] || 'from-gray-400 to-gray-600',
    icon: TIER_ICONS[i] || '🌊',
  }));
};

const TierSelectionOverlay: React.FC<TierSelectionOverlayProps> = ({ isOpen, onClose, currentGold, onSelectTier }) => {
  const [selected, setSelected] = useState(1);
  const [isTierSelectionSubmitting, setIsTierSelectionSubmitting] = useState(false);
  const tierLabels = useMemo(() => buildTierLabels(), []);

  const handleStart = async () => {
    if (isTierSelectionSubmitting || !canAfford) return;
    setIsTierSelectionSubmitting(true);
    try {
      await onSelectTier(selected);
    } finally {
      setIsTierSelectionSubmitting(false);
    }
  };

  const selectedData = tierLabels[selected] || tierLabels[1];
  const canAfford = currentGold >= selectedData.cost;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md pointer-events-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-[320px] bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[28px] p-5 shadow-2xl relative overflow-hidden"
          >
            {/* Glow */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${selectedData.color} opacity-20 blur-[60px] rounded-full transition-colors duration-500`} />
            
            <div className="flex justify-between items-center mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                  <Swords className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="text-lg font-black text-white leading-none">Chọn Thử Thách</h3>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full text-white/50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-gray-300/80 mb-5 leading-tight">
              Chi phí cao sẽ tăng <strong className="text-cyan-400">Vật phẩm</strong> & <strong className="text-red-400">Đối thủ</strong>.
            </p>

            {/* Tier Slider */}
            <div className="mb-6 relative z-10">
              <input
                type="range" min={0} max={5} step={1}
                value={selected}
                onChange={(e) => setSelected(Number(e.target.value))}
                className="w-full h-1.5 appearance-none rounded-full bg-black/50 outline-none cursor-pointer accent-amber-500"
                style={{
                  background: `linear-gradient(90deg, #f59e0b 0%, #f59e0b ${(selected / 5) * 100}%, rgba(0,0,0,0.5) ${(selected / 5) * 100}%, rgba(0,0,0,0.5) 100%)`
                }}
              />
              <div className="flex justify-between mt-3 px-1">
                {tierLabels.map((t) => (
                  <button 
                    key={t.tier}
                    onClick={() => setSelected(t.tier)}
                    className={`flex flex-col items-center transition-all ${selected === t.tier ? 'scale-125' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                  >
                    <span className="text-lg leading-none">{t.icon}</span>
                    <span className={`text-[9px] font-black mt-1 ${selected === t.tier ? 'text-amber-400' : 'text-gray-400'}`}>T{t.tier}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Stats */}
            <div className="flex items-center justify-between bg-black/30 rounded-xl p-3 border border-white/5 mb-5 relative z-10">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-[9px] text-cyan-400/80 uppercase font-bold">Hệ số</p>
                  <p className="text-sm font-black text-white">x{selectedData.mult}</p>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-[9px] text-amber-400/80 uppercase font-bold text-right">Chi phí</p>
                  <p className="text-sm font-black text-white">{selectedData.label}</p>
                </div>
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            <div className="relative z-10">
              <button
                disabled={!canAfford || isTierSelectionSubmitting}
                onClick={handleStart}
                className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-[14px] font-black transition-all active:scale-95 ${
                  canAfford && !isTierSelectionSubmitting
                  ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
              >
                {isTierSelectionSubmitting ? (
                  <AlinMapLoadingIcon className="h-5 w-5 animate-spin text-black/35" strokeWidth={2.6} />
                ) : (
                  <>
                    BẮT ĐẦU <span className="opacity-70 font-bold ml-1">({selectedData.label} VÀNG)</span>
                  </>
                )}
              </button>
              
              {!canAfford && (
                <p className="text-center text-[10px] font-bold text-red-400/80 mt-3 animate-pulse">
                  Thiếu {(Math.max(0, (selectedData?.cost || 0) - (currentGold || 0))).toLocaleString()} vàng
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TierSelectionOverlay;
