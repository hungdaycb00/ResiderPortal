import React, { useRef, useEffect, useCallback } from 'react';
import { MotionValue } from 'framer-motion';

interface MapCanvasEngineProps {
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    scale: MotionValue<number>;
    myObfPos: { lat: number; lng: number } | null;
    mode: 'satellite' | 'streets' | 'hybrid' | 'grid';
}

const DEGREES_TO_PX = 11100;
const TILE_SIZE = 256;

// Tile projection logic (Web Mercator)
function project(lat: number, lng: number, zoom: number) {
    const sinLat = Math.sin((lat * Math.PI) / 180);
    const x = ((lng + 180) / 360) * Math.pow(2, zoom);
    const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * Math.pow(2, zoom);
    return { x, y };
}

const MapCanvasEngine: React.FC<MapCanvasEngineProps> = ({ panX, panY, scale, myObfPos, mode }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tileCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const loadingTiles = useRef<Set<string>>(new Set());

    const getTileUrl = useCallback((z: number, x: number, y: number) => {
        // Google Maps Roadmap style as requested by user (lyrs=m)
        if (mode === 'satellite') return `https://mt1.google.com/vt/lyrs=s&x=${x}&y=${y}&z=${z}`;
        if (mode === 'hybrid') return `https://mt1.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`;
        return `https://mt1.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}`;
    }, [mode]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !myObfPos) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const currentScale = scale.get();
        const currentPanX = panX.get();
        const currentPanY = panY.get();

        // Calculate zoom level
        const calculatedZ = 14 + Math.floor(Math.log2(currentScale));
        const z = Math.max(2, Math.min(21, calculatedZ));

        // Background color (matching Google Maps light style)
        ctx.fillStyle = '#f1f3f4';
        ctx.fillRect(0, 0, width, height);

        const centerTile = project(myObfPos.lat, myObfPos.lng, z);
        const ratio = DEGREES_TO_PX / ((256 * Math.pow(2, z)) / 360);
        const tileWidthPx = TILE_SIZE * ratio * currentScale;

        // Frustum Culling: Calculate visible tile range
        // Viewport center is at (width/2, height/2)
        // Map center is offset by currentPanX, currentPanY
        const screenCenterX = width / 2 + currentPanX * currentScale;
        const screenCenterY = height / 2 + currentPanY * currentScale;

        const startI = Math.floor((-screenCenterX) / tileWidthPx);
        const endI = Math.ceil((width - screenCenterX) / tileWidthPx);
        const startJ = Math.floor((-screenCenterY) / tileWidthPx);
        const endJ = Math.ceil((height - screenCenterY) / tileWidthPx);

        for (let i = startI; i <= endI; i++) {
            for (let j = startJ; j <= endJ; j++) {
                const tx = Math.floor(centerTile.x) + i;
                const ty = Math.floor(centerTile.y) + j;
                
                // Wrap horizontal tiles (lng)
                const worldSize = Math.pow(2, z);
                const wrappedTx = ((tx % worldSize) + worldSize) % worldSize;

                const tileId = `${mode}-${z}-${wrappedTx}-${ty}`;
                const xPos = screenCenterX + (tx - centerTile.x) * TILE_SIZE * ratio * currentScale;
                const yPos = screenCenterY + (ty - centerTile.y) * TILE_SIZE * ratio * currentScale;

                const img = tileCache.current.get(tileId);
                if (img) {
                    if (img.complete) {
                        ctx.drawImage(img, xPos, yPos, tileWidthPx + 1, tileWidthPx + 1);
                    }
                } else if (!loadingTiles.current.has(tileId)) {
                    const newImg = new Image();
                    newImg.crossOrigin = 'anonymous';
                    loadingTiles.current.add(tileId);
                    newImg.onload = () => {
                        tileCache.current.set(tileId, newImg);
                        loadingTiles.current.delete(tileId);
                        // Trigger redraw when tile loads
                        requestAnimationFrame(draw);
                    };
                    newImg.src = getTileUrl(z, wrappedTx, ty);
                }
            }
        }
    }, [myObfPos, mode, getTileUrl, scale, panX, panY]);

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = canvasRef.current.offsetWidth;
                canvasRef.current.height = canvasRef.current.offsetHeight;
                draw();
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        // Subscribe to MotionValues
        const unsubX = panX.on('change', draw);
        const unsubY = panY.on('change', draw);
        const unsubS = scale.on('change', draw);

        return () => {
            window.removeEventListener('resize', handleResize);
            unsubX();
            unsubY();
            unsubS();
        };
    }, [draw, panX, panY, scale]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ imageRendering: 'pixelated' }}
        />
    );
};

export default React.memo(MapCanvasEngine);
