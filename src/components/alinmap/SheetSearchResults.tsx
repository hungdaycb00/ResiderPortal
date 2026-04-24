import React, { useState, useEffect, useRef } from 'react';
import { Search, Edit, ChevronRight, User, Gamepad2 } from 'lucide-react';
import { normalizeImageUrl, getBaseUrl } from '../../services/externalApi';

interface SheetSearchResultsProps {
    searchTag: string;
    nearbyUsers: any[];
    setSelectedUser: (user: any) => void;
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    setIsSheetExpanded: (v: boolean) => void;
    handlePlayGame?: (game: any) => void;
}

const SheetSearchResults: React.FC<SheetSearchResultsProps> = ({
    searchTag, nearbyUsers, setSelectedUser, setActiveTab, setIsSheetExpanded, handlePlayGame,
}) => {
    const [searchResults, setSearchResults] = useState<{ posts: any[], users: any[], games?: any[] }>({ posts: [], users: [], games: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const API_BASE = getBaseUrl();

    useEffect(() => {
        if (!searchTag || searchTag.trim().length < 2) {
            setSearchResults({ posts: [], users: [], games: [] });
            setShowSearchResults(false);
            return;
        }
        setIsSearching(true);
        setShowSearchResults(true);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const resp = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(searchTag.trim())}`);
                const data = await resp.json();
                if (data.success) {
                    // Merge nearby users matching tag
                    const localUserMatches = nearbyUsers.filter(u =>
                        (u.username || '').toLowerCase().includes(searchTag.toLowerCase()) ||
                        (u.status || '').toLowerCase().includes(searchTag.toLowerCase())
                    ).map(u => ({ id: u.id, displayName: u.username, avatar: u.avatar_url, status: u.status || '' }));

                    const allUsers = [...data.users];
                    localUserMatches.forEach(lu => {
                        if (!allUsers.find((u: any) => u.id === lu.id)) allUsers.push(lu);
                    });

                    setSearchResults({ posts: data.posts, users: allUsers.slice(0, 10), games: data.games || [] });
                }
            } catch (err) {
                console.error('[Search]', err);
            }
            setIsSearching(false);
        }, 300);
        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
    }, [searchTag]);

    if (!showSearchResults || searchTag.trim().length < 2) return null;

    return (
        <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {isSearching && (
                <div className="flex items-center justify-center gap-2 py-4">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-xs text-gray-400 font-medium">Đang tìm kiếm...</span>
                </div>
            )}

            {!isSearching && searchResults.users.length === 0 && searchResults.posts.length === 0 && (!searchResults.games || searchResults.games.length === 0) && (
                <div className="text-center py-6">
                    <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Không tìm thấy kết quả cho "{searchTag}"</p>
                </div>
            )}

            {/* Users Results */}
            {searchResults.users.length > 0 && (
                <div className="mb-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Users</p>
                    <div className="space-y-1">
                        {searchResults.users.map((u: any) => (
                            <button
                                key={u.id}
                                onClick={() => {
                                    const mapUser = nearbyUsers.find(nu => nu.id === u.id);
                                    if (mapUser) {
                                        setSelectedUser(mapUser);
                                        setIsSheetExpanded(true);
                                    }
                                    setShowSearchResults(false);
                                }}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98]"
                            >
                                <img
                                    src={normalizeImageUrl(u.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'U')}&background=3b82f6&color=fff&size=80`}
                                    className="w-9 h-9 rounded-full object-cover bg-gray-100 shrink-0"
                                    alt=""
                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'U')}&background=3b82f6&color=fff&size=80`; }}
                                />
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-[13px] font-bold text-gray-900 truncate">{u.displayName}</p>
                                    {u.status && <p className="text-[11px] text-gray-500 truncate">{u.status}</p>}
                                </div>
                                <User className="w-4 h-4 text-gray-300 shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Posts Results */}
            {searchResults.posts.length > 0 && (
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Posts</p>
                    <div className="space-y-1">
                        {searchResults.posts.map((p: any) => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    if (p.author?.id) {
                                        const mapUser = nearbyUsers.find(nu => nu.id === p.author.id);
                                        if (mapUser) { setSelectedUser(mapUser); setActiveTab('posts'); }
                                    }
                                    setShowSearchResults(false);
                                }}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98]"
                            >
                                {p.images && p.images.length > 0 ? (
                                    <img src={normalizeImageUrl(p.images[0])} className="w-9 h-9 rounded-lg object-cover bg-gray-100 shrink-0" alt="" />
                                ) : (
                                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                        <Edit className="w-4 h-4 text-blue-400" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-[13px] font-bold text-gray-900 truncate">{p.title}</p>
                                    <p className="text-[11px] text-gray-500 truncate">
                                        {p.author?.name || 'User'} • {p.likeCount || 0} ❤️
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Games Results */}
            {searchResults.games && searchResults.games.length > 0 && (
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Games</p>
                    <div className="space-y-1">
                        {searchResults.games.map((g: any) => (
                            <button
                                key={g.id}
                                onClick={() => { if (handlePlayGame) handlePlayGame(g); }}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98]"
                            >
                                {g.thumbnail ? (
                                    <img src={normalizeImageUrl(g.thumbnail)} className="w-9 h-9 rounded-lg object-cover bg-gray-100 shrink-0" alt="" />
                                ) : (
                                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                        <Gamepad2 className="w-4 h-4 text-emerald-500" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-[13px] font-bold text-gray-900 truncate">{g.title}</p>
                                    <p className="text-[11px] text-gray-500 truncate">
                                        {g.category || 'Game'} • {g.playCount || 0} plays
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SheetSearchResults;
