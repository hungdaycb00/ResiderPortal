import React from 'react';
import { Navigation, Search } from 'lucide-react';
import { normalizeImageUrl } from '../../services/externalApi';
import AlinMapLoadingIcon from './components/AlinMapLoadingIcon';

interface SearchHeaderProps {
  isDesktop: boolean;
  isSheetExpanded: boolean;
  setIsSearchOverlayOpen?: (v: boolean) => void;
  isLooterGameMode: boolean;
  mainTab: string;
  myAvatarUrl: string;
  myDisplayName: string;
  handleTabClick: (tabId: string) => void;
  currentProvince?: string | null;
  myObfPos?: { lat: number; lng: number } | null;
  onWeatherClick?: () => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  isDesktop,
  isSheetExpanded,
  setIsSearchOverlayOpen,
  isLooterGameMode,
  mainTab,
  myAvatarUrl,
  myDisplayName,
  handleTabClick,
  currentProvince,
  myObfPos,
  onWeatherClick,
}) => {
  const shouldHideSearchButton = isLooterGameMode || ['creator', 'backpack', 'discover', 'friends', 'profile'].includes(mainTab);

  const openSearch = React.useCallback(() => {
    if (isDesktop && !isSheetExpanded) {
      handleTabClick('discover');
    }
    setIsSearchOverlayOpen?.(true);
  }, [handleTabClick, isDesktop, isSheetExpanded, setIsSearchOverlayOpen]);

  return (
    <div
      className={`absolute top-4 left-4 z-[180] flex items-start gap-2 pointer-events-auto transition-all duration-300
      ${isDesktop && isSheetExpanded ? 'md:top-5 md:left-[72px]' : 'md:left-[88px] md:top-6'}
      ${!isDesktop && isSheetExpanded ? 'opacity-0 pointer-events-none translate-y-[-10px]' : 'opacity-100'}
      `}
    >
      {!shouldHideSearchButton && (
        <button
          type="button"
          onClick={openSearch}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-gray-700 shadow-[0_4px_20px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all active:scale-95 hover:bg-white"
          aria-label="Search"
          title="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      )}

      <button
        type="button"
        onClick={() => handleTabClick('profile')}
        className="shrink-0 overflow-hidden rounded-full border-2 border-blue-500 shadow-sm transition-transform active:scale-95"
        aria-label="Open profile"
        title="Open profile"
      >
        <img
          src={normalizeImageUrl(myAvatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`}
          alt="Me"
          loading="lazy"
          decoding="async"
          className="h-10 w-10 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`;
          }}
        />
      </button>

      {!isDesktop && !isLooterGameMode && (
        <div className="md:hidden absolute top-[105%] left-0 pointer-events-none flex flex-col gap-1 items-start mt-1">
          <div
            className="pointer-events-auto flex items-center gap-2 px-1 active:scale-95 transition-transform cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onWeatherClick?.();
            }}
          >
            <Navigation className="w-3 h-3 text-blue-400 fill-current drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
            <span className="text-[11px] font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] truncate max-w-[150px]">
              {currentProvince || 'My location'}
            </span>
            <div className="w-[1px] h-2.5 bg-white/30 mx-1 shadow-sm" />
            {myObfPos ? (
              <span className="text-[10px] font-bold text-white/80 font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {myObfPos.lat.toFixed(4)}, {myObfPos.lng.toFixed(4)}
              </span>
            ) : (
              <AlinMapLoadingIcon className="h-3.5 w-3.5 animate-spin text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" strokeWidth={2.6} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SearchHeader);
