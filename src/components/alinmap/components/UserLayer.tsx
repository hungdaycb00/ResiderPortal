import React from 'react';
import SpatialNode from '../SpatialNode';

interface UserLayerProps {
    nearbyUsers: any[];
    myUserId: string | null;
    user: any;
    myObfPos: { lat: number; lng: number };
    searchTag: string;
    filterDistance: number;
    filterAgeMin: number;
    filterAgeMax: number;
    isLooterGameMode: boolean;
    scale: any;
    setSelectedUser: (user: any) => void;
    setContextMenu: (menu: any) => void;
}

const UserLayer: React.FC<UserLayerProps> = ({
    nearbyUsers, myUserId, user, myObfPos, searchTag,
    filterDistance, filterAgeMin, filterAgeMax, isLooterGameMode,
    scale, setSelectedUser, setContextMenu
}) => {
    const filteredUsers = nearbyUsers.filter(u => {
        if (u.id === myUserId || u.id === user?.uid) return false;
        if (searchTag) {
            const term = String(searchTag || '').toLowerCase();
            const matchesName = String(u.displayName || u.username || '').toLowerCase().includes(term);
            const tagsStr = (Array.isArray(u.tags) ? u.tags.join(' ') : String(u.tags || '')).toLowerCase();
            const matchesTags = tagsStr.includes(term);
            const statusStr = String(u.status || '').toLowerCase();
            const matchesStatus = statusStr.includes(term);
            if (!matchesName && !matchesTags && !matchesStatus) return false;
        }
        if (u.lat == null || u.lng == null || isNaN(u.lat) || isNaN(u.lng)) return false;
        const distKm = Math.sqrt(Math.pow(u.lat - myObfPos.lat, 2) + Math.pow(u.lng - myObfPos.lng, 2)) * 111;
        if (distKm > filterDistance) return false;
        const age = u.birthdate ? (new Date().getFullYear() - new Date(u.birthdate).getFullYear()) : 20;
        if (age < filterAgeMin || age > filterAgeMax) return false;
        return true;
    });

    return (
        <>
            {filteredUsers.map(u => (
                <div key={u.id} className={`transition-opacity duration-500 ${isLooterGameMode ? 'opacity-30 blur-[1px] pointer-events-none' : 'opacity-100'}`}>
                    <SpatialNode
                        user={u} myPos={myObfPos} mapScale={scale}
                        onClick={() => !isLooterGameMode && setSelectedUser(u)}
                        onContextMenu={(e, uData) => {
                            if (!isLooterGameMode) setContextMenu({ x: e.clientX, y: e.clientY, target: 'user', data: uData });
                        }}
                    />
                </div>
            ))}
        </>
    );
};

export default React.memo(UserLayer);
