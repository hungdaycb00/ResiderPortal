import React, { useState, useEffect, useCallback, useRef } from 'react';

interface FullscreenToggleProps {
    isDesktop?: boolean;
}

const FullscreenToggle: React.FC<FullscreenToggleProps> = ({ isDesktop }) => {
    const [dragBallPos, setDragBallPos] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<'up' | 'down' | null>(null);
    const [touchZoneTop, setTouchZoneTop] = useState(70);
    const dragStartY = useRef(0);

    // Sync touch zone position with scroll (like in the example)
    useEffect(() => {
        const syncTouchZone = () => {
            setTouchZoneTop(window.scrollY + 70);
        };
        window.addEventListener('scroll', syncTouchZone, { passive: true });
        syncTouchZone();
        return () => window.removeEventListener('scroll', syncTouchZone);
    }, []);

    // Global touch move prevention logic (like in the example)
    useEffect(() => {
        if (isDesktop) return;

        let touchStartYGlobal = 0;
        
        const handleGlobalTouchStart = (e: TouchEvent) => {
            touchStartYGlobal = e.touches[0].clientY;
        };

        const handleGlobalTouchMove = (e: TouchEvent) => {
            // If interacting with our touch zone, don't prevent default
            if ((e.target as HTMLElement).closest('#fullscreen-touch-zone')) return;

            // Allow inner scroll for specific elements if needed
            const innerScroll = (e.target as HTMLElement).closest('.inner-scroll') || 
                               (e.target as HTMLElement).closest('#looter-backpack-view') ||
                               (e.target as HTMLElement).closest('.sheet-content');
            
            if (innerScroll) {
                const touchY = e.touches[0].clientY;
                const dy = touchY - touchStartYGlobal;
                const scrollTop = (innerScroll as HTMLElement).scrollTop;
                const scrollHeight = (innerScroll as HTMLElement).scrollHeight;
                const clientHeight = (innerScroll as HTMLElement).clientHeight;

                const isAtTop = scrollTop <= 0;
                const isAtBottom = scrollHeight - scrollTop <= clientHeight + 1;

                if (isAtTop && dy > 0) e.preventDefault();
                else if (isAtBottom && dy < 0) e.preventDefault();
                return;
            }

            // Prevent scroll for everything else to keep fullscreen state stable
            e.preventDefault();
        };

        document.addEventListener('touchstart', handleGlobalTouchStart, { passive: true });
        document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });

        return () => {
            document.removeEventListener('touchstart', handleGlobalTouchStart);
            document.removeEventListener('touchmove', handleGlobalTouchMove);
        };
    }, [isDesktop]);

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

        if (deltaY < -5) {
            setDragType('up');
        } else if (deltaY > 5) {
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
                id="fullscreen-drag-ball"
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

            {/* Touch Zone (Absolute position synchronized with scroll like in the example) */}
            <div 
                id="fullscreen-touch-zone"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={{
                    position: 'absolute',
                    top: `${touchZoneTop}px`,
                    left: '5px',
                    width: '70px',
                    height: '120px',
                    zIndex: 9999,
                    touchAction: 'none'
                }}
            />
        </>
    );
};

export default FullscreenToggle;
