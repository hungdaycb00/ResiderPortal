import React from 'react';
import { Navigation } from 'lucide-react';
import AlinMapLoadingIcon from './components/AlinMapLoadingIcon';

interface SearchHeaderProps {
  isDesktop: boolean;
  isSheetExpanded: boolean;
  currentProvince?: string | null;
  myObfPos?: { lat: number; lng: number } | null;
  onWeatherClick?: () => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  isDesktop,
  isSheetExpanded,
  currentProvince,
  myObfPos,
  onWeatherClick,
}) => {
  return (
    <div
      className={`absolute z-[180] flex items-start gap-2 pointer-events-auto transition-all duration-300
      left-4 bottom-[64px] md:top-4 md:bottom-auto
      ${isDesktop && isSheetExpanded ? 'md:top-5 md:left-[72px]' : 'md:left-[88px] md:top-6'}
      ${!isDesktop && isSheetExpanded ? 'opacity-0 pointer-events-none translate-y-[-10px]' : 'opacity-100'}
      `}
    >
      {!isDesktop && (
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
