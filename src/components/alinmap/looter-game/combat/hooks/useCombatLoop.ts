import { useState, useEffect, useRef, useCallback } from 'react';
import type { LooterItem } from '../../backpack/types';
import type { LooterGameState, Encounter, CombatResult } from '../../LooterGameContext';

const toFiniteNumber = (val: any, fallback = 0) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
};

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
        let lastUIUpdate = 0;
        let isAnimating = false;
        
        const loop = (now: number) => {
            const dt = now - lastTime;
            if (dt < 1000 / 60) { // Cố gắng chạy logic ở 60fps cho độ chính xác cao
                frameRef.current = requestAnimationFrame(loop);
                return;
            }
            lastTime = now;

            if (currentIdxRef.current >= combatLogRef.current.length) {
                if (!isAnimating) {
                    setTimeout(() => {
                        setPhase('result');
                    }, 1500);
                    return;
                }
                frameRef.current = requestAnimationFrame(loop);
                return;
            }

            // Hồi năng lượng luôn chạy liên tục để có cảm giác thời gian thực (10 + stats mỗi giây)
            const gainA = (10 + (myStats.eRegen || 0)) * (dt / 1000); 
            const gainB = (10 + (botStats.eRegen || 0)) * (dt / 1000);
            
            actionProgressARef.current = Math.min(actionProgressARef.current + gainA, maxActionBarA || 100);
            actionProgressBRef.current = Math.min(actionProgressBRef.current + gainB, maxActionBarB || 100);

            // Throttle UI updates to ~15fps (66ms) to reduce re-renders while keeping logic at 60fps
            if (now - lastUIUpdate > 66) {
                setActionProgressA(actionProgressARef.current);
                setActionProgressB(actionProgressBRef.current);
                lastUIUpdate = now;
            }

            // Nếu đang chạy animation tấn công thì không xử lý lệnh tiếp theo từ log
            if (isAnimating) {
                frameRef.current = requestAnimationFrame(loop);
                return;
            }

            const entry = combatLogRef.current[currentIdxRef.current];
            const side = entry.attacker;
            const cost = toFiniteNumber(entry.energySpent || entry.item?.energyCost, 10);

            if (side === 'A') {
                if (actionProgressARef.current >= cost) {
                    isAnimating = true;
                    setFlyingItem({ item: entry.item, from: 'A', damage: entry.damage });
                    
                    setTimeout(() => {
                        hpBRef.current = Math.max(0, entry.targetHp);
                        setHpB(hpBRef.current);
                    }, 400);

                    currentIdxRef.current++;
                    setTimeout(() => { setFlyingItem(null); isAnimating = false; }, 800);
                    actionProgressARef.current = Math.max(0, actionProgressARef.current - cost);
                    setActionProgressA(actionProgressARef.current); 
                }
            } else {
                if (actionProgressBRef.current >= cost) {
                    isAnimating = true;
                    setFlyingItem({ item: entry.item, from: 'B', damage: entry.damage });
                    
                    setTimeout(() => {
                        hpARef.current = Math.max(0, entry.targetHp);
                        setHpA(hpARef.current);
                    }, 400);

                    currentIdxRef.current++;
                    setTimeout(() => { setFlyingItem(null); isAnimating = false; }, 800);
                    actionProgressBRef.current = Math.max(0, actionProgressBRef.current - cost);
                    setActionProgressB(actionProgressBRef.current);
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
                // Cập nhật máu ngay cả khi không có log hoạt cảnh
                setHpA(result.finalHp ?? 0);
                if (result.result === 'win') setHpB(0);
                
                setCombatResult(result);
                if (result.result === 'win') showNotification('Bạn đã chiến thắng!', 'success');
                else showNotification('Bạn đã thất bại...', 'error');
                
                // Đợi một chút để user kịp nhìn thấy máu thay đổi rồi mới hiện popup
                setTimeout(() => {
                    setPhase('result');
                }, 800);
            }
        } catch {
            setPhase('result');
        }
    };

    const skipCombat = () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        if (pendingResult) {
            setHpA(pendingResult.finalHpA ?? pendingResult.finalHp ?? 0);
            setHpB(pendingResult.finalHpB ?? (pendingResult.result === 'win' ? 0 : 10));
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
