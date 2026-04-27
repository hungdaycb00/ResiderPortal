import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Zap, Swords, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeaGame } from './SeaGameProvider';
import type { SeaItem } from './backpack';
import { CombatInventoryGrid } from './backpack';

const CombatScreen: React.FC = () => {
  const { state, encounter, setEncounter, executeCombat, combatResult, setCombatResult, loadState } = useSeaGame();
  const [phase, setPhase] = useState<'ready' | 'fighting' | 'result'>('ready');
  const [manaA, setManaA] = useState(0);
  const [manaB, setManaB] = useState(0);
  const [hpA, setHpA] = useState(0);
  const [hpB, setHpB] = useState(0);
  const [flyingItem, setFlyingItem] = useState<{ item: SeaItem; from: 'A' | 'B'; damage: number } | null>(null);
  const combatLogRef = useRef<any[]>([]);
  const currentIdxRef = useRef(0);
  const frameRef = useRef<number>();

  const manaARef = useRef(0);
  const manaBRef = useRef(0);
  const hpARef = useRef(0);
  const hpBRef = useRef(0);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

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
    hpARef.current = maxHpA;
    hpBRef.current = maxHpB;
    manaARef.current = 0;
    manaBRef.current = 0;
    setHpA(maxHpA);
    setHpB(maxHpB);
    setManaA(0);
    setManaB(0);
    currentIdxRef.current = 0;

    try {
      const result = await executeCombat(
        encounter.id,
        encounter.isBot ? encounter.inventory : undefined,
        encounter.isBot ? encounter.baseMaxHp : undefined
      );

      if (result.combatLog?.length) {
        combatLogRef.current = result.combatLog;
        startCombatLoop();
      } else {
        setPhase('result');
      }
    } catch {
      setPhase('result');
    }
  };

  const startCombatLoop = () => {
    let lastTime = performance.now();
    let isAnimating = false;
    
    const loop = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      if (currentIdxRef.current >= combatLogRef.current.length) {
        setPhase('result');
        return;
      }

      if (isAnimating) {
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      const entry = combatLogRef.current[currentIdxRef.current];
      const side = entry.attacker;

      if (side === 'A') {
        const manaGain = (15 + myStats.eRegen) * (dt / 1000) * 10;
        manaARef.current = Math.min(manaARef.current + manaGain, maxManaA);
        
        if (manaARef.current >= maxManaA) {
          isAnimating = true;
          setFlyingItem({ item: entry.item, from: 'A', damage: entry.damage });
          hpBRef.current = Math.max(0, entry.targetHp);
          setHpB(hpBRef.current);
          currentIdxRef.current++;
          setTimeout(() => {
              setFlyingItem(null);
              isAnimating = false;
          }, 800);
          manaARef.current = 0;
        }
        setManaA(manaARef.current);
      } else {
        const manaGain = 20 * (dt / 1000) * 10;
        manaBRef.current = Math.min(manaBRef.current + manaGain, maxManaB);
        
        if (manaBRef.current >= maxManaB) {
          isAnimating = true;
          setFlyingItem({ item: entry.item, from: 'B', damage: entry.damage });
          hpARef.current = Math.max(0, entry.targetHp);
          setHpA(hpARef.current);
          currentIdxRef.current++;
          setTimeout(() => {
              setFlyingItem(null);
              isAnimating = false;
          }, 800);
          manaBRef.current = 0;
        }
        setManaB(manaBRef.current);
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
  };

  const handleClose = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    setEncounter(null);
    setPhase('ready');
    if (!(combatResult?.result === 'win' && combatResult?.loot && combatResult.loot.length > 0)) {
        setCombatResult(null);
    }
    loadState();
  };

  const cellSize = Math.min(40, (window.innerWidth / 2 - 20) / Math.max(state.inventoryWidth, 6));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-[#040e1a] flex flex-col overflow-hidden"
    >
      {/* 1. Enemy Inventory (Top on Mobile, Right on Desktop) */}
      <div className="md:hidden flex-1 flex flex-col bg-[#370d0d]/20 p-2 border-b border-red-900/20 overflow-hidden">
        <div className="mb-2">
            <div className="flex justify-between items-end mb-1 px-1">
               <span className="text-[10px] font-bold text-red-300">{Math.max(0, Math.round(hpB))}/{maxHpB}</span>
               <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">⚔️ DMG: {encounter.totalWeight}</span>
            </div>
            <div className="h-3 bg-gray-900 rounded-full overflow-hidden border border-white/5">
              <motion.div className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full" animate={{ width: `${Math.max(0, (hpB / maxHpB) * 100)}%` }} />
            </div>
        </div>
        <div className="flex-1 flex justify-center items-center overflow-auto subtle-scrollbar">
           <CombatInventoryGrid items={encounter.inventory} gridWidth={6} gridHeight={4} readOnly cellSize={Math.min(32, (window.innerWidth - 40) / 6)} />
        </div>
      </div>

      {/* 2. Ocean scene with boats (Middle) */}
      <div className="relative h-[22vh] md:h-[28vh] min-h-[160px] bg-gradient-to-b from-[#1a4a6e] to-[#0a2540] overflow-hidden shrink-0 border-y border-[#0a1929]/50 shadow-[0_0_20px_rgba(0,0,0,0.5)_inset]">
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a1929] to-transparent" />
        <svg className="absolute bottom-0 w-full h-8 text-[#0a1929]" viewBox="0 0 1200 40" preserveAspectRatio="none">
          <path d="M0,20 Q150,0 300,20 Q450,40 600,20 Q750,0 900,20 Q1050,40 1200,20 L1200,40 L0,40 Z" fill="currentColor" />
        </svg>

        {/* Player A (left) */}
        <motion.div
          className="absolute left-[20%] bottom-[40%] flex flex-col items-center"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-4xl md:text-5xl">🚢</span>
          <span className="text-[10px] font-black text-cyan-200 bg-black/40 px-2 py-0.5 rounded-full mt-1">Bạn</span>
        </motion.div>

        {/* Player B (right) */}
        <motion.div
          className="absolute right-[20%] bottom-[40%] flex flex-col items-center"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <span className="text-4xl md:text-5xl" style={{ transform: 'scaleX(-1)' }}>🚢</span>
          <span className="text-[10px] font-black text-red-200 bg-black/40 px-2 py-0.5 rounded-full mt-1 max-w-[80px] truncate">{encounter.name}</span>
        </motion.div>

        {/* Flying item animation */}
        <AnimatePresence mode="popLayout">
          {flyingItem && (
            <motion.div
              key={flyingItem.item.uid + flyingItem.from}
              initial={{ x: flyingItem.from === 'A' ? '20vw' : '80vw', y: '-5vh', opacity: 1, scale: 1.5 }}
              animate={{ x: flyingItem.from === 'A' ? '75vw' : '20vw', y: '10vh', opacity: 0.3, scale: 0.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeIn' }}
              className="absolute z-50 flex flex-col items-center"
            >
              <span className="text-4xl">{flyingItem.item.icon}</span>
              <span className="text-xl font-black text-red-500 bg-black/60 px-2 rounded">-{flyingItem.damage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-3 right-3">
          <button onClick={handleClose} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors">
            Rời Khỏi
          </button>
        </div>
        
        {phase === 'ready' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={handleStart}
              className="px-8 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-lg rounded-full shadow-lg shadow-amber-600/40 hover:scale-105 active:scale-95 transition-transform border-2 border-amber-300/30 flex items-center gap-2"
            >
              <Swords className="w-5 h-5" />
              Bắt Đầu
            </button>
          </div>
        )}
      </div>

      {/* 3. Stats + Inventories (Desktop Layout / Player Inventory Bottom on Mobile) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-0 md:p-2 gap-0 md:gap-2 bg-[#040e1a]">
        {/* Player A side (Bottom on Mobile) */}
        <div className="flex-1 flex flex-col bg-[#0d2137]/30 md:rounded-2xl p-2 border-t md:border border-cyan-800/20 overflow-hidden">
          <div className="mb-2 shrink-0 px-1">
            <div className="flex justify-between items-end mb-1">
               <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">⚔️ DMG: {myStats.weight}</span>
               <span className="text-[10px] font-bold text-red-300">{Math.max(0, Math.round(hpA))}/{maxHpA}</span>
            </div>
            {/* HP Bar */}
            <div className="h-3 bg-gray-900 rounded-full overflow-hidden mb-1 border border-white/5 shadow-inner">
              <motion.div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full" animate={{ width: `${Math.max(0, (hpA / maxHpA) * 100)}%` }} />
            </div>
            {/* Mana Bar */}
            <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <motion.div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full shadow-[0_0_8px_#3b82f6]" animate={{ width: `${(manaA / maxManaA) * 100}%` }} transition={{ duration: 0.1 }} />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto subtle-scrollbar min-h-0">
            <CombatInventoryGrid items={state.inventory} gridWidth={state.inventoryWidth} gridHeight={state.inventoryHeight} readOnly cellSize={Math.min(32, (window.innerWidth - 40) / Math.max(state.inventoryWidth, 6))} />
          </div>
        </div>

        {/* Player B side (Hidden on mobile top, visible on desktop right) */}
        <div className="hidden md:flex flex-1 flex-col bg-[#370d0d]/20 rounded-2xl p-3 border border-red-900/20">
          <div className="mb-3">
            <div className="flex justify-between items-end mb-1">
               <span className="text-[10px] font-bold text-red-300">{Math.max(0, Math.round(hpB))}/{maxHpB}</span>
               <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">⚔️ DMG: {encounter.totalWeight}</span>
            </div>
            {/* HP Bar */}
            <div className="h-4 bg-gray-900 rounded-full overflow-hidden mb-1.5 border border-white/5 shadow-inner">
              <motion.div className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full" animate={{ width: `${Math.max(0, (hpB / maxHpB) * 100)}%` }} />
            </div>
            {/* Mana Bar */}
            <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <motion.div className="h-full bg-gradient-to-r from-blue-600 to-purple-500 rounded-full" animate={{ width: `${(manaB / maxManaB) * 100}%` }} transition={{ duration: 0.1 }} />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto subtle-scrollbar">
            <CombatInventoryGrid items={encounter.inventory} gridWidth={6} gridHeight={4} readOnly cellSize={cellSize} />
          </div>
        </div>
      </div>

      {/* Result overlay */}
      <AnimatePresence>
        {phase === 'result' && combatResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`p-8 rounded-[40px] text-center max-w-sm mx-4 shadow-2xl ${
                combatResult.result === 'win' ? 'bg-gradient-to-b from-amber-800 to-amber-950 border-2 border-amber-500/50' : 'bg-gradient-to-b from-red-900 to-red-950 border-2 border-red-500/50'
              }`}
            >
              <span className="text-6xl block mb-4">{combatResult.result === 'win' ? '🏆' : '💀'}</span>
              <h3 className="text-3xl font-black mb-3 text-white tracking-tighter">{combatResult.result === 'win' ? 'CHIẾN THẮNG!' : 'THẤT BẠI'}</h3>
              
              {combatResult.result === 'win' && combatResult.loot?.length ? (
                <div className="mb-6 bg-black/30 p-4 rounded-2xl border border-white/5">
                  <p className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-3">Vật phẩm thu được</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {combatResult.loot.map(item => (
                      <div key={item.uid} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl" title={item.name}>{item.icon}</div>
                    ))}
                  </div>
                </div>
              ) : combatResult.result === 'lose' && combatResult.droppedItems?.length ? (
                <div className="mb-6 bg-black/30 p-4 rounded-2xl border border-white/5">
                  <p className="text-xs font-bold text-red-300 uppercase tracking-widest mb-3">Vật phẩm bị mất (75%)</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {combatResult.droppedItems.map(item => (
                      <div key={item.uid} className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-xl opacity-40" title={item.name}>{item.icon}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-6 min-h-[40px]" />
              )}
              
              <button onClick={handleClose} className="w-full py-4 bg-white text-black rounded-2xl font-black hover:bg-gray-200 transition-colors active:scale-95 shadow-xl">
                TIẾP TỤC
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CombatScreen;
