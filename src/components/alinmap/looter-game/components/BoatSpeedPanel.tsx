import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Gauge, ChevronDown, ChevronUp } from 'lucide-react';
import { useLooterGame } from '../LooterGameContext';

const PRESETS = [0.5, 1, 2, 3, 5];

const BoatSpeedPanel: React.FC = () => {
    const { isLooterGameMode, globalSettings, setGlobalSettings } = useLooterGame();
    const [expanded, setExpanded] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const currentSpeed = globalSettings?.speedMultiplier ?? 1;

    const handleSpeedChange = useCallback((multiplier: number) => {
        setGlobalSettings({ ...globalSettings, speedMultiplier: multiplier });
    }, [globalSettings, setGlobalSettings]);

    // Đóng panel khi click ra ngoài
    useEffect(() => {
        if (!expanded) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as HTMLElement)) {
                setExpanded(false);
            }
        };
        document.addEventListener('pointerdown', handler);
        return () => document.removeEventListener('pointerdown', handler);
    }, [expanded]);

    if (!isLooterGameMode) return null;

    return (
        <div ref={panelRef} className="relative flex flex-col items-end gap-1" data-map-interactive="true">
            {/* Nút toggle */}
            <button
                type="button"
                data-map-interactive="true"
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
                className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl border border-amber-500/50 bg-[#0a1526]/85 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)] backdrop-blur-xl flex items-center justify-center active:scale-95 transition-all hover:bg-[#1a1a10]/90 hover:border-amber-400 ${expanded ? 'rounded-b-xl' : ''}`}
                title="Tốc độ thuyền"
            >
                <Gauge className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            {/* Expanded panel */}
            {expanded && (
                <div className="flex flex-col gap-2 p-3 rounded-2xl border border-amber-500/40 bg-[#0a1526]/90 backdrop-blur-xl shadow-[0_0_28px_rgba(245,158,11,0.2)] min-w-[140px]">
                    {/* Current speed display */}
                    <div className="text-center">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-300/60">Tốc độ</span>
                        <div className="text-2xl font-black text-amber-300 tabular-nums leading-tight">
                            {currentSpeed.toFixed(1)}x
                        </div>
                    </div>

                    {/* Slider */}
                    <input
                        type="range"
                        min="0.25"
                        max="5"
                        step="0.25"
                        value={currentSpeed}
                        onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-amber-500/20"
                        style={{
                            accentColor: '#f59e0b',
                            WebkitAppearance: 'none',
                            background: `linear-gradient(to right, #f59e0b40 ${(currentSpeed - 0.25) * 100 / 4.75}%, #f59e0b15 ${(currentSpeed - 0.25) * 100 / 4.75}%)`,
                        }}
                        data-map-interactive="true"
                        onPointerDown={(e) => { e.stopPropagation(); }}
                    />

                    {/* Presets */}
                    <div className="flex gap-1 justify-between">
                        {PRESETS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                data-map-interactive="true"
                                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); handleSpeedChange(p); }}
                                className={`flex-1 px-1.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                    Math.abs(currentSpeed - p) < 0.01
                                        ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50'
                                        : 'bg-white/5 text-amber-300/60 border border-white/5 hover:bg-white/10 hover:text-amber-200'
                                }`}
                            >
                                {p}x
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BoatSpeedPanel;
