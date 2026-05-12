import React from 'react';
import { motion } from 'framer-motion';
import { Swords, Wind, Heart, Shield } from 'lucide-react';
import { useLooterState, useLooterActions } from './LooterGameContext';

const CurseModal: React.FC = () => {
  const { showCurseModal, encounter, state } = useLooterState();
  const { setShowCurseModal, curseChoice, setEncounter } = useLooterActions();

  if (!showCurseModal || !encounter) return null;

  const myStats = state.inventory.filter(i => i.gridX >= 0).reduce(
    (a, i) => ({ hp: a.hp + i.hpBonus, weight: a.weight + i.weight }),
    { hp: 0, weight: 0 }
  );
  const myTotalHp = state.baseMaxHp + myStats.hp;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-gradient-to-b from-[#1a1030] to-[#0d0620] border border-purple-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-purple-900/30"
      >
        <div className="text-center mb-6">
          <span className="text-4xl block mb-2">💀</span>
          <h2 className="text-xl font-black text-purple-200">Lời Nguyền Biển Cả!</h2>
          <p className="text-sm text-purple-300/60 mt-1">Bạn gặp phải {encounter.name}</p>
        </div>

        <div className="flex items-center gap-4 mb-6 bg-purple-900/20 rounded-xl p-3 border border-purple-700/30">
          <div className="flex-1 text-center">
            <p className="text-[10px] text-cyan-400 font-bold uppercase mb-1">Bạn</p>
            <div className="flex items-center justify-center gap-1"><Swords className="w-3 h-3 text-orange-400" /><span className="text-sm font-bold text-white">{myStats.weight}</span></div>
            <div className="flex items-center justify-center gap-1"><Heart className="w-3 h-3 text-red-400" /><span className="text-sm font-bold text-white">{myTotalHp}</span></div>
          </div>
          <div className="text-purple-500 font-black text-lg">VS</div>
          <div className="flex-1 text-center">
            <p className="text-[10px] text-red-400 font-bold uppercase mb-1">{encounter.name}</p>
            <div className="flex items-center justify-center gap-1"><Swords className="w-3 h-3 text-orange-400" /><span className="text-sm font-bold text-white">{encounter.totalWeight}</span></div>
            <div className="flex items-center justify-center gap-1"><Heart className="w-3 h-3 text-red-400" /><span className="text-sm font-bold text-white">{encounter.totalHp}</span></div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={async () => { await curseChoice('challenge'); setShowCurseModal(false); }}
            className="w-full py-3 bg-amber-900/40 hover:bg-amber-800/40 border border-amber-600/40 rounded-xl text-left px-4 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-amber-400 group-hover:text-amber-300" />
              <div>
                <p className="text-sm font-bold text-amber-200">Chiến Đấu</p>
                <p className="text-[10px] text-amber-400/70">Thắng lấy 50% đồ đối thủ</p>
              </div>
            </div>
          </button>

          <button
            onClick={async () => { await curseChoice('flee'); setEncounter(null); }}
            className="w-full py-3 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/40 rounded-xl text-left px-4 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Wind className="w-5 h-5 text-gray-400 group-hover:text-white" />
              <div>
                <p className="text-sm font-bold text-white">Đầu Hàng</p>
                <p className="text-[10px] text-gray-400">Mất 25% đồ, lấy theo tỷ lệ và tối thiểu 1 món</p>
              </div>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CurseModal;
