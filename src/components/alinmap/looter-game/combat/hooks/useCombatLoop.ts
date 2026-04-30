import { useState, useEffect, useRef, useCallback } from 'react';
import type { LooterItem } from '../../backpack/types';
import type { LooterGameState, Encounter, CombatResult } from '../../LooterGameContext';

interface UseCombatLoopProps {
    state: LooterGameState;
    encounter: Encounter | null;
    executeCombat: (id: string, inv?: any[], hp?: number, bags?: any[]) => Promise<CombatResult>;
    setCombatResult: (res: CombatResult | null) => void;
    showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function useCombatLoop({
    state, encounter, executeCombat, setCombatResult, showNotification
}: UseCombatLoopProps) {
    const [phase, setPhase] = useState<'ready' | 'fighting' | 'result'>('ready');
    const [pendingResult, setPendingResult] = useState<CombatResult | null>(null);
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

    // Stats calculations
    const myStats = (initialPlayerInventory.length > 0 ? initialPlayerInventory : state.inventory)
        .filter(i => i.gridX >= 0)
        .reduce(
            (a, i) => ({ 
                hp: a.hp + (i.hpBonus || 0), 
                weight: a.weight + (i.weight || 0), 
                eMax: a.eMax + (i.energyMax || 0), 
                eRegen: a.eRegen + (i.energyRegen || 0) 
            }),
            { hp: 0, weight: 0, eMax: 0, eRegen: 0 }
        );

    const maxHpA = state.baseMaxHp + myStats.hp;
    const maxActionBarA = 100 + myStats.eMax;
    const maxHpB = encounter?.totalHp || 100;
    
    const botStats = (encounter?.isBot || encounter?.isGhost) ? (encounter?.inventory || []).reduce(
        (a: any, i: any) => ({ 
            hp: a.hp + (i.hpBonus || 0), 
            weight: a.weight + (i.weight || 0), 
            eMax: a.eMax + (i.energyMax || 0), 
            eRegen: a.eRegen + (i.energyRegen || 0) 
        }),
        { hp: 0, weight: 0, eMax: 0, eRegen: 0 }
    ) : { hp: 0, weight: 0, eMax: 0, eRegen: 0 };
    
    const maxActionBarB = 100 + botStats.eMax;

    useEffect(() => {
        if (encounter) {
            if (initialPlayerInventory.length === 0) {
                setInitialPlayerInventory(state.inventory);
            }
            setPhase('ready');
            const fullHpA = state.baseMaxHp + myStats.hp;
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

    const startCombatLoop = useCallback(() => {
        let lastTime = performance.now();
        let isAnimating = false;
        
        const loop = (now: number) => {
            const dt = now - lastTime;
            if (dt < 1000 / 30) {
                frameRef.current = requestAnimationFrame(loop);
                return;
            }
            lastTime = now;

            if (currentIdxRef.current >= combatLogRef.current.length) {
                if (!isAnimating) {
                    // Chỉ hiển thị kết quả khi đã xử lý xong log và không đang trong hoạt cảnh
                    setTimeout(() => {
                        setPhase('result');
                    }, 1500); // Tăng lên 1.5s để cảm nhận rõ hơn cái chết của đối thủ
                    return;
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

            const gainA = (15 + myStats.eRegen) * (dt / 1000) * 8;
            const gainB = (15 + botStats.eRegen) * (dt / 1000) * 8;
            
            actionProgressARef.current = Math.min(actionProgressARef.current + gainA, maxActionBarA);
            actionProgressBRef.current = Math.min(actionProgressBRef.current + gainB, maxActionBarB);
            setActionProgressA(actionProgressARef.current);
            setActionProgressB(actionProgressBRef.current);

            if (side === 'A') {
                if (actionProgressARef.current >= maxActionBarA) {
                    isAnimating = true;
                    setFlyingItem({ item: entry.item, from: 'A', damage: entry.damage });
                    
                    // HP giảm sau 400ms (khi vật phẩm bay tới gần đối thủ)
                    setTimeout(() => {
                        hpBRef.current = Math.max(0, entry.targetHp);
                        setHpB(hpBRef.current);
                    }, 400);

                    currentIdxRef.current++;
                    setTimeout(() => { setFlyingItem(null); isAnimating = false; }, 800);
                    actionProgressARef.current = 0;
                }
            } else {
                if (actionProgressBRef.current >= maxActionBarB) {
                    isAnimating = true;
                    setFlyingItem({ item: entry.item, from: 'B', damage: entry.damage });
                    
                    // HP giảm sau 400ms
                    setTimeout(() => {
                        hpARef.current = Math.max(0, entry.targetHp);
                        setHpA(hpARef.current);
                    }, 400);

                    currentIdxRef.current++;
                    setTimeout(() => { setFlyingItem(null); isAnimating = false; }, 800);
                    actionProgressBRef.current = 0;
                }
            }
            frameRef.current = requestAnimationFrame(loop);
        };
        frameRef.current = requestAnimationFrame(loop);
    }, [myStats, botStats, maxActionBarA, maxActionBarB]);

    const handleStart = async () => {
        if (!encounter) return;
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
            setHpA(pendingResult.finalHp);
            setHpB(pendingResult.result === 'win' ? 0 : 10);
        }
        setPhase('result');
    };

    useEffect(() => {
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, []);

    return {
        phase, setPhase,
        pendingResult, setPendingResult,
        actionProgressA, actionProgressB,
        hpA, hpB,
        maxHpA, maxHpB,
        maxActionBarA, maxActionBarB,
        myStats, botStats,
        initialPlayerInventory, setInitialPlayerInventory,
        flyingItem, setFlyingItem,
        handleStart, skipCombat,
        frameRef
    };
}
