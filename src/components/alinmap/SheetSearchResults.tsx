import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Gamepad2, Hash, Search } from 'lucide-react';
import { normalizeImageUrl } from '../../services/externalApi';
import {
    EMPTY_SEARCH_RESULTS,
    fetchAlinSearch,
    type AlinSearchResults,
} from './search';
import {
    openSearchGameResult,
    openSearchPostResult,
    openSearchTagResult,
    openSearchUserResult,
} from './searchActions';

interface SheetSearchResultsProps {
    searchTag: string;
    nearbyUsers: any[];
    setSelectedUser: (user: any) => void;
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    setIsSheetExpanded: (v: boolean) => void;
    setSearchTag: (v: string) => void;
    handlePlayGame?: (game: any) => void;
    onClose?: () => void;
}

const SheetSearchResults: React.FC<SheetSearchResultsProps> = ({
    searchTag,
    nearbyUsers,
    setSelectedUser,
    setActiveTab,
    setIsSheetExpanded,
    setSearchTag,
    handlePlayGame,
    onClose,
}) => {
    const [searchResults, setSearchResults] = useState<AlinSearchResults>(EMPTY_SEARCH_RESULTS);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nearbyUsersRef = useRef(nearbyUsers);
    const normalizedSearchTag = (searchTag || '').trim().toLowerCase();
    const hasResults = searchResults.users.length > 0
        || searchResults.posts.length > 0
        || searchResults.games.length > 0
        || searchResults.tags.length > 0;

    useEffect(() => {
        nearbyUsersRef.current = nearbyUsers;
    }, [nearbyUsers]);

    useEffect(() => {
        if (!normalizedSearchTag || normalizedSearchTag.length < 2) {
            setSearchResults(EMPTY_SEARCH_RESULTS);
            setShowSearchResults(false);
            return;
        }

        const controller = new AbortController();
        setIsSearching(true);
        setShowSearchResults(true);

        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const remoteResults = await fetchAlinSearch(normalizedSearchTag, controller.signal);
                const localUserMatches = nearbyUsersRef.current
                    .filter(u =>
                        (u.username || '').toLowerCase().includes(normalizedSearchTag) ||
                        (u.status || '').toLowerCase().includes(normalizedSearchTag) ||
                        (Array.isArray(u.tags) ? u.tags.join(' ') : u.tags || '').toLowerCase().includes(normalizedSearchTag)
                    )
                    .slice(0, 10)
                    .map(u => ({ id: u.id, displayName: u.username, username: u.username, avatar: u.avatar_url, status: u.status || '', tags: u.tags || [] }));

                const allUsers = [...remoteResults.users];
                localUserMatches.forEach(localUser => {
                    if (!allUsers.find((u: any) => u.id === localUser.id)) allUsers.push(localUser);
                });

                setSearchResults({
                    posts: remoteResults.posts,
                    users: allUsers,
                    games: remoteResults.games,
                    tags: remoteResults.tags,
                });
            } catch (err) {
                if (!controller.signal.aborted) console.error('[Search]', err);
            }
            if (!controller.signal.aborted) setIsSearching(false);
        }, 300);

        return () => {
            controller.abort();
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [normalizedSearchTag]);

    const actions = {
        nearbyUsers,
        setSelectedUser,
        setActiveTab,
        setIsSheetExpanded,
        closeResults: () => {
            setShowSearchResults(false);
            onClose?.();
        },
        setSearchTag,
        handlePlayGame,
    };

    if (!showSearchResults || searchTag.trim().length < 2) return null;

    return (
        <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {isSearching && (
                <div className="flex items-center justify-center gap-2 py-4">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-xs text-gray-400 font-medium">Searching...</span>
                </div>
            )}

            {!isSearching && !hasResults && (
                <div className="text-center py-6">
                    <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No results for "{searchTag}"</p>
                </div>
            )}

            {searchResults.users.length > 0 && (
                <div className="mb-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Users</p>
                    <div className="space-y-1">
                        {searchResults.users.map((u: any) => (
                            <button
                                key={u.id}
                                onClick={() => openSearchUserResult(actions, u)}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98] text-left"
                            >
                                <img
                                    src={normalizeImageUrl(u.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || u.username || 'U')}&background=3b82f6&color=fff&size=80`}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-9 h-9 rounded-full object-cover bg-gray-100 shrink-0"
                                    alt=""
                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || u.username || 'U')}&background=3b82f6&color=fff&size=80`; }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-gray-900 truncate">{u.displayName || u.username}</p>
                                    {u.status && <p className="text-[11px] text-gray-500 truncate">{u.status}</p>}
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {searchResults.posts.length > 0 && (
                <div className="mb-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Posts</p>
                    <div className="space-y-1">
                        {searchResults.posts.map((p: any) => (
                            <button
                                key={p.id}
                                onClick={() => openSearchPostResult(actions, p)}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98] text-left"
                            >
                                {p.images && p.images.length > 0 ? (
                                    <img src={normalizeImageUrl(p.images[0])} loading="lazy" decoding="async" className="w-9 h-9 rounded-lg object-cover bg-gray-100 shrink-0" alt="" />
                                ) : (
                                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                        <Search className="w-4 h-4 text-blue-400" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-gray-900 truncate">{p.title}</p>
                                    <p className="text-[11px] text-gray-500 truncate">
                                        {p.author?.name || p.author?.username || 'User'} - {p.likeCount || 0} likes
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {searchResults.games.length > 0 && (
                <div className="mb-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Games</p>
                    <div className="space-y-1">
                        {searchResults.games.map((g: any) => (
                            <button
                                key={g.id}
                                onClick={() => openSearchGameResult(actions, g)}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98] text-left"
                            >
                                {g.thumbnail || g.image ? (
                                    <img src={normalizeImageUrl(g.thumbnail || g.image)} loading="lazy" decoding="async" className="w-9 h-9 rounded-lg object-cover bg-gray-100 shrink-0" alt="" />
                                ) : (
                                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                        <Gamepad2 className="w-4 h-4 text-emerald-500" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-gray-900 truncate">{g.title || g.name}</p>
                                    <p className="text-[11px] text-gray-500 truncate">
                                        {g.category || 'Game'} - {g.playCount || g.downloads || 0} plays
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {searchResults.tags.length > 0 && (
                <div className="mb-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Tags</p>
                    <div className="flex flex-wrap gap-2">
                        {searchResults.tags.map((item) => (
                            <button
                                key={item.tag}
                                type="button"
                                onClick={() => openSearchTagResult(actions, item.tag)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition-colors active:scale-[0.98]"
                            >
                                <Hash className="w-3 h-3" />
                                {item.tag.replace(/^#/, '')}
                                {item.count ? <span className="text-[10px] text-blue-400">{item.count}</span> : null}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(SheetSearchResults);
