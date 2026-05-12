import React from 'react';
import { MapPin } from 'lucide-react';
import { motion, MotionValue, useMotionTemplate, useTransform } from 'framer-motion';

export const LocationConsentOverlay: React.FC<{
    requestLocation: (forceInvisible?: boolean) => void;
}> = ({ requestLocation }) => (
    <div className="absolute inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 pointer-events-auto">
        <div className="bg-[#1a1d24] border border-blue-500/30 p-8 rounded-3xl max-w-sm w-full text-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-blue-100">Alin 3D Universe</h2>
            <p className="text-blue-200/50 text-sm mb-8">Đưa hologram của bạn vào lưới xã hội. Hãy bật vị trí để khám phá người khác.</p>
            <div className="flex flex-col gap-3">
                <button onClick={() => requestLocation(false)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                    Kích hoạt hologram
                </button>
                <button onClick={() => requestLocation(true)} className="text-gray-400 hover:text-white text-xs py-2 transition-colors border border-white/10 rounded-xl hover:border-white/30">
                    Chỉ xem - Không chia sẻ vị trí
                </button>
                <p className="text-[10px] text-gray-500 mt-2">Bạn có thể đổi trạng thái hiển thị bất kỳ lúc nào trong cài đặt.</p>
            </div>
        </div>
    </div>
);

export const CurseIndicator: React.FC<{
    cursePercent: number;
    curseVisual: MotionValue<number>;
    activeCurses: any;
    isExpanded: boolean;
    onToggle: () => void;
    reducedMotion?: boolean;
}> = ({ cursePercent, curseVisual, activeCurses, isExpanded, onToggle, reducedMotion = false }) => {
    const curseBarWidth = useMotionTemplate`${curseVisual}%`;
    const curseText = useTransform(curseVisual, (v: any) => `${Math.round(v)}%`);

    return (
        <div className="absolute top-[20px] right-4 z-[115] flex flex-col items-end gap-3">
            <motion.button
                whileHover={reducedMotion ? undefined : { scale: 1.05 }}
                whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                onClick={onToggle}
                className="relative w-14 h-14 rounded-full bg-black/80 backdrop-blur-xl border-2 border-red-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] pointer-events-auto overflow-hidden group"
            >
                <motion.div
                    className="absolute bottom-0 left-0 right-0 bg-red-600/60"
                    style={{ height: curseBarWidth }}
                >
                    {!reducedMotion && (
                        <svg
                            className="absolute bottom-full left-0 w-[200%] h-4 fill-red-600/60 animate-[wave_3s_linear_infinite]"
                            viewBox="0 0 1200 120"
                            preserveAspectRatio="none"
                        >
                            <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z" />
                        </svg>
                    )}
                    {!reducedMotion && (
                        <svg
                            className="absolute bottom-full left-[-100%] w-[200%] h-4 fill-red-500/40 animate-[wave_5s_linear_infinite]"
                            viewBox="0 0 1200 120"
                            preserveAspectRatio="none"
                            style={{ animationDirection: 'reverse', opacity: 0.5 }}
                        >
                            <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z" />
                        </svg>
                    )}
                </motion.div>
                <div className="relative flex flex-col items-center">
                    <span className="text-[10px] leading-none mb-0.5 opacity-70">☠️</span>
                    <motion.span className={`text-xs font-black tabular-nums ${cursePercent > 70 && !reducedMotion ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                        {curseText}
                    </motion.span>
                </div>
                {cursePercent > 50 && !reducedMotion && (
                    <div className="absolute inset-0 rounded-full border border-red-500 animate-pulse pointer-events-none" />
                )}
            </motion.button>

            {isExpanded && activeCurses && Object.values(activeCurses).some(v => (v as number) > 0) && (
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="flex flex-col items-center gap-1.5 p-2 bg-black/90 backdrop-blur-2xl rounded-2xl border border-red-500/20 shadow-2xl min-w-[120px]"
                >
                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Lời nguyền đang bật</p>
                    {Object.entries(activeCurses)
                        .filter(([_, v]) => (v as number) > 0)
                        .map(([key, value]) => {
                            const CURSE_META: any = {
                                dmg_debuff: { icon: '📉', name: 'DMG', color: 'text-red-400' },
                                hp_debuff: { icon: '💔', name: 'HP', color: 'text-rose-400' },
                                regen_debuff: { icon: '💧', name: 'MANA', color: 'text-blue-400' },
                                boat_scale: { icon: '🚢', name: 'SIZE', color: 'text-amber-400' },
                                curse_gain: { icon: '☠️', name: 'CURSE', color: 'text-purple-400' },
                            };
                            const meta = CURSE_META[key];
                            if (!meta) return null;
                            return (
                                <div key={key} className="flex items-center justify-between w-full gap-3 px-2 py-1 hover:bg-white/5 rounded-lg transition-colors">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs">{meta.icon}</span>
                                        <span className={`text-[9px] font-bold ${meta.color} uppercase tracking-tighter`}>{meta.name}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-white">x{value as number}</span>
                                </div>
                            );
                        })}
                </motion.div>
            )}
        </div>
    );
};
