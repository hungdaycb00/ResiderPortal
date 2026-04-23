import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Zap, Swords, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeaGame, SeaItem } from './SeaGameProvider';
import InventoryGrid from './InventoryGrid';

const CombatScreen: React.FC = () => {
  const { state, encounter, setEncounter, executeCombat, combatResult, setCombatResult, loadState } = useSeaGame();
  const [phase, setPhase] = useState<'ready' | 'fighting' | 'result'>('ready');
  const [manaA, setManaA] = useState(0);
  const [manaB, setManaB] = useState(0);
  const [hpA, setHpA] = useState(0);
  const [hpB, setHpB] = useState(0);
  const [logIndex, setLogIndex] = useState(0);
  const [flyingItem, setFlyingItem] = useState<{ item: SeaItem; from: 'A' | 'B'; damage: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  if (!encounter) return null;

  const myStats = state.inventory.filter(i => i.gridX >= 0).reduce(
    (a, i) => ({ hp: a.hp + i.hpBonus, weight: a.weight + i.weight, eMax: a.eMax + i.energyMax, eRegen: a.eRegen + i.energyRegen }),
    { hp: 0, weight: 0, eMax: 0, eRegen: 0 }
  );
  const maxHpA = state.baseMaxHp + myStats.hp;
  const maxManaA = 100 + myStats.eMax;
  const maxHpB = encounter.totalHp;
  const maxManaB = 100;

  const handleStart = async () => {
    setPhase('fighting');
    setHpA(maxHpA);
    setHpB(maxHpB);
    setManaA(0);
    setManaB(0);

    try {
      const result = await executeCombat(
        encounter.id,
        encounter.isBot ? encounter.inventory : undefined,
        encounter.isBot ? encounter.baseMaxHp : undefined
      );

      // Animate combat log
      if (result.combatLog?.length) {
        let idx = 0;
        timerRef.current = setInterval(() => {
          if (idx >= result.combatLog.length) {
            clearInterval(timerRef.current);
            setPhase('result');
            return;
          }
          const entry = result.combatLog[idx];
          if (entry.attacker === 'A') {
            setFlyingItem({ item: entry.item, from: 'A', damage: entry.damage });
            setHpB(Math.max(0, entry.targetHp));
            setManaA(0);
          } else {
            setFlyingItem({ item: entry.item, from: 'B', damage: entry.damage });
            setHpA(Math.max(0, entry.targetHp));
            setManaB(0);
          }
          setTimeout(() => setFlyingItem(null), 800);
          setManaA(prev => Math.min(prev + 15, maxManaA));
          setManaB(prev => Math.min(prev + 15, maxManaB));
          idx++;
        }, 1200);
      } else {
        setPhase('result');
      }
    } catch {
      setPhase('result');
    }
  };

  const handleClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setEncounter(null);
    setCombatResult(null);
    setPhase('ready');
    loadState();
  };

  const cellSize = Math.min(36, (window.innerWidth / 2 - 40) / state.inventoryWidth);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-[#040e1a] flex flex-col"
    >
      {/* Top: Ocean scene with boats */}
      <div className="relative h-[35vh] min-h-[180px] bg-gradient-to-b from-[#1a4a6e] to-[#0a2540] overflow-hidden">
        {/* Waves */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a1929] to-transparent" />
        <svg className="absolute bottom-0 w-full h-8 text-[#0a1929]" viewBox="0 0 1200 40" preserveAspectRatio="none">
          <path d="M0,20 Q150,0 300,20 Q450,40 600,20 Q750,0 900,20 Q1050,40 1200,20 L1200,40 L0,40 Z" fill="currentColor" />
        </svg>

        {/* Player A (left) */}
        <motion.div
          className="absolute left-[15%] bottom-[30%] flex flex-col items-center"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-4xl md:text-5xl">🚢</span>
          <span className="text-[10px] font-black text-cyan-200 bg-black/40 px-2 py-0.5 rounded-full mt-1 truncate max-w-[100px]">Bạn</span>
        </motion.div>

        {/* Player B (right) */}
        <motion.div
          className="absolute right-[15%] bottom-[30%] flex flex-col items-center"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <span className="text-4xl md:text-5xl" style={{ transform: 'scaleX(-1)' }}>🚢</span>
          <span className="text-[10px] font-black text-red-200 bg-black/40 px-2 py-0.5 rounded-full mt-1 truncate max-w-[100px]">{encounter.name}</span>
        </motion.div>

        {/* Flying item animation */}
        <AnimatePresence>
          {flyingItem && (
            <motion.div
              key={Math.random()}
              initial={{ x: flyingItem.from === 'A' ? '20vw' : '80vw', y: '-10vh', opacity: 1, scale: 1.5 }}
              animate={{ x: flyingItem.from === 'A' ? '75vw' : '20vw', y: '15vh', opacity: 0.3, scale: 0.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeIn' }}
              className="absolute z-50 flex flex-col items-center"
            >
              <span className="text-3xl">{flyingItem.item.icon}</span>
              <span className="text-xs font-black text-red-400 bg-black/60 px-1.5 rounded">-{flyingItem.damage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center buttons */}
        <div className="absolute top-3 right-3">
          <button onClick={handleClose} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors">
            Rời Khỏi
          </button>
        </div>
        {phase === 'ready' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-lg rounded-2xl shadow-lg shadow-amber-600/40 hover:scale-105 active:scale-95 transition-transform"
            >
              ⚔️ Bắt Đầu
            </button>
          </div>
        )}
      </div>

      {/* Bottom: Stats + Inventories */}
      <div className="flex-1 flex overflow-hidden">
        {/* Player A side */}
        <div className="flex-1 flex flex-col p-2 border-r border-cyan-800/30 overflow-y-auto">
          <div className="mb-2">
            {/* HP Bar */}
            <div className="flex items-center gap-1.5 mb-1">
              <Heart className="w-3 h-3 text-red-400 shrink-0" />
              <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div className="h-full bg-red-500 rounded-full" animate={{ width: `${Math.max(0, (hpA / maxHpA) * 100)}%` }} />
              </div>
              <span className="text-[10px] font-bold text-red-300 w-12 text-right">{Math.max(0, Math.round(hpA))}</span>
            </div>
            {/* Mana Bar */}
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-blue-400 shrink-0" />
              <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div className="h-full bg-blue-500 rounded-full" animate={{ width: `${(manaA / maxManaA) * 100}%` }} />
              </div>
              <span className="text-[10px] font-bold text-blue-300 w-12 text-right">{Math.round(manaA)}</span>
            </div>
          </div>
          <InventoryGrid items={state.inventory} gridWidth={state.inventoryWidth} gridHeight={state.inventoryHeight} readOnly cellSize={cellSize} />
        </div>

        {/* Center stats */}
        <div className="w-16 md:w-20 flex flex-col items-center justify-center gap-2 bg-[#0d2137]/50 shrink-0">
          <Shield className="w-5 h-5 text-cyan-500" />
          <div className="text-center">
            <p className="text-[9px] text-gray-500">DMG</p>
            <p className="text-xs font-black text-cyan-300">{myStats.weight}</p>
          </div>
          <div className="w-6 h-px bg-gray-700" />
          <div className="text-center">
            <p className="text-[9px] text-gray-500">DMG</p>
            <p className="text-xs font-black text-red-300">{encounter.totalWeight}</p>
          </div>
          <Shield className="w-5 h-5 text-red-500" />
          {phase === 'fighting' && <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />}
        </div>

        {/* Player B side */}
        <div className="flex-1 flex flex-col p-2 overflow-y-auto">
          <div className="mb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Heart className="w-3 h-3 text-red-400 shrink-0" />
              <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div className="h-full bg-red-500 rounded-full" animate={{ width: `${Math.max(0, (hpB / maxHpB) * 100)}%` }} />
              </div>
              <span className="text-[10px] font-bold text-red-300 w-12 text-right">{Math.max(0, Math.round(hpB))}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-blue-400 shrink-0" />
              <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div className="h-full bg-blue-500 rounded-full" animate={{ width: `${(manaB / maxManaB) * 100}%` }} />
              </div>
              <span className="text-[10px] font-bold text-blue-300 w-12 text-right">{Math.round(manaB)}</span>
            </div>
          </div>
          <InventoryGrid items={encounter.inventory} gridWidth={6} gridHeight={4} readOnly cellSize={cellSize} />
        </div>
      </div>

      {/* Result overlay */}
      <AnimatePresence>
        {phase === 'result' && combatResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/70 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className={`p-8 rounded-3xl text-center max-w-sm mx-4 ${
                combatResult.result === 'win' ? 'bg-gradient-to-b from-amber-900/90 to-amber-950/90 border border-amber-500/40' : 'bg-gradient-to-b from-red-900/90 to-red-950/90 border border-red-500/40'
              }`}
            >
              <span className="text-5xl block mb-3">{combatResult.result === 'win' ? '🏆' : '💀'}</span>
              <h3 className="text-2xl font-black mb-2">{combatResult.result === 'win' ? 'CHIẾN THẮNG!' : 'THẤT BẠI'}</h3>
              {combatResult.result === 'win' && combatResult.loot?.length ? (
                <div className="mb-4">
                  <p className="text-sm text-amber-300 mb-2">Chiến lợi phẩm:</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {combatResult.loot.map(item => (
                      <span key={item.uid} className="text-xl" title={item.name}>{item.icon}</span>
                    ))}
                  </div>
                </div>
              ) : combatResult.result === 'lose' && combatResult.droppedItems?.length ? (
                <div className="mb-4">
                  <p className="text-sm text-red-300 mb-2">Đồ rơi (75%):</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {combatResult.droppedItems.map(item => (
                      <span key={item.uid} className="text-xl opacity-50" title={item.name}>{item.icon}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              <button onClick={handleClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors">
                Đóng
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CombatScreen;
