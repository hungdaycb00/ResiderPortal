import React, { useEffect, useState, useRef } from 'react';
import { motion, MotionValue } from 'framer-motion';
import { Home, ArrowUp } from 'lucide-react';
import { useLooterState } from '../looter-game/LooterGameContext';
import { DEGREES_TO_PX } from '../constants';

interface FortressWaypointProps {
    myObfPos: { lat: number; lng: number } | null;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    scale: MotionValue<number>;
}

const FortressWaypoint: React.FC<FortressWaypointProps> = ({ myObfPos, panX, panY, scale }) => {
    const { state: looterState } = useLooterState();
    const [isVisible, setIsVisible] = useState(false);
    const [waypointStyle, setWaypointStyle] = useState({ left: 0, top: 0, rotate: 0 });
    const rafRef = useRef<number>();

    useEffect(() => {
        if (!looterState?.fortressLat || !looterState?.fortressLng || !myObfPos) {
            setIsVisible(false);
            return;
        }

        const updatePosition = () => {
            const fLat = looterState.fortressLat;
            const fLng = looterState.fortressLng;
            
            const dx = (fLng - myObfPos.lng) * DEGREES_TO_PX;
            const dy = -(fLat - myObfPos.lat) * DEGREES_TO_PX;

            const currentPanX = panX.get();
            const currentPanY = panY.get();
            const currentScale = scale.get();

            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;

            const screenX = cx + (dx + currentPanX) * currentScale;
            const screenY = cy + (dy + currentPanY) * currentScale;

            const margin = 20; // Khoảng cách từ mép màn hình (đã giảm từ 45)
            const minX = margin;
            const maxX = window.innerWidth - margin;
            const minY = margin;
            const maxY = window.innerHeight - margin;

            // Nếu thành trì nằm trong màn hình, ẩn waypoint
            if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
                if (isVisible) setIsVisible(false);
            } else {
                if (!isVisible) setIsVisible(true);
                
                // Góc từ tâm màn hình đến thành trì
                const angle = Math.atan2(screenY - cy, screenX - cx);
                
                // Tính giao điểm của tia từ tâm với các cạnh màn hình
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);

                const distToX = cos > 0 ? (maxX - cx) / cos : (minX - cx) / cos;
                const distToY = sin > 0 ? (maxY - cy) / sin : (minY - cy) / sin;

                const dist = Math.min(Math.abs(distToX), Math.abs(distToY));
                
                const edgeX = cx + cos * dist;
                const edgeY = cy + sin * dist;

                setWaypointStyle({
                    left: edgeX,
                    top: edgeY,
                    rotate: angle * (180 / Math.PI) + 90
                });
            }

            rafRef.current = requestAnimationFrame(updatePosition);
        };

        rafRef.current = requestAnimationFrame(updatePosition);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [looterState?.fortressLat, looterState?.fortressLng, myObfPos, panX, panY, scale, isVisible]);

    if (!isVisible) return null;

    return (
        <div 
            className="fixed z-[200] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity duration-300"
            style={{ left: waypointStyle.left, top: waypointStyle.top }}
        >
            <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping scale-150" />
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
