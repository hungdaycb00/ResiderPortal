import React from 'react';
import { Navigation, Search } from 'lucide-react';
import AlinMapLoadingIcon from './components/AlinMapLoadingIcon';

interface SearchHeaderProps {
  isDesktop: boolean;
  isSheetExpanded: boolean;
  currentProvince?: string | null;
  myObfPos?: { lat: number; lng: number } | null;
  onWeatherClick?: () => void;
  setIsSearchOverlayOpen?: (v: boolean) => void;
  searchTag?: string;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  isDesktop,
  isSheetExpanded,
  currentProvince,
  myObfPos,
  onWeatherClick,
  setIsSearchOverlayOpen,
  searchTag,
}) => {
  return (
    <div
      className={`absolute z-[180] flex flex-col items-start gap-2 pointer-events-auto transition-all duration-300
      left-4 bottom-[64px] md:top-4 md:bottom-auto
      ${isDesktop && isSheetExpanded ? 'md:top-5 md:left-[72px] md:opacity-0 md:pointer-events-none' : 'md:left-[88px] md:top-6 md:opacity-100 md:pointer-events-auto'}
      ${!isDesktop && isSheetExpanded ? 'opacity-0 pointer-events-none translate-y-[-10px]' : 'opacity-100'}
      `}
    >
      {isDesktop && !isSheetExpanded && (
        <div 
          className="hidden md:flex items-center bg-white/90 backdrop-blur-md border border-gray-200 rounded-full px-4 py-2 shadow-lg hover:shadow-xl transition-all cursor-pointer min-w-[280px] group active:scale-[0.98]"
          onClick={() => setIsSearchOverlayOpen?.(true)}
        >
          <Search className="w-4 h-4 text-gray-500 mr-3 group-hover:text-blue-500 transition-colors" />
          <span className="text-sm font-medium text-gray-400 select-none">
            {searchTag || 'Tìm kiếm bạn bè, game, bài viết...'}
          </span>
        </div>
      )}

      <div className={`${isDesktop ? 'hidden md:flex' : 'md:hidden'} items-center gap-2 px-1 py-0.5 rounded-full bg-black/20 backdrop-blur-sm`}>
        <div
          className="pointer-events-auto flex items-center gap-2 px-2 active:scale-95 transition-transform cursor-pointer"
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
    </div>
  );
};

export default React.memo(SearchHeader);
