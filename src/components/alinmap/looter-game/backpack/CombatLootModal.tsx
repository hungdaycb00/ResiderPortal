import React from 'react';
import { Sparkles, Package, ChevronRight } from 'lucide-react';
import { useLooterState, useLooterActions } from '../LooterGameContext';

const RARITY_COLORS: Record<string, string> = {
  common: 'from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-200',
  uncommon: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-200',
  rare: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-200',
  legendary: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-200',
};

export default function CombatLootModal() {
  const { combatResult } = useLooterState();
  const { setCombatResult, dropCombatLoot } = useLooterActions();

  if (!combatResult || combatResult.result !== 'win' || !combatResult.loot || combatResult.loot.length === 0) return null;

  const handleContinue = async () => {
    if (combatResult.loot) {
      await dropCombatLoot(combatResult.loot);
    }
    setCombatResult(null);
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#050b14] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* Animated Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-[80px]" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-[80px]" />

        <div className="relative flex flex-col items-center p-8 text-center">
          {/* Header Icon */}
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-yellow-400/20 to-transparent p-1 shadow-[0_0_30px_rgba(234,179,8,0.2)] border border-yellow-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0a1526] shadow-inner">
              <Sparkles className="h-10 w-10 text-yellow-400 animate-pulse" />
            </div>
          </div>

          <h2 className="mb-2 text-4xl font-black italic tracking-tighter text-white uppercase">
            Chiến Thắng!
          </h2>
          <p className="mb-8 text-sm font-bold text-cyan-400/80 uppercase tracking-[0.2em]">
            Bạn đã nhận được chiến lợi phẩm
          </p>

          {/* Loot List */}
          <div className="mb-10 w-full rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                <Package className="h-3 w-3" />
                Vật phẩm rơi ra
              </div>
              <span className="text-[10px] font-black text-yellow-500/80">{combatResult.loot.length} MÓN</span>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {combatResult.loot.map((item, idx) => (
                <div
                  key={item.uid || idx}
                  className={`group relative flex aspect-square items-center justify-center rounded-2xl border bg-gradient-to-br shadow-lg transition-transform hover:scale-110 ${RARITY_COLORS[item.rarity] || 'from-gray-500/20 to-gray-600/10 border-gray-500/30 text-gray-200'}`}
                >
                  <span className="text-3xl drop-shadow-xl select-none group-hover:animate-bounce">{item.icon}</span>
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-8 items-center justify-center rounded-lg bg-black/80 text-[8px] font-black text-white border border-white/10">
                    {item.gridW}x{item.gridH}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleContinue}
            className="group relative w-full overflow-hidden rounded-2xl bg-white px-8 py-5 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="relative flex items-center justify-center gap-3">
              <span className="text-lg font-black italic uppercase tracking-tight text-black">
                Tiếp tục nhặt đồ
              </span>
              <ChevronRight className="h-5 w-5 text-black transition-transform group-hover:translate-x-1" />
            </div>
          </button>
          
          <p className="mt-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Bấm tiếp tục để các vật phẩm rơi ra bản đồ
          </p>
        </div>
      </div>
    </div>
  );
}
