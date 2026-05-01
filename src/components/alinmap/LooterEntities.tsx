import React from 'react';
import { motion, MotionValue, useMotionTemplate, useTransform } from 'framer-motion';
import { DEGREES_TO_PX } from './constants';
import { useLooterState, useLooterActions } from './looter-game/LooterGameContext';

interface LooterEntitiesProps {
    myObfPos: { lat: number; lng: number };
    boatTargetPin: { lat: number; lng: number } | null;
    boatOffsetX: MotionValue<number>;
    boatOffsetY: MotionValue<number>;
    executeMoveToExact?: (lat: number, lng: number) => void;
}

const LooterItemEntity = React.memo(({ item, myObfPos, boatOffsetX, boatOffsetY, boatScaleStack, executeMoveToExact }: any) => {
    const { openFortressStorage, setShowMinigame, pickupItem, setDraggingMapItem } = useLooterActions();
    const isPortal = item?.item?.type === 'portal';
    const interactionRadius = 250 * (1 + boatScaleStack * 0.05);

    const distMetersTransform = useTransform(boatOffsetX || new MotionValue(0), (ox: number) => {
        const oy = boatOffsetY?.get() || 0;
        const curLat = myObfPos.lat - oy / DEGREES_TO_PX;
        const curLng = myObfPos.lng + ox / DEGREES_TO_PX;
        const dLat = item.lat - curLat;
        const dLng = item.lng - curLng;
        const cosLat = Math.cos((curLat * Math.PI) / 180);
        const distDeg = Math.sqrt(Math.pow(dLat, 2) + Math.pow(dLng * cosLat, 2));
        return Math.round(distDeg * 111000);
    });

    const distText = useTransform(distMetersTransform, (d) => d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`);

    return (
        <motion.div
            data-looter-entity="true"
            data-map-interactive="true"
            className={`absolute flex flex-col items-center cursor-pointer z-[95] transition-transform hover:scale-125 ${isPortal ? 'w-14 h-14 -ml-7 -mt-7' : 'w-10 h-10 -ml-5 -mt-5'}`}
            style={{
                top: `calc(50% + ${-(item.lat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                left: `calc(50% + ${(item.lng - myObfPos.lng) * DEGREES_TO_PX}px)`
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, y: [-2, 2, -2] }}
            transition={{ 
                scale: { type: "spring", stiffness: 260, damping: 20 },
                opacity: { duration: 0.5 },
                y: { duration: isPortal ? 3.2 : 2.5, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 2 }
            }}
            onClick={(e) => {
                e.stopPropagation();
                const currentDist = distMetersTransform.get();
                if (isPortal) {
                    if (currentDist <= interactionRadius) {
                        openFortressStorage?.('portal');
                    } else {
                        executeMoveToExact?.(item.lat, item.lng);
                    }
                } else {
                    if (currentDist <= interactionRadius) {
                        if (item.minigameType) {
                            setShowMinigame?.(item);
                        } else {
                            pickupItem?.(item.spawnId);
                        }
                    } else {
                       executeMoveToExact?.(item.lat, item.lng);
                    }
                }
            }}
            onPointerDown={(e) => {
                const currentDist = distMetersTransform.get();
                // Chỉ cho phép kéo đối với vật phẩm nhặt ngay (không có minigame)
                if (!isPortal && !item.minigameType && currentDist <= interactionRadius) {
                    e.stopPropagation();
                    setDraggingMapItem?.(item);
                }
            }}
            onPointerUp={(e) => {
                setDraggingMapItem?.(null);
            }}
        >
            <div className="relative group flex flex-col items-center">
                {/* Glow Effect when in range */}
                <motion.div
                    style={{
                        opacity: useTransform(distMetersTransform, (d) => d <= interactionRadius ? 1 : 0),
                        scale: useTransform(distMetersTransform, (d) => d <= interactionRadius ? [1, 1.2, 1] : 1)
                    }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute inset-0 -m-4 bg-cyan-400/30 blur-2xl rounded-full z-[-1]"
                />
                <motion.div
                    style={{
                        boxShadow: useTransform(distMetersTransform, (d) => 
                            d <= interactionRadius 
                            ? `0 0 20px 2px rgba(34, 211, 238, 0.4)` 
                            : `0 0 0px 0px rgba(0,0,0,0)`
                        )
                    }}
                    className="relative flex items-center justify-center rounded-full transition-all duration-300"
                >
                    <span className={`${isPortal ? 'text-4xl' : 'text-2xl'} drop-shadow-md group-hover:animate-bounce`}>
                        {item.item?.icon || '💎'}
                    </span>
                </motion.div>
                <div className="mt-0 flex flex-col items-center pointer-events-none">
                    <span className="text-[7px] font-black uppercase tracking-tighter leading-none text-cyan-200 whitespace-nowrap drop-shadow-md">{item.item?.name}</span>
                    <motion.span 
                        style={{
                            color: useTransform(distMetersTransform, (d) => d <= interactionRadius ? '#22d3ee' : '#ffffff')
                        }}
                        className="text-[6px] font-bold tabular-nums drop-shadow-md"
                    >
                        {distText}
                    </motion.span>
                </div>
            </div>
        </motion.div>
    );
});

const FortressEntity = React.memo(({ fortressLat, fortressLng, myObfPos, boatOffsetX, boatOffsetY, boatScaleStack, executeMoveToExact, openFortressStorage }: any) => {
    const fInteractionRadius = 100 * (1 + boatScaleStack * 0.05);

    const fDistTransform = useTransform(boatOffsetX || new MotionValue(0), (ox: number) => {
        const oy = boatOffsetY?.get() || 0;
        const fLat = fortressLat - (myObfPos.lat - oy / DEGREES_TO_PX);
        const fLng = fortressLng - (myObfPos.lng + ox / DEGREES_TO_PX);
        return Math.round(Math.sqrt(fLat * fLat + fLng * fLng) * 111000);
    });

    const fText = useTransform(fDistTransform, (d) => {
        if (d <= 100) return 'Thành Trì';
        return d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`;
    });
    const fColorClass = useTransform(fDistTransform, (d) => d <= 100 ? 'text-emerald-400' : 'text-gray-300');

    return (
        <div
            data-looter-entity="true"
            data-map-interactive="true"
            onClick={(e) => {
                e.stopPropagation();
                const dist = fDistTransform.get();
                if (dist <= fInteractionRadius) {
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
        >
            <div className="relative flex flex-col items-center group">
                <span className="text-6xl drop-shadow-lg">🏝️</span>
                <motion.div className="absolute -bottom-1 whitespace-nowrap text-[10px] font-black drop-shadow-md" style={{ color: fColorClass as any }}>
                    <motion.span>{fText}</motion.span>
                </motion.div>
            </div>
        </div>
    );
});

const LooterEntities: React.FC<LooterEntitiesProps> = ({
    myObfPos, boatTargetPin, boatOffsetX, boatOffsetY, executeMoveToExact
}) => {
    const { state: looterStateObj, worldItems } = useLooterState();
    const { openFortressStorage } = useLooterActions();
    
    // Chỉ lấy các giá trị cần thiết để giảm re-render
    const fortressLat = looterStateObj?.fortressLat;
    const fortressLng = looterStateObj?.fortressLng;
    const boatScaleStack = looterStateObj?.activeCurses?.boat_scale || 0;
    const [visibleItemIds, setVisibleItemIds] = React.useState<Set<string>>(new Set());
    const lastPosRef = React.useRef({ lat: 0, lng: 0 });

    // Culling Logic: Kiểm tra vật phẩm nào trong tầm nhìn mỗi 500ms
    React.useEffect(() => {
        if (!worldItems) return;

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

            for (const item of worldItems) {
                // Bounding box check (nhanh hơn Math.sqrt)
                if (Math.abs(item.lat - curLat) < CULL_DEG && Math.abs(item.lng - curLng) < CULL_DEG) {
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
    }, [worldItems, myObfPos?.lat, myObfPos?.lng]);

    const lineX1 = useTransform(boatOffsetX, (v: number) => Math.round(5000 + v));
    const lineY1 = useTransform(boatOffsetY, (v: number) => Math.round(5000 + v));

    const lineX2 = boatTargetPin ? Math.round(5000 + (boatTargetPin.lng - myObfPos.lng) * DEGREES_TO_PX) : 0;
    const lineY2 = boatTargetPin ? Math.round(5000 + -(boatTargetPin.lat - myObfPos.lat) * DEGREES_TO_PX) : 0;

    return (
        <>
            {/* SVG Layer for lines */}
            {boatTargetPin && (
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

            {fortressLat && (
                <FortressEntity 
                    fortressLat={fortressLat}
                    fortressLng={fortressLng}
                    myObfPos={myObfPos} 
                    boatOffsetX={boatOffsetX} 
                    boatOffsetY={boatOffsetY} 
                    boatScaleStack={boatScaleStack}
                    executeMoveToExact={executeMoveToExact} 
                    openFortressStorage={openFortressStorage}
                />
            )}

            {boatTargetPin && (
                <div
                    className="absolute w-12 h-12 -ml-6 -mt-12 flex items-center justify-center pointer-events-none z-[85]"
                    style={{
                        top: `calc(50% + ${-(boatTargetPin.lat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                        left: `calc(50% + ${(boatTargetPin.lng - myObfPos.lng) * DEGREES_TO_PX}px)`
                    }}
                >
                    <span className="text-3xl animate-bounce drop-shadow-md">📍</span>
                </div>
            )}

            {worldItems?.filter((item: any) => visibleItemIds.has(item.spawnId)).map((item: any) => (
                <LooterItemEntity 
                    key={item.spawnId}
                    item={item}
                    myObfPos={myObfPos}
                    boatOffsetX={boatOffsetX}
                    boatOffsetY={boatOffsetY}
                    boatScaleStack={boatScaleStack}
                    executeMoveToExact={executeMoveToExact}
                />
            ))}
        </>
    );
};

export default LooterEntities;
