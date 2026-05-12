import React, { useState } from 'react';
import { normalizeImageUrl } from '../../services/externalApi';
import { Diamond } from 'lucide-react';
import { motion, useTransform } from 'framer-motion';
import { DEGREES_TO_PX, FEATURED_BILLBOARD_FAR_SCALE, LIKE_THRESHOLD_FOR_SCALE, SpatialNodeProps } from './constants';

const billboardTransform = (_: unknown, generated: string) =>
    `${generated} scale(var(--alin-map-node-counter-scale)) scale(var(--alin-map-featured-scale, 1))`;

const SpatialNode: React.FC<SpatialNodeProps> = ({ user, myPos, onClick, mapScale, onContextMenu, offsetX = 0, offsetY = 0 }) => {
    const dx = (user.lng - myPos.lng) * DEGREES_TO_PX + offsetX;
    const dy = -(user.lat - myPos.lat) * DEGREES_TO_PX + offsetY; // CSS Y is inverted vs latitude
    const likeCount = Number(user?.gallery?.likeCount ?? user?.gallery?.likes ?? user?.likeCount ?? user?.likes_count ?? 0);
    const isFeaturedBillboard = !!user?.gallery?.active && likeCount >= LIKE_THRESHOLD_FOR_SCALE;
    const featuredScale = useTransform(mapScale, (v) => {
        if (!isFeaturedBillboard) return 1;
        const t = Math.min(Math.max((1 - (v || 1)) / 0.75, 0), 1);
        return 1 + (FEATURED_BILLBOARD_FAR_SCALE - 1) * t;
    });
    const [hoverScale, setHoverScale] = useState(1.1);
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    const displayName = String(user.displayName || user.username || 'User');
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
                transformOrigin: 'center bottom',
                '--alin-map-featured-scale': featuredScale,
            } as any}
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
            <div className="relative w-full h-full alin-map-upright-sprite">
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

                {/* Google Maps-like label: name rõ, status phụ trợ */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
                    <div className="max-w-[420px] rounded-full border border-white/80 bg-white/95 px-8 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.16)] backdrop-blur-md">
                        <span className="block max-w-[360px] truncate text-[50px] leading-none font-extrabold tracking-tight text-slate-900 sm:text-[55px]">
                            {displayName}
                        </span>
                    </div>
                    {user.status ? (
                        <div className="max-w-[260px] rounded-full border border-sky-100 bg-sky-50/95 px-3 py-1 shadow-[0_6px_18px_rgba(14,165,233,0.12)] backdrop-blur-md">
                            <span className="block max-w-[220px] truncate text-[12px] font-semibold text-slate-600 sm:text-[13px]">
                                {user.status}
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>
        </motion.div>
    );
};

export default React.memo(SpatialNode);
