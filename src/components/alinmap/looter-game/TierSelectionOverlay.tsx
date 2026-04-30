import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, ShieldCheck, Zap, TrendingUp, Coins } from 'lucide-react';

interface TierSelectionOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentGold: number;
  onSelectTier: (tier: number) => void;
}

const TIER_LABELS = [
  { tier: 0, label: '0', cost: 0, mult: 1, color: 'from-gray-400 to-gray-600', icon: '🌊' },
  { tier: 1, label: '10', cost: 10, mult: 2, color: 'from-sky-400 to-blue-600', icon: '⚓' },
  { tier: 2, label: '100', cost: 100, mult: 5, color: 'from-emerald-400 to-teal-600', icon: '🐚' },
  { tier: 3, label: '1k', cost: 1000, mult: 10, color: 'from-amber-400 to-orange-600', icon: '🔱' },
  { tier: 4, label: '10k', cost: 10000, mult: 25, color: 'from-rose-400 to-red-600', icon: '🔥' },
  { tier: 5, label: '100k', cost: 100000, mult: 100, color: 'from-purple-400 to-indigo-600', icon: '💎' },
];

const TierSelectionOverlay: React.FC<TierSelectionOverlayProps> = ({ isOpen, onClose, currentGold, onSelectTier }) => {
  const [selected, setSelected] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    if (isLoading || !canAfford) return;
    setIsLoading(true);
    try {
      await onSelectTier(selected);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedData = TIER_LABELS[selected] || TIER_LABELS[1];
  const canAfford = currentGold >= selectedData.cost;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-[#001424]/90 backdrop-blur-xl pointer-events-auto"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-[#0d2137] border border-cyan-800/50 rounded-[32px] p-6 shadow-2xl relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${selectedData.color} opacity-20 blur-[60px] rounded-full transition-all duration-500`} />
            
            <div className="flex justify-between items-center mb-6 relative">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                  <ShieldCheck className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white leading-tight">Chọn Thử Thách</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Select Your World Tier</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-8 leading-relaxed">
              Chi phí vào thế giới càng cao, <strong className="text-cyan-300">vật phẩm</strong> nhận được và <strong className="text-red-400">chỉ số đối thủ</strong> sẽ tăng mạnh theo hệ số nhân.
            </p>

            {/* Tier Slider */}
            <div className="space-y-6 mb-8">
              <div className="relative px-2">
                <input
                  type="range" min={0} max={5} step={1}
                  value={selected}
                  onChange={(e) => setSelected(Number(e.target.value))}
                  className="w-full h-2 appearance-none rounded-full bg-cyan-950 outline-none cursor-pointer accent-amber-500"
                  style={{
                    background: `linear-gradient(90deg, #f59e0b 0%, #f59e0b ${(selected / 5) * 100}%, #082f49 ${(selected / 5) * 100}%, #082f49 100%)`
                  }}
                />
                <div className="flex justify-between mt-4">
                  {TIER_LABELS.map((t) => (
                    <button 
                      key={t.tier}
                      onClick={() => setSelected(t.tier)}
                      className={`flex flex-col items-center gap-1 transition-all ${selected === t.tier ? 'scale-125' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <span className={`text-[9px] font-black ${selected === t.tier ? 'text-amber-400' : 'text-gray-500'}`}>T{t.tier}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats Card */}
              <div className={`relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-5 text-center`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1 text-cyan-400">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Multiplier</span>
                    </div>
                    <p className="text-2xl font-black text-white">x{selectedData.mult}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Coins className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Entry Fee</span>
                    </div>
                    <p className="text-2xl font-black text-white">{selectedData.label}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                disabled={!canAfford || isLoading}
                onClick={handleStart}
                className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-lg font-black transition-all active:scale-95 ${
                  canAfford && !isLoading
                  ? `bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-900/40`
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                }`}
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Swords className="w-5 h-5" />
                    {canAfford ? 'BẮT ĐẦU CHUYẾN ĐI' : 'KHÔNG ĐỦ VÀNG'}
                  </>
                )}
              </button>
              
              {!canAfford && (
                <p className="text-center text-[10px] font-bold text-red-400/80 animate-pulse">
                  Bạn cần thêm {(Math.max(0, (selectedData?.cost || 0) - (currentGold || 0))).toLocaleString()} vàng để bắt đầu Tier {selected}
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
