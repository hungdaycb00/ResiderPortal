import React, { useState, useEffect, useRef } from 'react';
import { X, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLooterState, useLooterActions } from './LooterGameContext';
import type { LooterItem } from './backpack';
import { CombatInventoryGrid } from './backpack';

const CombatScreen: React.FC = () => {
  const { state, encounter, combatResult } = useLooterState();
  const { setEncounter, executeCombat, setCombatResult, loadState, curseChoice, showNotification } = useLooterActions();
  const [phase, setPhase] = useState<'ready' | 'fighting' | 'result'>('ready');
  const [pendingResult, setPendingResult] = useState<any | null>(null);
  const [showFleeConfirm, setShowFleeConfirm] = useState(false);
  const [selectedResultItem, setSelectedResultItem] = useState<LooterItem | null>(null);
  const [actionProgressA, setActionProgressA] = useState(0);
  const [actionProgressB, setActionProgressB] = useState(0);
  const [hpA, setHpA] = useState(0);
  const [hpB, setHpB] = useState(0);
  const [initialPlayerInventory, setInitialPlayerInventory] = useState<LooterItem[]>([]);
  const [flyingItem, setFlyingItem] = useState<{ item: LooterItem; from: 'A' | 'B'; damage: number } | null>(null);
  const combatLogRef = useRef<any[]>([]);
  const currentIdxRef = useRef(0);
  const frameRef = useRef<number>();

  const actionProgressARef = useRef(0);
  const actionProgressBRef = useRef(0);
  const hpARef = useRef(0);
  const hpBRef = useRef(0);

  useEffect(() => {
    if (encounter) {
      if (initialPlayerInventory.length === 0) {
        setInitialPlayerInventory(state.inventory);
      }
      // Initialize HP bars to full when encounter first appears
      setPhase('ready');
      setShowFleeConfirm(false);
      const myStatsInit = state.inventory.filter(i => i.gridX >= 0).reduce(
        (a, i) => ({ hp: a.hp + i.hpBonus, weight: a.weight + i.weight }),
        { hp: 0, weight: 0 }
      );
      const fullHpA = state.baseMaxHp + myStatsInit.hp;
      const fullHpB = encounter.totalHp;
      setHpA(fullHpA);
      setHpB(fullHpB);
      hpARef.current = fullHpA;
      hpBRef.current = fullHpB;
      setActionProgressA(0);
      setActionProgressB(0);
      actionProgressARef.current = 0;
      actionProgressBRef.current = 0;
    }
  }, [encounter]);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  if (!encounter) return null;

  const myStats = (initialPlayerInventory.length > 0 ? initialPlayerInventory : state.inventory).filter(i => i.gridX >= 0).reduce(
    (a, i) => ({ hp: a.hp + i.hpBonus, weight: a.weight + i.weight, eMax: a.eMax + i.energyMax, eRegen: a.eRegen + i.energyRegen }),
    { hp: 0, weight: 0, eMax: 0, eRegen: 0 }
  );

  const maxHpA = state.baseMaxHp + myStats.hp;
  const maxActionBarA = 100 + myStats.eMax;
  const maxHpB = encounter.totalHp;
  const botStats = (encounter.isBot || encounter.isGhost) ? (encounter.inventory || []).reduce(
    (a: any, i: any) => ({ hp: a.hp + i.hpBonus, weight: a.weight + i.weight, eMax: a.eMax + i.energyMax, eRegen: a.eRegen + i.energyRegen }),
    { hp: 0, weight: 0, eMax: 0, eRegen: 0 }
  ) : { hp: 0, weight: 0, eMax: 0, eRegen: 0 };
  const maxActionBarB = 100 + botStats.eMax;

  const handleStart = async () => {
    setPhase('fighting');
    hpARef.current = maxHpA;
    hpBRef.current = maxHpB;
    actionProgressARef.current = 0;
    actionProgressBRef.current = 0;
    setHpA(maxHpA);
    setHpB(maxHpB);
    setActionProgressA(0);
    setActionProgressB(0);
    currentIdxRef.current = 0;

    try {
      const result = await executeCombat(
        encounter.id,
        encounter.isBot ? encounter.inventory : undefined,
        encounter.isBot ? encounter.baseMaxHp : undefined,
        encounter.isBot ? encounter.bags : undefined
      );

      setPendingResult(result);

      if (result.combatLog?.length) {
        combatLogRef.current = result.combatLog;
        startCombatLoop();
      } else {
        setCombatResult(result);
        if (result.result === 'win') showNotification('Bạn đã chiến thắng!', 'success');
        else showNotification('Bạn đã thất bại...', 'error');
        setPhase('result');
      }
    } catch {
      setPhase('result');
    }
  };

  const skipCombat = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (pendingResult) {
        // Cập nhật HP về trạng thái cuối cùng
        setHpA(pendingResult.finalHp);
        setHpB(pendingResult.result === 'win' ? 0 : 10);
    }
    setPhase('result');
  };

  const startCombatLoop = () => {
    let lastTime = performance.now();
    let isAnimating = false;
    
    const loop = (now: number) => {
      const dt = now - lastTime;

      if (dt < 1000 / 30) { // Lock to 30 FPS
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      lastTime = now;

      if (currentIdxRef.current >= combatLogRef.current.length) {
        if (!isAnimating) {
          setPhase('result');
        }
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      if (isAnimating) {
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      const entry = combatLogRef.current[currentIdxRef.current];
      const side = entry.attacker;

      // Both sides gain action (dt is ~33ms at 30fps)
      const gainA = (15 + myStats.eRegen) * (dt / 1000) * 10;
      const gainB = (15 + botStats.eRegen) * (dt / 1000) * 10;
      
      actionProgressARef.current = Math.min(actionProgressARef.current + gainA, maxActionBarA);
      actionProgressBRef.current = Math.min(actionProgressBRef.current + gainB, maxActionBarB);
      setActionProgressA(actionProgressARef.current);
      setActionProgressB(actionProgressBRef.current);

      if (side === 'A') {
        if (actionProgressARef.current >= maxActionBarA) {
          isAnimating = true;
          setFlyingItem({ item: entry.item, from: 'A', damage: entry.damage });
          hpBRef.current = Math.max(0, entry.targetHp);
          setHpB(hpBRef.current);
          currentIdxRef.current++;
          setTimeout(() => {
              setFlyingItem(null);
              isAnimating = false;
          }, 800);
          actionProgressARef.current = 0;
        }
      } else {
        if (actionProgressBRef.current >= maxActionBarB) {
          isAnimating = true;
          setFlyingItem({ item: entry.item, from: 'B', damage: entry.damage });
          hpARef.current = Math.max(0, entry.targetHp);
          setHpA(hpARef.current);
          currentIdxRef.current++;
          setTimeout(() => {
              setFlyingItem(null);
              isAnimating = false;
          }, 800);
          actionProgressBRef.current = 0;
        }
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
  };

  const handleClose = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    
    // Chỉ set kết quả toàn cục khi đóng màn hình này
    if (pendingResult) {
        setCombatResult(pendingResult);
        if (pendingResult.result === 'win') showNotification('Bạn đã chiến thắng!', 'success');
        else showNotification('Bạn đã thất bại...', 'error');
    }

    setEncounter(null);
    setPhase('ready');
    setInitialPlayerInventory([]);
    setPendingResult(null);
    loadState();
  };

  const handleFlee = async () => {
    setShowFleeConfirm(false);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    await curseChoice('flee');
    setEncounter(null);
    setPhase('ready');
    setInitialPlayerInventory([]);
    setCombatResult(null);
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
        <div className="flex-1 flex justify-center items-center overflow-auto subtle-scrollbar">
           <CombatInventoryGrid items={encounter.inventory} gridWidth={6} gridHeight={4} bag={encounter.bags?.[0]} readOnly cellSize={Math.min(32, (window.innerWidth - 40) / 6)} />
        </div>
        <div className="mt-2 pt-2 border-t border-red-900/20">
            <div className="flex justify-between items-end mb-1 px-1">
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">⚔️ DMG: {encounter.totalWeight}</span>
                 <span className="text-[9px] font-bold text-cyan-400">⚡ REGEN: +{(15 + botStats.eRegen) * 10}/s</span>
               </div>
               <span className="text-[10px] font-bold text-red-300">{Math.max(0, Math.round(hpB))}/{maxHpB}</span>
            </div>
            <div className="h-5 bg-gray-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <motion.div className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full" animate={{ width: `${Math.max(0, (hpB / maxHpB) * 100)}%` }} />
            </div>
            <div className="mt-1 h-5 bg-gray-900 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
              <motion.div className="h-full bg-gradient-to-r from-blue-600 to-purple-500 rounded-full" animate={{ width: `${(actionProgressB / maxActionBarB) * 100}%` }} transition={{ duration: 0.1 }} />
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white mix-blend-difference">
                {Math.round(actionProgressB)}/{maxActionBarB}
              </div>
            </div>
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

        {phase === 'ready' && (
          <div className="absolute top-3 right-3 z-30">
            <button 
              onClick={() => setShowFleeConfirm(true)} 
              className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg"
            >
              Bỏ Trốn
            </button>
          </div>
        )}

        {phase === 'fighting' && (
          <div className="absolute right-[20%] top-[20%] -translate-x-1/2 z-30">
            <button
              onClick={skipCombat}
              className="group flex items-center gap-2 px-3 py-1.5 bg-black/60 hover:bg-amber-600/80 border border-amber-500/30 rounded-xl transition-all active:scale-95 shadow-xl"
            >
              <span className="text-[10px] font-black text-amber-400 group-hover:text-white uppercase tracking-tighter">Kết thúc nhanh</span>
              <div className="flex gap-0.5">
                <div className="w-1 h-3 bg-amber-500 rounded-full animate-pulse" />
                <div className="w-1 h-3 bg-amber-500 rounded-full animate-pulse [animation-delay:0.2s]" />
              </div>
            </button>
          </div>
        )}
        
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
          <div className="mt-1 mb-2 shrink-0 px-1">
            <div className="flex justify-between items-end mb-1">
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">⚔️ DMG: {myStats.weight}</span>
                 <span className="text-[9px] font-bold text-cyan-300">⚡ REGEN: +{(15 + myStats.eRegen) * 10}/s</span>
               </div>
               <span className="text-[10px] font-bold text-red-300">{Math.max(0, Math.round(hpA))}/{maxHpA}</span>
            </div>
            {/* HP Bar */}
            <div className="h-5 bg-gray-900 rounded-full overflow-hidden mb-1 border border-white/5 shadow-inner">
              <motion.div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full" animate={{ width: `${Math.max(0, (hpA / maxHpA) * 100)}%` }} />
            </div>
            {/* Action Bar */}
            <div className="h-5 bg-gray-900 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
              <motion.div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full shadow-[0_0_8px_#3b82f6]" animate={{ width: `${(actionProgressA / maxActionBarA) * 100}%` }} transition={{ duration: 0.1 }} />
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white mix-blend-difference">
                {Math.round(actionProgressA)}/{maxActionBarA}
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto subtle-scrollbar min-h-0">
            <CombatInventoryGrid items={initialPlayerInventory} gridWidth={state.inventoryWidth} gridHeight={state.inventoryHeight} readOnly cellSize={Math.min(32, (window.innerWidth - 40) / Math.max(state.inventoryWidth, 6))} />
          </div>
        </div>

        {/* Player B side (Hidden on mobile top, visible on desktop right) */}
        <div className="hidden md:flex flex-1 flex-col bg-[#370d0d]/20 rounded-2xl p-3 border border-red-900/20">
          <div className="mb-3 shrink-0 border-b border-red-900/20 pb-3">
            <div className="flex justify-between items-end mb-1">
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">⚔️ DMG: {encounter.totalWeight}</span>
                 <span className="text-[9px] font-bold text-cyan-400">⚡ REGEN: +{(15 + botStats.eRegen) * 10}/s</span>
               </div>
               <span className="text-[10px] font-bold text-red-300">{Math.max(0, Math.round(hpB))}/{maxHpB}</span>
            </div>
            {/* HP Bar */}
            <div className="h-6 bg-gray-900 rounded-full overflow-hidden mb-1.5 border border-white/5 shadow-inner">
              <motion.div className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full" animate={{ width: `${Math.max(0, (hpB / maxHpB) * 100)}%` }} />
            </div>
            {/* Action Bar */}
            <div className="h-5 bg-gray-900 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
              <motion.div className="h-full bg-gradient-to-r from-blue-600 to-purple-500 rounded-full" animate={{ width: `${(actionProgressB / maxActionBarB) * 100}%` }} transition={{ duration: 0.1 }} />
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white mix-blend-difference">
                {Math.round(actionProgressB)}/{maxActionBarB}
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto subtle-scrollbar min-h-0">
            <CombatInventoryGrid items={encounter.inventory} gridWidth={6} gridHeight={4} bag={encounter.bags?.[0]} readOnly cellSize={cellSize} />
          </div>
        </div>
      </div>

      {/* Flee Confirmation Overlay */}
      <AnimatePresence>
        {showFleeConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0d2137] border border-red-500/30 p-8 rounded-[32px] text-center max-w-xs mx-4 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/40">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Thoát khỏi Ghost?</h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                Bạn đang cố gắng chạy trốn! Cái giá của sự hèn nhát là không hề nhỏ.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleFlee()}
                  className="w-full py-4 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 font-bold rounded-2xl transition-all flex flex-col items-center leading-tight shadow-lg shadow-red-900/40"
                >
                  <span className="text-sm uppercase">Chấp nhận số phận</span>
                  <span className="text-[9px] text-red-400/70">Mất 75% vật phẩm trong Balo</span>
                </button>
                <button 
                  onClick={() => setShowFleeConfirm(false)}
                  className="w-full py-3 text-gray-500 text-[10px] font-bold uppercase tracking-widest hover:text-gray-300 transition-colors mt-2"
                >
                  Ở lại chiến đấu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result overlay */}
      <AnimatePresence>
        {phase === 'result' && pendingResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`p-8 rounded-[40px] text-center max-w-sm mx-4 shadow-2xl ${
                pendingResult.result === 'win' ? 'bg-gradient-to-b from-amber-800 to-amber-950 border-2 border-amber-500/50' : 'bg-gradient-to-b from-red-900 to-red-950 border-2 border-red-500/50'
              }`}
            >
              <span className="text-6xl block mb-4">{pendingResult.result === 'win' ? '🏆' : '💀'}</span>
              <h3 className="text-3xl font-black mb-3 text-white tracking-tighter">{pendingResult.result === 'win' ? 'CHIẾN THẮNG!' : 'THẤT BẠI'}</h3>
              
              {pendingResult.result === 'win' && pendingResult.loot?.length ? (
                <div className="mb-6 bg-black/30 p-4 rounded-2xl border border-white/5">
                  <p className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-3">Vật phẩm thu được</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {pendingResult.loot.map((item: any) => (
                      <div
                        key={item.uid}
                        onClick={() => setSelectedResultItem(selectedResultItem?.uid === item.uid ? null : item)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl cursor-pointer transition-all active:scale-90 ${selectedResultItem?.uid === item.uid ? 'bg-amber-500/30 ring-2 ring-amber-400' : 'bg-white/5 hover:bg-white/10'}`}
                      >
                        {item.icon}
                      </div>
                    ))}
                  </div>
                  {selectedResultItem && (
                    <div className="mt-3 p-3 bg-black/40 rounded-xl border border-white/10 text-left">
                      <p className="text-sm font-black text-white">{selectedResultItem.name}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{selectedResultItem.rarity} • {selectedResultItem.gridW}x{selectedResultItem.gridH}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
                        {selectedResultItem.weight > 0 && <span className="text-orange-300">⚔ {selectedResultItem.weight} DMG</span>}
                        {selectedResultItem.hpBonus > 0 && <span className="text-red-300">❤ +{selectedResultItem.hpBonus} HP</span>}
                        {selectedResultItem.energyMax > 0 && <span className="text-blue-300">⚡ +{selectedResultItem.energyMax} EN</span>}
                        {selectedResultItem.energyRegen > 0 && <span className="text-green-300">✦ +{selectedResultItem.energyRegen} Regen</span>}
                      </div>
                    </div>
                  )}
                </div>
              ) : pendingResult.result === 'lose' && pendingResult.droppedItems?.length ? (
                <div className="mb-6 bg-black/30 p-4 rounded-2xl border border-white/5">
                  <p className="text-xs font-bold text-red-300 uppercase tracking-widest mb-3">Vật phẩm bị mất (75%)</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {pendingResult.droppedItems.map((item: any) => (
                      <div key={item.uid} className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-xl opacity-40" title={item.name}>{item.icon}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-6 min-h-[40px]" />
              )}
              
              <button 
                onClick={handleClose} 
                className={`w-full py-5 rounded-2xl font-black transition-all active:scale-95 shadow-xl uppercase tracking-tighter ${
                  pendingResult.result === 'lose' ? 'bg-white text-black hover:bg-gray-200' : 'bg-amber-500 text-black hover:bg-amber-400'
                }`}
              >
                {pendingResult.result === 'lose' ? 'Về Thành Trì' : 'Tiếp tục'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CombatScreen;
