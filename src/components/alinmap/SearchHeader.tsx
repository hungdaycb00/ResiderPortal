import React from 'react';
import { Search, ChevronRight, Navigation } from 'lucide-react';
import { normalizeImageUrl } from '../../services/externalApi';

interface SearchHeaderProps {
  searchTag: string;
  setSearchTag: (v: string) => void;
  isDesktop: boolean;
  isSheetExpanded: boolean;
  setIsSheetExpanded: (v: boolean) => void;
  isLooterGameMode: boolean;
  mainTab: string;
  myAvatarUrl: string;
  myDisplayName: string;
  handleTabClick: (tabId: string) => void;
  // Desktop search
  showDesktopResults: boolean;
  setShowDesktopResults: (v: boolean) => void;
  isSearchingDesktop: boolean;
  desktopSearchResults: { posts: any[], users: any[] };
  setSelectedUser: (u: any) => void;
  setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
  // Mobile weather & location
  weatherData: { temp: number; icon: string } | null;
  currentProvince?: string | null;
  myObfPos?: { lat: number; lng: number } | null;
  onWeatherClick?: () => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  searchTag, setSearchTag, isDesktop, isSheetExpanded, setIsSheetExpanded,
  isLooterGameMode, mainTab, myAvatarUrl, myDisplayName, handleTabClick,
  showDesktopResults, setShowDesktopResults, isSearchingDesktop, desktopSearchResults,
  setSelectedUser, setActiveTab, weatherData, currentProvince, myObfPos, onWeatherClick
}) => {
  const shouldHideSearch = isLooterGameMode || ['profile', 'creator', 'backpack'].includes(mainTab);

  return (
    <div className={`absolute top-12 left-4 right-4 z-[180] flex gap-2 transition-all duration-300 ${isDesktop && isSheetExpanded ? 'md:top-0 md:left-[72px] md:w-[400px] md:bg-white md:pt-5 md:pb-2 md:px-4' : 'md:left-[88px] md:top-6 md:w-[384px]'} ${!isDesktop && isSheetExpanded ? 'opacity-0 pointer-events-none translate-y-[-10px]' : 'opacity-100'} ${shouldHideSearch ? 'hidden' : ''}`}>
      <div className={`flex-1 backdrop-blur-xl rounded-full flex items-center px-3 md:px-4 py-2 md:py-3 overflow-hidden transition-all duration-300 ${isDesktop && isSheetExpanded ? 'bg-white border border-gray-200 shadow-none' : 'bg-white/70 md:bg-white/90 shadow-md md:shadow-[0_4px_20px_rgba(0,0,0,0.15)]'}`}>
        <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-500 mr-2 shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          onFocus={() => {
            setIsSheetExpanded(true);
            if (!isDesktop) { setTimeout(() => document.getElementById('sheet-search-mobile')?.focus(), 50); }
          }}
          className="bg-transparent border-none outline-none text-gray-900 text-sm w-full placeholder:text-gray-500 font-medium font-sans"
          value={searchTag}
          onChange={(e) => setSearchTag(e.target.value)}
        />

        {/* Mobile Weather Widget */}
        {!isDesktop && weatherData && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onWeatherClick?.();
            }}
            className="flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-200 shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            <span className="text-sm">{weatherData.icon}</span>
            <span className="text-xs font-bold text-gray-700">{weatherData.temp}°C</span>
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

      {/* Mobile Location/Coords Widget - Bound to SearchHeader visibility */}
      {!isDesktop && !isLooterGameMode && (
          <div className="md:hidden absolute top-[105%] left-4 pointer-events-none flex flex-col gap-1 items-start mt-1">
              <div 
                  className="pointer-events-auto flex items-center gap-2 px-1 active:scale-95 transition-transform cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onWeatherClick?.(); }}
              >
                  <Navigation className="w-3 h-3 text-blue-400 fill-current drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                  <span className="text-[11px] font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] truncate max-w-[150px]">
                      {currentProvince || "Vị trí của tôi"}
                  </span>
                  <div className="w-[1px] h-2.5 bg-white/30 mx-1 shadow-sm" />
                  <span className="text-[10px] font-bold text-white/80 font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {myObfPos ? `${myObfPos.lat.toFixed(4)}, ${myObfPos.lng.toFixed(4)}` : "Đang lấy..."}
                  </span>
              </div>
          </div>
      )}

      {/* Desktop Search Results Dropdown */}
      {showDesktopResults && isDesktop && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[70vh] overflow-y-auto z-[200]">
          {isSearchingDesktop ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-bold">Đang tìm kiếm...</p>
            </div>
          ) : (
            <div className="p-4">
              {desktopSearchResults.users.length === 0 && desktopSearchResults.posts.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <p className="text-sm">Không tìm thấy kết quả nào</p>
                </div>
              ) : (
                <>
                  {desktopSearchResults.users.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Users</p>
                      {desktopSearchResults.users.map((u: any) => (
                        <div key={u.id} onClick={() => { setSelectedUser(u); setShowDesktopResults(false); }} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group">
                          <img src={normalizeImageUrl(u.avatar) || `https://ui-avatars.com/api/?name=${u.displayName}&background=3b82f6&color=fff`} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">{u.displayName}</p>
                            <p className="text-[11px] text-gray-500 truncate">{u.status || 'No status'}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                      ))}
                    </div>
                  )}
                  {desktopSearchResults.posts.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Posts</p>
                      {desktopSearchResults.posts.map((p: any) => (
                        <div key={p.id} onClick={() => { setSelectedUser(p.author); setActiveTab('posts'); setShowDesktopResults(false); }} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                            {p.images?.[0] ? <img src={normalizeImageUrl(p.images[0])} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">📄</div>}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{p.title}</p>
                            <p className="text-[11px] text-gray-500">{p.author?.name} • {p.likeCount} ❤️</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                      ))}
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
