import React from 'react';
import { Search, MapPin, Filter, Trash2, Plus, LogIn, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { normalizeImageUrl } from '../services/externalApi';
import UserInfoModal from './UserInfoModal';
import { User } from '../types';

export interface AppHeaderProps {
    user: User | null;
    userStats: { gold: number, level: number, xp: number, rankScore: number } | null;
    activeTab: string;
    setActiveTab: (tab: any) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isFilterExpanded: boolean;
    setIsFilterExpanded: (expanded: boolean) => void;
    selectedCategories: string[];
    setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;
    isSearchActive: boolean;
    AVAILABLE_CATEGORIES: { id: string, name: string, icon: React.ReactNode }[];
    isUserInfoOpen: boolean;
    setIsUserInfoOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsAuthOpen: (open: boolean) => void;
    logout: () => void;
    handleUpdateAvatar: (url: string) => void;
    setIsMyGamesOverlayOpen: (open: boolean) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
    user,
    userStats,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    isFilterExpanded,
    setIsFilterExpanded,
    selectedCategories,
    setSelectedCategories,
    isSearchActive,
    AVAILABLE_CATEGORIES,
    isUserInfoOpen,
    setIsUserInfoOpen,
    setIsAuthOpen,
    logout,
    handleUpdateAvatar,
    setIsMyGamesOverlayOpen
}) => {
    return (
        <header className="bg-[#1a1d24]/80 backdrop-blur-md border-b border-gray-800/60 sticky top-0 z-50">
            <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
                {/* Left: Logo & Status */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
                        {/* Logo deleted by user request */}
                    </div>

                    {/* Alin Social Access */}
                    <button
                        onClick={() => setActiveTab('alin')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-[10px] sm:text-xs transition-all border active:scale-95 group ${activeTab === 'alin'
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-blue-600/10 hover:bg-blue-600/30 text-blue-400 border-blue-500/30'
                            }`}
                    >
                        <MapPin className="w-4 h-4" />
                        <span className="hidden xs:inline text-[8px] font-black tracking-widest uppercase text-white">Alin Map</span>
                    </button>
                </div>

                {/* Middle: Search (Icon on Right) */}
                <div className="flex-1 max-w-2xl relative">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Search for games..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#252830] text-white rounded-xl pl-4 pr-24 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-500 border border-transparent hover:border-gray-700 focus:bg-[#2a2d36]"
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                                className={`p-1.5 rounded-lg transition-colors ${isFilterExpanded || selectedCategories.length > 0 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                                title="Filters"
                            >
                                <Filter className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-gray-700 mx-0.5" />
                            <button className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Expandable Filter Area - Absolute Dropdown */}
                    <AnimatePresence>
                        {isFilterExpanded && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d24] border border-gray-700/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 z-[60] backdrop-blur-xl"
                            >
                                <div className="flex flex-wrap gap-2">
                                    {AVAILABLE_CATEGORIES.map((cat: any) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setSelectedCategories(prev =>
                                                    prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]
                                                );
                                            }}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${selectedCategories.includes(cat.id)
                                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                                                    : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
                                                }`}
                                        >
                                            {cat.icon}
                                            {cat.name.toUpperCase()}
                                        </button>
                                    ))}
                                    {isSearchActive && (
                                        <button
                                            onClick={() => {
                                                setSearchQuery('');
                                                setSelectedCategories([]);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-all"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            CLEAR
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right: User Profile & Popover */}
                <div className="flex items-center gap-4">
                    {user && (
                        <button
                            onClick={() => setActiveTab(activeTab === 'creator' ? 'home' : 'creator')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-[10px] sm:text-xs transition-all border active:scale-95 group ${activeTab === 'creator'
                                    ? 'bg-purple-600 text-white border-purple-500'
                                    : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border-purple-500/30'
                                }`}
                        >
                            <Plus className={`w-4 h-4 transition-transform ${activeTab === 'creator' ? 'rotate-45' : 'group-hover:rotate-90'}`} />
                            <span className="hidden xs:inline text-[8px] font-black tracking-widest uppercase">Create</span>
                        </button>
                    )}

                    <div className="relative flex flex-col items-center justify-center">
                        {!user ? (
                            <button
                                onClick={() => setIsAuthOpen(true)}
                                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95 flex items-center gap-2"
                            >
                                <LogIn className="w-4 h-4" /> LOGIN
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsUserInfoOpen(prev => !prev)}
                                    className="relative group transition-all active:scale-95"
                                >
                                    <img
                                        src={normalizeImageUrl(user.photoURL) || `https://i.pravatar.cc/150?u=${user.uid}`}
                                        alt="Avatar"
                                        className="w-10 h-10 rounded-2xl border-2 border-blue-500/20 group-hover:border-blue-500/50 transition-colors object-cover"
                                    />
                                </button>

                                {/* Gold Panel Below */}
                                <div className="mt-1 flex items-center gap-1.5 bg-[#252830] border border-gray-800 rounded-full px-2.5 py-0.5 shadow-lg pointer-events-none translate-y-[-2px]">
                                    <Coins className="w-2.5 h-2.5 text-yellow-500" />
                                    <span className="text-[9px] font-black text-white">{userStats?.gold || 0}</span>
                                </div>

                                {/* Popover Logic */}
                                <UserInfoModal
                                    isOpen={isUserInfoOpen}
                                    onClose={() => setIsUserInfoOpen(false)}
                                    user={user}
                                    onLogin={() => setIsAuthOpen(true)}
                                    onLogout={logout}
                                    onManageGames={() => {
                                        setActiveTab('creator');
                                        setIsUserInfoOpen(false);
                                        setIsMyGamesOverlayOpen(true);
                                    }}
                                    userStats={userStats}
                                    onUpdateAvatar={handleUpdateAvatar}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AppHeader;
