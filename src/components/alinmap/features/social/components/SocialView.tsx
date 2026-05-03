import React from 'react';
import { Copy, MessageCircle, Navigation, Compass } from 'lucide-react';
import { normalizeImageUrl } from '../../../../../services/externalApi';

interface SocialViewProps {
    myUserId: string | null;
    myObfPos: { lat: number; lng: number } | null;
    nearbyUsers: any[];
    setSelectedUser: (user: any) => void;
    radius: number;
    handleUpdateRadius: (radius: number) => void;
    isVisibleOnMap: boolean;
    setIsVisibleOnMap: (v: boolean) => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    requestLocation?: (forceInvisible?: boolean, wsRef?: React.MutableRefObject<WebSocket | null>, setIsVisibleOnMap?: (v: boolean) => void) => void;
    ws: React.MutableRefObject<WebSocket | null>;
}

const SocialView: React.FC<SocialViewProps> = ({
    myUserId, myObfPos, nearbyUsers,
    setSelectedUser, radius, handleUpdateRadius,
    isVisibleOnMap, setIsVisibleOnMap, requireAuth, requestLocation, ws
}) => {
    const nearbyUsersInRange = nearbyUsers.filter((u) => {
        if (!myObfPos || typeof u?.lat !== 'number' || typeof u?.lng !== 'number') return true;
        const dLat = u.lat - myObfPos.lat;
        const dLng = u.lng - myObfPos.lng;
        const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
        return distKm <= radius;
    });

    return (
        <div className="space-y-5">
            <h3 className="text-lg font-black text-gray-900 px-1">Social</h3>

            {/* User ID + Copy */}
            <div className="bg-gray-50 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Your User ID</p>
                    <p className="text-[13px] font-mono font-bold text-gray-900 break-all">{myUserId || '...'}</p>
                </div>
                <button 
                    onClick={() => {
                        if (!myUserId) return;
                        navigator.clipboard.writeText(myUserId);
                    }}
                    className="p-2.5 bg-white hover:bg-blue-50 border border-gray-200 rounded-xl transition-colors active:scale-95 shrink-0"
                    title="Copy ID"
                >
                    <Copy className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* Privacy & Location */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <h4 className="text-[13px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-500" /> Privacy & Location
                </h4>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-500">Obfuscation Radius</span>
                            <span className="text-[11px] font-bold text-blue-600">{radius} km</span>
                        </div>
                        <input type="range" min="0" max="10000" step="10" value={radius} onChange={(e) => {
                            if (requireAuth && !requireAuth('cap nhat quyen rieng tu')) return;
                            handleUpdateRadius(parseInt(e.target.value));
                        }} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none" />
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200/60">
                        <div>
                            <span className="text-[11px] font-bold text-gray-700 block">Visible on Map</span>
                            <span className="text-[9px] font-medium text-gray-400">{isVisibleOnMap ? 'Others can see you' : 'Ghost mode'}</span>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer" onClick={() => {
                            if (requireAuth && !requireAuth('cap nhat hien thi tren map')) return;
                            const newVal = !isVisibleOnMap;
                            if (newVal && requestLocation) {
                                requestLocation(false, ws, setIsVisibleOnMap);
                                return;
                            }
                            setIsVisibleOnMap(newVal);
                            if (ws.current?.readyState === WebSocket.OPEN) {
                                ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { visible: newVal } }));
                            }
                        }}>
                            <div className={`w-9 h-5 rounded-full transition-colors ${isVisibleOnMap ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full mt-0.5 ml-0.5 transition-transform shadow-sm flex items-center justify-center ${isVisibleOnMap ? 'translate-x-4' : 'translate-x-0'}`}>
                                    {isVisibleOnMap && <div className="w-1 h-1 bg-blue-600 rounded-full" />}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Nearby People Section */}
            <div>
                <h4 className="text-xs font-bold text-gray-500 mb-3 px-1 uppercase tracking-wider">Nearby People ({nearbyUsersInRange.length})</h4>
                {nearbyUsersInRange.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                        {nearbyUsersInRange.map(u => (
                            <div
                                key={u.id}
                                onClick={() => setSelectedUser(u)}
                                className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-2xl px-2 transition-colors cursor-pointer group"
                            >
                                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0 relative">
                                    <img src={normalizeImageUrl(u.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}`} className="w-full h-full object-cover" alt={u.username} onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}&background=3b82f6&color=fff&size=100&bold=true`; }} />
                                    {u.gallery?.active && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full animate-pulse" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="font-bold text-gray-900 text-sm truncate">{u.username || 'Mysterious User'}</h4>
                                        {u.isSelf && <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">You</span>}
                                    </div>
                                    <p className="text-[11px] text-gray-400 truncate">{u.status || "Exploring digital world"}</p>
                                </div>
                                <div className="text-[10px] text-gray-300 font-bold uppercase group-hover:text-blue-500 transition-colors">View</div>
                            </div>
                        ))}
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

export default SocialView;
