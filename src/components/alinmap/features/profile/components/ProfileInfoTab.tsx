import React, { useState } from 'react';
import { Edit, X, Compass, ChevronRight, Plus, LogOut } from 'lucide-react';
import { normalizeImageUrl } from '../../../../../services/externalApi';
import { useProfile } from '../context/ProfileContext';

interface ProfileInfoTabProps {
    myUserId: string | null;
    radius: number;
    handleUpdateRadius: (v: number) => void;
    games: any[];
    ws: React.MutableRefObject<WebSocket | null>;
    myObfPos: any;
    setIsSheetExpanded: (v: boolean) => void;
    setMainTab: (tab: any) => void;
    logout?: () => void;
    user: any;
    externalApi: any;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    requestLocation?: (forceInvisible?: boolean, wsRef?: React.MutableRefObject<WebSocket | null>, setIsVisibleOnMap?: (v: boolean) => void) => void;
}

const ProfileInfoTab: React.FC<ProfileInfoTabProps> = ({
    myUserId, radius, handleUpdateRadius,
    games, ws,
    setIsSheetExpanded, setMainTab, logout, user, externalApi, showNotification, requireAuth, requestLocation,
}) => {
    const {
        myStatus, setMyStatus,
        isEditingStatus, setIsEditingStatus,
        statusInput, setStatusInput,
        isVisibleOnMap, setIsVisibleOnMap
    } = useProfile();
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [tagInput, setTagInput] = useState('');

    const persistStatus = async (nextStatus: string) => {
        await externalApi.request('/api/update-profile', {
            method: 'POST',
            body: JSON.stringify({ status: nextStatus }),
        });
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { status: nextStatus } }));
        }
    };

    const saveStatus = async () => {
        if (requireAuth && !requireAuth('cap nhat trang thai')) return;
        const nextStatus = statusInput.trim();
        try {
            await persistStatus(nextStatus);
            setMyStatus(nextStatus);
            setIsEditingStatus(false);
        } catch (err) {
            console.error(err);
            showNotification?.('Khong the luu trang thai len server', 'error');
        }
    };

    const removeTag = async (tag: string) => {
        if (requireAuth && !requireAuth('cap nhat tag')) return;
        const cleanTag = '#' + tag.toLowerCase();
        const newStatus = myStatus.replace(new RegExp(cleanTag + '\\b', 'g'), '').replace(/\s+/g, ' ').trim();
        try {
            await persistStatus(newStatus);
            setMyStatus(newStatus);
        } catch (err) {
            console.error(err);
            showNotification?.('Khong the luu tag len server', 'error');
        }
    };

    const addTag = async (rawTag: string) => {
        if (requireAuth && !requireAuth('cap nhat tag')) return;
        const newTag = '#' + rawTag.trim();
        if (!myStatus.includes(newTag)) {
            const newStatus = (myStatus.trim() + ' ' + newTag).trim();
            try {
                await persistStatus(newStatus);
                setMyStatus(newStatus);
            } catch (err) {
                console.error(err);
                showNotification?.('Khong the luu tag len server', 'error');
            }
        }
        setTagInput('');
        setIsAddingTag(false);
    };

    const parsedTags = myStatus.split(' ')
        .filter(w => w.startsWith('#'))
        .map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9#]/g, ''));

    return (
        <>
            {/* Status editing */}
            {isEditingStatus ? (
                <div className="bg-gray-100/80 p-3 rounded-xl mt-2 border border-gray-200 shadow-inner">
                    <div className="flex gap-2">
                        <input
                            autoFocus type="text" value={statusInput}
                            onChange={(e) => setStatusInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void saveStatus(); }}
                            placeholder="Update your status..."
                            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 w-full outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        <button onClick={() => { void saveStatus(); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg text-xs font-bold transition-colors whitespace-nowrap">
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="group/status inline-flex items-center gap-2 cursor-pointer mb-2" onClick={() => {
                    if (requireAuth && !requireAuth('cap nhat trang thai')) return;
                    setStatusInput(myStatus);
                    setIsEditingStatus(true);
                }}>
                    <p className="text-gray-500 text-[13px] truncate">{myStatus || "Tap to add status..."}</p>
                    <Edit className="w-3.5 h-3.5 text-gray-400 opacity-40 group-hover/status:opacity-100 transition-opacity" />
                </div>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-3 mb-4 items-center px-1">
                {parsedTags.map((tag) => (
                        <span key={tag} className="group/tag relative text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1 transition-all hover:bg-blue-100">
                            {tag.toUpperCase()}
                        <button onClick={() => { void removeTag(tag.replace('#', '')); }} className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-red-500">
                            <X className="w-2.5 h-2.5" />
                        </button>
                    </span>
                ))}

                {isAddingTag ? (
                    <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-full px-2 py-0.5 shadow-sm animate-in fade-in zoom-in duration-200">
                        <span className="text-blue-500 text-[10px] font-bold">#</span>
                        <input
                            autoFocus type="text" value={tagInput}
                            onChange={(e) => setTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && tagInput.trim()) void addTag(tagInput);
                                else if (e.key === 'Escape') setIsAddingTag(false);
                            }}
                            onBlur={() => { if (!tagInput.trim()) setIsAddingTag(false); }}
                            className="w-16 bg-transparent border-none outline-none text-[10px] font-bold text-gray-900 placeholder:text-gray-300"
                            placeholder="tag..."
                        />
                    </div>
                ) : (
                    <button onClick={() => setIsAddingTag(true)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-400 flex items-center justify-center transition-all active:scale-90 border border-gray-200" title="Thêm tag">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Privacy & Location */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                <h4 className="text-[13px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-500" /> Privacy & Location
                </h4>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-500">Obfuscation Radius</span>
                            <span className="text-[11px] font-bold text-blue-600">{radius} km</span>
                        </div>
                        <input type="range" min="0" max="100" value={radius} onChange={(e) => {
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

            {/* User Games Section */}
            {games && games.filter(g => g.ownerId === myUserId).length > 0 && (
                <div className="mt-2">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[13px] font-bold text-gray-900">🎮 My Games</h4>
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{games.filter(g => g.ownerId === myUserId).length}</span>
                    </div>
                    <div className="space-y-2">
                        {games.filter(g => g.ownerId === myUserId).map((g) => (
                            <div key={g.id || g.gameId} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors cursor-pointer group">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                                    {g.thumbnail ? (
                                        <img src={normalizeImageUrl(g.thumbnail)} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>🎮</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-gray-900 truncate">{g.name || g.title || 'Untitled Game'}</p>
                                    <p className="text-[11px] text-gray-500">{g.type || 'Game'} {g.playCount ? `• ${g.playCount} plays` : ''}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>
            )}


        </>
    );
};

export default ProfileInfoTab;
