import React from 'react';
import { motion, MotionValue } from 'framer-motion';
import { DEGREES_TO_PX } from './constants';

interface SeaEntitiesProps {
    myObfPos: { lat: number; lng: number };
    seaState: any;
    seaGameCtx: any;
    boatTargetPin: { lat: number; lng: number } | null;
    boatOffsetX: MotionValue<number>;
    boatOffsetY: MotionValue<number>;
}

const SeaEntities: React.FC<SeaEntitiesProps> = ({
    myObfPos, seaState, seaGameCtx, boatTargetPin, boatOffsetX, boatOffsetY,
}) => {
    return (
        <>
            {seaState?.fortressLat && (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        seaGameCtx?.openFortressStorage?.('fortress');
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => {}}
                    className="absolute w-24 h-24 -ml-12 -mt-12 flex items-center justify-center pointer-events-auto cursor-pointer z-[90]"
                    style={{
                        top: `calc(50% + ${-(seaState.fortressLat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                        left: `calc(50% + ${(seaState.fortressLng - myObfPos.lng) * DEGREES_TO_PX}px)`
                    }}
                >
                    <div className="relative flex flex-col items-center group">
                        <span className="text-6xl drop-shadow-lg">🏝️</span>
                        <div className="absolute -bottom-4 whitespace-nowrap bg-[#1a1d24]/80 text-emerald-400 border border-emerald-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                            Thanh tri cua ban
                        </div>
                    </div>
                </div>
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

            {seaGameCtx?.worldItems?.map((item: any) => {
                const dLat = item.lat - (myObfPos.lat - boatOffsetY.get() / DEGREES_TO_PX);
                const dLng = item.lng - (myObfPos.lng + boatOffsetX.get() / DEGREES_TO_PX);
                const distDeg = Math.sqrt(dLat * dLat + dLng * dLng);
                const distMeters = Math.round(distDeg * 111000);
                const isPortal = item?.item?.type === 'portal';

                return (
                    <motion.div
                        key={item.spawnId}
                        className={`absolute flex flex-col items-center cursor-pointer z-[95] transition-transform hover:scale-125 ${isPortal ? 'w-14 h-14 -ml-7 -mt-7' : 'w-10 h-10 -ml-5 -mt-5'}`}
                        style={{
                            top: `calc(50% + ${-(item.lat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                            left: `calc(50% + ${(item.lng - myObfPos.lng) * DEGREES_TO_PX}px)`
                        }}
                        animate={{ y: [-2, 2, -2] }}
                        transition={{ duration: isPortal ? 3.2 : 2.5, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 2 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isPortal) seaGameCtx?.openFortressStorage?.('portal');
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => {}}
                    >
                        <div className="relative group flex flex-col items-center">
                            <span className={`${isPortal ? 'text-4xl' : 'text-2xl'} drop-shadow-md group-hover:animate-bounce`}>
                                {item.item?.icon || '💎'}
                            </span>
                            <div className={`mt-0.5 flex flex-col items-center rounded-lg px-1.5 py-0.5 backdrop-blur-sm ${isPortal ? 'border border-violet-400/30 bg-violet-950/60' : 'border border-white/10 bg-black/40'}`}>
                                <span className="text-[7px] font-black uppercase tracking-tighter leading-none text-cyan-200 whitespace-nowrap">{item.item?.name}</span>
                                <span className="text-[6px] font-bold tabular-nums text-white/60">{distMeters}m</span>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </>
    );
};

export default SeaEntities;
