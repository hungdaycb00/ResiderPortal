import React from 'react';
import { Compass, Navigation } from 'lucide-react';
import { resolveAvatarSrc } from '../../../../../utils/avatar';

interface SocialNearbySectionProps {
    myObfPos: { lat: number; lng: number } | null;
    nearbyUsers: any[];
    radius: number;
    setSelectedUser: (user: any) => void;
    handleUpdateRadius: (radius: number) => void;
    isVisibleOnMap: boolean;
    setIsVisibleOnMap: (v: boolean) => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    requestLocation?: (forceInvisible?: boolean, wsRef?: React.MutableRefObject<WebSocket | null>, setIsVisibleOnMap?: (v: boolean) => void) => void;
    ws: React.MutableRefObject<WebSocket | null>;
}

const SocialNearbySection: React.FC<SocialNearbySectionProps> = ({
    myObfPos,
    nearbyUsers,
    radius,
    setSelectedUser,
    handleUpdateRadius,
    isVisibleOnMap,
    setIsVisibleOnMap,
    requireAuth,
    requestLocation,
    ws,
}) => {
    const [visibleNearbyCount, setVisibleNearbyCount] = React.useState(32);

    React.useEffect(() => {
        setVisibleNearbyCount(32);
    }, [radius, nearbyUsers]);

    const nearbyUsersInRange = React.useMemo(() => nearbyUsers.filter((u) => {
        if (!myObfPos || typeof u?.lat !== 'number' || typeof u?.lng !== 'number') return true;
        const dLat = u.lat - myObfPos.lat;
        const dLng = u.lng - myObfPos.lng;
        const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
        return distKm <= radius;
    }), [nearbyUsers, myObfPos, radius]);

    const visibleNearbyUsers = React.useMemo(() => (
        nearbyUsersInRange.slice(0, visibleNearbyCount)
    ), [nearbyUsersInRange, visibleNearbyCount]);

    return (
        <div className="space-y-5 pt-1">
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 content-auto">
                <h4 className="text-[13px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-500" /> Privacy & Location
                </h4>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-500">Obfuscation Radius</span>
                            <span className="text-[11px] font-bold text-blue-600">{radius} km</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="10000"
                            step="10"
                            value={radius}
                            onChange={(e) => {
                                if (requireAuth && !requireAuth('update privacy settings')) return;
                                handleUpdateRadius(parseInt(e.target.value, 10));
                            }}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                        />
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200/60">
                        <div>
                            <span className="text-[11px] font-bold text-gray-700 block">Visible on Map</span>
                            <span className="text-[9px] font-medium text-gray-400">{isVisibleOnMap ? 'Others can see you' : 'Ghost mode'}</span>
                        </div>
                        <button
                            type="button"
                            className="relative inline-flex items-center cursor-pointer"
                            onClick={() => {
                                if (requireAuth && !requireAuth('update map visibility')) return;
                                const newVal = !isVisibleOnMap;
                                if (newVal && requestLocation) {
                                    requestLocation(false, ws, setIsVisibleOnMap);
                                    return;
                                }
                                setIsVisibleOnMap(newVal);
                                if (ws.current?.readyState === WebSocket.OPEN) {
                                    ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { visible: newVal } }));
                                }
                            }}
                        >
                            <span className={`block w-9 h-5 rounded-full transition-colors ${isVisibleOnMap ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                <span className={`block w-4 h-4 bg-white rounded-full mt-0.5 ml-0.5 transition-transform shadow-sm ${isVisibleOnMap ? 'translate-x-4' : 'translate-x-0'}`} />
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-gray-500 mb-3 px-1 uppercase tracking-wider">
                    Nearby People ({nearbyUsersInRange.length})
                </h4>
                {nearbyUsersInRange.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                        {visibleNearbyUsers.map((u) => (
                            <button
                                type="button"
                                key={u.id}
                                onClick={() => setSelectedUser(u)}
                                className="w-full flex items-center gap-3 py-3 hover:bg-gray-50 rounded-2xl px-2 transition-colors cursor-pointer group text-left content-auto"
                            >
                                <span className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0 relative">
                                    <img
                                        src={resolveAvatarSrc(u.avatar_url || u.photoURL || u.avatarUrl, u.username || u.displayName || 'U', { background: '3b82f6', color: 'fff', size: 100 })}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover"
                                        alt={u.username || ''}
                                        onError={(e) => { (e.target as HTMLImageElement).src = resolveAvatarSrc(null, u.username || u.displayName || 'U', { background: '3b82f6', color: 'fff', size: 100 }); }}
                                    />
                                    {u.gallery?.active && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full animate-pulse" />}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="flex items-center gap-1.5">
                                        <span className="font-bold text-gray-900 text-sm truncate">{u.username || 'Mysterious User'}</span>
                                        {u.isSelf && <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">You</span>}
                                    </span>
                                    <span className="block text-[11px] text-gray-400 truncate">{u.status || 'Exploring digital world'}</span>
                                </span>
                                <span className="text-[10px] text-gray-300 font-bold uppercase group-hover:text-blue-500 transition-colors">View</span>
                            </button>
                        ))}
                        {visibleNearbyCount < nearbyUsersInRange.length && (
                            <button
                                type="button"
                                onClick={() => setVisibleNearbyCount((count) => count + 32)}
                                className="w-full mt-3 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-600 active:scale-[0.99]"
                            >
                                Show more people
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="py-12 text-center bg-gray-50 rounded-[32px]">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <Navigation className="w-6 h-6 text-gray-200" />
                        </div>
                        <p className="text-gray-400 text-xs font-medium">No active users found nearby</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SocialNearbySection;
