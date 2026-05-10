import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Gamepad2, Hash, Search, ArrowLeft, X } from 'lucide-react';
import { normalizeImageUrl } from '../../../services/externalApi';
import {
    EMPTY_SEARCH_RESULTS,
    fetchAlinSearch,
    type AlinSearchResults,
} from '../search';
import {
    openSearchGameResult,
    openSearchPostResult,
    openSearchTagResult,
    openSearchUserResult,
} from '../searchActions';

interface MobileSearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    nearbyUsers: any[];
    setSelectedUser: (user: any) => void;
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    setIsSheetExpanded: (v: boolean) => void;
    handlePlayGame?: (game: any) => void;
}

const MobileSearchOverlay: React.FC<MobileSearchOverlayProps> = ({
    isOpen,
    onClose,
    nearbyUsers,
    setSelectedUser,
    setActiveTab,
    setIsSheetExpanded,
    handlePlayGame,
}) => {
    const [searchTag, setSearchTag] = useState('');
    const [searchResults, setSearchResults] = useState<AlinSearchResults>(EMPTY_SEARCH_RESULTS);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nearbyUsersRef = useRef(nearbyUsers);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const normalizedSearchTag = (searchTag || '').trim().toLowerCase();
    const hasResults = searchResults.users.length > 0
        || searchResults.posts.length > 0
        || searchResults.games.length > 0
        || searchResults.tags.length > 0;

    useEffect(() => {
        nearbyUsersRef.current = nearbyUsers;
    }, [nearbyUsers]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            // setTimeout to ensure it's rendered and focus works
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            // Clear when closed
            setSearchTag('');
            setSearchResults(EMPTY_SEARCH_RESULTS);
            setShowSearchResults(false);
        }
    }, [isOpen]);

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
            onClose();
        },
        setSearchTag: (tag: string) => {
            setSearchTag(tag);
            inputRef.current?.focus();
        },
        handlePlayGame,
    };

    const handleClear = () => {
        setSearchTag('');
        inputRef.current?.focus();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[350] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Search Header */}
            <div className="flex items-center gap-2 px-3 pt-12 pb-3 border-b border-gray-100 bg-white">
                <button
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all text-gray-500"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex-1 relative flex items-center">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search users, posts, games..."
                        value={searchTag}
                        onChange={(e) => setSearchTag(e.target.value)}
                        className="w-full h-10 pl-9 pr-10 bg-gray-100 border-none rounded-full text-sm outline-none text-gray-900 placeholder:text-gray-500 font-medium"
                    />
                    {searchTag.length > 0 && (
                        <button
                            onClick={handleClear}
                            className="absolute right-3 w-5 h-5 flex items-center justify-center rounded-full bg-gray-300 hover:bg-gray-400 text-white transition-all"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {isSearching && (
                    <div className="flex items-center justify-center gap-2 py-8">
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                        <span className="text-sm text-gray-400 font-medium">Searching...</span>
                    </div>
                )}

                {!isSearching && normalizedSearchTag.length >= 2 && !hasResults && (
                    <div className="text-center py-12">
                        <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 font-medium">No results for "{searchTag}"</p>
                    </div>
                )}

                {!isSearching && normalizedSearchTag.length < 2 && (
                    <div className="text-center py-12 px-8">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="w-5 h-5 text-blue-400" />
                        </div>
                        <p className="text-sm text-gray-400 font-medium mb-1">Search AlinMap</p>
                        <p className="text-xs text-gray-400">Find users, games, tags, and posts nearby or around the world.</p>
                    </div>
                )}

                {showSearchResults && hasResults && (
                    <div className="space-y-6 pb-20">
                        {searchResults.users.length > 0 && (
                            <div>
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Users</p>
                                <div className="space-y-1">
                                    {searchResults.users.map((u: any) => (
                                        <button
                                            key={u.id}
                                            onClick={() => openSearchUserResult(actions, u)}
                                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98] text-left"
                                        >
                                            <img
                                                src={normalizeImageUrl(u.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || u.username || 'U')}&background=3b82f6&color=fff&size=80`}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-10 h-10 rounded-full object-cover bg-gray-100 shrink-0 border border-gray-100"
                                                alt=""
                                                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || u.username || 'U')}&background=3b82f6&color=fff&size=80`; }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{u.displayName || u.username}</p>
                                                {u.status && <p className="text-xs text-gray-500 truncate">{u.status}</p>}
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {searchResults.posts.length > 0 && (
                            <div>
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Posts</p>
                                <div className="space-y-1">
                                    {searchResults.posts.map((p: any) => (
                                        <button
                                            key={p.id}
                                            onClick={() => openSearchPostResult(actions, p)}
                                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98] text-left"
                                        >
                                            {p.images && p.images.length > 0 ? (
                                                <img src={normalizeImageUrl(p.images[0])} loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0" alt="" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                    <Search className="w-4 h-4 text-blue-400" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{p.title}</p>
                                                <p className="text-xs text-gray-500 truncate">
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
                            <div>
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Games</p>
                                <div className="space-y-1">
                                    {searchResults.games.map((g: any) => (
                                        <button
                                            key={g.id}
                                            onClick={() => openSearchGameResult(actions, g)}
                                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98] text-left"
                                        >
                                            {g.thumbnail || g.image ? (
                                                <img src={normalizeImageUrl(g.thumbnail || g.image)} loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0" alt="" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                                    <Gamepad2 className="w-5 h-5 text-emerald-500" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{g.title || g.name}</p>
                                                <p className="text-xs text-gray-500 truncate">
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
                            <div>
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Tags</p>
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
                )}
            </div>
        </div>
    );
};

export default React.memo(MobileSearchOverlay);
