import React from 'react';
import { ChevronRight, Gamepad2, Hash, Navigation, Search } from 'lucide-react';
import { normalizeImageUrl } from '../../services/externalApi';
import { type AlinSearchResults } from './search';
import {
  openSearchGameResult,
  openSearchPostResult,
  openSearchTagResult,
  openSearchUserResult,
} from './searchActions';

interface SearchHeaderProps {
  searchTag: string;
  setSearchTag: (v: string) => void;
  isDesktop: boolean;
  isSheetExpanded: boolean;
  setIsSheetExpanded: (v: boolean) => void;
  setIsSearchOverlayOpen?: (v: boolean) => void;
  isLooterGameMode: boolean;
  mainTab: string;
  myAvatarUrl: string;
  myDisplayName: string;
  handleTabClick: (tabId: string) => void;
  showDesktopResults: boolean;
  setShowDesktopResults: (v: boolean) => void;
  isSearchingDesktop: boolean;
  desktopSearchResults: AlinSearchResults;
  nearbyUsers?: any[];
  setSelectedUser: (u: any) => void;
  setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
  handlePlayGame?: (game: any) => void;
  weatherData: { temp: number; icon: string } | null;
  currentProvince?: string | null;
  myObfPos?: { lat: number; lng: number } | null;
  onWeatherClick?: () => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  searchTag,
  setSearchTag,
  isDesktop,
  isSheetExpanded,
  setIsSheetExpanded,
  setIsSearchOverlayOpen,
  isLooterGameMode,
  mainTab,
  myAvatarUrl,
  myDisplayName,
  handleTabClick,
  showDesktopResults,
  setShowDesktopResults,
  isSearchingDesktop,
  desktopSearchResults,
  nearbyUsers = [],
  setSelectedUser,
  setActiveTab,
  handlePlayGame,
  weatherData,
  currentProvince,
  myObfPos,
  onWeatherClick,
}) => {
  const shouldHideSearch = isLooterGameMode || ['creator', 'backpack'].includes(mainTab);
  const hasDesktopResults = desktopSearchResults.users.length > 0
    || desktopSearchResults.posts.length > 0
    || desktopSearchResults.games.length > 0
    || desktopSearchResults.tags.length > 0;

  const actions = {
    nearbyUsers,
    setSelectedUser,
    setActiveTab,
    setIsSheetExpanded,
    closeResults: () => {
      setShowDesktopResults(false);
      setIsSearchOverlayOpen?.(false);
    },
    setSearchTag,
    handlePlayGame,
  };

  return (
    <div className={`absolute top-12 left-4 right-4 z-[180] flex gap-2 pointer-events-auto transition-all duration-300 ${isDesktop && isSheetExpanded ? 'md:top-0 md:left-[72px] md:w-[400px] md:bg-white md:pt-5 md:pb-2 md:px-4' : 'md:left-[88px] md:top-6 md:w-[384px]'} ${!isDesktop && isSheetExpanded ? 'opacity-0 pointer-events-none translate-y-[-10px]' : 'opacity-100'} ${shouldHideSearch ? 'hidden' : ''}`}>
      <div className={`flex-1 backdrop-blur-xl rounded-full flex items-center px-3 md:px-4 py-2 md:py-3 overflow-hidden transition-all duration-300 ${isDesktop && isSheetExpanded ? 'bg-white border border-gray-200 shadow-none' : 'bg-white/70 md:bg-white/90 shadow-md md:shadow-[0_4px_20px_rgba(0,0,0,0.15)]'}`}>
        <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-500 mr-2 shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          onFocus={(e) => {
            e.target.blur();
            if (isDesktop && !isSheetExpanded) {
              handleTabClick('discover');
            }
            setIsSearchOverlayOpen?.(true);
          }}
          className="bg-transparent border-none outline-none text-gray-900 text-sm w-full placeholder:text-gray-500 font-medium font-sans cursor-pointer"
          value={searchTag}
          readOnly
        />

        {!isDesktop && weatherData && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onWeatherClick?.();
            }}
            className="flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-200 shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            <span className="text-sm">{weatherData.icon}</span>
            <span className="text-xs font-bold text-gray-700">{weatherData.temp}C</span>
          </div>
        )}
      </div>

      <button onClick={() => handleTabClick('profile')} className="ml-2 sm:ml-3 shrink-0 active:scale-95 transition-transform overflow-hidden rounded-full border-2 border-blue-500 shadow-sm flex-shrink-0 self-center">
        <img
          src={normalizeImageUrl(myAvatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`}
          alt="Me"
          loading="lazy"
          decoding="async"
          className="w-8 h-8 md:w-10 md:h-10 object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`; }}
        />
      </button>

      {!isDesktop && !isLooterGameMode && (
        <div className="md:hidden absolute top-[105%] left-4 pointer-events-none flex flex-col gap-1 items-start mt-1">
          <div
            className="pointer-events-auto flex items-center gap-2 px-1 active:scale-95 transition-transform cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onWeatherClick?.(); }}
          >
            <Navigation className="w-3 h-3 text-blue-400 fill-current drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
            <span className="text-[11px] font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] truncate max-w-[150px]">
              {currentProvince || 'My location'}
            </span>
            <div className="w-[1px] h-2.5 bg-white/30 mx-1 shadow-sm" />
            <span className="text-[10px] font-bold text-white/80 font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {myObfPos ? `${myObfPos.lat.toFixed(4)}, ${myObfPos.lng.toFixed(4)}` : 'Loading...'}
            </span>
          </div>
        </div>
      )}

      {showDesktopResults && isDesktop && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[70vh] overflow-y-auto z-[200]">
          {isSearchingDesktop ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-bold">Searching...</p>
            </div>
          ) : (
            <div className="p-4">
              {!hasDesktopResults ? (
                <div className="py-8 text-center text-gray-400">
                  <p className="text-sm">No results found</p>
                </div>
              ) : (
                <>
                  {desktopSearchResults.users.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Users</p>
                      {desktopSearchResults.users.map((u: any) => (
                          <button key={u.id} type="button" onClick={() => openSearchUserResult(actions, u)} className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group text-left">
                          <img src={normalizeImageUrl(u.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || u.username || 'U')}&background=3b82f6&color=fff`} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{u.displayName || u.username}</p>
                            <p className="text-[11px] text-gray-500 truncate">{u.status || 'No status'}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  {desktopSearchResults.posts.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Posts</p>
                      {desktopSearchResults.posts.map((p: any) => (
                          <button key={p.id} type="button" onClick={() => openSearchPostResult(actions, p)} className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group text-left">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                            {p.images?.[0] ? <img src={normalizeImageUrl(p.images[0])} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <Search className="w-4 h-4 text-blue-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{p.title}</p>
                            <p className="text-[11px] text-gray-500 truncate">{p.author?.name || p.author?.username || 'User'} - {p.likeCount || 0} likes</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  {desktopSearchResults.games.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Games</p>
                      {desktopSearchResults.games.map((g: any) => (
                          <button key={g.id} type="button" onClick={() => openSearchGameResult(actions, g)} className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group text-left">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 overflow-hidden shrink-0 flex items-center justify-center">
                            {g.thumbnail || g.image ? <img src={normalizeImageUrl(g.thumbnail || g.image)} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <Gamepad2 className="w-5 h-5 text-emerald-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{g.title || g.name}</p>
                            <p className="text-[11px] text-gray-500 truncate">{g.category || 'Game'} - {g.playCount || g.downloads || 0} plays</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  {desktopSearchResults.tags.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Tags</p>
                      <div className="flex flex-wrap gap-2 px-1">
                        {desktopSearchResults.tags.map((item) => (
                          <button
                            key={item.tag}
                            type="button"
                            onClick={() => {
                              openSearchTagResult(actions, item.tag);
                              setShowDesktopResults(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100"
                          >
                            <Hash className="w-3 h-3" />
                            {item.tag.replace(/^#/, '')}
                            {item.count ? <span className="text-[10px] text-blue-400">{item.count}</span> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(SearchHeader);
