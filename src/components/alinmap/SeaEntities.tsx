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
            {/* Fortress Island */}
            {seaState?.fortressLat && (
                <div
                    className="absolute w-24 h-24 -ml-12 -mt-12 flex items-center justify-center pointer-events-none z-[90]"
                    style={{
                        top: `calc(50% + ${-(seaState.fortressLat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                        left: `calc(50% + ${(seaState.fortressLng - myObfPos.lng) * DEGREES_TO_PX}px)`
                    }}
                >
                    <div className="relative flex flex-col items-center group">
                        <span className="text-6xl drop-shadow-lg">🏝️</span>
                        <div className="absolute -bottom-4 whitespace-nowrap bg-[#1a1d24]/80 text-emerald-400 border border-emerald-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                            Thành trì của bạn
                        </div>
                    </div>
                </div>
            )}

            {/* Boat Target Pin */}
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

            {/* Floating World Items */}
            {seaGameCtx?.worldItems?.map((item: any) => {
                const dLat = item.lat - (myObfPos.lat - boatOffsetY.get() / DEGREES_TO_PX);
                const dLng = item.lng - (myObfPos.lng + boatOffsetX.get() / DEGREES_TO_PX);
                const distDeg = Math.sqrt(dLat * dLat + dLng * dLng);
                const distMeters = Math.round(distDeg * 111000);

                return (
                    <motion.div
                        key={item.spawnId}
                        className="absolute w-10 h-10 -ml-5 -mt-5 flex flex-col items-center cursor-pointer z-[95] hover:scale-125 transition-transform"
                        style={{
                            top: `calc(50% + ${-(item.lat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                            left: `calc(50% + ${(item.lng - myObfPos.lng) * DEGREES_TO_PX}px)`
                        }}
                        animate={{ y: [-2, 2, -2] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 }}
                    >
                        <div className="relative group flex flex-col items-center">
                            <span className="text-2xl drop-shadow-md group-hover:animate-bounce">{item.item?.icon || '💎'}</span>
                            <div className="flex flex-col items-center bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-white/10 mt-0.5">
                                <span className="text-[7px] font-black text-cyan-200 uppercase tracking-tighter whitespace-nowrap leading-none">{item.item?.name}</span>
                                <span className="text-[6px] font-bold text-white/60 tabular-nums">{distMeters}m</span>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </>
    );
};

export default SeaEntities;
