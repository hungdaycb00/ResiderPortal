import React from 'react';
import { motion, MotionValue, useMotionTemplate, useTransform } from 'framer-motion';
import { DEGREES_TO_PX } from './constants';

interface SeaEntitiesProps {
    myObfPos: { lat: number; lng: number };
    seaState: any;
    seaGameCtx: any;
    boatTargetPin: { lat: number; lng: number } | null;
    boatOffsetX: MotionValue<number>;
    boatOffsetY: MotionValue<number>;
    executeMoveToExact?: (lat: number, lng: number) => void;
}

const SeaItemEntity = ({ item, myObfPos, boatOffsetX, boatOffsetY, boatScaleStack, executeMoveToExact, seaGameCtx }: any) => {
    const isPortal = item?.item?.type === 'portal';
    const interactionRadius = 100 * (1 + boatScaleStack * 0.05);

    const distMetersTransform = useTransform(boatOffsetX || new MotionValue(0), (ox: number) => {
        const oy = boatOffsetY?.get() || 0;
        const dLat = item.lat - (myObfPos.lat - oy / DEGREES_TO_PX);
        const dLng = item.lng - (myObfPos.lng + ox / DEGREES_TO_PX);
        const distDeg = Math.sqrt(dLat * dLat + dLng * dLng);
        return Math.round(distDeg * 111000);
    });

    const distText = useTransform(distMetersTransform, (d) => d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`);

    return (
        <motion.div
            data-sea-entity="true"
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
                        seaGameCtx?.openFortressStorage?.('portal');
                    } else {
                        executeMoveToExact?.(item.lat, item.lng);
                    }
                } else {
                    if (currentDist <= interactionRadius) {
                       seaGameCtx?.pickupItem?.(item.spawnId);
                    } else {
                       executeMoveToExact?.(item.lat, item.lng);
                    }
                }
            }}
            onPointerDown={(e) => {}}
            onPointerUp={(e) => {}}
        >
            <div className="relative group flex flex-col items-center">
                <span className={`${isPortal ? 'text-4xl' : 'text-2xl'} drop-shadow-md group-hover:animate-bounce`}>
                    {item.item?.icon || '💎'}
                </span>
                <div className="mt-0 flex flex-col items-center pointer-events-none">
                    <span className="text-[7px] font-black uppercase tracking-tighter leading-none text-cyan-200 whitespace-nowrap drop-shadow-md">{item.item?.name}</span>
                    <motion.span className="text-[6px] font-bold tabular-nums text-white drop-shadow-md">{distText}</motion.span>
                </div>
            </div>
        </motion.div>
    );
};

const FortressEntity = ({ seaState, myObfPos, boatOffsetX, boatOffsetY, executeMoveToExact, seaGameCtx }: any) => {
    const boatScaleStack = seaState?.activeCurses?.boat_scale || 0;
    const fInteractionRadius = 100 * (1 + boatScaleStack * 0.05);

    const fDistTransform = useTransform(boatOffsetX || new MotionValue(0), (ox: number) => {
        const oy = boatOffsetY?.get() || 0;
        const fLat = seaState.fortressLat - (myObfPos.lat - oy / DEGREES_TO_PX);
        const fLng = seaState.fortressLng - (myObfPos.lng + ox / DEGREES_TO_PX);
        return Math.round(Math.sqrt(fLat * fLat + fLng * fLng) * 111000);
    });

    const fText = useTransform(fDistTransform, (d) => {
        if (d <= 100) return 'Thành Trì';
        return d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`;
    });
    const fColorClass = useTransform(fDistTransform, (d) => d <= 100 ? 'text-emerald-400' : 'text-gray-300');

    return (
        <div
            data-sea-entity="true"
            data-map-interactive="true"
            onClick={(e) => {
                e.stopPropagation();
                const dist = fDistTransform.get();
                if (dist <= fInteractionRadius) {
                    seaGameCtx?.openFortressStorage?.('fortress');
                } else {
                    executeMoveToExact?.(seaState.fortressLat, seaState.fortressLng);
                }
            }}
            onPointerDown={(e) => {}}
            onPointerUp={(e) => {}}
            className="absolute w-24 h-24 -ml-12 -mt-12 flex items-center justify-center pointer-events-auto cursor-pointer z-[90]"
            style={{
                top: `calc(50% + ${-(seaState.fortressLat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                left: `calc(50% + ${(seaState.fortressLng - myObfPos.lng) * DEGREES_TO_PX}px)`
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
};

const SeaEntities: React.FC<SeaEntitiesProps> = ({
    myObfPos, seaState, seaGameCtx, boatTargetPin, boatOffsetX, boatOffsetY, executeMoveToExact
}) => {
    const [visibleItemIds, setVisibleItemIds] = React.useState<Set<string>>(new Set());
    const lastPosRef = React.useRef({ lat: 0, lng: 0 });

    // Culling Logic: Kiểm tra vật phẩm nào trong tầm nhìn mỗi 500ms
    React.useEffect(() => {
        if (!seaGameCtx?.worldItems) return;

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
            const CULL_DIST = 5000; // 5km visibility range

            for (const item of seaGameCtx.worldItems) {
                const iLat = item.lat - curLat;
                const iLng = item.lng - curLng;
                const dist = Math.sqrt(iLat * iLat + iLng * iLng) * 111000;
                if (dist < CULL_DIST) {
                    nextVisible.add(item.spawnId);
                }
            }
            setVisibleItemIds(nextVisible);
        };

        const timer = setInterval(updateVisibility, 500);
        updateVisibility();
        return () => clearInterval(timer);
    }, [seaGameCtx?.worldItems, myObfPos.lat, myObfPos.lng]);

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

            {seaState?.fortressLat && (
                <FortressEntity 
                    seaState={seaState} myObfPos={myObfPos} boatOffsetX={boatOffsetX} 
                    boatOffsetY={boatOffsetY} executeMoveToExact={executeMoveToExact} seaGameCtx={seaGameCtx} 
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

            {seaGameCtx?.worldItems?.filter((item: any) => visibleItemIds.has(item.spawnId)).map((item: any) => (
                <SeaItemEntity 
                    key={item.spawnId}
                    item={item}
                    myObfPos={myObfPos}
                    boatOffsetX={boatOffsetX}
                    boatOffsetY={boatOffsetY}
                    boatScaleStack={seaState?.activeCurses?.boat_scale || 0}
                    executeMoveToExact={executeMoveToExact}
                    seaGameCtx={seaGameCtx}
                />
            ))}
        </>
    );
};

export default SeaEntities;
