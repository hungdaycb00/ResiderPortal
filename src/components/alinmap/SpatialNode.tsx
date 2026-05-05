import React, { useState } from 'react';
import { normalizeImageUrl } from '../../services/externalApi';
import { Diamond } from 'lucide-react';
import { motion } from 'framer-motion';
import { DEGREES_TO_PX, SpatialNodeProps } from './constants';

const billboardTransform = (_: unknown, generated: string) => `${generated} rotateX(-60deg) translateZ(44px)`;

const SpatialNode: React.FC<SpatialNodeProps> = ({ user, myPos, onClick, mapScale, onContextMenu }) => {
    const dx = (user.lng - myPos.lng) * DEGREES_TO_PX;
    const dy = -(user.lat - myPos.lat) * DEGREES_TO_PX; // CSS Y is inverted vs latitude
    const [hoverScale, setHoverScale] = useState(1.1);
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    const animationTiming = React.useRef({
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 5,
    });

    return (
        <motion.div
            onPointerDown={(e) => e.stopPropagation()} // Prevent dragging the floor when clicking this
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onContextMenu) onContextMenu(e, user);
            }}
            onPointerEnter={() => {
                const s = mapScale.get();
                setHoverScale(isDesktop ? Math.max(1.1, 1.2 / s) : 1.1);
            }}
            className="absolute w-10 h-10 -ml-5 -mt-10 cursor-pointer group hover:z-50 pointer-events-auto alin-map-billboard"
            style={{
                left: `calc(50% + ${dx}px)`,
                top: `calc(50% + ${dy}px)`,
                transformOrigin: 'center bottom'
            }}
            transformTemplate={billboardTransform}
            animate={{
                y: [0, -5, 0],
            }}
            transition={{
                duration: animationTiming.current.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: animationTiming.current.delay
            }}
            whileHover={{ scale: hoverScale, y: -10 }}
            whileTap={{ scale: 0.95 }}
        >
            <div className="w-full h-full rounded-full border-[2.5px] overflow-hidden shadow-[0_0_15px_rgba(34,211,238,0.4)] border-cyan-500 bg-[#1a1d24]">
                <img
                    src={normalizeImageUrl(user.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'U')}&background=1a1d24&color=3b82f6&size=150&bold=true`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'U')}&background=1a1d24&color=3b82f6&size=150&bold=true`; }}
                />
            </div>

            {/* Hologram base shadow/glow */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-blue-500/50 blur-sm rounded-full -z-10" />

            {/* Billboard Container (Positioned Above Avatar) */}
            {user.gallery?.active && (
                <div
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                    className="absolute -top-24 left-1/2 -translate-x-1/2 w-44 aspect-video bg-white/10 backdrop-blur-md rounded-lg overflow-hidden border border-white/20 shadow-2xl shadow-blue-500/20 cursor-pointer pointer-events-auto hover:scale-105 transition-transform"
                >
                    {/* Header */}
                    <div className="bg-slate-900/80 px-2 py-1 border-b border-slate-700/50">
                        <p className="text-[9px] font-black text-blue-100 truncate text-center uppercase tracking-wider">
                            {user.gallery?.title || 'SPECIAL OFFER'}
                        </p>
                    </div>
                    {user.gallery.images?.[0] ? (
                        <div className="w-full aspect-video bg-black/40">
                            <img
                                src={normalizeImageUrl(user.gallery.images[0])}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover opacity-80"
                                alt="Ads"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-12 flex items-center justify-center bg-blue-900/20">
                            <Diamond className="w-4 h-4 text-blue-400 animate-pulse" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent mix-blend-overlay" />
                    {/* Glowing scanning line effect */}
                    <motion.div
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-[1px] bg-blue-300/60 shadow-[0_0_10px_#60a5fa] z-10"
                    />
                </div>
            )}

            {/* Labels under avatar to prevent blocking billboard */}
            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                {/* Status Tooltip */}
                {user.status && (
                    <div className="whitespace-nowrap bg-white/90 backdrop-blur border border-gray-200/50 px-2 py-1 rounded-full shadow-lg pointer-events-none">
                        <span className="text-[9px] font-bold text-gray-600 block max-w-[120px] truncate">{user.status}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default React.memo(SpatialNode);
