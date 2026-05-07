import React from 'react';
import { motion, MotionValue, useMotionTemplate, useTransform } from 'framer-motion';
import { DEGREES_TO_PX } from './constants';
import { sanitizeWorldItems, useLooterState, useLooterActions } from './looter-game/LooterGameContext';

const billboardTransform = (_: any, generated: string) =>
    `${generated} scale(var(--alin-map-node-counter-scale))`;

interface LooterEntitiesProps {
    myObfPos: { lat: number; lng: number };
    looterState?: any;
    boatTargetPin: { lat: number; lng: number } | null;
    boatOffsetX: MotionValue<number>;
    boatOffsetY: MotionValue<number>;
    executeMoveToExact?: (lat: number, lng: number) => void;
    stopBoat?: () => void;
}

const LooterItemEntity = React.memo(({ item, myObfPos, boatOffsetX, boatOffsetY, boatScaleStack, executeMoveToExact, stopBoat, reduceMotion }: any) => {
    const { openFortressStorage, setShowMinigame, pickupItem } = useLooterActions();
    const isPortal = item?.item?.type === 'portal';
    const interactionRadius = 250;
    const animationDelayRef = React.useRef(Math.random() * 2);

    const distMetersTransform = useTransform([boatOffsetX || new MotionValue(0), boatOffsetY || new MotionValue(0)], ([ox, oy]: number[]) => {
        const curLat = myObfPos.lat - oy / DEGREES_TO_PX;
        const curLng = myObfPos.lng + ox / DEGREES_TO_PX;
        const dLat = item.lat - curLat;
        const dLng = item.lng - curLng;
        const cosLat = Math.cos((curLat * Math.PI) / 180);
        const distDeg = Math.sqrt(Math.pow(dLat, 2) + Math.pow(dLng * cosLat, 2));
        return Math.round(distDeg * 111000);
    });

    const distText = useTransform(distMetersTransform, (d) => d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`);

    const lastPickupTimeRef = React.useRef<number>(0);

    return (
        <div
            data-looter-entity="true"
            data-map-interactive="true"
            className={`absolute flex flex-col items-center cursor-pointer z-[95] ${isPortal ? 'w-16 h-16 -ml-8 -mt-8' : 'w-12 h-12 -ml-6 -mt-6'}`}
            style={{
                top: `calc(50% + ${-(item.lat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                left: `calc(50% + ${(item.lng - myObfPos.lng) * DEGREES_TO_PX}px)`,
                transformOrigin: 'center bottom'
            }}
            onClick={(e) => {
                e.stopPropagation();

                const now = Date.now();
                if (now - lastPickupTimeRef.current < 300) return;
                lastPickupTimeRef.current = now;

                const currentDist = distMetersTransform.get();
                const ox = boatOffsetX?.get?.() ?? 0;
                const oy = boatOffsetY?.get?.() ?? 0;
                const currentLat = myObfPos.lat - oy / DEGREES_TO_PX;
                const currentLng = myObfPos.lng + ox / DEGREES_TO_PX;
                const clickTolerance = interactionRadius;

                if (isPortal) {
                    if (currentDist <= interactionRadius) {
                        stopBoat?.();
                        openFortressStorage?.('portal');
                    } else {
                        executeMoveToExact?.(item.lat, item.lng);
                    }
                } else {
                    if (currentDist <= clickTolerance) {
                        if (item.minigameType) {
                            stopBoat?.();
                            setShowMinigame?.({ ...item, currentLat, currentLng });
                        } else {
                            stopBoat?.();
                            pickupItem?.(item.spawnId, item, currentLat, currentLng);
                        }
                    } else {
                        executeMoveToExact?.(item.lat, item.lng);
                    }
                }
            }}
        />
    );
});

const FortressEntity = React.memo(({ fortressLat, fortressLng, myObfPos, boatOffsetX, boatOffsetY, boatScaleStack, executeMoveToExact, openFortressStorage, stopBoat }: any) => {
    // Tăng bán kính tương tác thành trì lên 250m để đồng bộ cảm giác nhặt đồ
    const fInteractionRadius = 250;

    const fDistTransform = useTransform(boatOffsetX || new MotionValue(0), (ox: number) => {
        const oy = boatOffsetY?.get() || 0;
        const curLat = myObfPos.lat - oy / DEGREES_TO_PX;
        const curLng = myObfPos.lng + ox / DEGREES_TO_PX;
        const dLat = fortressLat - curLat;
        const dLng = fortressLng - curLng;
        const cosLat = Math.cos((curLat * Math.PI) / 180);
        const distDeg = Math.sqrt(Math.pow(dLat, 2) + Math.pow(dLng * cosLat, 2));
        return Math.round(distDeg * 111000);
    });

    return (
        <div
            data-looter-entity="true"
            data-map-interactive="true"
            onClick={(e) => {
                e.stopPropagation();
                const dist = fDistTransform.get();
                if (dist <= fInteractionRadius) {
                    stopBoat?.();
                    openFortressStorage?.('fortress');
                } else {
                    executeMoveToExact?.(fortressLat, fortressLng);
                }
            }}
            onPointerDown={(e) => {}}
            onPointerUp={(e) => {}}
            className="absolute w-24 h-24 -ml-12 -mt-12 flex items-center justify-center pointer-events-auto cursor-pointer z-[90]"
            style={{
                top: `calc(50% + ${-(fortressLat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                left: `calc(50% + ${(fortressLng - myObfPos.lng) * DEGREES_TO_PX}px)`
            }}
        />
    );
});

const CombatEnemyBoat = React.memo(() => null);

const LooterEntities: React.FC<LooterEntitiesProps> = ({
    myObfPos, boatTargetPin, boatOffsetX, boatOffsetY, executeMoveToExact, stopBoat
}) => {
    const { state: looterStateObj, worldItems, encounter } = useLooterState();
    const { openFortressStorage } = useLooterActions();
    const safeWorldItems = React.useMemo(() => sanitizeWorldItems(worldItems), [worldItems]);
    
    // Chỉ lấy các giá trị cần thiết để giảm re-render
    const fortressLat = looterStateObj?.fortressLat;
    const fortressLng = looterStateObj?.fortressLng;
    const boatScaleStack = looterStateObj?.activeCurses?.boat_scale || 0;
    const [visibleItemIds, setVisibleItemIds] = React.useState<Set<string>>(new Set());
    const [isMobileViewport, setIsMobileViewport] = React.useState(() => window.innerWidth < 768);
    const lastPosRef = React.useRef({ lat: 0, lng: 0 });

    React.useEffect(() => {
        const onResize = () => setIsMobileViewport(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Culling Logic: Kiểm tra vật phẩm nào trong tầm nhìn mỗi 500ms
    React.useEffect(() => {
        if (!safeWorldItems.length) return;

        const updateVisibility = () => {
            const ox = boatOffsetX.get();
            const oy = boatOffsetY.get();
            const curLat = myObfPos.lat - oy / DEGREES_TO_PX;
            const curLng = myObfPos.lng + ox / DEGREES_TO_PX;

            // Chỉ tính toán lại nếu di chuyển đáng kể (> 50m)
            const dLat = curLat - lastPosRef.current.lat;
            const dLng = curLng - lastPosRef.current.lng;
            const distMoved = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;
            if (distMoved < 50 && visibleItemIds.size > 0) return;

            lastPosRef.current = { lat: curLat, lng: curLng };
            const nextVisible = new Set<string>();
            const CULL_DEG = 5000 / 111000; // Khoảng 0.045 độ

            const activeCullDeg = isMobileViewport ? 3200 / 111000 : CULL_DEG;

            for (const item of safeWorldItems) {
                // Bounding box check (nhanh hơn Math.sqrt)
                if (Math.abs(item.lat - curLat) < activeCullDeg && Math.abs(item.lng - curLng) < activeCullDeg) {
                    nextVisible.add(item.spawnId);
                }
            }

            setVisibleItemIds(prev => {
                if (prev.size !== nextVisible.size) return nextVisible;
                for (const id of nextVisible) {
                    if (!prev.has(id)) return nextVisible;
                }
                return prev;
            });
        };

        const timer = setInterval(updateVisibility, 500);
        updateVisibility();
        return () => clearInterval(timer);
    }, [safeWorldItems, myObfPos?.lat, myObfPos?.lng, isMobileViewport]);

    const renderedWorldItems = React.useMemo(() => {
        if (!safeWorldItems.length) return [];
        const curLat = lastPosRef.current.lat || myObfPos.lat;
        const curLng = lastPosRef.current.lng || myObfPos.lng;
        const maxItems = isMobileViewport ? 28 : 90;

        return safeWorldItems
            .filter((item: any) => visibleItemIds.has(item.spawnId))
            .map((item: any) => {
                const isPortal = item?.item?.type === 'portal';
                const dLat = item.lat - curLat;
                const dLng = item.lng - curLng;
                return { item, sortScore: (isPortal ? -1 : 0) + dLat * dLat + dLng * dLng };
            })
            .sort((a, b) => a.sortScore - b.sortScore)
            .slice(0, maxItems)
            .map(entry => entry.item);
    }, [safeWorldItems, visibleItemIds, myObfPos.lat, myObfPos.lng, isMobileViewport]);

    const lineX1 = useTransform(boatOffsetX, (v: number) => Math.round(5000 + v));
    const lineY1 = useTransform(boatOffsetY, (v: number) => Math.round(5000 + v));

    const lineX2 = boatTargetPin ? Math.round(5000 + (boatTargetPin.lng - myObfPos.lng) * DEGREES_TO_PX) : 0;
    const lineY2 = boatTargetPin ? Math.round(5000 + -(boatTargetPin.lat - myObfPos.lat) * DEGREES_TO_PX) : 0;

    return (
        <>
            {/* SVG Layer for lines - ẩn khi combat */}
            {!encounter && boatTargetPin && (
                <svg className="absolute top-0 left-0 w-[10000px] h-[10000px] pointer-events-none z-[84]" style={{ overflow: 'visible' }}>
                    <motion.line
                        x1={lineX1}
                        y1={lineY1}
                        x2={lineX2}
                        y2={lineY2}
                        stroke="rgba(34, 211, 238, 0.6)" // cyan-400
                        strokeWidth="3"
                        strokeDasharray="8 8"
                        strokeLinecap="round"
                        className="animate-[dash_1s_linear_infinite]"
                    />
                </svg>
            )}

            {/* Fortress - ẩn khi combat */}
            {!encounter && fortressLat && (
                <FortressEntity 
                    fortressLat={fortressLat}
                    fortressLng={fortressLng}
                    myObfPos={myObfPos} 
                    boatOffsetX={boatOffsetX} 
                    boatOffsetY={boatOffsetY} 
                    boatScaleStack={boatScaleStack}
                    executeMoveToExact={executeMoveToExact} 
                    openFortressStorage={openFortressStorage}
                    stopBoat={stopBoat}
                />
            )}

            {/* Target Pin (invisible hitboxes if any are needed, but it's pointer-events-none) */}

            {/* Enemy Boat - chỉ hiện khi combat */}
            {encounter && (
                <CombatEnemyBoat 
                    encounter={encounter} 
                    boatOffsetX={boatOffsetX} 
                    boatOffsetY={boatOffsetY} 
                />
            )}

            {/* World Items - ẩn khi combat */}
            {!encounter && renderedWorldItems.map((item: any) => (
                <LooterItemEntity 
                    key={item.spawnId}
                    item={item}
                    myObfPos={myObfPos}
                    boatOffsetX={boatOffsetX}
                    boatOffsetY={boatOffsetY}
                    boatScaleStack={boatScaleStack}
                    executeMoveToExact={executeMoveToExact}
                    stopBoat={stopBoat}
                    reduceMotion={isMobileViewport}
                />
            ))}
        </>
    );
};

export default LooterEntities;
