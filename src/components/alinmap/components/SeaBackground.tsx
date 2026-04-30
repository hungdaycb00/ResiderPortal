import React from 'react';

export const SeaBackground: React.FC = () => (
    <>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-cyan-500/5 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] pointer-events-none rounded-full" />
    </>
);

export const MapGrid: React.FC<{ mapMode: 'grid' | 'satellite' }> = ({ mapMode }) => (
    <div className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${mapMode === 'satellite' ? 'opacity-20' : 'opacity-100'}`} style={{
        backgroundImage: "linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)",
        backgroundSize: "100px 100px",
        backgroundPosition: "center center",
    }} />
);
