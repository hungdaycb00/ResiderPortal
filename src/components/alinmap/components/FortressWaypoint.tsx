import React, { useCallback, useEffect, useState } from 'react';
import { motion, MotionValue, useMotionValueEvent } from 'framer-motion';
import { Home, ArrowUp } from 'lucide-react';
import { useLooterState } from '../looter-game/LooterGameContext';
import { DEGREES_TO_PX, MAP_PLANE_SCALE } from '../constants';
import type { AdaptivePerformanceProfile } from '../hooks/useAdaptivePerformance';

interface FortressWaypointProps {
    myObfPos: { lat: number; lng: number } | null;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    scale: MotionValue<number>;
    planeYScale: MotionValue<number>;
    performance?: AdaptivePerformanceProfile;
}

const FortressWaypoint: React.FC<FortressWaypointProps> = ({
    myObfPos,
    panX,
    panY,
    scale,
    planeYScale,
    performance,
}) => {
    const { state: looterState } = useLooterState();
    const [isVisible, setIsVisible] = useState(false);
    const [waypointStyle, setWaypointStyle] = useState({ left: 0, top: 0, rotate: 0 });
    const [isPageVisible, setIsPageVisible] = useState(() => (typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'));

    const updatePosition = useCallback(() => {
        if (!isPageVisible || !looterState?.fortressLat || !looterState?.fortressLng || !myObfPos) {
            setIsVisible(false);
            return;
        }

        const dx = (looterState.fortressLng - myObfPos.lng) * DEGREES_TO_PX;
        const dy = -(looterState.fortressLat - myObfPos.lat) * DEGREES_TO_PX;

        const currentPanX = panX.get();
        const currentPanY = panY.get();
        const currentScale = scale.get();

        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        const screenX = cx + (dx * MAP_PLANE_SCALE + currentPanX) * currentScale;
        const screenY = cy + (dy * planeYScale.get() + currentPanY) * currentScale;

        const margin = 20;
        const minX = margin;
        const maxX = window.innerWidth - margin;
        const minY = margin;
        const maxY = window.innerHeight - margin;

        if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
            setIsVisible(false);
            return;
        }

        const angle = Math.atan2(screenY - cy, screenX - cx);
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        const distToX = cos > 0 ? (maxX - cx) / cos : (minX - cx) / cos;
        const distToY = sin > 0 ? (maxY - cy) / sin : (minY - cy) / sin;
        const dist = Math.min(Math.abs(distToX), Math.abs(distToY));

        setWaypointStyle({
            left: cx + cos * dist,
            top: cy + sin * dist,
            rotate: angle * (180 / Math.PI) + 90,
        });
        setIsVisible(true);
    }, [isPageVisible, looterState?.fortressLat, looterState?.fortressLng, myObfPos, panX, panY, scale, planeYScale]);

    useEffect(() => {
        updatePosition();
    }, [updatePosition]);

    useEffect(() => {
        const handleVisibility = () => {
            setIsPageVisible(document.visibilityState !== 'hidden');
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('resize', updatePosition);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('resize', updatePosition);
        };
    }, [updatePosition]);

    useMotionValueEvent(panX, 'change', updatePosition);
    useMotionValueEvent(panY, 'change', updatePosition);
    useMotionValueEvent(scale, 'change', updatePosition);
    useMotionValueEvent(planeYScale, 'change', updatePosition);

    if (!isVisible) return null;

    const isReduced = performance?.mode === 'low';

    return (
        <div
            className="fixed z-[200] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity duration-300"
            style={{ left: waypointStyle.left, top: waypointStyle.top }}
        >
            <div className={`absolute inset-0 rounded-full scale-[4.5] ${isReduced ? 'bg-amber-500/10' : 'bg-amber-500/20 animate-ping'}`} />
            <div className="relative w-4 h-4 bg-amber-600/90 backdrop-blur-md rounded-full shadow-md shadow-amber-900/50 flex items-center justify-center border border-amber-400">
                <Home className="w-2 h-2 text-white" />
                <div
                    className="absolute inset-0 flex items-start justify-center -m-2 pointer-events-none"
                    style={{ transform: `rotate(${waypointStyle.rotate}deg)` }}
                >
                    <ArrowUp className="w-2.5 h-2.5 text-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,1)]" strokeWidth={4} />
                </div>
            </div>
        </div>
    );
};

export default FortressWaypoint;
