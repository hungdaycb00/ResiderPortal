import React, { useState, useEffect, useCallback, useRef } from 'react';

interface FullscreenToggleProps {
    isDesktop?: boolean;
}

const FullscreenToggle: React.FC<FullscreenToggleProps> = ({ isDesktop }) => {
    const dragBallRef = useRef<HTMLDivElement>(null);
    const touchZoneRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<'up' | 'down' | null>(null);
    const dragStartY = useRef(0);

    // Only show on mobile
    if (isDesktop) return null;

    useEffect(() => {
        if (isDesktop) return;

        // Force body/html height exactly like in the test file
        const originalBodyHeight = document.body.style.height;
        const originalBodyMinHeight = document.body.style.minHeight;
        const originalHtmlHeight = document.documentElement.style.height;
        const originalHtmlMinHeight = document.documentElement.style.minHeight;
        
        document.body.style.minHeight = '200vh';
        document.body.style.width = '100vw';
        document.documentElement.style.minHeight = '200vh';

        // Global scroll listener for touchZone positioning like in test file
        const syncTouchZone = () => {
            if (touchZoneRef.current) {
                touchZoneRef.current.style.top = (window.scrollY + 70) + 'px';
            }
        };

        syncTouchZone();
        window.addEventListener('scroll', syncTouchZone, { passive: true });

        // Global touchmove preventDefault logic from test file
        const handleGlobalTouchMove = (e: TouchEvent) => {
            // Check if it's our touch zone
            if (e.target instanceof HTMLElement && e.target.closest('#touch-zone-id')) return;

            // Check for inner scroll (like backpack)
            const innerScroll = (e.target as HTMLElement).closest('.inner-scroll');
            if (innerScroll) {
                // Let the inner scroll work
                return;
            }

            // Prevent global scroll unless it's our joystick
            e.preventDefault();
        };

        document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });

        return () => {
            document.body.style.minHeight = originalBodyMinHeight;
            document.body.style.height = originalBodyHeight;
            document.documentElement.style.minHeight = originalHtmlMinHeight;
            document.documentElement.style.height = originalHtmlHeight;
            window.removeEventListener('scroll', syncTouchZone);
            document.removeEventListener('touchmove', handleGlobalTouchMove);
        };
    }, [isDesktop]);

    const handleTouchStart = (e: React.TouchEvent) => {
        dragStartY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - dragStartY.current;
        
        if (deltaY < -5) {
            setDragType('up');
        } else if (deltaY > 5) {
            setDragType('down');
        } else {
            setDragType(null);
        }

        if (dragBallRef.current) {
            dragBallRef.current.style.transform = `scale(1.15) translateY(${deltaY}px)`;
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;
        
        if (dragType === 'up') {
            window.scrollTo(0, 500);
        } else if (dragType === 'down') {
            window.scrollTo(0, 0);
        }

        // Reset state exactly like stopDragging() in test file
        setIsDragging(false);
        setDragType(null);
        if (dragBallRef.current) {
            dragBallRef.current.style.transform = '';
        }
    };

    return (
        <>
            {/* Control Ball (drag-ball) */}
            <div 
                ref={dragBallRef}
                id="drag-ball"
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
                    transition: isDragging ? 'none' : 'opacity 0.3s, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s, border-color 0.3s',
                    pointerEvents: 'none',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}
            >
                ↕
            </div>

            {/* Touch Zone (touch-zone) */}
            <div 
                ref={touchZoneRef}
                id="touch-zone-id"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={{
                    position: 'absolute', // Absolute to follow scroll via syncTouchZone
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
