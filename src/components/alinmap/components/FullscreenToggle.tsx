import React, { useState, useEffect, useCallback, useRef } from 'react';

interface FullscreenToggleProps {
    isDesktop?: boolean;
}

const FullscreenToggle: React.FC<FullscreenToggleProps> = ({ isDesktop }) => {
    const [dragBallPos, setDragBallPos] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<'up' | 'down' | null>(null);
    const dragStartY = useRef(0);

    // Only show on mobile
    if (isDesktop) return null;

    const handleTouchStart = (e: React.TouchEvent) => {
        dragStartY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - dragStartY.current;
        
        setDragBallPos(deltaY);

        if (deltaY < -10) {
            setDragType('up');
        } else if (deltaY > 10) {
            setDragType('down');
        } else {
            setDragType(null);
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;
        
        if (dragType === 'up') {
            // Scroll down to hide browser bars
            window.scrollTo({
                top: 500,
                behavior: 'smooth'
            });
        } else if (dragType === 'down') {
            // Scroll to top to show browser bars
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        // Reset state
        setIsDragging(false);
        setDragBallPos(0);
        setDragType(null);
    };

    return (
        <>
            {/* Control Ball */}
            <div 
                style={{
                    position: 'fixed',
                    top: '80px',
                    left: '15px',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: dragType === 'up' 
                        ? 'linear-gradient(135deg, #10b981, #059669)' 
                        : dragType === 'down' 
                        ? 'linear-gradient(135deg, #f43f5e, #e11d48)' 
                        : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                    border: `2px solid ${dragType === 'up' ? '#34d399' : dragType === 'down' ? '#fb7185' : '#38bdf8'}`,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                    zIndex: 9998,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isDragging ? 1 : 0.6,
                    transform: isDragging ? `scale(1.15) translateY(${dragBallPos}px)` : 'scale(1)',
                    transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: 'none',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 'bold'
                }}
            >
                ↕
            </div>

            {/* Touch Zone (Invisible layer to catch events) */}
            <div 
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={{
                    position: 'fixed',
                    top: '40px',
                    left: '5px',
                    width: '70px',
                    height: '140px',
                    zIndex: 9999,
                    touchAction: 'none'
                }}
            />
        </>
    );
};

export default FullscreenToggle;
