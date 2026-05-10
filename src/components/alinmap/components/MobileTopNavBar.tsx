import React from 'react';
import { Search } from 'lucide-react';
import { normalizeImageUrl } from '../../../services/externalApi';

interface MobileTopNavBarProps {
    myAvatarUrl: string;
    myDisplayName: string;
    weatherData: { temp: number; icon: string } | null;
    onWeatherClick?: () => void;
    onSearchClick: () => void;
    onAvatarClick: () => void;
}

const MobileTopNavBar: React.FC<MobileTopNavBarProps> = ({
    myAvatarUrl,
    myDisplayName,
    weatherData,
    onWeatherClick,
    onSearchClick,
    onAvatarClick
}) => {
    return (
        <div className="absolute top-0 left-0 right-0 z-[180] pointer-events-auto bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm px-4 pt-12 pb-3 flex items-center justify-between transition-all duration-300">
            {/* Logo / Brand Name */}
            <div className="flex-1">
                <span className="text-2xl font-black text-blue-600 tracking-tighter drop-shadow-sm">
                    Resider
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                {weatherData && (
                    <button
                        onClick={onWeatherClick}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50/80 border border-blue-100 hover:bg-blue-100 active:scale-95 transition-all"
                    >
                        <span className="text-sm">{weatherData.icon}</span>
                        <span className="text-xs font-bold text-gray-700">{weatherData.temp}°C</span>
                    </button>
                )}

                <button
                    onClick={onSearchClick}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100/80 hover:bg-gray-200 active:scale-95 transition-all"
                    aria-label="Search"
                >
                    <Search className="w-5 h-5 text-gray-700" />
                </button>

                <button
                    onClick={onAvatarClick}
                    className="w-10 h-10 rounded-full border-2 border-transparent hover:border-blue-500 active:scale-95 transition-all overflow-hidden shrink-0"
                >
                    <img
                        src={normalizeImageUrl(myAvatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`}
                        alt="Profile"
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`; }}
                    />
                </button>
            </div>
        </div>
    );
};

export default React.memo(MobileTopNavBar);
