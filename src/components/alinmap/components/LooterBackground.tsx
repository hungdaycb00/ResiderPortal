import React from 'react';
import type { AdaptiveBackgroundMode } from '../hooks/useAdaptivePerformance';

export const LooterBackground: React.FC<{ mode?: AdaptiveBackgroundMode }> = ({ mode = 'full' }) => {
    if (mode === 'minimal') {
        return (
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_55%),linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(8,15,27,1))]" />
        );
    }

    if (mode === 'reduced') {
        return (
            <>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[110%] h-[420px] bg-cyan-500/8 blur-[80px] pointer-events-none rounded-[100%]" />
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,_rgba(2,6,23,0.95),_rgba(8,15,27,1))]" />
            </>
        );
    }

    return (
        <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[600px] bg-cyan-500/10 blur-[120px] pointer-events-none rounded-[100%]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 blur-[150px] pointer-events-none rounded-full" />
            <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] pointer-events-none rounded-full" />
        </>
    );
};

export const MapGrid: React.FC<{ mapMode: 'grid' | 'satellite' }> = ({ mapMode }) => (
    <div className={`absolute inset-[-50%] pointer-events-none transition-opacity duration-700 flex items-center justify-center ${mapMode === 'satellite' ? 'opacity-30' : 'opacity-100'}`} style={{ transform: 'rotateZ(45deg) scale(1.5)', willChange: 'transform' }}>
        {/* Main Grid Lines */}
        <div className="absolute inset-0" style={{
            backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.15) 1px, transparent 1px), 
                linear-gradient(90deg, rgba(59, 130, 246, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: "100px 100px",
            backgroundPosition: "center center",
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
        }} />
        
        {/* Intersection Glow Dots */}
        <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 0 0, rgba(59, 130, 246, 0.6) 1.5px, transparent 2px)`,
            backgroundSize: "100px 100px",
            backgroundPosition: "center center",
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
        }} />

        {/* Thinner secondary grid */}
        <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px), 
                linear-gradient(90deg, rgba(59, 130, 246, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "25px 25px",
            backgroundPosition: "center center",
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
        }} />
    </div>
);
